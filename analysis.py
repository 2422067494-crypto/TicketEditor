from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, emit
import os, io, csv, base64, json, re, time, threading, signal, atexit, urllib.request, asyncio, math
from datetime import datetime
from urllib.parse import quote
from threading import Lock
from contextlib import suppress
import socket
import logging

def _get_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port

# ===================== 开关 =====================
def _env_bool(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    if v is None:
        return default
    return str(v).strip().lower() in ("1", "true", "yes", "on")

USE_HEADLESS = _env_bool("TE_HEADLESS", True)
AUTO_LAUNCH_WORKERS = _env_bool("TE_AUTO_WORKERS", True)
LAUNCH_WORKER_RED2015 = _env_bool("TE_LAUNCH_2015", True)
LAUNCH_WORKER_RED2009 = _env_bool("TE_LAUNCH_2009", True)
KEEP_WORKER_ALWAYS_ACTIVE = _env_bool("TE_KEEP_ALIVE", True)
AUTO_CLOSE_WORKER_ON_DONE = _env_bool("TE_AUTO_CLOSE_ON_DONE", False)
WORKER_UA = "TicketEditorWorker/1.0"
APP_HOST = "127.0.0.1"

WORKER_STATE = {
    "thread": None,
    "loop": None,
    "shutdown_evt": None,
}

# ===================== 可选依赖 =====================
try:
    from pypinyin import lazy_pinyin, Style
    _HAVE_PYPINYIN = True
except Exception:
    _HAVE_PYPINYIN = False

try:
    from PIL import Image, ImageDraw, ImageFont, ImageChops   # 新增 ImageDraw 等
    _HAVE_PIL = True
except Exception:
    _HAVE_PIL = False

try:
    from playwright.async_api import async_playwright
    _HAVE_PLAYWRIGHT = True
except Exception:
    _HAVE_PLAYWRIGHT = False

# ===================== Flask / SocketIO =====================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    static_folder=os.path.join(BASE_DIR, "static"),
    template_folder=os.path.join(BASE_DIR, "templates"),
)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ---------- 统一数据目录 ----------
def _get_data_dir():
    try:
        prog_dir = os.getcwd()
        candidate = os.path.join(prog_dir, "ticketeditor")
        os.makedirs(candidate, exist_ok=True)
        test_file = os.path.join(candidate, ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        return candidate
    except Exception:
        pass
    appdata = os.getenv("APPDATA") or os.path.expanduser("~")
    fallback = os.path.join(appdata, "ticketeditor")
    os.makedirs(fallback, exist_ok=True)
    return fallback

DATA_DIR = _get_data_dir()
PATH_JSON = os.path.join(DATA_DIR, "path.json")
TICKET_PATH_KEY = "save_path"
PICTURE_PATH_KEY = "save_path_picture"

LOG_DIR = os.path.join(DATA_DIR, "log", "ana")
os.makedirs(LOG_DIR, exist_ok=True)

# 日志保留天数：超过则自动清理，避免日志目录无限增长（0 表示不清理）
LOG_RETENTION_DAYS = int(os.environ.get("TE_LOG_RETENTION_DAYS", "30"))


def _prune_old_logs(directory: str, prefix: str, days: int):
    """删除 directory 下 prefix 开头、且修改时间早于 days 天的日志文件。"""
    if days <= 0:
        return
    cutoff = time.time() - days * 86400
    removed = 0
    try:
        for name in os.listdir(directory):
            if not name.startswith(prefix) or not name.endswith(".txt"):
                continue
            path = os.path.join(directory, name)
            try:
                if os.path.isfile(path) and os.path.getmtime(path) < cutoff:
                    os.remove(path)
                    removed += 1
            except Exception:
                pass
    except Exception:
        pass
    if removed:
        log.info("[log] 已清理 %s 个过期日志（早于 %s 天）", removed, days)

log = logging.getLogger("ticketeditor.analysis")
log.setLevel(logging.INFO)
log.propagate = False

ROWS_BUFFER = []
CURRENT_INDEX = 0

_PROGRESS_LOCK = Lock()
PROGRESS = {"total": 0, "processed": 0, "invalid_rows": 0, "invalid_images": 0}

# ---------- 批量渲染运行态（用于日志与“卡住”检测） ----------
_BATCH_LOCK = Lock()
BATCH = {
    "id": None,              # 批次编号，便于在一次运行内串起整条链路
    "started_at": None,      # 批次开始时间（monotonic）
    "total": 0,
    "invalid_rows": 0,
    "first_filename": None,  # 触发批次的上传文件名
    # 每一行的下发/回执时间戳，key=index
    "dispatched": {},        # {index: {"t": monotonic, "page": str, "sent_at": float}}
    "saved": {},             # {index: {"t": monotonic, "path": str, "bytes": int}}
    "acked": set(),          # 已 ACK 的 index
    "last_error": None,      # 最近一次错误摘要
}

STUCK_TIMEOUT_SEC = float(os.environ.get("TE_STUCK_TIMEOUT", "45"))  # 单行超过该秒数未回执即判定为卡住
STUCK_SCAN_INT_SEC = 10.0    # 卡住扫描间隔


def _now() -> float:
    return time.monotonic()


def batch_start(total: int, invalid_rows: int, filename: str | None) -> str:
    """开启一个新批次，返回批次号。用于把整条批量渲染链路日志串起来。"""
    with _BATCH_LOCK:
        BATCH["id"] = datetime.now().strftime("%H%M%S") + f"-{total}"
        BATCH["started_at"] = _now()
        BATCH["total"] = int(total)
        BATCH["invalid_rows"] = int(invalid_rows)
        BATCH["first_filename"] = filename
        BATCH["dispatched"] = {}
        BATCH["saved"] = {}
        BATCH["acked"] = set()
        BATCH["last_error"] = None
        return BATCH["id"]


def _batch_id() -> str:
    with _BATCH_LOCK:
        return BATCH["id"] or "-"


def batch_mark_dispatched(index: int, page: str):
    with _BATCH_LOCK:
        BATCH["dispatched"][int(index)] = {"t": _now(), "page": page}


def batch_mark_saved(index: int, path: str, nbytes: int):
    with _BATCH_LOCK:
        BATCH["saved"][int(index)] = {"t": _now(), "path": path, "bytes": int(nbytes)}


def batch_mark_acked(index: int):
    with _BATCH_LOCK:
        BATCH["acked"].add(int(index))


def batch_note_error(msg: str):
    with _BATCH_LOCK:
        BATCH["last_error"] = msg


def _fmt_elapsed(sec: float) -> str:
    if sec < 60:
        return f"{sec:.1f}s"
    m, s = divmod(sec, 60)
    return f"{int(m)}m{s:.0f}s"


def batch_snapshot() -> dict:
    """返回当前批次运行态快照（用于日志与 /batch-status 查询）。"""
    with _BATCH_LOCK:
        total = BATCH["total"]
        done = PROGRESS["processed"]
        dispatched = dict(BATCH["dispatched"])
        saved = set(BATCH["saved"].keys())
        acked = set(BATCH["acked"])
        elapsed = (_now() - BATCH["started_at"]) if BATCH["started_at"] else 0.0
        awaiting = sorted(i for i in dispatched if i not in acked)
        return {
            "batch": BATCH["id"],
            "total": total,
            "processed": done,
            "invalid_rows": PROGRESS["invalid_rows"],
            "invalid_images": PROGRESS["invalid_images"],
            "elapsed": round(elapsed, 2),
            "awaiting": awaiting,
            "saved": len(saved),
            "last_error": BATCH["last_error"],
        }


def _stuck_watchdog():
    """后台守护：若某行已下发但超过 STUCK_TIMEOUT_SEC 仍无 ACK，则记录告警。"""
    log.info("[batch] 卡住检测已启动：单行阈值=%ss 扫描间隔=%ss", STUCK_TIMEOUT_SEC, STUCK_SCAN_INT_SEC)
    while True:
        time.sleep(STUCK_SCAN_INT_SEC)
        try:
            with _BATCH_LOCK:
                if not BATCH["id"]:
                    continue
                now = _now()
                for idx, info in list(BATCH["dispatched"].items()):
                    if idx in BATCH["acked"]:
                        _STUCK_WARNED.discard(idx)
                        continue
                    waited = now - info["t"]
                    if waited >= STUCK_TIMEOUT_SEC and idx not in _STUCK_WARNED:
                        _STUCK_WARNED.add(idx)
                        log.error(
                            "[batch %s] ⚠ 疑似卡住：第 %s 行已下发 %.1fs 仍未收到 ACK"
                            "（page=%s，已保存=%s，总数=%s）",
                            BATCH["id"], idx + 1, waited, info["page"],
                            len(BATCH["saved"]), BATCH["total"],
                        )
                        BATCH["last_error"] = f"row {idx + 1} no-ack {waited:.0f}s"
                        # 推送到前端：单行卡住属于预期外异常，弹窗提示
                        try:
                            socketio.emit("analysis-error", {
                                "level": "error",
                                "code": "ROW_STUCK",
                                "message": (
                                    f"第 {idx + 1} 行渲染卡住（已等待 {waited:.0f} 秒无响应）。"
                                    "请检查网络或重启应用后重试。"
                                ),
                                "index": idx + 1,
                                "page": info["page"],
                                "waited": round(waited, 1),
                            }, namespace='/')
                        except Exception:
                            log.exception("[batch] 卡住告警推送前端失败")
        except Exception as e:
            log.exception("[batch] 卡住检测异常: %s", e)


def _reset_stuck_watch():
    """批次开始时重置卡住告警去重集合。"""
    global _STUCK_WARNED
    try:
        _STUCK_WARNED.clear()
    except Exception:
        _STUCK_WARNED = set()


_STUCK_WARNED = set()


def _start_watchdog_thread():
    global _WATCHDOG_STARTED
    if _WATCHDOG_STARTED:
        return
    _WATCHDOG_STARTED = True
    threading.Thread(target=_stuck_watchdog, daemon=True, name="stuck_watchdog").start()


_WATCHDOG_STARTED = False

def progress_reset(total: int, invalid_rows: int = 0):
    with _PROGRESS_LOCK:
        PROGRESS.update({"total": int(total), "processed": 0,
                         "invalid_rows": int(invalid_rows), "invalid_images": 0})

def progress_inc_processed():
    with _PROGRESS_LOCK:
        PROGRESS["processed"] += 1
        return dict(PROGRESS)

def progress_inc_invalid_image():
    with _PROGRESS_LOCK:
        PROGRESS["invalid_images"] += 1
        return dict(PROGRESS)

def init_default_path_json():
    if not os.path.exists(PATH_JSON):
        default_dir = os.path.join(os.path.expanduser("~"), "Desktop")
        try:
            with open(PATH_JSON, "w", encoding="utf-8") as f:
                json.dump({
                    TICKET_PATH_KEY: default_dir,
                    PICTURE_PATH_KEY: default_dir
                }, f, ensure_ascii=False, indent=2)
            log.info(f"[init] 创建默认 path.json：{default_dir}")
        except Exception as e:
            log.exception(f"[init] 无法创建默认 path.json：{e}")

# ===================== Worker 唯一化 =====================
WORKER_SID = {"red2015": None, "red2009": None}

def _is_worker_request() -> bool:
    ua = (request.headers.get("User-Agent") or "").lower()
    return ("headless" in ua) or (WORKER_UA.lower() in ua)

@socketio.on("connect")
def on_connect():
    log.info("[socket] + connect sid=%s", request.sid)

@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    for k, v in list(WORKER_SID.items()):
        if v == sid:
            WORKER_SID[k] = None
            log.info(f"[socket] - worker for {k} disconnected")
    log.info(f"[socket] - disconnect sid={sid}")

def _set_worker_for_page(page_key: str, sid: str):
    prev = WORKER_SID.get(page_key)
    WORKER_SID[page_key] = sid
    tag = "replaced" if prev and prev != sid else "set"
    log.info(f"[worker] {tag} worker for {page_key}: sid={sid}")

def _emit_to_worker_or_room(page_key: str, event: str, data: dict):
    target_sid = WORKER_SID.get(page_key)
    if target_sid:
        socketio.emit(event, data, to=target_sid)
        log.info(f"[emit] -> worker({page_key}) sid={target_sid} event={event}")
    else:
        socketio.emit(event, data, room=page_key)
        log.info(f"[emit] -> room({page_key}) event={event} (no worker)")

# ===================== 映射/解析 =====================
CSV_MAP = [
    "input-from","input-to","input-traincode","input-date",
    "input-seattype","input-seat","input-price","input-limit","tongpiao",
    "via-part1","via-part2","via-part3","via-part4",
    "input-visa","input-botnum","input-check","input-purpose",
    "input-classnum","input-id","input-name","notice",
    "input-ad1","input-ad2","input-from-pinyin","input-to-pinyin",
    "input-topnum","input-idtype","input-station",
    "toggle-border","seanotice","circle","show-qrcode","bg"
]
CHECKBOX_KEYS_2015 = {"toggle-border","seanotice","circle","show-qrcode","tongpiao"}

# ---------- 票面背景（全部来自 static/Background） ----------
# 内置的 ticketred/ticketorange/ticketblue/ticketpink 已废弃，AG 列只认文件名。
BG_DIR = os.path.join(BASE_DIR, "static", "Background")
BG_URL_PREFIX = "/static/Background/"
BG_ALLOWED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".avif"}
_BG_BAD_CHARS = set('/\\:*?"<>|')
_BG_MAX_NAME_LEN = 120

_bg_index_cache = {"key": None, "map": {}}
_bg_warn = {"count": 0, "limit": 20}


def _bg_index() -> dict:
    """返回 {小写文件名: 真实文件名}。目录 mtime 变了就重建，避免每行都扫盘。"""
    try:
        key = os.path.getmtime(BG_DIR)
    except OSError:
        return {}
    if _bg_index_cache["key"] == key:
        return _bg_index_cache["map"]
    mapping = {}
    try:
        with os.scandir(BG_DIR) as it:
            for entry in it:
                try:
                    if not entry.is_file():
                        continue
                    if os.path.splitext(entry.name)[1].lower() in BG_ALLOWED_EXTS:
                        mapping[entry.name.lower()] = entry.name
                except OSError:
                    continue
    except OSError:
        mapping = {}
    _bg_index_cache["key"] = key
    _bg_index_cache["map"] = mapping
    return mapping


def _bg_warn_once(msg, *args):
    """背景文件名写错时不要刷屏，一个批次只记前若干条。"""
    if _bg_warn["count"] >= _bg_warn["limit"]:
        return
    _bg_warn["count"] += 1
    log.warning(msg, *args)


def resolve_bg(val: str) -> tuple[str, str]:
    """
    AG 列 → 票面底图 URL。

    取值规则（按顺序）：
      空                → ("", "transparent")      透明票面
      带后缀的完整文件名  → static/Background 下的同名文件；找不到则不合法
      其他（含无后缀）    → ("", "invalid")          透明票面

    返回 (url, kind)，kind ∈ {custom, transparent, invalid, missing}
    """
    raw = (val or "").strip()
    if not raw:
        return "", "transparent"

    # 只接受 Background 文件夹内的完整文件名：不接受路径、通配符、无后缀名
    if len(raw) > _BG_MAX_NAME_LEN or any(c in _BG_BAD_CHARS for c in raw):
        _bg_warn_once("[bg] 背景名不合法（含路径或非法字符）：%r", raw)
        return "", "invalid"
    if raw.startswith(".") or ".." in raw:
        _bg_warn_once("[bg] 背景名不合法：%r", raw)
        return "", "invalid"

    ext = os.path.splitext(raw)[1].lower()
    if ext not in BG_ALLOWED_EXTS:
        _bg_warn_once("[bg] 背景名缺少可用后缀（需 %s）：%r",
                      "/".join(sorted(e.lstrip(".") for e in BG_ALLOWED_EXTS)), raw)
        return "", "invalid"

    real_name = _bg_index().get(raw.lower())
    if not real_name:
        _bg_warn_once("[bg] static/Background 里找不到 %r，本行使用透明背景", raw)
        return "", "missing"

    return BG_URL_PREFIX + quote(real_name), "custom"

STATION_SPECIAL = {
    '香港西九龙':'HKWestKowloon','红磡（九龙）':'HungHom(Kowloon)','红磡(九龙)':'HungHom(Kowloon)',
    '九龙':'Kowloon','澳门':'Macau','红磡':'HungHom',
    '西安':"Xi'an",'西安北':"Xi'anbei",'西安东':"Xi'andong",
    '西安南':"Xi'annan",'西安西':"Xi'anxi",
    '延安':"Yan'an",'长安':"Chang'an",'长安西':"Chang'anxi",
    '吉安':"Ji'an",'吉安西':"Ji'anxi",
    '六安':"Lu'an",'莘庄':"Xinzhuang",
    '固安':"Gu'an",'固安东':"Gu'andong",
}

TARGET_COL_INDEX = 38
FONT_COL_INDEX   = 39
REALISTIC_COL_INDEX = 40      # AO：逼真二维码（T 启用）
IDTYPE_COL_INDEX    = 41      # AP：证件类型两位字母（ED/HZ/NG…）
IDNO_COL_INDEX      = 42      # AQ：逼真二维码用的完整证件号

def _normalize_page(v: str) -> str | None:
    v = (v or '').strip().lower()
    return v if v in ('red2015','red2009') else None

def _normalize_font(v: str) -> str:
    v = (v or '').strip()
    return '楷体' if v == '楷体' else '黑体'

def _cell(row, idx) -> str:
    return (row[idx].strip() if idx < len(row) and row[idx] is not None else '')

def _as_bool_T(v: str) -> bool:
    return (v or '').strip().upper() == 'T'

RED2009_COLMAP = {
    0:"input-from",1:"input-to",2:"input-traincodeold",3:"input-date2009",
    4:"input-seattypesold",5:"input-seat",6:"input-price2009",7:"input-limitation",8:"via2009-part3",
    9:"via2009-part2",10:"via2009-part1",11:"via2009-part4",12:"input-validdata",
    17:"input-classnum",20:"input-notice2009",23:"input-from-pinyin",24:"input-to-pinyin",
    25:"input-topnum",27:"input-ticketoffice",31:"show-qrcode",32:"bg",
    33:"bot-part1",34:"bot-part2",35:"bot-part3",36:"bot-part4",37:"bot-part5",
}

_LETTERS_ONLY = re.compile(r'[^A-Za-z]+')
def _auto_pinyin(name: str) -> str:
    if not name: return ''
    if name in STATION_SPECIAL: return STATION_SPECIAL[name]
    src = (name or '').strip()
    if not src: return ''
    if _HAVE_PYPINYIN:
        parts = lazy_pinyin(src, style=Style.NORMAL, strict=False)
        raw = ''.join(parts)
    else:
        raw = src
    raw = raw.replace('ü','u').replace('v','u')
    raw = _LETTERS_ONLY.sub('', raw)
    return raw[:1].upper()+raw[1:].lower() if raw else ''

# ===================== 页面 =====================
# 初始底图留空（不再引用已废弃的内置票底），第一行数据下发前就是透明票面
@app.route("/2015")
def index_2015():
    return render_template("Sample2015.html", bg="")

@app.route("/2009")
def index_2009():
    return render_template("Sample2009.html", bg="")

@app.route("/")
def home():
    return "OK", 200

@socketio.on("register-page")
def handle_register_page(data):
    page = (data or {}).get("page","")
    pg = _normalize_page(page) or "red2015"
    join_room(pg)
    if _is_worker_request():
        _set_worker_for_page(pg, request.sid)
        emit("role", {"role":"worker","page":pg})
    else:
        emit("role", {"role":"viewer","page":pg})
    emit("registered", {"page":pg})
    log.info(f"[socket] registered page={pg} role={'worker' if _is_worker_request() else 'viewer'} sid={request.sid}")


# 前端（主 UI / worker 页面）把关键操作与运行态回传，落进持久化日志
_CLIENT_LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "log": logging.INFO,
    "warn": logging.WARNING,
    "warning": logging.WARNING,
    "error": logging.ERROR,
}

@socketio.on("client-log")
def handle_client_log(data):
    d = data or {}
    src = str(d.get("source", "client"))[:32]
    level = _CLIENT_LEVELS.get(str(d.get("level", "info")).lower(), logging.INFO)
    msg = str(d.get("message", ""))[:2000]
    extra = d.get("data")
    if extra is not None:
        with suppress(Exception):
            msg = f"{msg} {json.dumps(extra, ensure_ascii=False)[:800]}"
    log.log(level, "[client:%s] %s", src, msg)


@app.route("/batch-status", methods=["GET"])
def batch_status():
    """查看当前/最近一次批量渲染的运行态：是否正常、进行到哪、是否卡住。"""
    return jsonify(batch_snapshot())

def _emit_render_done():
    socketio.emit("render-done", dict(PROGRESS), namespace='/')

def _emit_done_with_delay(delay=2.0):
    _emit_render_done()
    def _delayed_fire():
        time.sleep(delay)
        _emit_render_done()
    socketio.start_background_task(_delayed_fire)

# ===================== 解析 & 推任务 =====================
def parse_row_with_rules(row):
    page = _normalize_page(_cell(row, TARGET_COL_INDEX))
    if not page:
        raise ValueError("invalid AM: must be red2015 or red2009")

    if page == 'red2015':
        raw = { key: _cell(row, i) for i, key in enumerate(CSV_MAP) }
        tongpiao_on = raw.get("tongpiao","").upper() == "T"
        data = {"tongpiao": tongpiao_on, "__page":"red2015"}
        for key in CSV_MAP:
            if key == "tongpiao": continue
            # 通票行不写限乘、普通行不写经由——但不能直接 continue，
            # 否则这两个框会保留上一行的值（批量逐行复用同一个页面）
            if tongpiao_on and key == "input-limit":
                data[key] = ""; continue
            if (not tongpiao_on) and key in ("via-part1","via-part2","via-part3","via-part4"):
                data[key] = ""; continue
            val = raw.get(key,"")
            if key == "bg":
                # 每行都显式下发 bg（含空值），否则上一行的底图会被继承
                bg_url, bg_kind = resolve_bg(val)
                data["bg"] = bg_url
                data["bg_kind"] = bg_kind
                continue
            if key in CHECKBOX_KEYS_2015:
                data[key] = (val.upper()=="T"); continue
            data[key] = val
        if not (raw.get("input-from-pinyin") or "").strip():
            data["input-from-pinyin"] = _auto_pinyin(raw.get("input-from","").strip())
        if not (raw.get("input-to-pinyin") or "").strip():
            data["input-to-pinyin"] = _auto_pinyin(raw.get("input-to","").strip())
        # AO(40) 列 = 逼真二维码开关（T），AP(41) 列 = 证件类型两位字母
        data["realistic-qr"] = "T" if _as_bool_T(_cell(row, REALISTIC_COL_INDEX)) else "F"
        data["realistic-qr-idtype"] = _cell(row, IDTYPE_COL_INDEX).strip().upper()
        data["realistic-qr-idno"] = _cell(row, IDNO_COL_INDEX).strip()
        return data

    data = {"__page":"red2009"}
    for col, key in RED2009_COLMAP.items():
        val = _cell(row, col)
        if key == "show-qrcode":
            data[key] = _as_bool_T(val)
        elif key == "bg":
            bg_url, bg_kind = resolve_bg(val)
            data["bg"] = bg_url
            data["bg_kind"] = bg_kind
        else:
            data[key] = val
    data["red2009_font"] = _normalize_font(_cell(row, FONT_COL_INDEX))
    if not (data.get("input-from-pinyin") or "").strip():
        data["input-from-pinyin"] = _auto_pinyin((data.get("input-from") or "").strip())
    if not (data.get("input-to-pinyin") or "").strip():
        data["input-to-pinyin"] = _auto_pinyin((data.get("input-to") or "").strip())
    return data

@app.route("/receivecsv", methods=["POST"])
def receive_csv():
    global ROWS_BUFFER, CURRENT_INDEX
    _t0 = _now()
    _uname = (request.files.get("file").filename if request.files.get("file") else None)
    log.info("[user] ⏵ 收到批量渲染请求（CSV 上传）file=%s", _uname or "(未命名)")
    try:
        if os.path.exists(PATH_JSON):
            with open(PATH_JSON, "r", encoding="utf-8") as f:
                j = json.load(f)
                save_dir = (j.get(TICKET_PATH_KEY, "") or "").strip()
                if save_dir and not (os.path.isdir(save_dir) and os.access(save_dir, os.W_OK)):
                    log.warning("[user] ⨯ 批量渲染被拒绝：保存路径不可写 dir=%s", save_dir)
                    return jsonify({
                        "ok": False,
                        "error": "请先修改保存路径",
                        "error_code": "INVALID_SAVE_PATH"
                    }), 400

        file = request.files.get("file")
        if not file:
            log.warning("[user] ⨯ 批量渲染被拒绝：未选择文件")
            return jsonify({"ok": False, "error": "没有选择文件", "error_code": "NO_FILE"}), 400

        original_filename = file.filename or ""
        if not original_filename.lower().endswith('.csv'):
            log.warning("[user] ⨯ 批量渲染被拒绝：非 CSV 文件 file=%s", original_filename)
            return jsonify({
                "ok": False,
                "error": "非UTF-8逗号分隔csv",
                "error_code": "INVALID_CSV_FORMAT"
            }), 400

        raw_bytes = file.read()
        try:
            text = raw_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            log.warning("[user] ⨯ 批量渲染被拒绝：非 UTF-8 编码 file=%s bytes=%s",
                        original_filename, len(raw_bytes))
            return jsonify({
                "ok": False,
                "error": "非UTF-8逗号分隔csv",
                "error_code": "INVALID_CSV_FORMAT"
            }), 400

        try:
            rows = list(csv.reader(io.StringIO(text)))
        except csv.Error as e:
            log.error("[analysis] CSV 解析失败: %s", e)
            return jsonify({
                "ok": False,
                "error": "CSV 文件格式损坏，无法正确解析。",
                "error_code": "CSV_PARSE_ERROR"
            }), 400

        new_buffer, invalid_rows = [], 0
        first_error = None
        _bg_warn["count"] = 0          # 自定义背景的告警每批重置
        for i, row in enumerate(rows[4:], start=5):
            try:
                parsed = parse_row_with_rules(row)
                new_buffer.append(parsed)
            except Exception as e:
                invalid_rows += 1
                if first_error is None:
                    first_error = f"第{i}行: {e}"
                log.warning("[analysis] 第%d行解析失败：%s", i, e, exc_info=True)

        ROWS_BUFFER = new_buffer
        CURRENT_INDEX = 0
        total_valid = len(ROWS_BUFFER)
        progress_reset(total=total_valid, invalid_rows=invalid_rows)

        bid = batch_start(total_valid, invalid_rows, original_filename)
        _reset_stuck_watch()

        # 统计两个票面各自的行数，便于一眼看清任务构成
        n2015 = sum(1 for r in ROWS_BUFFER if r.get("__page") == "red2015")
        n2009 = total_valid - n2015
        n_custom = sum(1 for r in ROWS_BUFFER if r.get("bg_kind") == "custom")
        n_bg_bad = sum(1 for r in ROWS_BUFFER if r.get("bg_kind") in ("missing", "invalid"))
        log.info(
            "[batch %s] ▶ 批次开始：文件=%s 总行=%s 有效=%s 无效=%s 解析耗时=%s "
            "（red2015=%s / red2009=%s）",
            bid, original_filename, len(rows), total_valid, invalid_rows,
            _fmt_elapsed(_now() - _t0), n2015, n2009,
        )
        if n_custom or n_bg_bad:
            log.info("[batch %s] 票面背景：命中 %s 行，未找到/不合法 %s 行（这些行输出透明背景）",
                     bid, n_custom, n_bg_bad)
        socketio.emit("progress-init", dict(PROGRESS), namespace='/')

        if total_valid == 0:
            log.warning("[batch %s] ⨯ 全部无效，仅触发动画反馈。首个错误：%s",
                        bid, first_error or "(无)")
            batch_note_error("all invalid")
            if invalid_rows > 0:
                hint = "无有效数据。请检查AM列是否按规则填写以及各字段是否完整。"
                if first_error:
                    hint += f" 首个错误：{first_error}"
            else:
                hint = "无有效数据。"
            def _fake_done():
                time.sleep(3)
                socketio.emit("render-done", dict(PROGRESS), namespace='/')
            socketio.start_background_task(_fake_done)
            return jsonify({
                "ok": False,
                "error": hint,
                "error_code": "ALL_INVALID",
                "count": 0,
                "invalid_rows": invalid_rows
            }), 400

        first = ROWS_BUFFER[0]
        page = first["__page"]
        if page == "red2009":
            _emit_to_worker_or_room("red2009", "red2009:station-font", {"font": first.get("red2009_font", "黑体")})
        _emit_to_worker_or_room(page, "render-row", {"index": 0, "payload": first})
        batch_mark_dispatched(0, page)
        log.info("[batch %s] → 下发第 1/%s 行 到[%s]（worker优先）", bid, total_valid, page)

        return jsonify({"ok": True, "count": total_valid, "invalid_rows": invalid_rows})

    except Exception as e:
        log.exception("[analysis] receive_csv 异常: %s", e)
        return jsonify({
            "ok": False,
            "error": f"服务器内部错误: {e}",
            "error_code": "INTERNAL_ERROR"
        }), 500

# ===================== 存储路径 & 保存图片 =====================
def get_output_dir(target="ticket", create_if_missing=True):
    key = TICKET_PATH_KEY if target == "ticket" else PICTURE_PATH_KEY
    default_dir = os.path.join(os.path.expanduser("~"), "Desktop")
    if os.path.exists(PATH_JSON):
        try:
            with open(PATH_JSON, "r", encoding="utf-8") as f:
                j = json.load(f)
                p = (j.get(key, "") or "").strip()
                if p and os.path.isdir(p):
                    return p
        except Exception:
            pass
    if create_if_missing:
        os.makedirs(default_dir, exist_ok=True)
        return default_dir
    else:
        return default_dir

_ILLEGAL = r'[<>:"/\\|?*\x00-\x1F]'
def sanitize_filename(name: str) -> str | None:
    if not name: return None
    name = os.path.basename(str(name)).strip().replace("\0","")
    name = re.sub(_ILLEGAL,"_",name)
    name = re.sub(r"[\. ]+$","",name)
    return name or None

def ensure_png(name: str) -> str:
    return name if name.lower().endswith(".png") else name + ".png"

def unique_path(outdir: str, filename: str) -> str:
    base, ext = os.path.splitext(filename)
    cand = os.path.join(outdir, filename); i = 1
    while os.path.exists(cand):
        cand = os.path.join(outdir, f"{base} ({i}){ext}"); i += 1
    return cand

def time_filename() -> str:
    d = datetime.now()
    return f"{d:%Y%m%d_%H%M%S}_{int(d.microsecond/1000):03d}.png"

_PNG_SIG = b"\x89PNG\r\n\x1a\n"
def _is_valid_png_bytes(b: bytes) -> bool:
    if not b or len(b) < 32: return False
    if not b.startswith(_PNG_SIG): return False
    if _HAVE_PIL:
        try: Image.open(io.BytesIO(b)).verify()
        except Exception: return False
    return True

@app.route("/savepath", methods=["POST"])
def save_path():
    j = request.get_json(force=True)
    folder = j.get("path","").strip()
    target = j.get("target", "ticket")
    if not folder:
        return jsonify({"ok": False, "error": "空路径"}), 400

    key = TICKET_PATH_KEY if target == "ticket" else PICTURE_PATH_KEY
    data = {}
    if os.path.exists(PATH_JSON):
        try:
            with open(PATH_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            pass
    data[key] = folder
    try:
        with open(PATH_JSON, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        log.info(f"[analysis] 路径已写入 {PATH_JSON}：{key}={folder}")
        return jsonify({"ok": True, "path": folder})
    except Exception as e:
        log.exception(f"[analysis] 写入路径失败: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/getpath", methods=["GET"])
def get_path():
    target = request.args.get("target", "ticket")
    key = TICKET_PATH_KEY if target == "ticket" else PICTURE_PATH_KEY
    try:
        if os.path.exists(PATH_JSON):
            with open(PATH_JSON, "r", encoding="utf-8") as f:
                j = json.load(f)
                p = (j.get(key, "") or "").strip()
                if p:
                    valid = os.path.isdir(p) and os.access(p, os.W_OK)
                    return jsonify({"ok": True, "path": p, "valid": valid})
    except Exception:
        pass
    default = os.path.join(os.path.expanduser("~"), "Desktop")
    valid_default = os.path.isdir(default) and os.access(default, os.W_OK)
    return jsonify({"ok": True, "path": default, "valid": valid_default})

@app.route("/saveimage", methods=["POST"])
def save_image():
    _t0 = _now()
    try:
        j = request.get_json(force=True)
        img_b64 = j.get("img",""); index = j.get("index",0); req_filename = j.get("filename")
        target = j.get("target", "ticket")

        key = TICKET_PATH_KEY if target == "ticket" else PICTURE_PATH_KEY
        if os.path.exists(PATH_JSON):
            with open(PATH_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                save_dir = (data.get(key, "") or "").strip()
                if save_dir and not (os.path.isdir(save_dir) and os.access(save_dir, os.W_OK)):
                    batch_note_error(f"row {index+1} invalid save path")
                    log.error("[batch %s] ⨯ 第 %s 行保存失败：保存路径不可用 dir=%s",
                              _batch_id(), index + 1, save_dir)
                    return jsonify({"ok": False, "invalid": True, "error": "请先修改保存路径"}), 400

        if not img_b64:
            stats = progress_inc_invalid_image()
            batch_note_error(f"row {index+1} empty image")
            log.error("[batch %s] ⨯ 第 %s 行截图无效：空图片（累计无效图=%s）",
                      _batch_id(), index + 1, stats["invalid_images"])
            socketio.emit("progress-invalid", {"invalid_images": stats["invalid_images"], "index": index, "reason": "empty"})
            return jsonify({"ok": False, "invalid": True, "error": "empty image"}), 200

        if "," in img_b64:
            img_b64 = img_b64.split(",",1)[1]
        try:
            img = base64.b64decode(img_b64, validate=True)
        except Exception:
            stats = progress_inc_invalid_image()
            batch_note_error(f"row {index+1} bad base64")
            log.error("[batch %s] ⨯ 第 %s 行截图无效：base64 解码失败（累计无效图=%s）",
                      _batch_id(), index + 1, stats["invalid_images"])
            socketio.emit("progress-invalid", {"invalid_images": stats["invalid_images"], "index": index, "reason": "base64"})
            return jsonify({"ok": False, "invalid": True, "error": "bad base64"}), 200

        if not _is_valid_png_bytes(img):
            stats = progress_inc_invalid_image()
            batch_note_error(f"row {index+1} not png")
            log.error("[batch %s] ⨯ 第 %s 行截图无效：非 PNG 或已损坏（bytes=%s，累计无效图=%s）",
                      _batch_id(), index + 1, len(img), stats["invalid_images"])
            socketio.emit("progress-invalid", {"invalid_images": stats["invalid_images"], "index": index, "reason": "not-png-or-corrupt"})
            return jsonify({"ok": False, "invalid": True, "error": "not png or corrupt"}), 200

        outdir = get_output_dir(target=target, create_if_missing=True)
        fname = None
        if req_filename:
            sanitized = sanitize_filename(req_filename)
            if sanitized: fname = ensure_png(sanitized)
        if not fname: fname = time_filename()

        final_path = unique_path(outdir, fname)
        tmpname = final_path + ".tmp"
        with open(tmpname,"wb") as f: f.write(img)
        os.replace(tmpname, final_path)

        stats = progress_inc_processed()
        batch_mark_saved(index, final_path, len(img))
        log.info("[batch %s] ✓ 第 %s 行已保存(%s)：%s（%s KB，耗时 %s，进度 %s/%s）",
                 _batch_id(), index + 1, target, os.path.basename(final_path),
                 max(1, len(img) // 1024), _fmt_elapsed(_now() - _t0),
                 stats["processed"], stats["total"])
        socketio.emit("progress-tick", {
            "processed": stats["processed"], "total": stats["total"],
            "index": index, "path": final_path, "filename": os.path.basename(final_path)
        })

        return jsonify({"ok": True, "path": final_path, "filename": os.path.basename(final_path)})
    except Exception as e:
        stats = progress_inc_invalid_image()
        safe = request.get_json(silent=True) or {}
        idx = safe.get("index", 0)
        batch_note_error(f"row {idx+1} save exception: {e}")
        socketio.emit("progress-invalid", {
            "invalid_images": stats["invalid_images"],
            "index": idx,
            "reason": "exception"
        })
        log.exception("[batch %s] ⨯ 第 %s 行保存异常: %s", _batch_id(), idx + 1, e)
        return jsonify({"ok": False, "invalid": True, "error": str(e)}), 200

# ===================== ACK / 推下一行 =====================
@app.route("/ack", methods=["POST"])
def ack():
    global CURRENT_INDEX, ROWS_BUFFER
    j = request.get_json(force=True)
    idx = int(j.get("index", 0))
    bid = _batch_id()

    if idx != CURRENT_INDEX:
        log.warning("[batch %s] ⚠ 忽略非当前 ACK：收到第 %s 行，当前等待第 %s 行",
                    bid, idx + 1, CURRENT_INDEX + 1)
        return jsonify({"ok": True, "ignored": True})

    # 计算本行从下发到回执的耗时，便于发现“慢行/卡顿”
    row_cost = ""
    with _BATCH_LOCK:
        d = BATCH["dispatched"].get(idx)
        if d:
            row_cost = _fmt_elapsed(_now() - d["t"])
    batch_mark_acked(idx)
    log.info("[batch %s] ↩ 第 %s 行已回执（等待确认耗时 %s）", bid, idx + 1, row_cost or "?")

    CURRENT_INDEX = idx + 1
    next_index = CURRENT_INDEX

    def push_next():
        if next_index < len(ROWS_BUFFER):
            row = ROWS_BUFFER[next_index]
            page = row.get("__page","red2015")
            if page == "red2009":
                font = row.get("red2009_font","黑体")
                _emit_to_worker_or_room("red2009","red2009:station-font",{"font":font})
            _emit_to_worker_or_room(page,"render-row",{"index": next_index,"payload": row})
            batch_mark_dispatched(next_index, page)
            log.info("[batch %s] → 下发第 %s/%s 行 到[%s]（worker优先）",
                     bid, next_index + 1, len(ROWS_BUFFER), page)
        else:
            socketio.emit("render-done", dict(PROGRESS), namespace='/')
            _emit_done_with_delay(2.0)
            snap = batch_snapshot()
            _ok = PROGRESS["invalid_rows"] == 0 and PROGRESS["invalid_images"] == 0
            log.info(
                "[batch %s] %s 批次结束：有效=%s 已处理=%s 无效行=%s 无效图=%s 总耗时=%s",
                bid, "✔" if _ok else "⚠",
                PROGRESS["total"], PROGRESS["processed"],
                PROGRESS["invalid_rows"], PROGRESS["invalid_images"],
                _fmt_elapsed(snap["elapsed"]),
            )
            if snap["last_error"]:
                log.warning("[batch %s] 本批次曾出现异常：%s", bid, snap["last_error"])
    socketio.start_background_task(push_next)
    return jsonify({"ok": True})

# ===================== 排版合成功能 =====================
TICKET_GRID = {
    "start_x": 356,
    "start_y": 989,
    "slot_width": 2124,
    "slot_height": 1439,
    "cols": 2,
    "rows": 4,
    "gap_x": 1,
    "gap_y": 1,
}
A4_SIZE = (4961, 7016)
OUTPUT_DPI = 600

# 尝试加载系统字体用于打印缩放系数，失败则回退默认
try:
    _scale_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 140)
except:
    try:
        _scale_font = ImageFont.truetype("arial.ttf", 15)
    except:
        _scale_font = ImageFont.load_default()

def compose_ticket_page(background, images, start_idx):
    """在背景上正片叠底放置最多8张图片，返回实际放置数"""
    placed = 0
    per_page = TICKET_GRID["cols"] * TICKET_GRID["rows"]
    for i, img in enumerate(images):
        if placed >= per_page:
            break
        row = i // TICKET_GRID["cols"]
        col = i % TICKET_GRID["cols"]
        x = TICKET_GRID["start_x"] + col * (TICKET_GRID["slot_width"] + TICKET_GRID["gap_x"])
        y = TICKET_GRID["start_y"] + row * (TICKET_GRID["slot_height"] + TICKET_GRID["gap_y"])

        fg = img.resize((TICKET_GRID["slot_width"], TICKET_GRID["slot_height"]), Image.LANCZOS).convert("RGBA")
        fg_rgb = fg.convert("RGB")
        fg_alpha = fg.getchannel("A")

        region = background.crop((x, y, x + TICKET_GRID["slot_width"], y + TICKET_GRID["slot_height"])).convert("RGB")
        multiplied = ImageChops.multiply(region, fg_rgb)
        blended = Image.composite(multiplied, region, fg_alpha)

        if background.mode == "RGBA":
            alpha_region = background.crop((x, y, x + TICKET_GRID["slot_width"], y + TICKET_GRID["slot_height"])).getchannel("A")
            blended_rgba = blended.convert("RGBA")
            blended_rgba.putalpha(alpha_region)
            background.paste(blended_rgba, (x, y))
        else:
            background.paste(blended, (x, y))
        placed += 1
    return placed

def _scale_text_pos(scale_text_len: int = 5) -> tuple:
    """缩放系数文字的绘制位置：与文字长度居中对齐到 4240 中心，保持原两点行为。"""
    return (4240 - 20 * (scale_text_len - 1), 660)

def _build_page(bg_template, page_imgs, start, scale_factor, text_x):
    """在背景模板副本上排版一页，打印缩放系数，再整体缩放裁切。返回该页 PIL Image。"""
    bg = bg_template.copy()
    compose_ticket_page(bg, page_imgs, start)

    # 1. 先在原始背景上绘制缩放系数（文字将随页面一起缩放）
    draw = ImageDraw.Draw(bg)
    draw.text((text_x, 660), f"{scale_factor:.3f}", fill=(0, 0, 0, 255), font=_scale_font)

    # 2. 然后整体缩放并裁切
    if scale_factor != 1.0:
        new_w = int(bg.width * scale_factor)
        new_h = int(bg.height * scale_factor)
        bg = bg.resize((new_w, new_h), Image.LANCZOS)
        left = (new_w - A4_SIZE[0]) // 2
        top = (new_h - A4_SIZE[1]) // 2
        bg = bg.crop((left, top, left + A4_SIZE[0], top + A4_SIZE[1]))
    return bg

def _pages_of(bg_template, foreground_images, scale_factor, text_x, on_page=None):
    """按 TICKET_GRID 分页排版，逐页回调 on_page(page_idx, page_img, pages_count)。"""
    per_page = TICKET_GRID["cols"] * TICKET_GRID["rows"]
    total = len(foreground_images)
    pages_count = math.ceil(total / per_page) if total else 0
    output_pages = []

    for page_idx in range(pages_count):
        start = page_idx * per_page
        page_imgs = foreground_images[start:min(start + per_page, total)]
        page = _build_page(bg_template, page_imgs, start, scale_factor, text_x)
        output_pages.append(page)
        if on_page:
            on_page(page_idx, page, pages_count)
    return output_pages

def compose_tickets(foreground_images, background_image=None, scale_factor=1.0):
    """
    合成多页，返回 PIL Image 列表。
    每页在 (4240, 660) 处打印缩放系数（三位小数），文字与图片一起缩放。
    """
    if not _HAVE_PIL:
        raise RuntimeError("Pillow not installed")
    if not foreground_images:
        return []

    if background_image:
        if background_image.size != A4_SIZE:
            raise ValueError(f"Background image must be {A4_SIZE[0]}x{A4_SIZE[1]}")
        bg_template = background_image.convert("RGBA")
    else:
        bg_template = Image.new("RGBA", A4_SIZE, (0, 0, 0, 0))

    return _pages_of(bg_template, foreground_images, scale_factor, _scale_text_pos(5))

@app.route("/compose-tickets", methods=["POST"])
def compose_tickets_endpoint():
    if not _HAVE_PIL:
        return jsonify({"ok": False, "error": "Pillow not installed"}), 500

    try:
        j = request.get_json(force=True)
        img_b64_list = j.get("images") or []
        scale_factor = float(j.get("scale_factor", 1.0))
        bg_b64 = j.get("background")  # optional
        output_mode = j.get("output_mode", "save_to_disk")  # or "return_base64"

        if not isinstance(img_b64_list, list):
            return jsonify({"ok": False, "error": "'images' must be a list of base64 strings"}), 400

        foregrounds = []
        for idx, b64_str in enumerate(img_b64_list):
            if not b64_str:
                continue
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            try:
                img_data = base64.b64decode(b64_str)
            except Exception:
                return jsonify({"ok": False, "error": f"Image {idx+1} base64 decode failed"}), 400
            try:
                img = Image.open(io.BytesIO(img_data)).convert("RGBA")
            except Exception:
                return jsonify({"ok": False, "error": f"Image {idx+1} invalid or unsupported"}), 400
            foregrounds.append(img)

        bg_img = None
        if bg_b64:
            if "," in bg_b64:
                bg_b64 = bg_b64.split(",", 1)[1]
            try:
                bg_data = base64.b64decode(bg_b64)
                bg_img = Image.open(io.BytesIO(bg_data)).convert("RGBA")
            except Exception:
                return jsonify({"ok": False, "error": "Background image decode failed"}), 400

        pages = compose_tickets(foregrounds, background_image=bg_img, scale_factor=scale_factor)

        if output_mode == "return_base64":
            b64_pages = []
            for page_img in pages:
                buf = io.BytesIO()
                page_img.save(buf, format="PNG", dpi=(OUTPUT_DPI, OUTPUT_DPI))
                b64_pages.append(base64.b64encode(buf.getvalue()).decode("utf-8"))
            return jsonify({"ok": True, "pages": len(pages), "base64_images": b64_pages})
        else:
            outdir = get_output_dir(target="picture", create_if_missing=True)
            saved = []
            for i, page_img in enumerate(pages):
                fname = f"compose_{datetime.now():%Y%m%d_%H%M%S}_{i+1}.png"
                path = unique_path(outdir, fname)
                page_img.save(path, "PNG", dpi=(OUTPUT_DPI, OUTPUT_DPI))
                saved.append(path)
            return jsonify({"ok": True, "pages": len(pages), "files": saved})

    except Exception as e:
        log.exception("[compose] 合成请求失败")
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/compose-from-folder", methods=["POST"])
def compose_from_folder():
    if not _HAVE_PIL:
        return jsonify({"ok": False, "error": "Pillow not installed"}), 500

    j = request.get_json(force=True)
    folder = j.get("folder", "").strip()
    scale_str = j.get("scale_factor", "").strip()

    try:
        scale_factor = float(scale_str) if scale_str else 1.0
    except ValueError:
        return jsonify({"ok": False, "error": "无效的放大系数"}), 400

    if not folder or not os.path.isdir(folder):
        return jsonify({"ok": False, "error": "无效的文件夹路径"}), 400

    image_exts = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp'}
    try:
        files = sorted([
            f for f in os.listdir(folder)
            if os.path.splitext(f)[1].lower() in image_exts
        ])
    except Exception as e:
        return jsonify({"ok": False, "error": f"读取文件夹失败: {e}"}), 400

    if not files:
        return jsonify({"ok": False, "error": "文件夹中没有图片"}), 400

    layout_path = os.path.join(BASE_DIR, "static", "Layout.png")
    if not os.path.exists(layout_path):
        return jsonify({"ok": False, "error": "错误——背景模板 Layout.png 不存在"}), 500

    total_pages = math.ceil(len(files) / (TICKET_GRID["cols"] * TICKET_GRID["rows"]))

    def do_compose():
        try:
            bg_img = Image.open(layout_path).convert("RGBA")
            foregrounds = []
            for fname in files:
                fpath = os.path.join(folder, fname)
                try:
                    foregrounds.append(Image.open(fpath).convert("RGBA"))
                except Exception as e:
                    log.warning(f"跳过图片 {fname}: {e}")
                    continue

            if not foregrounds:
                socketio.emit("compose-error", {"error": "没有有效图片可合成"})
                return

            def _push_progress(page_idx, _page, pages_count):
                socketio.emit("compose-progress", {
                    "current_page": page_idx + 1,
                    "total_pages": pages_count
                })

            # 该入口的缩放系数文字绘制在 (4150, 660)
            output_pages = _pages_of(bg_img, foregrounds, scale_factor, 4150, on_page=_push_progress)

            outdir = get_output_dir(target="picture", create_if_missing=True)
            saved = []
            for i, page_img in enumerate(output_pages):
                fname = f"compose_{datetime.now():%Y%m%d_%H%M%S}_{i+1}.png"
                path = unique_path(outdir, fname)
                page_img.save(path, "PNG", dpi=(OUTPUT_DPI, OUTPUT_DPI))
                saved.append(path)

            log.info(f"文件夹合成完成：{len(saved)} 页，保存至 {outdir}")
            socketio.emit("compose-done", {"pages": len(saved)})

        except Exception as e:
            log.exception("文件夹合成失败")
            socketio.emit("compose-error", {"error": str(e)})

    threading.Thread(target=do_compose, daemon=True).start()
    return jsonify({"ok": True, "total_pages": total_pages})

# ===================== Worker 启动器 =====================
def _wait_server_ready_forever(url: str):
    log.info("[worker] 等待后端就绪 …")
    while True:
        with suppress(Exception):
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    log.info("[worker] 后端已就绪")
                    return
        time.sleep(0.3)

async def _boot_one_worker(page_url: str, title: str, shutdown_evt):
    log.info("[worker] ▶ 正在启动渲染器 %s url=%s", title, page_url)
    try:
        async with async_playwright() as p:
            args = [
                "--disable-gpu","--no-sandbox","--disable-dev-shm-usage",
                "--autoplay-policy=no-user-gesture-required",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--mute-audio",
            ]
            browser = await p.chromium.launch(headless=USE_HEADLESS, args=args)
            context = await browser.new_context(
                device_scale_factor=1,
                user_agent=WORKER_UA,
                java_script_enabled=True,
                bypass_csp=True,
            )
            page = await context.new_page()
            page.on("console", lambda msg: log.info(f"[{title}:{msg.type}] {msg.text}"))
            page.on("pageerror", lambda err: log.error(f"[{title}:pageerror] {err}"))
            page.on("crash", lambda: log.error(f"[{title}:crash] 渲染页面崩溃"))
            page.on("requestfailed", lambda req: log.warning(
                f"[{title}:requestfailed] {req.url} -> {req.failure}"))

            if KEEP_WORKER_ALWAYS_ACTIVE:
                await page.add_init_script("""
                    try {
                      Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
                      Object.defineProperty(document, 'hidden', { get: () => false });
                      document.hasFocus = () => true;
                      setTimeout(() => document.dispatchEvent(new Event('visibilitychange')), 0);
                      setInterval(() => {}, 30000);
                    } catch (e) {}
                """)

            done_flag = None
            if AUTO_CLOSE_WORKER_ON_DONE and USE_HEADLESS:
                done_flag = asyncio.Event()
                await page.expose_function("pyOnRenderDone", lambda detail=None: done_flag.set())
                await page.add_init_script("""
                    window.addEventListener('render-done', e => {
                      try { window.pyOnRenderDone(e && e.detail); } catch(_) {}
                    }, { once: true });
                """)

            await page.goto(page_url, wait_until="load")
            await page.wait_for_load_state("networkidle")
            log.info(f"[worker] ✓ {title} 已就绪 opened {page_url} (headless={USE_HEADLESS})")

            if done_flag is not None:
                await asyncio.wait(
                    [done_flag.wait(), shutdown_evt.wait()],
                    return_when=asyncio.FIRST_COMPLETED
                )
            else:
                await shutdown_evt.wait()

            log.info(f"[worker] {title} closing...")
            with suppress(Exception): await page.close()
            with suppress(Exception): await context.close()
            with suppress(Exception): await browser.close()
            log.info(f"[worker] ✓ {title} 已关闭")
    except Exception as e:
        log.exception("[worker] ✗ %s 启动/运行失败：%s", title, e)

def _launch_workers_thread():
    if not AUTO_LAUNCH_WORKERS:
        log.info("[worker] AUTO_LAUNCH_WORKERS=False，跳过自动打开")
        return
    if not _HAVE_PLAYWRIGHT:
        log.info("[worker] 未安装 playwright，无法自动打开（可手动访问 /2015 /2009）")
        return

    base = f"http://{APP_HOST}:{APP_PORT}/"
    _wait_server_ready_forever(base)

    def _runner():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        WORKER_STATE["loop"] = loop
        WORKER_STATE["shutdown_evt"] = asyncio.Event()

        tasks = []
        if LAUNCH_WORKER_RED2015:
            tasks.append(_boot_one_worker(f"http://{APP_HOST}:{APP_PORT}/2015", "worker2015", WORKER_STATE["shutdown_evt"]))
        if LAUNCH_WORKER_RED2009:
            tasks.append(_boot_one_worker(f"http://{APP_HOST}:{APP_PORT}/2009", "worker2009", WORKER_STATE["shutdown_evt"]))

        async def _all():
            await asyncio.gather(*tasks, return_exceptions=True)

        try:
            loop.run_until_complete(_all())
        finally:
            pending = asyncio.all_tasks(loop=loop)
            for t in pending:
                t.cancel()
            with suppress(Exception):
                loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
            loop.close()
            log.info("[worker] loop closed")

    t = threading.Thread(target=_runner, daemon=True)
    t.start()
    WORKER_STATE["thread"] = t
    log.info("[worker] Worker 启动线程已起")

# ===================== 关停工具 & 路由 =====================
def shutdown_workers(timeout=6.0):
    loop = WORKER_STATE.get("loop")
    evt  = WORKER_STATE.get("shutdown_evt")
    t    = WORKER_STATE.get("thread")

    if loop and evt:
        try:
            loop.call_soon_threadsafe(evt.set)
        except Exception as e:
            log.exception(f"[worker] shutdown_evt set failed: {e}")

    if t and t.is_alive():
        t.join(timeout=timeout)
        if t.is_alive():
            log.info("[worker] worker thread still alive after timeout")

def _kick_http_shutdown():
    with suppress(Exception):
        urllib.request.urlopen(f"http://{APP_HOST}:{APP_PORT}/__shutdown", data=b"bye", timeout=1)

@app.route("/__shutdown", methods=["POST","GET"])
def __shutdown():
    shutdown_workers()
    func = request.environ.get("werkzeug.server.shutdown")
    if func:
        func()
        return "shutting down...", 200
    return "no werkzeug shutdown", 500

def _signal_handler(signum, frame):
    log.info(f"[signal] caught {signum}, graceful shutdown ...")
    shutdown_workers()
    _kick_http_shutdown()

with suppress(Exception): signal.signal(signal.SIGINT, _signal_handler)
with suppress(Exception): signal.signal(signal.SIGTERM, _signal_handler)

@atexit.register
def _on_exit():
    log.info("[exit] atexit cleanup ...")
    shutdown_workers()

# ===================== 入口 =====================
if __name__ == "__main__":
    _picked = int(os.environ.get("TE_ANALYSIS_PORT", "0")) or _get_free_port()
    APP_PORT = _picked

    print(f"__PORT__{APP_PORT}", flush=True)

    log_timestamp = datetime.now().strftime("analysis_%Y%m%d_%H%M%S.txt")
    log_path = os.path.join(LOG_DIR, log_timestamp)
    for handler in log.handlers[:]:
        log.removeHandler(handler)
        handler.close()
    fh = logging.FileHandler(log_path, encoding="utf-8")
    fmt = logging.Formatter(
        "%(asctime)s.%(msecs)03d [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    fh.setFormatter(fmt)
    log.addHandler(fh)
    log.info("BOOT pid=%s", os.getpid())
    log.info("[log] 日志文件：%s", log_path)
    if LOG_RETENTION_DAYS > 0:
        _prune_old_logs(LOG_DIR, "analysis_", LOG_RETENTION_DAYS)

    _start_watchdog_thread()

    init_default_path_json()

    log.info("[data_dir] %s", DATA_DIR)
    log.info("[log] USE_HEADLESS=%s AUTO_LAUNCH_WORKERS=%s LAUNCH_2015=%s LAUNCH_2009=%s KEEP_ALIVE=%s AUTO_CLOSE_ON_DONE=%s",
             USE_HEADLESS, AUTO_LAUNCH_WORKERS, LAUNCH_WORKER_RED2015, LAUNCH_WORKER_RED2009,
             KEEP_WORKER_ALWAYS_ACTIVE, AUTO_CLOSE_WORKER_ON_DONE)
    log.info("[log] HAVE_PLAYWRIGHT=%s HAVE_PYPINYIN=%s HAVE_PIL=%s", _HAVE_PLAYWRIGHT, _HAVE_PYPINYIN, _HAVE_PIL)

    if not _HAVE_PYPINYIN:
        log.warning("未安装 pypinyin，站名拼音将降级（建议：pip install pypinyin）")
    if not _HAVE_PIL:
        log.warning("未安装 Pillow，将以 PNG 头部做轻量校验（建议：pip install pillow）")

    log.info("[worker] WERKZEUG_RUN_MAIN=%s", os.environ.get("WERKZEUG_RUN_MAIN"))

    if AUTO_LAUNCH_WORKERS and _HAVE_PLAYWRIGHT:
        if not (WORKER_STATE.get("thread") and WORKER_STATE["thread"].is_alive()):
            log.info("[worker] starting worker thread (HEADLESS=%s)", USE_HEADLESS)
            if WORKER_STATE.get("stop_evt") is None:
                WORKER_STATE["stop_evt"] = threading.Event()
            t = threading.Thread(target=_launch_workers_thread, daemon=True)
            t.start()
            WORKER_STATE["thread"] = t
    else:
        log.info("[worker] 未自动拉起：AUTO_LAUNCH_WORKERS 或 HAVE_PLAYWRIGHT 不满足")

    try:
        socketio.run(app, host=APP_HOST, port=APP_PORT,
                     debug=False, allow_unsafe_werkzeug=True)
    except KeyboardInterrupt:
        log.info("[main] KeyboardInterrupt")
    except Exception as e:
        log.exception("[main] server crashed: %s", e)
    finally:
        try:
            if WORKER_STATE.get("stop_evt"):
                WORKER_STATE["stop_evt"].set()
        finally:
            shutdown_workers()
            log.info("[main] bye")
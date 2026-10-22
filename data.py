from flask import Flask, jsonify, send_from_directory, request, Response, send_file
from flask_socketio import SocketIO
from flask_cors import CORS
from collections import OrderedDict
from typing import Dict, Any
from datetime import datetime
from threading import Lock
from PIL import Image, ImageFilter
import urllib.request
import tempfile
import numpy as np
import threading
import base64
import logging
import socket
import json
import time
import sys
import io
import os
import re

def _get_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))      # 让系统分配空闲端口
    port = s.getsockname()[1]
    s.close()
    return port

base_dir = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    static_folder=os.path.join(base_dir, "static"),
    static_url_path="/static"
)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

# —— 保证 JSON 不被排序
app.json.sort_keys = False
app.config['JSON_SORT_KEYS'] = False

# —— 常量
ORDER_KEY = "__order__"
IMAGE_EXTS = ('.png', '.jpg', '.jpeg', '.webp')
BG_DIR = os.path.join(base_dir, "static", "Background")

# === 数据目录定位（优先便携，不可写回退） ===
def _get_data_dir() -> str:
    # 尝试使用程序所在目录下的 ticketeditor（便携模式）
    try:
        prog_dir = os.getcwd()                # main.js 已设置 cwd 为 baseDir
        candidate = os.path.join(prog_dir, "ticketeditor")
        os.makedirs(candidate, exist_ok=True)
        # 测试写入权限
        test_file = os.path.join(candidate, ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        return candidate
    except Exception:
        # 无法写入（如 Program Files），回退到系统 AppData
        print("[data.py] 便携目录不可写，回退到系统 AppData 路径", file=sys.stderr)

    # 原系统路径逻辑
    if sys.platform.startswith("win"):
        base = os.getenv("APPDATA") or os.getenv("LOCALAPPDATA") or os.path.expanduser("~")
        return os.path.join(base, "ticketeditor")
    if sys.platform == "darwin":
        return os.path.join(os.path.expanduser("~/Library/Application Support"), "ticketeditor")
    return os.path.join(os.path.expanduser("~/.config"), "ticketeditor")

DATA_DIR = _get_data_dir()
os.makedirs(DATA_DIR, exist_ok=True)

# === per-run log file ===
LOG_DIR = os.path.join(DATA_DIR, "log")
os.makedirs(LOG_DIR, exist_ok=True)

ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S_%f")[:-3]
LOG_PATH = os.path.join(LOG_DIR, f"{ts}.txt")

log = logging.getLogger("ticketeditor")
log.setLevel(logging.INFO)
log.propagate = False

if not any(isinstance(h, logging.FileHandler) and getattr(h, "baseFilename", "") == os.path.abspath(LOG_PATH)
           for h in log.handlers):
    fh = logging.FileHandler(LOG_PATH, encoding="utf-8")
    fmt = logging.Formatter(
        "%(asctime)s.%(msecs)03d [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    fh.setFormatter(fmt)
    log.addHandler(fh)

log.info("BOOT")

@app.before_request
def _log_req():
    log.info("REQ %s %s", request.method, request.path)

# === 文件路径 DATA_DIR  ===
PRESETS_PATH = os.path.join(DATA_DIR, "ad_presets.json")
PRESETS_LOCK = Lock()

PROFILE_PATH = os.path.join(DATA_DIR, "user_profile.json")
FILE_LOCK = Lock()

SETTINGS_PATH = os.path.join(DATA_DIR, "settings.json")
SETTINGS_LOCK = Lock()

# === 默认内容 ===
def _default_profile() -> Dict[str, str]:
    return {"name": "", "id": "", "idType": "", "station": "", "classnum": "", "background": ""}

PROFILE_KEYS = ("name", "id", "idType", "station", "classnum", "background")

def _default_ad_presets() -> OrderedDict:
    od = OrderedDict()
    od[ORDER_KEY] = [
        "梦旅生花",
        "买票请到12306",
        "报销凭证 遗失不补",
        "新春快乐 幸福安康",
        "欢度国庆 祝福祖国",
        "壮丽70年 • 奋斗新时代",
        "奋斗百年路 启航新征程",
        "哈尔滨局集团广告",
        "沈阳局集团广告",
    ]
    od["梦旅生花"] = ["朝辞故里 梦旅生花 ", "祝您旅途愉快"]
    od["买票请到12306"] = ["买票请到12306 发货请到95306", "中国铁路祝您旅途愉快"]
    od["报销凭证 遗失不补"] = ["报销凭证 遗失不补", "退票改签时需交回车站"]
    od["新春快乐 幸福安康"] = ["中国铁路祝您", "新春快乐，幸福安康！"]
    od["欢度国庆 祝福祖国"] = ["欢度国庆 祝福祖国", "中国铁路祝您旅途愉快"]
    od["壮丽70年 • 奋斗新时代"] = ["壮丽70年 • 奋斗新时代", "庆祝中华人民共和国成立70周年"]
    od["奋斗百年路 启航新征程"] = ["奋斗百年路 启航新征程", "热烈庆祝中国共产党成立100周年"]
    od["哈尔滨局集团广告"] = ["哈尔滨局集团票面广告招商", "哈尔滨铁路传媒招商热线4006282678"]
    od["沈阳局集团广告"] = ["中国铁路沈阳局集团公司", "团体订票电话024-12306"]
    return od

# 这些键按字符串原样保存，其余一律当布尔开关
_STRING_SETTING_KEYS = {"scale_factor", "realistic-qr-idtype", "realistic-qr-idno"}


def _default_settings() -> Dict[str, Any]:
    return {
        "auto-pinyin": True,
        "auto-num": True,
        "show-qrcode": True,
        "realistic-qr": False,          # 逼真二维码开关
        "realistic-qr-idtype": "ED",    # 证件类型简编
        "realistic-qr-idno": "",        # 完整证件号
        "activepersonaldefault": True,
        "activeblur": True,
        "scale_factor": "1.00"
    }

# === 结构校验 ===
def _is_valid_profile(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    keys = {"name", "id", "idType", "station", "classnum", "background"}
    if not all(k in obj for k in keys):
        return False
    return all(isinstance(obj[k], str) for k in keys)

def _is_valid_ad_presets(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    if ORDER_KEY not in obj or not isinstance(obj[ORDER_KEY], list):
        return False
    order = obj[ORDER_KEY]
    if not all(isinstance(k, str) for k in order):
        return False
    # 需要 order 中的键都在对象里，且每个业务键是长度<=2的字符串列表
    for k in order:
        if k not in obj:
            return False
        v = obj[k]
        if not isinstance(v, list):
            return False
        if len(v) == 0 or len(v) > 2:
            return False
        if not all(isinstance(x, str) for x in v):
            return False
    return True

# ------------------------ 工具：原子写入（同目录临时文件） ------------------------
def _atomic_write_json(path: str, data: Any, lock: Lock) -> None:
    dirpath = os.path.dirname(path) or "."
    with lock:
        tmpfd, tmppath = tempfile.mkstemp(prefix="._tmp_", suffix=".json", dir=dirpath)
        try:
            with os.fdopen(tmpfd, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            os.replace(tmppath, path)
            log.info("WRITE completed path=%s bytes~=%s", path, os.path.getsize(path) if os.path.exists(path) else -1)
        except Exception:
            log.exception("WRITE failed path=%s tmp=%s", path, tmppath)
            raise
        finally:
            if os.path.exists(tmppath):
                try:
                    os.remove(tmppath)
                except Exception:
                    pass

def _safe_write_presets(ordered: OrderedDict) -> None:
    _atomic_write_json(PRESETS_PATH, ordered, PRESETS_LOCK)

def _safe_write_profile(data: Dict[str, str]) -> None:
    _atomic_write_json(PROFILE_PATH, data, FILE_LOCK)

def _load_ordered(path: str, pairs: bool = False):
    """读取 JSON；pairs=True 时保留键顺序。失败返回 None。"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f, object_pairs_hook=OrderedDict) if pairs else json.load(f)
    except Exception:
        return None

# === 初始化/自修复 ===
def _ensure_files() -> None:
    # profile
    if not _is_valid_profile(_load_ordered(PROFILE_PATH)):
        _safe_write_profile(_default_profile())

    # ad_presets
    if not _is_valid_ad_presets(_load_ordered(PRESETS_PATH, pairs=True)):
        _safe_write_presets(_default_ad_presets())

    # settings：只要求是 dict（缺失键由读取方合并）
    if not isinstance(_load_ordered(SETTINGS_PATH), dict):
        _atomic_write_json(SETTINGS_PATH, _default_settings(), SETTINGS_LOCK)

# ------------------------ 预设规范化（POST / PUT 共用） ------------------------
def _normalize_presets(data_map: dict, order_list: list):
    """裁剪/补齐每项为 2 行字符串，并按 order 去重排序。返回 (OrderedDict, norm_order)。"""
    clean, seen, norm_order = {}, set(), []

    for raw_key, raw_value in data_map.items():
        key = str(raw_key).strip()
        if not key:
            raise ValueError("预设名称不能为空")
        lines = [str(x) for x in raw_value][:2] if isinstance(raw_value, list) else [str(raw_value)]
        while len(lines) < 2:
            lines.append("")
        clean[key] = lines

    for k in order_list:
        k = str(k).strip()
        if k and k in clean and k not in seen:
            norm_order.append(k); seen.add(k)
    for k in clean:
        if k not in seen:
            norm_order.append(k); seen.add(k)

    ordered = OrderedDict()
    ordered[ORDER_KEY] = norm_order
    for k in norm_order:
        ordered[k] = clean[k]
    return ordered, norm_order

def _presets_response(ordered: OrderedDict, norm_order: list):
    socketio.emit("presets_update", ordered)
    return Response(
        json.dumps({"ok": True, "data": ordered, ORDER_KEY: norm_order}, ensure_ascii=False),
        mimetype="application/json"
    )

# ------------------------ ad_presets ------------------------
@app.route("/api/ad-presets")
def get_ad_presets():
    _ensure_files()
    with open(PRESETS_PATH, encoding="utf-8") as f:
        raw = json.load(f, object_pairs_hook=OrderedDict)
    return Response(json.dumps(raw, ensure_ascii=False), mimetype="application/json")

@app.route("/api/ad-presets", methods=["POST"])
def update_ad_presets():
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"ok": False, "error": "无效的 JSON 数据"}), 400

    # A) 数组形：[{key, lines}]
    if isinstance(payload, list):
        data_map = {}
        for item in payload:
            if not isinstance(item, dict) or "key" not in item:
                return jsonify({"ok": False, "error": "数组元素必须包含 key"}), 400
            key = str(item["key"]).strip()
            if not key:
                return jsonify({"ok": False, "error": "预设名称不能为空"}), 400
            lines = item.get("lines", [])
            data_map[key] = lines if isinstance(lines, list) else [str(lines)]
        order_list = [str(it["key"]).strip() for it in payload if "key" in it and str(it["key"]).strip()]

    # B) 包裹形：{"data": {...}, "__order__":[...]}  /  C) 扁平对象 + 可选 __order__
    elif isinstance(payload, dict):
        if isinstance(payload.get("data"), dict):
            data_map, order = payload["data"], payload.get(ORDER_KEY, [])
        else:
            data_map = dict(payload)
            order = data_map.pop(ORDER_KEY, [])
        order_list = [k for k in (str(x).strip() for x in order) if k] if isinstance(order, list) else []
    else:
        return jsonify({"ok": False, "error": "提交内容格式不支持"}), 400

    try:
        ordered, norm_order = _normalize_presets(data_map, order_list)
        _safe_write_presets(ordered)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500

    return _presets_response(ordered, norm_order)

@app.route("/api/ad-presets", methods=["PUT"])
def replace_ad_presets():
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"ok": False, "error": "无效的 JSON 数据"}), 400

    if not isinstance(payload, dict) or not isinstance(payload.get("data"), dict):
        return jsonify({"ok": False, "error": "提交内容必须为 {data, __order__} 结构"}), 400

    order = payload.get(ORDER_KEY, [])
    try:
        ordered, norm_order = _normalize_presets(payload["data"], order if isinstance(order, list) else [])
        _safe_write_presets(ordered)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    return _presets_response(ordered, norm_order)

# ------------------------ 本地依赖完整性自检 ------------------------
# 关键本地资源清单：缺失任一都会导致对应功能失败（如批量渲染卡住）。
_CRITICAL_ASSETS = [
    ("static/html2canvas.min.js", "截图渲染库（导出/批量渲染必需）"),
    ("static/html-to-image.min.js", "图片生成库"),
    ("static/JsBarcode.all.min.js", "条码生成库"),
    ("static/socket.io.min.js", "实时通信库"),
    ("static/pinyin.js", "拼音库"),
    ("static/qrcodebase.js", "二维码库"),
    ("ticketeditor.html", "主界面"),
    ("templates/Sample2015.html", "2015 票面模板"),
    ("templates/Sample2009.html", "2009 票面模板"),
]


def check_local_assets() -> dict:
    """检查关键本地文件是否齐全，返回 {ok, missing:[{path,desc}], checked}。"""
    missing = []
    for rel, desc in _CRITICAL_ASSETS:
        p = os.path.join(base_dir, rel)
        if not os.path.isfile(p) or os.path.getsize(p) == 0:
            missing.append({"path": rel, "desc": desc})
    return {"ok": len(missing) == 0, "missing": missing, "checked": len(_CRITICAL_ASSETS)}


@app.route("/api/asset-check", methods=["GET"])
def api_asset_check():
    result = check_local_assets()
    if result["ok"]:
        app.logger.info("[assets] 本地依赖自检通过（%d 项）", result["checked"])
    else:
        app.logger.error("[assets] 本地依赖缺失 %d 项：%s",
                         len(result["missing"]),
                         ", ".join(m["path"] for m in result["missing"]))
    return jsonify(result)

# ------------------------ 首页 ------------------------
@app.route("/")
def index():
    return send_from_directory(base_dir, "ticketeditor.html")

# ------------------------ Tickets background ------------------------
def _list_backgrounds() -> list:
    os.makedirs(BG_DIR, exist_ok=True)
    return [f for f in os.listdir(BG_DIR) if f.lower().endswith(IMAGE_EXTS)]

@app.route("/api/backgrounds", methods=["GET"])
def get_backgrounds():
    return jsonify({"ok": True, "data": _list_backgrounds()})

@app.route("/api/backgrounds/thumb/<filename>")
def get_background_thumb(filename):
    path = os.path.join(BG_DIR, filename)
    if not os.path.exists(path):
        return "Not found", 404
    try:
        img = Image.open(path)
        # 统一转为 RGB，防止部分带有 Alpha 通道的图片在压缩时报错
        if img.mode != 'RGB':
            img = img.convert('RGB')
        # 使用 LANCZOS 算法生成 320x200 的缩略图（适配高分屏）
        img.thumbnail((320, 200), Image.Resampling.LANCZOS)
        io_buf = io.BytesIO()
        img.save(io_buf, format='JPEG', quality=85)
        io_buf.seek(0)
        return send_file(io_buf, mimetype='image/jpeg')
    except Exception as e:
        return str(e), 500

# =============== 碳带效果合成接口 ===============
def apply_carbon_effect(fg_image: Image.Image) -> Image.Image:
    arr = np.array(fg_image, dtype=np.float32)
    h, w, _ = arr.shape

    def smooth_displacement(radius, strength):
        noise_raw = np.random.rand(h, w).astype(np.float32) * 255
        noise_img = Image.fromarray(noise_raw.astype(np.uint8))
        noise_img = noise_img.filter(ImageFilter.GaussianBlur(radius=radius))
        noise = np.array(noise_img, dtype=np.float32) / 255.0
        dx = (noise - 0.5) * strength
        dy = (noise - 0.5) * strength
        return dx, dy

    dx1, dy1 = smooth_displacement(radius=6, strength=3)   # 大幅波浪
    dx2, dy2 = smooth_displacement(radius=2, strength=1.0)   # 细节抖动

    total_dx = dx1 + dx2
    total_dy = dy1 + dy2

    y_idx, x_idx = np.indices((h, w))
    ny = np.clip((y_idx + total_dy).astype(np.int32), 0, h - 1)
    nx = np.clip((x_idx + total_dx).astype(np.int32), 0, w - 1)

    result = arr[ny, nx, :].copy()
    result_img = Image.fromarray(result.astype(np.uint8), mode="RGBA")
    return result_img.filter(ImageFilter.GaussianBlur(radius=0.65))

def _b64_to_image(b64_str: str, keep_alpha: bool = True):
    b64_str = re.sub(r'^data:image/\w+;base64,', '', b64_str)
    img = Image.open(io.BytesIO(base64.b64decode(b64_str)))
    return img.convert("RGBA") if keep_alpha else img

@app.route("/api/render", methods=["POST"])
def render_ticket_with_effect():
    try:
        payload = request.get_json(force=True)
        fg_b64 = payload.get("foreground")
        bg_b64 = payload.get("background")
        if not fg_b64:
            return jsonify({"ok": False, "error": "缺少前景图"}), 400

        fg_img = _b64_to_image(fg_b64)
        if bg_b64:
            bg_img = _b64_to_image(bg_b64)
            # 缩放背景到和前景相同尺寸
            if bg_img.size != fg_img.size:
                bg_img = bg_img.resize(fg_img.size, Image.LANCZOS)
        else:
            # 无背景则用白色底
            bg_img = Image.new("RGBA", fg_img.size, (255, 255, 255, 255))

        # 应用碳带效果（只对前景）
        fg_processed = apply_carbon_effect(fg_img)

        # 合成：正片叠底（Pillow 无 multiply，手动实现）
        bg_arr = np.array(bg_img, dtype=np.float32)
        fg_arr = np.array(fg_processed, dtype=np.float32)

        # 使用前景 alpha 通道作为蒙版
        alpha = fg_arr[:, :, 3:4] / 255.0
        blended = (bg_arr * fg_arr / 255.0) * alpha + bg_arr * (1 - alpha)
        blended = np.clip(blended, 0, 255).astype(np.uint8)

        final = Image.fromarray(blended, mode="RGBA").convert("RGB")
        buf = io.BytesIO()
        final.save(buf, format="PNG")
        buf.seek(0)
        return send_file(buf, mimetype="image/png")
    except Exception as e:
        log.exception("render_ticket_with_effect failed")
        return jsonify({"ok": False, "error": str(e)}), 500

# ======================== settings ========================
def _safe_read_settings() -> Dict[str, Any]:
    data = _load_ordered(SETTINGS_PATH)
    default = _default_settings()
    if isinstance(data, dict):
        # 合并缺失键，保证结构完整
        default.update(data)
    return default

@app.route("/api/settings", methods=["GET"])
def get_settings():
    return jsonify({"ok": True, "data": _safe_read_settings()})

@app.route("/api/settings", methods=["POST"])
def update_settings():
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"ok": False, "error": "无效的 JSON"}), 400

    current = _safe_read_settings()
    for key in _default_settings():
        if key in payload:
            if key == "scale_factor":
                current[key] = str(payload[key]).strip() or "1.00"
            elif key in _STRING_SETTING_KEYS:
                current[key] = str(payload[key] if payload[key] is not None else "").strip()
            else:
                current[key] = bool(payload[key])

    try:
        _atomic_write_json(SETTINGS_PATH, current, SETTINGS_LOCK)
        return jsonify({"ok": True, "data": current})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ------------------------ user_profile ------------------------
def _safe_read_profile() -> Dict[str, str]:
    data = _load_ordered(PROFILE_PATH)
    if not _is_valid_profile(data):
        # 结构不对：合并默认值以防丢失旧数据
        default = _default_profile()
        if isinstance(data, dict):
            default.update({k: v for k, v in data.items() if k in default})
        return default
    return data

@app.route("/api/user-profile", methods=["GET"])
def get_user_profile():
    _ensure_files()
    return Response(json.dumps({"ok": True, "data": _safe_read_profile()}, ensure_ascii=False),
                    mimetype="application/json")

@app.route("/api/user-profile", methods=["POST"])
def update_user_profile():
    log.info("API user-profile POST begin")
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"ok": False, "error": "无效的 JSON"}), 400

    # 允许部分更新或全量更新
    current_data = _safe_read_profile()
    for key in PROFILE_KEYS:
        if key in payload:
            current_data[key] = str(payload[key]).strip()

    try:
        _safe_write_profile(current_data)
    except Exception as exc:
        return jsonify({"ok": False, "error": f"写入失败：{exc}"}), 500

    socketio.emit("user_profile_update", current_data)
    return jsonify({"ok": True, "data": current_data})

# ------------------------ 文件监听 ------------------------
def _watch_emit(kind: str, data) -> None:
    socketio.emit("presets_update" if kind == "ad_presets" else "user_profile_update", data)
    log.info("WATCH emit ok kind=%s", kind)

def watch_files():
    last_mtime = {}
    paths = [PRESETS_PATH, PROFILE_PATH]
    is_presets = {PRESETS_PATH: True, PROFILE_PATH: False}
    last_bg_files = set(_list_backgrounds()) if os.path.exists(BG_DIR) else set()

    log.info("WATCH start paths=%s", paths)

    while True:
        try:
            # === 第一部分：监听 JSON 配置文件的变动 ===
            for path in paths:
                try:
                    mtime = os.path.getmtime(path)
                except FileNotFoundError:
                    if path in last_mtime:
                        last_mtime.pop(path, None)
                        log.info("WATCH missing %s", path)
                    continue
                except Exception:
                    log.exception("WATCH stat fail %s", path)
                    continue

                if last_mtime.get(path) == mtime:
                    continue

                last_mtime[path] = mtime
                log.info("WATCH changed %s mtime=%s", path, mtime)

                # 读取 + 解析
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        if is_presets[path]:
                            data, kind = json.load(f, object_pairs_hook=OrderedDict), "ad_presets"
                        else:
                            raw = json.load(f)
                            raw = raw if isinstance(raw, dict) else {}
                            data = {k: str(raw.get(k, "")) for k in PROFILE_KEYS}
                            kind = "user_profile"
                except Exception:
                    log.exception("WATCH read/json fail %s", path)
                    continue

                # 广播
                try:
                    _watch_emit(kind, data)
                except Exception:
                    log.exception("WATCH emit fail kind=%s", kind)

            # === 第二部分：监听 Background 文件夹内的图片增减 ===
            if os.path.exists(BG_DIR):
                current_bg_files = set(_list_backgrounds())
                if current_bg_files != last_bg_files:
                    last_bg_files = current_bg_files
                    log.info("WATCH changed Background folder")
                    socketio.emit("backgrounds_update", {"updated": True})

        except Exception:
            log.exception("WATCH loop crash")
        time.sleep(1)

# === 启动前确保文件就绪 ===
_ensure_files()

# 启动监听线程
try:
    t = threading.Thread(target=watch_files, daemon=True, name="watch_files")
    t.start()
    log.info("WATCH_THREAD started daemon=%s name=%s", t.daemon, t.name)
except Exception:
    log.exception("WATCH_THREAD failed to start")

if __name__ == "__main__":
    try:
        env_port = os.environ.get("TE_DATA_PORT", "0")
        port = int(env_port) or _get_free_port()
        log.info("PORT selected port=%s env_TE_DATA_PORT=%s", port, env_port)

        print(f"__PORT__{port}", flush=True)

        log.info("SERVER starting host=%s port=%s", "127.0.0.1", port)
        socketio.run(
            app,
            host="127.0.0.1",
            port=port,
            use_reloader=False,
            allow_unsafe_werkzeug=True
        )
    except Exception:
        log.exception("SERVER failed to start")
        raise

(() => {
  const root = document.querySelector('.page.red2009');
  if (!root) return;

  // 工具
  const $id = (id) => root.querySelector('#' + id);
  const on  = (el, evt, fn) => el && el.addEventListener(evt, fn);
  const emit = (type, detail) => window.dispatchEvent(new CustomEvent(type, { detail }));

  function init() {
    // ---------- 1) 金额（￥图层开关 + 数字清洗） ----------
    const inputPrice   = $id('input-price2009');
    const previewPrice = $id('preview-price');
    const rmbImg       = $id('rmbold');

    const cleanMoney = (v) => String(v || '')
      .replace(/[^\d.]/g, '')
      .replace(/^0+(\d)/, '$1')
      .replace(/(\..*)\./g, '$1');

    function updatePrice() {
      if (!inputPrice || !previewPrice) return;
      const val = cleanMoney(inputPrice.value);
      if (rmbImg) rmbImg.style.display = val ? 'block' : 'none';
      previewPrice.innerHTML = val
        ? `${val}<span style="font-family:'寒蝉端黑宋'; font-size:15px; margin-left:2px;">元</span>`
        : '';
      inputPrice.value = val;
    }
    on(inputPrice, 'input', updatePrice);

    // ---------- 2) 限乘（直接映射） ----------
    const inputLimit = $id('input-limitation');
    const previewLimit = $id('preview-limitation');
    const updateLimit = () => { if (previewLimit) previewLimit.textContent = (inputLimit?.value || '').trim(); };
    on(inputLimit, 'input', updateLimit);

    // ---------- 3) 有效期（仅数字一位 → 完整句） ----------
    const inputValid   = $id('input-validdata');
    const previewValid = $id('preview-valuedate');
    function updateValid() {
      if (!inputValid || !previewValid) return;
      const digits = (inputValid.value || '').replace(/\D/g, '').slice(0, 1);
      inputValid.value = digits;
      previewValid.textContent = digits ? `在${digits}日内到有效` : '';
    }
    on(inputValid, 'input', updateValid);

    // ---------- 4) 下票号（5 段拼 3 段） ----------
    const p1 = $id('bot-part1');  // TMIS（5）
    const p2 = $id('bot-part2');  // 窗口/日期（9）
    const p3 = $id('bot-part3');  // 上票号（≤8）
    const p4 = $id('bot-part4');  // 34 位数（≤34）
    const p5 = $id('bot-part5');  // 公里数（≤4）
    const previewBot = $id('preview-botnum');

    const joinStr = (a, b) => (a || '') + (b || '');
    const trimSpaces = (s) => String(s || '').replace(/\s+/g, '');

    function updateBotnum() {
      if (!previewBot) return;
      const s1 = joinStr(trimSpaces(p1?.value), trimSpaces(p2?.value));
      const s2 = trimSpaces(p3?.value);
      const s3 = joinStr(trimSpaces(p4?.value), trimSpaces(p5?.value));
      const out = [s1, s2, s3].filter(Boolean).join('&nbsp;&nbsp;');
      previewBot.innerHTML = out;
      emit('botnum-changed');
    }
    [p1, p2, p3, p4, p5].forEach(el => on(el, 'input', updateBotnum));

    // ---------- 4.5 上票号：仅“组号 + 上票号”（互不干扰） ----------
    const inputTopNum   = $id('input-topnum');
    const previewTopNum = $id('preview-topnum');
    const classInpLocal = $id('input-classnum');
    const getClassNumLocal = () =>
      (classInpLocal?.value || classInpLocal?.dataset?.previewDefault || '').trim();
    function renderTopCombined() {
      if (!previewTopNum) return;
      const classNum = getClassNumLocal();
      const topNum   = (inputTopNum?.value || inputTopNum?.dataset?.previewDefault || '').trim();
      previewTopNum.textContent = classNum + topNum;
    }
    on(inputTopNum,   'input',           renderTopCombined);
    on(inputTopNum,   'change',          renderTopCombined);
    on(classInpLocal, 'input',           renderTopCombined);
    on(classInpLocal, 'change',          renderTopCombined);
    on(classInpLocal, 'preview-refresh', renderTopCombined);

    // ---------- 5) 其他镜像（车次/席别/席位） ----------
    [
      ['input-traincodeold', 'preview-traincodeold'],
      ['input-seattypesold', 'preview-seattype'],
      ['input-seat',         'preview-seat'], // SeatFormat 会覆盖预览
    ].forEach(([i, v]) => {
      const src = $id(i), dst = $id(v);
      if (!src || !dst) return;
      on(src, 'input', () => {
        if (i === 'input-traincodeold') {
          const val = src.value.trim();
          dst.innerHTML = val
            ? `${val}<span style="font-family:'寒蝉端黑宋','regular',Arial,sans-serif; font-size:15px; letter-spacing:1px;">次</span>`
            : '';
        } else {
          dst.textContent = src.value;
        }
      });
    });

    // ---------- 6) 发售站（末尾加圈“售”） ----------
const inputTicketOffice   = $id('input-ticketoffice');
const previewTicketoffice = $id('preview-ticketoffice');
const ticketOfficePng     = $id('ticketofficepng'); // 新增：控制这张图显示/隐藏

// 只对“兜底值”做一次去尾部 1 个“售”
function normalizeOffice(s) {
  return String(s || '').trim().replace(/售$/, '');
}

// placeholder 同步（保留原 placeholder 作兜底）
function syncOfficePlaceholder() {
  if (!inputTicketOffice) return;
  if (inputTicketOffice.dataset.placeholderOrig === undefined) {
    inputTicketOffice.dataset.placeholderOrig = inputTicketOffice.getAttribute('placeholder') || '';
  }
  const orig = inputTicketOffice.dataset.placeholderOrig || '';
  const def  = inputTicketOffice.dataset.previewDefault || '';
  inputTicketOffice.setAttribute('placeholder', def || orig);
}

// 预览：优先 value，空则回退 previewDefault（并规范化一枚“售”）
function renderTicketOfficeStrong() {
  if (!previewTicketoffice || !inputTicketOffice) return;

  const raw = (inputTicketOffice.value || '').trim();
  const fallback = inputTicketOffice.dataset.previewDefault || '';

  //无论来自输入还是兜底，都只去掉末尾一个“售”
  const base = normalizeOffice(raw || fallback);

  // 主文字
  previewTicketoffice.textContent = base || '';
  if (ticketOfficePng) {
    ticketOfficePng.style.display = base ? 'block' : 'none';
  }
}

// 绑定（只一次）：输入、更改、以及外部预设写入时的 preview-refresh
if (inputTicketOffice && !inputTicketOffice.__boundOffice__) {
  ['input','change','preview-refresh'].forEach(evt => {
    inputTicketOffice.addEventListener(evt, () => {
      if (evt === 'preview-refresh') syncOfficePlaceholder();
      // 放到本轮尾部，覆盖旧渲染
      setTimeout(renderTicketOfficeStrong, 0);
    });
  });
  inputTicketOffice.__boundOffice__ = true;
}

// 初始对齐
syncOfficePlaceholder();
renderTicketOfficeStrong();

/* ---------- 6) 进页面时初始化一次 ---------- */
function boot() {
  updatePrice();
  updateLimit();
  updateValid();
  updateBotnum();
}
// DOM 就位后再跑一遍，避免初次为空
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once:true });
} else {
  boot();
}

// ---------- 7) 发/到站字体（后端指令驱动） ----------
const previewFrom = $id('preview-from');
const previewTo   = $id('preview-to');

const cssFontFor = (choice) => ({
  黑体: "'思源黑体 CN', sans-serif",
  楷体: "'华文行楷', serif"
}[choice] || "'思源黑体 CN', 'Source Han Sans CN Medium', 'Noto Sans CJK SC Medium', sans-serif");

const tweak = {
  黑体: { sizePx: 20, shiftY: -2 },
  楷体: { sizePx: 24, shiftY:  0 },
};

const rebaseFontSizeAsBaseline = (el, px) => {
  if (!el) return;
  const s = `${px}px`;
  el.style.fontSize = s;
  el.dataset.fs0 = s;
  el.dataset.fs0Num = String(px);
};
const setTranslateY = (el, yPx) => {
  if (!el) return;
  const cleaned = (el.style.transform || '').replace(/translateY\([^)]*\)\s*/g, '').trim();
  el.style.transform = `${cleaned} translateY(${yPx}px)`.trim();
};
const loadCandidateFonts = async () => {
  try {
    if (document.fonts?.load) {
      await Promise.race([
        document.fonts.load("16px '思源黑体 CN Medium'"),
        document.fonts.load("16px '华文行楷'"),
      ]);
    }
  } catch {}
};

async function applyStationFont(fontChoice) {
  if (!previewFrom || !previewTo) return;
  const chosen = (fontChoice === '楷体') ? '楷体' : '黑体';
  await loadCandidateFonts();
  const cssFont = cssFontFor(chosen);
  [previewFrom, previewTo].forEach((el) => {
    el.style.setProperty('font-family', cssFont, 'important');
    const t = tweak[chosen];
    rebaseFontSizeAsBaseline(el, t.sizePx);
    setTranslateY(el, t.shiftY);
  });
  emit('red2009:station-font-applied', { font: chosen });
}

// 自定义事件
window.addEventListener('red2009:station-font', (e) => {
  const font = e?.detail?.font;
  if (font) applyStationFont(font);
});
// postMessage
window.addEventListener('message', (ev) => {
  const msg = ev?.data;
  if (msg && msg.type === 'red2009:station-font' && msg.font) applyStationFont(msg.font);
});

// Socket 广播（只绑定一次；仅负责换字库，不做渲染管线）
(function bindFontChannelOnce(){
  const s = window.socket || window.backendSocket;
  if (!s || typeof s.on !== 'function' || s.__red2009StationFontBound) return;
  s.on('red2009:station-font', (payload) => {
    const font = (payload && typeof payload === 'object') ? payload.font : payload;
    if (font) applyStationFont(font);
  });
  // 可选：在 render-row 里“只提取字体”，避免和批处理脚本重复保存
  s.on('render-row', ({ payload } = {}) => {
    const csvFont = payload?.red2009_font || payload?.station_font || payload?.font;
    if (csvFont) applyStationFont(csvFont);
  });
  s.__red2009StationFontBound = true;
})();

// 容器默认值
const defaultFont = root.dataset.stationFont;
if (defaultFont) applyStationFont(defaultFont);

// 显式 API
window.red2009StationFont = { apply: applyStationFont, variants: ['黑体', '楷体'] };

    // ---------- 8) “经由”+ 抬升管家 ----------
    const inpVia1 = $id('via2009-part1');
    const inpVia2 = $id('via2009-part2');
    const inpVia3 = $id('via2009-part3');
    const inpVia4 = $id('via2009-part4');

    const pvFromPy = $id('preview-FromPinyin');
    const pvToPy   = $id('preview-ToPinyin');
    const pvTrain  = $id('preview-traincodeold');
    const pvArrow  = $id('arrow2009');

    const LIFT_FROM_TO = -9, LIFT_PINYIN = -12, LIFT_TRAIN = -9, FONT_DELTA = -1;

    const previewContainer = root.querySelector('#preview') || root;
    const ensureSpan = (id, cssText) => {
      let el = root.querySelector('#' + id);
      if (!el) {
        el = document.createElement('span');
        el.id = id;
        el.style.cssText = cssText;
        previewContainer.appendChild(el);
      }
      return el;
    };
    const spanVia1  = ensureSpan('preview-via2009-1',
      `position:absolute; left:80px; top:71px; transform:translateX(-50%); white-space:nowrap;
       font-family:"寒蝉端黑宋","宋体","Songti SC",serif; font-size:12px; color:#000; pointer-events:none; user-select:none;`);
    const spanVia23 = ensureSpan('preview-via2009-23',
      `position:absolute; left:276px; top:71px; transform:translateX(-50%); white-space:nowrap;
       font-family:"寒蝉端黑宋","宋体","Songti SC",serif; font-size:12px; color:#000; pointer-events:none; user-select:none;`);
    const spanVia4  = ensureSpan('preview-via2009-4',
      `position:absolute; left:182px; top:125px; white-space:nowrap; text-align:left;
       font-family:"思源黑体 CN","宋体","Songti SC",serif; font-size:14px; color:#000; pointer-events:none; user-select:none;`);

    const Lift = (() => {
      let inited = false;
      function stashBase(el) {
        if (!el || el.dataset.liftInit === '1') return;
        const cs = getComputedStyle(el);
        el.dataset.top0    = el.style.top      || cs.top      || '0px';
        el.dataset.fs0     = el.style.fontSize || cs.fontSize || '';
        el.dataset.top0Num = String(parseFloat(cs.top      || '0') || 0);
        el.dataset.fs0Num  = String(parseFloat(cs.fontSize || '0') || 0);
        el.dataset.liftInit = '1';
      }
      function initOnce() {
        if (inited) return;
        [previewFrom, pvFromPy, previewTo, pvToPy, pvTrain, pvArrow].forEach(stashBase);
        inited = true;
      }
      function apply(active) {
        initOnce();
        [previewFrom, previewTo].forEach(el => {
          if (!el) return;
          const top0Str = el.dataset.top0 || '0px';
          const top0Num = parseFloat(el.dataset.top0Num || '0');
          const fs0Str  = el.dataset.fs0  || '';
          const fs0Num  = parseFloat(el.dataset.fs0Num  || '0');
          if (active) {
            el.style.top = (top0Num + LIFT_FROM_TO) + 'px';
            if (fs0Num) el.style.fontSize = (fs0Num + FONT_DELTA) + 'px';
          } else {
            el.style.top      = top0Str;
            el.style.fontSize = fs0Str;
          }
        });
        [pvFromPy, pvToPy].forEach(el => {
          if (!el) return;
          const top0Str = el.dataset.top0 || '0px';
          const top0Num = parseFloat(el.dataset.top0Num || '0');
          el.style.top = active ? (top0Num + LIFT_PINYIN) + 'px' : top0Str;
        });
        if (pvTrain) {
          const top0Str = pvTrain.dataset.top0 || '0px';
          const top0Num = parseFloat(pvTrain.dataset.top0Num || '0');
          pvTrain.style.top = active ? (top0Num + LIFT_TRAIN) + 'px' : top0Str;
        }
        if (pvArrow) {
          const top0Str = pvArrow.dataset.top0 || '0px';
          const top0Num = parseFloat(pvArrow.dataset.top0Num || '0');
          pvArrow.style.top = active ? (top0Num + LIFT_FROM_TO) + 'px' : top0Str;
        }
      }
      const ACTIVE = new Set();
      return {
        set(source, on) { if (on) ACTIVE.add(source); else ACTIVE.delete(source); apply(ACTIVE.size > 0); }
      };
    })();
    window.__red2009Lift = Lift;

    function updateVia() {
      const v1 = (inpVia1?.value || '').trim();
      const v2 = (inpVia2?.value || '').trim();
      const v3 = (inpVia3?.value || '').trim();
      const v4 = (inpVia4?.value || '').trim();
      const active = !!(v1 || v2 || v3 || v4);
      Lift.set('via', active);
      spanVia1.textContent  = v1 ? `（经由${v1}）` : '';
      spanVia23.textContent = (v2 || v3) ? `（${v2 || ''}至${v3 || ''}）` : '';
      spanVia4.textContent  = v4 ? `至${v4}` : '';
    }
    [inpVia1, inpVia2, inpVia3, inpVia4].forEach(el => on(el, 'input', updateVia));

    // ---------- 9) SeatFormat ----------
    const FONT_NUM = 'Btp';
    const FONT_CN  = `"寒蝉端黑宋","宋体","Songti SC",serif`;
    const SIZE     = 15;
    const BTPSIZE  = 16.5;
    const toFullSpace = (s) => String(s ?? '').replace(/ /g, '\u2007');

    function parseSeat(raw, seatType) {
      const seatTypeStr = String(seatType || '');
      const hasWo  = /卧|一人软包/.test(seatTypeStr);
      const hasZuo = /座/.test(seatTypeStr);

      if (hasWo) {
        const fw = toFullSpace(String(raw || ''));
        const plus = fw.startsWith('+');
        const m = plus
          ? fw.match(/^\+(\d)([012])([0-9A-Za-z\u2007]{3})([012])$/)
          : fw.match(/^(\d{2})([012])([0-9A-Za-z\u2007]{3})([012])$/);
        if (!m) return { view:[{ text: fw, font: FONT_CN, size: SIZE, color:'rgba(0, 0, 0, 1)' }], error:true };

        const car         = m[1];
        const levelCode   = m[2];
        const bedNum      = m[3];
        const bedTypeCode = m[4];

        const levelText   = levelCode === '1' ? '下' : levelCode === '2' ? '上' : '';
        const bedTypeText = bedTypeCode === '0' ? '下铺'
                             : bedTypeCode === '1' ? '中铺'
                             : bedTypeCode === '2' ? '上铺' : '';

        const view = [];
        if (plus) view.push({ text:'加', font:FONT_CN, size:SIZE, top:0.5 });
        view.push({ text:car,  font:FONT_NUM, size:BTPSIZE });
        view.push({ text:'车', font:FONT_CN,  size:SIZE, top:0.5 });
        if (levelText) view.push({ text:levelText, font:FONT_CN, size:SIZE });

        let rest = bedNum;
        const leadSpace = rest.match(/^[\u2007]+/);
        if (leadSpace) { view.push({ text: leadSpace[0], font: FONT_CN, size: SIZE }); rest = rest.slice(leadSpace[0].length); }
        const digits = rest.match(/^\d+/);
        if (digits)   { view.push({ text: digits[0], font: FONT_NUM, size: BTPSIZE }); rest = rest.slice(digits[0].length); }
        if (rest)     { view.push({ text: rest, font: FONT_CN, size: SIZE }); }

        view.push({ text:'号', font:FONT_CN, size:SIZE, top:0.5 });
        if (bedTypeText) view.push({ text:bedTypeText, font:FONT_CN, size:SIZE });

        return { car, level:levelText, seat:bedNum, bedType:bedTypeText, view, error:false };
      }

      if (hasZuo) {
        const fw = toFullSpace(String(raw || ''));
        const plus = fw.startsWith('+');
        const m = plus
          ? fw.match(/^\+(\d)([012])([0-9A-Za-z\u2007]{2,3})$/)
          : fw.match(/^(\d{2})([012])([0-9A-Za-z\u2007]{2,3})$/);
        if (!m) return { view:[{ text: fw, font: FONT_CN, size: SIZE, color:'rgba(0,0,0,1)' }], error:true };

        const car       = m[1];
        const levelCode = m[2];
        const seatPart  = m[3];
        const levelText = levelCode === '1' ? '下' : levelCode === '2' ? '上' : '';

        const view = [];
        if (plus) view.push({ text:'加', font:FONT_CN, size:SIZE, top:0.5 });
        view.push({ text: car,  font: FONT_NUM, size: BTPSIZE });
        view.push({ text: '车', font: FONT_CN,  size: SIZE, top:0.5 });
        if (levelText) view.push({ text: levelText, font: FONT_CN, size: SIZE, top:0.5 });

        let rest = seatPart;
        const leadSpace = rest.match(/^[\u2007]+/);
        if (leadSpace) { view.push({ text: leadSpace[0], font: FONT_CN, size: SIZE }); rest = rest.slice(leadSpace[0].length); }
        const digits = rest.match(/^\d+/);
        if (digits)   { view.push({ text: digits[0], font: FONT_NUM, size: BTPSIZE }); rest = rest.slice(digits[0].length); }
        if (rest)     { view.push({ text: rest, font: FONT_CN, size: SIZE }); }

        view.push({ text: '号', font: FONT_CN, size: SIZE, top:0.5 });

        const prefix = plus ? '加' : '';
        return {
          car, level: levelText, seat: seatPart, view,
          showStr: prefix + car + '车' + (levelText || '') + seatPart + '号'
        };
      }

      return { view:[{ text: toFullSpace(raw), font: FONT_CN, size: SIZE }], error:false };
    }

    const inpSeat  = $id('input-seat');
    const inpType  = $id('input-seattypesold');
    const pvSeat   = $id('preview-seat');

    const renderView = (parts, el) => {
      if (!el) return;
      el.innerHTML = '';
      parts.forEach(p => {
        const span = document.createElement('span');
        span.textContent      = p.text ?? '';
        span.style.fontFamily = p.font || FONT_CN;
        span.style.fontSize   = (p.size || SIZE) + 'px';
        if (p.color) span.style.color = p.color;
        if (p.style) span.style.cssText += ';' + p.style;
        if (p.top !== undefined && p.top !== null) {
          span.style.position = 'relative';
          span.style.top = (typeof p.top === 'number' ? p.top + 'px' : String(p.top));
        }
        el.appendChild(span);
      });
    };

    function paintSeat() {
      if (!pvSeat) return;
      if (inpSeat) {
        const replaced = toFullSpace(inpSeat.value);
        if (replaced !== inpSeat.value) inpSeat.value = replaced;
      }
      const parsed = parseSeat(inpSeat?.value ?? '', inpType?.value ?? '');
      renderView(parsed.view, pvSeat);
    }
    on(inpSeat, 'input', paintSeat);
    on(inpType, 'input', paintSeat);
    window.SeatFormat = window.SeatFormat || {};
    window.SeatFormat.red2009 = { parseSeat };

  // ---------- 10) 备注圈字 ----------
(function () {
  const inputNotice2009   = document.getElementById('input-notice2009');
  const previewNotice2009 = document.getElementById('preview-notice2009');

  if (!inputNotice2009 || !previewNotice2009) return;

  const esc = (s) => String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');

  function renderCircleRunes(text) {
    const chars = [...String(text).replace(/\s+/g, '')]; // 去空白，逐字圈
    return chars.map(ch => (
      `<span style="
        display:inline-flex;
        justify-content:center;
        align-items:center;
        width:18.5px;
        height:18.5px;
        border:1.5px solid black;
        border-radius:50%;
        margin:1px;
        font-size:15px;
        font-family:'寒蝉端黑宋',sans-serif;
        box-sizing:border-box;
      ">
        <span style="position:relative; top:-0.1px; left:0.1px; line-height:1;">${esc(ch)}</span>
      </span>`
    )).join('');
  }

  function updateNoticePreview2009() {
    const raw = (inputNotice2009.value || '').trim();
    previewNotice2009.innerHTML = raw ? renderCircleRunes(raw) : '';
  }

  // 事件绑定
  inputNotice2009.addEventListener('input',  updateNoticePreview2009);
  inputNotice2009.addEventListener('change', updateNoticePreview2009);

  // 首次渲染 + 切页回显
  updateNoticePreview2009();
  window.addEventListener('page-switched', (e) => {
    if (e?.detail?.page === 'red2009') updateNoticePreview2009();
  });
})();
    // ---------- 11) 开车时间（YYYYMMDDHHmm → “YYYY年MM月DD日HH:mm开”） ----------
(function depart2009(){
  const inputDepart   = $id('input-date2009');
  const previewDepart = $id('preview-date2009') || $id('preview-date') || $id('preview-time');
  if (!inputDepart || !previewDepart) return;

  function mkDigit(txt) {
    const s = document.createElement('span');
    s.style.fontFamily = 'Btp, Arial, sans-serif';
    s.style.fontSize   = '16.5px';
    s.style.letterSpacing = '0.2px';
    s.textContent = txt;
    return s;
  }
  function mkCn(txt) {
    const s = document.createElement('span');
    s.style.fontFamily = '"寒蝉端黑宋","宋体","Songti SC",serif';
    s.style.fontSize   = '14px';
    s.textContent = txt;
    return s;
  }

  // 新增：为冒号单独建函数，下沉 2px
  function mkColon() {
    const s = document.createElement('span');
    s.textContent = ':';
    s.style.position = 'relative';
    s.style.top = '2px';
    return s;
  }

  function renderDepart() {
    const raw = String(inputDepart.value || '').replace(/\D/g, '');
    if (!raw) { previewDepart.textContent = ''; previewDepart.style.display = 'none'; return; }
    previewDepart.style.display = '';
    const s  = (raw + '000000000000').slice(0, 12);
    const yyyy = s.slice(0, 4), MM = s.slice(4, 6), dd = s.slice(6, 8), HH = s.slice(8, 10), mm = s.slice(10, 12);
    previewDepart.textContent = '';
    previewDepart.append(
      mkDigit(yyyy), mkCn('年'),
      mkDigit(MM), mkCn('月'),
      mkDigit(dd), mkCn('日'),
      mkDigit(HH), mkColon(), mkDigit(mm), mkCn('开')
    );
  }

  on(inputDepart, 'input',           renderDepart);
  on(inputDepart, 'change',          renderDepart);
  on(inputDepart, 'preview-refresh', renderDepart);
  renderDepart();
})();

    // ---------- 12) 站名/拼音（拼音仅直接映射；站名按长度排版） ----------
    (function station2009(){
      const inputFrom          = $id('input-from');
      const inputFromPinyin    = $id('input-from-pinyin');
      const previewFromName    = $id('preview-from');
      const previewFromPinyin  = $id('preview-FromPinyin');

      const inputTo            = $id('input-to');
      const inputToPinyin      = $id('input-to-pinyin');
      const previewToName      = $id('preview-to');
      const previewToPinyin    = $id('preview-ToPinyin');

      const FROM_BASE_LEFT = 18;
      const TO_BASE_LEFT   = 214;

      const updateCn = (elem, value, baseLeft) => {
        if (!elem) return;
        const val = String(value || '');
        let len = Math.min(val.length, 5);
        let spacing = '0px'; if (len === 2) spacing = '23px'; if (len === 3) spacing = '4px';
        let leftOffset = (len === 2) ? 12 : 0;
        elem.innerHTML = val.replace(/ /g, '&nbsp;');
        elem.style.letterSpacing = spacing;
        elem.style.left = (baseLeft + leftOffset) + 'px';
      };
      const updatePy = (preview, inp) => { if (preview) preview.textContent = inp?.value || ''; };

      const handleFrom = () => updateCn(previewFromName, (inputFrom?.value || '').trim(), FROM_BASE_LEFT);
      const handleTo   = () => updateCn(previewToName,   (inputTo?.value   || '').trim(), TO_BASE_LEFT);

      on(inputFrom,       'input', handleFrom);
      on(inputTo,         'input', handleTo);
      on(inputFromPinyin, 'input', () => updatePy(previewFromPinyin, inputFromPinyin));
      on(inputToPinyin,   'input', () => updatePy(previewToPinyin,   inputToPinyin));

      handleFrom(); handleTo();
      updatePy(previewFromPinyin, inputFromPinyin);
      updatePy(previewToPinyin,   inputToPinyin);
    })();

    // ---------- 13) 条码（复用二维码开关；监听 botnum-changed + 兜底观察） ----------
    (function barcode2009(){
      const preview = root.querySelector('#preview');
      if (!preview) return;

      const ticketSettings = (window.ticketSettings = window.ticketSettings || {});
      const BARCODE_KEY = 'showQrcode';
      const qrCheckbox = document.getElementById('show-qrcode');

      if (typeof ticketSettings[BARCODE_KEY] !== 'boolean') {
        ticketSettings[BARCODE_KEY] = qrCheckbox ? !!qrCheckbox.checked : true;
      } else if (qrCheckbox) {
        qrCheckbox.checked = ticketSettings[BARCODE_KEY];
      }

      let box = root.querySelector('#preview-barcode');
      if (!box) {
        box = document.createElement('div');
        box.id = 'preview-barcode';
        preview.appendChild(box);
      }
      Object.assign(box.style, {
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        bottom: '28px', height: '31px', width: '306px',
        overflow: 'visible', background: 'transparent', pointerEvents: 'none', zIndex: 10
      });

      const getText = id => (root.querySelector(`#${id}`)?.textContent.trim() || '');
      const isOn = () => (typeof ticketSettings[BARCODE_KEY] === 'boolean')
        ? ticketSettings[BARCODE_KEY] : (qrCheckbox ? !!qrCheckbox.checked : true);

      function generate() {
        if (!isOn()) { box.innerHTML = ''; return; }
        let botNum = getText('preview-botnum').replace(/[^\x20-\x7E]/g, '');
        const totalLen = 56;
        botNum = botNum ? botNum.padEnd(totalLen, '1').slice(0, totalLen) : '1'.repeat(totalLen);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svg, botNum, { format: 'CODE128', width: 1.2, height: 36, displayValue: false, margin: 0, background: 'transparent' });
        svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); svg.setAttribute('preserveAspectRatio', 'none');
        box.innerHTML = ''; box.appendChild(svg);
      }

      generate();
      window.addEventListener('botnum-changed', generate);
      const botEl = root.querySelector('#preview-botnum');
      if (botEl) new MutationObserver(generate).observe(botEl, { childList: true, characterData: true, subtree: true });

      if (qrCheckbox) on(qrCheckbox, 'change', () => {
        ticketSettings[BARCODE_KEY] = !!qrCheckbox.checked;
        generate();
      });

      window.addEventListener('ticket-settings-changed', (e) => {
        const d = e?.detail;
        if (!d) return;
        if (d.key && d.key !== BARCODE_KEY) return;
        if (!d.key && (!d.settings || !Object.prototype.hasOwnProperty.call(d.settings, BARCODE_KEY))) return;
        generate();
      });
    })();

    // ---------- 14) 初始对齐 ----------
    // 注意：各模块自己的首次渲染都有调用
    updatePrice();
    updateLimit();
    updateValid();
    updateBotnum();
    renderTopCombined();
    syncOfficePlaceholder();
    renderTicketOfficeStrong();
    updateVia();
    paintSeat();
  }

  // 单一 DOMContentLoaded 入口
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

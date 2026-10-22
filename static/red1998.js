(() => {
  // 只操作 red1998这一页，缺控件也不报错
  const root = document.querySelector('.page.red1998');
  if (!root) return;
  const $id = (id) => root.querySelector('#' + id);
  const on  = (el, evt, fn) => el && el.addEventListener(evt, fn);

/* ---------- 1) 金额（票面直接写“全　价”） ---------- */
const inputPrice   = $id('input-price2009_1998');   // 金额输入框
const previewPrice = $id('preview-price_1998');     // 金额数字显示

function cleanMoney(v) {
  return (v || '')
    .replace(/[^\d.]/g, '')       // 仅保留数字和小数点
    .replace(/^0+(\d)/, '$1')     // 去掉多余前导0
    .replace(/(\..*)\./g, '$1');  // 只保留一个小数点
}

const chkPriceGap = $id('pricegap_1998');   // “全价空格”开关

function updatePrice() {
  if (!inputPrice || !previewPrice) return;
  const val = cleanMoney(inputPrice.value);

  if (val) {
    // 勾选时用全角空格（U+3000，与一个汉字等宽）分开“全”“价”，不勾选就紧贴写成“全价”
    const gap = (chkPriceGap && chkPriceGap.checked) ? '\u3000' : '';
    previewPrice.innerHTML = `全${gap}价 ${val}<span style="font-family:'寒蝉端黑宋'; font-size:15px; margin-left:2px;">元</span>`;
  } else {
    previewPrice.textContent = '';
  }
  // 回写清洗后的值
  inputPrice.value = val;
}
on(inputPrice, 'input', updatePrice);
on(chkPriceGap, 'change', updatePrice);

  /* ---------- 2) 限乘（直接映射） ---------- */
  const inputLimit   = $id('input-limitation_1998');
  const previewLimit = $id('preview-limitation_1998');
  function updateLimit() {
    if (!previewLimit) return;
    previewLimit.textContent = (inputLimit?.value || '').trim();
  }
  on(inputLimit, 'input', updateLimit);

  /* ---------- 3) 有效期（输入什么就显示什么） ---------- */
  const inputValid   = $id('input-validdata_1998');   // 你的输入框 id
  const previewValid = $id('preview-valuedate_1998'); // 票面展示用的 span
  function updateValid() {
    if (!previewValid || !inputValid) return;
    previewValid.textContent = (inputValid.value || '').trim();
  }
  on(inputValid, 'input', updateValid);

  /* ---------- 3.5) 软票费：勾选时在左下角加“含软票费 1.00 元” ---------- */
  const chkSoftFee      = $id('softfee_1998');
  const previewSoftFee  = $id('preview-softfee_1998');
  function updateSoftFee() {
    if (!previewSoftFee) return;
    previewSoftFee.style.display = (chkSoftFee && chkSoftFee.checked) ? 'block' : 'none';
  }
  on(chkSoftFee, 'change', updateSoftFee);
  updateSoftFee();

  /* ---------- 4) 下票号（整串一个输入框） ---------- */
  const botNumInput = $id('input-botnum_1998');   // 下票号（整行）
  const previewBot  = $id('preview-botnum_1998');

  // 显示规则：
  //   > 13 位：第 12、13 位之间插一个全角空格
  //   ≤ 13 位：左右各加一个 *（* 只用于显示，不参与条码编码）
  const BOT_LONG_MIN = 14;      // 即“大于 13 位”
  function formatBotText(raw) {
    const t = String(raw || '');
    if (!t) return '';
    if (t.length >= BOT_LONG_MIN) return t.slice(0, 12) + '\u3000' + t.slice(12);
    return '*' + t + '*';
  }

  function updateBotnum() {
    if (!previewBot) return;
    const val = (botNumInput?.value || '').trim();
    previewBot.innerHTML = formatBotText(val).replace(/ /g, '&nbsp;');
    window.dispatchEvent(new Event('botnum-changed'));
  }
  on(botNumInput, 'input', updateBotnum);
/* ---------- 4.5 上下票号联动（仅 red1998 作用域；组号前缀） ---------- */
const inputTopNum    = $id('input-topnum_1998');      // 上票号输入（red1998 页内）
const previewTopNum  = $id('preview-topnum_1998');    // 预览里的“上票号”
// 仅取 red1998 容器里的组号
const classInpLocal  = $id('input-classnum_1998');

// 取 red1998 的组号（支持 dataset.previewDefault）
function getClassNumLocal() {
  return (classInpLocal?.value || classInpLocal?.dataset?.previewDefault || '').trim();
}

// 统一渲染：始终显示“组号 + 上票号”
function renderTopCombined() {
  if (!previewTopNum) return;
  const classNum = getClassNumLocal();
  const topNum   = (inputTopNum?.value || inputTopNum?.dataset?.previewDefault || '').trim();
  previewTopNum.textContent = classNum + topNum;
}

// 写入上票号到输入框 → 再统一渲染
function writeTop(val) {
  const v = (val || '').trim();
  if (inputTopNum && inputTopNum.value !== v) inputTopNum.value = v;
  renderTopCombined();
}

// 手动编辑上票号
on(inputTopNum, 'input',  () => writeTop(inputTopNum.value));
on(inputTopNum, 'change', () => writeTop(inputTopNum.value));

// 上下票号联动已关闭：上票号只由输入框自己决定

// 组号变化 & 个人默认值写入（preview-refresh）时，重绘
on(classInpLocal, 'input',           renderTopCombined);
on(classInpLocal, 'change',          renderTopCombined);
on(classInpLocal, 'preview-refresh', renderTopCombined);

// 初始化：对齐一次
renderTopCombined();
  /* ---------- 5) 其他简单镜像（可选：车次/席别/席位等） ---------- */
const mirror = [
  ['input-traincodeold_1998', 'preview-traincodeold_1998'],
  ['input-seattypesold_1998',  'preview-seattype_1998'],
  ['input-seat_1998',      'preview-seat_1998'],          // 若无 SeatFormat，则普通映射
];

    const topNumPrev  = $id('preview-topnum_1998');
    if (topNumPrev) renderTopCombined();

mirror.forEach(([i, v]) => {
  const src = $id(i);
  const dst = $id(v);
  if (!src || !dst) return;

  on(src, 'input', () => {
    // 特例：车次后自动加“次”
    if (i === 'input-traincodeold_1998') {
      const val = src.value.trim();
      if (val) {
        // 与 preview 样式保持一致
        dst.innerHTML = `${val}<span style="font-family:'寒蝉端黑宋','regular',Arial,sans-serif; font-size:15px; letter-spacing:1px;">次</span>`;
      } else {
        dst.textContent = '';
      }
    } else {
      // 普通镜像
      dst.textContent = src.value;
    }
  });
});
//---------- 发售站 → 预览（末尾加圆圈“售”） ---------------------------------------------------------------
const inputTicketOffice   = $id('input-ticketoffice_1998');
const previewTicketoffice = $id('preview-ticketoffice_1998');
const ticketOfficePng     = $id('ticketofficepng_1998'); // 新增：控制这张图显示/隐藏

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
})();
//直通客票（本页只保留“经由”一项）———————————————————————————————————————————————
(() => {
  const __script = document.currentScript;
  const __page   = __script?.dataset.page || 'red1998';
  const __root   = document.querySelector(`.page.${__page}`);
  if (!__root) return;

  const $id = (id) => __root.querySelector('#' + id);
  const on  = (el, evt, fn) => el && el.addEventListener(evt, fn);

  const inpVia1 = $id('via2009-part1_1998');   // 经由

  const previewContainer = __root.querySelector('#preview_1998') || __root;

  // 经由文字：原位显示/隐藏，不再抬升发到站、拼音、车次
  let spanVia1 = __root.querySelector('#preview-via2009-1_1998');
  if (!spanVia1) {
    spanVia1 = document.createElement('span');
    spanVia1.id = 'preview-via2009-1_1998';
    spanVia1.style.cssText = `
      position:absolute; left:59px; top:71px;
      transform:translateX(-50%); white-space:nowrap;
      font-family:"寒蝉端黑宋","宋体","Songti SC",serif;
      font-size:12px; color:#000; pointer-events:none; user-select:none;
    `;
    previewContainer.appendChild(spanVia1);
  }

  function updateVia() {
    const v1 = (inpVia1?.value || '').trim();
    spanVia1.textContent = v1 ? `（经由${v1}）` : '';
  }

  on(inpVia1, 'input', updateVia);
  on(inpVia1, 'change', updateVia);
  updateVia();
})();
//seatformat===============================================================================================================
(() => {
  const __script = document.currentScript;
  const __page   = __script?.dataset.page || 'red1998';
  const __root   = document.querySelector(`.page.${__page}`);
  if (!__root) return;

  const $id = (id) => __root.querySelector(`#${id}`);
  const on  = (el, evt, fn) => el && el.addEventListener(evt, fn);

  const FONT_NUM = 'Btp';
  const FONT_CN  = `"寒蝉端黑宋","宋体","Songti SC",serif`;
  const SIZE     = 15;
  const BTPSIZE  = 16.5;

  const toFullWidthSpace = (s) => String(s ?? '').replace(/ /g, '\u2007');

  function parseSeat(raw, seatType) {
    const seatTypeStr = String(seatType || '');
    const hasWo  = /卧|一人软包/.test(seatTypeStr);
    const hasZuo = /座/.test(seatTypeStr);

    // —— 规则：卧优先 ——（同时出现“座”“卧”时按卧处理）
    if (hasWo) {
      // 基于全角空格解析：空格要算位
      const fw = toFullWidthSpace(String(raw || ''));
      const plus = fw.startsWith('+');

      // 形如：(+)? 车厢 + 层码(0/1/2) + 床号三位(可含全角空格/字母/数字) + 铺位(0/1/2)
      // 加铺时车厢为 1 位；普通为 2 位
      const m = plus
        ? fw.match(/^\+(\d)([012])([0-9A-Za-z\u2007]{3})([012])$/)
        : fw.match(/^(\d{2})([012])([0-9A-Za-z\u2007]{3})([012])$/);

      if (!m) {
        return { view:[{ text: fw, font: FONT_CN, size: SIZE, color:'rgba(0, 0, 0, 1)' }], error:true };
      }

      const car         = m[1];
      const levelCode   = m[2];
      const bedNum      = m[3]; // 三位，可能含全角空格
      const bedTypeCode = m[4];

      const levelText   = levelCode === '1' ? '下' : levelCode === '2' ? '上' : '';
      const bedTypeText = bedTypeCode === '0' ? '下铺'
                          : bedTypeCode === '1' ? '中铺'
                          : bedTypeCode === '2' ? '上铺' : '';

      const view = [];
      if (plus) view.push({ text:'加', font:FONT_CN, size:SIZE,top:0.5 });
      view.push({ text:car,  font:FONT_NUM, size:BTPSIZE });
      view.push({ text:'车', font:FONT_CN,  size:SIZE,top:0.5 });
      if (levelText) view.push({ text:levelText, font:FONT_CN, size:SIZE });

      // 床号三位的分段渲染：前导全角空格 → 连续数字 → 余下（字母/空格）
      let rest = bedNum;

      const leadSpace = rest.match(/^[\u2007]+/);
      if (leadSpace) {
        view.push({ text: leadSpace[0], font: FONT_CN, size: SIZE });
        rest = rest.slice(leadSpace[0].length);
      }

      const digits = rest.match(/^\d+/);
      if (digits) {
        view.push({ text: digits[0], font: FONT_NUM, size: BTPSIZE });
        rest = rest.slice(digits[0].length);
      }

      if (rest) {
        view.push({ text: rest, font: FONT_CN, size: SIZE });
      }

      view.push({ text:'号', font:FONT_CN, size:SIZE,top:0.5 });
      if (bedTypeText) view.push({ text:bedTypeText, font:FONT_CN, size:SIZE });

      return { car, level:levelText, seat:bedNum, bedType:bedTypeText, view, error:false };
    }

    if (hasZuo) {
      // 用全角空格做基准：空格参与位数；支持加座（+ 开头）
      const fw = toFullWidthSpace(String(raw || ''));
      const plus = fw.startsWith('+');

      // 规则：(+)? 车厢(加=1位/普=2位) + 层码(0/1/2) + 座位段(2~3，允许数字/字母/全角空格)
      const m = plus
        ? fw.match(/^\+(\d)([012])([0-9A-Za-z\u2007]{2,3})$/)
        : fw.match(/^(\d{2})([012])([0-9A-Za-z\u2007]{2,3})$/);

      if (!m) {
        return { view:[{ text: fw, font: FONT_CN, size: SIZE, color:'rgba(0,0,0,1)' }], error:true };
      }

      const car       = m[1];
      const levelCode = m[2];
      const seatPart  = m[3];
      const levelText = levelCode === '1' ? '下' : levelCode === '2' ? '上' : '';

      const view = [];
      if (plus) view.push({ text:'加', font:FONT_CN, size:SIZE,top:0.5 });
      view.push({ text: car,    font: FONT_NUM, size: BTPSIZE });
      view.push({ text: '车',   font: FONT_CN,  size: SIZE,top:0.5 });
      if (levelText) view.push({ text: levelText, font: FONT_CN, size: SIZE,top:0.5 });

      // 分段渲染座位段：前导全角空格 → 连续数字 → 余下（字母或空格）
      let rest = seatPart;
      const leadSpace = rest.match(/^[\u2007]+/);
      if (leadSpace) {
        view.push({ text: leadSpace[0], font: FONT_CN, size: SIZE });
        rest = rest.slice(leadSpace[0].length);
      }
      const digits = rest.match(/^\d+/);
      if (digits) {
        view.push({ text: digits[0], font: FONT_NUM, size: BTPSIZE });
        rest = rest.slice(digits[0].length);
      }
      if (rest) {
        view.push({ text: rest, font: FONT_CN, size: SIZE });
      }

      view.push({ text: '号', font: FONT_CN, size: SIZE,top:0.5 });

      // 可选：给外部 mirror
      const prefix = plus ? '加' : '';
      return {
        car, level: levelText, seat: seatPart, view,
        showStr: prefix + car + '车' + (levelText || '') + seatPart + '号'
      };
    }


    // 其他：原样，但做全角空格替换与 15px 统一
    return { view:[{ text: toFullWidthSpace(raw), font: FONT_CN, size: SIZE }], error:false };
  }

  // 渲染器（写入 #preview-seat_1998），会覆盖 mirror 的 textContent
  function renderView(parts, el) {
    if (!el) return;
    el.innerHTML = '';
    parts.forEach(p => {
      const span = document.createElement('span');
      span.textContent     = p.text ?? '';
      span.style.fontFamily= p.font || FONT_CN;
      span.style.fontSize  = (p.size || SIZE) + 'px';
      if (p.color) span.style.color = p.color;
      if (p.style) span.style.cssText += ';' + p.style;
      if (p.top !== undefined && p.top !== null) {
      span.style.position = 'relative';
      span.style.top = (typeof p.top === 'number' ? p.top + 'px' : String(p.top));
    }
      el.appendChild(span);
    });
  }

  const inpSeat  = $id('input-seat_1998');
  const inpType  = $id('input-seattypesold_1998');
  const preview  = $id('preview-seat_1998');

  function paint() {
    if (!preview) return;
    // 把输入框里的 ASCII 空格替换为全角空格，并回写
    if (inpSeat) {
      const replaced = toFullWidthSpace(inpSeat.value);
      if (replaced !== inpSeat.value) inpSeat.value = replaced;
    }
    const raw  = inpSeat?.value ?? '';
    const type = inpType?.value ?? '';
    const parsed = parseSeat(raw, type);
    renderView(parsed.view, preview);
  }

  on(inpSeat, 'input',  paint);
  on(inpType, 'input',  paint);
  paint();

  // 以“按页”挂载，避免被 red2015 覆盖
  window.SeatFormat = window.SeatFormat || {};
  window.SeatFormat[__page] = { parseSeat };
})();
// —— 1998：备注圈字（固定带圈）———————————————————————————————————————————————————————————————
(function () {
  const inputNotice2009   = document.getElementById('input-notice2009_1998');
  const previewNotice2009 = document.getElementById('preview-notice2009_1998');

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
    if (e?.detail?.page === 'red1998') updateNoticePreview2009();
  });
})();
//=====================================================================================================
(() => {
  const __script = document.currentScript;
  const __page   = __script?.dataset.page || 'red1998';
  const __root   = document.querySelector(`.page.${__page}`);
  if (!__root) return; // 当前页面实例不存在，直接跳过

  const $id = (id) => __root.querySelector(`#${id}`);
  const on  = (el, type, handler) => { if (el) el.addEventListener(type, handler); };

  /* ---------- 开车时间（YYYYMMDDHHmm → “YYYY年MM月DD日HH : mm开”） ---------- */
const inputDepart = $id('input-date2009_1998');
const previewDepart = $id('preview-date2009_1998') || $id('preview-date') || $id('preview-time');
if (!inputDepart || !previewDepart) return;

function renderDepart() {
  const raw = String(inputDepart.value || '').replace(/\D/g, '');
  if (!raw) { previewDepart.textContent = ''; previewDepart.style.display = 'none'; return; }
  previewDepart.style.display = '';

  const s = (raw + '000000000000').slice(0, 12);
  const yyyy = s.slice(0, 4), MM = s.slice(4, 6), dd = s.slice(6, 8), HH = s.slice(8, 10), mm = s.slice(10, 12);

  const mkDigit = t => Object.assign(document.createElement('span'), {
    textContent: t, style: 'font-family:Btp,Arial,sans-serif;font-size:16.5px;letter-spacing:0.2px;'
  });
  const mkCn = t => Object.assign(document.createElement('span'), {
    textContent: t, style: 'font-family:"寒蝉端黑宋","宋体","Songti SC",serif;font-size:14px;'
  });
  const mkColon = () => Object.assign(document.createElement('span'), {
    textContent: ':', style: 'position:relative;top:-1px;'
  });
  // 全角空格（按汉字宽度占位），用于“日期空格”
  const mkGap = () => Object.assign(document.createElement('span'), {
    textContent: '\u3000'
  });

  const chkDateGap = __root.querySelector('#dategap_1998');
  const dateGapOn  = !!(chkDateGap && chkDateGap.checked);

  previewDepart.textContent = '';
  previewDepart.append(mkDigit(yyyy), mkCn('年'), mkDigit(MM), mkCn('月'),
                       mkDigit(dd), mkCn('日'));
  if (dateGapOn) previewDepart.append(mkGap());
  previewDepart.append(mkDigit(HH), mkColon(), mkDigit(mm), mkCn('开'));
}

on(inputDepart, 'input', renderDepart);
on(inputDepart, 'change', renderDepart);
on(inputDepart, 'preview-refresh', renderDepart);
on(__root.querySelector('#dategap_1998'), 'change', renderDepart);
renderDepart();

//——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
  // ——— 站名排版：字距 / left 偏移（本页不使用拼音，自动拼音设置只作用于其它页） ———
  window.addEventListener('DOMContentLoaded', () => {
    const inputFrom   = $id('input-from_1998');
    const previewFrom = $id('preview-from_1998');
    const inputTo     = $id('input-to_1998');
    const previewTo   = $id('preview-to_1998');

    // 基准 left 取元素自己的内联 left（直接在 HTML 里改 left 就能挪动），
    // 两字站名额外右移 12px 以保持居中
    function baseLeftOf(el, fallback) {
      if (!el) return fallback;
      if (el.dataset.baseLeft === undefined) {
        const v = parseFloat(el.style.left);
        el.dataset.baseLeft = String(Number.isFinite(v) ? v : fallback);
        el.style.left = el.dataset.baseLeft + 'px';
      }
      return parseFloat(el.dataset.baseLeft);
    }

    // 站名两种渲染：勾选“站名空格”=原字距排版；不勾选=紧贴显示（寒蝉端黑宋，字号 +1）
    const STATION_FONT_GAP   = "20px";                      // 有空格时的字号（原样）
    const STATION_FONT_TIGHT = "22px";                      // 无空格时的字号（+1）
    const STATION_FAMILY_GAP   = "'思源黑体 CN', sans-serif";
    const STATION_FAMILY_TIGHT = "'寒蝉端黑宋', '宋体', 'Songti SC', serif";
    const STATION_TIGHT_SPACING = "0px";                    // 紧贴时的字距
    const STATION_TIGHT_TOP_SHIFT = 6;                      // 宋体（紧贴）模式整体下移 6px

    const chkNameGap = __root.querySelector('#namegap_1998');
    const nameGapOn  = () => !!(chkNameGap && chkNameGap.checked);

    // 基准 top 同样取自元素内联 top
    function baseTopOf(el, fallback) {
      if (!el) return fallback;
      if (el.dataset.baseTop === undefined) {
        const v = parseFloat(el.style.top);
        el.dataset.baseTop = String(Number.isFinite(v) ? v : fallback);
        el.style.top = el.dataset.baseTop + 'px';
      }
      return parseFloat(el.dataset.baseTop);
    }

    // value → 站名排版（字距 / left 偏移 / 字体）
    function updateStationSpacing(elem, value, fallbackLeft) {
      if (!elem) return;
      const val = String(value || '');
      let len = val.length;
      if (len > 5) len = 5;

      let spacing = '0px';
      if (len === 2) spacing = '23px';
      if (len === 3) spacing = '4px';
      if (len === 4) spacing = '0px';
      if (len === 5) spacing = '0px';

      let leftOffset = 0;
      if (len === 2) leftOffset = 12;

      const useGap = nameGapOn();
      if (!useGap) { spacing = STATION_TIGHT_SPACING; leftOffset = 0; }

      elem.innerHTML = val.replace(/ /g, '&nbsp;');
      elem.style.letterSpacing = spacing;
      elem.style.fontFamily    = useGap ? STATION_FAMILY_GAP : STATION_FAMILY_TIGHT;
      elem.style.fontSize      = useGap ? STATION_FONT_GAP : STATION_FONT_TIGHT;
      elem.style.left = (baseLeftOf(elem, fallbackLeft) + leftOffset) + 'px';
      // 宋体（紧贴）模式整体下移 3px，其它模式回到原位
      elem.style.top = (baseTopOf(elem, 40) + (useGap ? 0 : STATION_TIGHT_TOP_SHIFT)) + 'px';
    }

    function handleFromInput() {
      updateStationSpacing(previewFrom, (inputFrom?.value || '').trim(), 20);
    }
    function handleToInput() {
      updateStationSpacing(previewTo, (inputTo?.value || '').trim(), 214);
    }

    on(inputFrom, 'input', handleFromInput);
    on(inputTo,   'input', handleToInput);
    // 切换“站名空格”时，两站立即按新规则重排
    on(chkNameGap, 'change', () => { handleFromInput(); handleToInput(); });

    handleFromInput();
    handleToInput();
  });

//================================================================================================
// barcode.js —— 仅作用于 red1998 页面
window.addEventListener('DOMContentLoaded', () => {
  // 只取 red1998 页的预览区
  const currentPage = document.querySelector('.page.red1998');
  const preview = currentPage?.querySelector('#preview_1998');
  if (!preview) return;

  const ticketSettings = window.ticketSettings = window.ticketSettings || {};
  const BARCODE_SETTING_KEY = 'showQrcode';   // 与二维码共用同一开关
  const qrCheckbox = document.getElementById('show-qrcode');

  // 初始化设置
  if (typeof ticketSettings[BARCODE_SETTING_KEY] !== 'boolean') {
    ticketSettings[BARCODE_SETTING_KEY] = qrCheckbox ? !!qrCheckbox.checked : true;
  } else if (qrCheckbox) {
    qrCheckbox.checked = ticketSettings[BARCODE_SETTING_KEY];
  }

  // ========= 创建条码容器 =========
  let barcodeContainer = currentPage.querySelector('#preview-barcode_1998');
  if (!barcodeContainer) {
    barcodeContainer = document.createElement('div');
    barcodeContainer.id = 'preview-barcode_1998';
    preview.appendChild(barcodeContainer);
  }

  // 条码和下票号共用这些值：改右边距/宽高，两边一起动
  const BC_RIGHT       = '30px';    // 想左右挪就改这里（px 或百分比都行）
  const BC_WIDTH       = '138px';   // 常规条码长度
  const BC_HEIGHT      = '40px';    // 常规条码高度
  const BC_WIDTH_LONG  = '180px';   // 长票号（>13 位）：向左延长（太宽会压到左下角“含软票费”）
  const BC_HEIGHT_LONG = '28px';    // 长票号（>13 位）：高度缩小

  Object.assign(barcodeContainer.style, {
    position: 'absolute',
    right: BC_RIGHT,
    bottom: '46px',
    height: BC_HEIGHT,
    width: BC_WIDTH,
    overflow: 'visible',
    background: 'transparent',
    pointerEvents: 'none',
    zIndex: 10
  });

  // 下票号：与条码同宽、同一右边距，文字居中 → 自动居中在条码下方
  const botNumText = currentPage.querySelector('#preview-botnum_1998');
  if (botNumText) {
    botNumText.style.left = 'auto';
    botNumText.style.right = BC_RIGHT;
    botNumText.style.width = BC_WIDTH;
    botNumText.style.textAlign = 'center';
  }

  const getText = id => (currentPage.querySelector(`#${id}`)?.textContent.trim() || '');

  function isBarcodeEnabled() {
    if (typeof ticketSettings[BARCODE_SETTING_KEY] === 'boolean') {
      return ticketSettings[BARCODE_SETTING_KEY];
    }
    return qrCheckbox ? !!qrCheckbox.checked : true;
  }

  // ========= 生成条码 =========
  function generateTicketBarcode() {
    // 条码只编码原始下票号：显示用的全角空格与 * 都不参与
    let botNum = (currentPage.querySelector('#input-botnum_1998')?.value || '')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, '');

    // 长票号：条码向左延长（右边距不变）、高度缩小；下票号文字同步变宽
    const isLong = botNum.length >= 14;
    barcodeContainer.style.width  = isLong ? BC_WIDTH_LONG  : BC_WIDTH;
    barcodeContainer.style.height = isLong ? BC_HEIGHT_LONG : BC_HEIGHT;
    if (botNumText) botNumText.style.width = barcodeContainer.style.width;

    if (!isBarcodeEnabled()) {
      barcodeContainer.innerHTML = '';
      return;
    }

    if (!botNum) botNum = '1'.repeat(21);

    // 创建 SVG 并绘制条码
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, botNum, {
      format: 'CODE128',
      width: 1.2,
      height: 36,
      displayValue: false,
      margin: 0,
      background: 'transparent'
    });
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'none');

    // 清空旧条码
    barcodeContainer.innerHTML = '';
    barcodeContainer.appendChild(svg);
  }

  // 初始绘制（显示占位）
  generateTicketBarcode();

  // 监听票号变化
  window.addEventListener('botnum-changed', generateTicketBarcode);

  const botEl = currentPage.querySelector('#preview-botnum_1998');
  if (botEl) {
    const botObserver = new MutationObserver(generateTicketBarcode);
    botObserver.observe(botEl, { childList: true, characterData: true, subtree: true });
  }

  // 共用二维码开关
  if (qrCheckbox) {
    qrCheckbox.addEventListener('change', () => {
      const enabled = !!qrCheckbox.checked;
      ticketSettings[BARCODE_SETTING_KEY] = enabled;
      generateTicketBarcode();
    });
  }

  // 设置事件监听
  window.addEventListener('ticket-settings-changed', event => {
    const detail = event && event.detail;
    if (!detail) return;
    if (detail.key && detail.key !== BARCODE_SETTING_KEY) return;
    if (!detail.key && (!detail.settings ||
        !Object.prototype.hasOwnProperty.call(detail.settings, BARCODE_SETTING_KEY))) {
      return;
    }
    generateTicketBarcode();
  });
});

})();


/* ============================================================================
   配线图动画（static/animate.html）
   用 iframe 隔离，样式和脚本互不影响；首次切到本页时才真正加载，
   其它页面待着的时候不跑动画。
   ========================================================================== */
(() => {
  const page  = document.querySelector('.page.red1998');
  const frame = document.getElementById('anim1998-frame');
  if (!page || !frame) return;

  const SRC = '/static/animate.html?embed=1';
  let started = false;

  function start() {
    if (started) return;
    started = true;
    frame.src = SRC;
  }

  // 深浅色跟随主程序：加载完成时同步一次，之后盯着 <html data-theme> 的变化
  function syncTheme() {
    try {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      frame.contentWindow.postMessage(dark ? 'dark' : 'light', '*');
    } catch (_) { /* 还没加载好就算了，load 时还会再来一次 */ }
  }
  frame.addEventListener('load', syncTheme);
  new MutationObserver(syncTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });

  window.addEventListener('page-switched', (e) => {
    if (e && e.detail && e.detail.page === 'red1998') start();
  });

  // 页面一开始就停在本页时（例如刷新后保持状态），直接加载
  if (getComputedStyle(page).display !== 'none') start();
})();

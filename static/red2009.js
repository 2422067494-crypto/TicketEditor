(() => {
  // 只操作 red2009 这一页，缺控件也不报错
  const root = document.querySelector('.page.red2009');
  if (!root) return;
  const $id = (id) => root.querySelector('#' + id);
  const on  = (el, evt, fn) => el && el.addEventListener(evt, fn);

/* ---------- 1) 金额（用￥.png 显示符号） ---------- */
const inputPrice   = $id('input-price2009');   // 金额输入框
const previewPrice = $id('preview-price');     // 金额数字显示
const rmbImg       = $id('rmbold');            // 覆盖层图片：￥.png

function cleanMoney(v) {
  return (v || '')
    .replace(/[^\d.]/g, '')       // 仅保留数字和小数点
    .replace(/^0+(\d)/, '$1')     // 去掉多余前导0
    .replace(/(\..*)\./g, '$1');  // 只保留一个小数点
}

function updatePrice() {
  if (!inputPrice || !previewPrice) return;
  const val = cleanMoney(inputPrice.value);

  // 开/关 ￥ 图片
  if (rmbImg) rmbImg.style.display = val ? 'block' : 'none';

  if (val) {
    // 数字 + “元”，保持你原来的排版
    previewPrice.innerHTML = `${val}<span style="font-family:'寒蝉端黑宋'; font-size:15px; margin-left:2px;">元</span>`;
  } else {
    previewPrice.textContent = '';
  }
  // 回写清洗后的值
  inputPrice.value = val;
}
on(inputPrice, 'input', updatePrice);

  /* ---------- 2) 限乘（直接映射） ---------- */
  const inputLimit   = $id('input-limitation');
  const previewLimit = $id('preview-limitation');
  function updateLimit() {
    if (!previewLimit) return;
    previewLimit.textContent = (inputLimit?.value || '').trim();
  }
  on(inputLimit, 'input', updateLimit);

  /* ---------- 3) 有效期（只输入数字；预览渲染完整句子） ---------- */
  const inputValid   = $id('input-validdata');   // 你的输入框 id
  const previewValid = $id('preview-valuedate'); // 票面展示用的 span
  function updateValid() {
    if (!previewValid || !inputValid) return;
    // 只保留数字，最多1位
    const digits = (inputValid.value || '').replace(/\D/g, '').slice(0, 1);
    inputValid.value = digits;
    previewValid.textContent = digits ? `在${digits}日内到有效` : '';
  }
  on(inputValid, 'input', updateValid);

  /* ---------- 4) 下票号（5 段 → 3 段；预览中插空格） ---------- */
  const p1 = $id('bot-part1');  // TMIS（5）
  const p2 = $id('bot-part2');  // 窗口/日期（9）
  const p3 = $id('bot-part3');  // 上票号（≤8）
  const p4 = $id('bot-part4');  // 34 位数（≤34）
  const p5 = $id('bot-part5');  // 公里数（≤4）
  const previewBot = $id('preview-botnum');

  function joinStr(a, b) { return (a || '') + (b || ''); }
  function trimSpaces(s) { return (s || '').replace(/\s+/g, ''); }

  function updateBotnum() {
    if (!previewBot) return;
    const s1 = joinStr(trimSpaces(p1?.value), trimSpaces(p2?.value)); // ①+②
    const s2 = trimSpaces(p3?.value);                                  // ③
    const s3 = joinStr(trimSpaces(p4?.value), trimSpaces(p5?.value));  // ④+⑤

    // 票面要求：第一段 + 空格 + 第二段 + 空格 + 第三段
      const out = [s1, s2, s3]
        .filter(Boolean)
        .join('&nbsp;&nbsp;');
      previewBot.innerHTML = out;
      window.dispatchEvent(new Event('botnum-changed'));
  }
  ;[p1, p2, p3, p4, p5].forEach(el => on(el, 'input', updateBotnum));
/* ---------- 4.5 上下票号联动（仅 red2009 作用域；组号前缀） ---------- */
const inputTopNum    = $id('input-topnum');      // 上票号输入（red2009 页内）
const previewTopNum  = $id('preview-topnum');    // 预览里的“上票号”
const botTopPart     = $id('bot-part3');         // 下票号里的“上票号”段
const chkAutoNum     = document.getElementById('auto-num'); // 设置页的联动开关（全局取就好）

// 仅取 red2009 容器里的组号
const classInpLocal  = $id('input-classnum');

// 取 red2009 的组号（支持 dataset.previewDefault）
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

// 从下票号第三段联动（仅在勾选“联动票号”时）
function syncTopFromBot() {
  if (!chkAutoNum || !chkAutoNum.checked) return;
  writeTop(botTopPart ? botTopPart.value : '');
}
on(botTopPart, 'input',  syncTopFromBot);
on(botTopPart, 'change', syncTopFromBot);
window.addEventListener('botnum-changed', syncTopFromBot);

// 组号变化 & 个人默认值写入（preview-refresh）时，重绘
on(classInpLocal, 'input',           renderTopCombined);
on(classInpLocal, 'change',          renderTopCombined);
on(classInpLocal, 'preview-refresh', renderTopCombined);

// 初始化：对齐一次
renderTopCombined();
  /* ---------- 5) 其他简单镜像（可选：车次/席别/席位等） ---------- */
const mirror = [
  ['input-traincodeold', 'preview-traincodeold'],
  ['input-seattypesold',  'preview-seattype'],
  ['input-seat',      'preview-seat'],          // 若无 SeatFormat，则普通映射
];

    const topNumPrev  = $id('preview-topnum');
    if (topNumPrev) renderTopCombined();

mirror.forEach(([i, v]) => {
  const src = $id(i);
  const dst = $id(v);
  if (!src || !dst) return;

  on(src, 'input', () => {
    // 特例：车次后自动加“次”
    if (i === 'input-traincodeold') {
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
})();
  //字体选择————————————————————————————————————————————————————————————————————————————————
(() => {
  const page2009 = document.querySelector('.page.red2009');
  if (!page2009) return;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const $p = (sel) => page2009.querySelector(sel); // 作用域在 red2009

  const options   = $$(".font-option-wrap");
  const highlight = $(".font-highlight");

  // 预览目标：只在 red2009 内找
  const previewFrom = $p('#preview-from');
  const previewTo   = $p('#preview-to');
  const botPart5    = $p('#bot-part5'); // 公里数（作用域修正）

  // 高亮条动画
  function place(el, animate = true) {
    if (!highlight || !el || !el.parentElement) return;
    const rect = el.getBoundingClientRect();
    const parentRect = el.parentElement.getBoundingClientRect();
    const left = rect.left - parentRect.left;
    const width = rect.width;

    if (!animate) {
      const prev = highlight.style.transition;
      highlight.style.transition = "none";
      highlight.style.left = `${left}px`;
      highlight.style.width = `${width}px`;
      // 触发回流
      // eslint-disable-next-line no-unused-expressions
      highlight.offsetWidth;
      highlight.style.transition =
        "left 0.3s cubic-bezier(0.45,0,0.25,1), width 0.25s cubic-bezier(0.45,0,0.25,1)";
      return;
    }

    // 点击动画：先收，再滑，再展开
    highlight.style.transition = "width 0.12s ease";
    highlight.style.width = "0px";
    requestAnimationFrame(() => {
      highlight.style.transition =
        "left 0.3s cubic-bezier(0.45,0,0.25,1), width 0.25s cubic-bezier(0.45,0,0.25,1)";
      highlight.style.left = `${left}px`;
      highlight.style.width = `${width}px`;
    });
  }

  // 字体映射
  function cssFontFor(choice) {
    const map = {
      黑体: "'思源黑体 CN', sans-serif",
      楷体: "'华文行楷', 'STKaiti', 'Kaiti SC', serif"
    };
    return map[choice] || map.黑体;
  }

  // 字体差异微调（不碰 top，只做 translateY；并把字号作为“新基线”）
  const tweak = {
    黑体: { sizePx: 20, shiftY: -2, shiftX: -1.5, weight: 'bold' },  // 视觉略上提
    楷体: { sizePx: 24, shiftY:  0 }
  };

  // 工具：把当前字号写成管家的“基线”
  function rebaseFontSizeAsBaseline(el, px) {
    if (!el) return;
    const pxStr = `${px}px`;
    el.style.fontSize = pxStr;          // 实际字号
    el.dataset.fs0    = pxStr;          // 基线字符串
    el.dataset.fs0Num = String(px);     // 基线数值（管家用来 + FONT_DELTA）
  }

  // 工具：给元素设置 translateY，不覆盖已有 transform 的其它部分
  function setTranslateY(el, yPx) {
    if (!el) return;
    const prev = el.style.transform || '';
    // 把已有 translateY 踢掉再写新的
    const cleaned = prev.replace(/translateY\([^)]*\)\s*/g, '').trim();
    el.style.transform = `${cleaned} translateY(${yPx}px)`.trim();
  }

  // 加载字体（可选）
  async function loadCandidateFonts() {
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.race([
          document.fonts.load("16px '思源黑体 CN Medium'"),
          document.fonts.load("16px '华文行楷'")
        ]);
      }
    } catch { /* 忽略 */ }
  }

  // 根据选择应用字体
  async function applyFont(fontChoice) {
    if (!previewFrom || !previewTo) return;

    let chosen = fontChoice;
    if (chosen === '自动') {
      const km = parseInt(botPart5?.value || '0', 10);
      chosen = km > 400 ? '黑体' : '楷体';
    }

    await loadCandidateFonts();

    const cssFont = cssFontFor(chosen);
    // 字体族用 !important，防止外层覆盖；位置/字号不要加 important，给管家留口子
    previewFrom.style.setProperty('font-family', cssFont, 'important');
    previewTo  .style.setProperty('font-family', cssFont, 'important');

    const t = tweak[chosen] || tweak.黑体;

    // 1) 字号：设置实际字号 + 重写“基线”（兼容 __red2009Lift）
    rebaseFontSizeAsBaseline(previewFrom, t.sizePx);
    rebaseFontSizeAsBaseline(previewTo,   t.sizePx);

    // 2) 位置微调：只用 translateY，不动 top（避免和抬升打架）
    setTranslateY(previewFrom, t.shiftY);
    setTranslateY(previewTo,   t.shiftY);

    // 3) 若你给抬升管家加了 rebase() API，这里可以调用一次以确保万无一失
    // window.__red2009Lift?.rebase?.(); // 可选：如果实现了 rebase()
  }

  // 绑定点击
  options.forEach((option) => {
    option.addEventListener("click", () => {
      $(".font-option-wrap.selected")?.classList.remove("selected");
      option.classList.add("selected");
      place(option, true);

      const fontChoice = option.dataset.font?.trim() || "自动";
      applyFont(fontChoice);
    });
  });

  // 初始化：定位高亮并应用当前选择
  const selected = $(".font-option-wrap.selected");
  const ready = (document.fonts?.ready) || Promise.resolve();
  ready.then(() => {
    if (selected) {
      place(selected, false);
      const fontChoice = selected.dataset.font?.trim() || '自动';
      applyFont(fontChoice);
    }
  });

  // 高亮在容器尺寸变化时重算
  const optionsWrap = $(".font-options");
  if (optionsWrap && window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      const cur = $(".font-option-wrap.selected");
      if (cur) place(cur, false);
    });
    ro.observe(optionsWrap);
  }

  // 公里数变化时，“自动”模式动态调整
  botPart5?.addEventListener("input", () => {
    const selectedOpt = $(".font-option-wrap.selected");
    const fontChoice = selectedOpt?.dataset.font?.trim() || "自动";
    if (fontChoice === "自动") applyFont(fontChoice);
  });
})();

//直通客票——————————————————————————————————————————————————————————————————————————————————————————————————————
(() => {
  // —— 作用域/工具 —— //
  const __script = document.currentScript;
  const __page   = __script?.dataset.page || 'red2009';
  const __root   = document.querySelector(`.page.${__page}`);
  if (!__root) return;

  const $id = (id) => __root.querySelector('#' + id);
  const on  = (el, evt, fn) => el && el.addEventListener(evt, fn);

  // —— 输入 —— //
  const inpVia1 = $id('via2009-part1'); // 经由
  const inpVia2 = $id('via2009-part2'); // 加快等级
  const inpVia3 = $id('via2009-part3'); // 终到站
  const inpVia4 = $id('via2009-part4'); // 到站

  // —— 预览目标（5个会被抬升/缩小）—— //
  const pvFrom   = $id('preview-from');
  const pvFromPy = $id('preview-FromPinyin');
  const pvTo     = $id('preview-to');
  const pvToPy   = $id('preview-ToPinyin');
  const pvTrain  = $id('preview-traincodeold');
  const pvArrow  = $id('arrow2009');

  // —— 默认抬升/缩小量（改数值即可整体调整）—— //
  const LIFT_FROM_TO = -9;   // 发/到站（汉字）上移 px
  const LIFT_PINYIN  = -12;  // 拼音上移 px
  const LIFT_TRAIN   = -9;   // 车次上移 px
  const FONT_DELTA   = -1;   // 发/到站（汉字）字号变化（px，负数=变小）

  // —— 新增三块展示区域 —— //
  const previewContainer = __root.querySelector('#preview') || __root;

  function ensureSpan(id, cssText) {
    let el = __root.querySelector('#' + id);
    if (!el) {
      el = document.createElement('span');
      el.id = id;
      el.style.cssText = cssText;
      previewContainer.appendChild(el);
    }
    return el;
  }

  // part1：显示在 FromPinyin 下方（位置你后续可改 left/top）
  const spanVia1 = ensureSpan(
    'preview-via2009-1',
    `
      position:absolute; left:80px; top:71px;
      transform:translateX(-50%); white-space:nowrap;
      font-family:"寒蝉端黑宋","宋体","Songti SC",serif;
      font-size:12px; color:#000; pointer-events:none; user-select:none;
    `
  );
  // part2+3：中间一块（加快等级+终到站）
  const spanVia23 = ensureSpan(
    'preview-via2009-23',
    `
      position:absolute; left:276px; top:71px;
      transform:translateX(-50%); white-space:nowrap;
      font-family:"寒蝉端黑宋","宋体","Songti SC",serif;
      font-size:12px; color:#000; pointer-events:none; user-select:none;
    `
  );
  // part4：To 一侧（到站）
  const spanVia4 = ensureSpan(
    'preview-via2009-4',
    `
      position:absolute; left:182px; top:125px;
      white-space:nowrap; text-align:left;
      font-family:"思源黑体 CN","宋体","Songti SC",serif;
      font-size:14px; color:#000; pointer-events:none; user-select:none;
    `
  );

  // 抬升管家：谁需要抬就登记，统一改样式
  const Lift = (() => {
    const ACTIVE = new Set();
    let inited = false;

    function stashBase(el) {
      if (!el || el.dataset.liftInit === '1') return;
      const cs = getComputedStyle(el);
      // 原样保存字符串，以便100%还原
      el.dataset.top0    = el.style.top      || cs.top      || '0px';
      el.dataset.fs0     = el.style.fontSize || cs.fontSize || '';
      // 同时保存数值版，便于做加减
      el.dataset.top0Num = String(parseFloat(cs.top      || '0') || 0);
      el.dataset.fs0Num  = String(parseFloat(cs.fontSize || '0') || 0);
      el.dataset.liftInit = '1';
    }

    function initOnce() {
      if (inited) return;
      [pvFrom, pvFromPy, pvTo, pvToPy, pvTrain, pvArrow].forEach(stashBase);
      inited = true;
    }

    function apply(active) {
      initOnce();

      // 发/到站（汉字）：上移 + 字号变化
      [pvFrom, pvTo].forEach(el => {
        if (!el) return;
        const top0Str = el.dataset.top0 || '0px';
        const top0Num = parseFloat(el.dataset.top0Num || '0');
        const fs0Str  = el.dataset.fs0  || '';
        const fs0Num  = parseFloat(el.dataset.fs0Num  || '0');

        if (active) {
          el.style.top = (top0Num + LIFT_FROM_TO) + 'px';
          if (fs0Num) el.style.fontSize = (fs0Num + FONT_DELTA) + 'px';
        } else {
          // 原样复原（不用推算）
          el.style.top      = top0Str;
          el.style.fontSize = fs0Str;
        }
      });

      // 两个拼音：只上移（不改字号）
      [pvFromPy, pvToPy].forEach(el => {
        if (!el) return;
        const top0Str = el.dataset.top0 || '0px';
        const top0Num = parseFloat(el.dataset.top0Num || '0');
        el.style.top = active ? (top0Num + LIFT_PINYIN) + 'px' : top0Str;
      });

      // 车次：只上移
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

    function set(source, on) {
      if (on) ACTIVE.add(source); else ACTIVE.delete(source);
      apply(ACTIVE.size > 0);
    }

    return { set };
  })();

  // 让同页其它脚本也能用（不要再各自改样式了）
  window.__red2009Lift = Lift;

  // —— 渲染“经由”三块，并把抬升需求交给管家 —— //
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
  updateVia(); // 首次对齐
})();
//seatformat===============================================================================================================
(() => {
  const __script = document.currentScript;
  const __page   = __script?.dataset.page || 'red2009';
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

  // 渲染器（写入 #preview-seat），会覆盖 mirror 的 textContent
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

  const inpSeat  = $id('input-seat');
  const inpType  = $id('input-seattypesold');
  const preview  = $id('preview-seat');

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
// —— 2009：备注圈字（固定带圈）———————————————————————————————————————————————————————————————
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
//TMIS————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("bot-part1");
  const nameSpan = document.getElementById("station-name");
  const codeSpan = document.getElementById("station-code");
  const tmisSpan = document.getElementById("station-tmis");

  if (!input) return;

  input.addEventListener("input", () => {
    const tmis = input.value.trim();
    const map = window.stationMapByTMIS || {};
    const station = map[tmis];

    if (station) {
      nameSpan.textContent = station["站名"];
      codeSpan.textContent = station["电报码"];
      tmisSpan.textContent = station["TMIS"];
    } else {
      nameSpan.textContent = "暂未收录";
      codeSpan.textContent = "暂未收录";
      tmisSpan.textContent = tmis||"自动取值";
    }
  });
});
//=====================================================================================================
(() => {
  const __script = document.currentScript;
  const __page   = __script?.dataset.page || 'red2015';
  const __root   = document.querySelector(`.page.${__page}`);
  if (!__root) return; // 当前页面实例不存在，直接跳过

  const $id = (id) => __root.querySelector(`#${id}`);
  const on  = (el, type, handler) => { if (el) el.addEventListener(type, handler); };

  /* ---------- 开车时间（YYYYMMDDHHmm → “YYYY年MM月DD日HH : mm开”） ---------- */
const inputDepart = $id('input-date2009');
const previewDepart = $id('preview-date2009') || $id('preview-date') || $id('preview-time');
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

  previewDepart.textContent = '';
  previewDepart.append(mkDigit(yyyy), mkCn('年'), mkDigit(MM), mkCn('月'),
                       mkDigit(dd), mkCn('日'), mkDigit(HH), mkColon(), mkDigit(mm), mkCn('开'));
}

on(inputDepart, 'input', renderDepart);
on(inputDepart, 'change', renderDepart);
on(inputDepart, 'preview-refresh', renderDepart);
renderDepart();

//——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
  window.addEventListener('DOMContentLoaded', () => {
    // ========= 0) 全局设置：自动拼音 =========
    const ticketSettings  = (window.ticketSettings = window.ticketSettings || {});
    const autoPinyinToggle= document.getElementById('auto-pinyin'); // 在设置页，不在 page 容器里

    if (typeof ticketSettings.autoPinyin !== 'boolean') {
      ticketSettings.autoPinyin = autoPinyinToggle ? !!autoPinyinToggle.checked : true;
    } else if (autoPinyinToggle) {
      autoPinyinToggle.checked = ticketSettings.autoPinyin;
    }
    const autoPinyinEnabled = () => ticketSettings.autoPinyin !== false;

    const notifySettings = (key) => {
      window.dispatchEvent(new CustomEvent('ticket-settings-changed', {
        detail: { key, value: ticketSettings[key], settings: { ...ticketSettings } }
      }));
    };

    on(autoPinyinToggle, 'change', () => {
      ticketSettings.autoPinyin = !!autoPinyinToggle.checked;
      if (autoPinyinEnabled()) {
        fillFromPinyinFromStation();
        fillToPinyinFromStation();
      }
      notifySettings('autoPinyin');
    });

    window.addEventListener('ticket-settings-changed', (e) => {
      const d = e?.detail;
      if (!d) return;
      if (d.key && d.key !== 'autoPinyin') return;
      if (autoPinyinToggle && autoPinyinToggle.checked !== autoPinyinEnabled()) {
        autoPinyinToggle.checked = autoPinyinEnabled();
      }
      if (autoPinyinEnabled()) {
        fillFromPinyinFromStation();
        fillToPinyinFromStation();
      }
    });

    // ========= 1) DOM 引用（按页面作用域） =========
    // From
    const inputFrom          = $id('input-from');
    const inputFromPinyin    = $id('input-from-pinyin');
    const previewFrom        = $id('preview-from');
    const previewFromPinyin  = $id('preview-FromPinyin'); // 注意大小写：From


    // To
    const inputTo            = $id('input-to');
    const inputToPinyin      = $id('input-to-pinyin');
    const previewTo          = $id('preview-to');
    const previewToPinyin    = $id('preview-ToPinyin');   // 注意大小写：To


    // 位置参数（两页可以复用；不写死到样式里，留给脚本控制）

    const FROM_BASE_LEFT = 18;
    const TO_BASE_LEFT   = 214;

    // ========= 2) 拼音工具 =========
    function removeTone(pinyin) {
      return String(pinyin || '')
        .replace(/[\u0101\u00E1\u01CE\u00E0]/g, 'a')  // ā á ǎ à
        .replace(/[\u014D\u00F3\u01D2\u00F2]/g, 'o')  // ō ó ǒ ò
        .replace(/[\u0113\u00E9\u011B\u00E8]/g, 'e')  // ē é ě è
        .replace(/[\u012B\u00ED\u01D0\u00EC]/g, 'i')  // ī í ǐ ì
        .replace(/[\u016B\u00FA\u01D4\u00F9]/g, 'u')  // ū ú ǔ ù
        .replace(/[\u01D6\u01D8\u01DA\u01DC]/g, 'ü')  // ǖ ǘ ǚ ǜ
        .replace(/[\u0144\u0148\u01F9]/g, 'n')
        .replace(/\u1E3F/g, 'm');
    }

    function toPinyin(str) {
      if (!str) return '';
      // 优先用你引入的 pinyin 库
      if (window.pinyin && typeof window.pinyin.pinyin === 'function') {
        const arr = window.pinyin.pinyin(str, { type: 'array', segment: true });
        const joined = arr.map(word => {
          const raw = Array.isArray(word) ? word[0] : word;
          return removeTone(String(raw || '').toLowerCase());
        }).join('');
        return joined ? joined.charAt(0).toUpperCase() + joined.slice(1) : '';
      }
      // 兜底：没有库就直接返回原字符串（去空格、首字母大写）
      const s = String(str).replace(/\s+/g, '');
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    }

    function generateStationPinyin(name) {
      if (!name) return '';
      if (window.stationSpecial && window.stationSpecial[name]) {
        return window.stationSpecial[name];
      }
      return toPinyin(name).replace(/\s+/g, '');
    }

    // ========= 3) 预览写入 =========
    function updatePreviewFromPinyin() {
      if (previewFromPinyin) previewFromPinyin.textContent = inputFromPinyin?.value || '';
    }
    function updatePreviewToPinyin() {
      if (previewToPinyin) previewToPinyin.textContent = inputToPinyin?.value || '';
    }

    function fillFromPinyinFromStation() {
      if (!inputFrom || !inputFromPinyin) return;
      inputFromPinyin.value = generateStationPinyin((inputFrom.value || '').trim());
      updatePreviewFromPinyin();
    }
    function fillToPinyinFromStation() {
      if (!inputTo || !inputToPinyin) return;
      inputToPinyin.value = generateStationPinyin((inputTo.value || '').trim());
      updatePreviewToPinyin();
    }

    // value → 站名排版（字距 / “站”字显示 / left 偏移）
    function updateStationSpacing(elem, value, baseLeft) {
      if (!elem) return; // 元素缺失，直接跳过
      const val = String(value || '');
      let len = val.length;
      if (len > 5) len = 5;

      // 字距与偏移（沿用你的规则）
      let spacing = '0px';
      if (len === 2) spacing = '23px';
      if (len === 3) spacing = '4px';
      if (len === 4) spacing = '0px';
      if (len === 5) spacing = '0px';

      let leftOffset = 0;
      if (len === 2) leftOffset = 12;

      // 写入“站名”
      elem.innerHTML = val.replace(/ /g, '&nbsp;');
      elem.style.letterSpacing = spacing;
      elem.style.left = (baseLeft + leftOffset) + 'px';
    }

    function handleFromInput() {
      const name = (inputFrom?.value || '').trim();
      updateStationSpacing(previewFrom, name, FROM_BASE_LEFT);
      if (autoPinyinEnabled()) fillFromPinyinFromStation();
    }
    function handleToInput() {
      const name = (inputTo?.value || '').trim();
      updateStationSpacing(previewTo, name, TO_BASE_LEFT);
      if (autoPinyinEnabled()) fillToPinyinFromStation();
    }

    // ========= 4) 事件绑定（全部防空） =========
    on(inputFrom,       'input', handleFromInput);
    on(inputTo,         'input', handleToInput);
    on(inputFromPinyin, 'input', updatePreviewFromPinyin);
    on(inputToPinyin,   'input', updatePreviewToPinyin);

    // ========= 5) 初始同步 =========
    handleFromInput();
    handleToInput();
    if (!autoPinyinEnabled()) {
      updatePreviewFromPinyin();
      updatePreviewToPinyin();
    }
  });
// ====== red2009下票号随机生成（修正版） =============================================================================================================================================
const btnGenBot = document.getElementById('GenerateRandomNum');
const parts = [
  document.getElementById('bot-part1'),
  document.getElementById('bot-part2'),
  document.getElementById('bot-part3'),
  document.getElementById('bot-part4'),
  document.getElementById('bot-part5'),
];
const chkTMIS       = document.getElementById('option-TMIS');
const chkWindowDate = document.getElementById('option-WindowDate');
const chkTopNum     = document.getElementById('option-TopNum');
const chkRand34     = document.getElementById('option-Rand34');
const chkKm         = document.getElementById('option-Km');

// 注意：parts[0..4] 分别对应 bot-part1..5
const gates = [chkTMIS, chkWindowDate, chkTopNum, chkRand34, chkKm];

function randomDigits(len) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
}

function randomLetter() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 去掉 I、O
  return letters[Math.floor(Math.random() * letters.length)];
}

function randomDate() {
  const month = Math.floor(Math.random() * 12) + 1;
  let dayMax = 31;
  if ([4, 6, 9, 11].includes(month)) dayMax = 30;
  if (month === 2) dayMax = 29;
  const day = Math.floor(Math.random() * dayMax) + 1;
  return `${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
}

function generateBotNumber() {
  // part1：5位随机数，首位不为0
  const first = (Math.floor(Math.random() * 9) + 1).toString();
  const rest4 = randomDigits(4);
  const part1 = first + rest4;

  // part2：00 + 三位(<100) + MMDD
  const numUnder100_3w = Math.floor(Math.random() * 100)
    .toString()
    .padStart(3, '0');
  const part2 = `00${numUnder100_3w}${randomDate()}`;

  // part3：一位字母（无I/O）+ 0开头5位数字
  const part3 = `${randomLetter()}0${randomDigits(5)}`;

  // part4：34位随机数
  const part4 = randomDigits(34);

  // part5：4位随机数 ≤2000
  const num5 = Math.floor(Math.random() * 2001);
  const part5 = num5.toString().padStart(4, '0');

  return [part1, part2, part3, part4, part5];
}

// ====== 生成并按勾选状态写入 ======
btnGenBot?.addEventListener('click', () => {
  const values = generateBotNumber();
  let anyChanged = false;

  parts.forEach((inp, idx) => {
    if (!inp) return;                 // 输入框缺失就跳过
    const gate = gates[idx];
    if (gate?.checked) {              // 只有被勾选的才写入并派发事件
      inp.value = values[idx];
      inp.dispatchEvent(new Event('input',  { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      anyChanged = true;
    } else {
      // 未勾选：既不清空也不覆盖，保持原值
    }
  });

  // 只有真的有字段更新时，才广播变更事件
  if (anyChanged) {
    window.dispatchEvent(new Event('botnum-changed'));
  }
});

//================================================================================================
// barcode.js —— 仅作用于 red2009 页面
window.addEventListener('DOMContentLoaded', () => {
  // 只取 red2009 页的预览区
  const currentPage = document.querySelector('.page.red2009');
  const preview = currentPage?.querySelector('#preview');
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
  let barcodeContainer = currentPage.querySelector('#preview-barcode');
  if (!barcodeContainer) {
    barcodeContainer = document.createElement('div');
    barcodeContainer.id = 'preview-barcode';
    preview.appendChild(barcodeContainer);
  }

  Object.assign(barcodeContainer.style, {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: '28px',
    height: '31px',
    width: '306px',
    overflow: 'visible',
    background: 'transparent',
    pointerEvents: 'none',
    zIndex: 10
  });

  const getText = id => (currentPage.querySelector(`#${id}`)?.textContent.trim() || '');

  function isBarcodeEnabled() {
    if (typeof ticketSettings[BARCODE_SETTING_KEY] === 'boolean') {
      return ticketSettings[BARCODE_SETTING_KEY];
    }
    return qrCheckbox ? !!qrCheckbox.checked : true;
  }

  // ========= 生成条码 =========
  function generateTicketBarcode() {
    if (!isBarcodeEnabled()) {
      barcodeContainer.innerHTML = '';
      return;
    }

    // 读取票号
    let botNum = getText('preview-botnum');
    botNum = botNum.replace(/[^\x20-\x7E]/g, '');

    // 生成 56 位占位
    const totalLen = 56;
    if (!botNum) {
      botNum = '1'.repeat(totalLen);
    } else {
      // 如果有输入，则用真实部分替换前面
      botNum = botNum.padEnd(totalLen, '1').slice(0, totalLen);
    }

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

  const botEl = currentPage.querySelector('#preview-botnum');
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

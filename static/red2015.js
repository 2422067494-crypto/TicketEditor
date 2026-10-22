(() => {
  const root = document.querySelector('.page.red2015');
  if (!root) return;

  const $id = (id) => root.querySelector('#' + id);
  const on  = (el, type, fn) => { if (el) el.addEventListener(type, fn); };

  // 简单映射
  const inputtraincode = $id('input-traincode');
  const previewtraincode = $id('preview-traincode');
  const inputid = $id('input-id');
  const previewid = $id('preview-id');
  const inputname = $id('input-name');
  const previewname = $id('preview-name');
  const previewprice = $id('preview-price');
  const inputprice = $id('input-price');
  const previewpurpose = $id('preview-purpose');
  const inputpurpose = $id('input-purpose');
  const previewcheck = $id('preview-check');
  const inputcheck = $id('input-check');

  on(inputtraincode, 'input', () => previewtraincode && (previewtraincode.textContent = inputtraincode.value || ''));
  on(inputid,        'input', () => previewid && (previewid.textContent = inputid.value || ''));
  on(inputname,      'input', () => previewname && (previewname.textContent = inputname.value || ''));
  on(inputprice,     'input', () => previewprice && (previewprice.textContent = inputprice.value || ''));
  on(inputpurpose,   'input', () => previewpurpose && (previewpurpose.textContent = inputpurpose.value || ''));
  on(inputcheck,     'input', () => previewcheck && (previewcheck.textContent = inputcheck.value || ''));

// 证件类型 + 发售站（互不影响 + 抢最后渲染 + 被改动后自动恢复）
const previewidtype = $id('preview-idtype');
const inputidtype   = $id('input-idtype');
const inputStation  = $id('input-station');

let curIdText  = (inputidtype?.value   || inputidtype?.dataset.previewDefault   || '').trim();
let curStaText = (inputStation?.value  || inputStation?.dataset.previewDefault  || '').trim();

let _rendering = false;

function renderIdType() {
  if (!previewidtype) return;
  _rendering = true;

  const idHTML = curIdText
    ? `<span style="letter-spacing:2px; display:inline-block; transform:scaleX(0.85); font-family:'Nom Na Tong',sans-serif;">${curIdText}</span>`
    : '';

  const stationHTML = curStaText
    ? `<span style="position:relative; top:0px; font-size:11px; letter-spacing:0.5px; font-family:'思源黑体 CN',sans-serif; font-weight:500; white-space:pre;">${curStaText}</span>`
    : '';

  if (idHTML && stationHTML) {
    previewidtype.innerHTML = `${idHTML}\u00A0\u00A0${stationHTML}`;
  } else if (idHTML) {
    previewidtype.innerHTML = idHTML;
  } else if (stationHTML) {
    previewidtype.innerHTML = `&nbsp;${stationHTML}`;
  } else {
    previewidtype.textContent = '';
  }

  _rendering = false;
}

// 谁改自己那半边，仅更新本地状态；渲染安排到事件尾部执行（比别的监听器晚）
function updateId() {
  curIdText = ((inputidtype?.value || inputidtype?.dataset.previewDefault || '')).trim();
  setTimeout(renderIdType, 0);
}
function updateStation() {
  curStaText = ((inputStation?.value || inputStation?.dataset.previewDefault || '')).trim();
  setTimeout(renderIdType, 0);
}

// 绑定
on(inputidtype,  'input',           updateId);
on(inputidtype,  'preview-refresh', updateId);
on(inputStation, 'input',           updateStation);
on(inputStation, 'preview-refresh', updateStation);

// 如果有人篡改了 #preview-idtype，我们在下一拍恢复
if (previewidtype) {
  const mo = new MutationObserver(() => {
    if (_rendering) return;
    setTimeout(renderIdType, 0);
  });
  mo.observe(previewidtype, { childList: true, characterData: true, subtree: true });
}

// 首次渲染
renderIdType();


  // 顶票号 = 组号 + 上票号（都用默认值兜底）
  function renderTopCombined() {
    const prev = $id('preview-topnum');
    if (!prev) return;
    const val = (id) => ($id(id)?.value || $id(id)?.dataset?.previewDefault || '');
    prev.textContent = val('input-classnum') + val('input-topnum');
  }

  function refreshRed2015Previews() {
    const setText = (inpId, prevId) => {
      const inp = $id(inpId);
      const prev = $id(prevId);
      if (!prev) return;
      const v = (inp?.value || inp?.dataset?.previewDefault || '').trim();
      prev.textContent = v;
    };

    // 简单一对一的字段
    setText('input-traincode', 'preview-traincode');
    setText('input-id',        'preview-id');        // 证件号
    setText('input-name',      'preview-name');      // 乘车人
    setText('input-purpose',   'preview-purpose');
    setText('input-check',     'preview-check');

    // 证件类型 + 发售站（拼接渲染）
    renderIdType();

    // 顶票号 = 组号 + 上票号
    renderTopCombined();

    // 底票号如果有，也顺手刷一下
    const botPrev = $id('preview-botnum');
    const botInp  = $id('input-botnum');
    if (botPrev) botPrev.textContent = (botInp?.value || botInp?.dataset?.previewDefault || '');
  }

  // 挂到 window，外部也能调用
  window.refreshRed2015Previews = refreshRed2015Previews;

  // 监听全局的“刷新预览”广播（可带定向页）
  window.addEventListener('refresh-previews', (e) => {
    const page = e?.detail?.page;
    if (!page || page === 'red2015') refreshRed2015Previews();
  });

  // 日期
  const inputDate = $id('input-date');
  const dateImg = $id('date-img');
  const date1 = $id('date-part1');
  const date2 = $id('date-part2');
  const date3 = $id('date-part3');
  const date4 = $id('date-part4');
  const date5 = $id('date-part5');

  on(inputDate, 'input', () => {
    const raw = (inputDate.value || '').replace(/\D/g, '').slice(0, 12);
    if (dateImg) dateImg.style.display = raw ? 'block' : 'none';
    if (date1) date1.textContent = raw.slice(0, 4);
    if (date2) date2.textContent = raw.slice(4, 6);
    if (date3) date3.textContent = raw.slice(6, 8);
    if (date4) date4.textContent = raw.slice(8,10);
    if (date5) date5.textContent = raw.slice(10,12);
  });

// 席别分类 / 预览————————————————————————————————————————————————————————————————————————————————————————————-
const inputSeat = $id('input-seat');
const inputSeatType = $id('input-seattype');
const previewSeat = $id('preview-seat');
const previewSeatFallback = $id('preview-seat-fallback'); // ← 新增 fallback
const previewseattype = $id('preview-seattype');

// 镜像席别文字
on(inputSeatType, 'input', () => {
  if (previewseattype) previewseattype.textContent = inputSeatType.value || '';
});

function updateSeatPreview() {
  if (!window.SeatFormat || !previewSeat || !inputSeat) return;
  const seatType = (inputSeatType?.value || '').trim();
  const rawSeat  = (inputSeat?.value || '').trim();

  const parsed = window.SeatFormat.parseSeat(rawSeat, seatType);

  // 判定是否走 fallback（无输入或非法）
  const isFallback =
    !rawSeat || parsed.error ||
    (Array.isArray(parsed.view)
     && parsed.view.length === 1
     && typeof parsed.view[0].text === 'string'
     && !/\d/.test(parsed.view[0].text));

  if (isFallback) {
    // 隐藏原 preview，显示 fallback 居中文字
    previewSeat.style.display = 'none';
    if (previewSeatFallback) {
      previewSeatFallback.style.display = 'block';
      previewSeatFallback.textContent = rawSeat || '';
    }
  } else {
    // 恢复正常解析渲染
    previewSeat.style.display = 'block';
    if (previewSeatFallback) previewSeatFallback.style.display = 'none';

    previewSeat.innerHTML = '';
    parsed.view.forEach(part => {
      const span = document.createElement('span');
      span.textContent = part.text;
      span.style.fontFamily = part.font;
      span.style.fontSize = part.size + 'px';
      if (part.color) span.style.color = part.color;
      if (part.style) span.style.cssText += ';' + part.style;
      previewSeat.appendChild(span);
    });
  }
}

// 监听输入变化
on(inputSeat, 'input', updateSeatPreview);
on(inputSeatType, 'input', updateSeatPreview);
updateSeatPreview();


  // 首次同步
  (function boot() {
    // 主动触发一次，保证进入页面就看到对应预览
    ['input','change'].forEach(evt => {
      inputtraincode && inputtraincode.dispatchEvent(new Event('input'));
      inputid && inputid.dispatchEvent(new Event('input'));
      inputname && inputname.dispatchEvent(new Event('input'));
      inputprice && inputprice.dispatchEvent(new Event('input'));
      inputpurpose && inputpurpose.dispatchEvent(new Event('input'));
      inputcheck && inputcheck.dispatchEvent(new Event('input'));
      inputidtype && inputidtype.dispatchEvent(new Event('input'));
      inputDate && inputDate.dispatchEvent(new Event('input'));
      inputSeatType && inputSeatType.dispatchEvent(new Event('input'));
      inputSeat && inputSeat.dispatchEvent(new Event('input'));
    });
  })();
})();
//===========================================================================================
(() => {
  // —— 作用域适配器（按脚本 data-page 选择页面根）——
  const __thisScript = document.currentScript;
  const __page = __thisScript?.dataset.page || 'red2015';
  const __root = document.querySelector(`.page.${__page}`) || null;
  if (!__root) return; // 对应页面不存在，直接跳过

  const $id = (id) => __root.querySelector(`#${id}`);
  const on  = (el, type, handler) => { if (el) el.addEventListener(type, handler); };

  window.addEventListener('DOMContentLoaded', () => {
    // ========== 1) 限乘 / 通票 / 签证 / 有效期 ==========
const previewvisa = $id('preview-visa');
const inputvisa   = $id('input-visa');
const labelLimit  = $id('label-limit');

on(inputvisa, 'input', () => {
  const raw = inputvisa.value || '';
  if (previewvisa)
    previewvisa.innerHTML = `<span style="white-space:pre;">${raw}</span>`;
});

const previewlimit    = $id('preview-limit');
const inputlimit      = $id('input-limit');
const tongpiaoCheckbox= $id('tongpiao');
const viaWrapper      = $id('via-wrapper');

const via1 = $id('via-part1');
const via2 = $id('via-part2');
const via3 = $id('via-part3');
const via4 = $id('via-part4');

// ===== 通票模式 =====
function updateViaPreview() {
  if (!previewlimit) return;

  const part1 = via1?.value || '';
  const part2 = via2?.value || '';
  const part3 = via3?.value || '';
  const part4 = via4?.value || '';

  // 坐标微调参数（px）
      const adjust = {
        part1: { top: -8, left: 0 },
        jinyou: { top: -9, left: -6 },
        part2: { top: -8, left: -12 },
        zhii: { top: -9, left: -18 },
        part3: { top: -7, left: -24 },
        zhan: { top: -9, left: -28 },
        part4: { top: -8, left: -30 },
      };

  const html = `
    <span style="
      position:relative; top:${adjust.part1.top}px; left:${adjust.part1.left}px;
      white-space:pre; font-family:'寒蝉端黑宋'; font-size:14px; font-weight:500;
    ">${part1}</span>
    <span style="
      position:relative; top:${adjust.jinyou.top}px; left:${adjust.jinyou.left}px;
      white-space:pre; font-size:11px; font-weight:500;
    "> 经由 </span>
    <span style="
      position:relative; top:${adjust.part2.top}px; left:${adjust.part2.left}px;
      white-space:pre; font-family:'寒蝉端黑宋'; font-size:14px; font-weight:500;
    ">${part2}</span>
    <span style="
      position:relative; top:${adjust.zhii.top}px; left:${adjust.zhii.left}px;
      white-space:pre; font-size:11px; font-weight:500;
    "> 至 </span>
    <span style="
      position:relative; top:${adjust.part3.top}px; left:${adjust.part3.left}px;
      white-space:pre; font-family:'思源黑体 CN'; font-size:17px; font-weight:500;
    ">${part3}</span>
    <span style="
      position:relative; top:${adjust.zhan.top}px; left:${adjust.zhan.left}px;
      white-space:pre; font-family:'寒蝉端黑宋'; font-size:11px; font-weight:500;
    ">站</span>
    <span style="
      position:relative; top:${adjust.part4.top}px; left:${adjust.part4.left}px;
      white-space:pre; font-family:'寒蝉端黑宋','宋体','Songti SC',serif; font-size:14px;
    "> ${part4}日内到有效</span>
  `;

  previewlimit.innerHTML = html;
  previewlimit.style.whiteSpace = 'nowrap';
}

// ===== 模式切换 =====
on(tongpiaoCheckbox, 'change', function () {
  const isTongpiao = !!this.checked;
  if (inputlimit) inputlimit.style.display = isTongpiao ? 'none' : 'inline-block';
  if (labelLimit) labelLimit.style.display = isTongpiao ? 'none' : 'block';
  if (viaWrapper) viaWrapper.style.display = isTongpiao ? 'block' : 'none';

  if (!previewlimit) return;
  previewlimit.textContent = '';

  if (!isTongpiao) {
    if (inputlimit) {
      const raw = inputlimit.value || '';
      previewlimit.innerHTML = `<span style="white-space:pre;">${raw}</span>`;
      previewlimit.style.whiteSpace = 'nowrap';
    }
  } else {
    updateViaPreview();
  }
});

// ===== 普通模式输入监听 =====
on(inputlimit, 'input', () => {
  if (!tongpiaoCheckbox?.checked && previewlimit) {
    const raw = inputlimit.value || '';
    previewlimit.innerHTML = `<span style="white-space:pre;">${raw}</span>`;
    previewlimit.style.whiteSpace = 'nowrap';
  }
});

// ===== 通票模式输入监听 =====
[via1, via2, via3, via4].filter(Boolean).forEach(el => on(el, 'input', updateViaPreview));


    // ========== 2) 标语（预设 / 自定义） + 过海提示 vs 边框（互斥） ==========
    // 标语状态
    let adMode = 'preset';             // 'preset' | 'custom'
    let currentKey = '';               // 预设 key
    let currentLine1 = '';
    let currentLine2 = '';
    let customLine1 = '';
    let customLine2 = '';

    // 标语控件（2015 页面）
    const defaultAdSelect = $id('input-defaultad'); // 被 datalist.js 包装为自定义下拉，但 select 仍在
    const inputad1 = $id('input-ad1');
    const inputad2 = $id('input-ad2');
    const previewad1 = $id('preview-ad1');
    const previewad2 = $id('preview-ad2');

    function applyPreset(val) {
      const pair = (window.defaultAdPresets && window.defaultAdPresets[val]) || ['', ''];
      currentKey   = val;
      currentLine1 = pair[0] || '';
      currentLine2 = pair[1] || '';
      if (inputad1) inputad1.value = currentLine1;
      if (inputad2) inputad2.value = currentLine2;
      if (previewad1) previewad1.textContent = currentLine1;
      if (previewad2) previewad2.textContent = currentLine2;
      adMode = 'preset';
    }

    on(defaultAdSelect, 'change', () => {
      const val = defaultAdSelect.value;
      if (val === '自定义') {
        adMode = 'custom';
        if (inputad1) { inputad1.disabled = false; inputad1.value = customLine1 = ''; }
        if (inputad2) { inputad2.disabled = false; inputad2.value = customLine2 = ''; }
        if (previewad1) previewad1.textContent = '';
        if (previewad2) previewad2.textContent = '';
      } else {
        applyPreset(val);
        if (inputad1) inputad1.disabled = false;
        if (inputad2) inputad2.disabled = false;
      }
    });

    // 过海提示 & 边框互斥（仅 2015）
    const inputseanotice   = $id('input-seanotice');
    const previewseanotice = $id('preview-seanotice');
    const toggleBorder     = $id('toggle-border');
    const borderImg        = $id('border-img');
    const seanotice        = $id('seanotice');

    on(toggleBorder, 'change', function () {
      if (borderImg) borderImg.style.display = this.checked ? 'block' : 'none';
      if (this.checked && seanotice?.checked) {
        // 取消“过海提示”并恢复标语
        seanotice.checked = false;
        if (previewad1) previewad1.style.display = '';
        if (previewad2) previewad2.style.display = '';
        if (adMode === 'custom') {
          if (inputad1) inputad1.value = customLine1;
          if (inputad2) inputad2.value = customLine2;
          if (previewad1) previewad1.textContent = customLine1;
          if (previewad2) previewad2.textContent = customLine2;
        } else {
          if (inputad1) inputad1.value = currentLine1;
          if (inputad2) inputad2.value = currentLine2;
          if (previewad1) previewad1.textContent = currentLine1;
          if (previewad2) previewad2.textContent = currentLine2;
        }
        if (previewseanotice) {
          previewseanotice.textContent = '';
          previewseanotice.style.display = 'none';
        }
      }
    });

    on(seanotice, 'change', function () {
      if (this.checked) {
        if (previewad1) previewad1.style.display = 'none';
        if (previewad2) previewad2.style.display = 'none';
        if (previewseanotice) {
          previewseanotice.textContent =
            (inputseanotice?.value) || (inputseanotice?.placeholder) || '';
          previewseanotice.style.display = 'block';
        }
        if (toggleBorder) toggleBorder.checked = false;
        if (borderImg) borderImg.style.display = 'none';
      } else {
        if (previewad1) previewad1.style.display = '';
        if (previewad2) previewad2.style.display = '';
        if (adMode === 'custom') {
          if (inputad1) inputad1.value = customLine1;
          if (inputad2) inputad2.value = customLine2;
          if (previewad1) previewad1.textContent = customLine1;
          if (previewad2) previewad2.textContent = customLine2;
        } else {
          if (inputad1) inputad1.value = currentLine1;
          if (inputad2) inputad2.value = currentLine2;
          if (previewad1) previewad1.textContent = currentLine1;
          if (previewad2) previewad2.textContent = currentLine2;
        }
        if (previewseanotice) {
          previewseanotice.textContent = '';
          previewseanotice.style.display = 'none';
        }
      }
    });

    on(inputseanotice, 'input', () => {
      if (seanotice?.checked && previewseanotice) {
        previewseanotice.textContent =
          inputseanotice.value ||
          '温馨提示：本次列车途径琼州海峡，特殊季节遇台风等恶劣天气，轮渡可能停航，敬请关注天气预报。';
      }
    });

    // 自定义输入联动
    on(inputad1, 'input', () => {
      if (previewad1) previewad1.textContent = inputad1.value;
      if (adMode === 'custom') customLine1 = inputad1.value;
    });
    on(inputad2, 'input', () => {
      if (previewad2) previewad2.textContent = inputad2.value;
      if (adMode === 'custom') customLine2 = inputad2.value;
    });

    // 初始化标语：若 select 当前值为某个 key，则按 key 填入
    if (defaultAdSelect && defaultAdSelect.value && defaultAdSelect.value !== '自定义') {
      applyPreset(defaultAdSelect.value);
    }

    // ========== 3) 备注（圆圈字可选） ==========
    const inputNotice   = $id('notice');            // 注意：ID 叫 'notice'
    const previewNotice = $id('preview-notice');
    const circleCheckbox= $id('circle');

function updateNoticePreview() {
  if (!previewNotice || !inputNotice) return;
  const raw = (inputNotice.value || '').trim();
  const useCircle = !!(circleCheckbox && circleCheckbox.checked);

  if (!raw) { previewNotice.innerHTML = ''; return; }

  if (!useCircle) {
    previewNotice.innerHTML = `<span style="font-size:11px; font-family:'寒蝉端黑宋', sans-serif;">${raw}</span>`;
    return;
  }

  const parts = [...raw.replace(/\s+/g, '')];
  const rendered = parts.map(ch => (
    `<span style="
      display:inline-flex;justify-content:center;align-items:center;
      width:15px;height:15px;
      border:1.5px solid black;border-radius:50%;
      margin:0 2px;
      font-size:11.5px;font-family:'寒蝉端黑宋',sans-serif;
      box-sizing:border-box;
    ">
      <span style="position:relative; top:-0.7px; line-height:1;">${ch}</span>
    </span>`
  ));
  previewNotice.innerHTML = rendered.join('');
}

    on(inputNotice,   'input',  updateNoticePreview);
    on(circleCheckbox,'change', updateNoticePreview);

    // ========== 4) 票号联动（+ 设置页全局 auto-num） ==========
    const previewBotNum  = $id('preview-botnum');
    const inputBotNum    = $id('input-botnum');
    const previewTopNum  = $id('preview-topnum');
    const inputTopNum    = $id('input-topnum');
    const inputClassNum  = $id('input-classnum');
    // 这个开关在“设置页”，不在 red2015 容器里 → 用 document 取
    const autoNumToggle  = document.getElementById('auto-num');

    if (typeof window.ticketSettings !== 'object' || !window.ticketSettings) {
      window.ticketSettings = {};
    }
    const ticketSettings = window.ticketSettings;

    if (inputBotNum && inputTopNum && previewBotNum && previewTopNum && inputClassNum) {
      if (typeof ticketSettings.autoNum !== 'boolean') {
        ticketSettings.autoNum = autoNumToggle ? !!autoNumToggle.checked : true;
      } else if (autoNumToggle) {
        autoNumToggle.checked = ticketSettings.autoNum;
      }

      const autoNumEnabled = () => ticketSettings.autoNum !== false;

      function updateTopNumPreview() {
        const classNum = (inputClassNum.value || inputClassNum.dataset.previewDefault || '');
        const topNum   = (inputTopNum.value   || inputTopNum.dataset.previewDefault   || '');
        previewTopNum.textContent = classNum + topNum;
      }
      function syncTopNumFromBot() {
        inputTopNum.value = (inputBotNum.value || '').slice(14, 21);
        updateTopNumPreview();
      }
      function handleBotNumInput() {
        if (previewBotNum) previewBotNum.textContent = inputBotNum.value || '';
        if (autoNumEnabled()) syncTopNumFromBot();
      }

      on(inputBotNum,   'input', handleBotNumInput);
      on(inputTopNum,   'input', updateTopNumPreview);
      on(inputClassNum, 'input', updateTopNumPreview);
      on(inputTopNum,   'preview-refresh', updateTopNumPreview);
      on(inputClassNum, 'preview-refresh', updateTopNumPreview);

      on(autoNumToggle, 'change', () => {
        ticketSettings.autoNum = !!autoNumToggle.checked;
        if (autoNumEnabled()) syncTopNumFromBot();
        window.dispatchEvent(new CustomEvent('ticket-settings-changed', {
          detail: { key: 'autoNum', value: ticketSettings.autoNum, settings: { ...ticketSettings } }
        }));
      });

      window.addEventListener('ticket-settings-changed', (e) => {
        const detail = e?.detail;
        if (!detail) return;
        if (detail.key && detail.key !== 'autoNum') return;
        if (autoNumToggle && autoNumToggle.checked !== autoNumEnabled()) {
          autoNumToggle.checked = autoNumEnabled();
        }
        if (autoNumEnabled()) syncTopNumFromBot();
      });

      // 初始渲染
      handleBotNumInput();
      if (!autoNumEnabled()) updateTopNumPreview();
    }

    // ========== 5) 金额 / “00 积分票” ==========
    const inputPrice  = $id('input-price');
    const previewPrice= $id('preview-price');
    const previewRMB  = $id('preview-rmb');

    let wasPointTicket = false; // 当前是否积分票状态
    // 还原快照
    let savedNotice = '';
    let savedAdMode = '';
    let savedAd1 = '';
    let savedAd2 = '';
    let savedBorderChecked = false;
    let savedPresetKey = '';

    function handlePriceChange() {
      if (!inputPrice) return;
      const rawVal     = inputPrice.value || '';
      const cleanedVal = rawVal.replace(/[^\d.]/g, '');
      if (rawVal !== cleanedVal) inputPrice.value = cleanedVal;

      const isPoint = cleanedVal === '00';

      if (isPoint) {
        if (!wasPointTicket) {
          wasPointTicket = true;

          // 保存快照
          savedNotice        = inputNotice?.value || '';
          savedAdMode        = adMode;
          savedBorderChecked = !!(toggleBorder?.checked);

          if (savedAdMode === 'preset') {
            savedPresetKey = defaultAdSelect?.value || '';
            const pair = (window.defaultAdPresets && window.defaultAdPresets[savedPresetKey]) || ['', ''];
            savedAd1 = pair[0] || '';
            savedAd2 = pair[1] || '';
          } else {
            savedPresetKey = '';
            savedAd1 = inputad1?.value || '';
            savedAd2 = inputad2?.value || '';
          }

          // 切到自定义并清空两行
          if (defaultAdSelect) defaultAdSelect.value = '自定义';
          adMode = 'custom';
          if (inputad1) { inputad1.disabled = false; inputad1.value = ''; }
          if (inputad2) { inputad2.disabled = false; inputad2.value = ''; }
          if (previewad1) previewad1.textContent = '';
          if (previewad2) previewad2.textContent = '';
          customLine1 = '';
          customLine2 = '';

          // 关边框
          if (toggleBorder) toggleBorder.checked = false;
          if (borderImg) borderImg.style.display = 'none';

          // 隐藏金额与 RMB
          if (previewPrice) previewPrice.textContent = '';
          if (previewRMB)   previewRMB.style.display = 'none';

          // 备注写“赠”
          if (inputNotice) { inputNotice.value = '赠'; updateNoticePreview(); }
        }
        return;
      }

      // 退出“00” → 恢复
      if (wasPointTicket) {
        wasPointTicket = false;

        if (inputNotice) { inputNotice.value = savedNotice; updateNoticePreview(); }

        adMode = savedAdMode;
        if (adMode === 'preset') {
          if (defaultAdSelect) defaultAdSelect.value = savedPresetKey || '';
          const pair = (window.defaultAdPresets && window.defaultAdPresets[savedPresetKey]) || ['', ''];
          currentLine1 = pair[0] || '';
          currentLine2 = pair[1] || '';
          if (inputad1) inputad1.value = currentLine1;
          if (inputad2) inputad2.value = currentLine2;
          if (previewad1) previewad1.textContent = currentLine1;
          if (previewad2) previewad2.textContent = currentLine2;
          if (inputad1) inputad1.disabled = false;
          if (inputad2) inputad2.disabled = false;
        } else {
          if (defaultAdSelect) defaultAdSelect.value = '自定义';
          if (inputad1) { inputad1.disabled = false; inputad1.value = savedAd1; }
          if (inputad2) { inputad2.disabled = false; inputad2.value = savedAd2; }
          if (previewad1) previewad1.textContent = savedAd1;
          if (previewad2) previewad2.textContent = savedAd2;
          customLine1 = savedAd1;
          customLine2 = savedAd2;
        }

        // 边框
        if (toggleBorder) toggleBorder.checked = savedBorderChecked;
        if (borderImg)    borderImg.style.display = savedBorderChecked ? 'block' : 'none';
      }

      // 普通金额渲染（保持你的“元”span 格式）
      if (previewPrice && previewRMB) {
        if (cleanedVal) {
          previewPrice.innerHTML =
            `${cleanedVal}<span style="font-family:'寒蝉端黑宋','regular'; font-size:11px; margin-left:2px; position:relative; top:0; font-weight:500;">元</span>`;
          previewRMB.style.display = 'inline';
        } else {
          previewPrice.textContent = '';
          previewRMB.style.display = 'none';
        }
      }
    }

    on(inputPrice, 'input', handlePriceChange);

    // —— 结束：初始同步（尽量不改外观，仅修正值/预览）——
    updateNoticePreview();       // 备注首次渲染
    if (tongpiaoCheckbox?.checked) updateViaPreview();
    if (inputPrice) handlePriceChange();
  });

// From-To.js —— 发到站 + 拼音（可直接替换）=====================================================================================
(() => {
  const __script = document.currentScript;
  const __page   = __script?.dataset.page || 'red2015';
  const __root   = document.querySelector(`.page.${__page}`);
  if (!__root) return; // 当前页面实例不存在，直接跳过

  const $id = (id) => __root.querySelector(`#${id}`);
  const on  = (el, type, handler) => { if (el) el.addEventListener(type, handler); };

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
    const previewFromZhan    = $id('preview-from-zhan');

    // To
    const inputTo            = $id('input-to');
    const inputToPinyin      = $id('input-to-pinyin');
    const previewTo          = $id('preview-to');
    const previewToPinyin    = $id('preview-ToPinyin');   // 注意大小写：To
    const previewToZhan      = $id('preview-to-zhan');

    // 位置参数（两页可以复用；不写死到样式里，留给脚本控制）
    const FROM_ZHAN_LEFT = { 1: 84, 2: 84, 3: 98, 4: 104, 5: 115 };
    const TO_ZHAN_LEFT   = { 1: 84, 2: 84, 3: 98, 4: 104, 5: 115 };
    const FROM_BASE_LEFT = 11;
    const TO_BASE_LEFT   = 210;

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
    function updateStationSpacing(elem, value, zhanElem, zhanLeftMap, baseLeft) {
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

      // 写入“站”字（若元素存在）
      if (zhanElem) {
        if (val) {
          zhanElem.style.display = '';
          zhanElem.textContent = '站';
          const zhanLeft = zhanLeftMap[len] || zhanLeftMap[5] || 0;
          zhanElem.style.left = (baseLeft + zhanLeft + leftOffset) + 'px';
        } else {
          zhanElem.style.display = 'none';
          zhanElem.textContent = '';
        }
      }
    }

    function handleFromInput() {
      const name = (inputFrom?.value || '').trim();
      updateStationSpacing(previewFrom, name, previewFromZhan, FROM_ZHAN_LEFT, FROM_BASE_LEFT);
      if (autoPinyinEnabled()) fillFromPinyinFromStation();
    }
    function handleToInput() {
      const name = (inputTo?.value || '').trim();
      updateStationSpacing(previewTo, name, previewToZhan, TO_ZHAN_LEFT, TO_BASE_LEFT);
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
})();
//QR CODE——————————————————————————————————————————————————————————————————————————————————————
window.addEventListener('DOMContentLoaded', () => {
  const preview = document.getElementById('preview');
  const ticketSettings = window.ticketSettings = window.ticketSettings || {};
  const QR_SETTING_KEY = 'showQrcode';
  const qrCheckbox = document.getElementById('show-qrcode');

  if (typeof ticketSettings[QR_SETTING_KEY] !== 'boolean') {
    ticketSettings[QR_SETTING_KEY] = qrCheckbox ? !!qrCheckbox.checked : true;
  } else if (qrCheckbox) {
    qrCheckbox.checked = ticketSettings[QR_SETTING_KEY];
  }

  let qrContainer = document.getElementById('preview-qrcode');
  if (!qrContainer) {
    qrContainer = document.createElement('div');
    qrContainer.id = 'preview-qrcode';
    preview.appendChild(qrContainer);
  }

  Object.assign(qrContainer.style, {
    position: 'absolute',
    right: '26px',
    bottom: '16px',
    width: '76px',
    height: '76px',
    overflow: 'visible',
    background: 'transparent',
  });

  const getText = id => (document.getElementById(id)?.textContent.trim() || '');

  function notifyTicketSettingsChanged(key) {
    window.dispatchEvent(new CustomEvent('ticket-settings-changed', {
      detail: {
        key,
        value: ticketSettings[key],
        settings: Object.assign({}, ticketSettings),
      },
    }));
  }

  function isQrEnabled() {
    if (typeof ticketSettings[QR_SETTING_KEY] === 'boolean') {
      return ticketSettings[QR_SETTING_KEY];
    }
    return qrCheckbox ? !!qrCheckbox.checked : true;
  }

  // ---------- 真实 144 位二维码 ----------
  // 依据 libJNIEncrypt.so 的编解码算法复刻，编码器在 static/ticket.js 里（零依赖）。
  // 票面字段 -> 117 字节明文 -> 分块 Feistel -> 144 位数字 -> QR(Numeric, M)
  const scope = document.querySelector('.page.red2015') || document;
  const byId = id => scope.querySelector('[id="' + id + '"]') || document.getElementById(id);
  const fieldVal = id => { const el = byId(id); return el ? String(el.value == null ? '' : el.value).trim() : ''; };

  const ID_TYPE_LIST = ['', '二代居民身份证', '一代居民身份证', '临时身份证', '武警警官证', '军官证',
    '士兵证', '军队学员证', '军队文职干部证', '军队离退休干部证', '军人保障卡', '护照',
    '港澳居民回乡证', '救助证', '港澳通行证', '台湾通行证', '台湾内地通行证', '外国人居留证',
    '外国人出入境证', '外交官证', '领事馆证', '海员证', '学生证', '户口簿', '铁路乘车证签证',
    '释放证', '机动车驾驶证', '居住证、暂住证', '结婚证', '社会保障卡', '医疗保险卡', '非实名制车票'];

  let _stationMap = null;
  function stationCode(name) {
    if (!_stationMap) {
      _stationMap = Object.create(null);
      (window.stationData || []).forEach(d => {
        const code = String(d['电报码'] || '').replace(/^-/, '');
        const nm = String(d['站名'] || '');
        if (code && nm && !_stationMap[nm]) _stationMap[nm] = code;
      });
    }
    var s = String(name == null ? '' : name).trim();
    if (!s) return '';
    var hit = _stationMap[s] || _stationMap[s.replace(/站$/, '')];
    if (hit) return hit;
    if (/^[A-Za-z]{3}$/.test(s)) return s.toUpperCase();
    // 虚拟车站：查不到就给一个稳定的假三字码（否则会变 AAA，和空经由相等会误判退票费）
    return (window.TicketQR && window.TicketQR.fakeStationCode)
      ? window.TicketQR.fakeStationCode(s.replace(/站$/, '') || s) : '';
  }

  // 证件类型：统一用 ticket.js 里的 31 项简码表（含 CC=铁路乘车证签证）
  function idTypeCode(v) {
    v = String(v == null ? '' : v).trim().toUpperCase();
    if (window.TicketQR && typeof window.TicketQR.idTypeCodeOf === 'function') {
      const n = window.TicketQR.idTypeCodeOf(v);
      return (v === '' || n === 0) ? 1 : n;       // 空/认不出时按二代证
    }
    if (v === '') return 1;
    if (/^\d+$/.test(v)) return +v;
    const i = ID_TYPE_LIST.indexOf(v);
    return i < 0 ? 1 : i;
  }

  // 票种（票面票价旁的“孩/学/军/探…”字样）-> 码内 01-15
  const TICKET_TYPE_CHARS = ' 孩学军 探半孩团兵红返卧团农助令';
  function ticketTypeFromText(s) {
    s = String(s || '').trim();
    if (s === '') return 1;
    if (s.charAt(0) === '全') return 1;
    let i = TICKET_TYPE_CHARS.indexOf(s.charAt(0));
    if (i > 0) return i + 1;
    // 备注栏是自动切分的多段文字，票种字不一定在开头
    let hit = 0, best = Infinity;
    for (let k = 1; k < TICKET_TYPE_CHARS.length; k++) {
      const ch = TICKET_TYPE_CHARS.charAt(k);
      if (!ch.trim()) continue;
      const pos = s.indexOf(ch);
      if (pos >= 0 && pos < best) { best = pos; hit = k; }
    }
    return hit > 0 ? hit + 1 : 1;
  }

  // 结账年 = 由乘车日 + 结账 MMDD 反推（与解码端的跨年 ±1 修正互逆）
  function settleYearFor(trip, md) {
    const y = +trip.slice(0, 4);
    const a = (+md.slice(0, 2)) * 31 + (+md.slice(2, 4));
    const b = (+trip.slice(4, 6)) * 31 + (+trip.slice(6, 8));
    if (b < a && (371 - a) + b < 301) return y - 1;
    if (a < b && (a + 371) - b < 31) return y + 1;
    return y;
  }

  // 签证／限乘里能在码里找到落点的关键字（依据 moerail 的渲染条件）
  const VISA_TRANSFER = /中转/;        // 46:47 = 1
  const VISA_CERT = /乘车证签证/;       // 68:70 = 24（铁路乘车证签证）

  // 通票的“至X站”里 X 是站名，可能带“至/站”字样
  function stationNameOf(v) {
    return String(v == null ? '' : v).trim().replace(/^至\s*/, '').replace(/站\s*$/, '').trim();
  }

  function codeOfStation(v) {
    const name = stationNameOf(v);
    if (!name) return '';
    const byName = stationCode(name);
    if (byName) return byName;
    return /^[A-Za-z]{3}$/.test(name) ? name.toUpperCase() : '';   // 也允许直接填电报码
  }

  // 设置页的“逼真二维码”开关与证件类型（不再用手工输入的证件类型）
  function isRealisticQr() {
    const el = byId('realistic-qr');
    return !!(el && el.checked);
  }
  function selectedIdType() {
    const el = byId('realistic-qr-idtype');
    const v = el ? String(el.value == null ? '' : el.value).trim() : '';
    return v || '1';                       // 默认 1 二代居民身份证
  }

  // 未启用“逼真二维码”时的老版本：下票号+车次+日期+席位 补 1 到 30 位，再拼祝福语
  function legacyQrPayload() {
    const txt = id => {
      const el = byId(id);
      return el ? String(el.textContent || '').trim() : '';
    };
    let combined = txt('preview-botnum') + txt('preview-traincode') +
      txt('date-part1') + txt('date-part2') + txt('date-part3') +
      txt('date-part4') + txt('date-part5') + txt('preview-seat');
    if (combined.length < 30) combined = combined.padEnd(30, '1');
    return combined + '风过留声，雁过留痕。愿了情终，再无留存。';
  }

  // 本软件水印：码内 47:48 固定 Z1、第 144 位固定 1。三处都不参与票面，
  // 固定后可用来自查一张票是不是本软件出的（真票这里是随机量）。
  const QR_MARK = (window.TicketQR && window.TicketQR.WATERMARK) || { visa: 'Z', group: 1, spare: '1' };

  // 姓名：输入框为空时，票面显示的是「预填个人信息」里的姓名（settings.js 写在
  // dataset.previewDefault 上，同时设成 placeholder）。编码必须跟票面一致，
  // 否则会出现"票面有名字、码里却是空的"。
  function nameForCode() {
    const el = byId('input-name');
    return fieldVal('input-name') || (el && el.dataset ? el.dataset.previewDefault : '') || '';
  }

  // 任何输入都能出码：字段缺失/非法一律由 TicketQR.encode 内部按 0 占位
  function compileTicketCode() {
    if (!window.TicketQR) return null;
    const stamp = fieldVal('input-date').replace(/\D/g, '');
    const bot = fieldVal('input-botnum').replace(/\s/g, '').toUpperCase();
    const top = fieldVal('input-topnum').replace(/\s/g, '').toUpperCase();
    const hit = /([A-Z]\d{6})$/.exec(top) || /([A-Z]\d{6})$/.exec(bot);
    const seat = fieldVal('input-seat');
    const settleMD = /\d{14}/.test(bot) ? bot.slice(10, 14) : '';
    const settleYear = (stamp.length >= 8 && settleMD) ? settleYearFor(stamp.slice(0, 8), settleMD) : 0;

    // ---- 票面那几行文字 -> 码内字段 ----
    const viaEnd = stationNameOf(fieldVal('via-part3'));
    const viaBox = byId('via-wrapper');
    const viaVisible = !!(viaBox && viaBox.style.display !== 'none');
    // 勾了通票、或经由区正显示着且填了“至X站”，才按通票处理（避免切回普通模式后残留值误翻）
    const tongpiao = !!(byId('tongpiao') && byId('tongpiao').checked) || (viaVisible && viaEnd !== '');
    const limit = fieldVal('input-limit');      // 限乘/有效期：限乘当日当次车[  随原票使用|随乘车证有效]
    const visa = fieldVal('input-visa');        // 签证：中转签证 / 中转 / 硬席乘车证签证 …
    const noticeText = fieldVal('notice');      // 备注（左下角）：学 / 孩 / 军 …

    // 证件：签证栏写“XX乘车证签证”，或限乘写“随乘车证有效”，都是 24
    let idt = idTypeCode(selectedIdType());
    if (VISA_CERT.test(visa) || limit.indexOf('随乘车证有效') >= 0) idt = 24;

    // 46:47 —— “随原票使用”和“中转”都置 1
    const transit = (limit.indexOf('随原票使用') >= 0 || VISA_TRANSFER.test(visa)) ? 1 : 0;

    // 中转签证票的票价是 00000（33:38 全 0），与 moerail 的判定条件一致
    let price = fieldVal('input-price');
    if (visa.indexOf('中转签证') >= 0) price = '0';

    // 通票：票面大字站是经由站，“至X站”的 X 才是终到站（码里 to/via 正好相反）
    let toCode = stationCode(fieldVal('input-to'));
    let viaCode = '';
    if (tongpiao && viaEnd) {
      const endCode = codeOfStation(viaEnd);
      if (endCode) { viaCode = toCode; toCode = endCode; }
    }

    return window.TicketQR.encode({
      ticket_no: hit ? hit[1] : top,
      from_code: stationCode(fieldVal('input-from')),
      to_code: toCode,
      via_code: viaCode,
      train: fieldVal('input-traincode'),
      trip: stamp.length >= 8 ? stamp.slice(0, 4) + '-' + stamp.slice(4, 6) + '-' + stamp.slice(6, 8) : '',
      time: stamp.length >= 12 ? stamp.slice(8, 10) + ':' + stamp.slice(10, 12) : '',
      coach: (seat.split(/[\s-]/)[0] || ''),
      seat_type: fieldVal('input-seattype'),
      seat: seat,
      price: price,
      settle: settleMD ? settleYear + '-' + settleMD.slice(0, 2) + '-' + settleMD.slice(2, 4) : '',
      office: bot.slice(0, 5),
      pickup_type: bot.slice(5, 7),
      machine: bot.slice(7, 10),
      id_type: idt,
      id_no: fieldVal('realistic-qr-idno'),   // 逼真二维码用自己的证件号
      name: nameForCode(),
      ticket_type: (idt === 24 && !noticeText) ? 5 : ticketTypeFromText(noticeText),
      transit: transit,
      visa: QR_MARK.visa, group: QR_MARK.group, spare: QR_MARK.spare
    });
  }

  function drawQr(text, mode) {
    const qr = qrcode(0, 'M');
    qr.addData(text, mode || 'Numeric');
    qr.make();

    const cellSize = 1;
    const margin = 1;
    const count = qr.getModuleCount();
    const size = count * cellSize + margin * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          svg += `<rect x="${c * cellSize + margin}" y="${r * cellSize + margin}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
        }
      }
    }
    svg += '</svg>';
    qrContainer.innerHTML = svg;
    qrContainer.dataset.payload = text;
  }

  function generateTicketQRCode() {
    if (!isQrEnabled()) {
      qrContainer.innerHTML = '';
      qrContainer.dataset.payload = '';
      return;
    }
    // 没勾“逼真二维码”就走老版本（祝福语），勾了才用真实 144 位
    if (!isRealisticQr()) {
      drawQr(legacyQrPayload(), 'Byte');
      return;
    }
    let payload = null;
    try {
      payload = compileTicketCode();      // 字段缺失/乱输也照样出码（0 占位）
    } catch (err) {
      console.warn('[QR] 编码异常：', err && err.message ? err.message : err);
    }
    if (!payload) {                       // ticket.js 没加载时退回老版本
      drawQr(legacyQrPayload(), 'Byte');
      return;
    }
    drawQr(payload, 'Numeric');
  }

  let qrTimer = 0;
  function scheduleQr() {
    if (qrTimer) return;
    qrTimer = setTimeout(() => { qrTimer = 0; generateTicketQRCode(); }, 30);
  }

  generateTicketQRCode();

  const watchIds = [
    'input-topnum', 'input-botnum', 'input-traincode', 'input-date', 'input-seat',
    'input-seattype', 'input-price', 'input-from', 'input-to', 'input-name',
    'input-id', 'input-idtype',
    'input-limit', 'input-visa', 'notice', 'tongpiao',
    'realistic-qr', 'realistic-qr-idtype', 'realistic-qr-idno',
    'via-part1', 'via-part2', 'via-part3', 'via-part4',
    'preview-botnum', 'preview-traincode', 'preview-seat',
    'date-part1', 'date-part2', 'date-part3', 'date-part4', 'date-part5'
  ];
  watchIds.forEach(id => {
    const el = byId(id);
    if (!el) return;
    el.addEventListener('input', scheduleQr);
    el.addEventListener('change', scheduleQr);
  });
  const observer = new MutationObserver(scheduleQr);
  ['preview-botnum', 'preview-traincode', 'preview-seat',
   'date-part1', 'date-part2', 'date-part3', 'date-part4', 'date-part5'
  ].forEach(id => {
    const el = byId(id);
    if (el) observer.observe(el, { childList: true, characterData: true, subtree: true });
  });

  if (qrCheckbox) {
    qrCheckbox.addEventListener('change', () => {
      const enabled = !!qrCheckbox.checked;
      const previous = ticketSettings[QR_SETTING_KEY];
      ticketSettings[QR_SETTING_KEY] = enabled;
      if (previous !== enabled) {
        notifyTicketSettingsChanged(QR_SETTING_KEY);
      }
      generateTicketQRCode();
    });
  }

  window.addEventListener('ticket-settings-changed', event => {
    const detail = event && event.detail;
    if (!detail) return;
    if (detail.key && detail.key !== QR_SETTING_KEY) return;
    if (!detail.key && (!detail.settings || !Object.prototype.hasOwnProperty.call(detail.settings, QR_SETTING_KEY))) {
      return;
    }
    if (qrCheckbox && qrCheckbox.checked !== isQrEnabled()) {
      qrCheckbox.checked = isQrEnabled();
    }
    generateTicketQRCode();
  });
});
//seatformat===============================================================================================================
(() => {
function parseSeat(raw, seatType) {
  // ===================== 改进后的类型判定逻辑 =====================
  const hasZuo = seatType.includes('座');
  const hasWo  = seatType.includes('卧') || seatType.includes('一人软包');
  const both   = hasZuo && hasWo;
  // 同时包含“座”和“卧”视为“座”处理；只有两者都不含时才视为无法判断
  const multiple = (!hasZuo && !hasWo);

  // ===================== 若无法判断 → 默认 =====================
  if (multiple) {
    return { view: [{ text: raw, font: '寒蝉端黑宋', size: 14 }], error: false };
  }

  // ======================== 卧铺席别 ========================
  // 注：若同时含“座”“卧”，上方已决定按“座”处理，因此这里不再进入
  if (hasWo && !both) {
    const hasPlus = raw.startsWith('+');

    const normalRe = /^\d{2}[012][0-9A-Za-z]{3}[012]$/;
    const plusRe   = /^\+[0-9][012][0-9A-Za-z]{3}[012]$/;
    if (!(normalRe.test(raw) || plusRe.test(raw))) {
      return { view: [{ text: raw, font: '寒蝉端黑宋', size: 14, color: '#d00' }], error: true };
    }

    let car, levelCode, bedNum, bedTypeCode;
    if (hasPlus) {
      car         = raw[1];              // 一位车厢
      levelCode   = raw[2];
      bedNum      = raw.slice(3, 6);
      bedTypeCode = raw[6];
    } else {
      car         = raw.slice(0, 2);     // 两位车厢
      levelCode   = raw[2];
      bedNum      = raw.slice(3, 6);
      bedTypeCode = raw[6];
    }

    // 文案
    let levelText = '';
    if (levelCode === '1') levelText = '下';
    if (levelCode === '2') levelText = '上';

    let bedTypeText = '';
    if (bedTypeCode === '0') bedTypeText = '下铺';
    if (bedTypeCode === '1') bedTypeText = '中铺';
    if (bedTypeCode === '2') bedTypeText = '上铺';

    // 统一样式常量
    const CAR_UNIT_STYLE  = 'position:relative; top:0px;';   // “车”
    const LABEL_STYLE     = 'position:relative; top:1.2px;'; // “加”“号”“上中下铺”等
    const LABEL_FONT      = '寒蝉端黑宋';
    const LABEL_SIZE      = 15;

    const view = [];

    if (hasPlus) {
      view.push({ text: '加', font: LABEL_FONT, size: LABEL_SIZE, style: LABEL_STYLE });
    }

    view.push({ text: car, font: 'Btp', size: 16 });
    view.push({ text: '车', font: '寒蝉端黑宋', size: 11, style: CAR_UNIT_STYLE  });

    if (levelText) {
      view.push({ text: levelText, font: LABEL_FONT, size: LABEL_SIZE, style: 'position:relative; top:0.5px;' });
    }

    view.push({ text: bedNum, font: 'Btp', size: 16 });

    // “号”与“上中下铺”一致
    view.push({ text: '号', font: LABEL_FONT, size: LABEL_SIZE, style: LABEL_STYLE });
    view.push({ text: bedTypeText, font: LABEL_FONT, size: LABEL_SIZE, style: LABEL_STYLE });

    return { car, level: levelText, seat: bedNum, bedType: bedTypeText, view, error: false };
  }

  // ====================== 普通座席 =========================
  // 同时出现“座”“卧”也走这里（按座席处理）
  if (hasZuo) {
    const hasPlus = raw.startsWith('+');

    // 无“加”：2位车厢 + 1位层码 + 2~4位座位
    const normalRe = /^\d{2}[012][0-9A-Za-z]{2,4}$/;
    // 有“加”：+ + 1位车厢 + 1位层码 + 2~4位座位
    const plusRe   = /^\+[0-9][012][0-9A-Za-z]{2,4}$/;

    if (!(normalRe.test(raw) || plusRe.test(raw))) {
      return { view: [{ text: raw, font: '寒蝉端黑宋', size: 14, color: '#d00' }], error: true };
    }

    let car, levelCode, seatAll;
    if (hasPlus) {
      car       = raw[1];        // 一位车厢
      levelCode = raw[2];
      seatAll   = raw.slice(3);  // 2~4 位
    } else {
      car       = raw.slice(0, 2); // 两位车厢
      levelCode = raw[2];
      seatAll   = raw.slice(3);    // 2~4 位
    }

    let levelText = '';
    if (levelCode === '1') levelText = '下';
    if (levelCode === '2') levelText = '上';

    // 若 seatAll 为4位，则前三位放“号”前，最后1位放“号”后
    const mainSeat = seatAll.length >= 4 ? seatAll.slice(0, 3) : seatAll;
    const extra    = seatAll.length >= 4 ? seatAll.slice(3)     : '';
    const hasExtra = !!extra;

    const view = [];

    // “加”
    if (hasPlus) {
      view.push({ text: '加', font: '寒蝉端黑宋', size: 15, style: 'position:relative; top:1.2px;' });
    }

    view.push({ text: car, font: 'Btp', size: 16 });
    view.push({ text: '车', font: '寒蝉端黑宋', size: 11, style: 'position:relative; top:-0.5px;' });

    if (levelText) {
      view.push({ text: levelText, font: '寒蝉端黑宋', size: 15, style: 'position:relative; top:0.7px;' });
    }

    // “号”前主座位：数字用 Btp，其余宋体
    const numMain = mainSeat.match(/^\d+/);
    if (numMain) {
      view.push({ text: numMain[0], font: 'Btp', size: 16 });
      const letterMain = mainSeat.slice(numMain[0].length);
      if (letterMain) view.push({ text: letterMain, font: '寒蝉端黑宋', size: 14 });
    } else {
      view.push({ text: mainSeat, font: '寒蝉端黑宋', size: 14 });
    }

    // “号”
    view.push({
      text: '号',
      font: '寒蝉端黑宋',
      size: hasExtra ? 15 : 11,
      style: hasExtra ? 'position:relative; top:0.7px;' : 'position:relative; top:-0.5px;'
    });

    // 第7位（extra）放“号”后
    if (hasExtra) {
      view.push({ text: extra, font: 'Btp', size: 16, style: 'position:relative; top:1.4px;' });
    }

    const showStr =
      (hasPlus ? '加' : '') +
      car + '车' +
      (levelText ? levelText : '') +
      mainSeat + '号' + (extra || '');

    return { car, level: levelText, seat: seatAll, view, showStr, error: false };
  }
  // ===================== 其他类型默认原样 =====================
  return {
    view: [{
      text: raw || '',
      font: '寒蝉端黑宋',
      size: 14,
      color: '#000'
    }],
    error: false
  };
}

window.SeatFormat = { parseSeat };
})();
//datalist=========================================================================================================================
(() => {
  // ===== 全局预设对象（其他脚本读取用） =====
  const ORDER_KEY = '__order__';
  window.defaultAdOrder = window.defaultAdOrder || [];
  window.defaultAdPresets = window.defaultAdPresets || {};
  let defaultAdPresets = window.defaultAdPresets; // fetch/保存后会覆盖

  const API_URL = '/api/ad-presets';
  const CUSTOM_VALUE = '自定义';

  // ===== red2015 作用域（避免和 red2009 冲突） =====
  const root2015 = document.querySelector('.page.red2015');
  const root2009 = document.querySelector('.page.red2009');
  const id2015 = (id) => (root2015 ? root2015.querySelector('#' + id) : null);
  const id2009 = (id) => (root2009 ? root2009.querySelector('#' + id) : null);

  // red2015 的控件引用（运行时获取）
  let selDefault, inL1, inL2, prevL1, prevL2;

  // ===== 设置页元素（全局唯一）=====
  const viewerBody   = document.getElementById('ad-presets-viewer-body');
  const btnAdd       = document.getElementById('ad-preset-add');
  const btnSave      = document.getElementById('ad-preset-save');
  const editor       = document.getElementById('ad-presets-editor');
  const editorEmpty  = document.getElementById('ad-presets-editor-empty');
  const editorStatus = document.getElementById('ad-presets-editor-status');

  // ===== 工具 =====
  let __saveChain = Promise.resolve();
  function enqueueSave(taskFn) {
    __saveChain = __saveChain.then(() => taskFn()).catch(() => {}).then(() => {});
    return __saveChain;
  }
  function emitPresetsUpdated() {
    window.defaultAdPresets = defaultAdPresets || {};
    window.dispatchEvent(new CustomEvent('ad-presets-updated'));
  }

  function orderedKeys() {
    const src = defaultAdPresets || {};
    const ord = Array.isArray(window.defaultAdOrder) && window.defaultAdOrder.length
      ? window.defaultAdOrder
      : Object.keys(src);
    // 忽略以 "_" 开头的保留键，并确保都在 map 里
    return ord.filter(k => (k in src) && !k.startsWith('_'));
  }  

  function showEditorStatus(message, type = 'info') {
    if (!editorStatus) return;
    editorStatus.textContent = message || '';
    editorStatus.className = 'ad-presets-editor__status';
    if (message) editorStatus.classList.add(`ad-presets-editor__status--${type}`);
  }

  // 把 input 和预览绑定（支持 data-preview-default 兜底）
  function linkInputToPreview(inputId, previewId) {
    const input  = document.getElementById(inputId);
    const target = document.getElementById(previewId);
    if (!input || !target) return;

    const sync = () => {
      const v = (input.value || '').trim();
      const fallback = input.dataset.previewDefault || '';
      target.textContent = v || fallback;
    };

    ['input','change'].forEach(evt => input.addEventListener(evt, sync));
    input.addEventListener('preview-refresh', sync);
    sync();
  }

  function updateEditorState() {
    if (!editor) return;
    const hasRow = !!editor.querySelector('.ad-presets-editor__row');
    if (editorEmpty) editorEmpty.style.display = hasRow ? 'none' : 'block';
    if (btnSave) btnSave.disabled = !hasRow;
  }

  function createEditorRow() {
    if (!editor) return null;
    const row = document.createElement('div');
    row.className = 'ad-presets-editor__row';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = '预设名称';
    keyInput.className = 'ad-presets-editor__input ad-presets-editor__input--key';

    const sep = document.createElement('div');
    sep.className = 'ad-presets-viewer__sep';
    sep.textContent = '|';

    const valueWrapper = document.createElement('div');
    valueWrapper.className = 'ad-presets-editor__values';

    const line1 = document.createElement('input');
    line1.type = 'text';
    line1.placeholder = '第一行内容';
    line1.className = 'ad-presets-editor__input ad-presets-editor__input--line';

    const line2 = document.createElement('input');
    line2.type = 'text';
    line2.placeholder = '第二行内容';
    line2.className = 'ad-presets-editor__input ad-presets-editor__input--line';

    valueWrapper.append(line1, line2);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ad-presets-editor__remove';
    removeBtn.textContent = 'x';

    function clearInvalid() {
      if (!editor) return;
      if (row.classList.contains('is-invalid')) {
        row.classList.remove('is-invalid');
        if (!editor.querySelector('.ad-presets-editor__row.is-invalid')) showEditorStatus('');
      }
    }
    [keyInput, line1, line2].forEach(i => i.addEventListener('input', clearInvalid));

    removeBtn.addEventListener('click', () => {
      row.remove();
      if (!editor.querySelector('.ad-presets-editor__row.is-invalid')) showEditorStatus('');
      updateEditorState();
    });

    row.append(keyInput, sep, valueWrapper, removeBtn);
    return row;
  }

function renderPresetViewer(map) {
  if (!viewerBody) return;
  viewerBody.innerHTML = '';

  const keys = (typeof orderedKeys === 'function') ? orderedKeys()
              : Object.keys(map || {});
  if (!keys.length) {
    const empty = document.createElement('div');
    empty.className = 'ad-presets-viewer__empty';
    empty.textContent = '暂无预设数据，刷新或在此新增后保存。';
    viewerBody.appendChild(empty);
    return;
  }

  const frag = document.createDocumentFragment();
  keys.forEach((key, idx) => {
    const value = map[key];

    const row = document.createElement('div');
    row.className = 'ad-presets-viewer__row';

    const keyEl = document.createElement('div');
    keyEl.className = 'ad-presets-viewer__key';
    keyEl.textContent = key;

    const sepEl = document.createElement('div');
    sepEl.className = 'ad-presets-viewer__sep';
    sepEl.textContent = '|';

    const valueEl = document.createElement('div');
    valueEl.className = 'ad-presets-viewer__value';
    const lines = Array.isArray(value) ? value : [value];
    valueEl.textContent = lines.filter(x => x != null).map(String).join('\n');

    // —— 按钮区域容器（不换行）
    const actions = document.createElement('div');
    actions.className = 'ad-presets-viewer__actions';

    // 上移
    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'ad-presets-viewer__move ad-btn';
    upBtn.disabled = (idx === 0);
    upBtn.setAttribute('aria-label', '上移');
    upBtn.innerHTML = '<span class="ad-icon ad-icon--up">‹</span>';
    upBtn.addEventListener('click', () => moveKey(key, -1));

    // 下移
    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'ad-presets-viewer__move ad-btn';
    downBtn.disabled = (idx === keys.length - 1);
    downBtn.setAttribute('aria-label', '下移');
    downBtn.innerHTML = '<span class="ad-icon ad-icon--down">‹</span>';
    downBtn.addEventListener('click', () => moveKey(key, +1));

    // 删除
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'ad-presets-viewer__delete ad-btn';
    delBtn.setAttribute('aria-label', '删除');
    delBtn.textContent = '删除';
    delBtn.addEventListener('click', () => handleDeletePreset(key));

    actions.append(upBtn, downBtn, delBtn);

    // 顺序：key | value | actions（actions 靠右且不换行）
    row.append(keyEl, sepEl, valueEl, actions);
    frag.appendChild(row);
  });

  viewerBody.appendChild(frag);
}

  async function submitPresetMap(nextMap, { statusMessage, successMessage, onSuccess } = {}) {
    if (btnSave) btnSave.disabled = true;
    if (btnAdd)  btnAdd.disabled  = true;
    if (statusMessage) showEditorStatus(statusMessage, 'info');

    const doSave = async () => {
      try {
        const order = Array.isArray(window.defaultAdOrder) ? window.defaultAdOrder : Object.keys(nextMap || {});
        const payload = { data: (nextMap || {}), [ORDER_KEY]: order };

        // ★ 改为 PUT：完整覆写
        const resp = await fetch(API_URL, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error(`服务器返回 ${resp.status}`);

        // 保存完立刻重新拉一次（以服务端为准，避免任何本地残留）
        await fetchPresets(true);

        if (typeof onSuccess === 'function') onSuccess();
        if (successMessage) showEditorStatus(successMessage, 'success');
        return true;
      } catch (e) {
        console.error('保存预设失败', e);
        showEditorStatus(`预设保存失败：${e.message}`, 'error');
        try { window.__uiLog && window.__uiLog('error', `预设保存失败：${e && (e.message || e)}`); } catch (_) {}
        window.__showUIError && window.__showUIError(`预设保存失败：${e.message || '未知错误'}`, { from: 'red2015-preset' });
        return false;
      } finally {
        if (btnAdd)  btnAdd.disabled  = false;
        if (btnSave) btnSave.disabled = false;
        updateEditorState();
      }
    };

    //串行排队执行
    return enqueueSave(doSave);
  }

  async function handleSavePresets() {
    if (!editor) return;
    const rows = Array.from(editor.querySelectorAll('.ad-presets-editor__row'));
    if (!rows.length) {
      showEditorStatus('请先新增至少一条预设再保存。', 'info');
      return;
    }
    const updates = {};
    let hasError = false;
    rows.forEach(row => {
      row.classList.remove('is-invalid');
      const keyInput  = row.querySelector('.ad-presets-editor__input--key');
      const lineInputs= row.querySelectorAll('.ad-presets-editor__input--line');
      const key = (keyInput?.value || '').trim();
      const lines = Array.from(lineInputs).map(i => (i.value || '').trim());
      if (!key || !lines[0]) {
        row.classList.add('is-invalid');
        hasError = true;
        return;
      }
      updates[key] = lines;
    });
    if (hasError) {
      showEditorStatus('请完善高亮的预设信息后再保存。', 'error');
      return;
    }

    const merged = { ...(defaultAdPresets || {}), ...updates };

    // 新 key 追加到顺序末尾
    const order = Array.isArray(window.defaultAdOrder) ? [...window.defaultAdOrder] : Object.keys(merged);
    Object.keys(updates).forEach(k => { if (!order.includes(k)) order.push(k); });
    window.defaultAdOrder = order;

    await submitPresetMap(merged, {
      statusMessage: '正在保存预设…',
      successMessage: '预设保存成功。',
      onSuccess: () => { if (editor) editor.innerHTML = ''; },
    });
  }


  async function handleDeletePreset(key) {
    if (!defaultAdPresets || !Object.prototype.hasOwnProperty.call(defaultAdPresets, key)) return;

    const next = {};
    Object.keys(defaultAdPresets).forEach(k => { if (k !== key) next[k] = defaultAdPresets[k]; });
    const nextOrder = (window.defaultAdOrder || orderedKeys()).filter(k => k !== key);
    window.defaultAdOrder = nextOrder;

    await submitPresetMap(next, {
      statusMessage: `正在删除“${key}”…`,
      successMessage: `“${key}”已删除。`
    });
  }

  function moveKey(key, delta) {
    const arr = [...(window.defaultAdOrder || Object.keys(defaultAdPresets || {}))];
    const i = arr.indexOf(key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= arr.length) return;

    [arr[i], arr[j]] = [arr[j], arr[i]];
    window.defaultAdOrder = arr;

    // ★ 不立刻本地重渲染，避免和 socket/fetch 冲突；直接排队 PUT + 再 fetch
    submitPresetMap(defaultAdPresets, {
      statusMessage: '正在更新顺序…',
      successMessage: '顺序已更新。'
    });
  }


  function handleAddPresetRow() {
    const row = createEditorRow();
    if (!row || !editor) return;
    editor.appendChild(row);
    updateEditorState();
    row.querySelector('.ad-presets-editor__input--key')?.focus();
    showEditorStatus('');
  }

  // ===== red2015：自定义下拉（匹配你的 CSS） =====
  let adSelectUI = null; // 自定义下拉的节点引用

  function get2015Els() {
    selDefault = id2015('input-defaultad');
    inL1       = id2015('input-ad1');
    inL2       = id2015('input-ad2');
    prevL1     = id2015('preview-ad1');
    prevL2     = id2015('preview-ad2');
    return !!(selDefault && inL1 && inL2 && prevL1 && prevL2);
  }

  function ensureAdSelectUI() {
    if (!get2015Els()) return null;
    if (adSelectUI) return adSelectUI;

    // 包装结构：.ad-select（你的 CSS 所需）
    const wrap = document.createElement('div');
    wrap.className = 'ad-select';

    // 隐藏原生 select，用作数据源
    selDefault.classList.add('ad-select__native');
    selDefault.parentNode.insertBefore(wrap, selDefault);
    wrap.appendChild(selDefault);

    // 显示区
    const display = document.createElement('button');
    display.type = 'button';
    display.className = 'ad-select__display';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'ad-select__value';
    const arrow = document.createElement('span');
    arrow.className = 'ad-select__arrow';
    arrow.textContent = '‹';
    display.append(valueSpan, arrow);

    // 下拉面板
    const dropdown = document.createElement('div');
    dropdown.className = 'ad-select__dropdown';
    const list = document.createElement('ul');
    list.className = 'ad-select__list';
    dropdown.appendChild(list);

    wrap.append(display, dropdown);

    // 行为：打开/关闭
    const open  = () => wrap.classList.add('is-open');
    const close = () => wrap.classList.remove('is-open');
    const toggle= () => wrap.classList.toggle('is-open');

    display.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    document.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    adSelectUI = { wrap, display, valueSpan, dropdown, list, open, close };
    return adSelectUI;
  }

  function renderAdSelectList() {
    if (!ensureAdSelectUI()) return;
    const { list, valueSpan } = adSelectUI;
    list.innerHTML = '';

    const keys = orderedKeys();
    const items = [...keys, CUSTOM_VALUE];

    items.forEach(k => {
      const li = document.createElement('li');
      li.className = 'ad-select__option' + (selDefault.value === k ? ' is-selected' : '');
      li.textContent = k;
      li.addEventListener('click', () => {
        selDefault.value = k;
        selDefault.dispatchEvent(new Event('change'));
        adSelectUI.close();
      });
      list.appendChild(li);
    });

    valueSpan.textContent = selDefault.value || CUSTOM_VALUE;
  }

  function applySelectionToPreview() {
    if (!get2015Els()) return;
    const value = selDefault.value;
    if (value === CUSTOM_VALUE) {
      inL1.disabled = false; inL2.disabled = false;
      inL1.value = ''; inL2.value = '';
      prevL1.textContent = ''; prevL2.textContent = '';
    } else {
      const pair = (defaultAdPresets && defaultAdPresets[value]) || ['', ''];
      inL1.disabled = false; inL2.disabled = false;
      inL1.value = pair[0] || '';
      inL2.value = pair[1] || '';
      prevL1.textContent = inL1.value;
      prevL2.textContent = inL2.value;
    }
    // 同步自定义下拉显示
    if (adSelectUI) adSelectUI.valueSpan.textContent = value || CUSTOM_VALUE;

    // 标语输入联动（自定义时生效）
    if (!inL1.__bound) {
      inL1.addEventListener('input', () => { prevL1.textContent = inL1.value; });
      inL1.__bound = true;
    }
    if (!inL2.__bound) {
      inL2.addEventListener('input', () => { prevL2.textContent = inL2.value; });
      inL2.__bound = true;
    }
    
  }

  function populate2015Options(preserveSelection = false) {
    if (!get2015Els()) return;

    const prevValue = selDefault.value;
    selDefault.innerHTML = '';

    const keys = orderedKeys();

    // 渲染所有预设 key（有序）
    keys.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k;
      selDefault.appendChild(opt);
      selDefault && selDefault.dispatchEvent(new Event('change'));
    });

    // 追加“自定义”
    const optCustom = document.createElement('option');
    optCustom.value = CUSTOM_VALUE;
    optCustom.textContent = CUSTOM_VALUE;
    selDefault.appendChild(optCustom);

    const values = new Set(Array.from(selDefault.options).map(o => o.value));
    if (preserveSelection && prevValue && values.has(prevValue)) {
      selDefault.value = prevValue;
    } else {
      const first = keys[0];
      selDefault.value = first || CUSTOM_VALUE;
    }

    // 自定义下拉列表 & 预览同步
    ensureAdSelectUI();
    renderAdSelectList();
    applySelectionToPreview();
  }

  function bind2015EventsOnce() {
    if (!get2015Els()) return;

    // 自定义下拉构建 + 列表渲染
    ensureAdSelectUI();
    renderAdSelectList();

    // 原生 select 事件（作为单一数据源）
    if (!selDefault.__bound) {
      selDefault.addEventListener('change', () => {
        // 更新自定义下拉的选中态
        renderAdSelectList();
        // 更新预览文字
        applySelectionToPreview();
      });
      // 鼠标进入/点击时刷新最新预设（若后端数据有变）
      selDefault.addEventListener('mouseenter', () => fetchPresets(true));
      selDefault.addEventListener('click',      () => fetchPresets(true));
      selDefault.__bound = true;
    }
  }

  // ===== 预设获取 / 初始化 =====
  async function fetchPresets(preserveSelection = false) {
    try {
      const resp = await fetch(API_URL);
      const raw = await resp.json();

      let map = {}, order = [];

      if (Array.isArray(raw)) {
        map = Object.fromEntries(raw.map(it => [it.key, it.lines]));
        order = raw.map(it => it.key);
      } else if (raw && typeof raw === 'object') {
        if (raw.data && typeof raw.data === 'object') {
          map = { ...raw.data };
          order = Array.isArray(raw[ORDER_KEY]) ? raw[ORDER_KEY] : [];
        } else {
          map = { ...raw };
          order = Array.isArray(raw[ORDER_KEY]) ? raw[ORDER_KEY] : [];
          delete map[ORDER_KEY];
        }
      }

      defaultAdPresets = map;
      window.defaultAdOrder = (order.length ? order : Object.keys(map))
        .filter(k => k in map);

      emitPresetsUpdated();
      populate2015Options(!!preserveSelection);
      renderPresetViewer(defaultAdPresets);
    } catch (e) {
      console.warn('预设加载失败，沿用内存数据。', e);
      populate2015Options(!!preserveSelection);
      renderPresetViewer(defaultAdPresets);
    }
  }

  // ===== 设置页事件 =====
  btnAdd?.addEventListener('click', handleAddPresetRow);
  btnSave?.addEventListener('click', handleSavePresets);
  updateEditorState();

  // ===== 启动 =====
  document.addEventListener('DOMContentLoaded', () => {
    linkInputToPreview('input-name',   'preview-name');
    linkInputToPreview('input-id',     'preview-id');
    linkInputToPreview('input-idtype', 'preview-idtype');
    linkInputToPreview('input-station', 'preview-station');
    linkInputToPreview('input-classnum', 'preview-classnum');
      // ★ 初次根据勾选状态应用一次默认值
      // （如果 user-profile 还没回来，等它回来时会再次应用）
      const tryApply = () => {
        if (typeof applyPersonalDefaultsToPreview === 'function') {
          applyPersonalDefaultsToPreview();
        }
      };
      tryApply();
    // 2015 边上的小样式（可选）
    if (root2015) {
      const previewSide = document.querySelector('.page.red2015 > div');
      previewSide?.classList.add('preview-side');
      ['input-seanotice', 'notice', 'input-defaultad'].forEach(id => {
        const el = id2015(id);
        if (el?.parentElement) el.parentElement.classList.add('preview-side-field');
      });
    }

    // 用现有内存数据先渲染
    populate2015Options(false);
    renderPresetViewer(defaultAdPresets);

    // 再尝试拉取服务器最新预设
    fetchPresets(false);

    // 绑定 2015 事件
    bind2015EventsOnce();

    // 同步 2015 的 datalist（座位/签证，有就填）
    const seatTypeDatalist = id2015('seattypes');
    if (seatTypeDatalist && Array.isArray(window.seatTypeList)) {
      const frag = document.createDocumentFragment();
      window.seatTypeList.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        frag.appendChild(opt);
      });
      seatTypeDatalist.textContent = '';
      seatTypeDatalist.appendChild(frag);
    }

    const visaTypeDatalist = id2015('visatypes');
    if (visaTypeDatalist && Array.isArray(window.visaTypeList)) {
      const frag = document.createDocumentFragment();
      window.visaTypeList.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        frag.appendChild(opt);
      });
      visaTypeDatalist.textContent = '';
      visaTypeDatalist.appendChild(frag);
    }

    const seatTypeDatalistold = id2009('seattypesold');
    if (seatTypeDatalistold && Array.isArray(window.seatTypeListold)) {
      const frag = document.createDocumentFragment();
      window.seatTypeListold.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        frag.appendChild(opt);
      });
      seatTypeDatalistold.textContent = '';
      seatTypeDatalistold.appendChild(frag);
    }
  });
})();
})();

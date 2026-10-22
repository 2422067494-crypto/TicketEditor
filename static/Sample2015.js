(() => {
  const root = document.querySelector('.page.red2015');
  if (!root) return;

  const $id = (id) => root.querySelector('#' + id);
  const on  = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // --- 小工具：一对一映射（textContent） ---
  const map = (inId, outId) => {
    const i = $id(inId), o = $id(outId);
    const sync = () => { if (o) o.textContent = i?.value || ''; };
    on(i, 'input', sync); sync();
  };

  // --- 小工具：保留空白（<span white-space:pre> 包裹） ---
  const mapPre = (inId, outId) => {
    const i = $id(inId), o = $id(outId);
    const sync = () => {
      const v = i?.value || '';
      if (o) o.innerHTML = v ? `<span style="white-space:pre;">${v}</span>` : '';
    };
    on(i, 'input', sync); sync();
  };
  window.addEventListener('DOMContentLoaded', () => {
    // ---------- 1) 简单字段：一对一镜像 ----------
    map('input-traincode', 'preview-traincode');
    map('input-id',        'preview-id');
    map('input-name',      'preview-name');
    map('input-purpose',   'preview-purpose');
    map('input-check',     'preview-check');
    map('input-topnum',    'preview-topnum');
    map('input-botnum',    'preview-botnum');
    map('input-classnum',  'preview-classnum');
    map('input-ad1',       'preview-ad1');
    map('input-ad2',       'preview-ad2');

    // ---------- 2) 金额：纯数值 + “元”，空则不显示 ----------
    (() => {
      const i = $id('input-price'), o = $id('preview-price'), rmb = $id('preview-rmb');
      const sync = () => {
        const raw = i?.value || '';
        const val = raw.replace(/[^\d.]/g,'');
        if (i && raw !== val) i.value = val;
        if (!o) return;
        if (val) {
          o.innerHTML = `${val}<span style="font-family:'寒蝉端黑宋','regular';font-size:12px;margin-left:2px;position:relative;top:0;">元</span>`;
          if (rmb) rmb.style.display = 'inline';
        } else {
          o.textContent = '';
          if (rmb) rmb.style.display = 'none';
        }
      };
      on(i,'input',sync); sync();
    })();

    // ---------- 3) 证件类型 + 发售站（拼接） ----------
(() => {
  const preview = $id('preview-idtype');
  const inType  = $id('input-idtype');
  const inSta   = $id('input-station');
  const render  = () => {
    if (!preview) return;
    const a = (inType?.value || inType?.dataset.previewDefault || '').trim();
    const b = (inSta?.value  || inSta?.dataset.previewDefault  || '').trim();

    const idHTML = a
      ? `<span style="letter-spacing:2px;display:inline-block;transform:scaleX(0.85);font-family:'Nom Na Tong',sans-serif;">${a}</span>`
      : '';

    const stHTML = b
      ? `<span style="position:relative;top:0px;font-size:11px;letter-spacing:0.5px;font-family:'思源黑体 CN',sans-serif;white-space:pre;">${b}</span>`
      : '';

    if (a && b)      preview.innerHTML = `${idHTML}\u00A0\u00A0${stHTML}`;
    else if (a)      preview.innerHTML = idHTML;
    else if (b)      preview.innerHTML = `&nbsp;${stHTML}`;
    else             preview.textContent = '';
  };
  on(inType,'input',render);
  on(inSta,'input',render);
  render();
})();

    // ---------- 4) 通票 / 普通有效期（checkbox 只控制“显示哪种预览”） ----------
(() => {
  mapPre('input-visa', 'preview-visa'); // 签证文本：保留空白
  const preview = $id('preview-limit');
  const input   = $id('input-limit');
  const tong    = $id('tongpiao');
  const v1 = $id('via-part1'), v2 = $id('via-part2'), v3 = $id('via-part3'), v4 = $id('via-part4');

  const render = () => {
    if (!preview) return;

    if (tong?.checked) {
      const part1 = v1?.value || '';
      const part2 = v2?.value || '';
      const part3 = v3?.value || '';
      const part4 = v4?.value || '';

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

      preview.innerHTML = `
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
    } else {
      const v = input?.value || '';
      preview.innerHTML = v ? `<span style="white-space:pre;">${v}</span>` : '';
    }

    preview.style.whiteSpace = 'nowrap';
  };

  on(tong, 'change', render);
  on(input, 'input', render);
  [v1, v2, v3, v4].forEach(el => on(el, 'input', render));
  render();
})();


    // ---------- 5) 过海提示 / 边框显示（checkbox 只控显示） ----------
    (() => {
      const cb = $id('seanotice'), inp = $id('input-seanotice'), prev = $id('preview-seanotice');
      const sync = () => {
        if (!prev) return;
        if (cb?.checked) {
          prev.textContent = inp?.value || inp?.placeholder || '';
          prev.style.display = 'block';
        } else {
          prev.textContent = '';
          prev.style.display = 'none';
        }
      };
      on(cb,'change',sync); on(inp,'input',sync); sync();
    })();

    (() => {
      const cb = $id('toggle-border'), img = $id('border-img');
      const sync = () => { if (img) img.style.display = cb?.checked ? 'block' : 'none'; };
      on(cb,'change',sync); sync();
    })();

    // ---------- 6) 备注（circle 不变） ----------
(() => {
  const i = $id('notice'),
        o = $id('preview-notice'),
        c = $id('circle');

  // 单行，避免自带换行/空格
  const S = "display:inline-flex;justify-content:center;align-items:center;width:15px;height:15px;border:1.5px solid #000;border-radius:50%;margin:0 2px;font-size:11.5px;font-family:'寒蝉端黑宋',sans-serif;box-sizing:border-box;";

  const sync = () => {
    if (!o || !i) return;
    const raw = (i.value || '').trim();
    if (!raw) { o.innerHTML = ''; return; }

    if (!c?.checked) {
      o.innerHTML = `<span style="font-size:11px;font-family:'寒蝉端黑宋',sans-serif;">${raw}</span>`;
    } else {
      // DOM 拼装，避免任何额外空白
      o.textContent = '';
      const frag = document.createDocumentFragment();
      for (const ch of raw.replace(/\s+/g, '')) {
        const outer = document.createElement('span');
        outer.style.cssText = S;
        const inner = document.createElement('span');
        inner.style.cssText = 'position:relative;top:-0.7px;line-height:1;';
        inner.textContent = ch;
        outer.appendChild(inner);
        frag.appendChild(outer);
      }
      o.appendChild(frag);
    }
  };

  on(i, 'input',  sync);
  on(c, 'change', sync);
  sync();
})();

    // ---------- 7) 日期切片（YYYYMMDDhhmm） ----------
    (() => {
      const i=$id('input-date'), img=$id('date-img');
      const p1=$id('date-part1'), p2=$id('date-part2'), p3=$id('date-part3'), p4=$id('date-part4'), p5=$id('date-part5');
      const sync=()=> {
        const raw=(i?.value||'').replace(/\D/g,'').slice(0,12);
        if (img) img.style.display = raw ? 'block' : 'none';
        if (p1) p1.textContent = raw.slice(0,4);
        if (p2) p2.textContent = raw.slice(4,6);
        if (p3) p3.textContent = raw.slice(6,8);
        if (p4) p4.textContent = raw.slice(8,10);
        if (p5) p5.textContent = raw.slice(10,12);
      };
      on(i,'input',sync); sync();
    })();

    // ---------- 8) 席别 + 类型镜像 + fallback ----------
(() => {
  // 安全转义
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // 解析器（含：同时含“座”“卧”按“座”处理；7位座位号把第7位放到“号”后且下移；“号”放大）
  function parseSeat(raw, seatType) {
    const t = String(seatType || '');
    const hasZuo = t.includes('座');
    const hasWo = t.includes('卧') || t.includes('一人软包');
    const both = hasZuo && hasWo;
    const unknown = !hasZuo && !hasWo;

    if (unknown) {
      return { view: [{ text: raw || '', font: '寒蝉端黑宋', size: 14 }], error: false };
    }

    const LABEL = { font: '寒蝉端黑宋', size: 15, style: 'position:relative; top:1.2px;' };

    // —— 卧铺
    if (hasWo && !both) {
      const hasPlus = String(raw || '').startsWith('+');
      const normalRe = /^\d{2}[012][0-9A-Za-z]{3}[012]$/;
      const plusRe = /^\+[0-9][012][0-9A-Za-z]{3}[012]$/;

      if (!(normalRe.test(raw) || plusRe.test(raw))) {
        return { view: [{ text: raw || '', font: '寒蝉端黑宋', size: 14, color: '#d00' }], error: true };
      }

      let car, levelCode, bedNum, bedTypeCode;
      if (hasPlus) {
        car = raw[1];
        levelCode = raw[2];
        bedNum = raw.slice(3, 6);
        bedTypeCode = raw[6];
      } else {
        car = raw.slice(0, 2);
        levelCode = raw[2];
        bedNum = raw.slice(3, 6);
        bedTypeCode = raw[6];
      }

      const levelText = levelCode === '1' ? '下' : levelCode === '2' ? '上' : '';
      const bedTypeText =
        bedTypeCode === '0'
          ? '下铺'
          : bedTypeCode === '1'
          ? '中铺'
          : bedTypeCode === '2'
          ? '上铺'
          : '';

      const view = [];
      if (hasPlus) view.push({ text: '加', ...LABEL });
      view.push({ text: car, font: 'Btp', size: 16 });
      view.push({ text: '车', font: '寒蝉端黑宋', size: 11, style: 'position:relative; top:0px;' });
      if (levelText) view.push({ text: levelText, font: '寒蝉端黑宋', size: 15, style: 'position:relative; top:0.5px;' });
      view.push({ text: bedNum, font: 'Btp', size: 16 });
      view.push({ text: '号', ...LABEL });
      view.push({ text: bedTypeText, ...LABEL });

      return { view, error: false };
    }

    // —— 座席（含“座”“卧”同时存在也走这里）
    if (hasZuo || both) {
      const hasPlus = String(raw || '').startsWith('+');

      // 原规则：^\d{2}[012][0-9A-Za-z]{2,4}$
      // 加上硬卧那套 + 规则：+ + 1位车号 + 层码 + (2~4位座号)
      const normalRe = /^\d{2}[012][0-9A-Za-z]{2,4}$/;
      const plusRe = /^\+[0-9][012][0-9A-Za-z]{2,4}$/;

      if (!(normalRe.test(raw || '') || plusRe.test(raw || ''))) {
        return { view: [{ text: raw || '', font: '寒蝉端黑宋', size: 14, color: '#d00' }], error: true };
      }

      let car, levelCode, seatAll;
      if (hasPlus) {
        car = raw[1];      // 1 位车号
        levelCode = raw[2];
        seatAll = raw.slice(3); // 2~4 位
      } else {
        car = raw.slice(0, 2); // 2 位车号
        levelCode = raw[2];
        seatAll = raw.slice(3); // 2~4 位
      }

      const levelText = levelCode === '1' ? '下' : levelCode === '2' ? '上' : '';

      // 7位座位号(= seatAll 长度 >= 4) 的规则：第4位挪到“号”后并下移
      const mainSeat = seatAll.length >= 4 ? seatAll.slice(0, 3) : seatAll;
      const extra = seatAll.length >= 4 ? seatAll.slice(3) : '';
      const hasExtra = !!extra;

      const view = [];
      if (hasPlus) view.push({ text: '加', ...LABEL });

      view.push({ text: car, font: 'Btp', size: 16 });
      view.push({ text: '车', font: '寒蝉端黑宋', size: 11, style: 'position:relative; top:-0.5px;' });
      if (levelText) view.push({ text: levelText, font: '寒蝉端黑宋', size: 15, style: 'position:relative; top:0.7px;' });

      const m = mainSeat.match(/^\d+/);
      if (m) {
        view.push({ text: m[0], font: 'Btp', size: 16 });
        const tail = mainSeat.slice(m[0].length);
        if (tail) view.push({ text: tail, font: '寒蝉端黑宋', size: 14 });
      } else {
        view.push({ text: mainSeat, font: '寒蝉端黑宋', size: 14 });
      }

      view.push({
        text: '号',
        font: '寒蝉端黑宋',
        size: hasExtra ? 15 : 11,
        style: hasExtra ? 'position:relative; top:0.7px;' : 'position:relative; top:-0.5px;'
      });

      if (hasExtra) view.push({ text: extra, font: 'Btp', size: 16, style: 'position:relative; top:1.4px;' });

      return { view, error: false };
    }

    // —— 其他：原样
    return { view: [{ text: raw || '', font: '寒蝉端黑宋', size: 14 }], error: false };
  }

  // 实际渲染到页面
  function renderSeat() {
    const seatInput = document.getElementById('input-seat');
    const typeInput = document.getElementById('input-seattype');
    const outBox = document.getElementById('preview-seat');
    const outFB = document.getElementById('preview-seat-fallback');
    const outType = document.getElementById('preview-seattype');

    if (!outBox) return;

    const raw = seatInput?.value ?? '';
    const type = typeInput?.value ?? '';

    // 同步显示席别类型文本
    if (outType) outType.textContent = type;

    const res = parseSeat(raw, type);

    // 错误或空 → 走 fallback
    if (!raw) {
      outBox.innerHTML = '';
      if (outFB) {
        outFB.style.display = 'none';
        outFB.textContent = '';
      }
      return;
    }
    if (!res || res.error) {
      outBox.innerHTML = '';
      if (outFB) {
        outFB.style.display = '';
        outFB.textContent = raw;
      }
      return;
    }

    // 渲染 view
    const html = (res.view || [])
      .map((p) => {
        const font = p.font || '寒蝉端黑宋';
        const size = p.size ? `font-size:${p.size}px;` : '';
        const col = p.color ? `color:${p.color};` : '';
        const sty = p.style ? p.style : '';
        return `<span style="font-family:'${esc(font)}','regular';${size}${col}${sty ? (sty.endsWith(';') ? sty : sty + ';') : ''}">${esc(p.text)}</span>`;
      })
      .join('');

    outBox.innerHTML = html;
    if (outFB) {
      outFB.style.display = 'none';
      outFB.textContent = '';
    }
  }

  // 监听输入与“预览刷新”事件
  const bind = (id, ev = 'input') => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(ev, renderSeat);
  };
  bind('input-seat');
  bind('input-seattype');
  document.addEventListener('preview-refresh', renderSeat);
  window.addEventListener('load', renderSeat);

  // 导出（若其他脚本需要）
  window.SeatFormat = { parseSeat, renderSeat };
})();

    // ---------- 9) 站名（排版/“站”字定位） + 拼音纯镜像（无自动生成） ----------
    (() => {
      const inFrom=$id('input-from'), inTo=$id('input-to');
      const inFromPy=$id('input-from-pinyin'), inToPy=$id('input-to-pinyin');
      const prevFrom=$id('preview-from'), prevTo=$id('preview-to');
      const prevFromPy=$id('preview-FromPinyin'), prevToPy=$id('preview-ToPinyin');
      const prevFromZhan=$id('preview-from-zhan'), prevToZhan=$id('preview-to-zhan');

      const FROM_ZHAN_LEFT = { 1:84, 2:84, 3:98, 4:104, 5:115 };
      const TO_ZHAN_LEFT   = { 1:84, 2:84, 3:98, 4:104, 5:115 };
      const FROM_BASE_LEFT = 11, TO_BASE_LEFT = 210;

      const applyStation = (elem, value, zhanElem, zMap, baseLeft) => {
        if (!elem) return;
        const val = String(value||'');
        let len = Math.min(val.length, 5);
        let spacing='0px'; if (len===2) spacing='23px'; else if (len===3) spacing='4px';
        let leftOffset = (len===2) ? 12 : 0;
        elem.innerHTML = val.replace(/ /g,'&nbsp;');
        elem.style.letterSpacing = spacing;
        elem.style.left = (baseLeft + leftOffset) + 'px';
        if (zhanElem) {
          if (val) {
            zhanElem.style.display=''; zhanElem.textContent='站';
            const zl = zMap[len] || zMap[5] || 0;
            zhanElem.style.left = (baseLeft + zl + leftOffset) + 'px';
          } else { zhanElem.style.display='none'; zhanElem.textContent=''; }
        }
      };

      const syncFrom = () => {
        const name=(inFrom?.value||'').trim();
        applyStation(prevFrom, name, prevFromZhan, FROM_ZHAN_LEFT, FROM_BASE_LEFT);
      };
      const syncTo = () => {
        const name=(inTo?.value||'').trim();
        applyStation(prevTo, name, prevToZhan, TO_ZHAN_LEFT, TO_BASE_LEFT);
      };
      const syncFromPy = () => { if (prevFromPy) prevFromPy.textContent = inFromPy?.value || ''; };
      const syncToPy   = () => { if (prevToPy)   prevToPy.textContent   = inToPy?.value   || ''; };

      on(inFrom,'input',syncFrom); on(inTo,'input',syncTo);
      on(inFromPy,'input',syncFromPy); on(inToPy,'input',syncToPy);
      syncFrom(); syncTo(); syncFromPy(); syncToPy();
    })();

    // ---------- 10) 二维码：真实 144 位（ticket.js 按票面字段编码） ----------
    (() => {
      const preview = document.getElementById('preview'); // 整个票面容器
      if (!preview) return;
      const boxId = 'preview-qrcode';
      let box = document.getElementById(boxId);
      if (!box) { box = document.createElement('div'); box.id = boxId; preview.appendChild(box); }
      Object.assign(box.style, {
        position:'absolute', right:'26px', bottom:'16px', width:'76px', height:'76px',
        overflow:'visible', background:'transparent'
      });

      const chk = document.getElementById('show-qrcode');
      const enabled = () => !chk || !!chk.checked;
      const val = (id) => (($id(id) && $id(id).value) || '').trim();

      // 站名 -> 电报码（stations.js 的 window.STATION_PAIRS）；也接受直接填 3 字母电报码
      let _stMap = null;
      const stationCode = (name) => {
        if (!_stMap) {
          _stMap = Object.create(null);
          String(window.STATION_PAIRS || '').split('|').forEach(pair => {
            const i = pair.indexOf(':');
            if (i > 0) _stMap[pair.slice(0, i)] = pair.slice(i + 1);
          });
        }
        const s = String(name == null ? '' : name).trim();
        if (!s) return '';
        if (/^[A-Za-z]{3}$/.test(s)) return s.toUpperCase();
        const hit = _stMap[s] || _stMap[s.replace(/站$/, '')];
        if (hit) return hit;
        // 虚拟车站：查不到就给一个稳定的假三字码（否则会变 AAA，和空经由相等会误判退票费）
        return (window.TicketQR && window.TicketQR.fakeStationCode)
          ? window.TicketQR.fakeStationCode(s.replace(/站$/, '') || s) : '';
      };

      // 通票里“至X站”的 X 可能带“至/站”字样，先剥掉再查码
      const stationNameOf = (v) =>
        String(v == null ? '' : v).trim().replace(/^至\s*/, '').replace(/站\s*$/, '').trim();

      const codeOfStation = (v) => {
        const name = stationNameOf(v);
        if (!name) return '';
        return stationCode(name) || (/^[A-Za-z]{3}$/.test(name) ? name.toUpperCase() : '');
      };

      // 结账年 = 乘车日 + 结账 MMDD 反推（与解码端跨年 ±1 修正互逆）
      const settleYearFor = (trip, md) => {
        const y = +trip.slice(0, 4);
        const a = (+md.slice(0, 2)) * 31 + (+md.slice(2, 4));
        const b = (+trip.slice(4, 6)) * 31 + (+trip.slice(6, 8));
        if (b < a && (371 - a) + b < 301) return y - 1;
        if (a < b && (a + 371) - b < 31) return y + 1;
        return y;
      };

      // 事由里的“学/孩/军…” -> 票种（01-17）
      const TT_CHARS = ' 孩学军 探半孩团兵红返卧团农助令';
      const ticketTypeFromText = (s) => {
        s = String(s || '').trim();
        if (!s) return 1;
        if (s.charAt(0) === '全') return 1;
        const i = TT_CHARS.indexOf(s.charAt(0));
        if (i > 0) return i + 1;
        let hit = 0, best = Infinity;
        for (let k = 1; k < TT_CHARS.length; k++) {
          const ch = TT_CHARS.charAt(k);
          if (!ch.trim()) continue;
          const pos = s.indexOf(ch);
          if (pos >= 0 && pos < best) { best = pos; hit = k; }
        }
        return hit > 0 ? hit + 1 : 1;
      };

      // 本软件水印：码内 47:48 固定 Z1、第 144 位固定 1（不影响票面，可用来识别来源）
      const QR_MARK = (window.TicketQR && window.TicketQR.WATERMARK) || { visa: 'Z', group: 1, spare: '1' };

      /** 票面输入框 -> 144 位；字段缺失/乱输由 TicketQR 内部按 0 占位。
       *  idType 来自 AP 列（批量）或设置页下拉，不再用 input-idtype */
      const compile = (idType) => {
        if (!window.TicketQR) return null;
        const stamp = val('input-date').replace(/\D/g, '');
        const bot = val('input-botnum').replace(/\s/g, '').toUpperCase();
        const top = val('input-topnum').replace(/\s/g, '').toUpperCase();
        const hit = /([A-Z]\d{6})$/.exec(top) || /([A-Z]\d{6})$/.exec(bot);
        const seat = val('input-seat');
        const md = /\d{14}/.test(bot) ? bot.slice(10, 14) : '';
        const settleYear = (stamp.length >= 8 && md) ? settleYearFor(stamp.slice(0, 8), md) : 0;

        const limit = val('input-limit');          // 限乘/有效期
        const visa = val('input-visa');            // 签证
        const purpose = val('input-purpose');      // 事由（也用来识别 学/孩/军）

        // 中转标志：限乘含“随原票使用”，或签证含“中转”
        const transit = (limit.indexOf('随原票使用') >= 0 || /中转/.test(visa)) ? 1 : 0;

        // 中转签证票的票价是 00000（原库的渲染条件）
        let price = val('input-price');
        if (visa.indexOf('中转签证') >= 0) price = '0';

        // ---- 通票：票面大字站是“经由站”，「至X站」的 X 才是终到站 ----
        // 码里 to/via 与票面正好相反：to = X，via = 大字站（与解码端互换后一致）
        const viaEnd = stationNameOf(val('via-part3'));
        const viaBox = $id('via-wrapper');
        const viaVisible = !!(viaBox && viaBox.style.display !== 'none');
        const tongpiao = !!($id('tongpiao') && $id('tongpiao').checked) ||
                         (viaVisible && viaEnd !== '');
        let toCode = stationCode(val('input-to'));
        let viaCode = '';
        if (tongpiao && viaEnd) {
          const endCode = codeOfStation(viaEnd);
          if (endCode) { viaCode = toCode; toCode = endCode; }
        }

        return window.TicketQR.encode({
          ticket_no: hit ? hit[1] : top,
          from_code: stationCode(val('input-from')),
          to_code: toCode,
          via_code: viaCode,
          train: val('input-traincode'),
          trip: stamp.length >= 8 ? stamp.slice(0,4) + '-' + stamp.slice(4,6) + '-' + stamp.slice(6,8) : '',
          time: stamp.length >= 12 ? stamp.slice(8,10) + ':' + stamp.slice(10,12) : '',
          coach: (seat.split(/[\s-]/)[0] || ''),
          seat_type: val('input-seattype'),
          seat: seat,
          price: price,
          settle: md ? settleYear + '-' + md.slice(0,2) + '-' + md.slice(2,4) : '',
          office: bot.slice(0, 5),
          pickup_type: bot.slice(5, 7),
          machine: bot.slice(7, 10),
          id_type: idType,
          // 只认 AQ 列：票面那串证件号是带 **** 打码的，编进码里会被当成符号填 0
          id_no: batchIdNo(),
          name: val('input-name'),
          ticket_type: ticketTypeFromText(purpose),
          transit: transit,
          visa: QR_MARK.visa, group: QR_MARK.group, spare: QR_MARK.spare
        });
      };

      // AQ 列：逼真二维码用的完整证件号（在 .page 外层，用 document 找）
      const batchIdNo = () => {
        const el = document.getElementById('realistic-qr-idno');
        return el ? String(el.value || '').trim() : '';
      };

      // 批量渲染的“逼真二维码”判定：AO 列 = T，且 AP 列是已知的两位简码
      const realisticConfig = () => {
        const f = document.getElementById('realistic-qr');
        const t = document.getElementById('realistic-qr-idtype');
        const flag = f ? String(f.value || '').trim().toUpperCase() : '';
        const code = t ? String(t.value || '').trim().toUpperCase() : '';
        const codes = (window.TicketQR && window.TicketQR.ID_TYPE_CODES) || {};
        if (flag === 'T' && /^[A-Z]{2}$/.test(code) && codes[code]) {
          return { on: true, code: code };
        }
        return { on: false, code: '' };
      };

      // 未启用时的老版本：下票号+车次+日期+席位 补 1 到 30 位
      const legacyPayload = () => {
        const t = id => {
          const el = document.getElementById(id);
          return el ? String(el.textContent || '').trim() : '';
        };
        let s = t('preview-botnum') + t('preview-traincode') +
          t('date-part1') + t('date-part2') + t('date-part3') +
          t('date-part4') + t('date-part5') + t('preview-seat');
        if (s.length < 30) s = s.padEnd(30, '1');
        return s;
      };

      const paint = (text, mode) => {
        const qr = qrcode(0, 'M');
        qr.addData(text, mode);
        qr.make();
        const cell = 1, margin = 1, n = qr.getModuleCount(), size = n * cell + margin * 2;
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`;
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c))
          svg += `<rect x="${c*cell+margin}" y="${r*cell+margin}" width="${cell}" height="${cell}" fill="#000"/>`;
        svg += '</svg>';
        box.innerHTML = svg;
        box.dataset.payload = text;
      };

      let timer = 0;
      const render = () => {
        if (!enabled()) { box.innerHTML = ''; box.dataset.payload = ''; return; }
        if (typeof qrcode !== 'function') { box.innerHTML = ''; return; }
        const cfg = realisticConfig();
        if (!cfg.on) {                       // AO/AP 不合法 -> 老版本
          paint(legacyPayload(), 'Byte');
          return;
        }
        let code = null;
        try { code = compile(cfg.code); } catch (err) { console.warn('[QR] 编码异常：', err && err.message); }
        if (!code) { paint(legacyPayload(), 'Byte'); return; }
        paint(code, 'Numeric');
      };
      const schedule = () => {
        if (timer) return;
        timer = setTimeout(() => { timer = 0; render(); }, 30);
      };

      // 输入框变化 -> 重算
      ['input-topnum','input-botnum','input-traincode','input-date','input-seat','input-seattype',
       'input-price','input-from','input-to','input-name','input-id','input-idtype',
       'input-limit','input-visa','input-purpose'
      ].forEach(id => { const el = $id(id); on(el, 'input', schedule); on(el, 'change', schedule); });

      // 批量用的两个字段在 .page 容器之外，要用 document 找
      ['realistic-qr', 'realistic-qr-idtype', 'realistic-qr-idno'].forEach(id => {
        const el = document.getElementById(id);
        on(el, 'input', schedule);
        on(el, 'change', schedule);
      });

      // 票面文本被改动（批量填充等）也重算；忽略二维码自身引起的变化，避免自激
      const obs = new MutationObserver((records) => {
        for (let i = 0; i < records.length; i++) {
          const t = records[i].target;
          if (t === box || box.contains(t)) continue;
          schedule();
          return;
        }
      });
      obs.observe(preview, { childList: true, characterData: true, subtree: true });

      on(chk, 'change', render);
      render();
    })();

    // ---------- 11) datalist 注入（若有全局数组就灌入） ----------
    (() => {
      const fill = (listId, arr) => {
        const dl = document.getElementById(listId);
        if (!dl || !Array.isArray(arr)) return;
        const frag = document.createDocumentFragment();
        arr.forEach(v => { const opt=document.createElement('option'); opt.value=String(v); frag.appendChild(opt); });
        dl.textContent=''; dl.appendChild(frag);
      };
      fill('seattypes',    window.seatTypeList);
      fill('visatypes',    window.visaTypeList);
      fill('seattypesold', window.seatTypeListold);
    })();
  });
})();

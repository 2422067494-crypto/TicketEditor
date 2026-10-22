(function () {
  // ========================= 基址 =========================
  const DATA_BASE = window.location.origin;   // data.py 的端口

  // ---- 分析服务器端口获取（延迟求值，避免时序问题） ----
  async function getAnalysisBase() {
    if (window.__TE_PORTS?.analysis) {
      return `http://127.0.0.1:${window.__TE_PORTS.analysis}`;
    }
    if (window.electronAPI?.getAnalysisPort) {
      try {
        const port = await window.electronAPI.getAnalysisPort();
        return `http://127.0.0.1:${port}`;
      } catch (e) { /* 忽略 */ }
    }
    const url = new URL(window.location.href);
    const qPort = url.searchParams.get('analysis_port');
    if (qPort) {
      return `http://127.0.0.1:${qPort}`;
    }
    // 端口获取失败属于预期外错误：用弹窗提示（保留 throw 供上层 catch）
    if (window.__showUIError) {
      window.__showUIError('无法连接到分析服务器！\n请检查程序是否运行正常，或尝试重启应用。', { from: 'getAnalysisBase' });
    } else {
      alert('无法连接到分析服务器！\n请检查程序是否运行正常，或尝试重启应用。');
    }
    throw new Error('无法获取分析服务器端口');
  }

  const CRED = 'include';
  const URL_PROFILE = DATA_BASE + '/api/user-profile';

  // ========================= 统一提示 / 错误弹窗 =========================
  // 两者外观完全一致（复用同一普通提示弹窗），仅关闭行为不同：
  //   错误 → 常驻，点击任意处关闭
  //   提示 → 自动关闭
  function showUploadError(msg) {
    if (window.__showUIError) {
      window.__showUIError(msg, { from: 'showUploadError' });
    } else if (window.__exportModal?.openExportModal) {
      // 兜底：无统一 API 时手动常驻 + 点击任意处关闭
      window.__exportModal.openExportModal(msg);
      const close = () => {
        window.__exportModal.closeExportModal();
        window.removeEventListener('pointerdown', close, true);
        window.removeEventListener('keydown', close, true);
      };
      setTimeout(() => {
        window.addEventListener('pointerdown', close, true);
        window.addEventListener('keydown', close, true);
      }, 0);
    } else {
      alert(msg);
    }
  }

  // 普通提示：自动关闭（默认 3 秒）
  function showUITip(msg, duration = 3000) {
    if (window.__showUITip) return window.__showUITip(msg, { duration });
    if (window.__exportModal?.openExportModal) {
      window.__exportModal.openExportModal(msg);
      setTimeout(() => window.__exportModal.closeExportModal(), duration);
    }
  }

  // ========================= 输入引用 =========================
  let $name   = document.getElementById('input-defaultname');
  let $pid    = document.getElementById('input-defaultid');
  let $idType = document.getElementById('input-defaultidtype');
  let $station = document.getElementById('input-defaultstation');
  let $classnum = document.getElementById('input-defaultclassnum');

  let profileCache = { name: '', id: '', idType: '', station: '', classnum: '' };

  // ========================= 工具 & 默认填充 =========================
  function normalizeOffice(s) {
    return String(s || '').trim().replace(/售$/, '');
  }

  function applyPersonalDefaultsToPreview() {
    const chk = document.getElementById('activepersonaldefault');
    const useDefaults = !!(chk && chk.checked);

    const $name2     = document.getElementById('input-name');
    const $pid2      = document.getElementById('input-id');
    const $idType2   = document.getElementById('input-idtype');
    const $station2  = document.getElementById('input-station');
    const $classnum2 = document.getElementById('input-classnum');

    const syncPlaceholder = (el, defVal) => {
      if (!el) return;
      if (el.dataset.placeholderOrig === undefined) {
        el.dataset.placeholderOrig = el.getAttribute('placeholder') || '';
      }
      const orig = el.dataset.placeholderOrig || '';
      const next = useDefaults ? (defVal || orig) : orig;
      el.setAttribute('placeholder', next);
    };

    if ($name2)     $name2.dataset.previewDefault     = useDefaults ? (profileCache.name     || '') : '';
    if ($pid2)      $pid2.dataset.previewDefault      = useDefaults ? (profileCache.id       || '') : '';
    if ($idType2)   $idType2.dataset.previewDefault   = useDefaults ? (profileCache.idType   || '') : '';
    if ($station2)  $station2.dataset.previewDefault  = useDefaults ? (profileCache.station  || '') : '';
    if ($classnum2) $classnum2.dataset.previewDefault = useDefaults ? (profileCache.classnum || '') : '';

    syncPlaceholder($name2,     profileCache.name);
    syncPlaceholder($pid2,      profileCache.id);
    syncPlaceholder($idType2,   profileCache.idType);
    syncPlaceholder($station2,  profileCache.station);
    syncPlaceholder($classnum2, profileCache.classnum);

    [$name2, $pid2, $idType2, $station2, $classnum2].forEach(el => el && el.dispatchEvent(new Event('preview-refresh')));

    // 红2009 与 红1998 结构相同（1998 页的元素 id 统一带 _1998 后缀），同一段逻辑跑两遍
    const pages09 = [
      { pageSel: '.page.red2009', suf: '' },
      { pageSel: '.page.red1998', suf: '_1998' },
    ];
    pages09.forEach(({ pageSel, suf }) => {
      const pageEl = document.querySelector(pageSel);
      if (!pageEl) return;
      const $r = (id) => pageEl.querySelector('#' + id + suf);

      const r09ClassInp = $r('input-classnum');
      const r09TopInp   = $r('input-topnum');
      const r09TopPrev  = $r('preview-topnum');
      const classDef = useDefaults ? (profileCache.classnum || '') : '';
      if (r09ClassInp) {
        r09ClassInp.dataset.previewDefault = classDef;
        syncPlaceholder(r09ClassInp, classDef);
        r09ClassInp.dispatchEvent(new Event('preview-refresh'));
      }
      if (r09TopPrev) {
        const classForPreview = (r09ClassInp?.value || r09ClassInp?.dataset?.previewDefault || '').trim();
        const topForPreview   = (r09TopInp?.value   || r09TopInp?.dataset?.previewDefault   || '').trim();
        r09TopPrev.textContent = classForPreview + topForPreview;
      }

      const r09OfficeInp  = $r('input-ticketoffice');
      const r09OfficePrev = $r('preview-ticketoffice');
      const officeDef = useDefaults ? normalizeOffice(profileCache.station) : '';
      if (r09OfficeInp) {
        r09OfficeInp.dataset.previewDefault = officeDef;
        syncPlaceholder(r09OfficeInp, officeDef);
        r09OfficeInp.dispatchEvent(new Event('preview-refresh'));
      }
      if (r09OfficePrev) {
        const txt = (r09OfficeInp?.value || r09OfficeInp?.dataset?.previewDefault || '').trim();
        r09OfficePrev.textContent = '';
        if (txt) {
          r09OfficePrev.appendChild(document.createTextNode(txt));
          const mark = document.createElement('span');
          mark.className = 'sale-mark';
          mark.textContent = '售';
          r09OfficePrev.appendChild(mark);
        }
      }
    });
  }

  function ensureInputs() {
    if ($name && $pid && $idType && $station && $classnum) return true;
    $name   = document.getElementById('input-defaultname');
    $pid    = document.getElementById('input-defaultid');
    $idType = document.getElementById('input-defaultidtype');
    $station = document.getElementById('input-defaultstation');
    $classnum = document.getElementById('input-defaultclassnum');
    return !!($name && $pid && $idType && $station && $classnum);
  }

  // ========================= 用户资料：加载/保存 =========================
  async function loadUserProfile() {
    if (!ensureInputs()) return;
    try {
      const res = await fetch(URL_PROFILE, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        credentials: CRED,
        headers: { 'Accept': 'application/json' }
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok || !json || json.ok !== true) return;

      const { name = '', id = '', idType = '', station = '', classnum = '' } = json.data || {};
      if (document.activeElement !== $name)    $name.value    = name;
      if (document.activeElement !== $pid)     $pid.value     = id;
      if (document.activeElement !== $idType)  $idType.value  = idType;
      if (document.activeElement !== $station) $station.value = station;
      if (document.activeElement !== $classnum)$classnum.value = classnum;

      profileCache = { name, id, idType, station, classnum };
      applyPersonalDefaultsToPreview();
    } catch (e) {
      // 资料加载失败不阻塞主流程，仅日志记录（避免启动即弹窗）
      uiLog('warn', `用户资料加载失败：${e && (e.message || e)}`);
    }
  }

  let saveTimer = null;
  function scheduleSaveProfile() {
    if (!ensureInputs()) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveUserProfile, 400);
  }

  async function saveUserProfile() {
    if (!ensureInputs()) return;
    const payload = {
      name:   String($name.value   ?? '').trim(),
      id:     String($pid.value    ?? '').trim(),
      idType: String($idType.value ?? '').trim(),
      station: String($station.value ?? '').trim(),
      classnum: String($classnum.value ?? '').trim(),
    };
    try {
      const res = await fetch(URL_PROFILE, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        credentials: CRED,
        headers: { 'Content-Type': 'application/json;charset=utf-8', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok || !json || json.ok !== true) return;

      const { name = '', id = '', idType = '', station = '', classnum = '' } = json.data || payload;
      if (document.activeElement !== $name)    $name.value    = name;
      if (document.activeElement !== $pid)     $pid.value     = id;
      if (document.activeElement !== $idType)  $idType.value  = idType;
      if (document.activeElement !== $station) $station.value = station;
      if (document.activeElement !== $classnum)$classnum.value = classnum;
    } catch (e) {
      uiLog('warn', `用户资料保存失败：${e && (e.message || e)}`);
    }
  }

  function bindOnce() {
    if (!ensureInputs()) return;
    const mark = '__bound_profile__';
    [$name, $pid, $idType, $station, $classnum].forEach(el => {
      if (!el || el[mark]) return;
      el.addEventListener('input',  scheduleSaveProfile);
      el.addEventListener('change', saveUserProfile);
      el.addEventListener('blur',   saveUserProfile);
      el[mark] = true;
    });
    const chk = document.getElementById('activepersonaldefault');
    if (chk && !chk.__bound_preview_default__) {
      chk.addEventListener('change', applyPersonalDefaultsToPreview);
      chk.__bound_preview_default__ = true;
    }
  }

  const RE_PROFILE = /\/api\/user-profile(?:$|\?)/;
  function installProfileNetBridge() {
    if (typeof window.fetch === 'function' && !window.fetch.__profilePatched) {
      const _fetch = window.fetch;
      window.fetch = function (...args) {
        const url = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
        const hit = RE_PROFILE.test(url);
        return _fetch.apply(this, args).then(res => {
          if (hit) {
            res.clone().text().then(t => {
              try {
                const j = t ? JSON.parse(t) : null;
                if (j && j.ok === true && j.data && typeof j.data === 'object') {
                  const { name = '', id = '', idType = '', station = '', classnum = '' } = j.data;
                  profileCache = { name, id, idType, station, classnum };
                  applyPersonalDefaultsToPreview();
                }
              } catch {}
            });
          }
          return res;
        });
      };
      window.fetch.__profilePatched = true;
    }

    if (window.XMLHttpRequest && !window.XMLHttpRequest.__profilePatched) {
      const _open = XMLHttpRequest.prototype.open;
      const _send = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__profileHit = RE_PROFILE.test(String(url || ''));
        return _open.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function (...args) {
        if (this.__profileHit && !this.__profileHooked) {
          this.addEventListener('loadend', () => {
            try {
              const t = this.responseText;
              const j = t ? JSON.parse(t) : null;
              if (j && j.ok === true && j.data && typeof j.data === 'object') {
                const { name = '', id = '', idType = '', station = '', classnum = '' } = j.data;
                profileCache = { name, id, idType, station, classnum };
                applyPersonalDefaultsToPreview();
              }
            } catch {}
          }, { once: false });
          this.__profileHooked = true;
        }
        return _send.apply(this, args);
      };
      window.XMLHttpRequest.__profilePatched = true;
    }
  }

  // ========================= 复选框状态持久化 =========================
function initCheckboxPersistence() {
  const toggleGroup = document.querySelector('.settings-toggle-group');
  if (!toggleGroup) return;

  const checkboxIds = ['auto-pinyin', 'auto-num', 'show-qrcode', 'realistic-qr',
                       'activepersonaldefault', 'activeblur'];

  // 教材《铁路客运业务》表 3-1-1 的证件号输入规则（鼠标悬停看）
  const ID_RULES = {
    ED: '身份证号（可用识读设备自动读取）',
    QT: '输入身份证号码',
    LS: '输入临时身份证号码',
    WJ: '输入相片下方 6 位数字',
    JG: '输入编号「第×××号」中的所有数字，7–8 位',
    JS: '输入编号「字第」中的所有数字，一般 7 位',
    JX: '输入编号中的所有数字',
    JW: '输入「军职号」中的所有数字，一般 8 位',
    JT: '输入「第×××号」中的所有数字，一般 7 位',
    JB: '输入卡正面 18 位号码',
    HZ: '输入带照片页右上角编号，一般 9 位',
    GN: '输入带照片页右上角 9 位编号',
    LX: '输入带照片页右上角编号',
    NG: '输入右上角编号前 9 位',
    NT: '输入带姓名页右上角 8 位数字',
    TN: '输入带照片页右上角前 8 位',
    WL: '输入带照片页右上方后 12 位数字',
    WR: '输入封面页下方「第×××号」中数字，一般 7 位',
    WG: '输入带照片页右上角数字',
    LG: '输入证明书字样右下方数字，一般 12 位',
    HY: '输入带照片页下方后 8 位数字',
    DL: '调度（专运）命令号码 + 车票张数序号',
    HK: '输入户口簿上登记的身份证号',
    MP: '输入乘车证号码（含数字前的字母）',
    SF: '输入「第＿号」中的数字',
    JZ: '输入专用购票凭证号'
  };

  // —— 把原生 select 包装成 .ad-select（与“标语栏预设”同一套结构与动画）——
  function wrapAdSelect(sel, extraClass) {
    if (!sel || sel.dataset.adWrapped) return null;
    sel.dataset.adWrapped = '1';

    const wrap = document.createElement('div');
    wrap.className = 'ad-select' + (extraClass ? ' ' + extraClass : '');
    sel.classList.add('ad-select__native');
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);

    const display = document.createElement('button');
    display.type = 'button';
    display.className = 'ad-select__display';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'ad-select__value';
    const arrow = document.createElement('span');
    arrow.className = 'ad-select__arrow';
    arrow.textContent = '‹';
    display.append(valueSpan, arrow);

    const dropdown = document.createElement('div');
    dropdown.className = 'ad-select__dropdown';
    const list = document.createElement('ul');
    list.className = 'ad-select__list';
    dropdown.appendChild(list);
    wrap.append(display, dropdown);

    const close = () => wrap.classList.remove('is-open');
    const toggle = () => { if (!sel.disabled) wrap.classList.toggle('is-open'); };

    display.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    document.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    const render = () => {
      list.innerHTML = '';
      Array.from(sel.options).forEach(o => {
        const li = document.createElement('li');
        li.className = 'ad-select__option' + (o.value === sel.value ? ' is-selected' : '');
        li.textContent = o.textContent;
        if (o.title) li.title = o.title;
        li.addEventListener('click', () => {
          sel.value = o.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          close();
        });
        list.appendChild(li);
      });
      const cur = sel.options[sel.selectedIndex];
      valueSpan.textContent = cur ? cur.textContent : '';
    };
    sel.addEventListener('change', render);
    render();

    return { wrap, display, render, close };
  }

  let idTypeUI = null;   // 自定义下拉的节点引用

  // —— 证件类型下拉：教材表 3-1-1 的 26 种 ——
  (function initIdTypeSelect() {
    const sel = document.getElementById('realistic-qr-idtype');
    if (!sel || sel.dataset.ready) return;
    const T = window.TicketQR || {};
    const types = Array.isArray(T.ID_TYPES) ? T.ID_TYPES : [];
    const codeOf = T.ID_TYPE_CODE_OF || {};
    for (let i = 1; i < types.length; i++) {
      const code = codeOf[i] || '';
      if (!types[i] || !code) continue;              // 27-31 教材未收录，跳过
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = String(i).padStart(2, '0') + '  ' + types[i] + '  ' + code;
      opt.title = ID_RULES[code] || '';
      sel.appendChild(opt);
    }
    sel.dataset.ready = '1';
    sel.value = codeOf[1] || 'ED';
    sel.title = ID_RULES[sel.value] || '';
    sel.addEventListener('change', () => { sel.title = ID_RULES[sel.value] || ''; });
    idTypeUI = wrapAdSelect(sel, 'qr-idtype-wrap');
  })();

  // —— “显示二维/条码”未勾选时，禁用“逼真二维码”和证件类型 ——
  const showQrEl = document.getElementById('show-qrcode');
  const realQrEl = document.getElementById('realistic-qr');
  const idTypeSel = document.getElementById('realistic-qr-idtype');
  const idNoEl = document.getElementById('realistic-qr-idno');
  function syncQrRowEnabled() {
    const on = !!(showQrEl && showQrEl.checked);
    if (realQrEl) realQrEl.disabled = !on;
    if (idTypeSel) idTypeSel.disabled = !on;
    if (idNoEl) idNoEl.disabled = !on;
    if (idTypeUI) {
      idTypeUI.display.disabled = !on;
      idTypeUI.wrap.classList.toggle('is-disabled', !on);
      if (!on) idTypeUI.close();
    }
    const lbl = realQrEl && realQrEl.closest('label');
    if (lbl) lbl.classList.toggle('disabled', !on);
  }
  syncQrRowEnabled();
  if (showQrEl) showQrEl.addEventListener('change', syncQrRowEnabled);
  // 证件号：边输边存
  if (idNoEl) idNoEl.addEventListener('input', saveSettingsToServer);

  // 加载设置
  fetch(DATA_BASE + '/api/settings')
    .then(r => r.json())
    .then(res => {
      if (res.ok && res.data) {
        checkboxIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.checked = !!res.data[id];
        });
        // 证件号
        const idNoInput = document.getElementById('realistic-qr-idno');
        if (idNoInput && res.data['realistic-qr-idno'] !== undefined) {
          idNoInput.value = res.data['realistic-qr-idno'];
        }
        // 证件类型下拉
        const idSel = document.getElementById('realistic-qr-idtype');
        if (idSel && res.data['realistic-qr-idtype']) {
          idSel.value = res.data['realistic-qr-idtype'];
          if (idSel.selectedIndex < 0) idSel.selectedIndex = 0;
          if (idTypeUI) idTypeUI.render();      // 同步自定义下拉的显示文字
        }
        // 缩放系数输入框
        const scaleEl = document.getElementById('scaletransform');
        if (scaleEl && res.data.scale_factor !== undefined) {
          scaleEl.value = res.data.scale_factor;
        }
        syncQrRowEnabled();
        if (typeof applyPersonalDefaultsToPreview === 'function') {
          applyPersonalDefaultsToPreview();
        }
      }
    })
    .catch(() => {});

  //保存设置
  function saveSettingsToServer() {
    const payload = {};
    checkboxIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) payload[id] = el.checked;
    });
    // 证件类型 + 证件号
    const idSel = document.getElementById('realistic-qr-idtype');
    if (idSel) payload['realistic-qr-idtype'] = idSel.value;
    const idNoInput = document.getElementById('realistic-qr-idno');
    if (idNoInput) payload['realistic-qr-idno'] = idNoInput.value.trim();
    // 收集缩放系数
    const scaleEl = document.getElementById('scaletransform');
    if (scaleEl) payload.scale_factor = scaleEl.value.trim() || '1.00';

    fetch(DATA_BASE + '/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  // 复选框 / 证件类型改变保存
  toggleGroup.addEventListener('change', e => {
    const input = e.target.closest('input[type="checkbox"][id], select[id]');
    if (!input) return;
    saveSettingsToServer();
    // 通知票面重画二维码
    if (input.id === 'realistic-qr' || input.id === 'realistic-qr-idtype') {
      window.dispatchEvent(new CustomEvent('ticket-settings-changed', {
        detail: { key: 'showQrcode', settings: { showQrcode: true } }
      }));
    }
  });

  //缩放系数输入改变保存
  const scaleInput = document.getElementById('scaletransform');
  if (scaleInput) {
    scaleInput.addEventListener('input', () => {
      saveSettingsToServer();
    });
  }
}

  // ========================= 悬停说明 =========================
  (() => {
    const HOVER_DELAY = 70;
    const FADE_IN_MS  = 180;
    const panel = document.querySelector('.explaintext');
    if (!panel) return;

    const paras = Array.from(panel.querySelectorAll('p[id]'));
    if (!paras.length) return;

    panel.style.position ||= 'relative';

    let maxH = 0;
    paras.forEach(p => {
      const prevPos = p.style.position;
      const prevDisp = p.style.display;
      const prevVis = p.style.visibility;
      p.style.position = 'static';
      p.style.display  = 'block';
      p.style.visibility = 'hidden';
      maxH = Math.max(maxH, p.scrollHeight);
      p.style.position = prevPos;
      p.style.display  = prevDisp;
      p.style.visibility = prevVis;
    });

    const stack = document.createElement('div');
    stack.style.position = 'relative';
    stack.style.minHeight = maxH + 'px';
    const h2 = panel.querySelector('h2');
    if (h2 && h2.nextSibling) {
      panel.insertBefore(stack, h2.nextSibling);
    } else {
      panel.appendChild(stack);
    }
    paras.forEach(p => stack.appendChild(p));

    let zCounter = 1;
    paras.forEach(p => {
      p.style.position = 'absolute';
      p.style.left = '0';
      p.style.right = '0';
      p.style.top = '0';
      p.style.margin = '0';
      p.style.opacity = '0';
      p.style.pointerEvents = 'none';
      p.style.transition = `opacity ${FADE_IN_MS}ms ease`;
    });

    const hideAll = () => paras.forEach(p => (p.style.opacity = '0'));
    const showOnly = (id) => {
      const target = document.getElementById(id);
      if (!target) return;
      paras.forEach(p => { if (p !== target) p.style.opacity = '0'; });
      target.style.zIndex = (++zCounter).toString();
      target.style.opacity = '1';
    };

    let hoverTimer = null;
    const scheduleShow = (id) => { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => showOnly(id), HOVER_DELAY); };
    const cancelShow  = () => { clearTimeout(hoverTimer); };

    const bindHover = (el, id) => {
      if (!el) return;
      el.addEventListener('mouseenter', () => scheduleShow(id));
      el.addEventListener('mouseleave', () => { cancelShow(); hideAll(); });
      el.addEventListener('focus', () => showOnly(id));
      el.addEventListener('blur', hideAll);
    };

    bindHover(document.getElementById('uploadcsv'), 'csvnotice');
    bindHover(document.getElementById('openbackground'), 'piaomianbeijing');
    bindHover(document.getElementById('uploadpicture'), 'picturenotice');
    
    const toggleGroup = document.querySelector('.settings-toggle-group');
    const helpByInputId = {
      'auto-pinyin':           'zidongpinyin',
      'auto-num':              'liandongpiaohao',
      'show-qrcode':           'xianshima',
      'activepersonaldefault': 'yutiangerenxinxi',
      'activeblur':            'tandaixiaoguo',
      'openbackground':        'piaomianbeijing',
    };
    if (toggleGroup) {
      toggleGroup.addEventListener('mouseover', (e) => {
        const label = e.target.closest('label');
        if (!label || !toggleGroup.contains(label)) return;
        const input = label.querySelector('input[type="checkbox"][id]');
        const helpId = input && helpByInputId[input.id];
        if (helpId) scheduleShow(helpId);
      });
      toggleGroup.addEventListener('mouseout', (e) => {
        const fromLabel = e.target.closest('label');
        const toLabel   = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('label') : null;
        if (!fromLabel) return;
        if (toLabel && toggleGroup.contains(toLabel)) return;
        cancelShow(); hideAll();
      });
      toggleGroup.addEventListener('focusin', (e) => {
        const label = e.target.closest('label');
        const input = label && label.querySelector('input[type="checkbox"][id]');
        const helpId = input && helpByInputId[input.id];
        if (helpId) showOnly(helpId);
      });
      toggleGroup.addEventListener('focusout', (e) => {
        const next = e.relatedTarget;
        if (next && toggleGroup.contains(next)) return;
        hideAll();
      });
    }
  })();

  // ========================= 页面状态/控件 =========================
  const btnUploadCsv  = document.getElementById('uploadcsv');
  const btnSavePath   = document.getElementById('savepath');
  const btnDownloadSample = document.getElementById('downloadcsvsample');
  const appState = { csvFile: null, saveDirHint: "Desktop" };

  let csvStatusEl = null;
  const pathStatusEl = null;   // 兼容旧引用，实际由 pathUI.ticket 管理

  // ========================= 路径显示（ticket / picture 共用） =========================
  // 每个 target 维护自己的元素、状态与提示文案，逻辑完全一致，只有 DOM 锚点与默认值不同。
  const pathUI = {
    ticket:  { btnId: 'savepath',  anchorSel: '#savepath + .path-display',
               getPath: '/getpath',              label: 'Desktop' },
    picture: { btnId: 'savepath2', anchorSel: '#savepath2 + .path-display',
               getPath: '/getpath?target=picture', label: 'Desktop' },
  };
  Object.values(pathUI).forEach(u => { u.el = null; u.valid = true; });

  function ensurePathEl(ui) {
    if (ui.el) return;
    ui.el = document.querySelector(ui.anchorSel);
    if (!ui.el) {
      const btn = document.getElementById(ui.btnId);
      if (btn) {
        ui.el = document.createElement('span');
        ui.el.className = 'path-display';
        ui.el.style.cssText = 'margin-left:8px; margin-top:4px; font-size:12px; color:#777777; user-select:text;';
        btn.insertAdjacentElement('afterend', ui.el);
      }
    }
    if (ui.el) ui.el.textContent = ui.label;
  }

  function updatePathDisplay(ui, valid, path) {
    ui.valid = valid;
    if (!ui.el) return;
    ui.el.textContent = path || ui.label;
    ui.el.classList.remove('path-valid', 'path-invalid');
    ui.el.classList.add(valid ? 'path-valid' : 'path-invalid');
    // 处理“无效路径”后缀
    let suffix = ui.el.querySelector('.invalid-suffix');
    if (!valid) {
      if (!suffix) {
        suffix = document.createElement('span');
        suffix.className = 'invalid-suffix';
        suffix.textContent = ' 无效路径';
        suffix.style.cssText = 'color:#ef4444; font-size:11px; margin-left:4px;';
        ui.el.appendChild(suffix);
      }
    } else if (suffix) {
      suffix.remove();
    }
  }

  async function checkPathValidity(ui) {
    try {
      const base = await getAnalysisBase();
      const res = await fetch(base + ui.getPath);
      const json = await res.json();
      if (json.ok) updatePathDisplay(ui, json.valid, json.path);
    } catch (e) {
      console.warn(`${ui.btnId} 路径有效性检查失败:`, e);
    }
  }

  function ensureStatusEls() {
    csvStatusEl = document.getElementById('csv-status-text');
    if (!csvStatusEl) {
      const batchBox = btnUploadCsv?.closest('.add-default');
      if (batchBox) {
        csvStatusEl = document.createElement('span');
        csvStatusEl.id = 'csv-status-text';
        csvStatusEl.className = 'path-display';
        csvStatusEl.style.cssText = 'margin-top:10px; font-size:12px; color:#555; display:block; text-decoration:none;';
        batchBox.appendChild(csvStatusEl);
      }
    } else {
      csvStatusEl.style.textDecoration = 'none';
    }
    ensurePathEl(pathUI.ticket);
  }
  ensureStatusEls();

  if (btnDownloadSample) {
    btnDownloadSample.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = "/static/Sample.zip";
      a.download = "Sample.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  // ========================= Socket 连接 =========================
  let socket = null;

  // 把主界面的关键用户操作与运行态回传到服务端日志，便于事后排查
  function uiLog(level, message, data) {
    try {
      if (socket && socket.connected) {
        socket.emit('client-log', { source: 'main', level, message, data, ts: Date.now() });
      }
    } catch (_) {}
  }
  window.__uiLog = uiLog;

  async function setupAnalysisSocket() {
    if (socket && socket.connected) return socket;
    if (typeof io !== 'function') {
      console.error('[main] socket.io 未加载');
      return null;
    }
    const base = await getAnalysisBase();
    console.log('[main] connect analysis socket at', base);
    const s = window.__MAIN_SOCKET__ || io(base, { transports: ['websocket'] });
    window.__MAIN_SOCKET__ = s;
    s.on('connect',       () => { console.log('[main] socket connected'); uiLog('info', '主界面已连接分析服务'); });
    s.on('connect_error', e => {
      const msg = e?.message || String(e);
      console.warn('[main] socket error:', msg);
      // 首次连接失败才提示，避免断线重连时刷屏
      if (!s.__everConnected) {
        window.__showUIError && window.__showUIError('无法连接分析服务：' + msg, { from: 'socket' });
      }
    });
    // 连接成功后断开（运行中掉线）→ 提示用户
    s.on('connect',    () => { s.__everConnected = true; });
    s.on('disconnect', (reason) => {
      uiLog('warn', `与分析服务断开连接：${reason}`);
      if (reason !== 'io client disconnect') {
        window.__showUIError && window.__showUIError('与分析服务连接中断（' + reason + '），正在尝试重连…', { from: 'socket' });
      }
    });
    socket = s;
    return s;
  }

  // ========================= 进度状态 & UI =========================
  let PROGRESS_TOTAL = 0;
  let PROGRESS_DONE  = 0;
  let INVALID_ROWS   = 0;
  let INVALID_IMAGES = 0;
  let processing = false;
  let busy = false;

  function emitProgressUpdated(reason, extra = {}) {
    const detail = { total: PROGRESS_TOTAL, done: PROGRESS_DONE, invalidRows: INVALID_ROWS, invalidImages: INVALID_IMAGES, reason, ...extra };
    window.dispatchEvent(new CustomEvent('progress-updated', { detail }));
    const mini = document.getElementById('progress-mini');
    if (mini) mini.textContent = `${PROGRESS_DONE}/${PROGRESS_TOTAL}`;
    console.log('[front][progress]', `${PROGRESS_DONE}/${PROGRESS_TOTAL}`, reason, detail);
    renderProgressLine();
  }

  function renderProgressLine() {
    const line = document.getElementById('progress-line');
    if (!line) return;
    const rendered = PROGRESS_DONE | 0;
    const total    = PROGRESS_TOTAL | 0;
    const invalid  = (INVALID_ROWS | 0) + (INVALID_IMAGES | 0);
    line.textContent = `已渲染：${rendered}      总计：${total}     无效：${invalid}`;
  }

  function toggleProcessingUI(on) {
    document.querySelectorAll('.notification').forEach(el => {
      el.style.transition = 'opacity .25s ease';
      el.style.opacity = on ? '1' : '0';
      el.style.pointerEvents = on ? 'auto' : 'none';
    });
    document.querySelectorAll('.label-text, .label-tab, .label-output').forEach(el => {
      el.style.pointerEvents = on ? 'none' : '';
    });
  }

  function lockUpload(flag) {
    if (btnUploadCsv) btnUploadCsv.disabled = !!flag;
  }

  // ========================= 绑定 Socket 事件 =========================
  function bindSocketEvents(s) {
    if (!s) return;
    s.on('progress-init', ({ total = 0, processed = 0, invalid_rows = 0, invalid_images = 0 } = {}) => {
      PROGRESS_TOTAL = total | 0;
      PROGRESS_DONE  = processed | 0;
      INVALID_ROWS   = invalid_rows | 0;
      INVALID_IMAGES = invalid_images | 0;
      toggleProcessingUI(true);
      lockUpload(true);
      emitProgressUpdated('init');
      uiLog('info', `批量渲染开始：共 ${PROGRESS_TOTAL} 行（无效行 ${INVALID_ROWS}）`);
    });

    s.on('render-row', ({ index }) => {
      if (index === 0) {
        console.log('[main] Python 开始渲染与截图…');
        uiLog('info', '渲染器已开始逐行渲染与截图');
        toggleProcessingUI(true);
        lockUpload(true);
      }
    });

    s.on('progress-tick', ({ processed, total, index, path, filename } = {}) => {
      if (typeof processed === 'number') PROGRESS_DONE  = processed;
      if (typeof total     === 'number') PROGRESS_TOTAL = total;
      emitProgressUpdated('tick', { index, path, filename });
    });

    s.on('progress-invalid', ({ invalid_images, index, reason } = {}) => {
      if (typeof invalid_images === 'number') INVALID_IMAGES = invalid_images;
      else INVALID_IMAGES += 1;
      uiLog('warn', `第 ${(index|0) + 1} 行截图无效（原因：${reason || '未知'}）`);
      emitProgressUpdated('invalid', { index, reason });
    });

    s.on('render-done', ({ total, processed, invalid_rows, invalid_images } = {}) => {
      PROGRESS_TOTAL   = total         ?? PROGRESS_TOTAL;
      PROGRESS_DONE    = processed     ?? PROGRESS_DONE;
      INVALID_ROWS     = invalid_rows  ?? INVALID_ROWS;
      INVALID_IMAGES   = invalid_images?? INVALID_IMAGES;
      console.log(`[main] Python 完成全部渲染：共 ${PROGRESS_TOTAL} 张图片。`);
      uiLog('info', `批量渲染结束：共 ${PROGRESS_TOTAL} 张，无效行 ${INVALID_ROWS}，无效图 ${INVALID_IMAGES}`);
      toggleProcessingUI(false);
      lockUpload(false);
      emitProgressUpdated('done');
      processing = false;
      busy = false;
    });

    // 后端主动上报的异常（卡住 / 渲染错误等）→ 弹窗提示
    s.on('analysis-error', ({ level = 'error', message = '渲染发生异常', code = '' } = {}) => {
      uiLog('error', `后端异常上报[${code}]：${message}`);
      if (level === 'error') {
        window.__showUIError && window.__showUIError(message, { from: 'analysis:' + code });
      } else {
        window.__showUITip && window.__showUITip(message, { duration: 4000 });
      }
    });
  }

  // ========================= 上传 CSV =========================
  if (btnUploadCsv) {
    const hiddenCsvInput = document.createElement("input");
    hiddenCsvInput.type = "file";
    hiddenCsvInput.accept = ".csv,text/csv";
    hiddenCsvInput.style.display = "none";
    document.body.appendChild(hiddenCsvInput);

    btnUploadCsv.addEventListener("click", () => {
      if (busy || processing) {
        uiLog('warn', `点击批量渲染被忽略（busy=${busy} processing=${processing}）`);
        return;
      }
      if (!pathUI.ticket.valid) {
        uiLog('warn', '点击批量渲染：保存路径无效，已提示修改');
        showUITip('请先修改保存路径', 3000);
        return;
      }
      hiddenCsvInput.value = "";
      hiddenCsvInput.click();
    });

    hiddenCsvInput.addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;

      busy = true;
      const _t0 = performance.now();
      try {
        ensureStatusEls();
        if (csvStatusEl) csvStatusEl.textContent = `已选择 CSV：${f.name}`;
        uiLog('info', `用户选择 CSV 文件：${f.name}（${(f.size / 1024).toFixed(1)} KB），开始上传`);

        const formData = new FormData();
        formData.append("file", f, f.name);

        const base = await getAnalysisBase();
        const res = await fetch(base + "/receivecsv", {
          method: "POST",
          body: formData,
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          const errMsg = json.error || `服务器错误 (HTTP ${res.status})`;
          const errCode = json.error_code || 'UNKNOWN';
          const fullMsg = `[${errCode}] ${errMsg}`;
          console.warn("上传失败：", fullMsg);
          uiLog('error', `CSV 上传被拒绝：${fullMsg}`);
          showUploadError(fullMsg, 3000);
          lockUpload(false);
          return;
        }

        const count = json.count | 0;
        console.log(`CSV 上传成功，已交给 Python 处理：${count} 行。等待渲染信号…`);
        uiLog('info', `CSV 上传成功，共 ${count} 行有效（耗时 ${Math.round(performance.now() - _t0)}ms），等待渲染`);

        processing = true;
        toggleProcessingUI(true);
        lockUpload(true);

        if (count > 0) {
          PROGRESS_TOTAL = count;
          PROGRESS_DONE  = 0;
          emitProgressUpdated('client-primed');
        }
      } catch (err) {
        console.error("无法连接到 analysis.py：", err);
        uiLog('error', `CSV 上传网络错误：${err && (err.message || err)}`);
        showUploadError(`网络错误：无法连接到服务器`, 3000);
        lockUpload(false);
      } finally {
        e.target.value = "";
        appState.csvFile = null;
        busy = false;
      }
    });
  }
//============图片模板================
const btnSavePath2 = document.getElementById('savepath2');
if (btnSavePath2) {
  btnSavePath2.addEventListener('click', async () => {
    ensurePathEl(pathUI.picture);
    try {
      let startIn = null;
      if (pathUI.picture.valid) {
        startIn = pathUI.picture.label || await window.electronAPI?.getDefaultSaveDir?.() || "Desktop";
      }
      let absPath = await window.electronAPI?.pickDirectory?.(startIn);
      if (!absPath) return;

      pathUI.picture.label = absPath;
      updatePathDisplay(pathUI.picture, true, absPath);

      const base = await getAnalysisBase();
      await fetch(base + '/savepath', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: absPath, target: 'picture' })
      });
    } catch (e) {
      console.error('选路径失败：', e);
      uiLog('error', `图片保存路径设置失败：${e && (e.message || e)}`);
      showUploadError('保存路径设置失败：' + (e && e.message ? e.message : '未知错误'), 3000);
    }
  });
}
// ========================= 图片上传按钮 =========================
const btnUploadPicture = document.getElementById('uploadpicture');
const scaleInput = document.getElementById('scaletransform');

if (btnUploadPicture) {
  btnUploadPicture.addEventListener('click', async () => {
    if (!pathUI.picture.valid) {
      showUITip('请先修改保存路径', 3000);
      return;
    }
    if (busy) return;
    busy = true;

    try {
      let folderPath = await window.electronAPI?.pickDirectory?.(pathUI.picture.label || "Desktop");
      if (!folderPath) { busy = false; return; }

      let scaleVal = scaleInput ? scaleInput.value.trim() : '';
      if (!scaleVal) scaleVal = '1.0';

      const s = await setupAnalysisSocket();
      if (!s) {
        showUploadError('无法连接到分析服务器', 3000);
        busy = false;
        return;
      }

      // 1. 先发送请求，获取初始数据（总页数）
      const base = await getAnalysisBase();
      const res = await fetch(base + '/compose-from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: folderPath, scale_factor: scaleVal })
      });
      const initJson = await res.json().catch(() => ({}));

      if (!res.ok || !initJson.ok) {
        // 请求失败时直接显示错误，不进入合成流程
        toggleProcessingUI(true);  // 短暂显示动画背景
        const progressLine = document.getElementById('progress-line');
        const prevText = progressLine?.textContent ?? '';
        const errMsg = initJson.error || '请求失败';
        if (progressLine) progressLine.textContent = errMsg;
        uiLog('error', `图片合成请求被拒绝：${errMsg}`);
        window.__showUIError && window.__showUIError('图片合成失败：' + errMsg, { from: 'compose-init' });
        setTimeout(() => {
          toggleProcessingUI(false);
          if (progressLine) progressLine.textContent = prevText;
          busy = false;
        }, 2000);
        return;
      }

      // 2. 请求成功，开启动画，根据 total_pages 设置初始文字
      toggleProcessingUI(true);
      const progressLine = document.getElementById('progress-line');
      const prevText = progressLine?.textContent ?? '';
      if (progressLine && initJson.total_pages) {
        progressLine.textContent = `合成第1页，共${initJson.total_pages}页`;
      } else {
        progressLine && (progressLine.textContent = '正在合成...');
      }

      let composeDone = false;
      function onProgress(data) {
        if (composeDone) return;
        if (progressLine) {
          progressLine.textContent = `合成第${data.current_page}页，共${data.total_pages}页`;
        }
      }
      function onDone(data) {
        if (composeDone) return;
        composeDone = true;
        if (progressLine) {
          progressLine.textContent = `合成完成！共生成 ${data.pages} 页`;
        }
        setTimeout(() => {
          toggleProcessingUI(false);
          if (progressLine) progressLine.textContent = prevText;
          busy = false;
        }, 2000);
        s.off('compose-progress', onProgress);
        s.off('compose-done', onDone);
        s.off('compose-error', onError);
      }
      function onError(data) {
        if (composeDone) return;
        composeDone = true;
        const msg = data.error || '合成失败';
        if (progressLine) {
          progressLine.textContent = msg;
        }
        uiLog('error', `图片合成失败：${msg}`);
        window.__showUIError && window.__showUIError('图片合成失败：' + msg, { from: 'compose-error' });
        setTimeout(() => {
          toggleProcessingUI(false);
          if (progressLine) progressLine.textContent = prevText;
          busy = false;
        }, 2000);
        s.off('compose-progress', onProgress);
        s.off('compose-done', onDone);
        s.off('compose-error', onError);
      }

      s.on('compose-progress', onProgress);
      s.on('compose-done', onDone);
      s.on('compose-error', onError);

      // 超时保护
      setTimeout(() => {
        if (!composeDone) {
          composeDone = true;
          if (progressLine) progressLine.textContent = '合成超时';
          uiLog('error', '图片合成超时（超过 30 秒无响应）');
          window.__showUIError && window.__showUIError('图片合成超时：长时间未收到响应，请重试或检查图片是否有效。', { from: 'compose-timeout' });
          setTimeout(() => {
            toggleProcessingUI(false);
            if (progressLine) progressLine.textContent = prevText;
            busy = false;
          }, 2000);
          s.off('compose-progress', onProgress);
          s.off('compose-done', onDone);
          s.off('compose-error', onError);
        }
      }, 30000);

    } catch (err) {
      console.error('合成出错：', err);
      uiLog('error', `图片合成出错：${err && (err.message || err)}`);
      // 清理动画
      toggleProcessingUI(false);
      const progressLine = document.getElementById('progress-line');
      if (progressLine) {
        const prevText = progressLine.textContent;
        progressLine.textContent = '网络错误或合成失败';
        setTimeout(() => { if (progressLine) progressLine.textContent = prevText; }, 2000);
      }
      window.__showUIError && window.__showUIError('图片合成失败：' + (err && err.message ? err.message : '网络错误或服务器异常'), { from: 'compose' });
      busy = false;
    }
  });
}


// ========================= 下载背景图案 =========================
const btnDownloadLayoutBack = document.getElementById('downloadlayoutback');
if (btnDownloadLayoutBack) {
  btnDownloadLayoutBack.addEventListener('click', async () => {
    const scaleInput = document.getElementById('scaletransform');
    let scaleVal = scaleInput ? scaleInput.value.trim() : '';
    if (!scaleVal) scaleVal = '1.0';
    const scale = parseFloat(scaleVal) || 1.0;

    const A4_WIDTH = 4961;
    const A4_HEIGHT = 7016;

    try {
      // 1. 加载原始底图
      const resp = await fetch('/static/LayoutBack.png');
      if (!resp.ok) throw new Error('无法加载 LayoutBack.png');
      const blob = await resp.blob();
      const imageBitmap = await createImageBitmap(blob);

      // 2. 创建原始尺寸画布，绘制底图（铺满）与缩放系数
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = A4_WIDTH;
      srcCanvas.height = A4_HEIGHT;
      const srcCtx = srcCanvas.getContext('2d');
      // 绘制底图（覆盖整个画布，透明区域保留）
      srcCtx.drawImage(imageBitmap, 0, 0, A4_WIDTH, A4_HEIGHT);

      // 打印缩放系数
      srcCtx.font = '124px sans-serif';
      srcCtx.fillStyle = '#000000';
      srcCtx.textBaseline = 'top';
      srcCtx.fillText(scale.toFixed(3), 4150, 676);

      let finalCanvas;
      // 3. 如果缩放系数不为1，则整体放大后裁切
      if (scale !== 1.0) {
        const bigW = Math.round(A4_WIDTH * scale);
        const bigH = Math.round(A4_HEIGHT * scale);
        const bigCanvas = document.createElement('canvas');
        bigCanvas.width = bigW;
        bigCanvas.height = bigH;
        const bigCtx = bigCanvas.getContext('2d');
        // 将带系数的原始画布缩放绘制到大画布上
        bigCtx.drawImage(srcCanvas, 0, 0, A4_WIDTH, A4_HEIGHT, 0, 0, bigW, bigH);

        // 从大画布中心裁切回 A4
        const cutX = Math.round((bigW - A4_WIDTH) / 2);
        const cutY = Math.round((bigH - A4_HEIGHT) / 2);
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = A4_WIDTH;
        finalCanvas.height = A4_HEIGHT;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.drawImage(bigCanvas, cutX, cutY, A4_WIDTH, A4_HEIGHT, 0, 0, A4_WIDTH, A4_HEIGHT);
      } else {
        // 不缩放，直接使用带系数的画布
        finalCanvas = srcCanvas;
      }

      // 4. 导出为 PNG blob
      const pngBlob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));

      // 5. 保存文件（优先 Electron 原生对话框，降级为浏览器下载）
      if (window.electronAPI?.showSaveDialog && window.electronAPI?.writeFile) {
        const { filePath } = await window.electronAPI.showSaveDialog({
          defaultPath: 'LayoutBack_scaled.png',
          filters: [{ name: 'PNG 图片', extensions: ['png'] }]
        });
        if (filePath) {
          await window.electronAPI.writeFile(filePath, await pngBlob.arrayBuffer());
        }
      } else if (window.electronAPI?.saveFile) {
        await window.electronAPI.saveFile(pngBlob, 'LayoutBack_scaled.png');
      } else {
        // 浏览器下载
        const url = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'LayoutBack_scaled.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('处理 LayoutBack 失败:', err);
      showUploadError('背景图案处理失败: ' + (err.message || '未知错误'), 3000);
    }
  });
}
  // ========================= 保存路径 =========================
if (btnSavePath) {
  btnSavePath.addEventListener('click', async () => {
    ensureStatusEls();
    try {
      // 仅在路径有效时传入起始目录，避免文件管理器创建文件夹
      let startIn = null;
      if (pathUI.ticket.valid) {
        startIn = pathUI.ticket.label || await window.electronAPI?.getDefaultSaveDir?.() || "Desktop";
      }
      let absPath = await window.electronAPI?.pickDirectory?.(startIn);
      if (!absPath) return;

      pathUI.ticket.label = absPath;
      // 选择完路径后立即标记为有效（后续轮询会再次确认）
      updatePathDisplay(pathUI.ticket, true, absPath);

      const base = await getAnalysisBase();
      await fetch(base + '/savepath', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: absPath })
      });
    } catch (e) {
      console.error('选路径失败：', e);
      uiLog('error', `保存路径设置失败：${e && (e.message || e)}`);
      showUploadError('保存路径设置失败：' + (e && e.message ? e.message : '未知错误'), 3000);
    }
  });
}

  // ========================= 本地依赖自检 =========================
  // 启动后检查关键本地文件是否齐全，缺失则常驻报错弹窗（点击任意处关闭）
  async function checkLocalAssets() {
    try {
      const res = await fetch(DATA_BASE + '/api/asset-check', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!json || json.ok) return;
      const names = (json.missing || []).map(m => `${m.path}（${m.desc}）`).join('\n');
      const msg = `检测到 ${json.missing.length} 个关键文件缺失，部分功能可能无法使用：\n${names}\n\n建议重新安装或补回上述文件。`;
      uiLog('error', `本地依赖自检失败：缺少 ${json.missing.map(m => m.path).join(', ')}`);
      if (window.__showUIError) window.__showUIError(msg, { from: 'asset-check' });
    } catch (e) {
      // 自检本身失败不阻塞启动
      uiLog('warn', `本地依赖自检请求失败：${e && (e.message || e)}`);
    }
  }

  // ========================= 启动 =========================
  async function init() {
    if (!ensureInputs()) return;
    bindOnce();
    installProfileNetBridge();
    loadUserProfile();
    initCheckboxPersistence();
    checkLocalAssets();   // 异步，不阻塞启动

    const s = await setupAnalysisSocket();
    bindSocketEvents(s);

    // 路径有效性检查（ticket / picture 各自 5s 轮询）
    await checkPathValidity(pathUI.ticket);
    ensurePathEl(pathUI.picture);
    await checkPathValidity(pathUI.picture);
    [pathUI.ticket, pathUI.picture].forEach(ui => {
      const timer = setInterval(() => checkPathValidity(ui), 5000);
      window.addEventListener('beforeunload', () => clearInterval(timer));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
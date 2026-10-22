const __thisScript = document.currentScript;
const __page = __thisScript?.dataset.page || 'red2015';
const __root = document.querySelector(`.page.${__page}`) || document;
const $id = (id) => __root.querySelector(`#${id}`);
const STATIC = '/static';

window.addEventListener('DOMContentLoaded', () => {
  const styleOptions = document.querySelectorAll('.ticketstyle-option');
  const bgOptions = document.querySelector('.background-options');
  let highlightBar = null;

/* ===================== 票面背景样式切换 ===================== */
function deriveStyleKey(src) {
  // 提取实际文件名，不再限制为 ticketred 等
  const parts = (src || '').split('/');
  const filename = parts[parts.length - 1].replace(/\?.*$/, '');
  return filename || null;
}

function applyTicketStyle(styleKey) {
  if (!styleKey) return;
  document.querySelectorAll('.ticket-bg').forEach(img => {
    img.crossOrigin = 'anonymous';
    // 强制路径指向 Background 文件夹
    img.setAttribute('src', `${STATIC}/Background/${styleKey}`);
    img.style.visibility = 'visible';
  });
  document.querySelectorAll('.ticketstyle-wrap').forEach(wrap => {
    wrap.classList.toggle('selected', (wrap.getAttribute('data-style') === styleKey));
  });
}

function setTicketStyle(styleKey) {
  localStorage.setItem('ticketStyle', styleKey);
  applyTicketStyle(styleKey);
}

document.querySelectorAll('img').forEach(img => {
  const srcAbs = new URL(img.getAttribute('src') || img.src, location.href).pathname;
  if (srcAbs.endsWith(`${STATIC}/ticket.png`)) {
    img.classList.add('ticket-bg');
  }
});

function setTicketBgVisible(show) {
  document.querySelectorAll('.ticket-bg').forEach(img => {
    img.style.visibility = show ? 'visible' : 'hidden';
    img.style.pointerEvents = 'none';
    img.style.userSelect = 'none';
  });
}

/* ===================== 蓝条淡入淡出（完全保留原逻辑） ===================== */
function fadeHighlight(show) {
  if (!highlightBar) return;
  try { highlightBar.getAnimations().forEach(a => a.cancel()); } catch {}
  const current = parseFloat(getComputedStyle(highlightBar).opacity) || 0;
  if (show) {
    if (current >= 1) return;
    highlightBar.animate([{ opacity: current }, { opacity: 1 }], { duration: 180, easing: 'ease', fill: 'forwards' });
  } else {
    if (current <= 0) { highlightBar.style.opacity = '0'; return; }
    highlightBar.animate([{ opacity: current }, { opacity: 0 }], { duration: 180, easing: 'ease', fill: 'forwards' });
  }
}

/* ===================== 辅助工具：文件名处理 ===================== */
function formatBgDisplayName(filename) {
  // 去掉后缀名
  let name = filename.replace(/\.[^/.]+$/, "");
  // 最长8位，过长加省略号
  if (name.length > 8) {
    return name.slice(0, 8) + "...";
  }
  return name;
}

// 同步状态到后端
async function syncBackgroundToBackend(filename) {
  try {
    await fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ background: filename })
    });
  } catch (e) {
    console.error("同步背景状态到后端失败:", e);
  }
}

/* ===================== 动态获取图片并初始化 ===================== */
let currentBgFiles = []; // 缓存文件名列表用于对比

async function initDynamicBackgrounds(isReload = false) {
  const bgOptions = document.querySelector('.background-options');
  if (!bgOptions) return;

  // 1. 只有第一次加载时绑定滚轮横滚
  if (!isReload) {
    bgOptions.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault(); 
        bgOptions.scrollLeft += e.deltaY; 
      }
    }, { passive: false });
  }

  try {
    // 2. 并行请求背景列表和后端存储的用户配置
    const [bgRes, profRes] = await Promise.all([
      fetch(`/api/backgrounds`),
      fetch(`/api/user-profile`)
    ]);
    const bgJson = await bgRes.json();
    const profJson = await profRes.json();

    if (bgJson.ok && bgJson.data) {
      const newFiles = bgJson.data;
      const newFilesStr = [...newFiles].sort().join(',');
      const oldFilesStr = [...currentBgFiles].sort().join(',');
      
      // 如果文件列表没变，直接跳过渲染，保持现有 DOM 状态
      if (isReload && newFilesStr === oldFilesStr) return;
      
      console.log(isReload ? "检测到背景文件夹更新，正在同步..." : "初始化背景列表...");
      currentBgFiles = newFiles;

      // 获取后端记录的背景状态
      let savedBackground = profJson?.data?.background || "";

      // 验证保存的背景是否依然可用（防止被删除或改名）
      if (savedBackground && !newFiles.includes(savedBackground)) {
        console.warn("保存的背景文件已被删除或改名，重置状态。");
        savedBackground = "";
        syncBackgroundToBackend(""); // 同步后端清空
        localStorage.removeItem('ticketStyle'); // 同步前端清空
      } else if (savedBackground) {
        localStorage.setItem('ticketStyle', savedBackground); // 保证其他模块的兼容性
      }
      
      // 清空容器（注意：这会把 highlightBar 也删掉）
      bgOptions.innerHTML = ''; 
      highlightBar = null; // 重置变量以便重新创建

      // 重新生成图片列表
      newFiles.forEach(filename => {
        const img = document.createElement('img');
        img.src = `/api/backgrounds/thumb/${filename}`;
        img.setAttribute('data-bg', filename); 
        img.className = 'ticketstyle-option';
        img.alt = 'background';
        bgOptions.appendChild(img);
      });

      // 重新执行包装逻辑，传入保存的背景作为目标
      setupOptionsUI(bgOptions, savedBackground);
    }
  } catch (e) {
    if (!isReload) console.warn("获取背景列表失败:", e);
  }
}

/**
 * 内部辅助：为生成的图片添加包装层、文件名、下划线、蓝条和事件
 */
function setupOptionsUI(container, lastSelectedKey) {
  const styleOptions = container.querySelectorAll('.ticketstyle-option');
  if (!styleOptions.length) return;

  let targetToReSelect = null;

  styleOptions.forEach(img => {
    const key = img.getAttribute('data-bg');
    const wrap = document.createElement('div');
    wrap.className = 'ticketstyle-wrap';
    wrap.setAttribute('data-style', key);
    
    // 如果这个文件就是之前选中的，标记它
    if (key === lastSelectedKey) {
      targetToReSelect = wrap;
    }

    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    // --- 新增：插入截断后的文件名 ---
    const nameDiv = document.createElement('div');
    nameDiv.className = 'ticketstyle-filename';
    nameDiv.textContent = formatBgDisplayName(key);
    wrap.appendChild(nameDiv);

    const underline = document.createElement('div');
    underline.className = 'ticketstyle-underline';
    wrap.appendChild(underline);

    // 点击事件逻辑
    wrap.addEventListener('click', () => {
      const isSelected = wrap.classList.contains('selected');

      if (isSelected) {
        // 取消选中
        wrap.classList.remove('selected');
        localStorage.removeItem('ticketStyle');
        setTicketBgVisible(false);
        fadeHighlight(false);
        syncBackgroundToBackend(""); // 同步为空
      } else {
        // 选中新对象
        const hasPrev = !!document.querySelector('.ticketstyle-wrap.selected');
        setTicketStyle(key); // 内部会处理 class 切换
        setTicketBgVisible(true);
        positionHighlight(wrap, !hasPrev); // 如果之前没选中，用淡入；否则平移
        if (!hasPrev) fadeHighlight(true);
        syncBackgroundToBackend(key); // 同步选中的文件名
      }
    });
  });

  // 创建高亮蓝条
  if (!highlightBar) {
    highlightBar = document.createElement('div');
    highlightBar.className = 'ticketstyle-highlight';
    container.appendChild(highlightBar);
    highlightBar.style.pointerEvents = 'none';
    highlightBar.style.opacity = '0';
  }

  // --- 状态寻回与丢失处理 ---
  if (targetToReSelect) {
    // 情况 A：选中的文件依然存在
    applyTicketStyle(lastSelectedKey); 
    // 延迟渲染蓝条，确保 DOM 布局已计算
    requestAnimationFrame(() => {
      positionHighlight(targetToReSelect, true);
      highlightBar.style.opacity = '1';
    });
  } else {
    // 情况 B：选中的文件被删了，或者之前就没选
    if (lastSelectedKey) {
      console.log("原选中背景已不存在，重置为空白状态。");
      localStorage.removeItem('ticketStyle');
    }
    setTicketBgVisible(false);
    highlightBar.style.opacity = '0';
  }

  // 挂载全局钩子
  window.__ticketHighlightBar = highlightBar;
  window.__getTicketStyleWrap = () => document.querySelector('.ticketstyle-wrap.selected');
  window.__renderTicketHighlight = (imm = false) => {
    const w = window.__getTicketStyleWrap();
    if (w) positionHighlight(w, imm);
  };
}

// ===================== 启动轮询机制 =====================
// 首次加载
initDynamicBackgrounds(false);

// 每 2 秒检查一次后端文件夹与状态
setInterval(() => {
  initDynamicBackgrounds(true);
}, 2000);

/* ===================== 定位与辅助函数 ===================== */
function getUnderlineInset() {
  const bgOptions = document.querySelector('.background-options');
  if (!bgOptions) return 0;
  const v = getComputedStyle(bgOptions).getPropertyValue('--underline-inset').trim();
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function positionHighlight(targetWrap, immediate = false) {
  if (!highlightBar || !targetWrap) return;
  const bgOptions = document.querySelector('.background-options');
  const inset = getUnderlineInset();
  const left = targetWrap.offsetLeft + inset;
  const width = Math.max(0, targetWrap.offsetWidth - inset * 2);

  if (immediate) {
    const prevTransition = highlightBar.style.transition;
    highlightBar.style.transition = 'none';
    highlightBar.style.left = `${left}px`;
    highlightBar.style.width = `${width}px`;
    void highlightBar.offsetWidth; // 强制重绘
    highlightBar.style.transition = prevTransition;
  } else {
    highlightBar.style.left = `${left}px`;
    highlightBar.style.width = `${width}px`;
  }
}
/* ===================== UI CTRL ===================== */
(() => {
  const labelTabs = Array.from(document.querySelectorAll('.label-tab'));

  // — 每页的显示方式：settings=grid，其它=flex（不改你的规则）
  const displayOf = (el) => el.classList.contains('settings') ? 'grid' : 'flex';

  // — 找页 & 名称
  const pageByName = (name) => document.querySelector(`.page.${name}`);
  const pageName = (el) => el ? (['red2015','red2009','red1998','lost','settings'].find(c => el.classList.contains(c)) || null) : null;
  const visiblePage = () => Array.from(document.querySelectorAll('.page')).find(p => getComputedStyle(p).display !== 'none') || null;

  // — 方向（决定上下浮动）
  // 标签从上到下的顺序；目标在下 → 页面往下翻，目标在上 → 往上翻
  const PAGE_ORDER = ['red2015', 'red2009', 'red1998', 'lost', 'settings'];
  function getDirection(from, to) {
    if (!from) return 'down';
    const a = PAGE_ORDER.indexOf(from);
    const b = PAGE_ORDER.indexOf(to);
    if (a < 0 || b < 0) return 'down';
    return b > a ? 'down' : 'up';
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // —— 动画参数
  const OUT_MS = 150;      // 旧页淡出
  const IN_MS  = 150;      // 新页淡入
  const DIST   = 15;       // 上下浮动距离 px

  // —— 对整个 page 动画：不动布局属性，只改 opacity/transform
  function setupAnim(el) {
    el.style.willChange = 'opacity, transform';
    el.style.backfaceVisibility = 'hidden';
    el.style.transform = 'translateZ(0)'; // 抗抖
  }
  function clearAnim(el) {
    el.style.transition = '';
    el.style.opacity = '';
    el.style.transform = '';
    el.style.willChange = '';
    el.style.backfaceVisibility = '';
  }

  async function switchPage(targetClass) {
    if (!targetClass) return;

    const toEl = pageByName(targetClass);
    if (!toEl) return;

    let fromEl = visiblePage();
    const fromName = pageName(fromEl);
    const toName   = targetClass;

    // 同页就跳过
    if (fromEl === toEl) return;

    // 初始化场景：无旧页，则直接亮 red2015 或目标页（做个轻微淡入）
    if (!fromEl) {
      // 关掉其它，只亮目标
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
      toEl.style.display = displayOf(toEl);

      setupAnim(toEl);
      toEl.style.transition = `opacity ${IN_MS}ms ease, transform ${IN_MS}ms ease`;
      // 入场方向（无 from，按既定规则算）
      const dir = getDirection(null, toName);
      const inDY = (dir === 'up') ? -DIST : DIST; // 从上/下往中
      toEl.style.opacity = '0';
      toEl.style.transform = `translateY(${inDY}px)`;
      // 触发
      void toEl.offsetHeight;
      requestAnimationFrame(() => {
        toEl.style.opacity = '1';
        toEl.style.transform = 'translateY(0)';
      });
      setTimeout(() => clearAnim(toEl), IN_MS + 30);
      return;
    }

    // 正常切页：先让旧页淡出，再在同一帧隐藏旧页&亮新页，然后淡入新页
    const dir     = getDirection(fromName, toName);
    const outDY   = (dir === 'up') ? -DIST : DIST; // 旧页往上/下退出
    const inDY    = -outDY;                        // 新页从反方向进入

    // A) 旧页出场
    setupAnim(fromEl);
    fromEl.style.transition = `opacity ${OUT_MS}ms ease, transform ${OUT_MS}ms ease`;
    fromEl.style.opacity = '1';
    fromEl.style.transform = 'translateY(0)';
    // 下一帧开始出场
    requestAnimationFrame(() => {
      fromEl.style.opacity = '0';
      fromEl.style.transform = `translateY(${outDY}px)`;
    });
    await sleep(OUT_MS);

    // B) 同一帧：隐藏旧页、显示新页（避免“没有任何页显示”的空窗）
    fromEl.style.display = 'none';
    clearAnim(fromEl);

    toEl.style.display = displayOf(toEl);
    setupAnim(toEl);
    toEl.style.transition = `opacity ${IN_MS}ms ease, transform ${IN_MS}ms ease`;
    toEl.style.opacity = '0';
    toEl.style.transform = `translateY(${inDY}px)`;
    // 触发
    void toEl.offsetHeight;
    requestAnimationFrame(() => {
      toEl.style.opacity = '1';
      toEl.style.transform = 'translateY(0)';
    });
    await sleep(IN_MS);
    clearAnim(toEl);
  }

  // —— 选中标签（页面专属逻辑保留；仅把 settings 分支改为触发蓝条渲染）
  function setActiveTab(targetTab) {
    labelTabs.forEach(tab => {
      tab.classList.toggle('active', tab === targetTab);
    });

    const targetClass = targetTab.getAttribute('data-target');
    if (targetClass) switchPage(targetClass);

    // 切到 settings：交给全局的 page-switched 监听去调 __renderTicketHighlight
    if (targetClass === 'red2015') {
      const tryRefresh = () => {
        if (typeof window.refreshRed2015Previews === 'function') {
          window.refreshRed2015Previews();
        } else {
          ['input-name','input-id','input-idtype','input-station','input-classnum','input-topnum','input-botnum']
            .forEach(id => document.getElementById(id)?.dispatchEvent(new Event('preview-refresh')));
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(tryRefresh));
    }

    window.dispatchEvent(new CustomEvent('page-switched', { detail: { page: targetClass }}));
  }

  // —— 主题驱动：只负责 z-index（不动你的实现）
  function applyThemeForLabels(isDark) {
    const zLight = [9, 7, 5, 3, 1];
    const zDark  = [1, 3, 5, 7, 9];
    const zTable = isDark ? zDark : zLight;

    labelTabs.forEach((tab, i) => {
      const zImg = zTable[i] ?? (isDark ? 1 + i * 2 : 7 - i * 2);
      tab.style.zIndex = zImg;
    });
    document.querySelectorAll('.label-text').forEach(el => (el.style.zIndex = 20));
  }
  window.applyThemeForLabels = applyThemeForLabels;

  // —— 绑定 & 初始化（强制默认激活 red2015）
  if (labelTabs.length) {
    labelTabs.forEach(tab => tab.addEventListener('click', () => setActiveTab(tab)));

    const themeHref =
      (document.getElementById('theme-css')?.href) ||
      (document.querySelector('link[href*="styleblack.css"]')?.href) || '';
    const isDark = /styleblack\.css/i.test(themeHref);
    applyThemeForLabels(isDark);

    // 先确保 red2015 可见（避免“无页显示”导致的 UI 崩）
    const p2015 = pageByName('red2015');
    if (p2015) {
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
      p2015.style.display = displayOf(p2015);
    }

    // 激活 red2015 对应的标签（若不存在，就用第一个）
    const initTab =
      labelTabs.find(t => t.getAttribute('data-target') === 'red2015') ||
      labelTabs[0];
    if (initTab) setActiveTab(initTab);
  }
})();

/* ===================== 输入建议浮窗（宽度稳定，高度≤210px） ===================== */
function attachSmartList(input, dataSource) {
  // —— 确保存在定位容器 ——
  let wrapper = input.parentElement;
  const cs = getComputedStyle(wrapper);
  const needWrap = wrapper === document.body || wrapper === document.documentElement;

  if (cs.position === 'static' || needWrap) {
    const w = document.createElement('div');
    w.className = 'smartlist-wrap';
    w.style.position = 'relative';
    w.style.display = 'inline-block';
    wrapper.insertBefore(w, input);
    w.appendChild(input);
    wrapper = w;
  } else if (cs.position === 'static') {
    wrapper.style.position = 'relative';
  }

  // —— 建立浮窗 ——
  const dropdown = document.createElement('div');
  dropdown.className = 'smartlist';
  Object.assign(dropdown.style, {
    position: 'absolute',
    left: '0',
    top: 'calc(100% + 3px)',
    width: input.offsetWidth + 'px', // 初始宽度固定为当前 input 宽
    maxHeight: '200px',
    overflowY: 'auto',
    boxSizing: 'border-box',
    visibility: 'hidden',
    display: 'none',
    transform: 'none',               // 防止继承父层 transform 缩放
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    zIndex: 9999
  });
  wrapper.appendChild(dropdown);

  let fixedWidth = input.offsetWidth; // 记录固定宽度基准

  // —— 宽度同步逻辑（在真正 resize 时更新） ——
  function syncWidth(force = false) {
    const current = input.offsetWidth;
    if (force || current !== fixedWidth) {
      fixedWidth = current;
      dropdown.style.width = fixedWidth + 'px';
    }
  }

  // —— 渲染匹配列表 ——
  function renderList(value = '') {
    dropdown.innerHTML = '';
    const q = value.toLowerCase();
    const matches = dataSource.filter(item => item.toLowerCase().includes(q));

    for (const item of matches) {
      const div = document.createElement('div');
      div.className = 'smartlist-item';
      div.textContent = item;
      div.onclick = () => {
        input.value = item;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        hideDropdown();
      };
      dropdown.appendChild(div);
    }

    syncWidth();
    matches.length ? showDropdown() : hideDropdown();
  }

  function showDropdown() {
    syncWidth();
    dropdown.style.visibility = 'visible';
    dropdown.style.display = 'block';
    requestAnimationFrame(() => {
      dropdown.style.opacity = '1';
      dropdown.style.transform = 'translateY(0)';
    });
  }

  function hideDropdown() {
    dropdown.style.opacity = '0';
    dropdown.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      dropdown.style.display = 'none';
      dropdown.style.visibility = 'hidden';
    }, 150);
  }

  // —— 输入框事件绑定 ——
  input.addEventListener('input', () => renderList(input.value.trim()));
  input.addEventListener('focus', () => renderList(input.value.trim()));
  input.addEventListener('click', () => renderList(input.value.trim()));
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab' || e.key === 'Escape') hideDropdown();
  });
  input.addEventListener('blur', () => setTimeout(hideDropdown, 100));

  // —— 点击外部关闭 ——
  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && e.target !== input) hideDropdown();
  });

  // —— 窗口变化时再同步一次宽度 —— 
  window.addEventListener('resize', () => syncWidth(true));
}

/* ===== 全局调用（smartlist） ===== */
window.addEventListener('load', () => {
  const sources = {
    seattypes: window.seatTypeList,
    visatypes: window.visaTypeList,
    limitation: window.limitList,
    limitold: window.limitListold,
    seattypesold: window.seatTypeListold,
    seatOther: window.seatother
  };

  document.querySelectorAll('input[list]').forEach(input => {
    const id = input.getAttribute('list');
    const src = sources[id];
    if (Array.isArray(src) && src.length) attachSmartList(input, src);
  });
});

/* ===================== 切到 settings 时，等布局稳定再渲蓝条 ===================== */
function whenSettingsReady(cb, timeout = 800) {
  const deadline = performance.now() + timeout;
  (function loop() {
    const cont = document.querySelector('.background-options');
    const wrap = window.__getTicketStyleWrap?.();
    const shown = cont && getComputedStyle(cont).display !== 'none';
    const ok = shown && cont.offsetWidth > 0 && wrap && wrap.offsetWidth > 0;
    if (ok || performance.now() > deadline) {
      requestAnimationFrame(cb);
    } else {
      requestAnimationFrame(loop);
    }
  })();
}

window.addEventListener('page-switched', (e) => {
  if (e?.detail?.page === 'settings') {
    whenSettingsReady(() => window.__renderTicketHighlight(true));
  }
});

}); // ← DOMContentLoaded 结束

/* ===================== 导出核心 ===================== */
(() => {
  const PAGES = [
    { kind: 'red2015', pageSel: '.page.red2015', previewSel: '#preview' },
    { kind: 'red2009', pageSel: '.page.red2009', previewSel: '#preview' },
    { kind: 'red1998', pageSel: '.page.red1998', previewSel: '#preview_1998' },
  ];

  function getActivePage() {
    for (const cfg of PAGES) {
      const pageEl = document.querySelector(cfg.pageSel);
      if (!pageEl) continue;
      if (getComputedStyle(pageEl).display === 'none') continue;
      const previewEl = pageEl.querySelector(cfg.previewSel);
      if (!previewEl) continue;
      return { ...cfg, pageEl, previewEl };
    }
    return null;
  }

  function getBottomNumFilename(pageEl) {
    const pick = (sel) => {
      const el = pageEl.querySelector(sel);
      const v = el && ('value' in el ? el.value : el.textContent);
      return (v && String(v).trim()) || '';
    };

    let base =
      pick('[id^="input-botnum"]') ||
      pick('[id^="input-bottomnum"]') ||
      pick('input[name="botnum"]') ||
      pick('input[name="bottomnum"]') ||
      pick('input[id*="botnum"]') ||
      pick('input[id*="bottomnum"]');

    if (!base) {
      const p1 = pick('[id^="bot-part1"]');
      const p2 = pick('[id^="bot-part2"]');
      const p3 = pick('[id^="bot-part3"]');
      const p4 = pick('[id^="bot-part4"]');
      const p5 = pick('[id^="bot-part5"]');
      if (p1 || p2 || p3 || p4 || p5) {
        base = [p1, p2, p3, p4, p5].filter(Boolean).join('-');
      }
    }

    if (!base) {
      const prev = pageEl.querySelector(
        '[id^="preview-botnum"], .preview-botnum, ' +
        '[id^="preview-bottomnum"], .preview-bottomnum, ' +
        '[data-botnum], [data-bottomnum]'
      );
      base =
        (prev && (prev.textContent?.trim() ||
                  prev.getAttribute('data-botnum') ||
                  prev.getAttribute('data-bottomnum'))) || '';
    }

    base = (base || '').replace(/\s+/g, ' ').trim();
    base = base.replace(/[\\/:*?"<>|]+/g, '');
    if (!base) return null;
    return base + '.png';
  }

  async function ensureHtml2Canvas() {
    if (window.html2canvas) return window.html2canvas;
    const src = '/static/html2canvas.min.js';
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`html2canvas 加载失败（缺少本地文件 ${src}，请检查安装完整性）`));
      document.head.appendChild(s);
    });
    if (!window.html2canvas) {
      throw new Error(`html2canvas 加载后未定义（本地文件 ${src} 可能已损坏）`);
    }
    return window.html2canvas;
  }

  function pickRefImage(root) {
    // 背景为空时 src="" 也会命中 [src]，但它没有实际像素，会让导出倍率退化成 1
    const bg = root.querySelector('.ticket-bg[src]');
    if (bg && bg.naturalWidth) return bg;
    return root.querySelector('#arrow2015[src], #arrow2009[src], #arrow2009_1998[src]') || bg;
  }

  function computeExportScale(root) {
    const ref = pickRefImage(root);
    if (!ref || !ref.naturalWidth) return 1;
    const rect = ref.getBoundingClientRect();
    const w = rect.width  || 1;
    const h = rect.height || 1;
    const rw = ref.naturalWidth  / w;
    const rh = ref.naturalHeight ? (ref.naturalHeight / h) : rw;
    return Math.min(rw, rh);
  }

  // 加载背景图，返回 HTMLImageElement（跨域处理）
  function loadBackgroundImage(bgEl) {
    return new Promise((resolve, reject) => {
      if (!bgEl || !bgEl.src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = bgEl.src;
    });
  }

  // 导出截图共用的 CSS 归一化规则（碳带模式额外隐藏背景图层）
  function buildExportStyle(rootSel, deltaCSS, hideBg) {
    return `
      ${rootSel},
      ${rootSel} #preview,
      ${rootSel} #preview_1998,
      ${rootSel} .preview {
        border-radius: 0 !important;
        box-shadow: none !important;
        overflow: hidden !important;
      }
      ${hideBg ? `
      /* 碳带模式：隐藏背景图 */
      ${rootSel} .ticket-bg {
        visibility: hidden !important;
      }` : ''}
      ${rootSel} .ticket-bg,
      ${rootSel} #arrow2015,
      ${rootSel} #border-img,
      ${rootSel} #date-img,
      ${rootSel} #rmbold,
      ${rootSel} #arrow2009,
      ${rootSel} #arrow2009_1998 {
        opacity: 1 !important;
        filter: none !important;
        mix-blend-mode: normal !important;
        transition: none !important;
      }
      ${rootSel} [class^="preview-"]:not(.preview-topnum),
      ${rootSel} [class*=" preview-"]:not(.preview-topnum),
      ${rootSel} [id^="preview-"]:not([id="preview-topnum"]):not([id="preview-topnum_1998"]),
      ${rootSel} [data-preview]:not([data-preview="topnum"]) {
        color: #000 !important;
        -webkit-text-fill-color: #000 !important;
        fill: #000 !important;
        stroke: #000 !important;
        filter: none !important;
        mix-blend-mode: normal !important;
      }
      ${rootSel} #preview-topnum,
      ${rootSel} #preview-topnum_1998,
      ${rootSel} .preview-topnum,
      ${rootSel} [data-preview="topnum"] {
        color: red !important;
        -webkit-text-fill-color: red !important;
        fill: red !important;
        stroke: red !important;
        filter: none !important;
      }
      ${rootSel}, ${rootSel} * {
        -webkit-font-smoothing: antialiased;
        text-rendering: geometricPrecision;
      }
      ${rootSel} #date-img,
      ${rootSel} #border-img {
        transform: translateY(${deltaCSS}px) !important;
        transform-origin: 0 0 !important;
      }
    `;
  }

  // 统一的 html2canvas 截图（onclone 注入归一化样式）
  function captureNode(node, mark, scale, deltaCSS, hideBg) {
    return html2canvas(node, {
      backgroundColor: null,
      scale,
      useCORS: true,
      logging: false,
      removeContainer: true,
      scrollX: 0,
      scrollY: 0,
      onclone(doc) {
        const style = doc.createElement('style');
        style.textContent = buildExportStyle(`[${mark}="1"]`, deltaCSS, hideBg);
        doc.head.appendChild(style);
      }
    });
  }

  async function renderToBlob(node) {
    const html2canvas = await ensureHtml2Canvas();
    const mark = 'data-export-target';
    node.setAttribute(mark, '1');

    const scale = computeExportScale(node);
    const deltaCSS = 3 / (Number(scale) || 1);

    // 检查是否需要碳带效果
    const useEffect = document.getElementById('activeblur')?.checked ?? false;

    // ── 分支1：不启用碳带效果 → 完整截图原样导出 ──
    if (!useEffect) {
      const canvas = await captureNode(node, mark, scale, deltaCSS, false);
      node.removeAttribute(mark);
      return await new Promise(res => canvas.toBlob(b => res(b), 'image/png'));
    }

    // ── 分支2：启用碳带效果 → 分离前景/背景，交给后端处理 ──
    // 获取背景图元素
    const bgEl = node.querySelector('.ticket-bg');
    const bgImg = await loadBackgroundImage(bgEl);

    // 截取前景（隐藏背景图）
    const foregroundCanvas = await captureNode(node, mark, scale, deltaCSS, true);
    node.removeAttribute(mark);

    // 前景 → base64
    const fgDataUrl = foregroundCanvas.toDataURL('image/png');

    // 背景 → base64（如果有背景图）
    let bgDataUrl = null;
    if (bgImg) {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = foregroundCanvas.width;
      bgCanvas.height = foregroundCanvas.height;
      const bgCtx = bgCanvas.getContext('2d');
      bgCtx.drawImage(bgImg, 0, 0, foregroundCanvas.width, foregroundCanvas.height);
      bgDataUrl = bgCanvas.toDataURL('image/png');
    }

    // 调用后端合成接口
    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        foreground: fgDataUrl,
        background: bgDataUrl,
      })
    });
    if (!response.ok) {
      throw new Error(`后端碳带处理失败 (${response.status})`);
    }
    return await response.blob();
  }

  async function saveBlobSmart(blob, suggestedName) {
    const safeName = (suggestedName || `ticket_${Date.now()}.png`).replace(/[\\/:*?"<>|]+/g, '');
    try {
      const dir = window.ticketSaveDirHandle || window.__saveDirHandle;
      if (dir && dir.kind === 'directory') {
        let name = safeName, tries = 0;
        while (tries < 3) {
          try {
            const fh = await dir.getFileHandle(name, { create: true });
            const w = await fh.createWritable();
            await w.write(blob);
            await w.close();
            return { ok: true, method: 'dir', path: `${dir.name}/${name}` };
          } catch (e) {
            tries++;
            name = safeName.replace(/\.png$/i, ` (${tries+1}).png`);
            if (tries >= 3) throw e;
          }
        }
      }
    } catch (e) { /* fallback */ }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true, method: 'download', path: safeName };
  }

  window.__exportCore = {
    getActivePage,
    getBottomNumFilename,
    renderToBlob,
    saveBlobSmart,
  };
})();
/* ===================== 提示/错误弹窗 (modal) =====================
 * 统一浮层，用于：导出进度、用户操作提示、以及「预期外错误」提示。
 * 严格复用已有 #export-modal + #notificationblur，不引入 webp 动画。
 * 外观统一：错误与提示使用同一套极简样式（无红框、无图标、无关闭按钮）。
 * 行为差异：
 *   - 提示（__showUITip）  ：自动关闭（默认 ~3s）
 *   - 错误（__showUIError）：常驻，直到用户「点击任意一处」关闭
 * 对外暴露：
 *   window.__exportModal  { openExportModal, updateExportModal, closeExportModal }
 *   window.__showUIError  (msg, opts)  预期外错误提示（常驻 + 点击任意处关闭）
 *   window.__showUITip    (msg, opts)  普通提示（自动关闭）
 *   window.__toast        别名，指向 __showUIError
 */
(() => {
  const DEFAULT_TIP_MS = 3000;
  const MAX_MSG_LEN    = 400;

  function normalizeMsg(input, fallback = '导出中') {
    if (typeof input === 'string') return input;
    if (input && typeof input === 'object') {
      if (typeof input.message === 'string') return input.message;
      try {
        const s = JSON.stringify(input);
        return s.length > 120 ? s.slice(0, 117) + '…' : s;
      } catch {}
    }
    return fallback;
  }

  // 消息做长度裁剪，避免超出弹窗高度
  function clampMsg(msg) {
    const s = normalizeMsg(msg, '发生未知错误');
    return s.length > MAX_MSG_LEN ? s.slice(0, MAX_MSG_LEN - 1) + '…' : s;
  }

  function ensureExportModal() {
    if (document.getElementById('export-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'export-modal';
    modal.innerHTML = `<div class="export-min-body" id="export-modal-msg">导出中</div>`;
    document.body.appendChild(modal);
    centerModalToCard();
    window.addEventListener('resize', centerModalToCard);
    window.addEventListener('scroll', centerModalToCard, { passive: true });
  }

  function toggleTabsOutputsLock(locked) {
    const nodes = document.querySelectorAll('.label-tab, .label-output, .label-text');
    nodes.forEach(el => {
      if (locked) {
        if (el.dataset._pe === undefined)   el.dataset._pe = el.style.pointerEvents || '';
        el.style.pointerEvents = 'none';
      } else {
        el.style.pointerEvents = el.dataset._pe ?? '';
        delete el.dataset._pe;
      }
    });
  }

  function centerModalToCard() {
    const modal = document.getElementById('export-modal');
    if (!modal) return;
    const card = document.querySelector('.card-wrapper');
    if (card) {
      const r = card.getBoundingClientRect();
      modal.style.left = `${r.left + r.width / 2}px`;
      modal.style.top  = `${r.top  + r.height / 2}px`;
    } else {
      modal.style.left = '50%';
      modal.style.top  = '50%';
    }
  }

  function setBlur(on) {
    const blur = document.getElementById('notificationblur');
    if (!blur) return;
    getComputedStyle(blur).opacity;   // 强制读取，保证过渡生效
    blur.style.opacity = on ? '1' : '0';
  }

  // 主入口：统一外观。opts.lock=false 时不锁卡片（错误常驻需可点击关闭）
  function openExportModal(msg = '导出中', opts = {}) {
    ensureExportModal();
    const modal = document.getElementById('export-modal');
    const msgEl = document.getElementById('export-modal-msg');
    if (msgEl) msgEl.textContent = normalizeMsg(msg);
    centerModalToCard();
    if (modal) { void modal.offsetHeight; modal.classList.add('is-open'); }
    setBlur(true);
    // lock:false 时显式解锁：可能此前被「导出中」锁过
    toggleTabsOutputsLock(opts.lock !== false);
  }

  function updateExportModal(msg) {
    const el = document.getElementById('export-modal-msg');
    if (!el) return;
    el.textContent = normalizeMsg(msg, '');
  }

  // —— 自动关闭定时器（全局唯一，连续报错只保留最后一个）——
  let __autoCloseTimer = null;
  function clearAutoClose() {
    if (__autoCloseTimer) { clearTimeout(__autoCloseTimer); __autoCloseTimer = null; }
  }
  function scheduleAutoClose(duration) {
    clearAutoClose();
    if (!duration || duration <= 0) return;
    __autoCloseTimer = setTimeout(() => { __autoCloseTimer = null; closeExportModal(); }, duration);
  }

  function closeExportModal() {
    clearAutoClose();
    removeOutsideClose();
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.remove('is-open');
    setBlur(false);
    toggleTabsOutputsLock(false);
  }

  // —— 「点击任意处关闭」：错误常驻时启用 ——
  let __outsideHandler = null;
  function installOutsideClose() {
    if (__outsideHandler) return;
    __outsideHandler = () => { closeExportModal(); };
    // 捕获阶段监听，且略延迟安装，避免当前这次报错调用本身被立即关掉
    setTimeout(() => {
      if (!__outsideHandler) return;
      window.addEventListener('pointerdown', __outsideHandler, true);
      window.addEventListener('keydown', __outsideHandler, true);   // 任意键也可关闭，便于键盘用户
    }, 0);
  }
  function removeOutsideClose() {
    if (!__outsideHandler) return;
    window.removeEventListener('pointerdown', __outsideHandler, true);
    window.removeEventListener('keydown', __outsideHandler, true);
    __outsideHandler = null;
  }

  // 统一「预期外错误」提示：与普通提示同外观，但常驻，点击任意处关闭
  function showUIError(msg, opts = {}) {
    openExportModal(msg, { lock: false });
    clearAutoClose();                 // 取消自动关闭 → 常驻
    installOutsideClose();            // 点击/按键任意处关闭
    // 同时回传日志，便于事后排查
    try {
      window.__uiLog && window.__uiLog('error', `[UI弹窗] ${clampMsg(msg)}`, { from: opts.from || 'unknown' });
    } catch (_) {}
  }

  // 普通提示弹窗：自动关闭
  function showUITip(msg, opts = {}) {
    const duration = opts.duration == null ? DEFAULT_TIP_MS : opts.duration;
    openExportModal(msg, { lock: opts.lock !== false });
    removeOutsideClose();
    scheduleAutoClose(duration);
  }

  window.__exportModal = { openExportModal, updateExportModal, closeExportModal };
  window.__showUIError = showUIError;
  window.__showUITip   = showUITip;
  window.__toast       = showUIError;   // 别名
})();

/* ===================== 全局未捕获错误兜底 ===================== */
(() => {
  const THROTTLE_MS = 1500;          // 同类错误短时间内只弹一次
  let lastShown = 0;
  let lastKey = '';

  function report(msg, extra) {
    try { window.__uiLog && window.__uiLog('error', `[未捕获] ${msg}`, extra); } catch (_) {}
  }

  function handle(kind, msg, extra) {
    const key = `${kind}:${msg}`;
    const now = Date.now();
    report(msg, extra);
    if (key === lastKey && now - lastShown < THROTTLE_MS) return;   // 节流，避免刷屏
    lastKey = key;
    lastShown = now;
    if (window.__showUIError) window.__showUIError(msg, { from: kind });
  }

  window.addEventListener('error', (ev) => {
    // 资源加载失败（img/script 等）也会触发 error，只在有 message 时处理
    const msg = ev && ev.message ? ev.message : (ev && ev.target && ev.target.src ? `资源加载失败：${ev.target.src}` : '');
    if (!msg) return;
    handle('window.onerror', msg, { filename: ev.filename, lineno: ev.lineno, colno: ev.colno });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev && ev.reason;
    const msg = (r && (r.message || r.error || (typeof r === 'string' ? r : ''))) || '未处理的异步错误';
    handle('unhandledrejection', String(msg), { stack: r && r.stack });
  });

  // 便于排查：暴露手动触发
  window.__reportUIError = (msg, from) => handle(from || 'manual', String(msg), {});
})();

/* ===================== 导出控制器 & UI绑定 (controller) ===================== */
(() => {
  const { getActivePage, getBottomNumFilename, renderToBlob, saveBlobSmart } = window.__exportCore;
  const { openExportModal, updateExportModal, closeExportModal } = window.__exportModal;

  // 导出状态
  let __exportBusy = false;
  let __exportQueued = false;
  let __exportFailMsg = '';

  // 主导出函数
  async function exportCurrent() {
    if (__exportBusy) {
      __exportQueued = true;
      openExportModal('导出中（已排队）');
      return;
    }
    __exportBusy = true;
    openExportModal('导出中');

    const info = getActivePage();
    if (!info || !['red2015','red2009','red1998'].includes(info.kind)) {
      updateExportModal('未找到当前票面，无法导出。');
      __exportBusy = false;
      setTimeout(closeExportModal, 800);
      return;
    }

    try {
      const blob = await renderToBlob(info.previewEl);
      if (!blob) throw new Error('渲染失败');
      const suggested = getBottomNumFilename(info.pageEl);
      const result = await saveBlobSmart(blob, suggested);

      if (result.ok) {
        updateExportModal(result.method === 'dir' ? `已保存到：${result.path}` : `已触发下载：${result.path}`);
        __exportFailMsg = '';
      } else {
        updateExportModal('导出失败');
        __exportFailMsg = '导出失败：未能保存或下载文件';
      }
    } catch (err) {
      console.error(err);
      updateExportModal(`导出失败：${err?.message || '未知错误'}`);
      __exportFailMsg = `导出失败：${err?.message || '未知错误'}`;
      try { window.__uiLog && window.__uiLog('error', __exportFailMsg, { from: 'export' }); } catch (_) {}
    } finally {
      __exportBusy = false;
      if (__exportQueued) {
        __exportQueued = false;
        setTimeout(() => exportCurrent(), 200);
      } else {
        // 成功：短暂展示后自动关闭；失败：切到常驻错误提示（点击任意处关闭）
        const failMsg = __exportFailMsg;
        __exportFailMsg = '';
        setTimeout(() => {
          if (failMsg && window.__showUIError) {
            window.__showUIError(failMsg, { from: 'export' });
          } else {
            closeExportModal();
          }
        }, 700);
      }
    }
  }

  // 绑定导出触发元素（原 label-output 和 label-text）
  function bindExportTriggers() {
    const triggers = [
      ...document.querySelectorAll('.label-output[data-index="5"]'),
      ...document.querySelectorAll('.label-text[data-index="5"], .label-text:not([data-index])')
    ];
    triggers.forEach(el => {
      if (el.__exportBound__) return;
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        exportCurrent();
      });
      el.__exportBound__ = true;
    });
  }

  // 执行绑定（若DOM已存在）
  bindExportTriggers();

  // ----- 打开日志按钮 -----
  let __openLogBusy = false;
  document.getElementById('openlog')?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (__openLogBusy) return;
    __openLogBusy = true;

    try {
      const r = await window.electronAPI.openLogFolder();
      if (r && r.ok) return; // 成功无提示
      const msg = r?.message || '打开失败';
      const path = r?.path ? `\n${r.path}` : '';
      const detail = r?.detail ? `\n${r.detail}` : '';
      openExportModal(`打开日志失败：${msg}${path}${detail}`);
      setTimeout(closeExportModal, 1600);
    } catch (err) {
      openExportModal(`打开日志失败：${err?.message || String(err)}`);
      setTimeout(closeExportModal, 1600);
    } finally {
      __openLogBusy = false;
    }
  });

  // ----- 打开背景图库按钮 -----
  let __openBgBusy = false;
  document.getElementById('openbackground')?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (__openBgBusy) return;
    __openBgBusy = true;

    try {
      const r = await window.electronAPI.openBackgroundFolder();
      if (r && r.ok) return;
      const msg = r?.message || '打开失败';
      const pathText = r?.path ? `\n路径: ${r.path}` : '';
      const detail = r?.detail ? `\n详情: ${r.detail}` : '';
      openExportModal(`打开背景图库失败：${msg}${pathText}${detail}`);
      setTimeout(closeExportModal, 2000);
    } catch (err) {
      openExportModal(`系统错误：${err?.message || String(err)}`);
      setTimeout(closeExportModal, 1600);
    } finally {
      __openBgBusy = false;
    }
  });

  // 对外暴露主函数（可选）
  window.exportCurrent = exportCurrent;
})();

/* ===================== 主题样式选择器（原样保留） ===================== */
(() => {
  const root = document.documentElement;
  const moon = document.getElementById('blackmode');  // 深色
  const sun  = document.getElementById('whitemode');  // 浅色

  const themeLink =
    document.getElementById('theme-css') ||
    document.querySelector('link[href*="stylewhite.css"], link[href*="styleblack.css"]');

  function swapLabelImages(to /* 'black' | 'white' */) {
    const re = /label(?:black|white)\.png(\?.*)?$/i;
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || img.src;
      if (!src || !re.test(src)) return;
      const next = src.replace(re, `label${to}.png$1`);
      if (next !== src) img.setAttribute('src', next);
    });
  }

  function applyThemeVars(mode /* 'dark'|'light' */) {
    const scope = document.querySelector('.card-wrapper') || root;
    const set = (k, v) => scope.style.setProperty(k, v);

    if (mode === 'dark') {
      set('--tab-base-brightness', '1');
      set('--tab-hover-mult', '0.82');
      set('--tab-active-fill', '#222222');
      set('--tab-fallback-filter', 'none');
      set('--tab-shadow', '0 8px 20px rgba(0,0,0,0.22)');
      set('--tab-shadow-hover', '0 12px 28px rgba(0,0,0,0.28)');
      set('--label-text-color', '#9b9b9b');
    } else {
      set('--tab-base-brightness', '0.95');
      set('--tab-hover-mult', '1.08');
      set('--tab-active-fill', '#ffffff');
      set('--tab-fallback-filter', 'invert(1) brightness(1.05)');
      set('--tab-shadow', '0 8px 20px rgba(0,0,0,0.18)');
      set('--tab-shadow-hover', '0 12px 28px rgba(0,0,0,0.22)');
      set('--label-text-color', '#777');
    }
  }

  function setTheme(mode /* 'dark'|'light' */) {
    root.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
    applyThemeVars(mode);

    if (themeLink) themeLink.href = mode === 'dark'
      ? '/static/styleblack.css'
      : '/static/stylewhite.css';

    swapLabelImages(mode === 'dark' ? 'black' : 'white');
    window.applyThemeForLabels?.(mode === 'dark');
    if (mode === 'dark') { moon && (moon.style.display = 'none'); sun && (sun.style.display = 'flex'); }
    else { sun && (sun.style.display = 'none'); moon && (moon.style.display = 'flex'); }
  }

  function detectInitialTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (/styleblack\.css/i.test(themeLink?.href || '')) return 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  setTheme(detectInitialTheme());
  moon?.addEventListener('click', () => setTheme('dark'));
  sun?.addEventListener('click',  () => setTheme('light'));
})();

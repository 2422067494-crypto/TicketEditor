(() => {
  const CSS = `
    html, body {
      overflow: hidden !important;
      overscroll-behavior: none !important;
      -ms-overflow-style: none !important;
      scrollbar-width: none !important;
    }
    html::-webkit-scrollbar,
    body::-webkit-scrollbar {
      width: 0 !important;
      height: 0 !important;
      display: none !important;
      background: transparent !important;
    }
  `;

  const STYLE_ID = '__hide_body_scroll__';
  function inject(doc) {
    if (doc.getElementById(STYLE_ID)) return;
    const tag = doc.createElement('style');
    tag.id = STYLE_ID;
    tag.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(tag);
  }

  const boot = () => {
    if (document.documentElement) inject(document);
    else setTimeout(boot, 0);
  };
  boot();
})();

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appWindow', {
  // content size = 我们的唯一真尺寸
  getContentSize: () => ipcRenderer.invoke('get-content-size'),
  resizeContentTo: (w, h) => ipcRenderer.send('resize-content-to', { width: w, height: h }),
  onContentResize: (cb) => ipcRenderer.on('content-size', (_e, wh) => cb && cb(wh)),
  minimize: () => ipcRenderer.send('minimize-window'),
  close:    () => ipcRenderer.send('close-window'),
  onRestoreAnimation: (cb) => ipcRenderer.on('window-restore-animation', () => cb && cb()),
});

contextBridge.exposeInMainWorld('electronAPI', {
  pickDirectory: (startIn) => ipcRenderer.invoke('pick-directory', startIn || null),
  getDefaultSaveDir: () => ipcRenderer.invoke('get-default-save-dir'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openLogFolder: () => ipcRenderer.invoke('open-log-folder'),
  openBackgroundFolder: () => ipcRenderer.invoke('open-background-folder'),
  revealInFolder: (absPath) => ipcRenderer.invoke('reveal-path', absPath),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  getAnalysisPort: () => ipcRenderer.invoke('get-analysis-port'),
});

contextBridge.exposeInMainWorld('teVersion', {
  onInfo: (cb) => ipcRenderer.on('version-info', (_e, data) => cb(data)),
  get: () => ipcRenderer.invoke('version:get'),
});
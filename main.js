// main.js
const { app, BrowserWindow, ipcMain, dialog, shell, net } = require('electron');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

/* ====== 便携化：优先将 userData（缓存/数据）放在程序目录 ====== */
(() => {
    const exeDir = path.dirname(app.getPath('exe'));
    const userDataPath = path.join(exeDir, 'userData');

    try {
        fs.mkdirSync(userDataPath, { recursive: true });
        // 写入测试文件验证权限
        const testFile = path.join(userDataPath, '.write-test');
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);

        app.setPath('userData', userDataPath);
        console.log('[userData] 便携模式，数据目录:', userDataPath);
    } catch (e) {
        console.warn(
            '[userData] 无法写入程序目录，回退到默认 AppData。',
            '请勿将程序放置在系统保护目录（如 Program Files）或只读介质中。'
        );
        // 不调用 app.setPath，Electron 会自动使用系统默认路径
    }
})();

let win;
let dataProc, analysisProc;
let dataPort, analysisPort;
let allowResize = false;

/* ====== 版本检查（主进程拉取，不受 CORS） ====== */
const VERSION_URL = 'https://redticketeditor.pages.dev/version.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = net.request(url);
    let raw = '';

    req.on('response', (res) => {
      res.on('data', (c) => (raw += c.toString('utf8')));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function getRemoteVersion() {
  const j = await fetchJson(VERSION_URL);
  return (j && typeof j.version === 'string') ? j.version.trim() : null;
}

/* ====== 读取首行端口号的启动器 ====== */
function launchPythonDynamic(script, { name }) {
  return new Promise((resolve, reject) => {
    const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
    const scriptPath = path.join(baseDir, script);
    const pyExe = app.isPackaged
      ? path.join(baseDir, 'python', 'python.exe')
      : 'python';

    const env = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
    const proc = spawn(pyExe, [scriptPath], { cwd: baseDir, windowsHide: true, env });

    let buf = '';
    const onData = (d) => {
      buf += d.toString();

      // 允许两种格式： "__PORT__12345" 或者 “纯数字一行”
      const m = buf.match(/__PORT__\s*(\d{2,5})|\b(?:^|\n)\s*(\d{2,5})\s*(?:\n|$)/);
      const port = m ? parseInt(m[1] || m[2], 10) : NaN;

      if (!Number.isNaN(port)) {
        proc.stdout.off('data', onData);

        // 探活（/ 能回 200 就算就绪）
        const url = `http://127.0.0.1:${port}/`;
        const tryConnect = () => fetch(url).then(
          () => resolve({ proc, port, url }),
          () => setTimeout(tryConnect, 250)
        );
        tryConnect();
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', (d) => console.error(`[${name} ERR]`, d.toString()));
    proc.on('error', reject);
    proc.on('exit', (code) => console.log(`[${name}] exit ${code}`));
  });
}

/* ====== 创建窗口 ====== */
async function createWindow() {
  console.log('[DEBUG] App starting... isPackaged =', app.isPackaged);
  console.log('[DEBUG] resourcesPath =', process.resourcesPath);

  const d = await launchPythonDynamic('data.py', { name: 'data' });
  dataProc = d.proc;
  dataPort = d.port;
  console.log('[DEBUG] data port =', dataPort);

  const a = await launchPythonDynamic('analysis.py', { name: 'analysis' });
  analysisProc = a.proc;
  analysisPort = a.port;
  console.log('[DEBUG] analysis port =', analysisPort);
  console.log('[DEBUG] Creating BrowserWindow...');

  win = new BrowserWindow({
    width: 1260,
    height: 700,
    frame: false,
    transparent: true,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    thickFrame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.on('will-resize', (e) => { if (!allowResize) e.preventDefault(); });
  win.on('maximize', () => { win.unmaximize(); });
  win.on('enter-full-screen', () => { win.setFullScreen(false); });

  win.on('closed', () => {
    console.log('[DEBUG] window closed, cleaning up...');
    try { dataProc?.kill(); } catch {}
    try { analysisProc?.kill(); } catch {}
    app.quit();
  });

  win.on('restore', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('window-restore-animation');
    }
  });

  // 页面加载完成后：注入端口与 CSS；（可选）推送一次版本
  win.webContents.on('did-finish-load', async () => {
    try {
      win.webContents.executeJavaScript(
        `window.__TE_PORTS = { data:${dataPort}, analysis:${analysisPort} };`
      );
    } catch {}

    try {
      win.webContents.insertCSS(`
        html, body { overflow:hidden!important; overscroll-behavior:none!important; }
        ::-webkit-scrollbar { width:0; height:0; }
        html, body, #app-root { width:100%; height:100%; }
      `);
    } catch {}

    // 可选：推送一次（即使前端走 invoke 也不影响）
    const local = app.getVersion();
    let remote = null;
    try { remote = await getRemoteVersion(); } catch {}
    try {
      win.webContents.send('version-info', { local, remote });
    } catch {}
  });

  const entryUrl = `http://127.0.0.1:${dataPort}/?analysis_port=${analysisPort}`;
  win.loadURL(entryUrl);
  //win.webContents.openDevTools({ mode: 'detach' });
}

//浏览器
ipcMain.handle('open-external', async (_evt, url) => {
  // 简单校验，防止奇怪协议
  if (!/^https?:\/\//i.test(url)) throw new Error('Invalid URL');
  await shell.openExternal(url);
  return true;
});

// 打开日志文件夹：优先便携目录（程序目录/resources/ticketeditor/log），否则回退 AppData
ipcMain.handle('open-log-folder', async () => {
  const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
  const portableLogDir = path.join(baseDir, 'ticketeditor', 'log');
  const appDataLogDir = path.join(app.getPath('appData'), 'ticketeditor', 'log');

  const fail = (code, message, pathUsed, detail) => ({
    ok: false,
    code,
    message,
    path: pathUsed,
    detail: detail ? String(detail) : '',
  });

  const isDirectoryAvailable = async (dirPath) => {
    try {
      const st = await fs.promises.stat(dirPath);
      return st.isDirectory();
    } catch {
      return false;
    }
  };

  if (await isDirectoryAvailable(portableLogDir)) {
    try {
      const openErr = await shell.openPath(portableLogDir);
      if (openErr) {
        return fail('OPEN_FAIL', '系统无法打开该文件夹。', portableLogDir, openErr);
      }
      return { ok: true, path: portableLogDir };
    } catch (e) {
      return fail(e.code || 'UNKNOWN', '打开日志文件夹失败。', portableLogDir, e.message);
    }
  }

  const logDir = appDataLogDir;
  try {
    const st = await fs.promises.stat(logDir).catch((e) => { throw e; });
    if (!st.isDirectory()) {
      return fail('NOT_DIR', '日志路径不是文件夹。', logDir);
    }
    await fs.promises.access(logDir, fs.constants.R_OK).catch((e) => { throw e; });
    const openErr = await shell.openPath(logDir);
    if (openErr) {
      return fail('OPEN_FAIL', '系统无法打开该文件夹。', logDir, openErr);
    }
    return { ok: true, path: logDir };
  } catch (e) {
    const code = e?.code || 'UNKNOWN';
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return fail(code, '日志文件夹不存在。', logDir, e?.message);
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return fail(code, '没有权限访问日志文件夹。', logDir, e?.message);
    }
    return fail(code, '打开日志文件夹失败。', logDir, e?.message || e);
  }
});

ipcMain.handle('open-background-folder', async () => {
  const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
  const bgDir = path.join(baseDir, 'static', 'Background');

  const fail = (code, message, detail) => ({
    ok: false,
    code,
    message,
    path: bgDir,
    detail: detail ? String(detail) : '',
  });

  try {
    const st = await fs.promises.stat(bgDir).catch((e) => { throw e; });
    if (!st.isDirectory()) {
      return fail('NOT_DIR', '背景图库路径不是文件夹。');
    }
    const openErr = await shell.openPath(bgDir);
    if (openErr) {
      return fail('OPEN_FAIL', '系统无法打开该文件夹。', openErr);
    }
    return { ok: true, path: bgDir };
  } catch (e) {
    const code = e?.code || 'UNKNOWN';
    if (code === 'ENOENT') {
      return fail(code, '背景文件夹不存在。', `请检查路径: ${bgDir}`);
    }
    return fail(code, '打开背景文件夹失败。', e?.message || e);
  }
});

/* ====== IPC：窗口尺寸与系统对话框 ====== */
ipcMain.handle('get-content-size', () =>
  win && !win.isDestroyed() ? win.getContentSize() : [800, 600]
);

ipcMain.on('resize-content-to', (_evt, { width, height }) => {
  if (!win || win.isDestroyed()) return;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const minW = 360, maxW = 10000;
  const minH = 200;

  const w = Math.round(clamp(width, minW, maxW));
  const h = Math.round(Math.max(height, minH));

  allowResize = true;
  try { win.setContentSize(w, h); } finally { allowResize = false; }

  const [cw, ch] = win.getContentSize();
  win.webContents.send('content-size', { width: cw, height: ch });
});

ipcMain.on('minimize-window', () => {
  if (win && !win.isDestroyed()) win.minimize();
});

ipcMain.on('close-window', () => {
  if (win && !win.isDestroyed()) win.close();
});

ipcMain.handle('pick-directory', async (_evt, startIn) => {
  let startPath = null;
  // 仅当传入的路径真实存在且为目录时才作为默认路径，否则不指定
  if (typeof startIn === 'string' && fs.existsSync(startIn)) {
    const st = fs.statSync(startIn);
    if (st.isDirectory()) {
      startPath = startIn;
    }
  }

  const options = {
    title: '选择保存目录',
    properties: ['openDirectory', 'createDirectory'],
  };
  if (startPath) {
    options.defaultPath = startPath;
  }

  const res = await dialog.showOpenDialog(options);
  if (res.canceled || !res.filePaths?.[0]) return null;
  return res.filePaths[0];
});

ipcMain.handle('get-default-save-dir', async () => {
  return app.getPath('desktop');
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(ignore, options || {});
  }
});

ipcMain.handle('get-analysis-port', () => {
  return analysisPort;
});

/* ====== IPC：前端主动拉取版本 ====== */
ipcMain.handle('version:get', async () => {
  const local = app.getVersion();
  let remote = null;
  try { remote = await getRemoteVersion(); } catch {}
  return { local, remote };
});

/* ====== 生命周期 ====== */
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  console.log('[DEBUG] All windows closed');
  setTimeout(() => {
    try { dataProc?.kill(); } catch {}
    try { analysisProc?.kill(); } catch {}
    app.quit();
  }, 2000);
});
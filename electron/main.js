// ============================================================
// Electron 主进程 — 管理后端 Python 进程与前端窗口
// ============================================================
const { app, BrowserWindow, dialog, shell, Menu, Tray } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');
// ---- 路径工具 ----
log('main.js starting...');
log(`app.isPackaged = ${app.isPackaged}`);
const isPackaged = app.isPackaged;
const resourcesPath = isPackaged
  ? process.resourcesPath
  : path.join(__dirname);

const pythonDir = isPackaged
  ? path.join(resourcesPath, 'python-embed')
  : path.join(__dirname, 'python-embed');

const pythonExe = path.join(pythonDir, 'python.exe');

const backendDir = isPackaged
  ? path.join(resourcesPath, 'backend')
  : path.join(__dirname, '..', 'backend');

const frontendDist = isPackaged
  ? path.join(resourcesPath, 'frontend-dist')
  : path.join(__dirname, '..', 'frontend', 'dist');

const BACKEND_PORT = 8001; // 默认端口；如果被占用会自动选择空闲端口
const BACKEND_URL = () => `http://127.0.0.1:${activePort}`;

let activePort = null;
let pythonProcess = null;
let mainWindow = null;
let splashWindow = null;
let tray = null;
let isQuitting = false;

// ---- 日志 ----
let logFile = null;
function getLogFile() {
  if (!logFile) {
    try {
      logFile = path.join(app.getPath('userData'), 'app.log');
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
    } catch (_) { logFile = path.join(__dirname, 'app.log'); }
  }
  return logFile;
}
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(getLogFile(), line + '\n');
  } catch (_) {}
}

// ---- 检测端口是否可用 ----
function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => { srv.close(); resolve(true); });
    srv.listen(port, '127.0.0.1');
  });
}

// ---- 选择一个空闲端口 ----
async function findFreePort(preferred) {
  for (let port = preferred; port < preferred + 200; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error('未找到可用的空闲端口');
}

// ---- 等待后端就绪 ----
function waitForBackend(url, timeoutMs = 60000) {
  const http = require('http');
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error('后端启动超时'));
      }
      const req = http.get(`${url}/api/health`, (res) => {
        if (res.statusCode === 200) return resolve();
        setTimeout(check, 500);
      });
      req.on('error', () => setTimeout(check, 500));
      req.setTimeout(2000, () => { req.destroy(); setTimeout(check, 500); });
    };
    check();
  });
}

// ---- 启动后端进程 ----
function startBackend() {
  return new Promise((resolve, reject) => {
    log(`Starting backend: ${pythonExe}`);
    log(`Backend dir: ${backendDir}`);
    log(`Frontend dist: ${frontendDist}`);

    // 设置环境变量让后端知道前端静态文件位置
    const env = {
      ...process.env,
      PYTHONPATH: backendDir,
      FRONTEND_DIST: frontendDist,
      // 数据文件存放到用户可写目录
      TIMETABLE_DATA_DIR: path.join(app.getPath('userData'), 'data'),
    };

    // 确保数据目录存在
    const dataDir = env.TIMETABLE_DATA_DIR;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const serverScript = path.join(backendDir, 'server.py');

    pythonProcess = spawn(pythonExe, [
      '-u', serverScript,
      '--host', '127.0.0.1',
      '--port', String(activePort),
      '--frontend-dist', frontendDist,
    ], {
      cwd: backendDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    pythonProcess.stdout.on('data', (d) => log(`[py:out] ${d.toString().trim()}`));
    pythonProcess.stderr.on('data', (d) => log(`[py:err] ${d.toString().trim()}`));

    pythonProcess.on('error', (err) => {
      log(`Python process error: ${err.message}`);
      reject(err);
    });

    pythonProcess.on('exit', (code) => {
      log(`Python process exited with code ${code}`);
      pythonProcess = null;
      if (!isQuitting) {
        dialog.showErrorBox('后端异常退出', `Python 后端进程异常退出 (code: ${code})。\n应用即将关闭。`);
        app.quit();
      }
    });

    // 等待后端 ready
    waitForBackend(BACKEND_URL(), 90000)
      .then(() => { log(`Backend ready at ${BACKEND_URL()}`); resolve(); })
      .catch(reject);
  });
}

// ---- 关闭后端 ----
function stopBackend() {
  if (pythonProcess) {
    log('Stopping backend...');
    pythonProcess.kill('SIGTERM');
    // Windows fallback: 如果进程仍然存活，5 秒后强杀
    setTimeout(() => {
      if (pythonProcess) {
        try { process.kill(pythonProcess.pid, 0); pythonProcess.kill('SIGKILL'); } catch (_) {}
      }
    }, 5000);
  }
}

// ---- 启动画面 ----
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8">
  <style>
    * { margin:0; padding:0; box-sizing: border-box; }
    body {
      font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center;
      height: 100vh;
      background: transparent;
      -webkit-app-region: drag;
    }
    .card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 18px;
      padding: 48px 40px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      color: #e2e8f0;
    }
    .icon { font-size: 54px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
    .spinner {
      width: 36px; height: 36px; margin: 0 auto;
      border: 3px solid #334155;
      border-top: 3px solid #38bdf8;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">📅</div>
      <h1>智能排课系统</h1>
      <p>正在启动后端服务，请稍候…</p>
      <div class="spinner"></div>
    </div>
  </body>
  </html>
  `;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

// ---- 主窗口 ----
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    title: '智能排课系统',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 禁用默认菜单栏
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.destroy();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  // 安装包升级后不能复用旧版 Chromium 缓存，否则快捷方式可能继续显示旧前端。
  await mainWindow.webContents.session.clearCache();
  const frontendUrl = `${BACKEND_URL()}/?desktopBuild=${encodeURIComponent(app.getVersion())}`;
  log(`Loading frontend: ${frontendUrl}`);
  await mainWindow.loadURL(frontendUrl);

  // 拦截外部链接用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ---- 托盘图标 ----
function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  if (!fs.existsSync(iconPath)) return;

  tray = new Tray(iconPath);
  tray.setToolTip('智能排课系统');
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
}

// ---- 应用生命周期 ----
app.on('ready', async () => {
  createSplash();

  try {
    activePort = await findFreePort(BACKEND_PORT);
    log(`Selected free port: ${activePort}`);

    await startBackend();
    await createMainWindow();
    createTray();
  } catch (err) {
    if (splashWindow) splashWindow.destroy();
    dialog.showErrorBox('启动失败', `后端服务启动失败：\n${err.message}`);
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopBackend();
});

app.on('window-all-closed', () => {
  // macOS 上不退出，但 Windows 上退出
  if (process.platform !== 'darwin') {
    isQuitting = true;
    stopBackend();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

// 防止多实例
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

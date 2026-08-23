# 智能排课系统 — Electron 桌面版

将本项目包装为 Windows 原生桌面应用（Electron + NSIS 安装包），
安装包内**自带嵌入式 Python 运行环境**与全部后端依赖，
普通电脑无需安装 Python / Node.js 即可运行。

## 目录结构

```text
electron/
├── package.json         # Electron 应用与 electron-builder 配置
├── main.js              # 主进程：管理后端 Python 进程 + 前端窗口 + 托盘
├── preload.js           # 渲染进程预加载脚本（上下文隔离）
├── installer.nsh        # NSIS 自定义安装/卸载脚本钩子
├── icon.png / icon.ico  # 应用图标
└── python-embed/        # 嵌入式 Python 3.11 + 后端依赖（构建时打包）
```

## 打包方式

```powershell
# 1. 构建前端静态资源
cd ..\frontend
npm run build

# 2. 打包 NSIS 安装程序
cd ..\electron
npx electron-builder --win --x64
```

产物位于 `release/`：
- `智能排课系统 Setup 1.0.0.exe` — NSIS 安装包（Windows 原生安装/卸载界面）
- `win-unpacked/` — 免安装绿色版目录

## 运行原理

1. 用户双击 `智能排课系统.exe`（Electron 主进程）；
2. 主进程自动选择一个空闲本地端口；
3. 启动嵌入式 Python（`python-embed/python.exe`）运行 FastAPI 后端；
4. 等待后端健康检查通过（`/api/health`）后创建窗口加载 `http://127.0.0.1:<port>`；
5. 关闭窗口时最小化到托盘，退出时自动终止后端进程。

## 数据存储位置

排课数据默认写入用户目录（避免 Program Files 只读权限问题）：
`%APPDATA%\school-timetable-generator\data\timetable-data.json`

## 开发模式调试

```powershell
npx electron .   # 需要先构建好 frontend/dist
```

> 注意：若本机设置了 `ELECTRON_RUN_AS_NODE=1` 环境变量，Electron 会以纯
> Node 模式运行导致无法启动窗口，请先 `Remove-Item Env:ELECTRON_RUN_AS_NODE`
> 或注销该环境变量。

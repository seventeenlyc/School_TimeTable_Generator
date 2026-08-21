# -*- coding: utf-8 -*-
"""
School Timetable Generator - Unified Desktop Launcher
一键启动脚本：自动安装依赖、启动后端、启动前端、打开浏览器
仅使用 Python 标准库，无额外依赖。
"""

import os
import sys
import time
import signal
import socket
import shutil
import urllib.request
import webbrowser
import subprocess
import threading

# Force UTF-8 output on Windows consoles (avoids GBK UnicodeEncodeError)
if os.name == "nt":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8000
FRONTEND_PORT = 5173
BACKEND_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}"
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"

processes = []
is_shutting_down = False


# ───────────────────── 工具函数 ─────────────────────

def log(tag: str, msg: str):
    timestamp = time.strftime("%H:%M:%S")
    print(f"  [{timestamp}] [{tag}] {msg}")


def run_cmd(cmd, cwd=None, desc=""):
    """同步运行命令并实时输出日志，失败时抛出异常。"""
    log("安装", f"{desc}...")
    result = subprocess.run(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=(os.name == "nt"),
    )
    if result.returncode != 0:
        print(result.stdout)
        raise RuntimeError(f"{desc} 失败 (exit code {result.returncode})")
    return result.stdout


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def wait_for_backend(timeout: int = 30) -> bool:
    start = time.time()
    url = f"{BACKEND_URL}/api/state"
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Launcher"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status in (200, 503):
                    return True
        except Exception:
            pass
        time.sleep(0.8)
    return False


def stream_output(pipe, prefix: str):
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            text = line.rstrip()
            if text and not is_shutting_down:
                print(f"  {prefix} {text}")
    except Exception:
        pass


# ───────────────── 环境与依赖管理 ─────────────────

def get_venv_python() -> str:
    """返回 backend/venv 中的 python 可执行文件路径。"""
    if os.name == "nt":
        return os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
    return os.path.join(BACKEND_DIR, "venv", "bin", "python")


def ensure_backend_venv():
    """如果 backend/venv 不存在，则创建并安装依赖。"""
    venv_py = get_venv_python()
    venv_dir = os.path.join(BACKEND_DIR, "venv")

    if not os.path.isfile(venv_py):
        log("环境", "未检测到后端虚拟环境，正在创建 backend/venv ...")
        run_cmd(
            [sys.executable, "-m", "venv", venv_dir],
            desc="创建 Python 虚拟环境 (backend/venv)",
        )

    # 检查核心包是否就绪
    check = subprocess.run(
        [venv_py, "-c", "import fastapi; import uvicorn; import ortools"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if check.returncode != 0:
        req_file = os.path.join(BACKEND_DIR, "requirements.txt")
        log("环境", "正在安装后端 Python 依赖 (fastapi, uvicorn, ortools...)")
        run_cmd(
            [venv_py, "-m", "pip", "install", "--quiet", "-r", req_file],
            cwd=BACKEND_DIR,
            desc="pip install -r requirements.txt",
        )
        # 也安装开发依赖（pytest, httpx）供后续测试用
        req_dev = os.path.join(BACKEND_DIR, "requirements-dev.txt")
        if os.path.isfile(req_dev):
            run_cmd(
                [venv_py, "-m", "pip", "install", "--quiet", "-r", req_dev],
                cwd=BACKEND_DIR,
                desc="pip install -r requirements-dev.txt",
            )
        log("环境", "后端依赖安装完成 [OK]")
    else:
        log("环境", "后端依赖已就绪 [OK]")


def ensure_frontend_deps():
    """如果 frontend/node_modules 不存在，则运行 npm install。"""
    node_modules = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.isdir(node_modules):
        log("环境", "未检测到 node_modules，正在安装前端依赖...")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        run_cmd(
            [npm_cmd, "install"],
            cwd=FRONTEND_DIR,
            desc="npm install (前端依赖)",
        )
        log("环境", "前端依赖安装完成 [OK]")
    else:
        log("环境", "前端依赖已就绪 [OK]")


# ──────────────────── 服务启动 ────────────────────

def start_backend():
    log("启动", "正在启动后端服务 (FastAPI + OR-Tools CP-SAT)...")
    venv_py = get_venv_python()
    cmd = [
        venv_py, "-m", "uvicorn", "server:app",
        "--host", BACKEND_HOST,
        "--port", str(BACKEND_PORT),
    ]
    p = subprocess.Popen(
        cmd,
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )
    processes.append(("后端", p))
    t = threading.Thread(target=stream_output, args=(p.stdout, "[后端]"), daemon=True)
    t.start()
    return p


def start_frontend():
    log("启动", "正在启动前端界面 (Vite + React)...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    cmd = [npm_cmd, "run", "dev"]
    p = subprocess.Popen(
        cmd,
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
        shell=(os.name == "nt"),
    )
    processes.append(("前端", p))
    t = threading.Thread(target=stream_output, args=(p.stdout, "[前端]"), daemon=True)
    t.start()
    return p


# ──────────────────── 优雅退出 ────────────────────

def shutdown(signum=None, frame=None):
    global is_shutting_down
    if is_shutting_down:
        return
    is_shutting_down = True
    print()
    log("系统", "正在停止所有服务...")
    for label, p in processes:
        try:
            if p.poll() is None:
                if os.name == "nt":
                    subprocess.call(
                        ["taskkill", "/F", "/T", "/PID", str(p.pid)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                else:
                    p.terminate()
                    p.wait(timeout=5)
                log("系统", f"{label}服务 (PID {p.pid}) 已停止")
        except Exception:
            pass
    log("系统", "所有服务已安全退出。再见！")
    sys.exit(0)


# ──────────────────── 主入口 ────────────────────

def main():
    print()
    print("=" * 60)
    print("   中小学智能排课与调课 Agent")
    print("   School Timetable Generator")
    print("   纯单机离线运行 | Google OR-Tools CP-SAT 调度引擎")
    print("=" * 60)
    print()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # ── 第1步：环境检测与依赖安装 ──
    log("系统", f"项目根目录: {ROOT_DIR}")
    log("系统", f"Python: {sys.executable} ({sys.version.split()[0]})")

    try:
        ensure_backend_venv()
        ensure_frontend_deps()
    except RuntimeError as e:
        log("错误", str(e))
        log("提示", "依赖安装失败，请检查网络连接后重新运行。")
        input("\n按回车键退出...")
        sys.exit(1)

    print()

    # ── 第2步：启动后端 ──
    start_backend()

    # ── 第3步：等待后端就绪 ──
    log("系统", "等待后端接口初始化 (最多 30 秒)...")
    if wait_for_backend(timeout=30):
        log("系统", f"[OK] 后端服务已就绪 -> {BACKEND_URL}")
    else:
        log("警告", "后端未能在预期时间内响应，仍将继续启动前端...")

    # ── 第4步：启动前端 ──
    start_frontend()
    time.sleep(3)

    # ── 第5步：打开浏览器 ──
    log("系统", f"正在打开浏览器 -> {FRONTEND_URL}")
    try:
        webbrowser.open(FRONTEND_URL)
    except Exception:
        log("提示", f"无法自动打开浏览器，请手动访问: {FRONTEND_URL}")

    print()
    print("─" * 60)
    log("就绪", "系统正在运行中！")
    log("提示", f"后端 API: {BACKEND_URL}")
    log("提示", f"前端界面: {FRONTEND_URL}")
    log("提示", "按 Ctrl + C 可一键停止全部服务")
    print("─" * 60)
    print()

    # ── 保持主进程活跃，监控子进程健康 ──
    while True:
        time.sleep(2)
        all_dead = True
        for label, p in processes:
            if p.poll() is not None:
                pass  # 已退出，不再重复打印警告
            else:
                all_dead = False
        if all_dead:
            log("系统", "所有子进程已退出。")
            break

    input("\n按回车键关闭...")


if __name__ == "__main__":
    main()

@echo off
chcp 65001 >nul
title 中小学校排课与智能调课系统 - 一键启动器
cd /d "%~dp0"

echo ================================================================
echo       中小学校排课与智能调课系统 (School Timetable Agent)
echo                  单机离线一键启动程序
echo ================================================================
echo.

:: 优先检测 backend/venv 中的 Python，否则使用系统全局 Python
set "PY_CMD="
if exist "backend\venv\Scripts\python.exe" (
    set "PY_CMD=backend\venv\Scripts\python.exe"
    echo [环境检测] 使用项目虚拟环境: backend\venv
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PY_CMD=python"
        echo [环境检测] 使用系统 Python
    ) else (
        echo [错误] 未检测到 Python 环境！请先安装 Python 3.10+ 并加入 PATH。
        pause
        exit /b 1
    )
)

:: 检测 Node.js / npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未检测到 npm 命令，请确保已安装 Node.js。
)

echo.
echo [启动中] 正在启动统一调度器 launcher.py...
echo.

%PY_CMD% launcher.py

if %errorlevel% neq 0 (
    echo.
    echo [提示] 进程已退出，按任意键关闭窗口...
    pause >nul
)

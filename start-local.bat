@echo off
setlocal
chcp 65001 >nul

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

if %EXIT_CODE% neq 0 (
    echo.
    echo [错误] 本地服务启动失败，退出代码: %EXIT_CODE%
    echo 请检查上方错误提示以排查问题。
    echo.
    pause
)

exit /b %EXIT_CODE%

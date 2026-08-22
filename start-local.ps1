$ErrorActionPreference = "Stop"

# 1. 从脚本路径解析项目根目录，兼容路径含空格
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $ScriptDir) {
    $ScriptDir = $PSScriptRoot
}
$ProjectRoot = Resolve-Path $ScriptDir | Select-Object -ExpandProperty Path

$BackendPython = Join-Path $ProjectRoot "backend\venv\Scripts\python.exe"
$FrontendNodeModules = Join-Path $ProjectRoot "frontend\node_modules"
$FrontendDir = Join-Path $ProjectRoot "frontend"

# 2. 检查依赖项
$missingDeps = @()

if (-not (Test-Path $BackendPython)) {
    $missingDeps += "后端 Python 虚拟环境缺失 (`$BackendPython` 不存在)`n  -> 首次安装提示：请在 backend 目录下创建虚拟环境并安装依赖：`n     cd backend`n     python -m venv venv`n     .\venv\Scripts\pip install -r requirements.txt"
}

if (-not (Test-Path $FrontendNodeModules)) {
    $missingDeps += "前端 node_modules 缺失 (`$FrontendNodeModules` 不存在)`n  -> 首次安装提示：请在 frontend 目录下安装 npm 依赖：`n     cd frontend`n     npm install"
}

$npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    $npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue
}
if (-not $npmCmd) {
    $missingDeps += "系统未找到 npm.cmd 命令`n  -> 首次安装提示：请确保已安装 Node.js (推荐 LTS 版本) 并将其添加到系统 PATH 环境变量中。"
}

if ($missingDeps.Count -gt 0) {
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "检测到本地运行环境依赖缺失，请先完成首次安装：" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    foreach ($msg in $missingDeps) {
        Write-Host $msg -ForegroundColor Yellow
        Write-Host ""
    }
    exit 1
}

# 3. 在 frontend 运行 npm.cmd run build，检查退出码
Write-Host "正在构建前端静态资源 (npm run build)..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "前端构建失败 (退出码: $LASTEXITCODE)，服务启动终止。" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "前端构建完成。" -ForegroundColor Green
}
finally {
    Pop-Location
}

# 4. 后台轮询 http://127.0.0.1:8001/api/state，成功后打开 http://127.0.0.1:8001；最长约10秒
$healthCheckJob = Start-Job -ScriptBlock {
    $url = "http://127.0.0.1:8001/api/state"
    $targetUrl = "http://127.0.0.1:8001"
    $maxAttempts = 20
    $success = $false
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 1 -ErrorAction Stop
            if ($response) {
                $success = $true
                break
            }
        }
        catch {
            # 服务尚未就绪，继续重试
        }
    }
    if ($success) {
        Start-Process $targetUrl
    }
}

# 5. 前台启动该虚拟环境的 uvicorn：server:app，--app-dir backend，host 127.0.0.1，port 8001
Write-Host "正在启动后端服务 (http://127.0.0.1:8001)..." -ForegroundColor Cyan
Write-Host "提示：按 Ctrl+C 可停止服务。" -ForegroundColor DarkGray

try {
    & $BackendPython -m uvicorn server:app --app-dir (Join-Path $ProjectRoot "backend") --host 127.0.0.1 --port 8001
}
finally {
    # 6. 清理后台 Job，不结束其他用户进程；Ctrl+C 可正常退出
    if ($healthCheckJob) {
        Stop-Job $healthCheckJob -ErrorAction SilentlyContinue
        Remove-Job $healthCheckJob -ErrorAction SilentlyContinue
    }
}

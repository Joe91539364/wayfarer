@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "PORT=8787"
set "OPEN=1"
if /i "%~1"=="--no-open" set "OPEN=0"

echo ==========================================
echo   Wayfarer  -  local resident service
echo   http://127.0.0.1:%PORT%/
echo ==========================================

where node >nul 2>nul
if errorlevel 1 (
  rem .cmd is parsed as GBK by cmd.exe - keep this file pure ASCII, no Chinese here
  if exist "%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2-6\node.exe" (
    set "PATH=%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2-6;%PATH%"
    echo [*] Node.js not in PATH, using WorkBuddy bundled Node 22.
  ) else (
    echo [x] Node.js not found in PATH. Install Node 20+ first.
    pause
    exit /b 1
  )
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [x] npm not found even with bundled Node. Reinstall Node 20+.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [*] Installing dependencies, one moment...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto fail
)

if not exist "dist\index.html" (
  echo [*] Building frontend...
  call npm run build
  if errorlevel 1 goto fail
)

if not exist "server\app.mjs" (
  echo [*] Compiling local service...
  call npm run serve:build
  if errorlevel 1 goto fail
)

if exist "data\keepalive.pid" (
  set /p KPID=<data\keepalive.pid
  tasklist /fi "PID eq !KPID!" 2>nul | find /i "node.exe" >nul
  if not errorlevel 1 (
    echo [=] Already running ^(keepalive pid !KPID!^)
    goto maybeopen
  )
  del /q "data\keepalive.pid" >nul 2>nul
)

echo [*] Starting watchdog...
start "Wayfarer" /min cmd /c "node scripts\keepalive.mjs"

set /a TRIES=0
:wait
set /a TRIES+=1
rem ping instead of timeout: timeout needs a real console stdin, batch under redirection would abort
ping -n 2 127.0.0.1 >nul
curl -s -o nul -m 2 http://127.0.0.1:%PORT%/api/health
if not errorlevel 1 goto ready
if %TRIES% LSS 20 goto wait
echo [!] Service is slow to answer, check logs\server.log
goto maybeopen

:ready
echo [ok] Service is up.

:maybeopen
if "%OPEN%"=="1" start "" http://127.0.0.1:%PORT%/
echo.
echo   Stop it later with:  stop.cmd
echo   Logs:               logs\server.log
exit /b 0

:fail
echo [x] Startup failed. See the messages above.
pause
exit /b 1

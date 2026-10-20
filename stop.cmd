@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

if exist "data\keepalive.pid" (
  set /p KPID=<data\keepalive.pid
  echo [*] Stopping watchdog pid !KPID!
  taskkill /PID !KPID! /T /F >nul 2>nul
  del /q "data\keepalive.pid" >nul 2>nul
)

if exist "data\server.pid" (
  set /p SPID=<data\server.pid
  echo [*] Stopping service pid !SPID!
  taskkill /PID !SPID! /T /F >nul 2>nul
  del /q "data\server.pid" >nul 2>nul
)

echo [ok] Stopped.
exit /b 0

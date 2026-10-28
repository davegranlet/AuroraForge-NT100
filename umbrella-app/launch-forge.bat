@echo off
setlocal EnableExtensions
title AuroraForge NT100
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ is required and was not found on PATH.
  pause
  exit /b 1
)

if not exist "node_modules\electron" (
  echo [setup] First run: installing AuroraForge NT100 dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed. See the messages above.
    pause
    exit /b 1
  )
)

echo Launching AuroraForge NT100...
call npx electron .
endlocal

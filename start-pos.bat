@echo off
title Food Bazar Cafe POS — Production
cd /d "%~dp0"
set "POS_ROOT=%~dp0"
set "POS_DATA_DIR=%~dp0data"

if not exist "data" mkdir "data"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22+ is required. Install from https://nodejs.org/
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm.cmd install
)

if not exist dist (
  echo Building production UI...
  call npm.cmd run build
)

echo.
echo Food Bazar Cafe POS
echo Database: %POS_DATA_DIR%foodbazarcafe.db
echo Browser:  http://127.0.0.1:3847
echo Keep this window open. Close it to stop the POS.
echo.
start "" "http://127.0.0.1:3847"
node server/index.js
pause

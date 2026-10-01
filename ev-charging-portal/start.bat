@echo off
title VoltPoint — EV Charging Station Management Portal
echo ====================================================================
echo  ⚡ VOLTPOINT EV CHARGING STATION MANAGEMENT PORTAL (BATCH-2026)
echo  🔋 Aligned with UN SDGs 7, 9, 11
echo ====================================================================
echo.
echo [1/2] Building React frontend...
cd /d "%~dp0\frontend"
call npm install --silent
call npm run build
if %errorlevel% neq 0 (
  echo ❌ Frontend build failed! Check errors above.
  pause
  exit /b 1
)
echo ✅ Frontend built successfully.
echo.
echo [2/2] Starting VoltPoint Server on http://localhost:5001 ...
cd /d "%~dp0\backend"
node server.js
pause

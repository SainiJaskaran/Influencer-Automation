@echo off
title Influencer Automation - Startup
echo ============================================
echo   Influencer Outreach Automation - Starting
echo ============================================
echo.

:: Start MongoDB (skip if already running as a service)
echo [1/3] Starting MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I "mongod.exe" >NUL
if %ERRORLEVEL% == 0 (
    echo       MongoDB is already running.
) else (
    start "MongoDB" cmd /c "mongod"
    echo       MongoDB started.
    timeout /t 3 /nobreak >NUL
)
echo.

:: Start Backend
echo [2/3] Starting Backend (port 5000)...
cd /d "%~dp0influencer-automation\backend"
start "Influencer-Backend" cmd /k "npm run dev"
echo       Backend started.
timeout /t 3 /nobreak >NUL
echo.

:: Start Frontend
echo [3/3] Starting Frontend (port 3000)...
cd /d "%~dp0influencer-automation\frontend"
start "Influencer-Frontend" cmd /k "npm start"
echo       Frontend started.
echo.

echo ============================================
echo   All services started!
echo.
echo   Dashboard:  http://localhost:3000
echo   API:        http://localhost:5000
echo ============================================
echo.
echo You can close this window. The services
echo are running in separate windows.
echo.
pause

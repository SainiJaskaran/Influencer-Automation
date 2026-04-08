@echo off
title Influencer Automation - Startup
echo ============================================
echo   Influencer Outreach Automation - Starting
echo ============================================
echo.

:: Start MongoDB (skip if already running as a service)
echo [1/5] Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I "mongod.exe" >NUL
if %ERRORLEVEL% == 0 (
    echo       MongoDB is already running.
) else (
    start "MongoDB" cmd /c "mongod"
    echo       MongoDB started.
    timeout /t 3 /nobreak >NUL
)
echo.

:: Install backend dependencies
echo [2/5] Installing backend dependencies...
cd /d "%~dp0influencer-automation\backend"
call npm install --silent
echo       Backend dependencies ready.
echo.

:: Install Playwright browsers if needed
echo [3/5] Checking Playwright browsers...
call npx playwright install chromium --with-deps 2>NUL
echo       Playwright browsers ready.
echo.

:: Start Backend
echo [4/5] Starting Backend (port 5000)...
start "Influencer-Backend" cmd /k "npm run dev"
echo       Backend started.
timeout /t 3 /nobreak >NUL
echo.

:: Install frontend dependencies and start
echo [5/5] Starting Frontend (port 3000)...
cd /d "%~dp0influencer-automation\frontend"
call npm install --silent
start "Influencer-Frontend" cmd /k "npm start"
echo       Frontend started.
echo.

echo ============================================
echo   All services started!
echo.
echo   Dashboard:  http://localhost:3000
echo   API:        http://localhost:5000/api
echo   Auth:       http://localhost:5000/api/auth
echo ============================================
echo.
echo You can close this window. The services
echo are running in separate windows.
echo.
pause

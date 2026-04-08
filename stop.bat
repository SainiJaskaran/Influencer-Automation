@echo off
title Influencer Automation - Shutdown
echo ============================================
echo   Influencer Outreach Automation - Stopping
echo ============================================
echo.

:: Stop Backend
echo [1/3] Stopping Backend...
taskkill /FI "WINDOWTITLE eq Influencer-Backend*" /F >NUL 2>&1
echo       Backend window closed.
echo.

:: Stop Frontend
echo [2/3] Stopping Frontend...
taskkill /FI "WINDOWTITLE eq Influencer-Frontend*" /F >NUL 2>&1
echo       Frontend window closed.
echo.

:: Kill any remaining node processes on ports 3000 and 5000
echo [3/3] Cleaning up remaining processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000.*LISTENING" 2^>NUL') do (
    taskkill /PID %%a /F >NUL 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING" 2^>NUL') do (
    taskkill /PID %%a /F >NUL 2>&1
)
echo       Cleanup complete.
echo.

:: Stop MongoDB (only if started by start.bat, not as a service)
echo Stopping MongoDB (if started by start.bat)...
taskkill /FI "WINDOWTITLE eq MongoDB*" /F >NUL 2>&1
echo       MongoDB stopped.
echo.

echo ============================================
echo   All services stopped.
echo ============================================
echo.
pause

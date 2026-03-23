@echo off
title Influencer Automation - Shutdown
echo ============================================
echo   Influencer Outreach Automation - Stopping
echo ============================================
echo.

:: Stop Node.js processes (backend and frontend)
echo [1/2] Stopping Node.js processes...
taskkill /FI "WINDOWTITLE eq Influencer-Backend*" /F >NUL 2>&1
taskkill /FI "WINDOWTITLE eq Influencer-Frontend*" /F >NUL 2>&1
taskkill /IM node.exe /F >NUL 2>&1
echo       Node.js processes stopped.
echo.

:: Stop MongoDB (only if started by start.bat, not as a service)
echo [2/2] Stopping MongoDB...
taskkill /FI "WINDOWTITLE eq MongoDB*" /F >NUL 2>&1
echo       MongoDB stopped (if started by start.bat).
echo.

echo ============================================
echo   All services stopped.
echo ============================================
echo.
pause

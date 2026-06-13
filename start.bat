@echo off
title MailForge - Email Marketing App
color 0A

echo.
echo  ============================================
echo   MailForge  -  Email Marketing Platform
echo  ============================================
echo.
echo  Starting server...
echo  URL: http://localhost:3000
echo.
echo  Press Ctrl+C to stop the server.
echo  ============================================
echo.

cd /d "%~dp0"

:: Open browser after 5 seconds (runs in background)
start "" cmd /c "timeout /t 5 >nul && start http://localhost:3000"

:: Start the dev server
npm run dev

pause

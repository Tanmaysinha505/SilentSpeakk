@echo off
title Agent 44 — Gesture AI & 3D Virtual Room (Dev Server)
cd /d "%~dp0\frontend"
echo ============================================================
echo         Starting Agent 44 Interface (Port 5173)
echo ============================================================
npm run dev -- --open
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo An error occurred. Press any key to exit.
    pause >nul
)

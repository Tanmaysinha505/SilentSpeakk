@echo off
title AirOS — Touchless Computer Interface
cd /d "%~dp0"
echo ============================================================
echo         Starting AirOS Gesture Control Application
echo ============================================================
python main.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo An error occurred. Press any key to exit.
    pause >nul
)

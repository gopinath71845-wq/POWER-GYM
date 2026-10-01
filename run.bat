@echo off
title The Power Gym - Management & Fitness System
color 0A

echo =========================================================================
echo                  THE POWER GYM - MANAGEMENT SYSTEM                       
echo          Theme: Sleek Dark / Neon  ^|  Merchant UPI: gopinath71845@oksbi   
echo =========================================================================
echo.

:: 1. Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python is not installed or not in your system PATH!
        echo Please install Python 3.10+ from https://www.python.org and check "Add Python to PATH".
        echo.
        pause
        exit /b
    )
    set PY_CMD=py
) else (
    set PY_CMD=python
)

echo [1/3] Checking and installing Python dependencies...
%PY_CMD% -m pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [NOTE] Using existing installed Python packages.
)

echo.
echo [2/3] Initializing SQL Database and verifying server schema...
%PY_CMD% -c "from app import app; print('   [OK] SQL database verified successfully.')"

echo.
echo =========================================================================
echo   THE POWER GYM - AUTHENTICATION & PAYMENT CREDENTIALS:
echo   - Member Portal:     http://127.0.0.1:5000/login
echo     Demo Member Login: Username: rahul  ^|  Password: rahul123
echo   - Staff Console:     http://127.0.0.1:5000/staff/login
echo     Demo Staff Login:  Username: admin  ^|  Password: admin123
echo     Staff Master Key:  ASDFGF123456*     (Required for Staff Access)
echo   - Merchant UPI ID:   gopinath71845@oksbi
echo =========================================================================
echo.

echo [3/3] Launching web browser and starting server on http://127.0.0.1:5000 ...
echo Press Ctrl + C in this window to stop the server at any time.
echo.

:: Automatically launch browser
start "" http://127.0.0.1:5000

:: Start Flask server
%PY_CMD% app.py

pause

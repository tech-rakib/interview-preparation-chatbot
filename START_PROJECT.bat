@echo off
title AI Interview Prep Chatbot Launcher
echo ========================================================
echo   Starting AI Interview Prep Chatbot (Backend + Mobile)
echo ========================================================
echo.

echo 1. Starting Backend API Server (FastAPI)...
start "Backend Server" /D "%~dp0backend" cmd /k "call venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo 2. Waiting 2 seconds...
timeout /t 2 >nul

echo 3. Setting up ADB Port Forwarding for Android Emulator...
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081 >nul 2>&1
    "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000 >nul 2>&1
) else (
    adb reverse tcp:8081 tcp:8081 >nul 2>&1
    adb reverse tcp:8000 tcp:8000 >nul 2>&1
)

echo 4. Starting React Native Mobile App (Expo)...
start "Mobile App Server (Expo)" /D "%~dp0mobile" cmd /k "npx expo start"

echo.
echo ========================================================
echo   Backend and Mobile App Server Launched Successfully!
echo.
echo   1. Android Studio Emulator: Press 'a' in the Expo window.
echo   2. Mobile Phone: Scan the QR code using Expo Go app.
echo ========================================================

@echo off
title AI Interview Prep Chatbot Launcher
echo ========================================================
echo   Starting AI Interview Prep Chatbot (Backend + Mobile)
echo ========================================================
echo.

echo 1. Starting Ollama AI Server...
start "Ollama Server" cmd /k "ollama serve"

echo 2. Waiting 3 seconds for Ollama to start...
timeout /t 3 >nul

echo 3. Pulling Ollama model (llama3.2:1b) if not installed...
ollama pull llama3.2:1b

echo 4. Starting Backend API Server (FastAPI)...
start "Backend Server" /D "%~dp0backend" cmd /k "call venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo 5. Waiting 3 seconds for Backend to start...
timeout /t 3 >nul

echo 6. Setting up ADB Port Forwarding (resetting offline devices)...
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" kill-server >nul 2>&1
    "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" start-server >nul 2>&1
    "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081 >nul 2>&1
    "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000 >nul 2>&1
) else (
    adb kill-server >nul 2>&1
    adb start-server >nul 2>&1
    adb reverse tcp:8081 tcp:8081 >nul 2>&1
    adb reverse tcp:8000 tcp:8000 >nul 2>&1
)

echo 7. Showing your PC Wi-Fi IP (use this in APK Server Settings)...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=* delims= " %%b in ("%%a") do echo    http://%%b:8000
)

echo 8. Starting React Native Mobile App (Expo Go)...
start "Mobile App Server (Expo)" /D "%~dp0mobile" cmd /k "npx expo start --clear"

echo.
echo ========================================================
echo   All Servers Launched Successfully!
echo.
echo   Ollama AI Server  : Running on http://localhost:11434
echo   Backend API       : Running on http://localhost:8000
echo   Expo Dev Server   : Check the Expo window for QR code
echo.
echo   HOW TO USE (APK on phone):
echo   1. Run this bat file on your PC
echo   2. In app: Login - Server Settings - Local PC
echo   3. Enter your PC IP shown above, e.g. http://192.168.1.5:8000
echo   4. Phone and PC must be on the SAME Wi-Fi
echo.
echo   HOW TO USE (Expo Go):
echo   1. Scan QR code from Expo terminal
echo   2. Topics + Ask AI will work with Ollama
echo ========================================================

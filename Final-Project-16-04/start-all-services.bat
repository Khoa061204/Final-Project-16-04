@echo off
title CloudSync - All Services
color 0A

echo.
echo ========================================
echo    🚀 CloudSync - Starting All Services
echo ========================================
echo.

echo 📋 Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

echo 📋 Checking service directories...
if not exist "backend" (
    echo ❌ Backend directory not found
    pause
    exit /b 1
)
if not exist "frontend" (
    echo ❌ Frontend directory not found
    pause
    exit /b 1
)
if not exist "websocket-server" (
    echo ❌ WebSocket service directory not found
    pause
    exit /b 1
)

echo ✅ All service directories found
echo.

echo 📦 Checking package.json files...
if not exist "backend\package.json" (
    echo ❌ Backend package.json not found
    echo Please run 'npm install' in the backend directory
    pause
    exit /b 1
)
if not exist "frontend\package.json" (
    echo ❌ Frontend package.json not found
    echo Please run 'npm install' in the frontend directory
    pause
    exit /b 1
)
if not exist "websocket-server\package.json" (
    echo ❌ WebSocket service package.json not found
    echo Please run 'npm install' in the websocket-server directory
    pause
    exit /b 1
)

echo ✅ All package.json files found
echo.

echo 🚀 Starting all services with Node.js script...
echo.

node start-all-services.js

echo.
echo Press any key to exit...
pause >nul 
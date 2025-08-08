# CloudSync - Start All Services PowerShell Script
# Run this script to start backend, frontend, and websocket services simultaneously

param(
    [switch]$Help
)

if ($Help) {
    Write-Host @"
CloudSync - Start All Services

Usage:
    .\start-all-services.ps1

Description:
    Starts all CloudSync services (backend, frontend, websocket) simultaneously.

Requirements:
    - Node.js installed and in PATH
    - All service directories exist (backend, frontend, websocket-server)
    - package.json files exist in each service directory

Services:
    - Backend API: http://localhost:5000
    - Frontend App: http://localhost:3000
    - WebSocket Service: ws://localhost:1234

Press Ctrl+C to stop all services.
"@
    exit 0
}

# Set console title and colors
$Host.UI.RawUI.WindowTitle = "CloudSync - All Services"
$Host.UI.RawUI.ForegroundColor = "Green"

Write-Host "🚀 CloudSync - Starting All Services..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "📋 Checking if Node.js is installed..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check service directories
Write-Host "📋 Checking service directories..." -ForegroundColor Yellow
$directories = @("backend", "frontend", "websocket-server")
$missingDirs = @()

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "✅ Found: $dir" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $dir" -ForegroundColor Red
        $missingDirs += $dir
    }
}

if ($missingDirs.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Some service directories are missing:" -ForegroundColor Red
    $missingDirs | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check package.json files
Write-Host "📦 Checking package.json files..." -ForegroundColor Yellow
$missingPackages = @()

foreach ($dir in $directories) {
    $packagePath = Join-Path $dir "package.json"
    if (Test-Path $packagePath) {
        Write-Host "✅ Found package.json in: $dir" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing package.json in: $dir" -ForegroundColor Red
        $missingPackages += $dir
    }
}

if ($missingPackages.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Some package.json files are missing:" -ForegroundColor Red
    $missingPackages | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host "Please run 'npm install' in each service directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Start the Node.js script
Write-Host "🚀 Starting all services with Node.js script..." -ForegroundColor Cyan
Write-Host ""

try {
    node start-all-services.js
} catch {
    Write-Host "❌ Failed to start services: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 
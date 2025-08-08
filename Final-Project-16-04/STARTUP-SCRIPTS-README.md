# 🚀 CloudSync - Startup Scripts

This directory contains scripts to start all CloudSync services (backend, frontend, and websocket) simultaneously with one click.

## 📁 Available Scripts

| Script | Platform | Description |
|--------|----------|-------------|
| `start-all-services.js` | All | Main Node.js script (cross-platform) |
| `start-all-services.bat` | Windows | Windows batch file |
| `start-all-services.ps1` | Windows | PowerShell script |
| `start-all-services.sh` | Unix/Linux/macOS | Shell script |

## 🎯 Quick Start

### Windows Users
**Option 1: Double-click the batch file**
```
start-all-services.bat
```

**Option 2: Run PowerShell script**
```powershell
.\start-all-services.ps1
```

**Option 3: Run Node.js script directly**
```cmd
node start-all-services.js
```

### Unix/Linux/macOS Users
**Option 1: Run shell script**
```bash
./start-all-services.sh
```

**Option 2: Run Node.js script directly**
```bash
node start-all-services.js
```

## 🔧 Prerequisites

Before running the startup scripts, ensure you have:

1. **Node.js installed** (version 16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **All service directories exist:**
   - `backend/`
   - `frontend/`
   - `websocket-service/`

3. **Dependencies installed:**
   ```bash
   # Install backend dependencies
   cd backend && npm install
   
   # Install frontend dependencies
   cd frontend && npm install
   
   # Install websocket service dependencies
   cd websocket-service && npm install
   ```

## 🚀 What the Scripts Do

1. **Check Prerequisites:**
   - Verify Node.js is installed
   - Check all service directories exist
   - Verify package.json files exist

2. **Start All Services:**
   - **Backend API** on `http://localhost:5000`
   - **Frontend App** on `http://localhost:3000`
   - **WebSocket Service** on `ws://localhost:1234`

3. **Provide Real-time Output:**
   - Color-coded console output for each service
   - Live logs from all running services
   - Error handling and graceful shutdown

## 🛑 Stopping Services

To stop all services, press **Ctrl+C** in the terminal where the script is running.

The script will:
1. Send SIGTERM to all child processes
2. Wait 5 seconds for graceful shutdown
3. Force kill any remaining processes
4. Exit cleanly

## 📊 Service URLs

Once all services are running, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main CloudSync application |
| Backend API | http://localhost:5000 | REST API endpoints |
| WebSocket | ws://localhost:1234 | Real-time communication |
| Health Check | http://localhost:5000/health | Backend health status |

## 🔍 Troubleshooting

### Common Issues

**1. "Node.js is not installed"**
- Install Node.js from https://nodejs.org/
- Ensure it's added to your system PATH

**2. "Directory not found"**
- Ensure you're running the script from the project root directory
- Check that all service directories exist

**3. "package.json not found"**
- Run `npm install` in each service directory:
  ```bash
  cd backend && npm install
  cd frontend && npm install
  cd websocket-service && npm install
  ```

**4. "Port already in use"**
- Stop any existing services using the same ports
- Check for processes on ports 3000, 5000, and 1234

**5. "Permission denied" (Unix/Linux/macOS)**
- Make the shell script executable:
  ```bash
  chmod +x start-all-services.sh
  ```

### Manual Service Start

If the startup scripts don't work, you can start services manually:

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm start

# Terminal 3: WebSocket Service
cd websocket-service && npm run dev
```

## 🎨 Features

- **Color-coded output** for easy service identification
- **Real-time logging** from all services
- **Graceful shutdown** handling
- **Error detection** and reporting
- **Cross-platform compatibility**
- **Automatic dependency checking**

## 📝 Script Details

### `start-all-services.js`
- Main Node.js script using child processes
- Handles process management and output
- Provides graceful shutdown
- Works on all platforms

### `start-all-services.bat`
- Windows batch file wrapper
- Checks prerequisites before starting
- Provides user-friendly error messages
- Easy double-click execution

### `start-all-services.ps1`
- PowerShell script with enhanced features
- Better error handling and output formatting
- Help parameter: `.\start-all-services.ps1 -Help`

### `start-all-services.sh`
- Unix/Linux/macOS shell script
- Checks system requirements
- Provides colored output
- Executable with proper permissions

## 🎉 Success!

When all services start successfully, you'll see:

```
🎉 All services started!
📱 Frontend: http://localhost:3000
🔗 Backend API: http://localhost:5000
🔌 WebSocket: ws://localhost:1234

💡 Press Ctrl+C to stop all services
```

Your CloudSync application is now ready to use! 🚀 
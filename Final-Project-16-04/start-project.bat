@echo off
echo Starting CloudSync Project...

echo Starting Backend Server...
start "Backend" cmd /k "cd backend && npm start"

echo Starting WebSocket Service...
start "WebSocket" cmd /k "cd websocket-server && npm start"

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm start"

echo All services started!
echo Backend: http://localhost:5000
echo WebSocket: ws://localhost:1234
echo Frontend: http://localhost:3000
pause 
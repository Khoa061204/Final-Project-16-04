const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting CloudSync servers...\n');

// Start backend server
console.log('📡 Starting backend server...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Start WebSocket server
console.log('🔌 Starting WebSocket server...');
const websocket = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'websocket-server'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
const cleanup = () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill('SIGTERM');
  websocket.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle backend exit
backend.on('close', (code) => {
  console.log(`\n❌ Backend server exited with code ${code}`);
  cleanup();
});

// Handle WebSocket exit
websocket.on('close', (code) => {
  console.log(`\n❌ WebSocket server exited with code ${code}`);
  cleanup();
});

console.log('✅ Servers started successfully!');
console.log('📡 Backend: http://localhost:5000');
console.log('🔌 WebSocket: ws://localhost:1234');
console.log('🌐 Frontend: http://localhost:3000');
console.log('\nPress Ctrl+C to stop all servers\n'); 
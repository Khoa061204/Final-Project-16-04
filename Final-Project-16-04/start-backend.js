const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting CloudSync Backend...\n');

// Start backend server (which includes Socket.IO)
console.log('📡 Starting backend server with Socket.IO...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
const cleanup = () => {
  console.log('\n🛑 Shutting down backend...');
  backend.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle backend exit
backend.on('close', (code) => {
  console.log(`\n❌ Backend server exited with code ${code}`);
  cleanup();
});

console.log('✅ Backend started successfully!');
console.log('📡 Backend: http://localhost:5000');
console.log('🔌 Socket.IO: ws://localhost:5000');
console.log('🌐 Frontend: http://localhost:3000');
console.log('\nPress Ctrl+C to stop the server\n'); 
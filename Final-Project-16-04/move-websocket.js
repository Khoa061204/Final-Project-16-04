const fs = require('fs');
const path = require('path');

console.log('🔄 Moving websocket service from websocket-server to websocket-service...');

// Create websocket-service directory if it doesn't exist
const websocketDir = path.join(__dirname, 'websocket-service');
if (!fs.existsSync(websocketDir)) {
  fs.mkdirSync(websocketDir, { recursive: true });
}

// Function to copy directory recursively
function copyDirectory(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const items = fs.readdirSync(source);
  
  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// Copy websocket-server to websocket-service
const sourceDir = path.join(__dirname, 'websocket-server');
const targetDir = path.join(__dirname, 'websocket-service');

if (fs.existsSync(sourceDir)) {
  copyDirectory(sourceDir, targetDir);
  console.log('✅ WebSocket service moved successfully!');
} else {
  console.log('⚠️  websocket-server directory not found');
}

console.log('✅ WebSocket service migration complete!'); 
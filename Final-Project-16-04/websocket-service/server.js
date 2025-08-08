const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket');
const http = require('http');

// Create HTTP server
const server = http.createServer((request, response) => {
  response.writeHead(200, { 
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  response.end('Y.js WebSocket server is running');
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/'
});

// Add request logging
server.on('request', (request, response) => {
  console.log('📡 HTTP Request:', request.method, request.url);
});

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
  const docName = request.url?.slice(1) || 'default';
  console.log('🔄 Y.js WebSocket connection established:', docName);
  console.log('🔗 Connection URL:', request.url);
  
  // Add connection status tracking
  ws.isAlive = true;
  
  try {
    // Setup Y.js connection with v3.0.0 options
    setupWSConnection(ws, request, {
      docName: docName,
      gc: true, // Enable garbage collection
    });
    console.log('✅ Y.js connection setup successful for:', docName);
  } catch (error) {
    console.error('❌ Error setting up Y.js connection:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    ws.close();
  }
});

// Handle WebSocket close
wss.on('close', (ws, code, reason) => {
  console.log('🔌 WebSocket connection closed:', { code, reason });
  ws.isAlive = false;
});

// Handle WebSocket errors
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
  console.error('❌ Error details:', {
    message: error.message,
    code: error.code,
    stack: error.stack
  });
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ HTTP server error:', error);
});

const port = process.env.WS_PORT || 1234;
server.listen(port, () => {
  console.log(`✅ Y.js WebSocket server is running on port ${port}`);
  console.log(`🔗 WebSocket URL: ws://localhost:${port}`);
  console.log(`🌐 Health check: http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Y.js WebSocket server...');
  server.close(() => {
    console.log('✅ Y.js WebSocket server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down Y.js WebSocket server...');
  server.close(() => {
    console.log('✅ Y.js WebSocket server stopped');
    process.exit(0);
  });
}); 
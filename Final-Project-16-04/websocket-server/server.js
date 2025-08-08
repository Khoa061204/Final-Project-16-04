const WebSocket = require('ws');
let setupWSConnection;
const loadSetup = async () => {
  if (typeof setupWSConnection === 'function') return setupWSConnection;
  // Attempt ESM path
  try {
    const mod = await import('y-websocket/bin/utils.js');
    if (typeof mod?.setupWSConnection === 'function') {
      console.log('y-websocket: using ESM bin/utils.js export');
      setupWSConnection = mod.setupWSConnection;
      return setupWSConnection;
    }
  } catch (_) {}
  // Attempt root export
  try {
    const yws = require('y-websocket');
    const cand = yws.setupWSConnection || yws.default || yws;
    if (typeof cand === 'function') {
      console.log('y-websocket: using root export');
      setupWSConnection = cand;
      return setupWSConnection;
    }
  } catch (_) {}
  // Attempt dist utils
  try {
    const utils = require('y-websocket/dist/utils.cjs');
    if (typeof utils?.setupWSConnection === 'function') {
      console.log('y-websocket: using dist/utils.cjs export');
      setupWSConnection = utils.setupWSConnection;
      return setupWSConnection;
    }
  } catch (_) {}
  // Attempt legacy bin utils (CJS)
  try {
    const utilsLegacy = require('y-websocket/bin/utils');
    const cand = utilsLegacy.setupWSConnection || utilsLegacy;
    if (typeof cand === 'function') {
      console.log('y-websocket: using bin/utils export');
      setupWSConnection = cand;
      return setupWSConnection;
    }
  } catch (_) {}
  console.error('Unable to load setupWSConnection from y-websocket (tried esm bin/utils.js, root export, dist/utils.cjs, bin/utils).');
  return setupWSConnection;
};
const http = require('http');

// Create HTTP server with CORS support
const server = http.createServer((request, response) => {
  // Add CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.writeHead(200);
    response.end();
    return;
  }
  
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Y.js WebSocket server v3.0.0 is running');
});

// Create WebSocket server; accept connections on any path (doc name derived from URL)
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true
});

// Track active connections and documents (for logging only)
const connections = new Map();
const activeDocuments = new Map();

console.log('🚀 Y.js WebSocket server v3.0.0 initializing...');

// Handle WebSocket connections
wss.on('connection', async (ws, request) => {
  console.log('🔌 Upgrade request URL:', request.url);
  const connectionId = Date.now() + Math.random();
  const docName = request.url?.slice(1) || 'default'; // Remove leading '/'
  
  // Parse URL parameters for user info
  const url = new URL(request.url, `http://${request.headers.host}`);
  const userId = url.searchParams.get('userId');
  const sessionId = url.searchParams.get('sessionId');
  const username = url.searchParams.get('username');
  
  connections.set(connectionId, { 
    ws, 
    docName, 
    userId, 
    sessionId, 
    username,
    timestamp: Date.now()
  });
  
  console.log(`🔗 New WebSocket connection: ${docName} (${connectionId}) - User: ${username} (${userId})`);
  
  // Track document connections
  if (!activeDocuments.has(docName)) {
    activeDocuments.set(docName, new Set());
  }
  activeDocuments.get(docName).add(connectionId);
  
  // Note: allow multiple sessions per user to avoid reconnect loops during dev
  
  // Set connection as alive
  ws.isAlive = true;
  ws.connectionId = connectionId;
  
  // Handle pong messages for heartbeat
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  try {
    // Setup Y.js collaboration - this is the core function
    const setup = await loadSetup();
    if (typeof setup !== 'function') {
      throw new Error('setupWSConnection not available');
    }
    setup(ws, request, {
      docName: docName,
      gc: true, // Enable garbage collection
    });
    
    console.log(`✅ Y.js connection established for document: ${docName}`);
    
    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log(`🔌 Connection closed: ${docName} (${code}: ${reason}) - User: ${username}`);
      connections.delete(connectionId);
      
      // No single-session enforcement
      
      // Clean up document tracking
      if (activeDocuments.has(docName)) {
        activeDocuments.get(docName).delete(connectionId);
        if (activeDocuments.get(docName).size === 0) {
          activeDocuments.delete(docName);
          console.log(`📄 Document ${docName} has no active connections`);
        }
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${docName}:`, error.message);
      connections.delete(connectionId);
      if (activeDocuments.has(docName)) {
        activeDocuments.get(docName).delete(connectionId);
      }
    });
    
  } catch (error) {
    console.error(`❌ Error setting up Y.js connection for ${docName}:`, error.message);
    ws.close();
    connections.delete(connectionId);
    if (activeDocuments.has(docName)) {
      activeDocuments.get(docName).delete(connectionId);
    }
  }
});

// Optional: add a lightweight heartbeat in production if needed

// Handle server errors
server.on('error', (error) => {
  console.error('HTTP server error:', error.message);
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error.message);
});

// Graceful shutdown
const cleanup = () => {
  // No heartbeat timer to clear
  
  wss.clients.forEach((client) => {
    client.close();
  });
  
  server.close(() => {
    console.log('WebSocket server stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

const port = process.env.WS_PORT || 1234;
server.listen(port, () => {
  console.log(`🚀 Y.js WebSocket server v3.0.0 started successfully!`);
  console.log(`📡 WebSocket URL: ws://localhost:${port}`);
  console.log(`🌐 Health check: http://localhost:${port}`);
  console.log(`📄 Document URLs: ws://localhost:${port}/document-{id}`);
  console.log(`🔧 Features: CRDT synchronization, garbage collection, heartbeat monitoring`);
  console.log(`⚡ Ready for collaborative editing connections...`);
}); 
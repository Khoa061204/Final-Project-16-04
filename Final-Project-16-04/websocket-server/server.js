const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket');

const server = require('http').createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('WebSocket server is running');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, request) => {
  setupWSConnection(ws, request);
});

const port = 1234;
server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
}); 
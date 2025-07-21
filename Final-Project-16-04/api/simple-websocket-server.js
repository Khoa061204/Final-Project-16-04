const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 1234 });

console.log('Simple WebSocket server running at ws://localhost:1234');

wss.on('connection', function connection(ws) {
  console.log('Client connected');
  
  ws.on('message', function message(data) {
    console.log('Received:', data.toString());
    // Broadcast to all clients
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });
  
  ws.on('close', function close() {
    console.log('Client disconnected');
  });
}); 
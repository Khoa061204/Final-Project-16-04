const WebSocket = require('ws');
const http = require('http');
const { Server } = require('@hocuspocus/server');
const { Logger } = require('@hocuspocus/extension-logger');
const { SQLite } = require('@hocuspocus/extension-sqlite');

const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
    new SQLite({
      database: 'collaboration.sqlite',
    }),
  ],
  async onAuthenticate(data) {
    const { token } = data;
    
    // Here you can implement your authentication logic
    // For now, we'll accept all connections
    return {
      status: 'ok',
    };
  },
});

console.log('Collaboration server running at ws://localhost:1234'); 
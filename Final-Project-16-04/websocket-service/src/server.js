require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'WebSocket Service',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
  }
});

// Track active users in documents
const documentUsers = {};

io.on('connection', socket => {
  console.log('🔄 New client connected:', socket.id);

  // Handle joining a document
  socket.on('join-document', async (documentId, userId) => {
    try {
      socket.join(documentId);
      
      // Track users in document
      if (!documentUsers[documentId]) {
        documentUsers[documentId] = new Map();
      }
      documentUsers[documentId].set(socket.id, { userId, username: `User-${userId}`, socketId: socket.id });
      
      // Notify others
      socket.to(documentId).emit('user-joined', { userId, username: `User-${userId}` });
      socket.to(documentId).emit('user-count', documentUsers[documentId].size);
      
      console.log(`🔄 User ${userId} joined document ${documentId}`);
    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  // Handle document changes
  socket.on('send-changes', (documentId, changes) => {
    try {
      socket.to(documentId).emit('receive-changes', changes);
    } catch (error) {
      console.error('Error sending changes:', error);
    }
  });

  // Handle title changes
  socket.on('title-change', (documentId, title) => {
    try {
      socket.to(documentId).emit('title-updated', title);
    } catch (error) {
      console.error('Error updating title:', error);
    }
  });

  // Handle leaving document
  socket.on('leave-document', (documentId) => {
    try {
      socket.leave(documentId);
      
      if (documentUsers[documentId]) {
        const userData = documentUsers[documentId].get(socket.id);
        documentUsers[documentId].delete(socket.id);
        
        // Notify others that user left
        if (userData) {
          socket.to(documentId).emit('user-left', { userId: userData.userId });
        }
        
        socket.to(documentId).emit('user-count', documentUsers[documentId].size);
        
        if (documentUsers[documentId].size === 0) {
          delete documentUsers[documentId];
        }
      }
      
      console.log(`🔄 User left document ${documentId}`);
    } catch (error) {
      console.error('Error leaving document:', error);
    }
  });

  // Team chat functionality
  socket.on('join-team-chat', (teamId) => {
    try {
      socket.join(`team-chat-${teamId}`);
      console.log(`🔄 User joined team chat ${teamId}`);
    } catch (error) {
      console.error('Error joining team chat:', error);
      socket.emit('error', { message: 'Failed to join team chat' });
    }
  });

  socket.on('send-team-message', (data) => {
    try {
      socket.to(`team-chat-${data.teamId}`).emit('new-team-message', {
        ...data,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending team message:', error);
    }
  });

  // Typing indicators
  socket.on('typing-start', ({ teamId, userId }) => {
    try {
      socket.to(`team-chat-${teamId}`).emit('user-typing', { 
        userId, 
        isTyping: true,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  });

  socket.on('typing-stop', ({ teamId, userId }) => {
    try {
      socket.to(`team-chat-${teamId}`).emit('user-typing', { 
        userId, 
        isTyping: false 
      });
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });

  // File upload progress
  socket.on('upload-progress', ({ fileId, progress, userId }) => {
    try {
      socket.to(`user-${userId}`).emit('upload-update', { 
        fileId, 
        progress,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling upload progress:', error);
    }
  });

  // Document collaboration typing
  socket.on('document-typing-start', ({ documentId, userId }) => {
    try {
      socket.to(documentId).emit('document-typing', { 
        userId, 
        isTyping: true,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling document typing start:', error);
    }
  });

  socket.on('document-typing-stop', ({ documentId, userId }) => {
    try {
      socket.to(documentId).emit('document-typing', { 
        userId, 
        isTyping: false 
      });
    } catch (error) {
      console.error('Error handling document typing stop:', error);
    }
  });

  // Join user-specific room for notifications
  socket.on('join-user-room', (userId) => {
    try {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined notification room`);
    } catch (error) {
      console.error('Error joining user room:', error);
      socket.emit('error', { message: 'Failed to join user room' });
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Handle disconnection with comprehensive cleanup
  socket.on('disconnect', (reason) => {
    console.log('🔄 Client disconnected:', socket.id, 'Reason:', reason);
    
    try {
      // Remove user from all documents they were in
      Object.keys(documentUsers).forEach(documentId => {
        if (documentUsers[documentId] && documentUsers[documentId].has(socket.id)) {
          const userData = documentUsers[documentId].get(socket.id);
          documentUsers[documentId].delete(socket.id);
          
          // Notify others that user left
          if (userData) {
            socket.to(documentId).emit('user-left', { userId: userData.userId });
          }
          
          socket.to(documentId).emit('user-count', documentUsers[documentId].size);
          
          if (documentUsers[documentId].size === 0) {
            delete documentUsers[documentId];
          }
        }
      });

      // Leave all rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

    } catch (error) {
      console.error('Error during disconnect cleanup:', error);
    }
  });
});

// Start server
const PORT = process.env.WEBSOCKET_PORT || 1234;

server.listen(PORT, () => {
  console.log(`🚀 WebSocket service running on port ${PORT}`);
  console.log(`🔌 Socket.IO server ready for connections`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
}); 
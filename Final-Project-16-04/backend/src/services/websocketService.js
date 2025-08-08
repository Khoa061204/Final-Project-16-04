const setupWebSocket = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Authentication token required');
      }

      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user details (support both token shapes)
      const { AppDataSource } = require('../config/database');
      const User = require('../models/User');
      const userRepo = AppDataSource.getRepository(User);
      const userId = decoded.userId || decoded.id; // <-- accept id or userId
      const user = await userRepo.findOne({ where: { id: userId } });
      
      if (!user) {
        throw new Error('User not found');
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('❌ Socket authentication failed:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  // Track users in documents with enhanced data
  const documentUsers = {};
  const userTypingStatus = {};

  // Helper function to get document user list
  const getDocumentUsers = (documentId) => {
    if (!documentUsers[documentId]) return [];
    return Array.from(documentUsers[documentId].values());
  };

  // Helper function to join document
  const joinDocument = (socket, documentId, userId) => {
    try {
      socket.join(documentId);
      
      // Initialize document users map if needed
      if (!documentUsers[documentId]) {
        documentUsers[documentId] = new Map();
      }
      
      // Add user to document
      const userInfo = {
        userId: socket.user.id,
        username: socket.user.username,
        email: socket.user.email,
        socketId: socket.id,
        joinedAt: new Date(),
        isTyping: false,
        cursor: null
      };
      
      documentUsers[documentId].set(socket.id, userInfo);
      
      // Notify other users about the new joiner
      socket.to(documentId).emit('user-joined', {
        userId: socket.user.id,
        username: socket.user.username,
        email: socket.user.email
      });
      
      // Send updated user count to all users in the document
      const userCount = documentUsers[documentId].size;
      io.to(documentId).emit('user-count', userCount);
      
      // Send current users list to the new joiner
      const currentUsers = getDocumentUsers(documentId).filter(u => u.socketId !== socket.id);
      socket.emit('current-users', currentUsers.map(u => ({
        userId: u.userId,
        username: u.username,
        email: u.email,
        isTyping: u.isTyping,
        cursor: u.cursor
      })));
      
      console.log(`🔄 User ${socket.user.username} (${socket.user.id}) joined document ${documentId}. Total users: ${userCount}`);
      
    } catch (error) {
      console.error('❌ Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  };

  // Helper function to leave document
  const leaveDocument = (socket, documentId) => {
    try {
      if (documentUsers[documentId]) {
        const userInfo = documentUsers[documentId].get(socket.id);
        documentUsers[documentId].delete(socket.id);
        
        if (userInfo) {
          socket.to(documentId).emit('user-left', {
            userId: userInfo.userId,
            username: userInfo.username
          });
          
          // Send updated user count
          const userCount = documentUsers[documentId].size;
          socket.to(documentId).emit('user-count', userCount);
          
          console.log(`👋 User ${userInfo.username} left document ${documentId}. Remaining users: ${userCount}`);
        }
        
        // Clean up empty document
        if (documentUsers[documentId].size === 0) {
          delete documentUsers[documentId];
        }
      }
      
      socket.leave(documentId);
    } catch (error) {
      console.error('❌ Error leaving document:', error);
    }
  };

  io.on('connection', socket => {
    console.log(`🔗 Client connected: ${socket.user.username} (${socket.id})`);

    // Handle joining a document
    socket.on('join-document', async (documentId, userId) => {
      joinDocument(socket, documentId, userId);
    });

    // Handle document changes
    socket.on('send-changes', async (documentId, delta, userId) => {
      try {
        // Broadcast changes to other users in the document (except sender)
        socket.to(documentId).emit('receive-changes', delta);
        
        // Save changes to database (throttled to avoid excessive writes)
        const debounceTimeout = 2000; // 2 seconds
        if (!socket.saveTimeout) {
          socket.saveTimeout = setTimeout(async () => {
            try {
              const { AppDataSource } = require('../config/database');
              const Document = require('../models/Document');
              const documentRepo = AppDataSource.getRepository(Document);
              const document = await documentRepo.findOne({ where: { id: documentId } });
              
              if (document) {
                document.content = delta;
                document.updatedAt = new Date();
                await documentRepo.save(document);
                console.log(`✅ Document ${documentId} saved to database`);
              }
              
              delete socket.saveTimeout;
            } catch (error) {
              console.error('❌ Error saving document:', error);
              delete socket.saveTimeout;
            }
          }, debounceTimeout);
        }
      } catch (error) {
        console.error('❌ Error handling document changes:', error);
      }
    });

    // Handle title changes
    socket.on('title-change', async (documentId, title, userId) => {
      try {
        // Broadcast title change to other users
        socket.to(documentId).emit('title-change', title);
        
        // Save title to database
        const { AppDataSource } = require('../config/database');
        const Document = require('../models/Document');
        const documentRepo = AppDataSource.getRepository(Document);
        const document = await documentRepo.findOne({ where: { id: documentId } });
        
        if (document) {
          document.title = title;
          document.updatedAt = new Date();
          await documentRepo.save(document);
          console.log(`✅ Document ${documentId} title updated to: ${title}`);
        }
      } catch (error) {
        console.error('❌ Error updating document title:', error);
      }
    });

    // Handle typing start
    socket.on('document-typing-start', (documentId, userId, username) => {
      try {
        // Update user typing status
        if (documentUsers[documentId] && documentUsers[documentId].has(socket.id)) {
          const userInfo = documentUsers[documentId].get(socket.id);
          userInfo.isTyping = true;
        }
        
        // Broadcast typing status to other users
        socket.to(documentId).emit('document-typing', {
          userId,
          username,
          isTyping: true
        });
        
        console.log(`⌨️ ${username} started typing in document ${documentId}`);
      } catch (error) {
        console.error('❌ Error handling typing start:', error);
      }
    });

    // Handle typing stop
    socket.on('document-typing-stop', (documentId, userId, username) => {
      try {
        // Update user typing status
        if (documentUsers[documentId] && documentUsers[documentId].has(socket.id)) {
          const userInfo = documentUsers[documentId].get(socket.id);
          userInfo.isTyping = false;
        }
        
        // Broadcast typing status to other users
        socket.to(documentId).emit('document-typing', {
          userId,
          username,
          isTyping: false
        });
        
        console.log(`⌨️ ${username} stopped typing in document ${documentId}`);
      } catch (error) {
        console.error('❌ Error handling typing stop:', error);
      }
    });

    // Handle cursor updates
    socket.on('cursor-update', (documentId, userId, cursorData) => {
      try {
        // Update user cursor position
        if (documentUsers[documentId] && documentUsers[documentId].has(socket.id)) {
          const userInfo = documentUsers[documentId].get(socket.id);
          userInfo.cursor = cursorData;
        }
        
        // Broadcast cursor position to other users
        socket.to(documentId).emit('cursor-update', {
          userId,
          username: socket.user.username,
          cursor: cursorData
        });
      } catch (error) {
        console.error('❌ Error handling cursor update:', error);
      }
    });

    // Handle leaving a document
    socket.on('leave-document', documentId => {
      leaveDocument(socket, documentId);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      try {
        console.log(`🔌 Client disconnected: ${socket.user.username} (${socket.id})`);
        
        // Remove user from all documents they were in
        Object.keys(documentUsers).forEach(documentId => {
          if (documentUsers[documentId] && documentUsers[documentId].has(socket.id)) {
            leaveDocument(socket, documentId);
          }
        });
        
        // Clear any pending save timeouts
        if (socket.saveTimeout) {
          clearTimeout(socket.saveTimeout);
          delete socket.saveTimeout;
        }
      } catch (error) {
        console.error('❌ Error handling disconnect:', error);
      }
    });

    // Team Chat Handlers
    socket.on('join-team-chat', async ({ teamId, userId }) => {
      try {
        console.log(`👥 User ${socket.user.username} joining team chat ${teamId}`);
        
        // Join the team chat room
        socket.join(`team-${teamId}`);
        
        // Send message history to the user
        const { AppDataSource } = require('../config/database');
        const Message = require('../models/Message');
        const User = require('../models/User');
        
        const messageRepo = AppDataSource.getRepository(Message);
        const userRepo = AppDataSource.getRepository(User);
        
        // Get recent messages (last 50)
        const messages = await messageRepo
          .createQueryBuilder('message')
          .where('message.teamId = :teamId', { teamId })
          .orderBy('message.createdAt', 'ASC')
          .limit(50)
          .getMany();
        
        // Get user details for messages
        const messagesWithUsers = await Promise.all(
          messages.map(async (msg) => {
            const user = await userRepo.findOne({ where: { id: msg.userId } });
            return {
              ...msg,
              username: user?.username || user?.email || 'Unknown User'
            };
          })
        );
        
        socket.emit('team-message-history', messagesWithUsers);
        
      } catch (error) {
        console.error('❌ Error joining team chat:', error);
        socket.emit('team-chat-error', { message: 'Failed to join team chat' });
      }
    });
    
    socket.on('send-team-message', async ({ teamId, userId, message }) => {
      try {
        console.log(`💬 Message from ${socket.user.username} in team ${teamId}: ${message}`);
        
        // Save message to database
        const { AppDataSource } = require('../config/database');
        const Message = require('../models/Message');
        
        const messageRepo = AppDataSource.getRepository(Message);
        
        const newMessage = messageRepo.create({
          teamId: parseInt(teamId),
          userId: parseInt(userId),
          message: message.trim(),
          createdAt: new Date()
        });
        
        const savedMessage = await messageRepo.save(newMessage);
        
        // Add username to message
        const messageWithUser = {
          ...savedMessage,
          username: socket.user.username || socket.user.email || 'Unknown User'
        };
        
        // Broadcast to all users in the team chat room (including sender)
        io.to(`team-${teamId}`).emit('team-message', messageWithUser);
        
      } catch (error) {
        console.error('❌ Error sending team message:', error);
        socket.emit('team-chat-error', { message: 'Failed to send message' });
      }
    });

    // Notification Handlers
    socket.on('join-user-room', (userId) => {
      try {
        console.log(`🔔 User ${socket.user.username} joining notification room for user ${userId}`);
        socket.join(`user-${userId}`);
      } catch (error) {
        console.error('❌ Error joining user notification room:', error);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('❌ Socket error for user', socket.user.username, ':', error);
    });
  });
};

module.exports = setupWebSocket; 
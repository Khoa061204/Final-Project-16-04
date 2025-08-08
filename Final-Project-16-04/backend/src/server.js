require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { AppDataSource } = require("./config/database");

// Import routes
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const folderRoutes = require('./routes/folders');
const documentRoutes = require('./routes/documents');
const teamRoutes = require('./routes/teams');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const notificationRoutes = require('./routes/notifications');
const calendarRoutes = require('./routes/calendar');
const shareRoutes = require('./routes/shares');
const userRoutes = require('./routes/users');
const itemRoutes = require('./routes/items'); // Add missing items route

// Import middleware
const authenticate = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Import WebSocket service
const setupWebSocket = require('./services/websocketService');

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'JWT_SECRET'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// Helper function to create notifications (exported for use by other modules)
async function createNotification(userId, type, title, message, data = null) {
  try {
    const notificationRepo = AppDataSource.getRepository(require('./models/Notification'));
    const notification = notificationRepo.create({
      userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
      isRead: false,
      createdAt: new Date()
    });
    
    const savedNotification = await notificationRepo.save(notification);
    return savedNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Export the function for use by other modules
module.exports.createNotification = createNotification;

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Simple test endpoint
app.get("/ping", (req, res) => {
  res.json({ message: "pong", timestamp: new Date().toISOString() });
});

// Signed URL endpoint for S3 file access (for viewing)
app.get('/api/files/signed-url', async (req, res) => {
  try {
    const key = req.query.key;
    
    console.log('🔗 Signed URL request for key:', key);
    
    if (!key) {
      return res.status(400).json({ message: "Missing S3 key" });
    }
    
    // Import required modules
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    
    // Create S3 client
    const { S3Client } = require("@aws-sdk/client-s3");
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    // Check if S3 configuration is available
    if (!process.env.AWS_BUCKET_NAME) {
      return res.status(500).json({ message: "S3 configuration missing" });
    }
    
    // Determine file type from extension
    const fileExtension = key.split('.').pop()?.toLowerCase();
    const isVideo = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'webm', 'ogg'].includes(fileExtension);
    const isPDF = fileExtension === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileExtension);
    
    // Set appropriate content type for response
    let responseContentType = '';
    if (isPDF) {
      responseContentType = 'application/pdf';
    } else if (isVideo) {
      responseContentType = `video/${fileExtension === 'mov' ? 'quicktime' : fileExtension}`;
    } else if (isImage) {
      responseContentType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
    }
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: 'inline', // For viewing
      ResponseCacheControl: 'max-age=3600', // Cache for better performance
      ...(responseContentType && { ResponseContentType: responseContentType })
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
    
    console.log('✅ Generated signed URL with content type:', responseContentType);
    console.log('🔗 URL length:', url.length);
    
    res.json({ url });
    
  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ message: "Error generating signed URL" });
  }
});

// Direct download endpoint for S3 files
app.get('/api/files/download', async (req, res) => {
  try {
    const key = req.query.key;
    
    console.log('⬇️ Direct download request for key:', key);
    
    if (!key) {
      return res.status(400).json({ message: "Missing S3 key" });
    }
    
    // Import required modules
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    
    // Create S3 client
    const { S3Client } = require("@aws-sdk/client-s3");
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    // Check if S3 configuration is available
    if (!process.env.AWS_BUCKET_NAME) {
      return res.status(500).json({ message: "S3 configuration missing" });
    }
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    
    // Extract filename from key
    const filename = key.split('/').pop() || 'file';
    
    // Set headers to force download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.ContentType || 'application/octet-stream');
    res.setHeader('Content-Length', response.ContentLength);
    
    // Stream the file data
    response.Body.pipe(res);
    
    console.log('✅ Started streaming download for:', filename);
    
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Error downloading file" });
  }
});

// API Routes (consolidated)
app.use('/api/auth', authRoutes);
app.use('/api/files', authenticate, fileRoutes);
app.use('/api/folders', authenticate, folderRoutes);
app.use('/api/documents', authenticate, documentRoutes);
app.use('/api/teams', authenticate, teamRoutes);
app.use('/api/projects', authenticate, projectRoutes);
app.use('/api/tasks', authenticate, taskRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/calendar', authenticate, calendarRoutes);
app.use('/api/shares', authenticate, shareRoutes);
app.use('/api/share', authenticate, shareRoutes); // Legacy route compatibility
app.use('/api/users', authenticate, userRoutes);
app.use('/api/items', authenticate, itemRoutes); // Add missing items route

// Static files
app.use('/public', express.static('public'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: "Route not found", 
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use(errorHandler);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Setup WebSocket handlers
setupWebSocket(io);

// Export io instance for use in other modules
module.exports.io = io;

// Also make io available globally for easier access
global.io = io;

// Initialize database and start server
const PORT = process.env.PORT || 5000;

AppDataSource.initialize()
  .then(async () => {
    console.log("✅ Database connected successfully");
    
    try {
      await AppDataSource.synchronize();
      console.log("✅ Database synchronized");
    } catch (syncError) {
      console.log("⚠️ Database sync warning (tables may already exist):", syncError.message);
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 API available at http://localhost:${PORT}/api`);
      console.log(`❤️  Health check at http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  });

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutdown signal received, shutting down gracefully');
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Close database connections
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('Database connections closed');
      }
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
    
    console.log('Process terminated');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app; 
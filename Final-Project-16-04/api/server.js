// Load environment variables first
require("dotenv").config();

// Immediate check of environment variables
console.log('Environment Variables Check:', {
  bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
  region: process.env.AWS_REGION,
  hasAccessKey: !!process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
});

const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const http = require("http"); // Added for Socket.IO
const socketIo = require("socket.io"); // Added for Socket.IO
const AppDataSource = require("./data-source");
const User = require("./src/entities/User.js");
// Add Document entity import
const Document = require("./src/entities/Document.js");
const documentRouter = require("./routes/document");
const nodemailer = require("nodemailer");
const File = require("./src/entities/File.js");
const Folder = require("./src/entities/Folder.js");

const app = express();
app.use(express.json());

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// ✅ CORS Configuration
app.use(
  cors({
    origin: ["http://localhost:3000"], // Add more origins if needed
    methods: "GET, POST, PUT, DELETE", // Added PUT, DELETE for document operations
    credentials: true,
  })
);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Ensure Database Connection
AppDataSource.initialize()
  .then(() => console.log("✅ TypeORM Database Connected"))
  .catch((err) => console.error("❌ TypeORM Connection Error:", err));

// ✅ AWS S3 Configuration
console.log('AWS Configuration:', {
  region: process.env.AWS_REGION,
  bucketName: process.env.REACT_APP_AWS_BUCKET_NAME,
  hasAccessKey: !!process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
});

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  },
});

// Validate AWS configuration
if (!process.env.REACT_APP_AWS_BUCKET_NAME) {
  console.error("❌ REACT_APP_AWS_BUCKET_NAME is not configured");
}
if (!process.env.REACT_APP_AWS_ACCESS_KEY_ID) {
  console.error("❌ AWS Access Key ID is missing");
}
if (!process.env.REACT_APP_AWS_SECRET_ACCESS_KEY) {
  console.error("❌ AWS Secret Access Key is missing");
}

// More detailed environment check
console.log('AWS Environment Variables:', {
  BUCKET_NAME: process.env.REACT_APP_AWS_BUCKET_NAME,
  REGION: process.env.AWS_REGION,
  ACCESS_KEY_PRESENT: !!process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  SECRET_KEY_PRESENT: !!process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
});

// ✅ Multer Setup (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

// Create a transporter for sending emails
const transporter = nodemailer.createTransport(
  process.env.EMAIL_SERVICE
    ? {
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    : {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
);

// ✅ Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "❌ No token provided" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.id } });
    
    if (!user) {
      return res.status(401).json({ message: "❌ Invalid token" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "❌ Authentication failed", error: error.message });
  }
};

/* ================================
        🏥 HEALTH CHECK
================================ */

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

/* ================================
        🟢 AUTHENTICATION ROUTES
================================ */

// Token verification endpoint
app.get("/verify-token", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        status: "error", 
        message: "No token provided" 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.id } });
    
    if (!user) {
      return res.status(401).json({ 
        status: "error", 
        message: "Invalid token" 
      });
    }
    
    return res.json({ 
      status: "ok", 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username 
      } 
    });
  } catch (error) {
    return res.status(401).json({ 
      status: "error", 
      message: "Token verification failed", 
      error: error.message 
    });
  }
});

// ✅ Register User
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userRepo = AppDataSource.getRepository(User);

    // Check if user exists
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert User into Database
    const newUser = userRepo.create({ username, email, password: hashedPassword });
    await userRepo.save(newUser);

    res.status(201).json({ message: "✅ User registered successfully" });
  } catch (error) {
    console.error("❌ Database Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Login User
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "❌ Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );

    res.json({ 
      message: "✅ Login successful", 
      token, 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Request Password Reset
const resetTokens = {}; // Temporary in-memory storage
app.post("/request-reset", async (req, res) => {
  const { email } = req.body;

  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "❌ Email not found" });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens[email] = token; // Store token in memory

    // Create reset link
    const resetLink = `http://localhost:3000/reset-password?token=${token}&email=${email}`;

    // Email content
    const mailOptions = {
      from: '"Password Reset" <noreply@example.com>',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Reset email sent:', nodemailer.getTestMessageUrl(info));

    res.json({ 
      message: "✅ Reset link sent! Check your email.",
      previewUrl: nodemailer.getTestMessageUrl(info) // This will be logged in the console
    });
  } catch (error) {
    console.error("❌ Reset request error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Reset Password
app.post("/reset-password", async (req, res) => {
  const { token, email, newPassword } = req.body;

  try {
    // Validate token
    if (resetTokens[email] !== token) {
      return res.status(400).json({ message: "❌ Invalid or expired token" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "❌ User not found" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await userRepo.save(user);

    // Remove used token
    delete resetTokens[email];

    res.json({ message: "✅ Password updated successfully" });
  } catch (error) {
    console.error("❌ Password reset error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ================================
        🔵 FILE UPLOAD ROUTE
================================ */

// Allowed MIME types for text/code files
const allowedMimeTypes = [
  "text/plain", "application/json", "application/xml", "text/markdown",
  "text/x-python", "text/x-java-source", "text/x-c", "text/x-c++", "text/html",
  "text/css", "application/javascript", "text/javascript", "application/x-sh",
  "application/x-bat", "application/x-php", "application/x-ruby", "text/x-go",
  "text/x-rustsrc", "text/x-swift", "text/x-kotlin", "text/x-dart", "application/sql",
  "application/x-yaml", "text/yaml", "text/csv", "application/vnd.ms-excel"
];

// ✅ File Upload API (Direct to S3)
app.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "❌ No file uploaded" });
    }

    // Validate file type
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: "❌ Only text/code files are allowed" });
    }

    // Validate AWS configuration
    if (!process.env.REACT_APP_AWS_BUCKET_NAME) {
      console.error("❌ REACT_APP_AWS_BUCKET_NAME is missing");
      return res.status(500).json({ message: "Server configuration error: REACT_APP_AWS_BUCKET_NAME is missing" });
    }

    // Generate S3 key with folder structure
    const folder_id = req.body.folder_id;
    const s3Key = folder_id 
      ? `files/${req.user.id}/${folder_id}/${Date.now()}-${req.file.originalname}`
      : `files/${req.user.id}/${Date.now()}-${req.file.originalname}`;

    console.log(`📤 Attempting to upload file: ${s3Key}`);
    console.log(`🪣 Using bucket: ${process.env.REACT_APP_AWS_BUCKET_NAME}`);

    const params = {
      Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    try {
      await s3.send(new PutObjectCommand(params));
      console.log(`✅ File uploaded to S3 successfully`);
    } catch (s3Error) {
      console.error("❌ S3 Upload Error:", s3Error);
      return res.status(500).json({ 
        message: "Failed to upload to S3", 
        error: s3Error.message,
        code: s3Error.code,
        params: {
          ...params,
          Body: '<buffer>'
        }
      });
    }

    const fileUrl = `https://${process.env.REACT_APP_AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${s3Key}`;

    // Save file metadata to DB
    const fileRepo = AppDataSource.getRepository(File);
    const newFile = fileRepo.create({
      user_id: req.user.id,
      file_name: req.file.originalname,
      file_url: fileUrl,
      s3Key: s3Key,
      folder_id: folder_id || null,
      uploaded_at: new Date()
    });
    await fileRepo.save(newFile);

    console.log(`✅ File metadata saved to DB:`, {
      name: newFile.file_name,
      url: fileUrl,
      folder: folder_id || 'root'
    });

    res.status(200).json({ 
      message: "✅ Upload successful", 
      file: {
        ...newFile,
        file_url: fileUrl
      }
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

// ✅ Get all files for the current user
app.get("/files", authenticate, async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    const query = { user_id: req.user.id };
    
    // Add folder_id filter if provided
    if (req.query.folder_id) {
      query.folder_id = req.query.folder_id;
    }
    
    const files = await fileRepo.find({
      where: query,
      order: { uploaded_at: "DESC" }
    });

    // Ensure each file has a valid S3 URL
    const filesWithUrls = files.map(file => ({
      ...file,
      file_url: file.file_url || (file.s3Key ? 
        `https://${process.env.REACT_APP_AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${file.s3Key}` 
        : null)
    }));

    console.log('📄 Returning files:', filesWithUrls.length);
    res.json({ files: filesWithUrls });
  } catch (error) {
    console.error("❌ Get files error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ================================
        📄 DOCUMENT ROUTES
================================ */

// Use document router
app.use("/documents", documentRouter);

/* ================================
        🔄 SOCKET.IO SETUP
================================ */

// Track active users in documents
const documentUsers = {};

io.on('connection', socket => {
  console.log('🔄 New client connected:', socket.id);

  // Handle joining a document
  socket.on('join-document', async (documentId, userId) => {
    socket.join(documentId);
    
    // Track users in document
    if (!documentUsers[documentId]) {
      documentUsers[documentId] = new Set();
    }
    documentUsers[documentId].add(socket.id);
    
    // Get document from database
    try {
      const documentRepo = AppDataSource.getRepository(Document);
      const document = await documentRepo.findOne({ where: { id: documentId } });
      
      if (document) {
        // Send current document state to new user
        socket.emit('load-document', {
          title: document.title,
          content: document.content
        });
      }
    } catch (error) {
      console.error('❌ Error loading document:', error);
    }
    
    // Update user count
    io.to(documentId).emit('user-count', documentUsers[documentId].size);
    
    console.log(`🔄 User ${socket.id} joined document ${documentId}`);
  });

  // Handle document changes
  socket.on('send-changes', async (documentId, delta, userId) => {
    // Broadcast changes to other users in the document
    socket.to(documentId).emit('receive-changes', delta);
    
    // Save changes to database (throttled to avoid excessive writes)
    const debounceTimeout = 2000; // 2 seconds
    if (!socket.saveTimeout) {
      socket.saveTimeout = setTimeout(async () => {
        try {
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
  });

  // Handle title changes
  socket.on('title-change', async (documentId, title, userId) => {
    // Broadcast title change to other users
    socket.to(documentId).emit('title-change', title);
    
    // Save title to database
    try {
      const documentRepo = AppDataSource.getRepository(Document);
      const document = await documentRepo.findOne({ where: { id: documentId } });
      
      if (document) {
        document.title = title;
        document.updatedAt = new Date();
        await documentRepo.save(document);
        console.log(`✅ Document ${documentId} title updated`);
      }
    } catch (error) {
      console.error('❌ Error updating document title:', error);
    }
  });

  // Handle leaving a document
  socket.on('leave-document', documentId => {
    leaveDocument(socket, documentId);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔄 Client disconnected:', socket.id);
    
    // Remove user from all documents they were in
    Object.keys(documentUsers).forEach(documentId => {
      if (documentUsers[documentId].has(socket.id)) {
        leaveDocument(socket, documentId);
      }
    });
  });
});

// Helper function for leaving a document
function leaveDocument(socket, documentId) {
  if (documentUsers[documentId]) {
    documentUsers[documentId].delete(socket.id);
    
    // Update user count
    io.to(documentId).emit('user-count', documentUsers[documentId].size);
    
    console.log(`🔄 User ${socket.id} left document ${documentId}`);
    
    // Clean up if no users left
    if (documentUsers[documentId].size === 0) {
      delete documentUsers[documentId];
    }
  }
}

/* ================================
        🚀 START SERVER
================================ */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// ✅ Create a new folder
app.post("/folders", authenticate, async (req, res) => {
  try {
    const { name, parent_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "❌ Folder name is required" });
    }

    const folderRepo = AppDataSource.getRepository(Folder);
    
    // If parent_id is provided, verify it exists and belongs to the user
    let parentFolder = null;
    let folderPath = '';
    
    if (parent_id) {
      parentFolder = await folderRepo.findOne({
        where: { 
          id: parent_id,
          user_id: req.user.id 
        }
      });
      
      if (!parentFolder) {
        return res.status(404).json({ message: "❌ Parent folder not found" });
      }
      
      folderPath = parentFolder.path 
        ? `${parentFolder.path}/${parentFolder.id}` 
        : parentFolder.id;
    }

    const newFolder = folderRepo.create({
      user_id: req.user.id,
      name: name.trim(),
      parent_id: parent_id || null,
      path: folderPath
    });

    await folderRepo.save(newFolder);
    
    // Update the folder's path to include its own ID
    newFolder.path = folderPath 
      ? `${folderPath}/${newFolder.id}`
      : newFolder.id;
    await folderRepo.save(newFolder);

    console.log('✅ Created folder:', {
      id: newFolder.id,
      name: newFolder.name,
      parent_id: newFolder.parent_id,
      path: newFolder.path
    });

    res.status(201).json({ 
      message: "✅ Folder created", 
      folder: newFolder 
    });
  } catch (error) {
    console.error("❌ Create folder error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ List all folders for the current user
app.get("/folders", authenticate, async (req, res) => {
  try {
    const folderRepo = AppDataSource.getRepository(Folder);
    const query = { user_id: req.user.id };
    
    // Add parent_id filter if provided
    if (req.query.parent_id) {
      query.parent_id = req.query.parent_id;
    }
    
    const folders = await folderRepo.find({
      where: query,
      order: { created_at: "DESC" }
    });
    res.json({ folders });
  } catch (error) {
    console.error("❌ List folders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Get files in a specific folder
app.get("/folders/:folderId/files", authenticate, async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    const files = await fileRepo.find({
      where: { 
        user_id: req.user.id,
        folder_id: req.params.folderId
      },
      order: { uploaded_at: "DESC" }
    });

    // Ensure each file has a valid S3 URL
    const filesWithUrls = files.map(file => ({
      ...file,
      file_url: file.file_url || (file.s3Key ? 
        `https://${process.env.REACT_APP_AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${file.s3Key}` 
        : null)
    }));

    console.log(`📄 Returning files for folder ${req.params.folderId}:`, filesWithUrls.length);
    res.json({ files: filesWithUrls });
  } catch (error) {
    console.error("❌ Get folder files error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
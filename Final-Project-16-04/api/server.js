require("dotenv").config();
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
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ✅ Multer Setup (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

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
        🟢 AUTHENTICATION ROUTES
================================ */

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
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "✅ Login successful", token, user: { id: user.id, username: user.username, email: user.email } });
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

    console.log(`🔵 Reset token for ${email}: ${token}`); // Normally, send this via email

    res.json({ message: "✅ Reset link sent! Check your email." });
  } catch (error) {
    console.error("❌ Reset request error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ================================
        🔵 FILE UPLOAD ROUTE
================================ */

// ✅ File Upload API (Direct to S3)
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "❌ No file uploaded" });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer, // ✅ Directly send buffer (No FS)
      ContentType: req.file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    console.log(`✅ File uploaded successfully: ${fileUrl}`);

    res.status(200).json({ message: "✅ Upload successful", fileUrl });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

/* ================================
        📄 DOCUMENT ROUTES
================================ */

// Create document
app.post("/documents", authenticate, async (req, res) => {
  const { title } = req.body;
  
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    
    const newDocument = documentRepo.create({
      title: title || "Untitled Document",
      content: JSON.stringify({ blocks: [] }),
      userId: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await documentRepo.save(newDocument);
    
    res.status(201).json({ 
      message: "✅ Document created successfully", 
      document: newDocument 
    });
  } catch (error) {
    console.error("❌ Document creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all documents for a user
app.get("/documents", authenticate, async (req, res) => {
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    
    const documents = await documentRepo.find({
      where: { userId: req.user.id },
      select: ["id", "title", "createdAt", "updatedAt"]
    });
    
    res.json({ documents });
  } catch (error) {
    console.error("❌ Get documents error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get document by id
app.get("/documents/:id", authenticate, async (req, res) => {
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    
    const document = await documentRepo.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });
    
    if (!document) {
      return res.status(404).json({ message: "❌ Document not found" });
    }
    
    res.json({ document });
  } catch (error) {
    console.error("❌ Get document error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update document
app.put("/documents/:id", authenticate, async (req, res) => {
  const { title, content } = req.body;
  
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    
    let document = await documentRepo.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });
    
    if (!document) {
      return res.status(404).json({ message: "❌ Document not found" });
    }
    
    document.title = title || document.title;
    if (content) document.content = content;
    document.updatedAt = new Date();
    
    await documentRepo.save(document);
    
    res.json({ 
      message: "✅ Document updated successfully", 
      document 
    });
  } catch (error) {
    console.error("❌ Update document error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete document
app.delete("/documents/:id", authenticate, async (req, res) => {
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    
    const document = await documentRepo.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });
    
    if (!document) {
      return res.status(404).json({ message: "❌ Document not found" });
    }
    
    await documentRepo.remove(document);
    
    res.json({ message: "✅ Document deleted successfully" });
  } catch (error) {
    console.error("❌ Delete document error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

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
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
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
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
const Team = require("./src/entities/Team.js");
const { EntitySchema } = require("typeorm");
const Invitation = new EntitySchema({
  name: "Invitation",
  tableName: "invitations",
  columns: {
    id: { primary: true, type: "varchar", length: 255, generated: "uuid" },
    teamId: { type: "varchar", length: 255 },
    inviteeId: { type: "varchar", length: 255 },
    status: { type: "varchar", length: 32, default: "pending" },
    createdAt: { type: "datetime", createDate: true }
  }
});
const Notification = new EntitySchema({
  name: "Notification",
  tableName: "notifications",
  columns: {
    id: { primary: true, type: "varchar", length: 255, generated: "uuid" },
    userId: { type: "varchar", length: 255 },
    type: { type: "varchar", length: 50 }, // 'deadline', 'invitation', 'file_share', 'task_assigned'
    title: { type: "varchar", length: 255 },
    message: { type: "text" },
    data: { type: "json", nullable: true }, // Additional data like projectId, taskId, etc.
    isRead: { type: "boolean", default: false },
    createdAt: { type: "datetime", createDate: true }
  }
});
const { In, Not, IsNull } = require("typeorm");
const Message = require("./src/entities/Message.js");
const Project = require("./src/entities/Project.js");
const Event = require("./src/entities/Event.js");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const AdmZip = require('adm-zip');
const Unrar = require('node-unrar-js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharingSystem = require('./sharing-system');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// ✅ CORS Configuration
app.use(cors({
  origin: ['http://localhost:3000', 'ws://localhost:1234'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "ws://localhost:1234"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Ensure Database Connection
AppDataSource.initialize()
  .then(async () => {
    console.log("✅ TypeORM Database Connected");
    try {
      // Try to synchronize but don't fail if there are conflicts
      await AppDataSource.synchronize();
      console.log("✅ Database synchronized successfully");
    } catch (syncError) {
      console.log("⚠️ Database sync warning (this is normal if tables already exist):", syncError.message);
      // Continue anyway - the tables might already exist
    }
  })
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

    // Check if email exists
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if username exists
    const existingUsername = await userRepo.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists" });
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
  // Text/code
  "text/plain", "application/json", "application/xml", "text/markdown",
  "text/x-python", "text/x-java-source", "text/x-c", "text/x-c++", "text/html",
  "text/css", "application/javascript", "text/javascript", "application/x-sh",
  "application/x-bat", "application/x-php", "application/x-ruby", "text/x-go",
  "text/x-rustsrc", "text/x-swift", "text/x-kotlin", "text/x-dart", "application/sql",
  "application/x-yaml", "text/yaml", "text/csv", "application/vnd.ms-excel",
  // PDF
  "application/pdf",
  // Images
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  // Audio
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
  // Video
  "video/mp4", "video/webm", "video/ogg", "video/x-matroska"
];

// Utility to get a unique file name in a folder (like Windows)
async function getUniqueFileName(fileRepo, userId, folderId, baseName, ext) {
  let name = baseName + ext;
  let counter = 1;
  while (await fileRepo.findOne({ where: { user_id: userId, folder_id: folderId, file_name: name } })) {
    name = `${baseName} (${counter})${ext}`;
    counter++;
  }
  return name;
}

// ✅ File Upload API (Direct to S3)
app.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "❌ No file uploaded" });
    }

    // Validate file type
    if (!allowedMimeTypes.includes(req.file.mimetype) && !['.zip','.rar'].includes(path.extname(req.file.originalname).toLowerCase())) {
      return res.status(400).json({ message: "❌ Only allowed file types are permitted" });
    }

    // Validate AWS configuration
    if (!process.env.REACT_APP_AWS_BUCKET_NAME) {
      console.error("❌ REACT_APP_AWS_BUCKET_NAME is missing");
      return res.status(500).json({ message: "Server configuration error: REACT_APP_AWS_BUCKET_NAME is missing" });
    }

    // Use the uploaded file's original name in the 'files/<user_id>/' folder as the S3 key
    const safeFileName = req.file.originalname.replace(/\s+/g, '_');
    const s3Key = `files/${req.user.id}/${safeFileName}`;

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
    // Ensure unique file name in the target folder (root)
    const extUpload = path.extname(req.file.originalname);
    const baseNameUpload = path.basename(req.file.originalname, extUpload);
    const uniqueNameUpload = await getUniqueFileName(fileRepo, req.user.id, null, baseNameUpload, extUpload);
    const newFile = fileRepo.create({
      user_id: req.user.id,
      file_name: uniqueNameUpload,
      file_url: fileUrl,
      s3Key: s3Key,
      folder_id: null, // No folder for root uploads
      uploaded_at: new Date()
    });
    await fileRepo.save(newFile);

    // --- ZIP/RAR Extraction Logic ---
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.zip' || ext === '.rar') {
      // Write buffer to a temp file
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-'));
      const tempFilePath = path.join(tempDir, safeFileName);
      fs.writeFileSync(tempFilePath, req.file.buffer);
      let extractedFiles = [];
      try {
        if (ext === '.zip') {
          const zip = new AdmZip(tempFilePath);
          zip.extractAllTo(tempDir, true);
          extractedFiles = zip.getEntries().map(e => e.entryName);
        } else if (ext === '.rar') {
          const data = fs.readFileSync(tempFilePath);
          const extractor = Unrar.createExtractorFromData(data);
          const extracted = extractor.extractAll();
          extracted.files.forEach(file => {
            if (file.extraction && file.fileHeader.name) {
              const outPath = path.join(tempDir, file.fileHeader.name);
              fs.mkdirSync(path.dirname(outPath), { recursive: true });
              fs.writeFileSync(outPath, file.extraction);
              extractedFiles.push(file.fileHeader.name);
            }
          });
        }
        console.log(`Extracted files from ${ext}:`, extractedFiles);
      } catch (extractErr) {
        console.error(`Error extracting ${ext} file:`, extractErr);
      }
      // Clean up temp file (optional, you may want to keep for debugging)
      // fs.unlinkSync(tempFilePath);
      // fs.rmdirSync(tempDir, { recursive: true });
    }
    // --- END ZIP/RAR Extraction Logic ---

    console.log(`✅ File metadata saved to DB:`, {
      name: newFile.file_name,
      url: fileUrl,
      folder: 'root'
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

// Get all files for the current user
app.get("/files", authenticate, async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    const query = { user_id: req.user.id };
    
    // If root=true, only get files without a folder
    // If folder_id is provided, only get files in that folder
    // This ensures files are only shown in one place
    if (req.query.root === 'true') {
      query.folder_id = null; // Only get files without a folder
      console.log('Fetching root files:', query);
    } else if (req.query.folder_id) {
      query.folder_id = req.query.folder_id;
      console.log('Fetching folder files:', query);
    } else {
      // If neither root nor folder_id specified, return empty array
      console.log('No root or folder_id specified, returning empty array');
      return res.json({ files: [] });
    }
    
    const files = await fileRepo.find({
      where: query,
      order: { uploaded_at: "DESC" }
    });

    // Get shared files if this is a root query
    let sharedFiles = [];
    if (req.query.root === 'true') {
      const sharedItems = sharingSystem.getSharedItems(req.user.id, req.user.email);
      if (sharedItems.files.length > 0) {
        sharedFiles = await fileRepo.createQueryBuilder('file')
          .where('file.id IN (:...ids)', { ids: sharedItems.files })
          .andWhere('file.folder_id IS NULL') // Only root shared files
          .getMany();
      }
    }

    console.log(`Found ${files.length} owned files and ${sharedFiles.length} shared files for query:`, query);
    res.json({ files: [...files, ...sharedFiles] });
  } catch (error) {
    console.error("Get files error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ================================
        📄 DOCUMENT ROUTES
================================ */

// Get all documents for the current user
app.get("/documents", authenticate, async (req, res) => {
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    const query = { userId: req.user.id };
    // If root=true, only get documents without a folder
    // If folder_id is provided, only get documents in that folder
    // This ensures documents are only shown in one place
    if (req.query.root === 'true') {
      query.folder_id = null; // Only get documents without a folder
      console.log('Fetching root documents:', query);
    } else if (req.query.folder_id) {
      query.folder_id = req.query.folder_id;
      console.log('Fetching folder documents:', query);
    } else {
      // If neither root nor folder_id specified, return empty array
      console.log('No root or folder_id specified, returning empty array');
      return res.json({ documents: [] });
    }
    const documents = await documentRepo.find({
      where: query,
      order: { createdAt: "DESC" }
    });
    
    // Get shared documents if this is a root query
    let sharedDocuments = [];
    if (req.query.root === 'true') {
      const sharedItems = sharingSystem.getSharedItems(req.user.id, req.user.email);
      if (sharedItems.documents.length > 0) {
        sharedDocuments = await documentRepo.createQueryBuilder('document')
          .where('document.id IN (:...ids)', { ids: sharedItems.documents })
          .andWhere('document.folder_id IS NULL') // Only root shared documents
          .getMany();
      }
    }
    
    console.log(`Found ${documents.length} owned documents and ${sharedDocuments.length} shared documents for query:`, query);
    res.json({ documents: [...documents, ...sharedDocuments] });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all folders for the current user
app.get("/folders", authenticate, async (req, res) => {
  try {
    const folderRepo = AppDataSource.getRepository(Folder);
    const fileRepo = AppDataSource.getRepository(File);
    const documentRepo = AppDataSource.getRepository(Document);
    const query = {};
    
    // Add parent_id filter if provided
    if (req.query.parent_id) {
      query.parent_id = req.query.parent_id;
    }
    
    // Get folders
    const folders = await folderRepo.find({
      where: query,
      order: { created_at: "DESC" }
    });

    // Get item counts for each folder
    const foldersWithCounts = await Promise.all(folders.map(async folder => {
      // Count files in this folder
      const fileCount = await fileRepo.count({
        where: { folder_id: folder.id }
      });

      // Count documents in this folder
      const documentCount = await documentRepo.count({
        where: { folder_id: folder.id }
      });

      // Add total count to folder object
      return {
        ...folder,
        items: fileCount + documentCount
      };
    }));
    
    console.log(`📁 Found ${foldersWithCounts.length} folders for user ${req.user.id}`);
    res.json({ folders: foldersWithCounts });
  } catch (error) {
    console.error("❌ Get folders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Use document router
app.use("/documents", documentRouter);

/* ================================
        🔄 SOCKET.IO SETUP
================================ */

// Track active users in documents
const documentUsers = {};

// Helper to enrich message with username and email
async function enrichMessageWithUser(message) {
  const userRepo = AppDataSource.getRepository("User");
  const user = await userRepo.findOne({ where: { id: message.userId } });
  return {
    ...message,
    username: user ? user.username : "Unknown",
    email: user ? user.email : ""
  };
}

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

  // Team chat: join a team chat room
  socket.on('join-team-chat', async ({ teamId, userId }) => {
    socket.join(`team-chat-${teamId}`);
    try {
      const messageRepo = AppDataSource.getRepository("Message");
      const messages = await messageRepo.find({
        where: { teamId },
        order: { createdAt: "ASC" },
        take: 50
      });
      // Enrich messages with username
      const enriched = await Promise.all(messages.map(enrichMessageWithUser));
      socket.emit('team-message-history', enriched);
    } catch (err) {
      socket.emit('team-message-history', []);
    }
  });

  // Team chat: send a message
  socket.on('send-team-message', async ({ teamId, userId, message }) => {
    try {
      const messageRepo = AppDataSource.getRepository("Message");
      const newMsg = messageRepo.create({ teamId, userId, message });
      await messageRepo.save(newMsg);
      const enriched = await enrichMessageWithUser(newMsg);
      io.to(`team-chat-${teamId}`).emit('team-message', enriched);
    } catch (err) {
      // Optionally handle error
    }
  });

  // Join user-specific room for notifications
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined notification room`);
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
    
    // If parent_id is provided, verify it exists
    let parentFolder = null;
    let folderPath = '';
    
    if (parent_id) {
      parentFolder = await folderRepo.findOne({
        where: { 
          id: parent_id
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

// ✅ Update file's folder (move file to folder)
app.put('/files/:id', authenticate, async (req, res) => {
  try {
    const { folder_id } = req.body;
    const fileRepo = AppDataSource.getRepository(File);
    const file = await fileRepo.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!file) return res.status(404).json({ message: 'File not found' });
    file.folder_id = folder_id;
    await fileRepo.save(file);
    res.json({ message: 'File moved', file });
  } catch (error) {
    console.error('❌ Move file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Delete a file
app.delete("/files/:id", authenticate, async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    const file = await fileRepo.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!file) return res.status(404).json({ message: "File not found" });

    // Delete from S3 first
    if (file.s3Key) {
      const deleteParams = {
        Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
        Key: file.s3Key
      };
      try {
        await s3.send(new DeleteObjectCommand(deleteParams));
      } catch (s3Error) {
        console.error("❌ S3 delete error:", s3Error);
        return res.status(500).json({ message: "Failed to delete file from S3", error: s3Error.message });
      }
    }

    await fileRepo.remove(file);
    res.json({ message: "File deleted" });
  } catch (error) {
    console.error("❌ Delete file error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Delete a folder
app.delete("/folders/:id", authenticate, async (req, res) => {
  try {
    const folderRepo = AppDataSource.getRepository(Folder);
    const folder = await folderRepo.findOne({ where: { id: req.params.id } });
    if (!folder) return res.status(404).json({ message: "Folder not found" });
    await folderRepo.remove(folder);
    res.json({ message: "Folder deleted" });
  } catch (error) {
    console.error("❌ Delete folder error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Add this after your other routes and after authentication middleware
app.get("/all-files", authenticate, async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    const documentRepo = AppDataSource.getRepository(Document);

    // Get all files for the user
    const files = await fileRepo.find({
      where: { user_id: req.user.id },
      order: { uploaded_at: "DESC" }
    });

    // Get all documents for the user
    const documents = await documentRepo.find({
      where: { userId: req.user.id },
      order: { createdAt: "DESC" }
    });

    // Normalize files
    const normalizedFiles = files.map(file => ({
      id: file.id,
      name: file.file_name,
      url: file.file_url,
      folder_id: file.folder_id,
      createdAt: file.uploaded_at,
      type: "file"
    }));

    // Normalize documents
    const normalizedDocuments = documents.map(doc => ({
      id: doc.id,
      name: doc.title,
      url: null, // or doc.s3Key if you want to provide a download link
      folder_id: null, // or add folder support if you have it
      createdAt: doc.createdAt,
      type: "document"
    }));

    // Merge and sort by createdAt DESC
    const allItems = [...normalizedFiles, ...normalizedDocuments].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ items: allItems });
  } catch (error) {
    console.error("❌ Get all files and documents error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ================================
        🟢 TEAM ROUTES
================================ */

// Get all teams for the authenticated user
app.get("/api/teams", authenticate, async (req, res) => {
  try {
    const teamRepo = AppDataSource.getRepository("Team");
    const userId = req.user.id;
    // Step 1: Get all team IDs where the user is a member or creator (raw SQL)
    const teamIdsResult = await teamRepo.query(
      `SELECT DISTINCT t.id FROM teams t
       LEFT JOIN team_members tm ON t.id = tm.team_id
       WHERE t.creator_id = ? OR tm.user_id = ?`,
      [userId, userId]
    );
    const teamIds = teamIdsResult.map(row => row.id);
    // Step 2: Fetch all teams with all members and creator
    const teams = teamIds.length > 0
      ? await teamRepo.find({ where: { id: In(teamIds) }, relations: ["members", "creator"] })
      : [];
    // Step 3: Debug log for raw members
    teams.forEach(team => {
      console.log(`Raw members for team ${team.id}:`, JSON.stringify(team.members, null, 2));
    });
    // Step 4: Format as before
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      creatorId: team.creatorId,
      creator: team.creator,
      createdAt: team.createdAt,
      members: team.members.map(m => ({ 
        id: m.id, 
        name: m.username || m.name, 
        email: m.email,
        avatar_url: m.avatar_url
      }))
    }));
    console.log('Teams for user', userId, JSON.stringify(formattedTeams, null, 2));
    res.json({ teams: formattedTeams });
  } catch (error) {
    console.error("❌ Error fetching teams:", error);
    res.status(500).json({ message: "Failed to fetch teams", error: error.message });
  }
});

// Create a new team
app.post("/api/teams", authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const teamRepo = AppDataSource.getRepository("Team");
    const userRepo = AppDataSource.getRepository("User");
    const creator = await userRepo.findOne({ where: { id: req.user.id } });
    if (!creator) return res.status(404).json({ message: "User not found" });
    const team = teamRepo.create({ name, creatorId: creator.id, creator, members: [creator] });
    await teamRepo.save(team);
    const savedTeam = await teamRepo.findOne({ where: { id: team.id }, relations: ["members", "creator"] });
    res.status(201).json({ team: savedTeam });
  } catch (error) {
    console.error("❌ Error creating team:", error);
    res.status(500).json({ message: "Failed to create team", error: error.message });
  }
});

// Add a member to a team
app.post("/api/teams/:teamId/members", authenticate, async (req, res) => {
  try {
    const { email } = req.body;
    const teamRepo = AppDataSource.getRepository("Team");
    const userRepo = AppDataSource.getRepository("User");
    const team = await teamRepo.findOne({ where: { id: req.params.teamId }, relations: ["members", "creator"] });
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.creatorId !== req.user.id && !team.members.some(m => m.id === req.user.id)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const userToAdd = await userRepo.findOne({ where: { email } });
    if (!userToAdd) return res.status(404).json({ message: "User not found" });
    if (team.members.some(m => m.id === userToAdd.id)) {
      return res.status(400).json({ message: "User is already a member" });
    }
    team.members.push(userToAdd);
    await teamRepo.save(team);
    const updatedTeam = await teamRepo.findOne({ where: { id: team.id }, relations: ["members", "creator"] });
    res.json({ team: updatedTeam });
  } catch (error) {
    console.error("❌ Error adding member:", error);
    res.status(500).json({ message: "Failed to add member", error: error.message });
  }
});
// Get all members of a team
app.get("/api/teams/:teamId/members", authenticate, async (req, res) => {
  try {
    const teamRepo = AppDataSource.getRepository("Team");
    const team = await teamRepo.findOne({
      where: { id: req.params.teamId },
      relations: ["members"]
    });
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({ members: team.members });
  } catch (error) {
    console.error("❌ Error fetching team members:", error);
    res.status(500).json({ message: "Failed to fetch team members", error: error.message });
  }
});

// Remove a member from a team
app.delete("/api/teams/:teamId/members/:memberId", authenticate, async (req, res) => {
  try {
    const teamRepo = AppDataSource.getRepository("Team");
    const team = await teamRepo.findOne({ where: { id: req.params.teamId }, relations: ["members", "creator"] });
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.creatorId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (req.params.memberId === team.creatorId) {
      return res.status(400).json({ message: "Cannot remove team creator" });
    }
    team.members = team.members.filter(m => m.id !== req.params.memberId);
    await teamRepo.save(team);
    const updatedTeam = await teamRepo.findOne({ where: { id: team.id }, relations: ["members", "creator"] });
    res.json({ team: updatedTeam });
  } catch (error) {
    console.error("❌ Error removing member:", error);
    res.status(500).json({ message: "Failed to remove member", error: error.message });
  }
});

// Delete a team
app.delete("/api/teams/:teamId", authenticate, async (req, res) => {
  try {
    const teamRepo = AppDataSource.getRepository("Team");
    const team = await teamRepo.findOne({ where: { id: req.params.teamId } });
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.creatorId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await teamRepo.remove(team);
    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting team:", error);
    res.status(500).json({ message: "Failed to delete team", error: error.message });
  }
});

// --- Team Invitation Endpoints ---

// 1. Get all pending invitations for the logged-in user
app.get("/api/teams/invitations", authenticate, async (req, res) => {
  try {
    const invitationRepo = AppDataSource.getRepository("Invitation");
    const teamRepo = AppDataSource.getRepository("Team");
    const invites = await invitationRepo.find({ where: { inviteeId: req.user.id, status: "pending" } });
    // Attach team name
    const teamIds = invites.map(i => i.teamId);
    const teams = await teamRepo.findByIds(teamIds);
    const teamMap = {};
    teams.forEach(t => { teamMap[t.id] = t.name; });
    const invitations = invites.map(i => ({ ...i, teamName: teamMap[i.teamId] || "" }));
    res.json({ invitations });
  } catch (err) {
    console.error("Error in /api/teams/invitations:", err);
    res.status(500).json({ message: "Failed to fetch invitations", error: err.message });
  }
});

// 2. Send an invitation to a user by email
app.post("/api/teams/:teamId/invite", authenticate, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email } = req.body;
    const teamRepo = AppDataSource.getRepository("Team");
    const userRepo = AppDataSource.getRepository("User");
    const invitationRepo = AppDataSource.getRepository("Invitation");
    const team = await teamRepo.findOne({ where: { id: teamId }, relations: ["members", "creator"] });
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (team.creatorId !== req.user.id) return res.status(403).json({ message: "Not authorized" });
    const invitee = await userRepo.findOne({ where: { email } });
    if (!invitee) return res.status(404).json({ message: "User not found" });
    if (team.members.some(m => m.id === invitee.id)) return res.status(400).json({ message: "User is already a member" });
    const existingInvite = await invitationRepo.findOne({ where: { teamId, inviteeId: invitee.id, status: "pending" } });
    if (existingInvite) return res.status(400).json({ message: "Invitation already sent" });
    const invitation = invitationRepo.create({ teamId, inviteeId: invitee.id, status: "pending" });
    await invitationRepo.save(invitation);
    
    // Create notification for invitee
    await createNotification(
      invitee.id,
      'invitation',
      'Team Invitation',
      `You've been invited to join team "${team.name}"`,
      { teamId, teamName: team.name, invitationId: invitation.id }
    );
    
    res.status(201).json({ message: "Invitation sent", invitation });
  } catch (err) {
    console.error("Error in /api/teams/:teamId/invite:", err);
    res.status(500).json({ message: "Failed to send invitation", error: err.message });
  }
});

// 3. Accept an invitation
app.post("/api/teams/invitations/:inviteId/accept", authenticate, async (req, res) => {
  try {
    const { inviteId } = req.params;
    const invitationRepo = AppDataSource.getRepository("Invitation");
    const teamRepo = AppDataSource.getRepository("Team");
    const userRepo = AppDataSource.getRepository("User");
    const invitation = await invitationRepo.findOne({ where: { id: inviteId } });
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.inviteeId !== req.user.id) return res.status(403).json({ message: "Not authorized" });
    invitation.status = "accepted";
    await invitationRepo.save(invitation);
    const team = await teamRepo.findOne({ where: { id: invitation.teamId }, relations: ["members"] });
    const userEntity = await userRepo.findOne({ where: { id: req.user.id } });
    if (!team.members.some(m => m.id === req.user.id)) {
      team.members.push(userEntity);
      await teamRepo.save(team);
    }
    res.json({ message: "Invitation accepted" });
  } catch (err) {
    console.error("Error in /api/teams/invitations/:inviteId/accept:", err);
    res.status(500).json({ message: "Failed to accept invitation", error: err.message });
  }
});

// 4. Reject an invitation
app.post("/api/teams/invitations/:inviteId/reject", authenticate, async (req, res) => {
  try {
    const { inviteId } = req.params;
    const invitationRepo = AppDataSource.getRepository("Invitation");
    const invitation = await invitationRepo.findOne({ where: { id: inviteId } });
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.inviteeId !== req.user.id) return res.status(403).json({ message: "Not authorized" });
    invitation.status = "rejected";
    await invitationRepo.save(invitation);
    res.json({ message: "Invitation rejected" });
  } catch (err) {
    console.error("Error in /api/teams/invitations/:inviteId/reject:", err);
    res.status(500).json({ message: "Failed to reject invitation", error: err.message });
  }
});

// --- Update User Profile ---
app.put('/users/:id', authenticate, async (req, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    // Add more fields as needed
    await userRepo.save(user);
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- Move Document or File to Folder ---
app.put('/documents/:id/move', authenticate, async (req, res) => {
  try {
    const { folder_id } = req.body;
    const documentRepo = AppDataSource.getRepository(Document);
    const fileRepo = AppDataSource.getRepository(File);
    // Try to find as document first
    let document = await documentRepo.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (document) {
      document.folder_id = folder_id;
      await documentRepo.save(document);
      return res.json({ message: 'Document moved', document });
    }
    // If not a document, try as file
    let file = await fileRepo.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (file) {
      file.folder_id = folder_id;
      await fileRepo.save(file);
      return res.json({ message: 'File moved', file });
    }
    return res.status(404).json({ message: 'Document or file not found' });
  } catch (error) {
    console.error('❌ Move document/file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- Leave Team ---
app.post('/api/teams/:teamId/leave', authenticate, async (req, res) => {
  try {
    const { teamId } = req.params;
    const teamRepo = AppDataSource.getRepository("Team");
    const team = await teamRepo.findOne({ where: { id: teamId }, relations: ["members"] });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.creatorId === req.user.id) {
      return res.status(400).json({ message: 'Creator cannot leave the team' });
    }
    team.members = team.members.filter(m => m.id !== req.user.id);
    await teamRepo.save(team);
    res.json({ message: 'Left team successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Upload User Avatar ---
app.post('/users/:id/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    console.log('Avatar upload request:', {
      userId: req.user.id,
      paramId: req.params.id,
      userType: typeof req.user.id,
      paramType: typeof req.params.id
    });
    
    // Convert both to strings for comparison
    if (String(req.user.id) !== String(req.params.id)) {
      console.log('Authorization failed:', {
        userId: req.user.id,
        paramId: req.params.id
      });
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    console.log('File received:', req.file.originalname, 'Size:', req.file.size);
    
    // Check file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      console.log('File too large:', req.file.size);
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    
    // Check file type
    if (!req.file.mimetype.startsWith('image/')) {
      console.log('Invalid file type:', req.file.mimetype);
      return res.status(400).json({ message: 'Only image files are allowed.' });
    }
    
    console.log('Converting to base64...');
    // Convert to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    console.log('Base64 conversion complete, size:', base64Image.length);
    
    console.log('Finding user in database...');
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user.id } });
    
    if (!user) {
      console.log('User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User found, updating avatar_url...');
    user.avatar_url = base64Image;
    
    console.log('Saving user to database...');
    await userRepo.save(user);
    
    console.log('Avatar saved to database successfully');
    res.json({ message: 'Avatar uploaded', avatar_url: base64Image });
  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Avatar upload failed', error: error.message });
  }
});

// --- Share File ---
app.post('/files/:id/share', authenticate, async (req, res) => {
  try {
    const { userIds = [], emails = [] } = req.body;
    const fileRepo = AppDataSource.getRepository(File);
    const file = await fileRepo.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!file) return res.status(404).json({ message: 'File not found' });
    
    // Use the sharing system
    const result = sharingSystem.shareItem('file', req.params.id, req.user.id, userIds, emails);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Share failed', error: error.message });
  }
});

// --- Share Document ---
app.post('/documents/:id/share', authenticate, async (req, res) => {
  try {
    const { userIds = [], emails = [] } = req.body;
    const documentRepo = AppDataSource.getRepository(Document);
    const document = await documentRepo.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!document) return res.status(404).json({ message: 'Document not found' });
    
    // Use the sharing system
    const result = sharingSystem.shareItem('document', req.params.id, req.user.id, userIds, emails);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Share failed', error: error.message });
  }
});

// --- Get Shared Files/Documents ---
app.get('/shared', authenticate, async (req, res) => {
  try {
    console.log('🔍 Fetching shared items for user:', req.user.id, req.user.email);
    const sharedItems = sharingSystem.getSharedItems(req.user.id, req.user.email);
    console.log('📋 Shared items found:', sharedItems);
    
    // Fetch the actual file and document data
    const fileRepo = AppDataSource.getRepository(File);
    const documentRepo = AppDataSource.getRepository(Document);
    
    let sharedFiles = [];
    let sharedDocuments = [];
    
    if (sharedItems.files.length > 0) {
      console.log('📄 Fetching shared files with IDs:', sharedItems.files);
      // Handle both integer and string IDs for files
      const fileIds = sharedItems.files.map(id => isNaN(parseInt(id)) ? id : parseInt(id));
      sharedFiles = await fileRepo.createQueryBuilder('file')
        .where('file.id IN (:...ids)', { ids: fileIds })
        .getMany();
      console.log('✅ Found shared files:', sharedFiles.length);
    }
      
    if (sharedItems.documents.length > 0) {
      console.log('📝 Fetching shared documents with IDs:', sharedItems.documents);
      // Documents use UUID strings
      sharedDocuments = await documentRepo.createQueryBuilder('document')
        .where('document.id IN (:...ids)', { ids: sharedItems.documents })
        .getMany();
      console.log('✅ Found shared documents:', sharedDocuments.length);
    }
    
    console.log('📤 Returning shared items:', { files: sharedFiles.length, documents: sharedDocuments.length });
    res.json({ files: sharedFiles, documents: sharedDocuments });
  } catch (error) {
    console.error('❌ Error fetching shared items:', error);
    res.status(500).json({ message: 'Failed to fetch shared items', error: error.message });
  }
});

/* ===============================
        🟢 PROJECT ROUTES
================================ */

// Helper function to validate project ID
function isValidProjectId(id) {
  return typeof id === 'number' || /^[a-zA-Z0-9-]+$/.test(String(id));
}

// Debug test endpoint
app.get("/test-log", (req, res) => {
  console.log("Test endpoint hit!");
  res.json({ message: "Test OK" });
});

// Get all projects for the authenticated user
app.get("/api/projects", authenticate, async (req, res) => {
  try {
    console.log("🔵 /api/projects called by user:", req.user && req.user.id);
    console.log("Getting repository");
    const projectRepo = AppDataSource.getRepository('Project');
    console.log("Repository acquired");
    // Fetch all projects with relations
    const projects = await projectRepo.find({
      relations: ['team', 'tasks', 'team.members']
    });
    const filtered = projects.filter(
      p => p.team && p.team.members && p.team.members.some(m => m.id === req.user.id)
    );
    console.log("Projects filtered by team membership:", filtered.length);
    res.json(filtered);
  } catch (error) {
    console.error("❌ Error in /api/projects:", error);
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
});


// Get a specific project by ID
app.get("/api/projects/:id", authenticate, async (req, res) => {
  try {
    const projectRepo = AppDataSource.getRepository('Project');
    const project = await projectRepo.findOne({
      where: { id: req.params.id },
      relations: ['team', 'tasks', 'team.members']
    });
    if (!project || !isValidProjectId(project.id)) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error("❌ Error in /api/projects/:id:", error);
    res.status(500).json({ message: 'Failed to fetch project', error: error.message });
  }
});

// Create a new project
app.post("/api/projects", authenticate, async (req, res) => {
  try {
    const { name, description, teamId, dueDate } = req.body;
    const projectRepo = AppDataSource.getRepository("Project");
    const teamRepo = AppDataSource.getRepository("Team");
    const team = await teamRepo.findOne({ where: { id: teamId }, relations: ["members"] });
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (!team.members.some(member => member.id === req.user.id)) {
      return res.status(403).json({ message: "You are not a member of this team." });
    }
    const newProject = projectRepo.create({
      name,
      description,
      team: team,
      dueDate: dueDate || null,
    });
    await projectRepo.save(newProject);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ message: "Failed to create project", error: error.message });
  }
});

// Update a project
app.put("/api/projects/:id", authenticate, async (req, res) => {
  try {
    const { name, description, dueDate } = req.body;
    const projectRepo = AppDataSource.getRepository("Project");
    const project = await projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.team", "team")
      .leftJoinAndSelect("team.members", "member")
      .where("project.id = :projectId", { projectId: req.params.id })
      .andWhere("member.id = :userId", { userId: req.user.id })
      .getOne();
    if (!project) return res.status(404).json({ message: "Project not found" });
    project.name = name || project.name;
    project.description = description || project.description;
    project.dueDate = dueDate ? new Date(dueDate) : project.dueDate;
    project.updatedAt = new Date();
    await projectRepo.save(project);
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to update project", error: error.message });
  }
});

// Delete a project
app.delete("/api/projects/:id", authenticate, async (req, res) => {
  try {
    const projectRepo = AppDataSource.getRepository("Project");
    const project = await projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.team", "team")
      .leftJoinAndSelect("team.members", "member")
      .where("project.id = :projectId", { projectId: req.params.id })
      .andWhere("member.id = :userId", { userId: req.user.id })
      .getOne();
    if (!project) return res.status(404).json({ message: "Project not found" });
    await projectRepo.remove(project);
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete project", error: error.message });
  }
});

/* ===============================
        🟡 TASK ROUTES
================================ */

// Get all tasks for a project
app.get("/api/projects/:projectId/tasks", authenticate, async (req, res) => {
  try {
    const taskRepo = AppDataSource.getRepository("Task");
    const projectRepo = AppDataSource.getRepository("Project");
    
    // First verify the user has access to the project
    const project = await projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.team", "team")
      .leftJoinAndSelect("team.members", "member")
      .where("project.id = :projectId", { projectId: req.params.projectId })
      .andWhere("member.id = :userId", { userId: req.user.id })
      .getOne();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const tasks = await taskRepo.find({
      where: { projectId: req.params.projectId },
      relations: ["assignedUser"],
      order: { createdAt: "DESC" }
    });

    res.json(tasks);
  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks", error: error.message });
  }
});

// Create a new task
app.post("/api/projects/:projectId/tasks", authenticate, async (req, res) => {
  try {
    const { title, description, assignedUserId, priority, dueDate } = req.body;
    const taskRepo = AppDataSource.getRepository("Task");
    const projectRepo = AppDataSource.getRepository("Project");
    
    // First verify the user has access to the project
    const project = await projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.team", "team")
      .leftJoinAndSelect("team.members", "member")
      .where("project.id = :projectId", { projectId: req.params.projectId })
      .andWhere("member.id = :userId", { userId: req.user.id })
      .getOne();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const newTask = taskRepo.create({
      title,
      description,
      projectId: req.params.projectId,
      assignedUserId: assignedUserId || null,
      priority: priority || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: assignedUserId ? "In Progress" : "To Do"
    });

    await taskRepo.save(newTask);

    // Fetch the task with assigned user
    const savedTask = await taskRepo.findOne({
      where: { id: newTask.id },
      relations: ["assignedUser"]
    });

    res.status(201).json(savedTask);
  } catch (error) {
    console.error("❌ Error creating task:", error);
    res.status(500).json({ message: "Failed to create task", error: error.message });
  }
});

// Update a task (allow admin/lead to assign and set status to In Progress)
app.put("/api/tasks/:id", authenticate, async (req, res) => {
  try {
    const { title, description, assignedUserId, status, priority, dueDate } = req.body;
    const taskRepo = AppDataSource.getRepository("Task");
    const projectRepo = AppDataSource.getRepository("Project");
    const userRepo = AppDataSource.getRepository("User");
    // First get the task and verify user has access to the project
    const task = await taskRepo.findOne({
      where: { id: req.params.id },
      relations: ["project", "project.team", "project.team.members"]
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    // Check if user has access to the project
    const hasAccess = task.project.team.members.some(member => member.id === req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }
    // Enforce status based on assignment, regardless of whether the assignee changed
    if (assignedUserId) {
      task.assignedUserId = assignedUserId;
      if (status === "Done") {
        task.status = "Done";
      } else {
        task.status = "In Progress";
      }
    } else {
      task.assignedUserId = null;
      if (status === "Done") {
        task.status = "Done";
      } else {
        task.status = "To Do";
      }
    }
    
    task.title = title || task.title;
    task.description = description || task.description;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.dueDate = dueDate ? new Date(dueDate) : task.dueDate;
    task.updatedAt = new Date();
    await taskRepo.save(task);
    
    // Create notification if task was assigned to someone new
    if (assignedUserId && assignedUserId !== task.assignedUserId) {
      await createNotification(
        assignedUserId,
        'task_assigned',
        'Task Assigned',
        `You've been assigned to task "${task.title}" in project "${task.project.name}"`,
        { taskId: task.id, projectId: task.project.id, projectName: task.project.name }
      );
    }
    
    const updatedTask = await taskRepo.findOne({
      where: { id: task.id },
      relations: ["assignedUser"]
    });
    res.json(updatedTask);
  } catch (error) {
    console.error("❌ Error updating task:", error);
    res.status(500).json({ message: "Failed to update task", error: error.message });
  }
});

// Delete a task
app.delete("/api/tasks/:id", authenticate, async (req, res) => {
  try {
    const taskRepo = AppDataSource.getRepository("Task");
    const projectRepo = AppDataSource.getRepository("Project");
    
    // First get the task and verify user has access to the project
    const task = await taskRepo.findOne({
      where: { id: req.params.id },
      relations: ["project", "project.team", "project.team.members"]
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user has access to the project
    const hasAccess = task.project.team.members.some(member => member.id === req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    await taskRepo.remove(task);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task", error: error.message });
  }
});

// Claim a task (move from To Do to In Progress and assign to current user)
app.patch("/api/tasks/:id/claim", authenticate, async (req, res) => {
  try {
    const taskRepo = AppDataSource.getRepository("Task");
    const task = await taskRepo.findOne({ where: { id: req.params.id }, relations: ["project", "project.team", "project.team.members"] });
    if (!task) return res.status(404).json({ message: "Task not found" });
    // Only allow claiming if unassigned and To Do
    if (task.status !== "To Do" || task.assignedUserId) {
      return res.status(400).json({ message: "Task is not available to claim" });
    }
    // Check user is in the project team
    const isTeamMember = task.project.team.members.some(member => member.id === req.user.id);
    if (!isTeamMember) return res.status(403).json({ message: "Not authorized" });
    task.status = "In Progress";
    task.assignedUserId = req.user.id;
    await taskRepo.save(task);
    res.json(task);
  } catch (error) {
    console.error("❌ Error claiming task:", error);
    res.status(500).json({ message: "Failed to claim task", error: error.message });
  }
});

// Complete a task (move from In Progress to Done, log who completed and when)
app.patch("/api/tasks/:id/complete", authenticate, async (req, res) => {
  try {
    const taskRepo = AppDataSource.getRepository("Task");
    const task = await taskRepo.findOne({ where: { id: req.params.id }, relations: ["project", "project.team", "project.team.members"] });
    if (!task) return res.status(404).json({ message: "Task not found" });
    // Only allow assigned user to complete
    if (task.assignedUserId !== req.user.id) {
      return res.status(403).json({ message: "Only the assigned user can complete this task" });
    }
    if (task.status !== "In Progress") {
      return res.status(400).json({ message: "Task is not in progress" });
    }
    task.status = "Done";
    task.completedByUserId = req.user.id;
    task.completedAt = new Date();
    await taskRepo.save(task);
    res.json(task);
  } catch (error) {
    console.error("❌ Error completing task:", error);
    res.status(500).json({ message: "Failed to complete task", error: error.message });
  }
});

// ===============================
//     CALENDAR EVENTS ROUTES
// ===============================

// Get all events for the authenticated user
app.get("/api/calendar/events", authenticate, async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository("Event");
    const events = await eventRepo.find({ where: { userId: req.user.id } });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events", error: error.message });
  }
});

// Create a new event
app.post("/api/calendar/events", authenticate, async (req, res) => {
  try {
    const { title, description, start, end, allDay } = req.body;
    const eventRepo = AppDataSource.getRepository("Event");
    const newEvent = eventRepo.create({
      title,
      description,
      start: new Date(start),
      end: new Date(end),
      allDay: !!allDay,
      userId: req.user.id,
    });
    await eventRepo.save(newEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ message: "Failed to create event", error: error.message });
  }
});

// Update an event
app.put("/api/calendar/events/:id", authenticate, async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository("Event");
    const event = await eventRepo.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!event) return res.status(404).json({ message: "Event not found" });
    const { title, description, start, end, allDay } = req.body;
    event.title = title || event.title;
    event.description = description || event.description;
    event.start = start ? new Date(start) : event.start;
    event.end = end ? new Date(end) : event.end;
    event.allDay = typeof allDay === 'boolean' ? allDay : event.allDay;
    await eventRepo.save(event);
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Failed to update event", error: error.message });
  }
});

// Delete an event
app.delete("/api/calendar/events/:id", authenticate, async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository("Event");
    const event = await eventRepo.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!event) return res.status(404).json({ message: "Event not found" });
    await eventRepo.remove(event);
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event", error: error.message });
  }
});

// Download a generated text file
app.get('/api/download/text', authenticate, (req, res) => {
  const content = 'This is a generated text file!';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="generated.txt"');
  res.send(content);
});

// Download a generated doc file
app.get('/api/download/doc', authenticate, (req, res) => {
  const content = 'This is a generated Word document (as plain text for demo).';
  res.setHeader('Content-Type', 'application/msword');
  res.setHeader('Content-Disposition', 'attachment; filename="generated.doc"');
  res.send(content);
});

// Endpoint to get a signed URL for a file
app.get("/files/signed-url", authenticate, async (req, res) => {
  try {
    const key = req.query.key;
    console.log("[SIGNED URL] Requested S3 key:", key);
    if (!key) return res.status(400).json({ message: "Missing S3 key" });
    
    // Check if user has access to this file
    const fileRepo = AppDataSource.getRepository(File);
    const file = await fileRepo.findOne({ where: { s3Key: key } });
    
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    
    // Check if user owns the file or if it's shared with them
    const isOwner = file.user_id === req.user.id;
    const isShared = sharingSystem.isItemSharedWith('file', file.id, req.user.id, req.user.email);
    
    if (!isOwner && !isShared) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const command = new GetObjectCommand({
      Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 minutes
    res.json({ url });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ message: "Failed to generate signed URL" });
  }
});

// --- ZIP/RAR Extraction Endpoint with S3 upload and folder DB, always extract to a named folder ---
app.post("/files/:id/extract", authenticate, async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    const folderRepo = AppDataSource.getRepository(Folder);
    const file = await fileRepo.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!file) return res.status(404).json({ message: "File not found" });
    const ext = path.extname(file.file_name).toLowerCase();
    if (ext !== '.zip' && ext !== '.rar') {
      return res.status(400).json({ message: "Not a zip or rar file" });
    }
    // Accept folder_name from request body
    const folderName = req.body.folder_name && req.body.folder_name.trim() ? req.body.folder_name.trim() : path.basename(file.file_name, ext);
    // Create/find the top-level folder in DB, as a child of the archive's folder
    const parentId = file.folder_id || null;
    let topFolder = await folderRepo.findOne({ where: { name: folderName, parent_id: parentId, user_id: req.user.id } });
    if (!topFolder) {
      // Compute path for the new folder
      let parentFolder = null;
      let folderPath = folderName;
      if (parentId) {
        parentFolder = await folderRepo.findOne({ where: { id: parentId, user_id: req.user.id } });
        folderPath = parentFolder && parentFolder.path ? `${parentFolder.path}/${parentFolder.id}/${folderName}` : folderName;
      }
      topFolder = folderRepo.create({ name: folderName, parent_id: parentId, user_id: req.user.id, path: folderPath });
      await folderRepo.save(topFolder);
    }
    // Download from S3 to temp file
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-'));
    const tempFilePath = path.join(tempDir, file.file_name.replace(/\s+/g, '_'));
    const s3Stream = await s3.send(new GetObjectCommand({
      Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
      Key: file.s3Key
    }));
    const writeStream = fs.createWriteStream(tempFilePath);
    await new Promise((resolve, reject) => {
      s3Stream.Body.pipe(writeStream);
      s3Stream.Body.on('end', resolve);
      s3Stream.Body.on('error', reject);
    });
    // Extract
    let extractedFiles = [];
    if (ext === '.zip') {
      const zip = new AdmZip(tempFilePath);
      zip.extractAllTo(tempDir, true);
      extractedFiles = zip.getEntries().filter(e => !e.isDirectory).map(e => e.entryName);
    } else if (ext === '.rar') {
      const data = fs.readFileSync(tempFilePath);
      const extractor = Unrar.createExtractorFromData(data);
      const extracted = extractor.extractAll();
      extractedFiles = [];
      extracted.files.forEach(fileEntry => {
        if (fileEntry.extraction && fileEntry.fileHeader.name) {
          const outPath = path.join(tempDir, fileEntry.fileHeader.name);
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, fileEntry.extraction);
          extractedFiles.push(fileEntry.fileHeader.name);
        }
      });
    }
    // --- Upload extracted files to S3 and create folders/files in DB ---
    const uploadedFiles = [];
    for (const relPath of extractedFiles) {
      const absPath = path.join(tempDir, relPath);
      // Always prefix with the chosen folder name
      const archiveRelPath = path.join(folderName, relPath).replace(/\\/g, '/');
      // Parse folder structure
      const parts = archiveRelPath.split(/[\\/]/); // works for zip and rar
      const fileName = parts.pop();
      let parentId = topFolder.id;
      let folderPath = folderName;
      // For each folder in the path (after the top folder), create/find it in DB
      for (const folderNamePart of parts.slice(1)) { // skip the first (top folder)
        folderPath = folderPath + '/' + folderNamePart;
        let folder = await folderRepo.findOne({ where: { name: folderNamePart, parent_id: parentId, user_id: req.user.id } });
        if (!folder) {
          folder = folderRepo.create({ name: folderNamePart, parent_id: parentId, user_id: req.user.id, path: folderPath });
          await folderRepo.save(folder);
        }
        parentId = folder.id;
      }
      // Upload file to S3
      const s3Key = `files/${req.user.id}/${archiveRelPath}`;
      const fileBuffer = fs.readFileSync(absPath);
      await s3.send(new PutObjectCommand({
        Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: undefined // Let S3 guess
      }));
      const fileUrl = `https://${process.env.REACT_APP_AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${s3Key}`;
      // Ensure unique file name in the target folder
      const extExtract = path.extname(fileName);
      const baseNameExtract = path.basename(fileName, extExtract);
      const uniqueNameExtract = await getUniqueFileName(fileRepo, req.user.id, parentId, baseNameExtract, extExtract);
      const newFile = fileRepo.create({
        user_id: req.user.id,
        file_name: uniqueNameExtract,
        file_url: fileUrl,
        s3Key: s3Key,
        folder_id: parentId,
        uploaded_at: new Date()
      });
      await fileRepo.save(newFile);
      uploadedFiles.push({ file: uniqueNameExtract, folder: folderPath, url: fileUrl });
    }
    res.json({ message: "Extracted and uploaded", files: uploadedFiles });
  } catch (error) {
    console.error("Extract error:", error);
    res.status(500).json({ message: "Extraction failed", error: error.message });
  }
});
// --- END ZIP/RAR Extraction Endpoint ---

// Add a global error handler at the end of the file
app.use((err, req, res, next) => {
  console.error("❌ Uncaught error:", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});
    
// Promote a user to admin (creator only)
app.post('/api/teams/:teamId/members/:memberId/promote', authenticate, async (req, res) => {
  const { teamId, memberId } = req.params;
  const teamRepo = AppDataSource.getRepository("Team");
  const team = await teamRepo.findOne({ where: { id: teamId } });
  if (!team) return res.status(404).json({ message: "Team not found" });
  if (String(team.creatorId) !== String(req.user.id)) return res.status(403).json({ message: "Only creator can promote" });

  await AppDataSource.query(
    `UPDATE team_members SET role = 'admin' WHERE team_id = ? AND user_id = ? AND role != 'creator'`,
    [teamId, memberId]
  );
  res.json({ message: "Promoted to admin" });
});

// Demote an admin to user (creator only)
app.post('/api/teams/:teamId/members/:memberId/demote', authenticate, async (req, res) => {
  const { teamId, memberId } = req.params;
  const teamRepo = AppDataSource.getRepository("Team");
  const team = await teamRepo.findOne({ where: { id: teamId } });
  if (!team) return res.status(404).json({ message: "Team not found" });
  if (String(team.creatorId) !== String(req.user.id)) return res.status(403).json({ message: "Only creator can demote" });

  await AppDataSource.query(
    `UPDATE team_members SET role = 'user' WHERE team_id = ? AND user_id = ? AND role = 'admin'`,
    [teamId, memberId]
  );
  res.json({ message: "Demoted to user" });
});

// Update team members API to return roles
app.get("/api/teams/:teamId/members", authenticate, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const members = await AppDataSource.query(
      `SELECT u.id, u.username, u.email, u.avatar_url, tm.role
       FROM users u
       JOIN team_members tm ON tm.user_id = u.id
       WHERE tm.team_id = ?`,
      [teamId]
    );
    res.json({ members });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team members", error: error.message });
  }
});

// Accept team invitation
app.post("/api/teams/:teamId/invitations/:invitationId/accept", authenticate, async (req, res) => {
  try {
    const { teamId, invitationId } = req.params;
    const invitationRepo = AppDataSource.getRepository("Invitation");
    const teamRepo = AppDataSource.getRepository("Team");
    
    // Find the invitation
    const invitation = await invitationRepo.findOne({
      where: { id: invitationId, teamId, inviteeId: req.user.id, status: "pending" }
    });
    
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found or already processed" });
    }
    
    // Check if team exists
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Add user to team
    await AppDataSource.query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'user')`,
      [teamId, req.user.id]
    );
    
    // Update invitation status
    invitation.status = "accepted";
    await invitationRepo.save(invitation);
    
    // Create notification for team creator
    await createNotification(
      team.creatorId,
      'invitation',
      'Invitation Accepted',
      `${req.user.username || req.user.name} accepted your invitation to join "${team.name}"`,
      { teamId, teamName: team.name, acceptedBy: req.user.id }
    );
    
    res.json({ message: "Invitation accepted successfully" });
  } catch (error) {
    console.error("❌ Error accepting invitation:", error);
    res.status(500).json({ message: "Failed to accept invitation", error: error.message });
  }
});

// Decline team invitation
app.post("/api/teams/:teamId/invitations/:invitationId/decline", authenticate, async (req, res) => {
  try {
    const { teamId, invitationId } = req.params;
    const invitationRepo = AppDataSource.getRepository("Invitation");
    const teamRepo = AppDataSource.getRepository("Team");
    
    // Find the invitation
    const invitation = await invitationRepo.findOne({
      where: { id: invitationId, teamId, inviteeId: req.user.id, status: "pending" }
    });
    
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found or already processed" });
    }
    
    // Check if team exists
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Update invitation status
    invitation.status = "declined";
    await invitationRepo.save(invitation);
    
    // Create notification for team creator
    await createNotification(
      team.creatorId,
      'invitation',
      'Invitation Declined',
      `${req.user.username || req.user.name} declined your invitation to join "${team.name}"`,
      { teamId, teamName: team.name, declinedBy: req.user.id }
    );
    
    res.json({ message: "Invitation declined successfully" });
  } catch (error) {
    console.error("❌ Error declining invitation:", error);
    res.status(500).json({ message: "Failed to decline invitation", error: error.message });
  }
});

// Get pending invitations for the authenticated user
app.get("/api/teams/invitations", authenticate, async (req, res) => {
  try {
    const invitationRepo = AppDataSource.getRepository("Invitation");
    const invitations = await invitationRepo.find({
      where: { inviteeId: req.user.id, status: "pending" },
      relations: ["team"]
    });
    res.json({ invitations });
  } catch (error) {
    console.error("❌ Error fetching invitations:", error);
    res.status(500).json({ message: "Failed to fetch invitations", error: error.message });
  }
});

/* ===============================
        🔔 NOTIFICATION ROUTES
================================ */

// Get all notifications for the authenticated user
app.get("/api/notifications", authenticate, async (req, res) => {
  try {
    const notificationRepo = AppDataSource.getRepository("Notification");
    const notifications = await notificationRepo.find({
      where: { userId: req.user.id },
      order: { createdAt: "DESC" }
    });
    res.json({ notifications });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
});

// Mark notification as read
app.patch("/api/notifications/:id/read", authenticate, async (req, res) => {
  try {
    const notificationRepo = AppDataSource.getRepository("Notification");
    const notification = await notificationRepo.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    notification.isRead = true;
    await notificationRepo.save(notification);
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to mark notification as read", error: error.message });
  }
});

// Mark all notifications as read
app.patch("/api/notifications/read-all", authenticate, async (req, res) => {
  try {
    const notificationRepo = AppDataSource.getRepository("Notification");
    await notificationRepo.update(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("❌ Error marking all notifications as read:", error);
    res.status(500).json({ message: "Failed to mark notifications as read", error: error.message });
  }
});

// Delete a notification
app.delete("/api/notifications/:id", authenticate, async (req, res) => {
  try {
    const notificationRepo = AppDataSource.getRepository("Notification");
    const notification = await notificationRepo.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    await notificationRepo.remove(notification);
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("❌ Error deleting notification:", error);
    res.status(500).json({ message: "Failed to delete notification", error: error.message });
  }
});

// Helper function to create notifications
async function createNotification(userId, type, title, message, data = null) {
  try {
    const notificationRepo = AppDataSource.getRepository("Notification");
    const notification = notificationRepo.create({
      userId,
      type,
      title,
      message,
      data
    });
    await notificationRepo.save(notification);
    
    // Emit real-time notification via Socket.IO
    io.to(`user-${userId}`).emit('new-notification', notification);
    
    return notification;
  } catch (error) {
    console.error("❌ Error creating notification:", error);
  }
}

/* ===============================
        📅 CALENDAR ROUTES
================================ */

// Get all calendar events for the authenticated user
app.get("/api/calendar/events", authenticate, async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository("CalendarEvent");
    const events = await eventRepo.find({
      where: { userId: req.user.id },
      order: { start: "ASC" }
    });
    res.json(events);
  } catch (error) {
    console.error("❌ Error fetching calendar events:", error);
    res.status(500).json({ message: "Failed to fetch calendar events", error: error.message });
  }
});

// Create a new calendar event
app.post("/api/calendar/events", authenticate, async (req, res) => {
  try {
    const { title, description, start, end, allDay } = req.body;
    const eventRepo = AppDataSource.getRepository("CalendarEvent");
    
    const event = eventRepo.create({
      userId: req.user.id,
      title,
      description,
      start: new Date(start),
      end: new Date(end),
      allDay: allDay || false
    });
    
    const savedEvent = await eventRepo.save(event);
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error("❌ Error creating calendar event:", error);
    res.status(500).json({ message: "Failed to create calendar event", error: error.message });
  }
});

// Update a calendar event
app.put("/api/calendar/events/:id", authenticate, async (req, res) => {
  try {
    const { title, description, start, end, allDay } = req.body;
    const eventRepo = AppDataSource.getRepository("CalendarEvent");
    
    const event = await eventRepo.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    
    event.title = title || event.title;
    event.description = description || event.description;
    event.start = start ? new Date(start) : event.start;
    event.end = end ? new Date(end) : event.end;
    event.allDay = allDay !== undefined ? allDay : event.allDay;
    
    const updatedEvent = await eventRepo.save(event);
    res.json(updatedEvent);
  } catch (error) {
    console.error("❌ Error updating calendar event:", error);
    res.status(500).json({ message: "Failed to update calendar event", error: error.message });
  }
});

// Delete a calendar event
app.delete("/api/calendar/events/:id", authenticate, async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository("CalendarEvent");
    const event = await eventRepo.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    
    await eventRepo.remove(event);
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting calendar event:", error);
    res.status(500).json({ message: "Failed to delete calendar event", error: error.message });
  }
});

// Add CalendarEvent entity schema
const CalendarEvent = new EntitySchema({
  name: "CalendarEvent",
  tableName: "calendar_events",
  columns: {
    id: { primary: true, type: "varchar", length: 255, generated: "uuid" },
    userId: { type: "varchar", length: 255 },
    title: { type: "varchar", length: 255 },
    description: { type: "text", nullable: true },
    start: { type: "datetime" },
    end: { type: "datetime" },
    allDay: { type: "boolean", default: false },
    createdAt: { type: "datetime", createDate: true },
    updatedAt: { type: "datetime", updateDate: true }
  }
});


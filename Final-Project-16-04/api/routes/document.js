// api/routes/documents.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const AppDataSource = require("../data-source");
const Document = require("../src/entities/Document");
const sharingSystem = require("../sharing-system");

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "❌ No token provided" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRepo = AppDataSource.getRepository("User");
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

// S3 client initialization
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  },
});

// Create document
router.post("/", authenticate, async (req, res) => {
  const { title, content, folder_id } = req.body;
  
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    
    // Generate a unique key for S3
    const s3Key = `documents/${req.user.id}/${Date.now()}-${title.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Prepare document content
    const documentContent = content || { 
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }]
    };

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
      Key: s3Key,
      Body: JSON.stringify(documentContent),
      ContentType: 'application/json'
    };

    console.log('📤 Attempting to upload document to S3:', {
      bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
      key: s3Key,
      contentType: 'application/json'
    });

    try {
      await s3.send(new PutObjectCommand(uploadParams));
      console.log('✅ Document content uploaded to S3 successfully');
    } catch (s3Error) {
      console.error("❌ S3 upload error:", s3Error);
      return res.status(500).json({ 
        message: "Failed to upload to S3", 
        error: s3Error.message 
      });
    }
    
    // Create document record in database
    const newDocument = documentRepo.create({
      title: title || "Untitled Document",
      content: JSON.stringify(documentContent), // Keep a copy in DB for quick access
      userId: req.user.id,
      s3Key: s3Key,
      createdAt: new Date(),
      updatedAt: new Date(),
      folder_id: folder_id || null
    });
    
    await documentRepo.save(newDocument);
    
    // Generate S3 URL
    const s3Url = `https://${process.env.REACT_APP_AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${s3Key}`;
    
    res.status(201).json({ 
      message: "✅ Document created successfully", 
      document: {
        ...newDocument,
        s3Url
      }
    });
  } catch (error) {
    console.error("❌ Document creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all documents for a user
router.get("/", authenticate, async (req, res) => {
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    const query = { userId: req.user.id };
    if (req.query.root === 'true') {
      query.folder_id = null;
    } else if (req.query.folder_id) {
      query.folder_id = req.query.folder_id;
    }
    const documents = await documentRepo.find({
      where: query,
      select: ["id", "title", "createdAt", "updatedAt", "folder_id"],
      order: { createdAt: "DESC" }
    });
    res.status(200).json({ documents });
  } catch (error) {
    console.error("❌ Get documents error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get document by id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    const document = await documentRepo.findOne({
      where: { id: req.params.id },
      select: [
        "id", "title", "content", "s3Key", "userId", "createdAt", "updatedAt", "folder_id"
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: "❌ Document not found" });
    }
    
    // Check if user owns the document or if it's shared with them
    const isOwner = document.userId === req.user.id;
    const isShared = sharingSystem.isItemSharedWith('document', req.params.id, req.user.id, req.user.email);
    
    if (!isOwner && !isShared) {
      return res.status(404).json({ message: "❌ Document not found" });
    }
    
    res.json({ document });
  } catch (error) {
    console.error("❌ Get document error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update document
router.put("/:id", authenticate, async (req, res) => {
  const { title, content } = req.body;
  
  try {
    const documentRepo = AppDataSource.getRepository(Document);
    
    let document = await documentRepo.findOne({
      where: { id: req.params.id },
      select: [
        "id", "title", "content", "s3Key", "userId", "createdAt", "updatedAt", "folder_id"
      ]
    });
    
    if (!document) {
      return res.status(404).json({ message: "❌ Document not found" });
    }
    
    // Check if user owns the document or if it's shared with them
    const isOwner = document.userId === req.user.id;
    const isShared = sharingSystem.isItemSharedWith('document', req.params.id, req.user.id, req.user.email);
    
    if (!isOwner && !isShared) {
      return res.status(403).json({ message: "❌ You don't have permission to edit this document" });
    }
    
    // Update S3 if content is provided
    if (content) {
      const uploadParams = {
        Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
        Key: document.s3Key,
        Body: JSON.stringify(content),
        ContentType: 'application/json'
      };

      console.log('📤 Attempting to update document in S3:', {
        bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
        key: document.s3Key,
        contentType: 'application/json'
      });

      try {
        await s3.send(new PutObjectCommand(uploadParams));
        console.log('✅ Document content updated in S3 successfully');
      } catch (s3Error) {
        console.error("❌ S3 update error:", s3Error);
        return res.status(500).json({ 
          message: "Failed to update in S3", 
          error: s3Error.message 
        });
      }
    }
    
    // Update document in database
    document.title = title || document.title;
    if (content) document.content = JSON.stringify(content);
    document.updatedAt = new Date();
    
    await documentRepo.save(document);
    
    // Generate S3 URL
    const s3Url = `https://${process.env.REACT_APP_AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${document.s3Key}`;
    
    res.json({ 
      message: "✅ Document updated successfully", 
      document: {
        ...document,
        s3Url
      }
    });
  } catch (error) {
    console.error("❌ Update document error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete document
router.delete("/:id", authenticate, async (req, res) => {
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

    // Delete from S3 first
    if (document.s3Key) {
      const deleteParams = {
        Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
        Key: document.s3Key
      };

      try {
        await s3.send(new DeleteObjectCommand(deleteParams));
      } catch (s3Error) {
        console.error("❌ S3 delete error:", s3Error);
        // Continue with database deletion even if S3 deletion fails
      }
    }
    
    await documentRepo.remove(document);
    
    res.json({ message: "✅ Document deleted successfully" });
  } catch (error) {
    console.error("❌ Delete document error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
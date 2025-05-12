// api/routes/documents.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const AppDataSource = require("../data-source");
const Document = require("../src/entities/Document");

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

// Create document
router.post("/", authenticate, async (req, res) => {
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
router.get("/", authenticate, async (req, res) => {
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
router.get("/:id", authenticate, async (req, res) => {
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
router.put("/:id", authenticate, async (req, res) => {
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
    
    await documentRepo.remove(document);
    
    res.json({ message: "✅ Document deleted successfully" });
  } catch (error) {
    console.error("❌ Delete document error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
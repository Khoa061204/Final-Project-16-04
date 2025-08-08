const express = require('express');
const { AppDataSource } = require('../config/database');
const Document = require('../models/Document');
const Share = require('../models/Share');
const ActivityService = require('../services/activityService');

const router = express.Router();

// Helper function to check if user has access to a document (owner or shared)
const checkDocumentAccess = async (documentId, userId, requiredPermission = 'view') => {
  console.log('🔍 Checking document access:', { documentId, userId, requiredPermission });
  const documentRepo = AppDataSource.getRepository(Document);
  const shareRepo = AppDataSource.getRepository(Share);
  
  // First check if user owns the document
  const document = await documentRepo.findOne({ 
    where: { id: documentId, userId: userId }
  });
  
  if (document) {
    console.log('✅ User owns document:', documentId);
    return { hasAccess: true, permission: 'admin', document };
  }
  
  // Check if document exists at all
  const existingDocument = await documentRepo.findOne({ 
    where: { id: documentId }
  });
  
  if (!existingDocument) {
    console.log('❌ Document does not exist:', documentId);
    return { hasAccess: false, permission: null, document: null };
  }
  
  console.log('📄 Document exists, checking shares for user:', userId);
  
  // Check if document is shared with this user
  const share = await shareRepo.findOne({
    where: {
      resourceType: 'document',
      resourceId: documentId,
      sharedWith: userId,
      isActive: true
    }
  });
  
  console.log('🔍 Share lookup result:', share ? 'Found' : 'Not found');
  
  if (!share) {
    return { hasAccess: false, permission: null, document: existingDocument };
  }
  
  // Check if user has required permission level
  const permissionLevels = { 'view': 1, 'edit': 2, 'admin': 3 };
  const userLevel = permissionLevels[share.permission] || 0;
  const requiredLevel = permissionLevels[requiredPermission] || 0;
  
  if (userLevel >= requiredLevel) {
    return { hasAccess: true, permission: share.permission, document: existingDocument };
  }
  
  return { hasAccess: false, permission: share.permission, document: existingDocument };
};

// Get all documents for the current user
router.get("/", async (req, res) => {
  try {
    const { root } = req.query;
    const documentRepo = AppDataSource.getRepository(Document);
    
    const query = {};
    
    // If root=true, only get documents without a folder
    if (root === 'true') {
      query.folder_id = null;
    }
    
    // Add userId filter
    query.userId = req.user.id;
    
    const documents = await documentRepo.find({
      where: query,
      order: { createdAt: "DESC" }
    });
    
    res.json({ 
      success: true,
      documents 
    });
  } catch (error) {
    console.error("Error getting documents:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});

// Get a specific document
router.get("/:id", async (req, res) => {
  try {
    console.log('📄 Getting document:', req.params.id, 'for user:', req.user.id);
    const { hasAccess, permission, document } = await checkDocumentAccess(req.params.id, req.user.id, 'view');
    
        if (!document) {
      console.log('❌ Document not found:', req.params.id);
      return res.status(404).json({ 
        success: false,
        message: "Document not found" 
      });
    }

    if (!hasAccess) {
      console.log('❌ Access denied to document:', req.params.id, 'for user:', req.user.id, 'permission:', permission);
      return res.status(403).json({ 
        success: false,
        message: "Access denied" 
      });
    }

    console.log('✅ Document access granted:', req.params.id, 'permission:', permission);
    
    // Add permission info to response for frontend use
    res.json({ 
      success: true,
      document: {
        ...document,
        userPermission: permission,
        isOwner: document.userId === req.user.id
      }
    });
  } catch (error) {
    console.error("Error getting document:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});

// Create a new document
router.post("/", async (req, res) => {
  try {
    console.log('📄 Creating document request:', { 
      userId: req.user?.id, 
      body: req.body,
      hasTitle: !!req.body.title 
    });
    
    const { title, content, folder_id } = req.body;
    const documentRepo = AppDataSource.getRepository(Document);
    
    if (!req.user || !req.user.id) {
      console.error('❌ No user found in request');
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }
    
    if (!title || title.trim().length === 0) {
      console.error('❌ No title provided:', title);
      return res.status(400).json({
        success: false,
        message: "Document title is required"
      });
    }
    
    const document = documentRepo.create({
      title: title.trim(),
      content: content || null,
      userId: req.user.id,
      folder_id: folder_id || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const savedDocument = await documentRepo.save(document);
    
    // Log document creation activity
    await ActivityService.logActivity(
      req.user.id,
      ActivityService.ACTIVITY_TYPES.DOCUMENT_CREATED,
      `Created document "${savedDocument.title}"`,
      'document',
      savedDocument.id,
      { 
        documentTitle: savedDocument.title,
        folderId: folder_id,
        createdDate: new Date().toISOString()
      }
    );
    
    res.status(201).json({
      success: true,
      message: "Document created successfully",
      document: savedDocument
    });
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Update a document (SAVE functionality)
router.put("/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    const documentId = req.params.id;
    const documentRepo = AppDataSource.getRepository(Document);
    
    // Check if user has edit access to the document
    const { hasAccess, permission, document } = await checkDocumentAccess(documentId, req.user.id, 'edit');
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to edit this document"
      });
    }
    
    // Update the document
    const updatedDocument = await documentRepo.save({
      ...document,
      title: title || document.title,
      content: content !== undefined ? JSON.stringify(content) : document.content,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: "Document saved successfully",
      document: updatedDocument
    });
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Delete a document
router.delete("/:id", async (req, res) => {
  try {
    const documentId = req.params.id;
    const documentRepo = AppDataSource.getRepository(Document);
    
    // Find the document
    const document = await documentRepo.findOne({ 
      where: { id: documentId }
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    // Check if user owns the document
    if (document.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    
    // Delete the document
    await documentRepo.remove(document);
    
    res.json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Toggle favorite status for a document
router.patch("/:id/favorite", async (req, res) => {
  try {
    const documentId = req.params.id;
    const documentRepo = AppDataSource.getRepository(Document);
    
    // Check if user has access to the document
    const { hasAccess, permission, document } = await checkDocumentAccess(documentId, req.user.id, 'edit');
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }
    
    if (!hasAccess || permission === 'view') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this document"
      });
    }
    
    // Toggle favorite status
    const newFavoriteStatus = !document.is_favorite;
    await documentRepo.update(documentId, { is_favorite: newFavoriteStatus });
    
    res.json({
      success: true,
      message: newFavoriteStatus ? "Document added to favorites" : "Document removed from favorites",
      is_favorite: newFavoriteStatus
    });
    
  } catch (error) {
    console.error("Error toggling document favorite:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle favorite status"
    });
  }
});

module.exports = router; 
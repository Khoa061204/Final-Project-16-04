const express = require('express');
const { AppDataSource } = require('../config/database');
const Folder = require('../models/Folder');
const File = require('../models/File');
const Document = require('../models/Document');

const router = express.Router();

// ✅ Get all folders for the current user (optimized for speed)
router.get("/", async (req, res) => {
  try {
    const folderRepo = AppDataSource.getRepository(Folder);
    const query = {};
    
    // Add parent_id filter if provided
    if (req.query.parent_id) {
      query.parent_id = req.query.parent_id;
    } else {
      // If no parent_id, get root folders (parent_id is null)
      query.parent_id = null;
    }
    
    // Get folders with minimal data for speed
    console.log('🔍 Query for folders:', query);
    const folders = await folderRepo.find({
      where: query,
      select: ['id', 'name', 'parent_id', 'user_id', 'created_at'], // Only select needed fields
      order: { name: "ASC" },
      take: 50 // Limit for performance
    });
    
    console.log(`📁 Found ${folders.length} folders for user ${req.user.id}`);
    res.json({ folders });
  } catch (error) {
    console.error("❌ Get folders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Get folder contents (for deletion preview) (exact copy from old server.js)
router.get("/:id/contents", async (req, res) => {
  try {
    const folderRepo = AppDataSource.getRepository(Folder);
    const fileRepo = AppDataSource.getRepository(File);
    const documentRepo = AppDataSource.getRepository(Document);
    
    // Find folder
    const folder = await folderRepo.findOne({ 
      where: { 
        id: req.params.id
      },
      relations: ["children"]
    });
    
    if (!folder) {
      return res.status(404).json({ 
        message: "Folder not found" 
      });
    }

    // Get files and documents in this folder
    const files = await fileRepo.find({
      where: { folder_id: folder.id },
      select: ['id', 'file_name', 'uploaded_at']
    });

    const documents = await documentRepo.find({
      where: { folder_id: folder.id },
      select: ['id', 'title', 'createdAt']
    });

    const subfolders = folder.children || [];

    res.json({
      folder: {
        id: folder.id,
        name: folder.name
      },
      contents: {
        files: files.map(f => ({ id: f.id, name: f.file_name, date: f.uploaded_at })),
        documents: documents.map(d => ({ id: d.id, name: d.title, date: d.createdAt })),
        subfolders: subfolders.map(sf => ({ id: sf.id, name: sf.name }))
      },
      counts: {
        files: files.length,
        documents: documents.length,
        subfolders: subfolders.length,
        total: files.length + documents.length + subfolders.length
      }
    });
  } catch (error) {
    console.error("❌ Get folder contents error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Delete a folder (exact copy from old server.js)
router.delete("/:id", async (req, res) => {
  try {
    const folderRepo = AppDataSource.getRepository(Folder);
    const fileRepo = AppDataSource.getRepository(File);
    const documentRepo = AppDataSource.getRepository(Document);
    
    // Find folder
    const folder = await folderRepo.findOne({ 
      where: { 
        id: req.params.id
      },
      relations: ["children"]
    });
    
    if (!folder) {
      return res.status(404).json({ 
        message: "Folder not found" 
      });
    }

    // Check if folder has children (subfolders)
    if (folder.children && folder.children.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete folder that contains subfolders. Please delete subfolders first.",
        hasSubfolders: true
      });
    }

    // Check if folder has files or documents
    const fileCount = await fileRepo.count({
      where: { folder_id: folder.id }
    });

    const documentCount = await documentRepo.count({
      where: { folder_id: folder.id }
    });

    console.log(`📁 Folder "${folder.name}" (ID: ${folder.id}) contains: ${fileCount} files, ${documentCount} documents, ${folder.children?.length || 0} subfolders`);

    if (fileCount > 0 || documentCount > 0) {
      const errorResponse = {
        message: `Cannot delete folder that contains ${fileCount} files and ${documentCount} documents. Please move or delete them first.`,
        hasContents: true,
        counts: {
          files: fileCount,
          documents: documentCount
        }
      };
      return res.status(400).json(errorResponse);
    }

    // Delete the folder
    await folderRepo.remove(folder);
    
    console.log(`✅ Folder "${folder.name}" (ID: ${folder.id}) deleted successfully`);
    res.json({ 
      message: "Folder deleted successfully",
      deletedFolder: {
        id: folder.id,
        name: folder.name
      }
    });
  } catch (error) {
    console.error("❌ Delete folder error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router; 
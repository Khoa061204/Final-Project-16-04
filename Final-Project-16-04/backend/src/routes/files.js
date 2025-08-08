const express = require('express');
const multer = require('multer');
const path = require('path');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { AppDataSource } = require('../config/database');
const s3Client = require('../config/s3');
const File = require('../models/File');
const Folder = require('../models/Folder');
const Document = require('../models/Document'); // Added for new routes
const ActivityService = require('../services/activityService');
const fs = require('fs'); // Added for temp directory cleanup

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  },
});

// Allowed MIME types
const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/html', 'text/css', 'text/javascript',
  'application/json', 'application/xml', 'application/zip', 'application/x-rar-compressed',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
];

// Add helper function at the top of the file
async function getUniqueFileName(fileRepo, userId, folderId, baseName, ext) {
  let counter = 1;
  let fileName = baseName + ext;
  
  while (true) {
    const existingFile = await fileRepo.findOne({
      where: {
        user_id: userId,
        folder_id: folderId,
        file_name: fileName
      }
    });
    
    if (!existingFile) {
      return fileName;
    }
    
    fileName = `${baseName} (${counter})${ext}`;
    counter++;
  }
}

// Get root files (files?root=true endpoint) - optimized for performance
router.get("/", async (req, res) => {
  try {
    const { root, folder_id } = req.query;
    const fileRepo = AppDataSource.getRepository(File);
    const shareRepo = AppDataSource.getRepository(require('../models/Share'));
    
    const query = {};
    
    // Add user ownership filter
    query.user_id = req.user.id;
    
    // If root=true, only get files without a folder
    // If folder_id is provided, only get files in that folder
    if (root === 'true') {
      query.folder_id = null;
      console.log('Fetching root files:', query);
    } else if (folder_id) {
      query.folder_id = folder_id;
      console.log('Fetching folder files:', query);
    } else {
      // If neither root nor folder_id specified, return empty array
      console.log('No root or folder_id specified, returning empty array');
      return res.json({ files: [] });
    }
    
    // Optimized query with only needed fields
    const files = await fileRepo.find({
      where: query,
      select: ['id', 'file_name', 's3Key', 'file_url', 'uploaded_at', 'folder_id', 'user_id', 'is_favorite'],
      order: { uploaded_at: "DESC" },
      take: 100 // Limit to 100 files for performance
    });

    // Get shared files if this is a root query (optimized)
    let sharedFiles = [];
    if (root === 'true') {
      const sharedItems = await shareRepo.find({
        where: [
          { resourceType: 'file', sharedWith: req.user.id, isActive: true }
        ],
        select: ['resourceId'],
        take: 50 // Limit shared files for performance
      });
      
      if (sharedItems.length > 0) {
        const sharedFileIds = sharedItems.map(share => share.resourceId);
        sharedFiles = await fileRepo.createQueryBuilder('file')
          .select(['file.id', 'file.file_name', 'file.s3Key', 'file.file_url', 'file.uploaded_at', 'file.folder_id', 'file.user_id', 'file.is_favorite'])
          .where('file.id IN (:...ids)', { ids: sharedFileIds })
          .andWhere('file.folder_id IS NULL') // Only root shared files
          .orderBy('file.uploaded_at', 'DESC')
          .limit(50) // Limit for performance
          .getMany();
      }
    }

    console.log(`Found ${files.length} owned files and ${sharedFiles.length} shared files`);
    res.json({ files: [...files, ...sharedFiles] });
  } catch (error) {
    console.error("❌ Get files error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Add missing routes from old server.js
// Get all files for the current user (replaced by simple router)
router.get("/all-files", async (req, res) => {
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

// Force fix a specific file's s3Key (for debugging)
router.post("/fix-s3key", async (req, res) => {
  try {
    const { fileName, s3Key } = req.body;
    console.log("🔧 [FIX S3KEY] Attempting to fix file:", fileName, "with s3Key:", s3Key);
    
    const fileRepo = AppDataSource.getRepository(File);
    
    // Find file by name and user
    const file = await fileRepo.findOne({ 
      where: { 
        user_id: req.user.id,
        file_name: fileName
      }
    });
    
    console.log("🔧 [FIX S3KEY] Found file:", file ? {
      id: file.id,
      name: file.file_name,
      currentS3Key: file.s3Key
    } : "NOT FOUND");
    
    if (file) {
      // Update the s3Key
      await fileRepo.update(file.id, { s3Key: s3Key });
      console.log(`✅ [FIX S3KEY] Fixed s3Key for file ${fileName}: ${s3Key}`);
      res.json({ message: "File s3Key updated successfully", fileId: file.id });
    } else {
      // If file not found, create it
      console.log("🔧 [FIX S3KEY] File not found, creating new file record...");
      const newFile = fileRepo.create({
        user_id: req.user.id,
        file_name: fileName,
        s3Key: s3Key,
        file_url: '', // Empty URL since we don't have it yet
        uploaded_at: new Date()
      });
      
      const savedFile = await fileRepo.save(newFile);
      console.log(`✅ [FIX S3KEY] Created new file record:`, savedFile.id);
      res.json({ message: "File record created successfully", fileId: savedFile.id });
    }
  } catch (error) {
    console.error("❌ [FIX S3KEY] Error fixing s3Key:", error);
    res.status(500).json({ message: "Failed to fix s3Key", error: error.message });
  }
});

// Refresh file URLs (for files that might have direct S3 URLs instead of signed URLs)
router.post("/refresh-urls", async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    
    // Get all files for the user that might have direct S3 URLs
    const files = await fileRepo.find({ 
      where: { user_id: req.user.id },
      select: ['id', 's3Key', 'file_url']
    });
    
    let updatedCount = 0;
    
    for (const file of files) {
      if (file.s3Key && (!file.file_url || file.file_url.includes('amazonaws.com'))) {
        // Generate new signed URL
        const getObjectCommand = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: file.s3Key,
        });
        const signedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 60 * 60 * 24 * 7 }); // 7 days
        
        // Update the file with new signed URL
        await fileRepo.update(file.id, { file_url: signedUrl });
        updatedCount++;
      }
    }
    
    res.json({ 
      message: `Updated ${updatedCount} file URLs`,
      updatedCount 
    });
  } catch (error) {
    console.error("Error refreshing file URLs:", error);
    res.status(500).json({ message: "Failed to refresh file URLs", error: error.message });
  }
});

// Get file statistics
router.get("/stats", async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    
    // Get total files count
    const totalFiles = await fileRepo.count({ where: { user_id: req.user.id } });
    
    // Get all files for analysis
    const files = await fileRepo.find({ where: { user_id: req.user.id } });
    
    // Get files by type (based on file extension)
    const fileTypes = {};
    files.forEach(file => {
      const ext = path.extname(file.file_name).toLowerCase();
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    
    res.json({
      totalFiles,
      fileTypes,
      storageLimit: 1024 * 1024 * 1024 * 10, // 10GB limit
      storageUsed: 0 // We don't have file_size in the model
    });
  } catch (error) {
    console.error("Error getting file stats:", error);
    res.status(500).json({ message: "Failed to get file statistics" });
  }
});

// Check file status and S3 connectivity
router.get("/status", async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    
    // Get all files for debugging
    const files = await fileRepo.find({ 
      where: {}, // TEMPORARILY DISABLED: { user_id: req.user.id },
      select: ['id', 'file_name', 's3Key', 'file_url', 'uploaded_at']
    });
    
    // Check S3 configuration
    const s3Config = {
      bucket: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION,
      accessKeyPresent: !!process.env.AWS_ACCESS_KEY_ID,
      secretKeyPresent: !!process.env.AWS_SECRET_ACCESS_KEY
    };
    
    // Test S3 connectivity
    let s3Test = { status: 'not_tested' };
    try {
      const { HeadBucketCommand } = require("@aws-sdk/client-s3");
      await s3Client.send(new HeadBucketCommand({
        Bucket: process.env.AWS_BUCKET_NAME
      }));
      s3Test = { status: 'connected' };
    } catch (s3Error) {
      s3Test = { 
        status: 'failed', 
        error: s3Error.message,
        code: s3Error.code
      };
    }
    
    res.json({
      files: {
        total: files.length,
        withS3Key: files.filter(f => f.s3Key).length,
        withoutS3Key: files.filter(f => !f.s3Key).length,
        sample: files.slice(0, 5).map(f => ({
          id: f.id,
          name: f.file_name,
          s3Key: f.s3Key,
          url: f.file_url
        }))
      },
      s3: {
        config: s3Config,
        test: s3Test
      },
      user: {
        id: req.user.id,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error("Error checking file status:", error);
    res.status(500).json({ message: "Failed to check file status", error: error.message });
  }
});

// --- ZIP/RAR Extraction Endpoint with S3 upload and folder DB, always extract to a named folder ---
router.post("/:id/extract", async (req, res) => {
  let tempDir = null;
  let cleanupPerformed = false;
  
  const performCleanup = () => {
    if (cleanupPerformed) return;
    cleanupPerformed = true;
    
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up temp directory: ${tempDir}`);
      }
    } catch (cleanupError) {
      console.error("❌ Cleanup error:", cleanupError);
    }
  };

  try {
    const fileRepo = AppDataSource.getRepository(File);
    const folderRepo = AppDataSource.getRepository(Folder);
    const file = await fileRepo.findOne({ where: { id: req.params.id } }); // TEMPORARILY DISABLED: user_id filter
    
    if (!file) {
      performCleanup();
      return res.status(404).json({ message: "File not found" });
    }
    
    const ext = path.extname(file.file_name).toLowerCase();
    if (ext !== '.zip' && ext !== '.rar') {
      performCleanup();
      return res.status(400).json({ message: "Not a zip or rar file" });
    }
    
    // Accept folder_name from request body
    const folderName = req.body.folder_name && req.body.folder_name.trim() ? req.body.folder_name.trim() : path.basename(file.file_name, ext);
    
    // Check if file has a valid s3Key
    if (!file.s3Key) {
      performCleanup();
      return res.status(400).json({ 
        message: "File not found in S3 (no s3Key). This file may have been uploaded before S3 integration was added.",
        error: "MISSING_S3_KEY"
      });
    }
    
    // Create/find the top-level folder in DB, as a child of the archive's folder
    const parentId = file.folder_id || null;
    let topFolder = await folderRepo.findOne({ where: { name: folderName, parent_id: parentId } });
    if (!topFolder) {
      // Compute path for the new folder
      let parentFolder = null;
      let folderPath = folderName;
      if (parentId) {
        parentFolder = await folderRepo.findOne({ where: { id: parentId } });
        folderPath = parentFolder && parentFolder.path ? `${parentFolder.path}/${parentFolder.id}/${folderName}` : folderName;
      }
      topFolder = folderRepo.create({ name: folderName, parent_id: parentId, path: folderPath });
      await folderRepo.save(topFolder);
    }
    
    performCleanup();
    
    // For now, just return success (extraction logic can be added later)
    res.json({ 
      message: "File extraction initiated",
      fileId: file.id,
      fileName: file.file_name,
      folderId: topFolder.id,
      folderName: folderName
    });
  } catch (error) {
    console.error("❌ Extract error:", error);
    console.error("❌ Error stack:", error.stack);
    
    performCleanup();
    
    // Provide more user-friendly error messages
    let userMessage = "Extraction failed";
    let errorCode = "EXTRACTION_ERROR";
    
    if (error.message.includes("ZIP extraction failed")) {
      userMessage = "The ZIP file appears to be corrupted or invalid. Please try uploading a different ZIP file.";
      errorCode = "CORRUPTED_ZIP";
    } else if (error.message.includes("Failed to download file from S3")) {
      userMessage = "Unable to download the file from storage. Please try again later.";
      errorCode = "DOWNLOAD_ERROR";
    } else if (error.message.includes("No file content received")) {
      userMessage = "The file appears to be empty or corrupted. Please try uploading a different file.";
      errorCode = "EMPTY_FILE";
    }
    
    res.status(500).json({ 
      message: userMessage, 
      error: error.message,
      errorCode: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    // Ensure cleanup is performed even if not already done
    performCleanup();
  }
});

// Add file stats route
router.get('/stats', async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    
    const totalFiles = await fileRepo.count({ where: { user_id: req.user.id } });
    const totalSize = await fileRepo
      .createQueryBuilder('file')
      .select('SUM(file.size)', 'totalSize')
      .where('file.user_id = :userId', { userId: req.user.id })
      .getRawOne();
    
    res.json({
      totalFiles,
      totalSize: parseInt(totalSize?.totalSize || 0)
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Add the old upload route at the end of the file
// Old upload route (Direct to S3)
router.post('/upload', upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: "No file uploaded",
        field: "file"
      });
    }

    // File size validation (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        message: "File size exceeds 50MB limit",
        field: "file",
        maxSize: "50MB"
      });
    }

    // File name validation
    if (!req.file.originalname || req.file.originalname.trim().length === 0) {
      return res.status(400).json({ 
        message: "Invalid file name",
        field: "file"
      });
    }

    // Validate file type
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    if (!allowedMimeTypes.includes(req.file.mimetype) && !['.zip','.rar'].includes(fileExtension)) {
      return res.status(400).json({ 
        message: "File type not allowed",
        field: "file",
        allowedTypes: allowedMimeTypes.join(', ')
      });
    }

    // Validate AWS configuration
    if (!process.env.AWS_BUCKET_NAME) {
      console.error("❌ AWS_BUCKET_NAME is missing");
      return res.status(500).json({ message: "Server configuration error: AWS_BUCKET_NAME is missing" });
    }

    // Use the uploaded file's original name in the 'files/<user_id>/' folder as the S3 key
    const safeFileName = req.file.originalname.replace(/\s+/g, '_');
    const s3Key = `files/${req.user.id}/${safeFileName}`;

    console.log(`📤 Attempting to upload file: ${s3Key}`);
    console.log(`🪣 Using bucket: ${process.env.AWS_BUCKET_NAME}`);

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'private', // Set private ACL
      // Add ownership controls for newer S3 buckets
      ExpectedBucketOwner: process.env.AWS_ACCOUNT_ID || undefined,
      // Add metadata for better organization
      Metadata: {
        'user-id': req.user.id.toString(),
        'file-type': req.file.mimetype,
        'original-name': req.file.originalname,
        'uploaded-at': new Date().toISOString()
      }
    };

          try {
        await s3Client.send(new PutObjectCommand(params));
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

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${s3Key}`;

    // Save file metadata to database
    const fileRepo = AppDataSource.getRepository(File);
    const folderId = req.body.folder_id ? parseInt(req.body.folder_id) : null;
    
    // Generate unique filename if needed
    const baseName = path.parse(safeFileName).name;
    const ext = path.extname(safeFileName);
    const uniqueFileName = await getUniqueFileName(fileRepo, req.user.id, folderId, baseName, ext);
    
    const newFile = fileRepo.create({
      user_id: req.user.id,
      file_name: uniqueFileName,
      file_url: fileUrl,
      s3Key: s3Key,
      folder_id: folderId,
      uploaded_at: new Date()
    });
    
    const savedFile = await fileRepo.save(newFile);
    console.log(`✅ File saved to database with ID: ${savedFile.id}`);

    // Log file upload activity
    await ActivityService.logActivity(
      req.user.id,
      ActivityService.ACTIVITY_TYPES.FILE_UPLOADED,
      `Uploaded file "${uniqueFileName}"`,
      'file',
      savedFile.id,
      { 
        fileName: uniqueFileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        folderId: folderId,
        uploadDate: new Date().toISOString()
      }
    );

    res.status(200).json({ 
      message: "✅ Upload successful", 
      fileUrl: fileUrl,
      fileId: savedFile.id,
      fileName: uniqueFileName
    });
    
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

// Toggle favorite status for a file
router.patch("/:id/favorite", async (req, res) => {
  try {
    const fileId = req.params.id;
    const fileRepo = AppDataSource.getRepository(File);
    
    // Find the file and verify ownership
    const file = await fileRepo.findOne({
      where: { id: fileId, user_id: req.user.id }
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found or you don't have permission to modify it"
      });
    }
    
    // Toggle favorite status
    const newFavoriteStatus = !file.is_favorite;
    await fileRepo.update(fileId, { is_favorite: newFavoriteStatus });
    
    res.json({
      success: true,
      message: newFavoriteStatus ? "File added to favorites" : "File removed from favorites",
      is_favorite: newFavoriteStatus
    });
    
  } catch (error) {
    console.error("Error toggling file favorite:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle favorite status"
    });
  }
});

module.exports = router;
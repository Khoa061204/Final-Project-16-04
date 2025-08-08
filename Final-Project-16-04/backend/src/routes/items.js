const express = require('express');
const { AppDataSource } = require('../config/database');
const File = require('../models/File');
const Document = require('../models/Document');
const Project = require('../models/Project');
const Team = require('../models/Team');
const Invitation = require('../models/Invitation');

const router = express.Router();

// Get all items (files, documents, projects) for the current user
router.get('/', async (req, res) => {
  try {
    const fileRepo = AppDataSource.getRepository(File);
    const documentRepo = AppDataSource.getRepository(Document);
    const projectRepo = AppDataSource.getRepository(Project);

    // Get files for the user
    const files = await fileRepo.find({
      where: { user_id: req.user.id },
      select: ['id', 'file_name', 'file_url', 's3Key', 'uploaded_at', 'folder_id', 'is_favorite'],
      order: { uploaded_at: 'DESC' },
      take: 20
    });

    // Get documents for the user
    const documents = await documentRepo.find({
      where: { userId: req.user.id },
      select: ['id', 'title', 'content', 'createdAt', 'updatedAt', 'is_favorite'],
      order: { createdAt: 'DESC' },
      take: 20
    });

    // Get projects for the user (through team membership)
    const projects = await projectRepo.find({
      select: ['id', 'name', 'description', 'createdAt', 'dueDate'],
      order: { createdAt: 'DESC' },
      take: 20
    });

    // Format response
    const items = [
      ...files.map(file => ({
        id: file.id,
        name: file.file_name,
        type: 'file',
        url: file.file_url,
        s3Key: file.s3Key,
        createdAt: file.uploaded_at,
        folder_id: file.folder_id
      })),
      ...documents.map(doc => ({
        id: doc.id,
        name: doc.title,
        type: 'document',
        content: doc.content,
        createdAt: doc.createdAt
      })),
      ...projects.map(project => ({
        id: project.id,
        name: project.name,
        type: 'project',  
        description: project.description,
        createdAt: project.createdAt,
        dueDate: project.dueDate
      }))
    ];

    // Sort by creation date
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      items: items.slice(0, 50) // Limit to 50 items
    });

  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error.message
    });
  }
});

// Get invitations for the current user
router.get('/invitations', async (req, res) => {
  try {
    const invitationRepo = AppDataSource.getRepository(Invitation);

    const invitations = await invitationRepo.find({
      where: { 
        invitee_email: req.user.email,
        status: 'pending'
      },
      order: { created_at: 'DESC' },
      take: 20
    });

    res.json({
      success: true,
      invitations: invitations
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invitations',
      error: error.message
    });
  }
});

module.exports = router; 
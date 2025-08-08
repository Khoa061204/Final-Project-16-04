const express = require('express');
const router = express.Router();

// Debug endpoint to test sharing and notifications
router.get('/debug/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const shareRepo = AppDataSource.getRepository(Share);
    const notificationRepo = AppDataSource.getRepository(Notification);
    
    // Get shares for this user
    const shares = await shareRepo.find({
      where: { sharedWith: parseInt(userId), isActive: true },
      order: { createdAt: 'DESC' },
      take: 5
    });
    
    // Get notifications for this user
    const notifications = await notificationRepo.find({
      where: { userId: parseInt(userId) },
      order: { createdAt: 'DESC' },
      take: 5
    });
    
    res.json({
      success: true,
      debug: {
        userId: parseInt(userId),
        sharesCount: shares.length,
        shares: shares,
        notificationsCount: notifications.length,
        notifications: notifications
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
const { AppDataSource } = require('../config/database');
const Share = require('../models/Share');
const User = require('../models/User');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const Document = require('../models/Document');
const File = require('../models/File');
const Folder = require('../models/Folder');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

// Create notification helper function
const createNotification = async (userId, type, title, message, data = null) => {
  try {
    console.log('🔔 Creating notification:', { userId, type, title, message });
    const notificationRepo = AppDataSource.getRepository(Notification);
    const notification = notificationRepo.create({
      userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null, // Ensure data is stringified
      isRead: false
    });
    const savedNotification = await notificationRepo.save(notification);
    console.log('✅ Notification saved with ID:', savedNotification.id);
    return savedNotification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// Get resource details by type and ID
const getResourceDetails = async (resourceType, resourceId) => {
  let repo;
  switch (resourceType) {
    case 'file':
      repo = AppDataSource.getRepository(File);
      break;
    case 'document':
      repo = AppDataSource.getRepository(Document);
      break;
    case 'folder':
      repo = AppDataSource.getRepository(Folder);
      break;
    case 'project':
      repo = AppDataSource.getRepository(Project);
      break;
    default:
      throw new Error('Invalid resource type');
  }
  
  const resource = await repo.findOne({ where: { id: resourceId } });
  if (!resource) {
    throw new Error(`${resourceType} not found`);
  }
  
  return resource;
};

// Check if user owns the resource
const checkResourceOwnership = async (resourceType, resourceId, userId) => {
  const resource = await getResourceDetails(resourceType, resourceId);
  // Support various owner column names across tables
  const ownerId =
    resource.userId ??
    resource.user_id ??
    resource.ownerId ??
    resource.owner_id ??
    resource.creator_id ??
    resource.created_by ?? null;
  return ownerId === userId;
};

// Share a resource with users/teams
router.post('/', async (req, res) => {
  try {
    console.log('📤 Share request:', req.body);
    console.log('👤 Current user:', req.user.id);
    
    const { 
      resourceType, 
      resourceId, 
      users = [], 
      teams = [], 
      permission = 'view',
      message = null,
      expiresAt = null 
    } = req.body;
    
    const currentUserId = req.user.id;

    // Validate input
    if (!resourceType || !resourceId) {
      return res.status(400).json({
        success: false,
        message: 'resourceType and resourceId are required'
      });
    }

    if (!['file', 'document', 'folder', 'project'].includes(resourceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource type'
      });
    }

    if (!['view', 'edit', 'admin'].includes(permission)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permission level'
      });
    }

    if (users.length === 0 && teams.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Must specify at least one user or team to share with'
      });
    }

    // Check ownership
    const isOwner = await checkResourceOwnership(resourceType, resourceId, currentUserId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only share resources you own'
      });
    }

    const resource = await getResourceDetails(resourceType, resourceId);
    const shareRepo = AppDataSource.getRepository(Share);
    const userRepo = AppDataSource.getRepository(User);
    const teamRepo = AppDataSource.getRepository(Team);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);
    
    const results = {
      successful: [],
      failed: [],
      alreadyShared: []
    };

    // Share with individual users
    for (const userData of users) {
      try {
        let targetUser;
        
        // Handle both user ID and email
        if (userData.id) {
          targetUser = await userRepo.findOne({ where: { id: userData.id } });
        } else if (userData.email) {
          targetUser = await userRepo.findOne({ where: { email: userData.email } });
        } else {
          results.failed.push({ 
            identifier: userData.email || userData.id, 
            reason: 'Invalid user data' 
          });
          continue;
        }
        
        if (!targetUser) {
          results.failed.push({ 
            identifier: userData.email || userData.id, 
            reason: 'User not found' 
          });
          continue;
        }

        // Don't share with yourself
        if (targetUser.id === currentUserId) {
          continue;
        }

        // Check if already shared
        const existingShare = await shareRepo.findOne({
          where: {
            resourceType,
            resourceId: resourceId,
            sharedWith: targetUser.id,
            isActive: true
          }
        });

        if (existingShare) {
          results.alreadyShared.push({
            user: {
              id: targetUser.id,
              username: targetUser.username,
              email: targetUser.email
            },
            permission: existingShare.permission
          });
          continue;
        }

        // Create share
        const share = shareRepo.create({
          resourceType,
          resourceId: resourceId,
          userId: currentUserId,
          sharedWith: targetUser.id,
          permission,
          sharedVia: 'direct',
          message,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true
        });

        await shareRepo.save(share);

        // Create notification
        const resourceName = resource.title || resource.name || resource.filename || resource.file_name || `${resourceType} #${resourceId}`;
        console.log('📧 Creating notification for user:', targetUser.id, 'resource:', resourceName);
        
        await createNotification(
          targetUser.id,
          'share_received',
          `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} shared with you`,
          `${req.user.username} shared "${resourceName}" with you`,
          {
            shareId: share.id,
            resourceType,
            resourceId,
            sharedBy: req.user.username,
            permission
          }
        );
        
        console.log('✅ Notification created successfully for user:', targetUser.id);

        results.successful.push({
          user: {
            id: targetUser.id,
            username: targetUser.username,
            email: targetUser.email
          },
          permission,
          shareId: share.id
        });

      } catch (error) {
        console.error(`Error sharing with user:`, error);
        results.failed.push({ 
          identifier: userData.email || userData.id, 
          reason: error.message 
        });
      }
    }

    // Share with teams
    for (const teamData of teams) {
      try {
        let team;
        
        if (teamData.id) {
          team = await teamRepo.findOne({ where: { id: teamData.id } });
        } else {
          results.failed.push({ 
            identifier: teamData.name || teamData.id, 
            reason: 'Invalid team data' 
          });
          continue;
        }

        if (!team) {
          results.failed.push({ 
            identifier: teamData.name || teamData.id, 
            reason: 'Team not found' 
          });
          continue;
        }

        // Check if user is team member or creator
        const isTeamMember = await teamMemberRepo.findOne({
          where: {
            team_id: team.id,
            user_id: currentUserId
          }
        });

        const isTeamCreator = team.creator_id === currentUserId;

        if (!isTeamMember && !isTeamCreator) {
          results.failed.push({ 
            identifier: team.name, 
            reason: 'You must be a team member to share with the team' 
          });
          continue;
        }

        // Get all team members
        const teamMembers = await AppDataSource.query(`
          SELECT tm.user_id, u.username, u.email 
          FROM team_members tm 
          JOIN users u ON tm.user_id = u.id 
          WHERE tm.team_id = ? AND tm.user_id != ?
        `, [team.id, currentUserId]);

        let teamShareCount = 0;
        
        // Share with each team member
        for (const member of teamMembers) {
          try {
            // Check if already shared
            const existingShare = await shareRepo.findOne({
              where: {
                resourceType,
                resourceId: resourceId,
                sharedWith: member.user_id,
                isActive: true
              }
            });

            if (existingShare) continue;

            // Create share
            const share = shareRepo.create({
              resourceType,
              resourceId: resourceId,
              userId: currentUserId,
              sharedWith: member.user_id,
              permission,
              sharedVia: 'team',
              teamId: team.id,
              message,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
              isActive: true
            });

            await shareRepo.save(share);

            // Create notification
            const resourceName = resource.title || resource.name || resource.filename || resource.file_name || `${resourceType} #${resourceId}`;
            await createNotification(
              member.user_id,
              'team_share_received',
              `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} shared via team`,
              `${req.user.username} shared "${resourceName}" with team ${team.name}`,
              {
                shareId: share.id,
                resourceType,
                resourceId,
                teamId: team.id,
                teamName: team.name,
                sharedBy: req.user.username,
                permission
              }
            );

            teamShareCount++;

          } catch (error) {
            console.error(`Error sharing with team member ${member.user_id}:`, error);
          }
        }

        results.successful.push({
          team: {
            id: team.id,
            name: team.name
          },
          membersSharedWith: teamShareCount,
          permission
        });

      } catch (error) {
        console.error(`Error sharing with team:`, error);
        results.failed.push({ 
          identifier: teamData.name || teamData.id, 
          reason: error.message 
        });
      }
    }

    console.log('✅ Share operation completed:', results);

    res.json({
      success: true,
      message: 'Share operation completed',
      data: results
    });

  } catch (error) {
    console.error('❌ Error sharing resource:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Get all shares for a specific resource (for resource owners)
router.get('/resource/:resourceType/:resourceId', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const currentUserId = req.user.id;

    // Validate resource type
    if (!['file', 'document', 'folder', 'project'].includes(resourceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource type'
      });
    }

    // Check ownership
    const isOwner = await checkResourceOwnership(resourceType, resourceId, currentUserId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only view shares for resources you own'
      });
    }

    // Get all active shares for the resource
    const shares = await AppDataSource.query(`
      SELECT 
        s.id,
        s.permission,
        s.sharedVia,
        s.message,
        s.expiresAt,
        s.lastAccessedAt,
        s.createdAt,
        u.id as userId,
        u.username,
        u.email,
        u.avatar_url,
        t.id as teamId,
        t.name as teamName
      FROM shares s
      JOIN users u ON s.sharedWith = u.id
      LEFT JOIN teams t ON s.teamId = t.id
      WHERE s.resourceType = ? 
      AND s.resourceId = ? 
      AND s.isActive = true
      ORDER BY s.createdAt DESC
    `, [resourceType, resourceId]);

    // Group by sharing method
    const directShares = shares.filter(s => s.sharedVia === 'direct');
    const teamShares = shares.filter(s => s.sharedVia === 'team');

    // Group team shares by team
    const teamShareGroups = {};
    teamShares.forEach(share => {
      if (!teamShareGroups[share.teamId]) {
        teamShareGroups[share.teamId] = {
          team: {
            id: share.teamId,
            name: share.teamName
          },
          permission: share.permission,
          members: [],
          createdAt: share.createdAt
        };
      }
      teamShareGroups[share.teamId].members.push({
        id: share.userId,
        username: share.username,
        email: share.email,
        avatar_url: share.avatar_url,
        lastAccessedAt: share.lastAccessedAt
      });
    });

    res.json({
      success: true,
      data: {
        resourceType,
        resourceId: resourceId,
        totalShares: shares.length,
        directShares: directShares.map(share => ({
          id: share.id,
          user: {
            id: share.userId,
            username: share.username,
            email: share.email,
            avatar_url: share.avatar_url
          },
          permission: share.permission,
          message: share.message,
          expiresAt: share.expiresAt,
          lastAccessedAt: share.lastAccessedAt,
          createdAt: share.createdAt
        })),
        teamShares: Object.values(teamShareGroups)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching resource shares:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get items shared with current user
router.get('/shared-with-me', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { resourceType, page = 1, limit = 20 } = req.query;
    
    console.log('🔍 Fetching shared items for user:', currentUserId, 'resourceType:', resourceType);

    let whereClause = 'WHERE s.sharedWith = ? AND s.isActive = true';
    let queryParams = [currentUserId];

    if (resourceType && ['file', 'document', 'folder', 'project'].includes(resourceType)) {
      whereClause += ' AND s.resourceType = ?';
      queryParams.push(resourceType);
    }

    // Update last accessed time
    await AppDataSource.query(`
      UPDATE shares SET lastAccessedAt = NOW() 
      WHERE sharedWith = ? AND isActive = true
    `, [currentUserId]);

    // Get shared items with resource details
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const sharedItems = await AppDataSource.query(`
      SELECT 
        s.id as shareId,
        s.resourceType,
        s.resourceId,
        s.permission,
        s.sharedVia,
        s.teamId, 
        s.message,
        s.expiresAt,
        s.createdAt as sharedAt,
        owner.id as ownerId,
        owner.username as ownerUsername,
        owner.email as ownerEmail,
        t.name as teamName,
        CASE 
          WHEN s.resourceType = 'file' THEN f.file_name
          WHEN s.resourceType = 'document' THEN d.title
          WHEN s.resourceType = 'folder' THEN fo.name
          WHEN s.resourceType = 'project' THEN p.name
        END as resourceName,
        CASE 
          WHEN s.resourceType = 'file' THEN f.file_url
          WHEN s.resourceType = 'document' THEN NULL
          WHEN s.resourceType = 'folder' THEN NULL
          WHEN s.resourceType = 'project' THEN NULL
        END as resourceUrl,
        CASE 
          WHEN s.resourceType = 'file' THEN f.s3Key
          ELSE NULL
        END as s3Key,
        CASE 
          WHEN s.resourceType = 'file' THEN 'application/octet-stream'
          ELSE NULL
        END as mimeType,
        CASE 
          WHEN s.resourceType = 'file' THEN NULL
          ELSE NULL
        END as size
      FROM shares s
      JOIN users owner ON s.userId = owner.id
      LEFT JOIN teams t ON s.teamId = t.id
      LEFT JOIN files f ON s.resourceType = 'file' AND s.resourceId = f.id
      LEFT JOIN documents d ON s.resourceType = 'document' AND s.resourceId = d.id  
      LEFT JOIN folders fo ON s.resourceType = 'folder' AND s.resourceId = fo.id
      LEFT JOIN projects p ON s.resourceType = 'project' AND s.resourceId = p.id
      ${whereClause}
      ORDER BY s.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);
    
    console.log('📊 Found', sharedItems.length, 'shared items for user:', currentUserId);

    // Get total count
    const [{ total }] = await AppDataSource.query(`
      SELECT COUNT(*) as total
      FROM shares s
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      data: {
        items: sharedItems.map(item => ({
          shareId: item.shareId,
          resourceType: item.resourceType,
          resourceId: item.resourceId,
          resourceName: item.resourceName,
          resourceUrl: item.resourceUrl,
          s3Key: item.s3Key,
          mimeType: item.mimeType,
          size: item.size,
          permission: item.permission,
          sharedVia: item.sharedVia,
          message: item.message,
          expiresAt: item.expiresAt,
          sharedAt: item.sharedAt,
          owner: {
            id: item.ownerId,
            username: item.ownerUsername,
            email: item.ownerEmail
          },
          team: item.teamId ? {
            id: item.teamId,
            name: item.teamName
          } : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching shared items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update share permission
router.put('/:shareId/permission', async (req, res) => {
  try {
    const { shareId } = req.params;
    const { permission } = req.body;
    const currentUserId = req.user.id;

    if (!['view', 'edit', 'admin'].includes(permission)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permission level'
      });
    }

    const shareRepo = AppDataSource.getRepository(Share);
    const share = await shareRepo.findOne({
      where: { id: parseInt(shareId), userId: currentUserId, isActive: true }
    });

    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share not found or you do not have permission to modify it'
      });
    }

    share.permission = permission;
    await shareRepo.save(share);

    res.json({
      success: true,
      message: 'Share permission updated successfully',
      data: { shareId: share.id, permission }
    });

  } catch (error) {
    console.error('❌ Error updating share permission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Remove/revoke a share
router.delete('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const currentUserId = req.user.id;

    const shareRepo = AppDataSource.getRepository(Share);
    const share = await shareRepo.findOne({
      where: { id: parseInt(shareId), userId: currentUserId, isActive: true }
    });

    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Share not found or you do not have permission to remove it'
      });
    }

    // Soft delete by setting isActive to false
    share.isActive = false;
    await shareRepo.save(share);

    res.json({
      success: true,
      message: 'Share removed successfully'
    });

  } catch (error) {
    console.error('❌ Error removing share:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get sharing statistics
router.get('/stats', async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const stats = await AppDataSource.query(`
      SELECT 
        COUNT(*) as totalShares,
        COUNT(CASE WHEN resourceType = 'file' THEN 1 END) as filesShared,
        COUNT(CASE WHEN resourceType = 'document' THEN 1 END) as documentsShared,
        COUNT(CASE WHEN resourceType = 'folder' THEN 1 END) as foldersShared,
        COUNT(CASE WHEN resourceType = 'project' THEN 1 END) as projectsShared,
        COUNT(CASE WHEN sharedVia = 'direct' THEN 1 END) as directShares,
        COUNT(CASE WHEN sharedVia = 'team' THEN 1 END) as teamShares,
        COUNT(CASE WHEN permission = 'view' THEN 1 END) as viewPermissions,
        COUNT(CASE WHEN permission = 'edit' THEN 1 END) as editPermissions,
        COUNT(CASE WHEN permission = 'admin' THEN 1 END) as adminPermissions
      FROM shares 
      WHERE userId = ? AND isActive = true
    `, [currentUserId]);

    const receivedStats = await AppDataSource.query(`
      SELECT 
        COUNT(*) as totalReceived,
        COUNT(CASE WHEN resourceType = 'file' THEN 1 END) as filesReceived,
        COUNT(CASE WHEN resourceType = 'document' THEN 1 END) as documentsReceived,
        COUNT(CASE WHEN resourceType = 'folder' THEN 1 END) as foldersReceived,
        COUNT(CASE WHEN resourceType = 'project' THEN 1 END) as projectsReceived
      FROM shares 
      WHERE sharedWith = ? AND isActive = true
    `, [currentUserId]);

    res.json({
      success: true,
      data: {
        shared: stats[0],
        received: receivedStats[0]
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sharing stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Legacy routes for backward compatibility with old frontend
// GET /api/share/file/37 -> redirect to /api/shares/resource/file/37
router.get('/:resourceType/:resourceId', async (req, res) => {
  console.log('🔄 Legacy route accessed:', req.originalUrl);
  console.log('🔄 Redirecting to new shares/resource format');
  
  // Redirect to the new format
  req.url = `/resource/${req.params.resourceType}/${req.params.resourceId}`;
  
  // Call the existing resource route handler
  return router.handle(req, res);
});

// POST /api/share/file/37 -> redirect to POST /api/shares
router.post('/:resourceType/:resourceId', async (req, res) => {
  console.log('🔄 Legacy POST route accessed:', req.originalUrl);
  console.log('🔄 Converting to new shares format');
  
  const { resourceType, resourceId } = req.params;
  
  // Convert old format to new format
  const newBody = {
    resourceType,
    resourceId,
    users: req.body.userIds ? req.body.userIds.map(id => ({ id })) : [],
    teams: req.body.teamIds ? req.body.teamIds.map(id => ({ id })) : [],
    permission: 'view',
    message: null,
    expiresAt: null
  };
  
  // Update request body
  req.body = newBody;
  req.url = '/';
  
  // Call the existing POST route handler
  return router.handle(req, res);
});

module.exports = router; 
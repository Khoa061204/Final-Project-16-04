const express = require('express');
const router = express.Router();
const { AppDataSource } = require('../config/database');
const User = require('../models/User');
const File = require('../models/File');
const Document = require('../models/Document');
const Team = require('../models/Team');
const Task = require('../models/Task');
const upload = require('../middleware/upload');

// Search users for invitations - NEW FEATURE
router.get('/search', async (req, res) => {
  try {
    console.log('🔍 User search request:', req.query);
    console.log('👤 User ID:', req.user?.id);
    
    const { query, limit = 10, exclude_team } = req.query;
    const currentUserId = req.user.id;

    if (!currentUserId) {
      console.error('❌ No user ID found in request');
      return res.status(400).json({
        success: false,
        message: 'User authentication failed'
      });
    }

    if (!query || query.trim().length < 2) {
      console.log('⚠️  Search query too short:', query);
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // Check if database is connected
    if (!AppDataSource.isInitialized) {
      console.error('❌ Database not initialized');
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    let searchQuery = `
      SELECT DISTINCT
        u.id,
        u.username,
        u.email,
        u.avatar_url,
        u.created_at
      FROM users u
      WHERE u.id != ? 
      AND (u.username LIKE ? OR u.email LIKE ?)
    `;
    
    let queryParams = [currentUserId, `%${query}%`, `%${query}%`];

    // Exclude users already in a specific team
    if (exclude_team) {
      const teamId = parseInt(exclude_team);
      if (!isNaN(teamId)) {
        console.log(`🚫 Excluding users from team ${teamId}`);
        searchQuery += `
          AND u.id NOT IN (
            SELECT user_id FROM team_members WHERE team_id = ?
          )
          AND u.id NOT IN (
            SELECT inviteeId FROM invitations WHERE teamId = ? AND status = 'pending'
          )
        `;
        queryParams.push(teamId, teamId);
      }
    }

    searchQuery += ` ORDER BY u.username ASC LIMIT ?`;
    queryParams.push(parseInt(limit));

    console.log('📊 Executing search query with params:', queryParams);
    const users = await AppDataSource.query(searchQuery, queryParams);
    console.log(`✅ Found ${users.length} users matching search`);

    res.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        display_name: `${user.username} (${user.email})`
      })),
      query: query
    });

  } catch (error) {
    console.error('❌ Error searching users:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Get user suggestions based on team connections - NEW FEATURE
router.get('/suggestions', async (req, res) => {
  try {
    console.log('💡 User suggestions request for user ID:', req.user?.id);
    
    const currentUserId = req.user.id;
    const { limit = 5 } = req.query;

    if (!currentUserId) {
      console.error('❌ No user ID found in request');
      return res.status(400).json({
        success: false,
        message: 'User authentication failed'
      });
    }

    // Check if database is connected
    if (!AppDataSource.isInitialized) {
      console.error('❌ Database not initialized');
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    // Get users from teams the current user is part of, but not direct team members
    const suggestionsQuery = `
      SELECT DISTINCT
        u.id,
        u.username,
        u.email,
        u.avatar_url,
        COUNT(DISTINCT tm2.team_id) as mutual_teams
      FROM users u
      JOIN team_members tm1 ON u.id = tm1.user_id
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm2.user_id = ? 
      AND u.id != ?
      GROUP BY u.id, u.username, u.email, u.avatar_url
      ORDER BY mutual_teams DESC, u.username ASC
      LIMIT ?
    `;

    console.log('📊 Executing suggestions query...');
    let suggestions = await AppDataSource.query(suggestionsQuery, [
      currentUserId, currentUserId, parseInt(limit)
    ]);
    console.log(`✅ Found ${suggestions.length} user suggestions`);

    // If no team-based suggestions, provide general user suggestions
    if (suggestions.length === 0) {
      console.log('💡 No team-based suggestions found, providing general user suggestions');
      const generalSuggestionsQuery = `
        SELECT DISTINCT
          u.id,
          u.username,
          u.email,
          u.avatar_url,
          0 as mutual_teams
        FROM users u
        WHERE u.id != ?
        ORDER BY u.username ASC
        LIMIT ?
      `;
      
      suggestions = await AppDataSource.query(generalSuggestionsQuery, [
        currentUserId, parseInt(limit)
      ]);
      console.log(`✅ Found ${suggestions.length} general user suggestions`);
    }

    res.json({
      success: true,
      data: suggestions.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        display_name: `${user.username} (${user.email})`,
        mutual_teams: parseInt(user.mutual_teams)
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching user suggestions:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Get user profile
router.get('/:id/profile', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Check if user is requesting their own profile or has permission
    if (userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this profile'
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user statistics
    const fileRepo = AppDataSource.getRepository(File);
    const documentRepo = AppDataSource.getRepository(Document);
    const teamRepo = AppDataSource.getRepository(Team);
    const taskRepo = AppDataSource.getRepository(Task);

    const [fileCount, documentCount, teamCount, taskCount] = await Promise.all([
      fileRepo.count({ where: { user_id: userId } }),
      documentRepo.count({ where: { userId: userId } }),
      teamRepo.count({ where: { creator_id: userId } }),
      taskRepo.count({ where: { assignedUserId: userId } })
    ]);

    // Calculate estimated storage (1MB per file)
    const totalStorage = fileCount * 1024 * 1024; // bytes

    const profile = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
        created_at: user.created_at
      },
      statistics: {
        files: fileCount,
        documents: documentCount,
        teams: teamCount,
        tasks: taskCount,
        storageUsed: totalStorage
      }
    };

    // Return plain profile object to match existing frontend consumption
    res.json(profile);

  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload avatar
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Check authorization
    if (userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only images are allowed.'
      });
    }

    // Convert to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Update user avatar in database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.avatar_url = base64Image;
    await userRepo.save(user);

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar_url: base64Image
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ===== USER SETTINGS ENDPOINTS =====

// Get user settings
router.get('/:id/settings', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Check if user is requesting their own settings
    if (userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these settings'
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ 
      where: { id: userId },
      select: ['id', 'theme', 'emailNotifications', 'pushNotifications', 'twoFactorEnabled']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return settings with defaults
    const settings = {
      theme: user.theme || 'system',
      emailNotifications: user.emailNotifications !== undefined ? user.emailNotifications : true,
      pushNotifications: user.pushNotifications !== undefined ? user.pushNotifications : true,
      twoFactorEnabled: user.twoFactorEnabled || false
    };

    res.json(settings);

  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user settings
router.put('/:id/settings', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Check if user is updating their own settings
    if (userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update these settings'
      });
    }

    const { theme, emailNotifications, pushNotifications } = req.body;
    
    // Validate theme
    if (theme && !['light', 'dark', 'system'].includes(theme)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid theme value. Must be light, dark, or system'
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const updateData = {};

    if (theme !== undefined) updateData.theme = theme;
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined) updateData.pushNotifications = pushNotifications;

    await userRepo.update(userId, updateData);

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Enable 2FA
router.post('/:id/2fa/enable', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Check if user is enabling their own 2FA
    if (userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify 2FA for this account'
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    await userRepo.update(userId, { twoFactorEnabled: true });

    console.log(`✅ 2FA enabled for user ${userId}`);
    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully'
    });

  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable two-factor authentication'
    });
  }
});

// Disable 2FA
router.post('/:id/2fa/disable', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Check if user is disabling their own 2FA
    if (userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify 2FA for this account'
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    await userRepo.update(userId, { twoFactorEnabled: false });

    console.log(`✅ 2FA disabled for user ${userId}`);
    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });

  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable two-factor authentication'
    });
  }
});

// Export user data
router.get('/:id/export', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Check if user is exporting their own data
    if (userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to export data for this account'
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const fileRepo = AppDataSource.getRepository(File);
    const documentRepo = AppDataSource.getRepository(Document);
    const teamRepo = AppDataSource.getRepository(Team);
    const taskRepo = AppDataSource.getRepository(Task);

    // Get user data
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's files
    const files = await fileRepo.find({ 
      where: { user_id: userId },
      select: ['id', 'file_name', 'uploaded_at', 's3Key']
    });

    // Get user's documents
    const documents = await documentRepo.find({ 
      where: { userId: userId },
      select: ['id', 'title', 'content', 'createdAt', 'updatedAt']
    });

    // Get user's teams (created by them)
    const teams = await teamRepo.find({ 
      where: { created_by: userId },
      select: ['id', 'name', 'description', 'created_at']
    });

    // Get user's tasks
    const tasks = await taskRepo.find({ 
      where: { user_id: userId },
      select: ['id', 'title', 'description', 'status', 'priority', 'due_date', 'created_at']
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        theme: user.theme,
        emailNotifications: user.emailNotifications,
        pushNotifications: user.pushNotifications,
        twoFactorEnabled: user.twoFactorEnabled
      },
      files: files.map(file => ({
        id: file.id,
        name: file.file_name,
        uploadedAt: file.uploaded_at,
        s3Key: file.s3Key
      })),
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      })),
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.created_at
      })),
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        createdAt: task.created_at
      })),
      statistics: {
        totalFiles: files.length,
        totalDocuments: documents.length,
        totalTeams: teams.length,
        totalTasks: tasks.length
      }
    };

    console.log(`✅ Data export generated for user ${userId}`);
    res.json(exportData);

  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export user data'
    });
  }
});

// Change password
router.post('/:id/change-password', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Check if user is changing their own password
    if (userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to change password for this account'
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const bcrypt = require('bcryptjs');
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await userRepo.update(userId, { 
      password: hashedNewPassword,
      updated_at: new Date()
    });

    console.log(`✅ Password changed for user ${userId}`);
    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// Delete account
router.delete('/:id/account', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Check if user is deleting their own account
    if (userId !== currentUser.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this account'
      });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation is required to delete account'
      });
    }

    const bcrypt = require('bcryptjs');
    const userRepo = AppDataSource.getRepository(User);
    const fileRepo = AppDataSource.getRepository(File);
    const documentRepo = AppDataSource.getRepository(Document);
    const teamRepo = AppDataSource.getRepository(Team);
    const taskRepo = AppDataSource.getRepository(Task);

    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Start transaction to delete all user data
    await AppDataSource.transaction(async transactionalEntityManager => {
      // Delete user's files
      await transactionalEntityManager.delete(File, { user_id: userId });
      
      // Delete user's documents
      await transactionalEntityManager.delete(Document, { userId: userId });
      
      // Delete user's tasks
      await transactionalEntityManager.delete(Task, { user_id: userId });
      
      // Transfer team ownership or delete teams (for now, just delete)
      await transactionalEntityManager.delete(Team, { created_by: userId });
      
      // Finally delete the user
      await transactionalEntityManager.delete(User, { id: userId });
    });

    console.log(`✅ Account deleted for user ${userId}`);
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

module.exports = router; 
// --- Added profile update routes to match frontend ---

// Update user profile (username, email)
router.patch('/profile', async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { username, email } = req.body || {};
    if (username === undefined && email === undefined) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: currentUserId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updates = {};
    if (username !== undefined) updates.username = String(username).trim();
    if (email !== undefined) updates.email = String(email).trim();

    await userRepo.update(currentUserId, updates);
    return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Upload profile picture
router.post('/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'Invalid file type. Only images are allowed.' });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB.' });
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: currentUserId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.avatar_url = base64Image;
    await userRepo.save(user);

    return res.json({ success: true, message: 'Profile picture updated successfully', profilePictureUrl: base64Image, avatar_url: base64Image });
  } catch (err) {
    console.error('Error uploading profile picture:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}); 

// Legacy compatibility: update user via PUT /users/:id
router.put('/:id', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const currentUserId = req.user?.id;
    if (!currentUserId || currentUserId !== targetUserId) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    const { username, email } = req.body || {};
    const updates = {};
    if (typeof username === 'string') updates.username = username.trim();
    if (typeof email === 'string') updates.email = email.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const repo = AppDataSource.getRepository(User);
    await repo.update(targetUserId, updates);
    const updated = await repo.findOne({ where: { id: targetUserId } });
    return res.json({ user: updated });
  } catch (err) {
    console.error('Error updating user (legacy PUT):', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}); 
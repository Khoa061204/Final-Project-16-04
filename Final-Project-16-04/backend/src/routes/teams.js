const express = require('express');
const router = express.Router();
const { AppDataSource } = require('../config/database');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const User = require('../models/User');
const Invitation = require('../models/Invitation'); // Add missing import
const ActivityService = require('../services/activityService');

// Create a new team
router.post('/', async (req, res) => {
  try {
    const { name, description, isPublic = false } = req.body;
    const currentUser = req.user;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    const teamRepo = AppDataSource.getRepository(Team);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);

    // Create the team
    const team = teamRepo.create({
      name: name.trim(),
      creator_id: currentUser.id,
      createdAt: new Date()
    });

    const savedTeam = await teamRepo.save(team);

    // Add creator as team member
    const teamMember = teamMemberRepo.create({
      team_id: savedTeam.id,
      user_id: currentUser.id
    });

    await teamMemberRepo.save(teamMember);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: savedTeam
    });

  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get public teams - OPTIMIZED: Single query with join
router.get('/public', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // OPTIMIZATION: Single query with join for member counts
    const publicTeamsQuery = `
      SELECT 
        t.id,
        t.name,
        t.description,
        t.visibility,
        t.creator_id,
        t.createdAt,
        COUNT(tm.user_id) as member_count
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.visibility = 'public'
      GROUP BY t.id, t.name, t.description, t.visibility, t.creator_id, t.createdAt
      ORDER BY t.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const publicTeams = await AppDataSource.query(publicTeamsQuery, [limit, offset]);

    res.json({
      success: true,
      data: publicTeams,
      pagination: {
        page,
        limit,
        total: publicTeams.length
      }
    });

  } catch (error) {
    console.error('Error fetching public teams:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's teams - OPTIMIZED: Use efficient joins instead of N+1 queries
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching teams for user:', req.user?.id);
    
    if (!req.user) {
      console.error('❌ No user object found in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const currentUserId = req.user.id;
    if (!currentUserId) {
      console.error('❌ No user ID found in request');
      return res.status(400).json({
        success: false,
        message: 'User authentication failed'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // OPTIMIZATION: Use single efficient query with joins instead of multiple queries
    const teamsQuery = `
      SELECT DISTINCT
        t.id,
        t.name,
        '' as description,
        'private' as visibility,
        t.creator_id,
        t.createdAt,
        COUNT(tm.user_id) as member_count,
        CASE 
          WHEN t.creator_id = ? THEN 'creator'
          WHEN user_tm.user_id IS NOT NULL THEN 'member'
          ELSE 'none'
        END as user_status
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN team_members user_tm ON t.id = user_tm.team_id AND user_tm.user_id = ?
      WHERE t.creator_id = ? OR t.id IN (
        SELECT team_id FROM team_members WHERE user_id = ?
      )
      GROUP BY t.id, t.name, t.creator_id, t.createdAt, user_tm.user_id
      ORDER BY t.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    console.log('🔍 Executing teams query with params:', [currentUserId, currentUserId, currentUserId, currentUserId, limit, offset]);
    
    const teams = await AppDataSource.query(teamsQuery, [
      currentUserId, currentUserId, currentUserId, currentUserId, limit, offset
    ]);

    console.log('📊 Raw teams query result:', teams);

    // Separate teams by user's relationship to them
    const createdTeams = teams.filter(team => team.user_status === 'creator');
    const memberTeams = teams.filter(team => team.user_status === 'member');
    const publicTeams = teams.filter(team => team.user_status === 'public');

    console.log('📋 Separated teams:', { created: createdTeams.length, member: memberTeams.length, public: publicTeams.length });

    res.json({
      success: true,
      data: {
        created: createdTeams,
        member: memberTeams,
        public: publicTeams
      },
      pagination: {
        page,
        limit,
        total: teams.length
      }
    });

  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get team details - OPTIMIZED: Single query with user details
router.get('/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }
    
    const currentUserId = req.user.id;

    // OPTIMIZATION: Single query to get team with members and user details
    const teamQuery = `
      SELECT 
        t.id,
        t.name,
        t.description,
        t.visibility,
        t.creator_id,
        t.createdAt,
        u.id as member_id,
        u.username as member_username,
        u.email as member_email,
        u.avatar_url as member_avatar,
        tm.role as member_role,
        tm.joined_at as member_joined_at
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE t.id = ?
    `;

    const results = await AppDataSource.query(teamQuery, [teamId]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const team = {
      id: results[0].id,
      name: results[0].name,
      description: results[0].description,
      visibility: results[0].visibility,
      creator_id: results[0].creator_id,
      createdAt: results[0].createdAt
    };

    // Check if user is a member
    const isUserMember = results.some(r => r.member_id === currentUserId);
    if (!isUserMember && team.visibility !== 'public') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Format members
    const members = results
      .filter(r => r.member_id !== null)
      .map(r => ({
        id: r.member_id,
        username: r.member_username,
        email: r.member_email,
        avatar_url: r.member_avatar,
        role: r.member_role
      }));

    // Get user's actual role from the database
    const userRole = isUserMember ? 
      (currentUserId === team.creator_id ? 'admin' : 
        results.find(r => r.member_id === currentUserId)?.member_role || 'member') : null;

    res.json({
      success: true,
      data: {
        team,
        members,
        user_role: userRole
      }
    });

  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update team
router.put('/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }

    const { name, description, visibility } = req.body;
    const currentUserId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    const teamRepo = AppDataSource.getRepository(Team);

    // Get team details
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is the creator
    if (team.creator_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Only team creators can edit team details'
      });
    }

    // Update team
    team.name = name.trim();
    team.description = description || '';
    if (visibility && ['public', 'private'].includes(visibility)) {
      team.visibility = visibility;
    }

    const updatedTeam = await teamRepo.save(team);

    res.json({
      success: true,
      message: 'Team updated successfully',
      data: updatedTeam
    });

  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }

    const currentUserId = req.user.id;
    const teamRepo = AppDataSource.getRepository(Team);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);
    const Project = require('../models/Project');
    const projectRepo = AppDataSource.getRepository(Project);
    const Invitation = require('../models/Invitation');
    const invitationRepo = AppDataSource.getRepository(Invitation);

    // Get team details
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is the creator
    if (team.creator_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Only team creators can delete teams'
      });
    }

    // Start a transaction to ensure data integrity
    await AppDataSource.transaction(async transactionalEntityManager => {
      // First, set teamId to null for all projects belonging to this team
      await transactionalEntityManager.update(Project, { teamId: teamId }, { teamId: null });
      
      // Delete all pending invitations for this team
      await transactionalEntityManager.delete(Invitation, { teamId: teamId });
      
      // Delete all team members
      await transactionalEntityManager.delete(teamMemberRepo.target, { team_id: teamId });
      
      // Finally, delete the team
      await transactionalEntityManager.remove(team);
    });

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Invite user to team
router.post('/:id/invite', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }

    const { userEmail } = req.body;
    const currentUserId = req.user.id;

    if (!userEmail || !userEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: 'User email is required'
      });
    }

    const teamRepo = AppDataSource.getRepository(Team);
    const userRepo = AppDataSource.getRepository(User);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);
    const invitationRepo = AppDataSource.getRepository(Invitation);

    // Get team details
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is a member or creator
    const membership = await teamMemberRepo.findOne({
      where: { team_id: teamId, user_id: currentUserId }
    });

    if (!membership && team.creator_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Only team members can invite users'
      });
    }

    // Find user to invite
    const userToInvite = await userRepo.findOne({ where: { email: userEmail.trim() } });
    if (!userToInvite) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a member
    const existingMembership = await teamMemberRepo.findOne({
      where: { team_id: teamId, user_id: userToInvite.id }
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }

    // Check if invitation already exists
    const existingInvitation = await invitationRepo.findOne({
      where: { teamId: teamId, inviteeId: userToInvite.id, status: 'pending' }
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'User has already been invited to this team'
      });
    }

    // Create invitation
    const invitation = invitationRepo.create({
      teamId: teamId,
      inviteeId: userToInvite.id,
      status: 'pending'
    });

    await invitationRepo.save(invitation);

    // Create notification for the invited user
    try {
      console.log('🔔 Creating notification for user:', userToInvite.id);
      const Notification = require('../models/Notification');
      const notificationRepo = AppDataSource.getRepository(Notification);
      
      const notification = notificationRepo.create({
        userId: userToInvite.id,
        type: 'invitation',
        title: 'Team Invitation',
        message: `You have been invited to join team "${team.name}"`,
        data: JSON.stringify({
          teamId: teamId,
          teamName: team.name,
          invitationId: invitation.id,
          inviterId: currentUserId
        }),
        isRead: false
      });

      console.log('🔔 Notification object created:', notification);
      const savedNotification = await notificationRepo.save(notification);
      console.log('🔔 Notification saved successfully:', savedNotification.id);

      // Send real-time notification via WebSocket
      try {
        // Use the global io instance
        const io = global.io;
        
        if (io) {
          io.to(`user-${userToInvite.id}`).emit('new-notification', savedNotification);
          console.log(`🔔 Real-time notification sent to user ${userToInvite.id}`);
        } else {
          console.log('⚠️ io instance not available, notification will be sent via polling');
        }
      } catch (wsError) {
        console.error('❌ Error sending WebSocket notification:', wsError);
      }
    } catch (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      // Don't fail the invitation if notification fails
    }

    res.json({
      success: true,
      message: 'User invited successfully'
    });

  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Remove member from team
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userIdToRemove = parseInt(req.params.userId);
    
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }

    if (isNaN(userIdToRemove) || userIdToRemove <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const currentUserId = req.user.id;
    const teamRepo = AppDataSource.getRepository(Team);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);

    // Get team details
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if current user is the creator
    if (team.creator_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Only team creators can remove members'
      });
    }

    // Cannot remove the creator
    if (userIdToRemove === team.creator_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove team creator'
      });
    }

    // Check if user is a member
    const membership = await teamMemberRepo.findOne({
      where: { team_id: teamId, user_id: userIdToRemove }
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }

    // Remove membership
    await teamMemberRepo.remove(membership);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Join a team
router.post('/:id/join', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }
    
    const currentUserId = req.user.id;
    const teamRepo = AppDataSource.getRepository(Team);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);

    // Get team details
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if team is public
    if (team.visibility !== 'public') {
      return res.status(403).json({
        success: false,
        message: 'This team is private'
      });
    }

    // Check if user is already a member
    const existingMembership = await teamMemberRepo.findOne({
      where: { team_id: teamId, user_id: currentUserId }
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team'
      });
    }

    // Add user as team member with default role
    const teamMember = teamMemberRepo.create({
      team_id: teamId,
      user_id: currentUserId,
      role: 'member'
    });

    await teamMemberRepo.save(teamMember);

    // Log team join activity
    await ActivityService.logActivity(
      currentUserId,
      ActivityService.ACTIVITY_TYPES.TEAM_JOINED,
      `Joined team "${team.name}"`,
      'team',
      teamId,
      { teamName: team.name, joinDate: new Date().toISOString() }
    );

    res.json({
      success: true,
      message: 'Successfully joined the team'
    });

  } catch (error) {
    console.error('Error joining team:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Leave a team - FIXED: Parameter validation
router.post('/:id/leave', async (req, res) => {
  try {
    // FIXED: Add proper parameter validation
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }
    
    const currentUserId = req.user.id;

    const teamRepo = AppDataSource.getRepository(Team);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);

    // Check if user is a member
    const membership = await teamMemberRepo.findOne({
      where: { team_id: teamId, user_id: currentUserId }
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'You are not a member of this team'
      });
    }

    // Check if user is the creator - FIXED: field name
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (team && team.creator_id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Team creators cannot leave their own team'
      });
    }

    // Remove membership
    await teamMemberRepo.remove(membership);

    res.json({
      success: true,
      message: 'Successfully left the team'
    });

  } catch (error) {
    console.error('Error leaving team:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get pending invitations for current user
router.get('/invitations', async (req, res) => {
  try {
    console.log('📥 Fetching invitations for user:', req.user);
    
    if (!req.user) {
      console.error('❌ No user object found in request');
      // Return empty list instead of hard error to reduce noise on UI
      return res.status(200).json({ success: true, invitations: [] });
    }
    
    const currentUserId = req.user.id || req.user.userId;
    if (!currentUserId) {
      console.error('❌ No user ID found in request');
      // Return empty list instead of error
      return res.status(200).json({ success: true, invitations: [] });
    }

    // Check if database is connected
    if (!AppDataSource.isInitialized) {
      console.error('❌ Database not initialized');
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    const invitationRepo = AppDataSource.getRepository(Invitation);
    const teamRepo = AppDataSource.getRepository(Team);

    console.log('🔍 Searching for pending invitations for user ID:', currentUserId);

    // Get pending invitations for the user
    let invitations = [];
    try {
      invitations = await invitationRepo.find({
        where: { 
          inviteeId: currentUserId,
          status: 'pending'
        }
      });
    } catch (err) {
      console.warn('⚠️ No invitations table or error fetching invitations:', err.message);
      invitations = [];
    }

    console.log(`📋 Found ${invitations.length} pending invitations`);

    // Get team details for each invitation
    const invitationsWithTeams = [];
    for (const invitation of invitations) {
      try {
        const team = await teamRepo.findOne({ 
          where: { id: invitation.teamId }
        });
        
        if (team) {
          invitationsWithTeams.push({
            id: invitation.id,
            teamId: invitation.teamId,
            teamName: team.name,
            teamDescription: team.description,
            status: invitation.status,
            createdAt: invitation.createdAt
          });
        } else {
          console.warn(`⚠️  Team not found for invitation ${invitation.id}, teamId: ${invitation.teamId}`);
        }
      } catch (teamError) {
        console.error(`❌ Error fetching team ${invitation.teamId} for invitation ${invitation.id}:`, teamError.message);
      }
    }

    console.log(`✅ Returning ${invitationsWithTeams.length} invitations with team details`);

    res.json({
      success: true,
      invitations: invitationsWithTeams
    });

  } catch (error) {
    console.error('❌ Error fetching team invitations:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Accept team invitation
router.post('/invitations/:id/accept', async (req, res) => {
  try {
    const invitationId = parseInt(req.params.id);
    if (isNaN(invitationId) || invitationId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID'
      });
    }

    const currentUserId = req.user.id;
    const invitationRepo = AppDataSource.getRepository(Invitation);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);

    // Find the invitation
    const invitation = await invitationRepo.findOne({
      where: { 
        id: invitationId,
        inviteeId: currentUserId,
        status: 'pending'
      }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or already processed'
      });
    }

    // Check if user is already a member
    const existingMembership = await teamMemberRepo.findOne({
      where: { 
        team_id: invitation.teamId,
        user_id: currentUserId
      }
    });

    if (existingMembership) {
      // Update invitation status to accepted even if already a member
      invitation.status = 'accepted';
      await invitationRepo.save(invitation);
      
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team'
      });
    }

    // Add user as team member with default role
    const teamMember = teamMemberRepo.create({
      team_id: invitation.teamId,
      user_id: currentUserId,
      role: 'member'
    });

    await teamMemberRepo.save(teamMember);

    // Update invitation status
    invitation.status = 'accepted';
    await invitationRepo.save(invitation);

    res.json({
      success: true,
      message: 'Team invitation accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting team invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept team invitation',
      error: error.message
    });
  }
});

// Reject team invitation
router.post('/invitations/:id/reject', async (req, res) => {
  try {
    const invitationId = parseInt(req.params.id);
    if (isNaN(invitationId) || invitationId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation ID'
      });
    }

    const currentUserId = req.user.id;
    const invitationRepo = AppDataSource.getRepository(Invitation);

    // Find the invitation
    const invitation = await invitationRepo.findOne({
      where: { 
        id: invitationId,
        inviteeId: currentUserId,
        status: 'pending'
      }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or already processed'
      });
    }

    // Update invitation status
    invitation.status = 'rejected';
    await invitationRepo.save(invitation);

    res.json({
      success: true,
      message: 'Team invitation rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting team invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject team invitation',
      error: error.message
    });
  }
});

// Get team activity feed - NEW FEATURE
router.get('/:id/activity', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }

    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Check if user is a team member
    const membershipQuery = `
      SELECT 1 FROM team_members tm 
      JOIN teams t ON tm.team_id = t.id 
      WHERE tm.team_id = ? AND (tm.user_id = ? OR t.creator_id = ?)
    `;
    const membership = await AppDataSource.query(membershipQuery, [teamId, currentUserId, currentUserId]);
    
    if (membership.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get team activities (mock implementation - extend as needed)
    const activitiesQuery = `
      SELECT 
        'member_joined' as activity_type,
        u.username as actor_name,
        tm.team_id as team_id,
        DATE(tm.created_at) as activity_date,
        CONCAT(u.username, ' joined the team') as activity_description
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY tm.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const activities = await AppDataSource.query(activitiesQuery, [teamId, limit, offset]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        total: activities.length
      }
    });

  } catch (error) {
    console.error('Error fetching team activity:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bulk invite users - NEW FEATURE
router.post('/:id/bulk-invite', async (req, res) => {
  try {
    console.log('🔍 Bulk invite request:', { teamId: req.params.id, body: req.body, user: req.user?.id });
    
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      console.error('❌ Invalid team ID:', req.params.id);
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }

    const { emails } = req.body;
    const currentUserId = req.user.id;
    
    console.log('📧 Bulk invite emails:', emails);

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      console.error('❌ No emails provided or invalid format:', emails);
      return res.status(400).json({
        success: false,
        message: 'Email list is required'
      });
    }

    if (emails.length > 50) {
      console.error('❌ Too many emails:', emails.length);
      return res.status(400).json({
        success: false,
        message: 'Cannot invite more than 50 users at once'
      });
    }

    const teamRepo = AppDataSource.getRepository(Team);
    const userRepo = AppDataSource.getRepository(User);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);
    const invitationRepo = AppDataSource.getRepository(Invitation);

    // Get team details
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is a member or creator
    const membership = await teamMemberRepo.findOne({
      where: { team_id: teamId, user_id: currentUserId }
    });

    if (!membership && team.creator_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Only team members can invite users'
      });
    }

    const results = {
      successful: [],
      failed: [],
      already_members: [],
      already_invited: []
    };

    for (const email of emails) {
      try {
        const userToInvite = await userRepo.findOne({ where: { email: email.trim() } });
        if (!userToInvite) {
          results.failed.push({ email, reason: 'User not found' });
          continue;
        }

        // Check if already a member
        const existingMembership = await teamMemberRepo.findOne({
          where: { team_id: teamId, user_id: userToInvite.id }
        });

        if (existingMembership) {
          results.already_members.push({ email, username: userToInvite.username });
          continue;
        }

        // Check if already invited
        const existingInvitation = await invitationRepo.findOne({
          where: { teamId: teamId, inviteeId: userToInvite.id, status: 'pending' }
        });

        if (existingInvitation) {
          results.already_invited.push({ email, username: userToInvite.username });
          continue;
        }

        // Create invitation
        const invitation = invitationRepo.create({
          teamId: teamId,
          inviteeId: userToInvite.id,
          status: 'pending'
        });

        await invitationRepo.save(invitation);

        // Create notification for the invited user
        try {
          console.log('🔔 Creating notification for user:', userToInvite.id);
          const Notification = require('../models/Notification');
          const notificationRepo = AppDataSource.getRepository(Notification);
          
          const notification = notificationRepo.create({
            userId: userToInvite.id,
            type: 'team_invitation',
            title: 'Team Invitation',
            message: `You have been invited to join team "${team.name}"`,
            data: {
              teamId: teamId,
              teamName: team.name,
              invitationId: invitation.id,
              inviterId: currentUserId
            },
            isRead: false
          });

          console.log('🔔 Notification object created:', notification);
          const savedNotification = await notificationRepo.save(notification);
          console.log('🔔 Notification saved successfully:', savedNotification.id);

          // Send real-time notification via WebSocket
          try {
            // Use the global io instance
            const io = global.io;
            
            if (io) {
              io.to(`user-${userToInvite.id}`).emit('new-notification', savedNotification);
              console.log(`🔔 Real-time notification sent to user ${userToInvite.id}`);
            } else {
              console.log('⚠️ io instance not available, notification will be sent via polling');
            }
          } catch (wsError) {
            console.error('❌ Error sending WebSocket notification:', wsError);
          }
        } catch (notificationError) {
          console.error('❌ Error creating notification:', notificationError);
          // Don't fail the invitation if notification fails
        }

        results.successful.push({ email, username: userToInvite.username });

      } catch (error) {
        results.failed.push({ email, reason: 'Server error' });
      }
    }

    console.log('✅ Bulk invite results:', results);
    res.json({
      success: true,
      message: `Invitations processed: ${results.successful.length} sent, ${results.failed.length} failed`,
      data: results
    });

  } catch (error) {
    console.error('Error bulk inviting users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get team analytics - NEW FEATURE
router.get('/:id/analytics', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }

    const currentUserId = req.user.id;

    // Check if user is a team member
    const membershipQuery = `
      SELECT 1 FROM team_members tm 
      JOIN teams t ON tm.team_id = t.id 
      WHERE tm.team_id = ? AND (tm.user_id = ? OR t.creator_id = ?)
    `;
    const membership = await AppDataSource.query(membershipQuery, [teamId, currentUserId, currentUserId]);
    
    if (membership.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get analytics data
    const analyticsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM team_members WHERE team_id = ?) as total_members,
        (SELECT COUNT(*) FROM invitations WHERE teamId = ? AND status = 'pending') as pending_invitations,
        (SELECT COUNT(*) FROM invitations WHERE teamId = ? AND status = 'accepted') as accepted_invitations,
        (SELECT COUNT(*) FROM invitations WHERE teamId = ? AND status = 'rejected') as rejected_invitations,
        (SELECT createdAt FROM teams WHERE id = ?) as team_created_at
    `;

    const analytics = await AppDataSource.query(analyticsQuery, [
      teamId, teamId, teamId, teamId, teamId
    ]);

    const result = analytics[0] || {};

    res.json({
      success: true,
      data: {
        member_stats: {
          total_members: parseInt(result.total_members) || 0,
          pending_invitations: parseInt(result.pending_invitations) || 0,
          accepted_invitations: parseInt(result.accepted_invitations) || 0,
          rejected_invitations: parseInt(result.rejected_invitations) || 0
        },
        team_age_days: result.team_created_at ? 
          Math.floor((new Date() - new Date(result.team_created_at)) / (1000 * 60 * 60 * 24)) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching team analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get items shared with a team (files/documents/folders/projects) - NEW FEATURE
router.get('/:id/shared', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }

    const currentUserId = req.user.id;
    const { resourceType, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check if user is a team member (or creator)
    const membershipQuery = `
      SELECT 1 FROM team_members tm 
      JOIN teams t ON tm.team_id = t.id 
      WHERE tm.team_id = ? AND (tm.user_id = ? OR t.creator_id = ?)
    `;
    const membership = await AppDataSource.query(membershipQuery, [teamId, currentUserId, currentUserId]);
    if (membership.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build filter
    let whereClause = 'WHERE s.teamId = ? AND s.isActive = true';
    const params = [teamId];
    if (resourceType && ['file', 'document', 'folder', 'project'].includes(resourceType)) {
      whereClause += ' AND s.resourceType = ?';
      params.push(resourceType);
    }

    // Fetch shared items for this team with resource details
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
        END as mimeType
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
    `, [...params, parseInt(limit), offset]);

    // Count for pagination
    const countRows = await AppDataSource.query(`
      SELECT COUNT(*) as total FROM shares s ${whereClause}
    `, params);
    const total = parseInt(countRows?.[0]?.total || 0);

    return res.json({
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
          team: item.teamId ? { id: item.teamId, name: item.teamName } : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching team shared items:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Search teams - NEW FEATURE
router.get('/search', async (req, res) => {
  try {
    const { query, type = 'all', page = 1, limit = 20 } = req.query;
    const currentUserId = req.user.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let searchQuery = '';
    let queryParams = [];

    if (type === 'public') {
      searchQuery = `
        SELECT DISTINCT
          t.id,
          t.name,
          t.description,
          t.visibility,
          t.creator_id,
          t.createdAt,
          COUNT(tm.user_id) as member_count,
          'public' as search_type
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.visibility = 'public' 
        AND (t.name LIKE ? OR t.description LIKE ?)
        GROUP BY t.id, t.name, t.description, t.visibility, t.creator_id, t.createdAt
        ORDER BY t.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      queryParams = [`%${query}%`, `%${query}%`, parseInt(limit), offset];
    } else {
      searchQuery = `
        SELECT DISTINCT
          t.id,
          t.name,
          t.description,
          t.visibility,
          t.creator_id,
          t.createdAt,
          COUNT(tm.user_id) as member_count,
          CASE 
            WHEN t.creator_id = ? THEN 'owned'
            WHEN EXISTS(SELECT 1 FROM team_members WHERE team_id = t.id AND user_id = ?) THEN 'member'
            ELSE 'public'
          END as search_type
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE (t.name LIKE ? OR t.description LIKE ?)
        AND (t.visibility = 'public' OR t.creator_id = ? OR EXISTS(
          SELECT 1 FROM team_members WHERE team_id = t.id AND user_id = ?
        ))
        GROUP BY t.id, t.name, t.description, t.visibility, t.creator_id, t.createdAt
        ORDER BY t.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      queryParams = [
        currentUserId, currentUserId, `%${query}%`, `%${query}%`, 
        currentUserId, currentUserId, parseInt(limit), offset
      ];
    }

    const results = await AppDataSource.query(searchQuery, queryParams);

    res.json({
      success: true,
      data: results,
      query: query,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.length
      }
    });

  } catch (error) {
    console.error('Error searching teams:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update member role in team
router.put('/:id/members/:userId/role', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userIdToUpdate = parseInt(req.params.userId);
    const { role } = req.body;
    
    if (isNaN(teamId) || teamId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team ID'
      });
    }

    if (isNaN(userIdToUpdate) || userIdToUpdate <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!role || !['admin', 'moderator', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, moderator, or member'
      });
    }

    const currentUserId = req.user.id;
    const teamRepo = AppDataSource.getRepository(Team);
    const teamMemberRepo = AppDataSource.getRepository(TeamMember);

    // Get team details
    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if current user has permission to change roles
    const currentUserMembership = await teamMemberRepo.findOne({
      where: { team_id: teamId, user_id: currentUserId }
    });

    if (!currentUserMembership || (currentUserMembership.role !== 'admin' && team.creator_id !== currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Only team admins can change member roles'
      });
    }

    // Cannot change creator's role
    if (userIdToUpdate === team.creator_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change team creator role'
      });
    }

    // Find the membership to update
    const membership = await teamMemberRepo.findOne({
      where: { team_id: teamId, user_id: userIdToUpdate }
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }

    // Update the role
    membership.role = role;
    await teamMemberRepo.save(membership);

    res.json({
      success: true,
      message: 'Member role updated successfully'
    });

  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get pending invitations for current user (non-conflicting path)
router.get('/invitations/list', async (req, res) => {
  try {
    const currentUserId = (req.user && (req.user.id || req.user.userId)) || null;
    if (!currentUserId) {
      return res.status(200).json({ success: true, invitations: [] });
    }

    if (!AppDataSource.isInitialized) {
      return res.status(500).json({ success: false, message: 'Database connection error' });
    }

    const invitationRepo = AppDataSource.getRepository(Invitation);
    const teamRepo = AppDataSource.getRepository(Team);

    let invitations = [];
    try {
      invitations = await invitationRepo.find({
        where: { inviteeId: currentUserId, status: 'pending' }
      });
    } catch (err) {
      invitations = [];
    }

    const invitationsWithTeams = [];
    for (const invitation of invitations) {
      try {
        const team = await teamRepo.findOne({ where: { id: invitation.teamId } });
        if (team) {
          invitationsWithTeams.push({
            id: invitation.id,
            teamId: invitation.teamId,
            teamName: team.name,
            teamDescription: team.description,
            status: invitation.status,
            createdAt: invitation.createdAt
          });
        }
      } catch (_) {}
    }

    res.json({ success: true, invitations: invitationsWithTeams });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router; 
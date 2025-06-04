const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Team = require('../models/Team');
const User = require('../models/User');
const Invitation = require('../models/Invitation');

// Get all teams for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [
        { creator: req.user.id },
        { members: req.user.id }
      ]
    }).populate('members', 'name email');

    res.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new team
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;

    const team = new Team({
      name,
      creator: req.user.id,
      members: [req.user.id]
    });

    await team.save();
    await team.populate('members', 'name email');

    res.status(201).json({ team });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a member to a team
router.post('/:teamId/members', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const team = await Team.findById(req.params.teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is the creator or a member
    if (team.creator.toString() !== req.user.id && !team.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Find user by email
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    if (team.members.includes(userToAdd._id)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Add user to team
    team.members.push(userToAdd._id);
    await team.save();
    await team.populate('members', 'name email');

    res.json({ team });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove a member from a team
router.delete('/:teamId/members/:memberId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only creator can remove members
    if (team.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Can't remove the creator
    if (req.params.memberId === team.creator.toString()) {
      return res.status(400).json({ message: 'Cannot remove team creator' });
    }

    team.members = team.members.filter(
      member => member.toString() !== req.params.memberId
    );

    await team.save();
    await team.populate('members', 'name email');
    res.json({ team });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a team
router.delete('/:teamId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only creator can delete the team
    if (team.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await team.remove();
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /teams/:teamId/invite
router.post('/:teamId/invite', auth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email } = req.body;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to invite members' });
    }
    const invitee = await User.findOne({ email });
    if (!invitee) return res.status(404).json({ message: 'User not found' });
    // Check if invitation already exists
    const existingInvite = await Invitation.findOne({ team: teamId, invitee: invitee._id });
    if (existingInvite) return res.status(400).json({ message: 'Invitation already sent' });
    const invitation = new Invitation({ team: teamId, invitee: invitee._id, status: 'pending' });
    await invitation.save();
    res.status(201).json({ message: 'Invitation sent', invitation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /teams/invitations
router.get('/invitations', auth, async (req, res) => {
  try {
    const invitations = await Invitation.find({ invitee: req.user._id, status: 'pending' }).populate('team', 'name');
    res.json({ invitations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /teams/invitations/:inviteId/accept
router.post('/invitations/:inviteId/accept', auth, async (req, res) => {
  try {
    const { inviteId } = req.params;
    const invitation = await Invitation.findById(inviteId);
    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
    if (invitation.invitee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this invitation' });
    }
    invitation.status = 'accepted';
    await invitation.save();
    const team = await Team.findById(invitation.team);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.members.push({ user: req.user._id, status: 'active' });
    await team.save();
    res.json({ message: 'Invitation accepted', team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /teams/invitations/:inviteId/reject
router.post('/invitations/:inviteId/reject', auth, async (req, res) => {
  try {
    const { inviteId } = req.params;
    const invitation = await Invitation.findById(inviteId);
    if (!invitation) return res.status(404).json({ message: 'Invitation not found' });
    if (invitation.invitee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this invitation' });
    }
    invitation.status = 'rejected';
    await invitation.save();
    res.json({ message: 'Invitation rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /teams/:teamId/leave
router.post('/:teamId/leave', auth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Creator cannot leave the team' });
    }
    team.members = team.members.filter(m => m.user.toString() !== req.user._id.toString());
    await team.save();
    res.json({ message: 'Left team successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 
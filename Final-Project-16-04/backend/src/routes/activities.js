const express = require('express');
const router = express.Router();
const ActivityService = require('../services/activityService');
const authenticate = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get user activities
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const activities = await ActivityService.getUserActivities(userId, limit, offset);
    const stats = await ActivityService.getActivityStats(userId);

    // Format activities for frontend
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.activity_type,
      description: activity.activity_description,
      resourceType: activity.resource_type,
      resourceId: activity.resource_id,
      metadata: activity.metadata,
      timestamp: activity.created_at,
      timeAgo: getTimeAgo(activity.created_at)
    }));

    res.json({
      success: true,
      data: {
        activities: formattedActivities,
        stats: stats,
        pagination: {
          page,
          limit,
          total: stats.totalActivities
        }
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities'
    });
  }
});

// Get activity statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await ActivityService.getActivityStats(userId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics'
    });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return new Date(date).toLocaleDateString();
  }
}

module.exports = router;
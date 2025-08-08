const { AppDataSource } = require('../config/database');
const UserActivity = require('../models/UserActivity');

class ActivityService {
  static async logActivity(userId, activityType, description, resourceType = null, resourceId = null, metadata = null) {
    try {
      const activityRepo = AppDataSource.getRepository(UserActivity);
      
      const activity = activityRepo.create({
        user_id: userId,
        activity_type: activityType,
        activity_description: description,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata,
        created_at: new Date()
      });

      await activityRepo.save(activity);
      console.log(`✅ Activity logged: ${activityType} for user ${userId}`);
      return activity;
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      return null;
    }
  }

  static async getUserActivities(userId, limit = 50, offset = 0) {
    try {
      const activityRepo = AppDataSource.getRepository(UserActivity);
      
      const activities = await activityRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: limit,
        skip: offset
      });

      return activities;
    } catch (error) {
      console.error('❌ Error fetching user activities:', error);
      return [];
    }
  }

  static async getActivityStats(userId) {
    try {
      const activityRepo = AppDataSource.getRepository(UserActivity);
      
      // Get activity counts by type
      const typeStats = await activityRepo
        .createQueryBuilder('activity')
        .select('activity.activity_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('activity.user_id = :userId', { userId })
        .groupBy('activity.activity_type')
        .getRawMany();

      // Get recent activities count (last 7 days)
      const recentCount = await activityRepo
        .createQueryBuilder('activity')
        .where('activity.user_id = :userId', { userId })
        .andWhere('activity.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')
        .getCount();

      return {
        typeStats,
        recentCount,
        totalActivities: typeStats.reduce((sum, stat) => sum + parseInt(stat.count), 0)
      };
    } catch (error) {
      console.error('❌ Error fetching activity stats:', error);
      return { typeStats: [], recentCount: 0, totalActivities: 0 };
    }
  }
}

// Activity types constants
ActivityService.ACTIVITY_TYPES = {
  // Account activities
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_LOGIN: 'account_login',
  ACCOUNT_LOGOUT: 'account_logout',
  PROFILE_UPDATED: 'profile_updated',
  PASSWORD_CHANGED: 'password_changed',
  AVATAR_UPDATED: 'avatar_updated',
  
  // Team activities
  TEAM_CREATED: 'team_created',
  TEAM_JOINED: 'team_joined',
  TEAM_LEFT: 'team_left',
  TEAM_INVITED: 'team_invited',
  TEAM_ROLE_CHANGED: 'team_role_changed',
  
  // File activities
  FILE_UPLOADED: 'file_uploaded',
  FILE_DOWNLOADED: 'file_downloaded',
  FILE_SHARED: 'file_shared',
  FILE_DELETED: 'file_deleted',
  
  // Document activities
  DOCUMENT_CREATED: 'document_created',
  DOCUMENT_EDITED: 'document_edited',
  DOCUMENT_SHARED: 'document_shared',
  DOCUMENT_DELETED: 'document_deleted',
  
  // Project activities
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_SHARED: 'project_shared',
  PROJECT_DELETED: 'project_deleted',
  
  // Folder activities
  FOLDER_CREATED: 'folder_created',
  FOLDER_SHARED: 'folder_shared',
  FOLDER_DELETED: 'folder_deleted'
};

module.exports = ActivityService;
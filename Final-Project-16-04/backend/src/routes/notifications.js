const express = require('express');
const { AppDataSource } = require('../config/database');
const Notification = require('../models/Notification');

const router = express.Router();

// Test endpoint to create a notification
router.post("/test", async (req, res) => {
  try {
    console.log('🧪 Creating test notification for user:', req.user.id);
    
    const notificationRepo = AppDataSource.getRepository(Notification);
    const testNotification = notificationRepo.create({
      userId: req.user.id,
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      isRead: false
    });
    
    await notificationRepo.save(testNotification);
    console.log('✅ Test notification created:', testNotification.id);
    
    res.status(201).json({ 
      message: "Test notification created successfully",
      notification: testNotification 
    });
  } catch (error) {
    console.error("❌ Create test notification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all notifications for the current user (optimized for speed)
router.get("/", async (req, res) => {
  try {
    console.log('📧 Fetching notifications for user:', req.user.id);
    
    const notificationRepo = AppDataSource.getRepository(Notification);
    
    // Get notifications with minimal data for speed
    const notifications = await notificationRepo.find({
      where: { userId: req.user.id },
      // Include 'data' to support actionable notifications like team invitations
      select: ['id', 'type', 'title', 'message', 'data', 'isRead', 'createdAt'],
      order: { createdAt: "DESC" },
      take: 20
    });
    
    console.log(`📧 Found ${notifications.length} notifications for user ${req.user.id}`);
    res.json({ notifications });
  } catch (error) {
    console.error("❌ Get notifications error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Mark notification as read (exact copy from old server.js)
router.patch("/:id/read", async (req, res) => {
  try {
    console.log('📧 Marking notification as read:', req.params.id, 'for user:', req.user.id);
    
    const notificationRepo = AppDataSource.getRepository(Notification);
    const notification = await notificationRepo.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!notification) {
      console.log('❌ Notification not found:', req.params.id);
      return res.status(404).json({ message: "Notification not found" });
    }
    
    notification.isRead = true;
    await notificationRepo.save(notification);
    
    console.log('✅ Notification marked as read:', req.params.id);
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("❌ Mark notification as read error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Mark all notifications as read (exact copy from old server.js)
router.patch("/mark-all-read", async (req, res) => {
  try {
    console.log('📧 Marking all notifications as read for user:', req.user.id);
    
    const notificationRepo = AppDataSource.getRepository(Notification);
    const result = await notificationRepo.update(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );
    
    console.log('✅ Marked all notifications as read. Affected rows:', result.affected);
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("❌ Mark all notifications as read error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Delete notification (exact copy from old server.js)
router.delete("/:id", async (req, res) => {
  try {
    console.log('📧 Deleting notification:', req.params.id, 'for user:', req.user.id);
    
    const notificationRepo = AppDataSource.getRepository(Notification);
    const notification = await notificationRepo.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!notification) {
      console.log('❌ Notification not found:', req.params.id);
      return res.status(404).json({ message: "Notification not found" });
    }
    
    await notificationRepo.remove(notification);
    
    console.log('✅ Notification deleted:', req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("❌ Delete notification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router; 
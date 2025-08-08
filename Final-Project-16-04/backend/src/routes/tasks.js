const express = require('express');
const { AppDataSource } = require('../config/database');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

const router = express.Router();

// Get all tasks for the current user (optimized for speed)
router.get("/", async (req, res) => {
  try {
    const taskRepo = AppDataSource.getRepository("Task");
    
    // Get tasks with minimal data for speed
    const tasks = await taskRepo.find({
      where: { assignedUserId: req.user.id },
      select: ['id', 'title', 'description', 'status', 'priority', 'dueDate', 'projectId'], // Only select needed fields
      order: { createdAt: "DESC" },
      take: 30 // Limit for performance
    });
    
    console.log(`📋 Found ${tasks.length} tasks for user ${req.user.id}`);
    res.json({ tasks });
  } catch (error) {
    console.error("❌ Get tasks error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create a new task (exact copy from old server.js)
router.post("/projects/:projectId/tasks", async (req, res) => {
  try {
    const { title, description, assignedUserId, priority, dueDate } = req.body;
    const taskRepo = AppDataSource.getRepository("Task");
    const projectRepo = AppDataSource.getRepository("Project");
    
    // First verify the user has access to the project
    const project = await projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.team", "team")
      .leftJoinAndSelect("team.members", "member")
      .where("project.id = :projectId", { projectId: req.params.projectId })
      .andWhere("member.id = :userId", { userId: req.user.id })
      .getOne();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const newTask = taskRepo.create({
      title,
      description,
      projectId: req.params.projectId,
      assignedUserId: assignedUserId || null,
      priority: priority || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: assignedUserId ? "In Progress" : "To Do"
    });

    await taskRepo.save(newTask);

    // Fetch the task with assigned user
    const savedTask = await taskRepo.findOne({
      where: { id: newTask.id },
      relations: ["assignedUser"]
    });

    res.status(201).json(savedTask);
  } catch (error) {
    console.error("❌ Error creating task:", error);
    res.status(500).json({ message: "Failed to create task", error: error.message });
  }
});

// Update a task (exact copy from old server.js)
router.put("/:id", async (req, res) => {
  try {
    const { title, description, assignedUserId, status, priority, dueDate } = req.body;
    const taskRepo = AppDataSource.getRepository("Task");
    const projectRepo = AppDataSource.getRepository("Project");
    const userRepo = AppDataSource.getRepository("User");
    // First get the task and verify user has access to the project
    const task = await taskRepo.findOne({
      where: { id: req.params.id },
      relations: ["project", "project.team", "project.team.members"]
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    // Check if user has access to the project
    const hasAccess = task.project.team.members.some(member => member.id === req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }
    // Enforce status based on assignment, regardless of whether the assignee changed
    if (assignedUserId) {
      task.assignedUserId = assignedUserId;
      if (status === "Done") {
        task.status = "Done";
      } else {
        task.status = "In Progress";
      }
    } else {
      task.assignedUserId = null;
      if (status === "Done") {
        task.status = "Done";
      } else {
        task.status = "To Do";
      }
    }
    
    task.title = title || task.title;
    task.description = description || task.description;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.dueDate = dueDate ? new Date(dueDate) : task.dueDate;
    task.updatedAt = new Date();
    await taskRepo.save(task);
    
    // Create notification if task was assigned to someone new
    if (assignedUserId && assignedUserId !== task.assignedUserId) {
      // Note: createNotification function would need to be imported or defined
      // await createNotification(
      //   assignedUserId,
      //   'task_assigned',
      //   'Task Assigned',
      //   `You've been assigned to task "${task.title}" in project "${task.project.name}"`,
      //   { taskId: task.id, projectId: task.project.id, projectName: task.project.name }
      // );
    }
    
    const updatedTask = await taskRepo.findOne({
      where: { id: task.id },
      relations: ["assignedUser"]
    });
    
    res.json(updatedTask);
  } catch (error) {
    console.error("❌ Error updating task:", error);
    res.status(500).json({ message: "Failed to update task", error: error.message });
  }
});

// Get a single task by ID with details
router.get("/:id", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;
    
    // Check access with direct SQL query
    const accessCheck = await AppDataSource.query(`
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.dueDate, 
        t.assignedUserId, t.projectId, t.createdAt, t.updatedAt,
        p.name as projectName,
        team.name as teamName,
        team.creator_id as teamCreatorId,
        au.id as assignedUserId, au.username as assignedUsername, au.email as assignedEmail
      FROM tasks t
      JOIN projects p ON t.projectId = p.id
      JOIN teams team ON p.teamId = team.id
      LEFT JOIN users au ON t.assignedUserId = au.id
      LEFT JOIN team_members tm ON team.id = tm.team_id AND tm.user_id = ?
      WHERE t.id = ? AND (tm.user_id IS NOT NULL OR team.creator_id = ?)
    `, [userId, taskId, userId]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({ message: "Task not found or access denied" });
    }
    
    const taskData = accessCheck[0];
    
    // Format response to match expected structure
    const response = {
      id: taskData.id,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      assignedUserId: taskData.assignedUserId,
      projectId: taskData.projectId,
      createdAt: taskData.createdAt,
      updatedAt: taskData.updatedAt,
      project: {
        name: taskData.projectName,
        team: {
          name: taskData.teamName,
          creator_id: taskData.teamCreatorId
        }
      },
      assignedUser: taskData.assignedUserId ? {
        id: taskData.assignedUserId,
        username: taskData.assignedUsername,
        email: taskData.assignedEmail
      } : null
    };
    
    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching task:", error);
    res.status(500).json({ message: "Failed to fetch task", error: error.message });
  }
});

// Claim a task (assign to current user)
router.patch("/:id/claim", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;
    
    // Check access and get task info with SQL query
    const accessCheck = await AppDataSource.query(`
      SELECT 
        t.id, t.assignedUserId, t.status,
        team.creator_id as teamCreatorId
      FROM tasks t
      JOIN projects p ON t.projectId = p.id
      JOIN teams team ON p.teamId = team.id
      LEFT JOIN team_members tm ON team.id = tm.team_id AND tm.user_id = ?
      WHERE t.id = ? AND (tm.user_id IS NOT NULL OR team.creator_id = ?)
    `, [userId, taskId, userId]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({ message: "Task not found or access denied" });
    }
    
    const taskInfo = accessCheck[0];
    
    // Check if task is already assigned
    if (taskInfo.assignedUserId) {
      return res.status(400).json({ message: "Task is already assigned" });
    }
    
    // Update task assignment
    await AppDataSource.query(`
      UPDATE tasks 
      SET assignedUserId = ?, status = 'In Progress', updatedAt = NOW()
      WHERE id = ?
    `, [userId, taskId]);
    
    // Fetch updated task details
    const updatedTaskData = await AppDataSource.query(`
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.dueDate, 
        t.assignedUserId, t.projectId, t.createdAt, t.updatedAt,
        p.name as projectName,
        au.id as assignedUserId, au.username as assignedUsername, au.email as assignedEmail
      FROM tasks t
      JOIN projects p ON t.projectId = p.id
      LEFT JOIN users au ON t.assignedUserId = au.id
      WHERE t.id = ?
    `, [taskId]);
    
    const taskData = updatedTaskData[0];
    const response = {
      id: taskData.id,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      assignedUserId: taskData.assignedUserId,
      projectId: taskData.projectId,
      createdAt: taskData.createdAt,
      updatedAt: taskData.updatedAt,
      project: { name: taskData.projectName },
      assignedUser: {
        id: taskData.assignedUserId,
        username: taskData.assignedUsername,
        email: taskData.assignedEmail
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error("❌ Error claiming task:", error);
    res.status(500).json({ message: "Failed to claim task", error: error.message });
  }
});

// Complete a task
router.patch("/:id/complete", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;
    
    // Check access with SQL query
    const accessCheck = await AppDataSource.query(`
      SELECT 
        t.id, t.status,
        team.creator_id as teamCreatorId
      FROM tasks t
      JOIN projects p ON t.projectId = p.id
      JOIN teams team ON p.teamId = team.id
      LEFT JOIN team_members tm ON team.id = tm.team_id AND tm.user_id = ?
      WHERE t.id = ? AND (tm.user_id IS NOT NULL OR team.creator_id = ?)
    `, [userId, taskId, userId]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({ message: "Task not found or access denied" });
    }
    
    // Update task status
    await AppDataSource.query(`
      UPDATE tasks 
      SET status = 'Done', updatedAt = NOW()
      WHERE id = ?
    `, [taskId]);
    
    // Fetch updated task details
    const updatedTaskData = await AppDataSource.query(`
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.dueDate, 
        t.assignedUserId, t.projectId, t.createdAt, t.updatedAt,
        p.name as projectName,
        au.id as assignedUserId, au.username as assignedUsername, au.email as assignedEmail
      FROM tasks t
      JOIN projects p ON t.projectId = p.id
      LEFT JOIN users au ON t.assignedUserId = au.id
      WHERE t.id = ?
    `, [taskId]);
    
    const taskData = updatedTaskData[0];
    const response = {
      id: taskData.id,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      dueDate: taskData.dueDate,
      assignedUserId: taskData.assignedUserId,
      projectId: taskData.projectId,
      createdAt: taskData.createdAt,
      updatedAt: taskData.updatedAt,
      project: { name: taskData.projectName },
      assignedUser: taskData.assignedUserId ? {
        id: taskData.assignedUserId,
        username: taskData.assignedUsername,
        email: taskData.assignedEmail
      } : null
    };
    
    res.json(response);
  } catch (error) {
    console.error("❌ Error completing task:", error);
    res.status(500).json({ message: "Failed to complete task", error: error.message });
  }
});

// Delete a task
router.delete("/:id", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.user.id;
    
    // Check access with SQL query
    const accessCheck = await AppDataSource.query(`
      SELECT t.id
      FROM tasks t
      JOIN projects p ON t.projectId = p.id
      JOIN teams team ON p.teamId = team.id
      LEFT JOIN team_members tm ON team.id = tm.team_id AND tm.user_id = ?
      WHERE t.id = ? AND (tm.user_id IS NOT NULL OR team.creator_id = ?)
    `, [userId, taskId, userId]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({ message: "Task not found or access denied" });
    }
    
    // Delete the task
    await AppDataSource.query(`DELETE FROM tasks WHERE id = ?`, [taskId]);
    
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task", error: error.message });
  }
});

module.exports = router; 
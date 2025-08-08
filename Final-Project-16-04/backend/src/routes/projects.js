const express = require('express');
const { AppDataSource } = require('../config/database');
const Project = require('../models/Project');
const Team = require('../models/Team');

const router = express.Router();

// Create a new project (exact copy from old server.js)
router.post("/", async (req, res) => {
  try {
    const { name, description, teamId, dueDate } = req.body;

    if (!name || !teamId) {
      return res.status(400).json({ message: "Project name and team are required" });
    }

    // Validate team and membership
    const teamRepo = AppDataSource.getRepository("Team");
    const teamMemberRepo = AppDataSource.getRepository("TeamMember");

    const team = await teamRepo.findOne({ where: { id: teamId } });
    if (!team) return res.status(404).json({ message: "Team not found" });

    const membership = await teamMemberRepo.findOne({ where: { team_id: teamId, user_id: req.user.id } });
    if (!membership && team.creator_id !== req.user.id) {
      return res.status(403).json({ message: "You are not a member of this team." });
    }

    const projectRepo = AppDataSource.getRepository("Project");
    const newProject = projectRepo.create({
      name,
      description: description || null,
      teamId: teamId,
      dueDate: dueDate || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const saved = await projectRepo.save(newProject);
    res.status(201).json(saved);
  } catch (error) {
    console.error("❌ Failed to create project:", error);
    res.status(500).json({ message: "Failed to create project", error: error.message });
  }
});

// Update a project (exact copy from old server.js)
router.put("/:id", async (req, res) => {
  try {
    const { name, description, dueDate } = req.body;
    const projectRepo = AppDataSource.getRepository("Project");
    const project = await projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.team", "team")
      .leftJoinAndSelect("team.members", "member")
      .where("project.id = :projectId", { projectId: req.params.id })
      .andWhere("member.id = :userId", { userId: req.user.id })
      .getOne();
    if (!project) return res.status(404).json({ message: "Project not found" });
    project.name = name || project.name;
    project.description = description || project.description;
    project.dueDate = dueDate ? new Date(dueDate) : project.dueDate;
    project.updatedAt = new Date();
    await projectRepo.save(project);
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to update project", error: error.message });
  }
});

// Delete a project (exact copy from old server.js)
router.delete("/:id", async (req, res) => {
  try {
    const projectRepo = AppDataSource.getRepository("Project");
    const project = await projectRepo
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.team", "team")
      .leftJoinAndSelect("team.members", "member")
      .where("project.id = :projectId", { projectId: req.params.id })
      .andWhere("member.id = :userId", { userId: req.user.id })
      .getOne();
    if (!project) return res.status(404).json({ message: "Project not found" });
    await projectRepo.remove(project);
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete project", error: error.message });
  }
});

// Get all projects for the current user (optimized for speed)
router.get("/", async (req, res) => {
  try {
    console.log(`🔍 Fetching projects for user ${req.user.id}`);
    
    const currentUserId = req.user.id;

    // Get projects where the user is a member of the project's team
    const projects = await AppDataSource.query(`
      SELECT DISTINCT 
        p.id,
        p.name,
        p.description,
        p.teamId,
        p.dueDate,
        p.createdAt,
        p.updatedAt,
        t.name as teamName,
        t.creator_id as teamCreatorId,
        (SELECT COUNT(*) FROM tasks WHERE projectId = p.id) as taskCount,
        (SELECT COUNT(*) FROM tasks WHERE projectId = p.id AND status = 'Done') as completedTasks
      FROM projects p
      JOIN teams t ON p.teamId = t.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ? OR t.creator_id = ?
      ORDER BY p.createdAt DESC
      LIMIT 50
    `, [currentUserId, currentUserId]);

    // Format the response data
    const formattedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      teamId: project.teamId,
      teamName: project.teamName,
      dueDate: project.dueDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      taskCount: parseInt(project.taskCount) || 0,
      completedTasks: parseInt(project.completedTasks) || 0,
      progress: project.taskCount > 0 ? Math.round((project.completedTasks / project.taskCount) * 100) : 0,
      tasks: [] // We'll populate this if needed later
    }));
    
    console.log(`✅ Found ${formattedProjects.length} projects for user ${req.user.id}`);
    
    res.json({ 
      success: true,
      projects: formattedProjects,
      total: formattedProjects.length
    });
    
  } catch (error) {
    console.error("❌ Get projects error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch projects", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error' 
    });
  }
});

// Get project by id with tasks
router.get('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const projectRepo = AppDataSource.getRepository('Project');

    // Verify access: user must be team member or team creator
    const accessRows = await AppDataSource.query(
      `SELECT p.id, p.name, p.description, p.teamId, p.dueDate, p.createdAt, p.updatedAt, t.name as teamName, t.creator_id as teamCreatorId
       FROM projects p
       JOIN teams t ON p.teamId = t.id
       LEFT JOIN team_members tm ON t.id = tm.team_id
       WHERE p.id = ? AND (tm.user_id = ? OR t.creator_id = ?)
       LIMIT 1`,
      [projectId, req.user.id, req.user.id]
    );

    if (accessRows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const row = accessRows[0];

    // Fetch tasks
    const tasks = await AppDataSource.getRepository('Task').find({
      where: { projectId: projectId },
      relations: ['assignedUser', 'completedByUser']
    });

    const project = {
      id: row.id,
      name: row.name,
      description: row.description,
      teamId: row.teamId,
      team: { id: row.teamId, name: row.teamName },
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tasks
    };

    res.json(project);
  } catch (error) {
    console.error('❌ Failed to fetch project:', error);
    res.status(500).json({ message: 'Failed to fetch project', error: error.message });
  }
});

// Create a task under a project
router.post('/:id/tasks', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const { title, description, assignedUserId, priority, dueDate } = req.body || {};
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    // Verify access: user must be team member or team creator for the project
    const accessRows = await AppDataSource.query(
      `SELECT p.id, t.id as teamId, t.creator_id as teamCreatorId
       FROM projects p
       JOIN teams t ON p.teamId = t.id
       LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = ?
       WHERE p.id = ? AND (tm.user_id IS NOT NULL OR t.creator_id = ?)
       LIMIT 1`,
      [req.user.id, projectId, req.user.id]
    );

    if (accessRows.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const taskRepo = AppDataSource.getRepository('Task');

    const newTask = taskRepo.create({
      title: title.trim(),
      description: description || null,
      projectId: projectId,
      assignedUserId: assignedUserId || null,
      priority: priority || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: assignedUserId ? 'In Progress' : 'To Do'
    });

    await taskRepo.save(newTask);

    const savedTask = await taskRepo.findOne({
      where: { id: newTask.id },
      relations: ['assignedUser']
    });

    return res.status(201).json(savedTask);
  } catch (error) {
    console.error('❌ Error creating task:', error);
    return res.status(500).json({ message: 'Failed to create task', error: error.message });
  }
});

// Update project
router.put('/:id', async (req, res) => {
    try {
      const { name, description, dueDate } = req.body;
      const projectRepo = AppDataSource.getRepository("Project");
      const project = await projectRepo
        .createQueryBuilder("project")
        .leftJoinAndSelect("project.team", "team")
        .leftJoinAndSelect("team.members", "member")
        .where("project.id = :projectId", { projectId: req.params.id })
        .andWhere("member.id = :userId", { userId: req.user.id })
        .getOne();
      if (!project) return res.status(404).json({ message: "Project not found" });
      project.name = name || project.name;
      project.description = description || project.description;
      project.dueDate = dueDate ? new Date(dueDate) : project.dueDate;
      project.updatedAt = new Date();
      await projectRepo.save(project);
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project", error: error.message });
    }
  });

module.exports = router; 
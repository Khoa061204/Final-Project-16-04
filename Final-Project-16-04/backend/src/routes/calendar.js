const express = require('express');
const { AppDataSource } = require('../config/database');
const Event = require('../models/Event');

const router = express.Router();

// Get all events for the current user (optimized for speed)
router.get("/", async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository(Event);
    
    // Get events with minimal data for speed
    const events = await eventRepo.find({
      where: { userId: req.user.id },
      select: ['id', 'title', 'description', 'start', 'end', 'allDay'], // Only select needed fields
      order: { start: "ASC" },
      take: 50 // Limit for performance
    });
    
    console.log(`📅 Found ${events.length} events for user ${req.user.id}`);
    res.json({ events });
  } catch (error) {
    console.error("❌ Get events error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all events for the current user (events endpoint)
router.get("/events", async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository(Event);
    
    // Get events with minimal data for speed
    const events = await eventRepo.find({
      where: { userId: req.user.id },
      select: ['id', 'title', 'description', 'start', 'end', 'allDay'], // Only select needed fields
      order: { start: "ASC" },
      take: 50 // Limit for performance
    });
    
    console.log(`📅 Found ${events.length} events for user ${req.user.id}`);
    res.json({ events });
  } catch (error) {
    console.error("❌ Get events error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create a new event (fixed route)
router.post("/", async (req, res) => {
  try {
    const { title, description, start, end, allDay } = req.body;
    const eventRepo = AppDataSource.getRepository(Event);
    const newEvent = eventRepo.create({
      title,
      description,
      start: new Date(start),
      end: new Date(end),
      allDay: !!allDay,
      userId: req.user.id,
    });
    await eventRepo.save(newEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ message: "Failed to create event", error: error.message });
  }
});

// Create a new event (events endpoint)
router.post("/events", async (req, res) => {
  try {
    const { title, description, startDate, endDate, allDay } = req.body;
    const eventRepo = AppDataSource.getRepository(Event);
    const newEvent = eventRepo.create({
      title,
      description,
      start: new Date(startDate || start),
      end: new Date(endDate || end),
      allDay: !!allDay,
      userId: req.user.id,
    });
    await eventRepo.save(newEvent);
    console.log(`✅ Created event: ${newEvent.title} for user ${req.user.id}`);
    res.status(201).json({ event: newEvent });
  } catch (error) {
    console.error("❌ Create event error:", error);
    res.status(500).json({ message: "Failed to create event", error: error.message });
  }
});

// Update an event (fixed route)
router.put("/:id", async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository(Event);
    const event = await eventRepo.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!event) return res.status(404).json({ message: "Event not found" });
    const { title, description, start, end, allDay } = req.body;
    event.title = title || event.title;
    event.description = description || event.description;
    event.start = start ? new Date(start) : event.start;
    event.end = end ? new Date(end) : event.end;
    event.allDay = typeof allDay === 'boolean' ? allDay : event.allDay;
    await eventRepo.save(event);
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Failed to update event", error: error.message });
  }
});

// Update an event (events endpoint)
router.put("/events/:id", async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository(Event);
    const event = await eventRepo.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!event) return res.status(404).json({ message: "Event not found" });
    const { title, description, startDate, endDate, allDay } = req.body;
    event.title = title || event.title;
    event.description = description || event.description;
    event.start = startDate ? new Date(startDate) : event.start;
    event.end = endDate ? new Date(endDate) : event.end;
    event.allDay = typeof allDay === 'boolean' ? allDay : event.allDay;
    await eventRepo.save(event);
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Failed to update event", error: error.message });
  }
});

// Delete an event (fixed route)
router.delete("/:id", async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository(Event);
    const event = await eventRepo.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!event) return res.status(404).json({ message: "Event not found" });
    await eventRepo.remove(event);
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event", error: error.message });
  }
});

// Delete an event (events endpoint)
router.delete("/events/:id", async (req, res) => {
  try {
    const eventRepo = AppDataSource.getRepository(Event);
    const event = await eventRepo.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!event) return res.status(404).json({ message: "Event not found" });
    await eventRepo.remove(event);
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event", error: error.message });
  }
});

module.exports = router; 
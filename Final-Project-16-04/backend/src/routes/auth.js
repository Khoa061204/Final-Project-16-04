/**
 * Authentication Routes
 * ---------------------
 * This file defines the authentication-related API endpoints for user registration, login, and token verification.
 *
 * ## Endpoints:
 *
 * - POST /register
 *   - Registers a new user with username, email, and password.
 *   - Validates input fields, checks for existing users, hashes passwords, and logs account creation activity.
 *   - Returns the created user (id, username, email) on success.
 *   - Error responses for missing/invalid fields, duplicate email/username, and server/database errors.
 *
 * - POST /login
 *   - Authenticates a user using email and password.
 *   - Validates input, checks user existence, compares hashed passwords.
 *   - Issues a JWT token (24h expiry) on success, updates last login, and logs login activity.
 *   - Error responses for missing/invalid fields, invalid credentials, and server errors.
 *
 * - GET /verify-token
 *   - Verifies the provided JWT token (from Authorization header).
 *   - Returns user info if valid, error if invalid or expired.
 *
 * - GET /verify
 *   - Alias for /verify-token for frontend compatibility.
 *
 * ## Validation:
 * - Email format, password length (min 8), username length (min 3).
 * - Duplicate email/username checks.
 *
 * ## Authentication:
 * - Uses JWT for stateless authentication.
 * - JWT secret is loaded from environment variables.
 *
 * ## Activity Logging:
 * - Uses ActivityService to log account creation and login events for auditing and analytics.
 *
 * ## Error Handling:
 * - Returns detailed error messages and fields for validation errors.
 * - Handles database errors (e.g., duplicate entries).
 * - Logs errors to the server console for debugging.
 *
 * ## Related Files:
 * - User model: Defines user schema and fields (see ../models/User.js)
 * - ActivityService: Handles activity logging (see ../services/activityService.js)
 * - Database config: TypeORM setup (see ../config/database.js)
 * - Auth middleware: JWT authentication (see ../middleware/auth.js)
 *
 * @module routes/auth
 */
const express = require('express');
const { AppDataSource } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ActivityService = require('../services/activityService');

const router = express.Router();

// ✅ Register User with Enhanced Validation 
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: "All fields are required",
        errors: {
          username: !username ? "Username is required" : null,
          email: !email ? "Email is required" : null,
          password: !password ? "Password is required" : null
        }
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: "Invalid email format",
        field: "email"
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters long",
        field: "password"
      });
    }

    // Username validation
    if (username.length < 3) {
      return res.status(400).json({ 
        message: "Username must be at least 3 characters long",
        field: "username"
      });
    }

    const userRepo = AppDataSource.getRepository(User);

    // Check if email exists
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        message: "Email already exists",
        field: "email"
      });
    }

    // Check if username exists
    const existingUsername = await userRepo.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ 
        message: "Username already exists",
        field: "username"
      });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds

    // Insert User into Database
    const newUser = userRepo.create({ username, email, password: hashedPassword });
    await userRepo.save(newUser);

    // Log account creation activity
    await ActivityService.logActivity(
      newUser.id,
      ActivityService.ACTIVITY_TYPES.ACCOUNT_CREATED,
      `Account created for ${username}`,
      'user',
      newUser.id,
      { email, registrationDate: new Date().toISOString() }
    );

    res.status(201).json({ 
      message: "✅ User registered successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error("❌ Registration Error:", error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        message: "User already exists",
        field: error.message.includes('email') ? 'email' : 'username'
      });
    }
    
    res.status(500).json({ 
      message: "Registration failed. Please try again.",
      requestId: Date.now().toString()
    });
  }
});

// ✅ Login User with Enhanced Validation (exact copy from old server.js)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required",
        errors: {
          email: !email ? "Email is required" : null,
          password: !password ? "Password is required" : null
        }
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: "Invalid email format",
        field: "email"
      });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ 
        message: "Invalid email or password",
        field: "email"
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        message: "Invalid email or password",
        field: "password"
      });
    }

    // Generate JWT token with enhanced security
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        username: user.username,
        iat: Math.floor(Date.now() / 1000)
      }, 
      process.env.JWT_SECRET, 
      { 
        expiresIn: "24h", // Extended token lifetime
        issuer: "giggle-drive",
        audience: "giggle-drive-users"
      }
    );

    // Update last login time
    user.last_login = new Date();
    await userRepo.save(user);

    // Log login activity
    await ActivityService.logActivity(
      user.id,
      ActivityService.ACTIVITY_TYPES.ACCOUNT_LOGIN,
      `Logged in successfully`,
      'user',
      user.id,
      { 
        loginTime: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'Unknown'
      }
    );

    res.json({ 
      message: "✅ Login successful", 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        avatar_url: user.avatar_url
      },
      expiresIn: "24h"
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    
    // Handle specific errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: "Authentication failed",
        field: "token"
      });
    }
    
    res.status(500).json({ 
      message: "Login failed. Please try again.",
      requestId: Date.now().toString()
    });
  }
});

// ✅ Verify Token (exact copy from old server.js)
router.get("/verify-token", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        message: "No token provided" 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.id } });
    
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid token" 
      });
    }
    
    res.json({ 
      message: "Token verified",
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        avatar_url: user.avatar_url
      } 
    });
  } catch (error) {
    console.error("❌ Token verification error:", error);
    res.status(401).json({ 
      message: "Invalid token" 
    });
  }
});

// ✅ Verify endpoint (for frontend compatibility)
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        message: "No token provided" 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.id } });
    
    if (!user) {
      return res.status(401).json({ 
        message: "Invalid token" 
      });
    }
    
    res.json({ 
      message: "Token verified",
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        avatar_url: user.avatar_url
      } 
    });
  } catch (error) {
    console.error("❌ Token verification error:", error);
    res.status(401).json({ 
      message: "Invalid token" 
    });
  }
});

module.exports = router; 
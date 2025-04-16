const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const router = express.Router();
require("dotenv").config();
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const resetTokens = {}; 
const users = []; // Temporary in-memory storage (replace with DB later)

// REGISTER ROUTE
router.post(
  "/register",
  [
    check("email", "Please enter a valid email").isEmail(),
    check("password", "Password must be at least 6 characters").isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    
    // Check if user exists
    if (users.find(user => user.email === email)) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = { email, password: hashedPassword };
    users.push(newUser);

    res.json({ msg: "User registered successfully" });
  }
);

// LOGIN ROUTE
router.post(
  "/login",
  [
    check("email", "Enter a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    // Find user
    const user = users.find(user => user.email === email);
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ token });
  }
);
app.post("/reset-password", async (req, res) => {
  const { token, email, newPassword } = req.body;

  // Validate token
  if (resetTokens[email] !== token) {
      return res.status(400).json({ message: "Invalid or expired token" });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password in DB
  await db.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email]);

  // Remove token after use
  delete resetTokens[email];

  res.json({ message: "Password updated successfully" });
});

module.exports = router;

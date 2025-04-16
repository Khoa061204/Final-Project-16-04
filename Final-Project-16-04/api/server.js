require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const AppDataSource = require("./data-source");
const User = require("./src/entities/User.js");

const app = express();
app.use(express.json());

// ✅ CORS Configuration
app.use(
  cors({
    origin: ["http://localhost:3000"], // Add more origins if needed
    methods: "GET, POST",
    credentials: true,
  })
);

// ✅ Ensure Database Connection
AppDataSource.initialize()
  .then(() => console.log("✅ TypeORM Database Connected"))
  .catch((err) => console.error("❌ TypeORM Connection Error:", err));

// ✅ AWS S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ✅ Multer Setup (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

/* ================================
        🟢 AUTHENTICATION ROUTES
================================ */

// ✅ Register User
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userRepo = AppDataSource.getRepository(User);

    // Check if user exists
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert User into Database
    const newUser = userRepo.create({ username, email, password: hashedPassword });
    await userRepo.save(newUser);

    res.status(201).json({ message: "✅ User registered successfully" });
  } catch (error) {
    console.error("❌ Database Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Login User
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "❌ Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "❌ Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "✅ Login successful", token });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Request Password Reset
const resetTokens = {}; // Temporary in-memory storage
app.post("/request-reset", async (req, res) => {
  const { email } = req.body;

  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "❌ Email not found" });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens[email] = token; // Store token in memory

    console.log(`🔵 Reset token for ${email}: ${token}`); // Normally, send this via email

    res.json({ message: "✅ Reset link sent! Check your email." });
  } catch (error) {
    console.error("❌ Reset request error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ================================
        🔵 FILE UPLOAD ROUTE
================================ */

// ✅ File Upload API (Direct to S3)
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "❌ No file uploaded" });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer, // ✅ Directly send buffer (No FS)
      ContentType: req.file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    console.log(`✅ File uploaded successfully: ${fileUrl}`);

    res.status(200).json({ message: "✅ Upload successful", fileUrl });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

/* ================================
        🚀 START SERVER
================================ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

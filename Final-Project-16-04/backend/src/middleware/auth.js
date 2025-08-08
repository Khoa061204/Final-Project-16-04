const jwt = require("jsonwebtoken");
const { AppDataSource } = require("../config/database");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth header received:', authHeader ? authHeader.substring(0, 50) + '...' : 'MISSING');
    
    const token = authHeader?.split(' ')[1];
    console.log('🔐 Extracted token:', token ? `${token.substring(0, 30)}...` : 'MISSING');
    
    if (!token) {
      return res.status(401).json({ message: "❌ No token provided" });
    }
    
    // Check if token looks like a valid JWT (should have 3 parts separated by dots)
    const tokenParts = token.split('.');
    console.log('🔐 Token parts count:', tokenParts.length);
    if (tokenParts.length !== 3) {
      console.log('❌ Invalid JWT format - should have 3 parts separated by dots');
      return res.status(401).json({ message: "❌ Invalid token format" });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.userId || decoded.id } });
    
    if (!user) {
      return res.status(401).json({ message: "❌ Invalid token" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Authentication Error:", error);
    return res.status(401).json({ message: "❌ Authentication failed", error: error.message });
  }
};

module.exports = authenticate; 
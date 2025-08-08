const { DataSource } = require("typeorm");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "", // Fixed: changed from DB_PASSWORD to DB_PASS
  database: process.env.DB_NAME || "final_project",
  
  // Use mysql2 driver for better MySQL 8.0+ compatibility
  driver: require("mysql2"),
  
  // Performance optimizations
  synchronize: false, // Disable auto-sync in production
  logging: false, // Disable query logging for performance
  cache: {
    duration: 30000 // 30 seconds cache
  },
  
  // Connection pooling for better performance
  extra: {
    connectionLimit: 20,
    charset: 'utf8mb4'
  },
  
  // Entity loading optimization
  entities: [
    require("../models/User"),
    require("../models/File"),
    require("../models/Folder"),
    require("../models/Document"),
    require("../models/Team"),
    require("../models/TeamMember"),
    require("../models/Invitation"),
    require("../models/Notification"),
    require("../models/Task"),
    require("../models/Project"),
    require("../models/Event"),
    require("../models/Share"),
    require("../models/Message")
  ],
  
  // Migration settings
  migrations: [],
  subscribers: []
});

module.exports = { AppDataSource }; 
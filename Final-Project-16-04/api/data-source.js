require("dotenv").config(); 

const { DataSource } = require("typeorm");
const User = require("./src/entities/User");
const Document = require("./src/entities/Document");
const File = require("./src/entities/File");
const Folder = require("./src/entities/Folder");
const Team = require("./src/entities/Team");
const Invitation = require("./src/entities/Invitation");
const Message = require("./src/entities/Message");

const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "test_db",
  synchronize: false, // Disable auto-sync since we have existing data
  entities: [User, Document, File, Folder, Team, Invitation, Message],
  driver: require("mysql2"),
  extra: {
    connectionLimit: 10,
    allowPublicKeyRetrieval: true
  }
});

module.exports = AppDataSource;

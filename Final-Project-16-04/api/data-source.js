require("dotenv").config(); 

const { DataSource } = require("typeorm");

const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "test_db",
  synchronize: true, 
  entities: ["./src/entities/*.js"], 
});

module.exports = AppDataSource;
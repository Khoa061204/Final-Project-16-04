require("dotenv").config();
const mysql = require("mysql2/promise");

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "final_project_db"
  });

  try {
    // Check what tables exist
    const [tables] = await connection.execute("SHOW TABLES");
    console.log("📋 Tables in database:");
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

    // Check folders table structure if it exists
    const foldersExist = tables.some(table => Object.values(table)[0] === 'folders');
    if (foldersExist) {
      console.log("\n📁 Folders table structure:");
      const [columns] = await connection.execute("DESCRIBE folders");
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    } else {
      console.log("\n❌ Folders table does not exist!");
    }

    // Check files table structure
    const filesExist = tables.some(table => Object.values(table)[0] === 'files');
    if (filesExist) {
      console.log("\n📄 Files table structure:");
      const [columns] = await connection.execute("DESCRIBE files");
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    }

    // Check users table structure
    const usersExist = tables.some(table => Object.values(table)[0] === 'users');
    if (usersExist) {
      console.log("\n👤 Users table structure:");
      const [columns] = await connection.execute("DESCRIBE users");
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    }

  } catch (error) {
    console.error("❌ Database check error:", error);
  } finally {
    await connection.end();
  }
}

checkDatabase(); 
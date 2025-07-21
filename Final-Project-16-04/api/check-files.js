require("dotenv").config();
const mysql = require("mysql2/promise");

async function checkFilesTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "final_project_db"
  });

  try {
    console.log("📄 Files table structure:");
    const [columns] = await connection.execute("DESCRIBE files");
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });

    console.log("\n📁 Folders table structure:");
    const [folderColumns] = await connection.execute("DESCRIBE folders");
    folderColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });

  } catch (error) {
    console.error("❌ Database check error:", error);
  } finally {
    await connection.end();
  }
}

checkFilesTable(); 
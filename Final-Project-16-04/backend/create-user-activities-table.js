require("dotenv").config();
const mysql = require('mysql2/promise');

async function createUserActivitiesTable() {
  try {
    console.log('🔄 Creating user_activities table...');
    
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    // Create user_activities table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        activity_type VARCHAR(100) NOT NULL,
        activity_description TEXT NOT NULL,
        resource_type VARCHAR(50) NULL,
        resource_id INT NULL,
        metadata JSON NULL,
        created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
        INDEX idx_user_activities_user_id (user_id),
        INDEX idx_user_activities_created_at (created_at),
        INDEX idx_user_activities_type (activity_type),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableSQL);
    console.log('✅ user_activities table created successfully');

    // Check if table was created
    const [rows] = await connection.execute('SHOW TABLES LIKE "user_activities"');
    if (rows.length > 0) {
      console.log('✅ Table verification: user_activities table exists');
      
      // Show table structure
      const [structure] = await connection.execute('DESCRIBE user_activities');
      console.log('📋 Table structure:');
      structure.forEach(column => {
        console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
      });
    } else {
      console.log('❌ Table verification failed: user_activities table not found');
    }

    await connection.end();
    console.log('🎉 Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Error creating user_activities table:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  createUserActivitiesTable();
}

module.exports = createUserActivitiesTable;
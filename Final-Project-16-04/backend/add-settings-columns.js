const { AppDataSource } = require('./src/config/database');
require('dotenv').config();

async function addSettingsColumns() {
  console.log('🔧 Adding missing settings columns to users table...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Check if columns exist and add them if they don't
    const addColumnQueries = [
      // Add theme column
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'system'`,
      
      // Add emailNotifications column
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS emailNotifications TINYINT(1) DEFAULT 1`,
      
      // Add pushNotifications column  
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS pushNotifications TINYINT(1) DEFAULT 1`,
      
      // Add twoFactorEnabled column
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS twoFactorEnabled TINYINT(1) DEFAULT 0`,
      
      // Add last_login column if missing
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL`,
      
      // Add created_at and updated_at if missing (with different names to match model)
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
    ];

    console.log('📝 Executing column additions...');
    
    for (const query of addColumnQueries) {
      try {
        await AppDataSource.query(query);
        console.log('✅ Executed:', query.substring(0, 50) + '...');
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log('ℹ️  Column already exists:', query.substring(0, 50) + '...');
        } else {
          console.error('❌ Error executing query:', query);
          console.error('Error:', error.message);
        }
      }
    }

    // Verify the columns were added
    console.log('\n🔍 Verifying table structure...');
    const result = await AppDataSource.query('DESCRIBE users');
    
    console.log('\n📋 Current users table structure:');
    result.forEach(column => {
      const isNew = ['theme', 'emailNotifications', 'pushNotifications', 'twoFactorEnabled'].includes(column.Field);
      console.log(`${isNew ? '🆕' : '📄'} ${column.Field} - ${column.Type} ${column.Default ? `(default: ${column.Default})` : ''}`);
    });

    console.log('\n✅ Settings columns added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding settings columns:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('📦 Database connection closed');
    }
  }
}

// Run the migration
addSettingsColumns(); 
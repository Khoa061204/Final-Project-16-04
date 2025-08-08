const { AppDataSource } = require('./src/config/database');
require('dotenv').config();

async function verifyDatabaseSetup() {
  console.log('🔍 Verifying complete database setup...\n');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');
    console.log(`📋 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}\n`);

    // Check all required tables
    const requiredTables = [
      'users', 'teams', 'team_members', 'invitations', 
      'files', 'documents', 'folders', 'projects', 'tasks',
      'notifications', 'events', 'shares', 'messages'
    ];

    console.log('📋 Checking required tables:');
    const existingTables = [];
    
    for (const table of requiredTables) {
      try {
        await AppDataSource.query(`SELECT 1 FROM ${table} LIMIT 1`);
        console.log(`✅ ${table}`);
        existingTables.push(table);
      } catch (error) {
        console.log(`❌ ${table} - Missing`);
      }
    }

    // Check users table structure (most important for settings)
    console.log('\n🔍 Checking users table structure:');
    try {
      const userColumns = await AppDataSource.query('DESCRIBE users');
      const requiredUserColumns = [
        'id', 'username', 'email', 'password', 
        'theme', 'emailNotifications', 'pushNotifications', 'twoFactorEnabled',
        'avatar_url', 'last_login', 'created_at', 'updated_at'
      ];

      console.log('📋 Users table columns:');
      const existingColumns = userColumns.map(col => col.Field);
      
      for (const col of requiredUserColumns) {
        if (existingColumns.includes(col)) {
          console.log(`✅ ${col}`);
        } else {
          console.log(`❌ ${col} - Missing`);
        }
      }

    } catch (error) {
      console.log('❌ Could not check users table structure');
    }

    // Check shares table structure
    console.log('\n🔍 Checking shares table structure:');
    try {
      const shareColumns = await AppDataSource.query('DESCRIBE shares');
      console.log('📋 Shares table columns:');
      shareColumns.forEach(col => {
        console.log(`✅ ${col.Field} - ${col.Type}`);
      });
    } catch (error) {
      console.log('❌ Shares table missing or inaccessible');
    }

    // Test user count
    console.log('\n👥 User Statistics:');
    try {
      const userCount = await AppDataSource.query('SELECT COUNT(*) as count FROM users');
      console.log(`📊 Total users: ${userCount[0].count}`);
      
      if (userCount[0].count > 0) {
        const sampleUser = await AppDataSource.query('SELECT id, username, email, theme, twoFactorEnabled FROM users LIMIT 1');
        console.log('👤 Sample user:', sampleUser[0]);
      }
    } catch (error) {
      console.log('❌ Could not get user statistics');
    }

    console.log('\n🎯 SUMMARY:');
    console.log('===========');
    if (existingTables.length === requiredTables.length) {
      console.log('✅ All required tables exist');
    } else {
      console.log(`⚠️  Missing ${requiredTables.length - existingTables.length} tables`);
      console.log('💡 Run: node create-missing-tables.js');
    }

    console.log('\n🚀 Next Steps:');
    console.log('1. If tables are missing, run: node create-missing-tables.js');
    console.log('2. If user columns are missing, run: node add-settings-columns.js');
    console.log('3. Start backend: npm start');
    console.log('4. Create frontend/.env with: REACT_APP_API_URL=http://localhost:5000/api');
    console.log('5. Test sharing feature in browser');

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check if MySQL is running');
    console.log('2. Verify database credentials in .env');
    console.log('3. Make sure database "final_project" exists');
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n📦 Database connection closed');
    }
  }
}

verifyDatabaseSetup(); 
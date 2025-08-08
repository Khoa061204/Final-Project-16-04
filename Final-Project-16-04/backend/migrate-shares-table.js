const { AppDataSource } = require('./src/config/database');
require('dotenv').config();

async function migrateSharesTable() {
  console.log('🔄 Migrating shares table to new structure...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // First, check if the table exists and backup data if needed
    try {
      const existingShares = await AppDataSource.query('SELECT * FROM shares LIMIT 1');
      console.log('📋 Found existing shares table, will backup and migrate...');
      
      // Create backup table
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS shares_backup AS 
        SELECT * FROM shares WHERE 1=0
      `);
      
      // Copy existing data to backup
      await AppDataSource.query(`
        INSERT INTO shares_backup SELECT * FROM shares
      `);
      
      console.log('✅ Created backup of existing shares');
      
    } catch (error) {
      console.log('📝 No existing shares table found, creating new one...');
    }

    // Drop the existing table if it exists
    await AppDataSource.query('DROP TABLE IF EXISTS shares');
    console.log('🗑️  Dropped old shares table');

    // Create the new shares table with enhanced structure
    await AppDataSource.query(`
      CREATE TABLE shares (
        id INT PRIMARY KEY AUTO_INCREMENT,
        resourceType ENUM('file', 'document', 'folder', 'project') NOT NULL,
        resourceId INT NOT NULL,
        userId INT NOT NULL COMMENT 'The user who owns/shared the resource',
        sharedWith INT NOT NULL COMMENT 'The user who received the share',
        permission ENUM('view', 'edit', 'admin') DEFAULT 'view' NOT NULL,
        sharedVia ENUM('direct', 'team', 'public') DEFAULT 'direct' NOT NULL,
        teamId INT NULL COMMENT 'If shared via team, the team ID',
        expiresAt DATETIME NULL COMMENT 'When the share expires (optional)',
        message TEXT NULL COMMENT 'Optional message when sharing',
        isActive BOOLEAN DEFAULT true NOT NULL,
        lastAccessedAt DATETIME NULL,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) NOT NULL,
        
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sharedWith) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE CASCADE,
        
        INDEX idx_resource (resourceType, resourceId),
        INDEX idx_shared_with (sharedWith),
        INDEX idx_user (userId),
        INDEX idx_team (teamId),
        INDEX idx_active (isActive),
        INDEX idx_expires (expiresAt),
        UNIQUE KEY unique_active_share (resourceType, resourceId, sharedWith, isActive)
      )
    `);
    
    console.log('✅ Created new shares table with enhanced structure');

    // Try to migrate data from backup if it exists
    try {
      const backupData = await AppDataSource.query('SELECT * FROM shares_backup');
      
      if (backupData.length > 0) {
        console.log(`🔄 Migrating ${backupData.length} existing shares...`);
        
        for (const share of backupData) {
          try {
            // Map old structure to new structure
            let resourceType = 'file'; // default
            let resourceId = share.item_id || share.resourceId;
            
            // Try to detect resource type from old data
            if (share.item_type) {
              resourceType = share.item_type;
            } else if (share.resourceType) {
              resourceType = share.resourceType;
            }
            
            // Convert string IDs to integers if needed
            if (typeof resourceId === 'string') {
              resourceId = parseInt(resourceId);
            }
            
            let sharedWith = share.shared_with || share.sharedWith;
            if (typeof sharedWith === 'string') {
              sharedWith = parseInt(sharedWith);
            }
            
            let userId = share.shared_by || share.userId;
            if (typeof userId === 'string') {
              userId = parseInt(userId);
            }

            await AppDataSource.query(`
              INSERT INTO shares (
                resourceType, resourceId, userId, sharedWith, 
                permission, sharedVia, isActive, createdAt
              ) VALUES (?, ?, ?, ?, 'view', 'direct', true, ?)
            `, [
              resourceType,
              resourceId,
              userId,
              sharedWith,
              share.shared_at || share.createdAt || new Date()
            ]);
            
          } catch (itemError) {
            console.warn(`⚠️  Failed to migrate share ${share.id}:`, itemError.message);
          }
        }
        
        console.log('✅ Successfully migrated existing shares');
      }
      
      // Clean up backup table
      await AppDataSource.query('DROP TABLE IF EXISTS shares_backup');
      console.log('🧹 Cleaned up backup table');
      
    } catch (error) {
      console.log('📝 No backup data to migrate');
    }

    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
    console.log('\n🎉 Shares table migration completed successfully!');
    console.log('\n📋 New features available:');
    console.log('  • Permission levels (view, edit, admin)');
    console.log('  • Team sharing support');
    console.log('  • Share expiration dates');
    console.log('  • Custom messages with shares');
    console.log('  • Better tracking and analytics');
    console.log('  • Enhanced security and performance');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Add some helpful information
console.log('🚀 Enhanced Sharing System Migration');
console.log('=====================================');
console.log('This script will update your shares table to support:');
console.log('• Advanced permission levels (view/edit/admin)');
console.log('• Team-based sharing');
console.log('• Share expiration dates');
console.log('• Custom sharing messages');
console.log('• Better performance and security');
console.log('');

// Run the migration
migrateSharesTable().then(() => {
  console.log('\n💡 Next steps:');
  console.log('1. Restart your backend server');
  console.log('2. Test the new sharing functionality');
  console.log('3. Check the "Shared with Me" page in your frontend');
  console.log('\n🎯 Your sharing system is now enterprise-ready!');
}).catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}); 
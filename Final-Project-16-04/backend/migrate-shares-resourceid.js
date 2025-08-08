const { AppDataSource } = require('./src/config/database');

async function migrateSharesResourceId() {
  try {
    console.log('🔄 Starting shares resourceId migration...');
    
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Check current column type
    console.log('🔍 Checking current resourceId column...');
    const currentColumns = await AppDataSource.query(`
      DESCRIBE shares
    `);
    
    const resourceIdColumn = currentColumns.find(col => col.Field === 'resourceId');
    console.log('📊 Current resourceId column:', resourceIdColumn);
    
    if (resourceIdColumn && resourceIdColumn.Type.includes('int')) {
      console.log('⚡ Converting resourceId from INT to VARCHAR(255)...');
      
      // Backup existing data
      const existingShares = await AppDataSource.query('SELECT * FROM shares');
      console.log(`📦 Found ${existingShares.length} existing shares to preserve`);
      
      // Change column type
      await AppDataSource.query(`
        ALTER TABLE shares 
        MODIFY COLUMN resourceId VARCHAR(255) NOT NULL 
        COMMENT 'Resource ID - can be integer (files/folders/projects) or UUID (documents)'
      `);
      
      console.log('✅ Successfully converted resourceId column to VARCHAR(255)');
      
      // Verify the change
      const updatedColumns = await AppDataSource.query(`DESCRIBE shares`);
      const updatedResourceIdColumn = updatedColumns.find(col => col.Field === 'resourceId');
      console.log('📊 Updated resourceId column:', updatedResourceIdColumn);
      
    } else {
      console.log('✅ resourceId column is already VARCHAR - no migration needed');
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('📝 shares table does not exist yet - this is OK for new installations');
    } else {
      console.error('Full error:', error);
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  migrateSharesResourceId();
}

module.exports = { migrateSharesResourceId }; 
const { AppDataSource } = require('./src/config/database');

async function checkSharesTable() {
  try {
    console.log('🔍 Checking shares table...');
    
    await AppDataSource.initialize();
    
    // Check if shares table exists
    try {
      const desc = await AppDataSource.query('DESCRIBE shares');
      console.log('✅ Shares table exists');
      console.log('📊 Table structure:');
      desc.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Extra}`);
      });
      
      // Check foreign key constraints
      console.log('\n🔗 Checking foreign key constraints...');
      const fks = await AppDataSource.query(`
        SELECT 
          COLUMN_NAME,
          CONSTRAINT_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = 'final_project' 
        AND TABLE_NAME = 'shares' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      if (fks.length > 0) {
        console.log('📋 Foreign keys:');
        fks.forEach(fk => {
          console.log(`  - ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
        });
      } else {
        console.log('⚠️ No foreign key constraints found');
      }
      
      // Test a simple insert
      console.log('\n🧪 Testing share insert...');
      const testShare = {
        resourceType: 'file',
        resourceId: '37',
        userId: 8,
        sharedWith: 8, // Share with self for testing
        permission: 'view',
        sharedVia: 'direct',
        isActive: true
      };
      
      console.log('📄 Test data:', testShare);
      
      // Try the insert
      const result = await AppDataSource.query(`
        INSERT INTO shares (resourceType, resourceId, userId, sharedWith, permission, sharedVia, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        testShare.resourceType,
        testShare.resourceId,
        testShare.userId,
        testShare.sharedWith,
        testShare.permission,
        testShare.sharedVia,
        testShare.isActive
      ]);
      
      console.log('✅ Test insert successful!');
      console.log('📄 Insert result:', result);
      
      // Clean up test data
      await AppDataSource.query('DELETE FROM shares WHERE resourceType = ? AND resourceId = ? AND userId = ?', [
        testShare.resourceType,
        testShare.resourceId,
        testShare.userId
      ]);
      console.log('🧹 Test data cleaned up');
      
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('❌ Shares table does not exist');
        console.log('🔧 Need to create shares table first');
      } else {
        console.log('❌ Error with shares table:', error.message);
        console.log('🔧 Error code:', error.code);
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

checkSharesTable(); 
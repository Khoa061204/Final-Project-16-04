const { AppDataSource } = require('./src/config/database');

async function checkDocumentExists() {
  try {
    console.log('🔍 Checking if document exists...');
    
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const documentId = '63d88374-1033-471e-9ac3-cd2d543cef27';
    console.log(`📄 Looking for document ID: ${documentId}`);
    
    // Check if document exists
    const document = await AppDataSource.query(`
      SELECT id, title, userId, createdAt 
      FROM documents 
      WHERE id = ?
    `, [documentId]);
    
    if (document.length > 0) {
      console.log('✅ Document found:', document[0]);
    } else {
      console.log('❌ Document NOT found in database');
      
      // Let's see what documents do exist
      console.log('\n📋 All documents in database:');
      const allDocs = await AppDataSource.query(`
        SELECT id, title, userId, createdAt 
        FROM documents 
        ORDER BY createdAt DESC 
        LIMIT 10
      `);
      
      if (allDocs.length > 0) {
        allDocs.forEach((doc, index) => {
          console.log(`${index + 1}. ID: ${doc.id}, Title: "${doc.title}", User: ${doc.userId}`);
        });
      } else {
        console.log('📝 No documents found in database');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

checkDocumentExists(); 
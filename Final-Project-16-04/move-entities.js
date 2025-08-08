const fs = require('fs');
const path = require('path');

// List of entities to move
const entities = [
  'Document.js',
  'Folder.js', 
  'Team.js',
  'Invitation.js',
  'Message.js',
  'Project.js',
  'Task.js',
  'Event.js',
  'Share.js',
  'Notification.js',
  'TeamMember.js'
];

console.log('🔄 Moving entity files from api/src/entities to backend/src/models...');

entities.forEach(entity => {
  const sourcePath = path.join(__dirname, 'api', 'src', 'entities', entity);
  const targetPath = path.join(__dirname, 'backend', 'src', 'models', entity);
  
  if (fs.existsSync(sourcePath)) {
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(targetPath, content);
    console.log(`✅ Moved: ${entity}`);
  } else {
    console.log(`⚠️  Not found: ${entity}`);
  }
});

console.log('✅ Entity migration complete!'); 
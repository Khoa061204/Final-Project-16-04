const fs = require('fs');
const path = require('path');

console.log('🚀 CloudSync - Complete Migration Script\n');

// Function to copy directory recursively
function copyDirectory(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const items = fs.readdirSync(source);
  
  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// Function to copy file
function copyFile(source, target) {
  if (fs.existsSync(source)) {
    const content = fs.readFileSync(source, 'utf8');
    fs.writeFileSync(target, content);
    return true;
  }
  return false;
}

// 1. Move Entity Files
console.log('📁 Step 1: Moving entity files...');
const entities = [
  'Document.js', 'Folder.js', 'Team.js', 'Invitation.js', 'Message.js',
  'Project.js', 'Task.js', 'Event.js', 'Share.js', 'Notification.js', 'TeamMember.js'
];

entities.forEach(entity => {
  const sourcePath = path.join(__dirname, 'api', 'src', 'entities', entity);
  const targetPath = path.join(__dirname, 'backend', 'src', 'models', entity);
  
  if (copyFile(sourcePath, targetPath)) {
    console.log(`  ✅ Moved: ${entity}`);
  } else {
    console.log(`  ⚠️  Not found: ${entity}`);
  }
});

// 2. Move Frontend
console.log('\n🎨 Step 2: Moving frontend...');
const frontendSource = path.join(__dirname, 'front-end');
const frontendTarget = path.join(__dirname, 'frontend');

if (fs.existsSync(frontendSource)) {
  copyDirectory(frontendSource, frontendTarget);
  console.log('  ✅ Frontend moved successfully!');
} else {
  console.log('  ⚠️  front-end directory not found');
}

// 3. Move WebSocket Service
console.log('\n🔌 Step 3: Moving WebSocket service...');
const wsSource = path.join(__dirname, 'websocket-server');
const wsTarget = path.join(__dirname, 'websocket-service');

if (fs.existsSync(wsSource)) {
  copyDirectory(wsSource, wsTarget);
  console.log('  ✅ WebSocket service moved successfully!');
} else {
  console.log('  ⚠️  websocket-server directory not found');
}

// 4. Copy important files from api to backend
console.log('\n📋 Step 4: Copying important files...');

// Copy package.json if it doesn't exist
const apiPackage = path.join(__dirname, 'api', 'package.json');
const backendPackage = path.join(__dirname, 'backend', 'package.json');
if (fs.existsSync(apiPackage) && !fs.existsSync(backendPackage)) {
  copyFile(apiPackage, backendPackage);
  console.log('  ✅ Copied package.json');
}

// Copy package-lock.json if it doesn't exist
const apiPackageLock = path.join(__dirname, 'api', 'package-lock.json');
const backendPackageLock = path.join(__dirname, 'backend', 'package-lock.json');
if (fs.existsSync(apiPackageLock) && !fs.existsSync(backendPackageLock)) {
  copyFile(apiPackageLock, backendPackageLock);
  console.log('  ✅ Copied package-lock.json');
}

// Copy .env if it exists
const apiEnv = path.join(__dirname, 'api', '.env');
const backendEnv = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(apiEnv) && !fs.existsSync(backendEnv)) {
  copyFile(apiEnv, backendEnv);
  console.log('  ✅ Copied .env');
}

// 5. Update WebSocket service structure
console.log('\n🔧 Step 5: Updating WebSocket service structure...');
const wsServerFile = path.join(__dirname, 'websocket-service', 'server.js');
const wsServerNewFile = path.join(__dirname, 'websocket-service', 'src', 'server.js');

if (fs.existsSync(wsServerFile)) {
  // Create src directory
  const wsSrcDir = path.join(__dirname, 'websocket-service', 'src');
  if (!fs.existsSync(wsSrcDir)) {
    fs.mkdirSync(wsSrcDir, { recursive: true });
  }
  
  // Move server.js to src/
  copyFile(wsServerFile, wsServerNewFile);
  console.log('  ✅ Moved server.js to src/');
}

// 6. Create .gitignore files
console.log('\n🚫 Step 6: Creating .gitignore files...');

const backendGitignore = path.join(__dirname, 'backend', '.gitignore');
if (!fs.existsSync(backendGitignore)) {
  const gitignoreContent = `node_modules/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
coverage/
.DS_Store
*.log
`;
  fs.writeFileSync(backendGitignore, gitignoreContent);
  console.log('  ✅ Created backend/.gitignore');
}

const frontendGitignore = path.join(__dirname, 'frontend', '.gitignore');
if (!fs.existsSync(frontendGitignore)) {
  const gitignoreContent = `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
`;
  fs.writeFileSync(frontendGitignore, gitignoreContent);
  console.log('  ✅ Created frontend/.gitignore');
}

const wsGitignore = path.join(__dirname, 'websocket-service', '.gitignore');
if (!fs.existsSync(wsGitignore)) {
  const gitignoreContent = `node_modules/
.env
*.log
.DS_Store
`;
  fs.writeFileSync(wsGitignore, gitignoreContent);
  console.log('  ✅ Created websocket-service/.gitignore');
}

console.log('\n🎉 Migration completed successfully!');
console.log('\n📁 New structure:');
console.log('  ├── backend/          # Backend API server');
console.log('  ├── frontend/         # React frontend app');
console.log('  ├── websocket-service/ # WebSocket service');
console.log('  └── docs/             # Documentation');
console.log('\n🚀 Next steps:');
console.log('  1. Update import paths in backend files');
console.log('  2. Test the new structure');
console.log('  3. Remove old directories when ready'); 
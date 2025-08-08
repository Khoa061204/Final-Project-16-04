const fs = require('fs');
const path = require('path');

console.log('🔄 Moving frontend from front-end to frontend...');

// Create frontend directory if it doesn't exist
const frontendDir = path.join(__dirname, 'frontend');
if (!fs.existsSync(frontendDir)) {
  fs.mkdirSync(frontendDir, { recursive: true });
}

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

// Copy front-end to frontend
const sourceDir = path.join(__dirname, 'front-end');
const targetDir = path.join(__dirname, 'frontend');

if (fs.existsSync(sourceDir)) {
  copyDirectory(sourceDir, targetDir);
  console.log('✅ Frontend moved successfully!');
} else {
  console.log('⚠️  front-end directory not found');
}

console.log('✅ Frontend migration complete!'); 
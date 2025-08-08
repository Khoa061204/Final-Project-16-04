const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 CloudSync - Starting All Services...\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Service configurations
const services = [
  {
    name: 'Backend API',
    color: colors.blue,
    dir: 'backend',
    command: 'npm',
    args: ['run', 'dev'],
    port: 5000
  },
  {
    name: 'Frontend App',
    color: colors.green,
    dir: 'frontend',
    command: 'npm',
    args: ['start'],
    port: 3000
  },
  {
    name: 'WebSocket Service',
    color: colors.magenta,
    dir: 'websocket-server',
    command: 'npm',
    args: ['run', 'dev'],
    port: 1234
  }
];

// Store child processes
const processes = [];

// Function to check if directory exists
function checkDirectory(dir) {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    console.error(`${colors.red}❌ Directory not found: ${dir}${colors.reset}`);
    return false;
  }
  return true;
}

// Function to check if package.json exists
function checkPackageJson(dir) {
  const packagePath = path.join(__dirname, dir, 'package.json');
  if (!fs.existsSync(packagePath)) {
    console.error(`${colors.red}❌ package.json not found in: ${dir}${colors.reset}`);
    return false;
  }
  return true;
}

// Function to start a service
function startService(service) {
  const { name, color, dir, command, args, port } = service;
  
  console.log(`${color}🔧 Starting ${name}...${colors.reset}`);
  
  const childProcess = spawn(command, args, {
    cwd: path.join(__dirname, dir),
    stdio: 'pipe',
    shell: true
  });
  
  // Store process reference
  processes.push({
    name,
    process: childProcess,
    color
  });
  
  // Handle stdout
  childProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`${color}[${name}]${colors.reset} ${output}`);
    }
  });
  
  // Handle stderr
  childProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('Warning')) {
      console.log(`${color}[${name} ERROR]${colors.reset} ${output}`);
    }
  });
  
  // Handle process exit
  childProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`${color}[${name}]${colors.reset} ${colors.red}Process exited with code ${code}${colors.reset}`);
    }
  });
  
  // Handle process error
  childProcess.on('error', (error) => {
    console.log(`${color}[${name}]${colors.reset} ${colors.red}Error: ${error.message}${colors.reset}`);
  });
  
  return childProcess;
}

// Function to stop all processes
function stopAllProcesses() {
  console.log(`\n${colors.yellow}🛑 Stopping all services...${colors.reset}`);
  
  processes.forEach(({ name, process, color }) => {
    console.log(`${color}🛑 Stopping ${name}...${colors.reset}`);
    process.kill('SIGTERM');
  });
  
  // Force kill after 5 seconds if processes don't stop gracefully
  setTimeout(() => {
    processes.forEach(({ name, process, color }) => {
      if (!process.killed) {
        console.log(`${color}💀 Force killing ${name}...${colors.reset}`);
        process.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 5000);
}

// Main execution
async function main() {
  console.log(`${colors.cyan}📋 Checking service directories...${colors.reset}\n`);
  
  // Check all directories exist
  const allDirectoriesExist = services.every(service => {
    const exists = checkDirectory(service.dir);
    if (exists) {
      console.log(`${colors.green}✅ Found: ${service.dir}${colors.reset}`);
    }
    return exists;
  });
  
  if (!allDirectoriesExist) {
    console.log(`\n${colors.red}❌ Some service directories are missing. Please ensure all services are properly set up.${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`\n${colors.cyan}📦 Checking package.json files...${colors.reset}\n`);
  
  // Check all package.json files exist
  const allPackagesExist = services.every(service => {
    const exists = checkPackageJson(service.dir);
    if (exists) {
      console.log(`${colors.green}✅ Found package.json in: ${service.dir}${colors.reset}`);
    }
    return exists;
  });
  
  if (!allPackagesExist) {
    console.log(`\n${colors.red}❌ Some package.json files are missing. Please run 'npm install' in each service directory.${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`\n${colors.cyan}🚀 Starting all services...${colors.reset}\n`);
  
  // Start all services
  services.forEach(service => {
    startService(service);
  });
  
  // Wait a moment for services to start
  setTimeout(() => {
    console.log(`\n${colors.green}🎉 All services started!${colors.reset}`);
    console.log(`${colors.cyan}📱 Frontend: ${colors.reset}http://localhost:3000`);
    console.log(`${colors.cyan}🔗 Backend API: ${colors.reset}http://localhost:5000`);
    console.log(`${colors.cyan}🔌 WebSocket: ${colors.reset}ws://localhost:1234`);
    console.log(`\n${colors.yellow}💡 Press Ctrl+C to stop all services${colors.reset}\n`);
  }, 2000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⚠️  Received SIGINT (Ctrl+C)${colors.reset}`);
  stopAllProcesses();
});

process.on('SIGTERM', () => {
  console.log(`\n${colors.yellow}⚠️  Received SIGTERM${colors.reset}`);
  stopAllProcesses();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log(`${colors.red}❌ Uncaught Exception: ${error.message}${colors.reset}`);
  stopAllProcesses();
});

// Start the services
main().catch(error => {
  console.log(`${colors.red}❌ Failed to start services: ${error.message}${colors.reset}`);
  process.exit(1);
}); 
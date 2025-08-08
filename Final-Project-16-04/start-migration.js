#!/usr/bin/env node

/**
 * CloudSync Migration Startup Script
 * 
 * This script helps you start the migrated services with the new architecture.
 * Run this script to set up and start all services.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 CloudSync Migration Startup Script');
console.log('=====================================\n');

// Check if required directories exist
const requiredDirs = ['backend', 'frontend', 'websocket-service'];
const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));

if (missingDirs.length > 0) {
  console.error('❌ Missing required directories:', missingDirs.join(', '));
  console.error('Please ensure the migration has been completed first.');
  process.exit(1);
}

// Check if package.json files exist
const packageFiles = [
  'backend/package.json',
  'frontend/package.json',
  'websocket-service/package.json'
];

const missingPackages = packageFiles.filter(file => !fs.existsSync(file));

if (missingPackages.length > 0) {
  console.error('❌ Missing package.json files:', missingPackages.join(', '));
  console.error('Please run npm install in each directory first.');
  process.exit(1);
}

console.log('✅ All required directories and files found\n');

// Function to run a command
function runCommand(command, args, cwd, name) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Starting ${name}...`);
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: true
    });

    child.stdout.on('data', (data) => {
      console.log(`[${name}] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[${name}] ERROR: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${name} started successfully`);
        resolve();
      } else {
        console.error(`❌ ${name} failed to start (exit code: ${code})`);
        reject(new Error(`${name} failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ ${name} error:`, error.message);
      reject(error);
    });
  });
}

// Function to install dependencies
async function installDependencies() {
  console.log('📦 Installing dependencies...\n');
  
  try {
    // Install backend dependencies
    console.log('🔄 Installing backend dependencies...');
    await runCommand('npm', ['install'], 'backend', 'Backend Dependencies');
    
    // Install frontend dependencies
    console.log('🔄 Installing frontend dependencies...');
    await runCommand('npm', ['install'], 'frontend', 'Frontend Dependencies');
    
    // Install websocket service dependencies
    console.log('🔄 Installing WebSocket service dependencies...');
    await runCommand('npm', ['install'], 'websocket-service', 'WebSocket Dependencies');
    
    console.log('✅ All dependencies installed successfully\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Function to start services
async function startServices() {
  console.log('🚀 Starting services...\n');
  
  const services = [
    {
      name: 'Backend API',
      command: 'npm',
      args: ['run', 'dev'],
      cwd: 'backend'
    },
    {
      name: 'Frontend App',
      command: 'npm',
      args: ['start'],
      cwd: 'frontend'
    },
    {
      name: 'Y.js WebSocket Service',
      command: 'npm',
      args: ['start'],
      cwd: 'websocket-service'
    }
  ];

  const processes = [];

  for (const service of services) {
    try {
      const child = spawn(service.command, service.args, {
        cwd: service.cwd,
        stdio: 'pipe',
        shell: true
      });

      child.stdout.on('data', (data) => {
        console.log(`[${service.name}] ${data.toString().trim()}`);
      });

      child.stderr.on('data', (data) => {
        console.error(`[${service.name}] ERROR: ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        console.log(`[${service.name}] Process exited with code ${code}`);
      });

      processes.push(child);
      
      // Wait a bit between starting services
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to start ${service.name}:`, error.message);
    }
  }

  console.log('\n✅ All services started!');
  console.log('\n📋 Service URLs:');
  console.log('   Backend API: http://localhost:5000');
  console.log('   Frontend App: http://localhost:3000');
  console.log('   Y.js WebSocket: ws://localhost:1234');
  console.log('   Socket.IO: ws://localhost:5000 (integrated)');
  console.log('\n🔗 Health Checks:');
  console.log('   Backend: http://localhost:5000/health');
  console.log('   WebSocket: http://localhost:1234');
  console.log('\n💡 Press Ctrl+C to stop all services');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down services...');
    processes.forEach(child => child.kill('SIGINT'));
    process.exit(0);
  });
}

// Main execution
async function main() {
  try {
    // Check if dependencies need to be installed
    const args = process.argv.slice(2);
    if (args.includes('--install') || args.includes('-i')) {
      await installDependencies();
    }
    
    await startServices();
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { runCommand, installDependencies, startServices }; 
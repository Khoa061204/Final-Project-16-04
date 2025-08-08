#!/usr/bin/env node

/**
 * Start Y.js WebSocket Service
 * 
 * This script starts the Y.js WebSocket service for document collaboration.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Y.js WebSocket Service');
console.log('==================================\n');

// Check if websocket-service directory exists
if (!fs.existsSync('websocket-service')) {
  console.error('❌ websocket-service directory not found');
  console.error('Please ensure the migration has been completed first.');
  process.exit(1);
}

// Check if package.json exists
if (!fs.existsSync('websocket-service/package.json')) {
  console.error('❌ websocket-service/package.json not found');
  console.error('Please ensure the migration has been completed first.');
  process.exit(1);
}

console.log('✅ WebSocket service directory found\n');

// Function to install dependencies
async function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('📦 Installing WebSocket service dependencies...');
    
    const child = spawn('npm', ['install'], {
      cwd: 'websocket-service',
      stdio: 'pipe',
      shell: true
    });

    child.stdout.on('data', (data) => {
      console.log(`[npm install] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[npm install] ERROR: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ WebSocket dependencies installed successfully\n');
        resolve();
      } else {
        console.error(`❌ Failed to install dependencies (exit code: ${code})`);
        reject(new Error(`npm install failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error('❌ npm install error:', error.message);
      reject(error);
    });
  });
}

// Function to start the service
async function startService() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Starting Y.js WebSocket service...');
    
    const child = spawn('npm', ['start'], {
      cwd: 'websocket-service',
      stdio: 'pipe',
      shell: true
    });

    child.stdout.on('data', (data) => {
      console.log(`[WebSocket] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`[WebSocket] ERROR: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      console.log(`[WebSocket] Process exited with code ${code}`);
    });

    child.on('error', (error) => {
      console.error('❌ Failed to start WebSocket service:', error.message);
      reject(error);
    });

    // Wait a bit to see if the service starts successfully
    setTimeout(() => {
      console.log('\n✅ Y.js WebSocket service started successfully!');
      console.log('🔗 WebSocket URL: ws://localhost:1234');
      console.log('🌐 Health check: http://localhost:1234');
      console.log('\n💡 Press Ctrl+C to stop the service');
      resolve(child);
    }, 3000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down WebSocket service...');
      child.kill('SIGINT');
      process.exit(0);
    });
  });
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Check if dependencies need to be installed
    if (args.includes('--install') || args.includes('-i')) {
      await installDependencies();
    }
    
    await startService();
  } catch (error) {
    console.error('❌ Failed to start WebSocket service:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { installDependencies, startService }; 
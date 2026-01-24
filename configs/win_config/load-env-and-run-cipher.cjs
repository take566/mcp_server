#!/usr/bin/env node
/**
 * Node.js script to load .env file and run cipher MCP server
 * This script loads environment variables from .env file and passes them to cipher
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get workspace folder from environment or use script parent directory
const workspaceFolder = process.env.workspaceFolder || 
  path.resolve(__dirname, '../..');

// Path to .env file (in same directory as this script)
const envFile = path.join(__dirname, '.env');

// Load .env file
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const lines = envContent.split(/\r?\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Skip placeholder values
      if (value === 'your_anthropic_api_key_here' || value === 'your_openai_api_key_here') {
        console.error(`[CIPHER-WRAPPER] Warning: ${key} is set to placeholder value. Please update it in ${envFile}`);
        continue;
      }
      // Expand ${workspaceFolder} if present
      value = value.replace(/\$\{workspaceFolder\}/g, workspaceFolder);
      // Set environment variable for current process
      process.env[key] = value;
    }
  }
} else {
  console.error(`[CIPHER-WRAPPER] Warning: .env file not found at: ${envFile}`);
}

// Set CIPHER_WORKSPACE
process.env.CIPHER_WORKSPACE = path.join(workspaceFolder, '.cipher');

// Set default embedder if not set
if (!process.env.CIPHER_EMBEDDER) {
  process.env.CIPHER_EMBEDDER = 'local';
}

// Run cipher
const cipherArgs = ['-y', '@byterover/cipher', '--mode', 'mcp'];
const npxProcess = spawn('npx', cipherArgs, {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

npxProcess.on('error', (error) => {
  console.error('Failed to start cipher:', error);
  process.exit(1);
});

npxProcess.on('exit', (code) => {
  process.exit(code || 0);
});

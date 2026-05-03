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

// Run cipher.
// IMPORTANT: MCP stdio transport requires stdout to contain ONLY JSON-RPC frames.
// We therefore avoid `shell: true` and forward child stdout/stderr explicitly.
const npxCommand = 'npx';
const cipherArgs = ['--yes', '--quiet', '@byterover/cipher', '--mode', 'mcp'];
const childEnv = {
  ...process.env,
  npm_config_loglevel: process.env.npm_config_loglevel || 'silent',
  npm_config_update_notifier: 'false',
  npm_config_fund: 'false',
  npm_config_audit: 'false',
};

// shell: true is required on Windows (npx is a batch file).
// The stdout filter below ensures only valid MCP frames reach the parent.
const npxProcess = spawn(npxCommand, cipherArgs, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: childEnv,
  shell: true
});

process.stdin.on('data', (chunk) => {
  npxProcess.stdin.write(chunk);
});

process.stdin.on('end', () => {
  npxProcess.stdin.end();
});

process.stdin.on('error', () => {
  npxProcess.stdin.end();
});

let stdoutBuffer = Buffer.alloc(0);

/**
 * Forward only valid MCP stdio frames from child stdout.
 * Any non-framed output is moved to stderr so it won't break JSON parsing.
 */
npxProcess.stdout.on('data', (chunk) => {
  stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]);

  while (stdoutBuffer.length > 0) {
    // Drop any leading noise and align at the next possible header.
    const candidateIdx = stdoutBuffer.indexOf('Content-Length:');
    if (candidateIdx > 0) {
      process.stderr.write(stdoutBuffer.slice(0, candidateIdx));
      stdoutBuffer = stdoutBuffer.slice(candidateIdx);
    } else if (candidateIdx === -1) {
      process.stderr.write(stdoutBuffer);
      stdoutBuffer = Buffer.alloc(0);
      break;
    }

    const headerEndCRLF = stdoutBuffer.indexOf('\r\n\r\n');
    const headerEndLF = stdoutBuffer.indexOf('\n\n');
    let headerEnd = -1;
    let separatorLength = 0;
    if (headerEndCRLF !== -1 && (headerEndLF === -1 || headerEndCRLF < headerEndLF)) {
      headerEnd = headerEndCRLF;
      separatorLength = 4;
    } else if (headerEndLF !== -1) {
      headerEnd = headerEndLF;
      separatorLength = 2;
    } else {
      // Wait for complete header.
      break;
    }

    const headerText = stdoutBuffer.slice(0, headerEnd).toString('utf8');

    const match = headerText.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      process.stderr.write(Buffer.from(`[CIPHER-WRAPPER] Invalid MCP header from child: ${headerText}\n`));
      stdoutBuffer = stdoutBuffer.slice(headerEnd + separatorLength);
      continue;
    }

    const bodyLength = Number(match[1]);
    const frameLength = headerEnd + separatorLength + bodyLength;
    if (stdoutBuffer.length < frameLength) {
      // Wait for the rest of this frame.
      break;
    }

    // Forward one complete frame as-is.
    process.stdout.write(stdoutBuffer.slice(0, frameLength));
    stdoutBuffer = stdoutBuffer.slice(frameLength);
  }
});

npxProcess.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
});

npxProcess.on('error', (error) => {
  console.error('Failed to start cipher:', error);
  process.exit(1);
});

npxProcess.on('exit', (code) => {
  if (stdoutBuffer.length > 0) {
    process.stderr.write(stdoutBuffer);
  }
  process.exit(code || 0);
});

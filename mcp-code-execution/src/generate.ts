#!/usr/bin/env node
/**
 * CLI tool to generate TypeScript files from MCP server configurations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateAllServers, type ServerConfig } from './generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Expand environment variables in a string
 */
function expandEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  });
}

/**
 * Expand environment variables in an object recursively
 */
function expandEnvVarsInObject(obj: any): any {
  if (typeof obj === 'string') {
    return expandEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(expandEnvVarsInObject);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvVarsInObject(value);
    }
    return result;
  }
  return obj;
}

/**
 * Load server configurations from Claude Desktop config file
 */
async function loadConfigFromClaudeDesktop(
  configPath: string
): Promise<ServerConfig[]> {
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  const servers: ServerConfig[] = [];

  if (config.mcpServers) {
    for (const [name, serverConfig] of Object.entries(config.mcpServers as Record<string, any>)) {
      // Skip servers that use HTTP/SSE transport (url or port property)
      if (serverConfig.url || serverConfig.port) {
        console.log(`⚠️  Skipping server "${name}" (uses HTTP/SSE transport, not yet supported)`);
        continue;
      }

      // Skip servers that use cmd /c wrapper (Windows-specific, may cause issues)
      // These can be handled separately if needed
      if (serverConfig.command === 'cmd' && serverConfig.args?.[0] === '/c') {
        console.log(`⚠️  Skipping server "${name}" (uses cmd wrapper, may require special handling)`);
        continue;
      }

      // Skip if no command is specified
      if (!serverConfig.command) {
        console.log(`⚠️  Skipping server "${name}" (no command specified)`);
        continue;
      }

      // Expand environment variables
      const expandedConfig = expandEnvVarsInObject(serverConfig);

      servers.push({
        name: name.replace(/-/g, '_'), // Convert kebab-case to snake_case for file names
        command: expandedConfig.command,
        args: expandedConfig.args,
        env: expandedConfig.env,
        cwd: expandedConfig.cwd,
      });
    }
  }

  return servers;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const configPath =
    args[0] ||
    path.join(
      process.env.APPDATA || process.env.HOME || '.',
      'Claude',
      'claude_desktop_config.json'
    );
  const outputDir = args[1] || path.join(process.cwd(), 'servers');

  console.log(`Loading config from: ${configPath}`);
  console.log(`Output directory: ${outputDir}`);

  try {
    const servers = await loadConfigFromClaudeDesktop(configPath);
    console.log(`Found ${servers.length} MCP servers\n`);

    await generateAllServers(servers, outputDir);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

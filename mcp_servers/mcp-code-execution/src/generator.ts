/**
 * Tool Definition Generator
 * Generates TypeScript files from MCP server tool definitions
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MCPClient } from './client.js';

export interface ServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * Convert tool name to TypeScript function name
 */
function toFunctionName(toolName: string): string {
  // Convert snake_case or kebab-case to camelCase
  return toolName
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/**
 * Convert tool name to TypeScript interface name
 */
function toInterfaceName(toolName: string, suffix: string = 'Input'): string {
  const camelCase = toFunctionName(toolName);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1) + suffix;
}

/**
 * Generate TypeScript type from JSON schema
 */
function generateTypeFromSchema(schema: any, indent: string = ''): string {
  if (!schema || typeof schema !== 'object') {
    return 'any';
  }

  if (schema.type === 'string') {
    return 'string';
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return 'number';
  }
  if (schema.type === 'boolean') {
    return 'boolean';
  }
  if (schema.type === 'array') {
    const itemType = schema.items
      ? generateTypeFromSchema(schema.items, indent + '  ')
      : 'any';
    return `${itemType}[]`;
  }
  if (schema.type === 'object' || schema.properties) {
    const props = schema.properties || {};
    const required = schema.required || [];
    const lines: string[] = ['{'];

    for (const [key, value] of Object.entries(props)) {
      const propSchema = value as any;
      const isRequired = required.includes(key);
      const propType = generateTypeFromSchema(propSchema, indent + '  ');
      const optional = isRequired ? '' : '?';
      const description = propSchema.description
        ? ` // ${propSchema.description}`
        : '';
      lines.push(`${indent}  ${key}${optional}: ${propType};${description}`);
    }

    lines.push(`${indent}}`);
    return lines.join('\n');
  }

  return 'any';
}

/**
 * Generate TypeScript file for a single tool
 */
function generateToolFile(
  serverName: string,
  toolName: string,
  toolSchema: any
): string {
  const functionName = toFunctionName(toolName);
  const inputInterfaceName = toInterfaceName(toolName, 'Input');
  const responseInterfaceName = toInterfaceName(toolName, 'Response');

  const inputSchema = toolSchema.inputSchema || {};
  const inputType = generateTypeFromSchema(inputSchema);

  // Generate description comment
  const description = toolSchema.description
    ? `\n/* ${toolSchema.description} */\n`
    : '';

  // Generate the tool file content
  return `${description}import { callMCPTool } from "../client.js";

interface ${inputInterfaceName} ${typeof inputType === 'string' && inputType.startsWith('{') ? inputType : `= ${inputType}`}

interface ${responseInterfaceName} {
  [key: string]: any;
}

export async function ${functionName}(input: ${inputInterfaceName}): Promise<${responseInterfaceName}> {
  return callMCPTool<${responseInterfaceName}>('${serverName}', '${toolName}', input);
}
`;
}

/**
 * Generate index.ts file that exports all tools
 */
function generateIndexFile(toolNames: string[]): string {
  const exports = toolNames
    .map((name) => {
      const functionName = toFunctionName(name);
      return `export { ${functionName} } from './${name}.js';`;
    })
    .join('\n');

  return `${exports}\n`;
}

/**
 * Generate TypeScript files for all tools in an MCP server
 */
export async function generateServerFiles(
  serverConfig: ServerConfig,
  outputDir: string
): Promise<boolean> {
  const client = new MCPClient({
    command: serverConfig.command,
    args: serverConfig.args,
    env: serverConfig.env,
    cwd: serverConfig.cwd,
  });

  try {
    console.log(`Connecting to server: ${serverConfig.name}...`);
    await client.connect();
    
    console.log(`Listing tools for server: ${serverConfig.name}...`);
    const toolsResponse = await client.listTools();
    const tools = (toolsResponse as any).tools || [];

    if (tools.length === 0) {
      console.warn(`⚠️  No tools found for server: ${serverConfig.name}`);
      return false;
    }

    // Create server directory
    const serverDir = path.join(outputDir, serverConfig.name);
    await fs.mkdir(serverDir, { recursive: true });

    // Generate individual tool files
    const toolNames: string[] = [];
    for (const tool of tools) {
      const toolFileName = `${tool.name}.ts`;
      const toolFilePath = path.join(serverDir, toolFileName);
      const toolFileContent = generateToolFile(
        serverConfig.name,
        tool.name,
        tool
      );

      await fs.writeFile(toolFilePath, toolFileContent, 'utf-8');
      toolNames.push(tool.name);
      console.log(`  ✓ Generated: ${toolFileName}`);
    }

    // Generate index.ts
    const indexFilePath = path.join(serverDir, 'index.ts');
    const indexFileContent = generateIndexFile(toolNames);
    await fs.writeFile(indexFilePath, indexFileContent, 'utf-8');
    console.log(`  ✓ Generated: index.ts`);

    console.log(`✅ Generated ${toolNames.length} tools for server: ${serverConfig.name}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to generate files for server "${serverConfig.name}":`);
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      // Suppress detailed stack trace for common connection errors
      if (
        errorMsg.includes('connection closed') ||
        errorMsg.includes('unknown option') ||
        errorMsg.includes('aborted') ||
        errorMsg.includes('abort error')
      ) {
        console.error(`   Error: ${error.message}`);
        console.error(`   Note: This may be due to unsupported transport or server configuration`);
      } else {
        console.error(`   Error: ${error.message}`);
        // Only show stack trace for unexpected errors
        if (error.stack && process.env.DEBUG) {
          console.error(`   Stack: ${error.stack}`);
        }
      }
    } else {
      console.error(`   Error: ${String(error)}`);
    }
    console.log(`   Skipping server: ${serverConfig.name}\n`);
    return false;
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      // Ignore close errors
    }
  }
}

/**
 * Generate client.ts file that can be used by generated tool files
 */
async function generateClientFile(outputDir: string, clientSourcePath: string): Promise<void> {
  const clientFilePath = path.join(outputDir, 'client.ts');
  
  // Calculate relative path from outputDir to clientSourcePath
  // For now, we'll use a relative path that assumes the structure:
  // servers/client.ts -> ../dist/client.js (or similar)
  const relativePath = path.relative(outputDir, clientSourcePath).replace(/\\/g, '/');
  
  const clientFileContent = `/**
 * MCP Client wrapper for code execution
 * This file provides the callMCPTool function used by generated tool files
 * 
 * Note: Before using generated tools, you need to initialize MCP servers
 * by calling initializeMCPServers() with your server configurations.
 */

import { callMCPTool, mcpRegistry, type MCPClientConfig } from '${relativePath}';

// Re-export for use in generated files
export { callMCPTool, mcpRegistry };
export type { MCPClientConfig };

/**
 * Initialize MCP clients from server configurations
 * Call this before using any generated tools
 * 
 * @param servers - Record of server names to their MCP client configurations
 */
export async function initializeMCPServers(servers: Record<string, MCPClientConfig>): Promise<void> {
  for (const [name, config] of Object.entries(servers)) {
    mcpRegistry.register(name, config);
  }
}
`;
  
  await fs.writeFile(clientFilePath, clientFileContent, 'utf-8');
  console.log(`Generated: ${clientFilePath}`);
}

/**
 * Generate files for multiple servers
 */
export async function generateAllServers(
  serverConfigs: ServerConfig[],
  outputDir: string,
  clientSourcePath?: string
): Promise<void> {
  // Default to dist/client.js relative to the output directory
  // In a real deployment, this would be configurable
  if (!clientSourcePath) {
    // Assume outputDir is at project root, and dist is also at project root
    const projectRoot = path.resolve(outputDir, '..');
    clientSourcePath = path.join(projectRoot, 'dist', 'client.js');
  }
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  // Generate client.ts file in output directory
  await generateClientFile(outputDir, clientSourcePath);

  // Generate files for each server
  let successCount = 0;
  let failureCount = 0;
  
  for (const config of serverConfigs) {
    const success = await generateServerFiles(config, outputDir);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(`\n📊 Generation Summary:`);
  console.log(`   ✅ Successful: ${successCount} servers`);
  if (failureCount > 0) {
    console.log(`   ❌ Failed: ${failureCount} servers`);
  }
  console.log(`   📁 Output directory: ${outputDir}`);
}

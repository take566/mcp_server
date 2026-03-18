/**
 * MCP Client for calling MCP tools
 * This module provides a client interface to call MCP tools from code execution environments
 */

import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Response schemas for MCP client requests
const CallToolResponseSchema = z.object({
  content: z.array(z.union([
    z.object({
      type: z.literal('text'),
      text: z.string(),
    }),
    z.object({
      type: z.literal('image'),
      data: z.string(),
      mimeType: z.string(),
    }),
    z.object({
      type: z.literal('resource'),
      resource: z.object({
        uri: z.string(),
        text: z.string().optional(),
        mimeType: z.string().optional(),
      }),
    }),
  ])),
  isError: z.boolean().optional(),
});

const ListToolsResponseSchema = z.object({
  tools: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    inputSchema: z.record(z.any()),
  })),
});

export interface MCPClientConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * Manages connection to a single MCP server
 */
export class MCPClient {
  private client: Client;
  private transport: StdioClientTransport;
  private connected: boolean = false;

  constructor(private config: MCPClientConfig) {
    this.transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: config.env,
      cwd: config.cwd,
    });

    this.client = new Client(
      {
        name: 'mcp-code-execution-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    await this.client.connect(this.transport);
    this.connected = true;
  }

  /**
   * Call an MCP tool
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<CallToolResult> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const result = await this.client.request(
        {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        },
        CallToolResponseSchema
      );

      return result as CallToolResult;
    } catch (error) {
      throw new Error(`Failed to call tool "${toolName}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools() {
    if (!this.connected) {
      await this.connect();
    }

    const result = await this.client.request(
      {
        method: 'tools/list',
      },
      ListToolsResponseSchema
    );

    return result;
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (this.connected) {
      await this.transport.close();
      this.connected = false;
    }
  }
}

/**
 * Global registry of MCP clients
 */
class MCPClientRegistry {
  private clients: Map<string, MCPClient> = new Map();

  /**
   * Register an MCP server configuration
   */
  register(serverName: string, config: MCPClientConfig): void {
    this.clients.set(serverName, new MCPClient(config));
  }

  /**
   * Get a client for a specific server
   */
  getClient(serverName: string): MCPClient | undefined {
    return this.clients.get(serverName);
  }

  /**
   * Call a tool on a specific server
   */
  async callTool(serverName: string, toolName: string, args: Record<string, any>): Promise<CallToolResult> {
    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`MCP server "${serverName}" not found`);
    }
    return await client.callTool(toolName, args);
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.clients.values()).map((client) => client.close())
    );
  }
}

// Global registry instance
export const mcpRegistry = new MCPClientRegistry();

/**
 * Call an MCP tool - this is the main function that generated code will use
 */
export async function callMCPTool<T = any>(
  serverName: string,
  toolName: string,
  args: Record<string, any>
): Promise<T> {
  try {
    const result = await mcpRegistry.callTool(serverName, toolName, args);

    if (result.isError) {
      const errorText = result.content
        ?.map((c) => (c.type === 'text' ? c.text : ''))
        .join('\n') || 'Unknown error';
      throw new Error(`MCP tool error: ${errorText}`);
    }

    // Extract text content from result
    const textContent = result.content
      ?.map((c) => {
        if (c.type === 'text') {
          return c.text;
        }
        // Handle other content types (e.g., images, resources)
        return '';
      })
      .filter(Boolean)
      .join('\n') || '';

    // Try to parse as JSON, otherwise return as string
    if (textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
      try {
        return JSON.parse(textContent) as T;
      } catch {
        // If JSON parsing fails, return as string
        return textContent as T;
      }
    }

    return textContent as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unexpected error calling MCP tool: ${String(error)}`);
  }
}

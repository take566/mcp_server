/**
 * MCP Code Execution - Main entry point
 * 
 * This module provides utilities for using MCP servers as code APIs
 * instead of direct tool calls, enabling more efficient context usage.
 */

export { callMCPTool, mcpRegistry, MCPClient, type MCPClientConfig } from './client.js';
export { MCPClientError, type MCPClientErrorCode } from './errors.js';
export { generateServerFiles, generateAllServers, type ServerConfig } from './generator.js';

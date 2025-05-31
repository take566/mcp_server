# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a comprehensive collection of **Model Context Protocol (MCP) servers** and related tools. MCP enables AI assistants to interact with external services through a standardized interface. The repository contains multiple independent MCP server implementations organized in different directories.

## Key Components

- **`/Cline/MCP/`** - Collection of specialized MCP servers (Ollama, Kubernetes, Markdownify, Playwright automation, etc.)
- **`/playwright-mcp/`** - Advanced browser automation MCP server using accessibility-tree interactions
- **`/weather/`** - Weather data MCP server using National Weather Service API  
- **`/llm-script/`** - LLM API caching system with multiple backends

## Common Development Commands

### Standard MCP Server Pattern
```bash
# Development (TypeScript projects)
npm/pnpm/bun install     # Install dependencies
npm/pnpm/bun run build   # Compile TypeScript to dist/
npm/pnpm/bun run dev     # Development with watch mode
npm/pnpm/bun run test    # Run tests

# MCP Testing
npm run inspector        # Test with MCP Inspector tool
npx @modelcontextprotocol/inspector  # Alternative inspector
npx mcp-chat --server "./dist/index.js"  # Chat interface testing
```

### Python Projects (weather, llm-script)
```bash
uv sync                  # Install Python dependencies
python main.py           # Run the server
```

### Package Manager Preferences
- **pnpm** (Ollama, Markdownify)
- **bun** (Kubernetes development)
- **npm** (Playwright, other servers)

## Architecture Patterns

### MCP Server Structure
```
src/
├── index.ts          # Entry point with transport setup
├── server.ts         # Server configuration and tool handlers
├── tools/           # Individual tool implementations
└── types.ts         # Type definitions and schemas
```

### TypeScript Configuration Standard
- **Target**: ES2022
- **Module**: NodeNext/Node16
- **Output**: `dist/` directory
- **Strict mode** enabled

### MCP Server Implementation Pattern
All servers follow this basic structure:
```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Server setup with tool handlers
// Stdio transport for Claude Desktop integration
// Comprehensive error handling with MCP error codes
```

### Transport Patterns
- **Stdio Transport** - Primary method for Claude Desktop integration
- **SSE Transport** - Optional for web-based clients
- **Dual transport support** in advanced implementations

## Claude Desktop Integration

All MCP servers are designed for Claude Desktop integration using this configuration pattern:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "node", 
      "args": ["/path/to/dist/index.js"],
      "env": { "API_KEY": "${API_KEY}" }
    }
  }
}
```

Configuration examples are available in `/win_config/claude_desktop_config.json`.

## Development Environment

- **Node.js 18+** required for TypeScript projects
- **Python 3.11+** for Python-based servers
- **uv** for Python dependency management
- Local testing with MCP Inspector and mcp-chat tools
- Each server directory contains its own package.json with specific commands

## Testing Strategy

- **Vitest** for unit testing (Kubernetes server)
- **Playwright Test** for browser automation testing
- **MCP Inspector** for interactive server testing
- **mcp-chat CLI** for conversation-based testing

## Key Dependencies

- `@modelcontextprotocol/sdk` - Core MCP framework
- `@types/node` - Node.js TypeScript definitions
- `typescript` - TypeScript compiler
- Individual servers have specialized dependencies (Playwright, Kubernetes client, etc.)
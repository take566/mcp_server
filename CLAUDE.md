# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository manages a collection of Model Context Protocol (MCP) servers and development tools for AI integration. Each MCP server follows standardized patterns for building, testing, and integration with Claude Desktop.

## Directory Structure

- **`/mcp_servers/`** - MCP server implementations (TypeScript and Python)
- **`/tools/`** - Development utilities (VS Code extensions manager, LLM caching)
- **`/configs/`** - Configuration files for Claude Desktop and Codex CLI
- **`/docs/`** - Project documentation

## Byterover MCP Integration

[byterover-mcp]

### Byterover Workflows

There are two main workflows with Byterover tools that you **MUST** follow precisely:

#### Onboarding Workflow
If users ask to start the onboarding process:
1. **ALWAYS USE** `byterover-check-handbook-existence` first
2. Use `byterover-check-handbook-sync` if handbook exists
3. **IMMEDIATELY USE** `byterover-update-handbook` to update changes
4. Use `byterover-list-modules` **FIRST**, then store/update modules
5. Call `byterover-store-knowledge` to save new knowledge

#### Planning Workflow
For implementation planning:
1. Call `byterover-retrieve-active-plans` for continuing unfinished plans
2. **CRITICAL**: Once approved, **IMMEDIATELY CALL** `byterover-save-implementation-plan`
3. Run `byterover-retrieve-knowledge` several times for context
4. Use `byterover-update-plan-progress` to mark tasks completed
5. Call `byterover-store-knowledge` for important implementations
6. Frequently call `byterover-reflect-context` and `byterover-assess-context`

#### Important Rules
- **ALWAYS USE** `byterover-retrieve-knowledge` for **EACH TASK**
- **ALWAYS USE** `byterover-store-knowledge` for critical knowledge
- Include phrases like "According to Byterover memory layer"
- Use `byterover-update-module` **IMMEDIATELY** on module changes

## Common Development Commands

### TypeScript MCP Servers
```bash
# Install dependencies (check package.json for manager preference)
npm install              # Default for most servers
pnpm install            # For Ollama-mcp, markdownify-mcp
bun install             # For mcp-server-kubernetes development

# Build TypeScript
npm run build           # Compiles to dist/ (or lib/ for some)
npm run dev             # Watch mode for development

# Testing
npm run test            # Run tests if available
npm run lint            # ESLint for code quality
npm run inspector       # Test with MCP Inspector
npx @modelcontextprotocol/inspector  # Alternative inspector
npx mcp-chat --server "./dist/index.js"  # Interactive testing
```

### Python MCP Servers
```bash
# Python servers (weather, llm-script)
uv sync                 # Install dependencies via uv
python main.py          # Run the server
```

### Running Individual Servers
```bash
# TypeScript servers (after build)
node dist/index.js

# With environment variables
API_KEY="your-key" node dist/index.js
```

## Architecture Patterns

### MCP Server Structure

All MCP servers follow a consistent directory structure:

```
mcp-server-name/
├── src/                    # Source code
│   ├── index.ts           # Entry point with transport setup
│   ├── server.ts          # Server configuration & tool registration
│   ├── tools/             # Individual tool implementations
│   │   ├── tool1.ts       # Tool handler + schema
│   │   └── tool2.ts
│   └── types.ts           # TypeScript type definitions
├── dist/                  # Compiled output (gitignored)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Server documentation
```

### TypeScript Configuration

Common `tsconfig.json` patterns:

```json
{
  "compilerOptions": {
    "target": "ES2022",              // or "ESNext" for newer features
    "module": "NodeNext",            // or "CommonJS" for older patterns
    "moduleResolution": "NodeNext",  // Modern resolution
    "outDir": "dist",                // or "lib" for some servers
    "rootDir": "src",
    "strict": true,                  // Always enabled
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true              // Generate .d.ts files
  }
}
```

### MCP Server Implementation Pattern

Standard entry point structure (`src/index.ts`):

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'server-name',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {} // Enable tool support
  }
});

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [/* tool definitions */]
}));

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Claude Desktop Integration

Configure MCP servers in Claude Desktop's configuration file:

### Windows Configuration
Location: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["D:\\work\\mcp_server\\mcp_servers\\server-name\\dist\\index.js"],
      "env": { 
        "API_KEY": "${API_KEY}"  // Environment variable reference
      }
    }
  }
}
```

### Configuration Patterns
- **Standard Node.js**: Use `node` command with full path to `dist/index.js`
- **NPX execution**: Use `npx -y @package/name` for npm-published servers
- **Python servers**: Use `python` with path to `main.py`
- **Environment variables**: Use `${VAR_NAME}` syntax for secrets

Examples available in:
- `configs/win_config/claude_desktop_config.json` (Windows)
- `configs/mac/claude_desktop_config.json` (macOS)

## Available MCP Servers

### Browser Automation
- **playwright-mcp**: Full Playwright automation with accessibility tree
- **executeautomation-mcp-playwright**: Simplified Playwright execution
- **puppeteer-mcp**: Puppeteer-based browser control

### Cloud Services & APIs
- **gdrive-mcp**: Google Drive file operations
- **github-mcp**: GitHub repository management
- **google-analytics-mcp**: GA4 data analysis
- **notion-mcp-server**: Notion workspace integration
- **slack-mcp**: Slack messaging and workspace management

### System & Infrastructure
- **filesystem-mcp**: Local file system operations
- **mcp-server-kubernetes**: Kubernetes cluster management
- **Ollama-mcp**: Local LLM integration via Ollama

### Utilities
- **markdownify-mcp**: Convert various formats to Markdown
- **mcp-obsidian**: Obsidian vault integration
- **weather**: National Weather Service API integration

## Testing MCP Servers

### Interactive Testing
```bash
# MCP Inspector (recommended)
npm run inspector

# Alternative with global install
npx @modelcontextprotocol/inspector

# Chat-based testing
npx mcp-chat --server "./dist/index.js"
```

### Unit Testing
```bash
npm test                # Run test suite if available
npm run lint           # Code quality checks
```

## Adding New MCP Servers

1. Create directory under `mcp_servers/`
2. Follow standard structure (src/, package.json, tsconfig.json)
3. Implement MCP SDK patterns
4. Test with MCP Inspector
5. Add to Claude Desktop configuration

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase

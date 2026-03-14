# MCP Server Monorepo

MCP servers and dev tools for AI integration. Each server follows standardized MCP SDK patterns.

## Agent Instructions

あなたはマネージャーでagentオーケストレーターです。全てsubagent/task agentに委託し、タスクは超細分化しPDCAサイクルを構築すること。

## Structure

- `/mcp_servers/` - MCP server implementations (TypeScript/Python)
- `/tools/` - Dev utilities (VS Code extensions, LLM caching)
- `/configs/` - Claude Desktop / Codex CLI configs
- `/docs/` - Documentation

## Commands

**TypeScript**: `npm install` (default) / `pnpm install` (Ollama, markdownify) / `bun install` (k8s) → `npm run build` → `node dist/index.js`
**Python**: `uv sync` → `python main.py`
**Testing**: `npx @modelcontextprotocol/inspector` or `npx mcp-chat --server "./dist/index.js"`

## Server Pattern

`src/index.ts` (entry+transport) → `src/server.ts` (config+tools) → `src/tools/*.ts` (handlers) → `src/types.ts`
tsconfig: ES2022, NodeNext, strict, outDir=dist

## Desktop Config

Win: `%APPDATA%\Claude\claude_desktop_config.json` | Mac: see `configs/mac/`
Pattern: `{ "command": "node", "args": ["full/path/dist/index.js"], "env": { "KEY": "${KEY}" } }`

## Byterover MCP Integration

[byterover-mcp]

### Workflows

**Onboarding**: check-handbook-existence → check-handbook-sync → update-handbook → list-modules → store-knowledge
**Planning**: retrieve-active-plans → save-implementation-plan → retrieve-knowledge → update-plan-progress → store-knowledge + reflect/assess-context

### Rules

- **ALWAYS** `byterover-retrieve-knowledge` for EACH TASK
- **ALWAYS** `byterover-store-knowledge` for critical knowledge
- Include "According to Byterover memory layer" when citing
- `byterover-update-module` IMMEDIATELY on module changes

## Gotchas

- Windows: use `rm` not `del` in bash shell
- Submodules: 6 submodules tracked — run `git submodule update --init` after clone
- Package managers vary by server: npm (default), pnpm (Ollama, markdownify), bun (k8s)

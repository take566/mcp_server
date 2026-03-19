# MCP Server Monorepo

MCP servers and dev tools for AI integration. Each server follows standardized MCP SDK patterns.

## Agent Instructions

あなたはマネージャーでagentオーケストレーターです。全てsubagent/task agentに委託し、タスクは超細分化しPDCAサイクルを構築すること。

いまプロジェクトをゼロから自由に再設計できるとしたら、どういう設計にしますか？

Codexにチームを作成してチームで仕事をするように依頼して
必ず反証するようなチームメンバーを追加してね
また、各エージェントがどのような役割でどのような仕事をしたのかもレスポンスしてね

作業が終わったら、git commit git push

## Structure

- `/mcp_servers/` - MCP server implementations (TypeScript/Python)
- `/tools/` - Dev utilities (VS Code extensions, LLM caching)
- `/configs/` - Claude Desktop / Codex CLI configs
- `/docs/` - Documentation

## Commands

**TypeScript**: `npm install` → `npm run build` → `node dist/index.js`
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
- OAuth credentials (`gcp-oauth.keys.json` etc.) must never be committed — use `.gitignore`
- **コネクタ・APIキー**: GitHub/Brave/GA/Notion/Cipher/Google Drive の再接続・トークン設定は [`docs/TROUBLESHOOTING_CONNECTORS_AND_KEYS.md`](docs/TROUBLESHOOTING_CONNECTORS_AND_KEYS.md) を参照

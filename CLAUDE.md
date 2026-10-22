# MCP Server Monorepo
実装前に必ずplanモードで設計を出してから書け
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

## 行動原則

- **タスク着手前に必ず issue を立てる**: bug fix / feat / refactor / docs / chore 全種。タイトルは conventional commits 形式 (`fix(scope): ...`)。コミット末尾に `Closes #N` / `Refs #N`。master 直 push 禁止、PR 経由 squash merge 一本。issue → branch → commit → PR → CI → merge の全体フローと全 13 workflows は `rules/ci-cd.md`。
- **マネージャー兼オーケストレーター**として動き、実装は subagent / task agent に委譲。タスクは超細分化し **PDCA** で進行。チーム編成時は **必ず反証役（Critic）を含める**。各エージェントの役割・実施内容を最終出力で明示。詳細: `rules/agent-orchestration.md`。
- **セキュリティ不変条件を退行させない**: loopback-only / 非 root / `cap_drop:ALL` / `no-new-privileges` / seccomp / read-only rootfs / `sandbox:"all"` / シークレットは環境変数のみ（`op run --env-file=.env`）。詳細: `rules/security.md`。
- **Gateway は Docker 外**（loopback 必須）、`num_ctx` と `contextWindow` の乖離はモデルブロック（最低 16000）、`Modelfile` / `config/mcp/plugins.json` は生成物で手編集禁止。その他は `rules/gotchas.md`。
- Go 変更後は `make build` / `make lint` / `make test`、Ollama モデル変更後は Gateway 再起動、`.env` 実シークレットはコミット禁止。
- セルフ更新: スキル `claude-md-improver`（監査＋ diff 提案）/ コマンド `/revise-claude-md`（セッション学習抽出）。
- LLM 送信トークン圧縮には RTK (Rust Token Killer) 推奨。詳細は `.claude/rules/rtk.md`。

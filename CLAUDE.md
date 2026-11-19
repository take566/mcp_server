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

## 開発環境（npm workspaces）

- パッケージマネージャは **npm workspaces**。ルートの `package-lock.json` 1 つで管理する。pnpm / bun は使わない。
- コマンド（ルートで実行）:
  - `npm run typecheck` / `npm run lint` / `npm test` / `npm run format:check`
  - `npm run build:all`（全ワークスペースをビルド）
  - `npm run verify:mcp`（`.mcp.json` の起動先を検証）
- git 管理のワークスペースはルート `package.json` の `workspaces` が正（執筆時点で 8 つ）: `_template` / `arxiv-mcp` / `chrome-devtools-mcp` / `gdrive-mcp` / `mcp-code-execution` / `notion-mcp-server` / `openrouter-mcp` / `slack-mcp`（`mcp_servers/` 配下）。
- `.gitignore` 済みの upstream clone（執筆時点で 5 つ。`Ollama-mcp` / `claude-mem` / `markdownify-mcp` / `mcp-obsidian-src` / `mcp-server-kubernetes`）は別管理。workspaces には含まれず、typecheck / test / build:all の対象外。
- 新しい Windows マシンではまず `scripts/setup-mcp.ps1`（PowerShell 専用）を実行する（uv ベースの colab-mcp / serena を事前インストールし、MCP 接続の 30 秒タイムアウトを避ける。`uv` が PATH に必要）。
- 新規サーバーは `mcp_servers/_template`（`McpServer.registerTool` + zod）から始める。手順は `docs/adding-new-mcp-server.md`、registerTool 移行の互換性差異は `docs/MIGRATION_registerTool.md`。

## Desktop Config

Win: `%APPDATA%\Claude\claude_desktop_config.json` | Mac: see `configs/mac/`
Pattern: `{ "command": "node", "args": ["full/path/dist/index.js"], "env": { "KEY": "${KEY}" } }`

## Gotchas

- Windows: use `rm` not `del` in bash shell
- OAuth credentials (`gcp-oauth.keys.json` etc.) must never be committed — use `.gitignore`
- **コネクタ・APIキー**: GitHub/Brave/GA/Notion/Cipher/Google Drive の再接続・トークン設定は [`docs/TROUBLESHOOTING_CONNECTORS_AND_KEYS.md`](docs/TROUBLESHOOTING_CONNECTORS_AND_KEYS.md) を参照

## 行動原則

- **タスク着手前に必ず issue を立てる**: bug fix / feat / refactor / docs / chore 全種。タイトルは conventional commits 形式 (`fix(scope): ...`)。コミット末尾に `Closes #N` / `Refs #N`。master 直 push 禁止、PR 経由 squash merge 一本（issue → branch → commit → PR → CI → merge）。
- **マネージャー兼オーケストレーター**として動き、実装は subagent / task agent に委譲。タスクは超細分化し **PDCA** で進行。チーム編成時は **必ず反証役（Critic）を含める**。各エージェントの役割・実施内容を最終出力で明示。
- **セキュリティ不変条件を退行させない**: loopback-only / 非 root / `cap_drop:ALL` / `no-new-privileges` / seccomp / read-only rootfs / `sandbox:"all"` / シークレットは平文で置かず SOPS + age で暗号化し実行時に環境変数へ注入（`.env` 実シークレットはコミット禁止）。
- セルフ更新: スキル `claude-md-improver`（監査＋ diff 提案）/ コマンド `/revise-claude-md`（セッション学習抽出）。

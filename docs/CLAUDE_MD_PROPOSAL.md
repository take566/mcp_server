# CLAUDE.md への追記提案

ルート `CLAUDE.md` に追記する内容の提案。`CLAUDE.md` 本体は変更していない（オーナーがローカルで編集中のため）。下のコードブロックをそのままコピーして貼り付けられる。

コマンド名はルート `package.json` の scripts、ワークスペースは同 `workspaces` と `.gitignore`、setup スクリプトは `scripts/setup-mcp.ps1` で確認した。

````markdown
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
````

# MCP Server Collection

このリポジトリは、Model Context Protocol (MCP) サーバーのコレクションと関連ツールを管理しています。

##  ディレクトリ構造

```
mcp_server/
├── mcp_servers/          # MCPサーバーのコレクション
│   ├── executeautomation-mcp-playwright/  # Playwright自動化MCP
│   ├── filesystem-mcp/                   # ファイルシステムMCP
│   ├── filesystem-mcp-new/               # 新しいファイルシステムMCP
│   ├── gdrive-mcp/                       # Google Drive MCP
│   ├── github-mcp/                       # GitHub MCP
│   ├── google-analytics-mcp/             # Google Analytics MCP
│   ├── markdownify-mcp/                  # Markdown変換MCP
│   ├── mcp-obsidian/                     # Obsidian MCP
│   ├── mcp-server-kubernetes/            # Kubernetes MCP
│   ├── notion-mcp-server/                # Notion MCP
│   ├── Ollama-mcp/                       # Ollama MCP
│   ├── playwright-mcp/                   # Playwright MCP
│   ├── puppeteer-mcp/                    # Puppeteer MCP
│   ├── slack-mcp/                        # Slack MCP
│   └── weather/                          # 天気情報MCP
├── tools/                # 開発・管理ツール
│   ├── llm-script/                       # LLM関連スクリプト
│   ├── mcp-tool-utils.ts                 # MCP Tool Utilities (Tool Search & Programmatic Tool Use)
│   ├── vscode-extensions-manager.py      # VS Code拡張機能管理
│   └── *-extensions.*                    # 拡張機能管理スクリプト
├── configs/              # 設定ファイル
│   ├── config.toml                       # Codex CLI設定
│   ├── example_beta_features_config.json # ベータ機能設定例
│   ├── mac/                              # Mac用設定
│   └── win_config/                       # Windows用設定
├── examples/             # サンプルコード
│   └── tool-search-example.ts            # Tool Search使用例
├── docs/                 # ドキュメント
│   ├── AGENTS.md                         # エージェント情報
│   ├── CLAUDE.md                         # Claude設定
│   ├── TOOL_SEARCH_AND_PROGRAMMATIC_TOOL_USE.md  # Tool Search & Programmatic Tool Use
│   └── mem.md                            # メモ
└── README.md             # このファイル
```

##  利用可能なMCPサーバー

### 必須MCPサーバー（推奨）

以下のMCPサーバーは、開発ワークフローで特に重要です：

- **chrome-devtools**: Chrome DevTools Protocolを使用したブラウザ操作・デバッグ
- **claude-mem**: Claude Codeのセッション間でコンテキストを永続化
- **context7**: 最新のライブラリドキュメントとコード例を取得（Upstash）
- **figma-desktop**: Figmaデザインファイルからコンテキストを取得

詳細なセットアップ手順は `docs/MCP_SERVERS_SETUP.md` を参照してください。

### ブラウザ自動化
- **playwright-mcp**: Playwrightを使用したブラウザ自動化
- **executeautomation-mcp-playwright**: Playwright実行自動化
- **puppeteer-mcp**: Puppeteerを使用したブラウザ制御
- **chrome-devtools**: Chrome DevTools Protocolを使用したブラウザ操作・デバッグ

### クラウド・API
- **gdrive-mcp**: Google Drive連携
- **github-mcp**: GitHub連携
- **google-analytics-mcp**: Google Analytics連携
- **notion-mcp-server**: Notion連携
- **slack-mcp**: Slack連携
- **context7**: 最新のライブラリドキュメントとコード例を取得（Upstash）

### デザイン・UI
- **figma-desktop**: Figmaデザインファイルからコンテキストを取得

### システム・インフラ
- **filesystem-mcp**: ファイルシステム操作
- **mcp-server-kubernetes**: Kubernetes管理
- **Ollama-mcp**: Ollama LLM統合

### ユーティリティ
- **markdownify-mcp**: Markdown変換
- **mcp-obsidian**: Obsidian連携
- **weather**: 天気情報取得
- **claude-mem**: Claude Codeのセッション間でコンテキストを永続化

##  設定

### Codex CLI設定

`configs/config.toml` ファイルでMCPサーバーを設定できます：

```toml
[mcp_servers.chrome-devtools]
type = "stdio"
command = "npx"
args = ["chrome-devtools-mcp@latest"]
description = "Chrome DevTools MCP: run performance traces, inspect the DOM, and perform real-time debugging of your web pages — useful for browser automation, end-to-end testing, and capturing page artifacts."
```

### Claude Desktop設定

- Windows: `configs/win_config/claude_desktop_config.json`
- Mac: `configs/mac/claude_desktop_config.json`

### Tool Search & Programmatic Tool Use（ベータ機能）

Anthropicのベータ機能であるTool SearchとProgrammatic Tool Useをサポートしています：

- **Tool Search**: セッション開始時のトークン消費を85%削減
- **Programmatic Tool Use**: 複雑なマルチツールタスクで37%のトークン削減

設定例は `configs/example_beta_features_config.json` を参照してください。
詳細は `docs/TOOL_SEARCH_AND_PROGRAMMATIC_TOOL_USE.md` を参照してください。

##  ツール

### VS Code拡張機能管理

`tools/` ディレクトリには、VS Code拡張機能の管理ツールが含まれています：

- 拡張機能リストの出力・インポート
- クロスプラットフォーム対応（Windows/Mac/Linux）
- Python、PowerShell、シェルスクリプト対応

詳細は `tools/vscode-extensions-manager.py` を参照してください。

### LLMスクリプト

`tools/llm-script/` には、LLM関連のスクリプトとキャッシュ機能が含まれています。

### MCP Tool Utilities

`tools/mcp-tool-utils.ts` には、Tool SearchとProgrammatic Tool Useのベータ機能をサポートするユーティリティ関数が含まれています：

- `createDeferredTool()`: defer_loadingフラグを設定したツールを作成
- `createProgrammaticTool()`: Programmatic Tool Useをサポートするツールを作成
- `createAdvancedTool()`: 両方の機能をサポートするツールを作成

詳細は `docs/TOOL_SEARCH_AND_PROGRAMMATIC_TOOL_USE.md` を参照してください。

##  ドキュメント

`docs/` ディレクトリには、プロジェクトに関する詳細なドキュメントが含まれています。

### 主要ドキュメント

- **TOOL_SEARCH_AND_PROGRAMMATIC_TOOL_USE.md**: Tool SearchとProgrammatic Tool Useのベータ機能の使用方法
- **AGENTS.md**: エージェント情報
- **CLAUDE.md**: Claude設定
- **AI_CODING_ENVIRONMENT.md**: AIコーディング環境の構築手順

##  セットアップ

1. 必要なMCPサーバーを選択
2. 各サーバーのREADMEを参照してセットアップ
3. `.mcp.json` または `configs/config.toml` で設定を追加
4. Claude DesktopまたはCodex CLIで利用開始
5. **必須MCPサーバーのセットアップ**: `docs/MCP_SERVERS_SETUP.md` を参照
6. AIコーディング環境全体の構築手順は `docs/AI_CODING_ENVIRONMENT.md` を参照

### クイックスタート（必須MCPサーバー）

1. **Chrome DevTools MCP**
   - Chromeをリモートデバッグモードで起動（ポート9222）
   - `.mcp.json`に設定済み

2. **Claude Mem**
   - `mcp_servers/claude-mem`にクローン・ビルド済み
   - `.mcp.json`に設定済み

3. **Context7**
   - [context7.com/dashboard](https://context7.com/dashboard)でAPIキーを取得
   - `.mcp.json`の`context7.env.CONTEXT7_API_KEY`に設定

4. **Figma MCP**
   - FigmaデスクトップアプリでDev Modeを有効化
   - MCPサーバーを有効化（`http://127.0.0.1:3845/mcp`）
   - `.mcp.json`に設定済み

詳細は `docs/MCP_SERVERS_SETUP.md` を参照してください。

##  ライセンス

各MCPサーバーは個別のライセンスに従います。詳細は各サーバーのREADMEを参照してください。
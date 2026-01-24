# MCP Server Collection

このリポジトリは、Model Context Protocol (MCP) サーバーのコレクションと関連ツールを管理しています。

##  ディレクトリ構造

```
mcp_server/
├── mcp_servers/          # MCPサーバーのコレクション
│   ├── claude-mem/                       # Claude Memory（セッション永続化）
│   ├── filesystem-mcp/                   # ファイルシステムMCP
│   ├── gdrive-mcp/                       # Google Drive MCP
│   ├── markdownify-mcp/                  # Markdown変換MCP
│   ├── mcp-obsidian/                     # Obsidian MCP
│   ├── mcp-server-kubernetes/            # Kubernetes MCP
│   ├── notion-mcp-server/                # Notion MCP
│   ├── Ollama-mcp/                       # Ollama LLM統合
│   ├── puppeteer-mcp/                    # Puppeteerブラウザ制御
│   └── slack-mcp/                        # Slack MCP
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

- **claude-mem**: Claude Codeのセッション間でコンテキストを永続化
- **context7**: 最新のライブラリドキュメントとコード例を取得（Upstash）
- **serena**: セマンティックコーディングツール（シンボル検索・編集）
- **byterover**: 知識ベース管理（プロジェクト知識の保存・取得）

詳細なセットアップ手順は `docs/MCP_SERVERS_SETUP.md` を参照してください。

### システム・ファイル操作
- **filesystem-mcp**: ファイルシステム操作
- **mcp-obsidian**: Obsidian連携
- **markdownify-mcp**: Markdown変換

### ブラウザ自動化
- **puppeteer-mcp**: Puppeteerを使用したブラウザ制御

### クラウド・API連携
- **gdrive-mcp**: Google Drive連携
- **notion-mcp-server**: Notion連携
- **slack-mcp**: Slack連携

### インフラ・開発
- **mcp-server-kubernetes**: Kubernetes管理
- **Ollama-mcp**: Ollama LLM統合

##  設定

### Codex CLI設定

`configs/config.toml` ファイルでMCPサーバーを設定できます：

```toml
[mcp_servers.serena]
type = "stdio"
command = "uv"
args = ["run", "serena-mcp-server", "--port", "32123"]
description = "Serena MCP: Semantic coding tools for intelligent symbol search and editing"
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

1. **Claude Mem**
   - `mcp_servers/claude-mem`にクローン・ビルド済み
   - `configs/win_config/claude_desktop_config.json`に設定

2. **Context7**
   - [context7.com/dashboard](https://context7.com/dashboard)でAPIキーを取得
   - `.mcp.json`の`context7.env.CONTEXT7_API_KEY`に設定

3. **Serena**
   - セマンティックコーディングツール（シンボル検索・編集）
   - `configs/win_config/claude_desktop_config.json`に設定済み

4. **Byterover**
   - 知識ベース管理（プロジェクト知識の保存・取得）
   - `configs/win_config/claude_desktop_config.json`に設定済み

詳細は `docs/MCP_SERVERS_SETUP.md` を参照してください。

##  ライセンス

各MCPサーバーは個別のライセンスに従います。詳細は各サーバーのREADMEを参照してください。
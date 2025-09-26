# MCP Server Collection

このリポジトリは、Model Context Protocol (MCP) サーバーのコレクションと関連ツールを管理しています。

## 📁 ディレクトリ構造

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
│   ├── vscode-extensions-manager.py      # VS Code拡張機能管理
│   └── *-extensions.*                    # 拡張機能管理スクリプト
├── configs/              # 設定ファイル
│   ├── config.toml                       # Codex CLI設定
│   ├── mac/                              # Mac用設定
│   └── win_config/                       # Windows用設定
├── docs/                 # ドキュメント
│   ├── AGENTS.md                         # エージェント情報
│   ├── CLAUDE.md                         # Claude設定
│   └── mem.md                            # メモ
└── README.md             # このファイル
```

## 🚀 利用可能なMCPサーバー

### ブラウザ自動化
- **playwright-mcp**: Playwrightを使用したブラウザ自動化
- **executeautomation-mcp-playwright**: Playwright実行自動化
- **puppeteer-mcp**: Puppeteerを使用したブラウザ制御

### クラウド・API
- **gdrive-mcp**: Google Drive連携
- **github-mcp**: GitHub連携
- **google-analytics-mcp**: Google Analytics連携
- **notion-mcp-server**: Notion連携
- **slack-mcp**: Slack連携

### システム・インフラ
- **filesystem-mcp**: ファイルシステム操作
- **mcp-server-kubernetes**: Kubernetes管理
- **Ollama-mcp**: Ollama LLM統合

### ユーティリティ
- **markdownify-mcp**: Markdown変換
- **mcp-obsidian**: Obsidian連携
- **weather**: 天気情報取得

## ⚙️ 設定

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

## 🛠️ ツール

### VS Code拡張機能管理

`tools/` ディレクトリには、VS Code拡張機能の管理ツールが含まれています：

- 拡張機能リストの出力・インポート
- クロスプラットフォーム対応（Windows/Mac/Linux）
- Python、PowerShell、シェルスクリプト対応

詳細は `tools/vscode-extensions-manager.py` を参照してください。

### LLMスクリプト

`tools/llm-script/` には、LLM関連のスクリプトとキャッシュ機能が含まれています。

## 📚 ドキュメント

`docs/` ディレクトリには、プロジェクトに関する詳細なドキュメントが含まれています。

## 🔧 セットアップ

1. 必要なMCPサーバーを選択
2. 各サーバーのREADMEを参照してセットアップ
3. `configs/config.toml` で設定を追加
4. Claude DesktopまたはCodex CLIで利用開始

## 📝 ライセンス

各MCPサーバーは個別のライセンスに従います。詳細は各サーバーのREADMEを参照してください。
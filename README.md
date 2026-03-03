# MCP Server Monorepo

Model Context Protocol (MCP) サーバーと開発ツールを管理するモノレポ。各サーバーは MCP SDK の標準パターンに準拠し、Claude Desktop や Codex CLI から利用できる。

## サーバー一覧

| サーバー | 説明 | 言語 | パッケージマネージャー | ステータス |
|----------|------|------|----------------------|-----------|
| [claude-mem](mcp_servers/claude-mem/) | セッション間のメモリ圧縮・永続化 | TypeScript | npm | Active |
| [gdrive-mcp](mcp_servers/gdrive-mcp/) | Google Drive ファイル操作 | TypeScript | npm | Active |
| [markdownify-mcp](mcp_servers/markdownify-mcp/) | ファイル→Markdown 変換 | TypeScript + Python | pnpm + uv | Active |
| [mcp-obsidian-src](mcp_servers/mcp-obsidian-src/) | Obsidian ノート検索 | TypeScript | npm | Active |
| [mcp-server-kubernetes](mcp_servers/mcp-server-kubernetes/) | Kubernetes クラスタ管理 | TypeScript | bun | Active |
| [Ollama-mcp](mcp_servers/Ollama-mcp/) | ローカル LLM ブリッジ (Ollama) | TypeScript | pnpm | Active |
| [notion-mcp-server](mcp_servers/notion-mcp-server/) | Notion 連携 | - | - | wrappers/ に移行予定 |
| [slack-mcp](mcp_servers/slack-mcp/) | Slack 連携 | - | - | wrappers/ に移行予定 |

設定ファイルベースのラッパー（Notion、Slack）は [`wrappers/`](wrappers/) を参照。

## クイックスタート

### 新規サーバーの作成

```bash
# 1. テンプレートをコピー
cp -r mcp_servers/_template mcp_servers/my-server

# 2. package.json の name と description を編集
cd mcp_servers/my-server

# 3. 依存関係のインストールとビルド
npm install
npm run build

# 4. MCP Inspector で動作確認
npm run inspect
```

テンプレートのファイル構成とツール追加手順は [`mcp_servers/_template/README.md`](mcp_servers/_template/README.md) を参照。

### 既存サーバーの利用

```bash
cd mcp_servers/<server-name>
npm install    # npm の場合（pnpm / bun はサーバーごとに異なる）
npm run build
```

## ビルド

### 個別ビルド

```bash
cd mcp_servers/<server-name>
npm install && npm run build
```

パッケージマネージャーはサーバーごとに異なる（上記一覧テーブル参照）。

### 全体ビルド

```bash
npm run build:all
```

`scripts/build-all.mjs` が各サーバーのパッケージマネージャーを自動検出し、並列でビルドする。

### MCP SDK バージョン統一

```bash
npm run sync-sdk
```

`scripts/sync-sdk.mjs` が全サーバーの `@modelcontextprotocol/sdk` バージョンを最新に揃える。

## テスト・デバッグ

```bash
# MCP Inspector（任意のサーバー）
npx @modelcontextprotocol/inspector node mcp_servers/<server-name>/dist/index.js

# ルート package.json のショートカット
npm run inspector:claude-mem
npm run inspector:kubernetes
```

## Claude Desktop 設定

### 設定ファイルの場所

| OS | パス |
|----|------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |

### 設定例

```json
{
  "mcpServers": {
    "claude-mem": {
      "command": "node",
      "args": ["D:/work/mcp_server/mcp_servers/claude-mem/dist/index.js"],
      "env": {}
    },
    "ollama": {
      "command": "node",
      "args": ["D:/work/mcp_server/mcp_servers/Ollama-mcp/dist/index.js"],
      "env": {
        "OLLAMA_HOST": "http://localhost:11434"
      }
    }
  }
}
```

プラットフォーム別の完全な設定例:
- Windows: [`configs/win_config/`](configs/win_config/)
- macOS: [`configs/mac/`](configs/mac/)

## プロジェクト構造

```
mcp_server/
├── mcp_servers/           # MCP サーバー実装
│   ├── _template/         # 新規サーバーテンプレート
│   ├── claude-mem/        # メモリ圧縮・永続化 (TS, npm)
│   ├── gdrive-mcp/        # Google Drive 操作 (TS, npm)
│   ├── markdownify-mcp/   # Markdown 変換 (TS+Python, pnpm+uv)
│   ├── mcp-obsidian-src/  # Obsidian ノート検索 (TS, npm)
│   ├── mcp-server-kubernetes/ # Kubernetes 管理 (TS, bun)
│   └── Ollama-mcp/        # ローカル LLM ブリッジ (TS, pnpm)
├── wrappers/              # 設定ファイルベースのラッパー
│   ├── notion.json
│   ├── slack.json
│   └── README.md
├── tools/                 # 開発ユーティリティ
│   └── llm-script/        # LLM キャッシュ (Python, uv)
├── configs/               # 共有設定
│   ├── tsconfig.base.json # TypeScript 共通設定
│   ├── mac/               # macOS Claude Desktop 設定
│   └── win_config/        # Windows Claude Desktop 設定
├── scripts/               # ビルド・ユーティリティ
│   ├── build-all.mjs      # 全サーバー並列ビルド
│   └── sync-sdk.mjs       # MCP SDK バージョン統一
├── docs/                  # ドキュメント
│   ├── index.md           # ドキュメント目次
│   ├── ci-cd/             # CI/CD 関連
│   └── ...
├── .github/workflows/     # CI/CD
│   └── ci.yml             # 統合 CI ワークフロー
└── package.json           # ルート設定
```

### サーバー共通パターン

TypeScript サーバーは以下のファイル構成に準拠する:

```
src/
  index.ts       # エントリポイント (stdio transport)
  server.ts      # サーバー設定・ツール登録
  tools/         # ツールハンドラー
  types.ts       # 型定義
```

tsconfig 共通設定: `configs/tsconfig.base.json` (ES2022, NodeNext, strict)

## 開発ガイド

詳細なドキュメントは [`docs/index.md`](docs/index.md) を参照。

| ドキュメント | 内容 |
|-------------|------|
| [adding-new-mcp-server.md](docs/adding-new-mcp-server.md) | 新規サーバー追加の手順 |
| [MCP_SERVERS_SETUP.md](docs/MCP_SERVERS_SETUP.md) | 各サーバーのセットアップ |
| [MCP_INSPECTOR.md](docs/MCP_INSPECTOR.md) | MCP Inspector によるデバッグ |
| [MCP_ERROR_FIXES.md](docs/MCP_ERROR_FIXES.md) | よくあるエラーと対処法 |
| [ci-cd/quick-start.md](docs/ci-cd/quick-start.md) | CI/CD の概要 |

## ライセンス

MIT (ルートリポジトリ)。各サーバーは個別のライセンスに従う場合がある。詳細は各サーバーの README を参照。

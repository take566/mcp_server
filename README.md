# MCP Server Monorepo

Model Context Protocol (MCP) サーバーと開発ツールを管理するモノレポ。各サーバーは MCP SDK の標準パターンに準拠し、Claude Desktop、Cursor（`.mcp.json`）、Codex CLI などから利用できる。

## サーバー一覧

| サーバー | 説明 | 言語 | パッケージマネージャー | ステータス |
|----------|------|------|----------------------|-----------|
| [gdrive-mcp](mcp_servers/gdrive-mcp/) | Google Drive 検索・リソース読み取り | TypeScript | npm | Active |
| [mcp-code-execution](mcp_servers/mcp-code-execution/) | MCP ツールを TypeScript API 化（コード実行エージェント向け） | TypeScript | npm | Active |
| [notion-mcp-server](mcp_servers/notion-mcp-server/) | Notion（公式 `@notionhq/notion-mcp-server` の薄いラッパー） | — | npm | 互換維持のみ。設定は [`wrappers/notion.json`](wrappers/notion.json) を推奨 |
| [slack-mcp](mcp_servers/slack-mcp/) | Slack（`@modelcontextprotocol/server-slack`） | — | npm | 互換維持のみ・[upstream 非推奨](mcp_servers/slack-mcp/README.md)。[`wrappers/slack.json`](wrappers/slack.json) を参照 |

Notion / Slack の推奨構成は設定ファイルベースの [`wrappers/`](wrappers/)（`npx -y …` で起動）を参照。

## 管理対象の範囲

ルート `package.json` の npm workspaces（git 管理対象）は `_template` / `arxiv-mcp` / `chrome-devtools-mcp` / `gdrive-mcp` / `mcp-code-execution` / `notion-mcp-server` / `openrouter-mcp` / `slack-mcp` の 8 つ。`Ollama-mcp` / `claude-mem` / `markdownify-mcp` / `mcp-obsidian-src` / `mcp-server-kubernetes` は gitignore された upstream の clone で、別途管理する（workspaces・ルート lockfile の対象外）。

## クイックスタート

### 新規サーバーの作成

```bash
# 1. テンプレートをコピー
cp -r mcp_servers/_template mcp_servers/my-server

# 2. package.json の name と description を編集し、ルート package.json の workspaces に追加

# 3. 依存関係のインストールとビルド（ルートで実行）
npm install
npm run build --workspace mcp_servers/my-server

# 4. MCP Inspector で動作確認
npx -y @modelcontextprotocol/inspector node dist/index.js
```

テンプレートのファイル構成とツール追加手順は [`mcp_servers/_template/README.md`](mcp_servers/_template/README.md) を参照。

### 既存サーバーの利用

```bash
# ルートの npm workspaces で一括管理（lockfile はルートの package-lock.json のみ）
npm ci
npm run build --workspace mcp_servers/<server-name>
```

## ビルド

### 個別ビルド

```bash
npm ci   # ルートで 1 回
npm run build --workspace mcp_servers/<server-name>
```

`package.json` に `build` スクリプトがないディレクトリ（薄いラッパーなど）は `build:all` の対象外になる。

### 全体ビルド

```bash
npm run build:all
```

`scripts/build-all.mjs` がルート `package.json` の workspaces のうち `build` スクリプトを持つものを npm で並列ビルドする（git 管理外の vendored clone は対象外）。特定ディレクトリのみ: `node scripts/build-all.mjs --filter gdrive`。

### MCP SDK バージョン統一

```bash
npm run sync-sdk
```

`scripts/sync-sdk.mjs` が各 workspace の `@modelcontextprotocol/sdk` とルート `overrides` のバージョンを揃える。実行後にルートで `npm install` して `package-lock.json` を更新する。

### 品質チェック

```bash
npm run typecheck      # 各 workspace で tsc --noEmit
npm run lint           # Biome lint（scripts/ tests/ と各 workspace の src/）
npm run format:check   # Biome format（scripts/ tests/ とルート設定のみ。サーバーの src/ は対象外）
npm test               # vitest（tests/ と各 workspace の src/**/*.test.ts）
```

## テスト・デバッグ

```bash
# MCP Inspector（ビルド済みのエントリを指定）
npx -y @modelcontextprotocol/inspector node mcp_servers/gdrive-mcp/dist/index.js
npx -y @modelcontextprotocol/inspector node mcp_servers/mcp-code-execution/dist/index.js

# Inspector 本体のみ起動（接続先は UI から指定）
npm run inspector
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
    "gdrive": {
      "command": "node",
      "args": ["/absolute/path/to/mcp_server/mcp_servers/gdrive-mcp/dist/index.js"],
      "env": {
        "GDRIVE_CREDENTIALS_PATH": "/path/to/.gdrive-server-credentials.json"
      }
    }
  }
}
```

`args` と `env` はローカルパス・認証方式に合わせて変更すること。プラットフォーム別のサンプル:

- Windows: [`configs/win_config/`](configs/win_config/)
- macOS: [`configs/mac/claude_desktop_config.json`](configs/mac/claude_desktop_config.json)

## プロジェクト構造

```
mcp_server/
├── mcp_servers/              # MCP サーバー実装
│   ├── _template/            # 新規サーバーテンプレート
│   ├── gdrive-mcp/           # Google Drive (TS)
│   ├── mcp-code-execution/   # コード実行用 TS 生成 (TS)
│   ├── notion-mcp-server/    # Notion 薄ラッパー（互換）
│   └── slack-mcp/            # Slack 薄ラッパー（互換・注意事項あり）
├── wrappers/                 # 公式パッケージ向け JSON 設定（Notion / Slack 等）
├── tools/                    # 開発ユーティリティ
│   ├── agent-browser/        # エージェント用ブラウザ連携 (Python, uv)
│   └── ...
├── configs/                  # 共有設定・Claude Desktop 例
│   ├── tsconfig.base.json    # 互換 shim（ルートの tsconfig.base.json を extends）
│   ├── mac/
│   └── win_config/
├── scripts/                  # build-all, sync-sdk 等
├── docs/                     # ドキュメント
├── .github/workflows/        # CI
├── tsconfig.base.json        # 共通 tsconfig（各サーバーが extends）
├── biome.json                # lint / format 設定
├── vitest.config.mjs         # テスト設定
└── package.json              # ルート（npm workspaces / build:all / typecheck / lint / test）
```

### サーバー共通パターン（TypeScript カスタム実装）

```
src/
  index.ts       # エントリ（stdio transport）
  server.ts      # サーバー設定・ツール登録
  tools/         # ツールハンドラー
  types.ts       # 型定義
```

共通 tsconfig: ルートの `tsconfig.base.json`（ES2023, NodeNext, strict）

## 開発ガイド

詳細は [`docs/index.md`](docs/index.md) を参照。

| ドキュメント | 内容 |
|-------------|------|
| [adding-new-mcp-server.md](docs/adding-new-mcp-server.md) | 新規サーバー追加の手順 |
| [MCP_SERVERS_SETUP.md](docs/MCP_SERVERS_SETUP.md) | 各種 MCP のセットアップ |
| [MCP_INSPECTOR.md](docs/MCP_INSPECTOR.md) | MCP Inspector によるデバッグ |
| [TROUBLESHOOTING_CONNECTORS_AND_KEYS.md](docs/TROUBLESHOOTING_CONNECTORS_AND_KEYS.md) | コネクタ・API キー・再接続 |
| [MCP_ERROR_FIXES.md](docs/MCP_ERROR_FIXES.md) | よくあるエラーと対処法 |
| [AI_CODING_ENVIRONMENT.md](docs/AI_CODING_ENVIRONMENT.md) | AI コーディング環境の整備 |
| [ci-cd/quick-start.md](docs/ci-cd/quick-start.md) | CI/CD の概要 |

## ライセンス

MIT（ルートリポジトリ）。各サーバーは個別のライセンスに従う場合がある。詳細は各ディレクトリの README を参照。

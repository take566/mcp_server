# 実装詳細

このドキュメントでは、Anthropicの記事「Code execution with MCP: Building more efficient agents」の実装について説明します。

## アーキテクチャ

### 1. MCPクライアント (`src/client.ts`)

MCPサーバーへの接続とツール呼び出しを管理するクライアントライブラリです。

#### 主要コンポーネント

- **MCPClient**: 単一のMCPサーバーへの接続を管理
  - `connect()`: MCPサーバーに接続
  - `callTool()`: ツールを呼び出す
  - `listTools()`: 利用可能なツール一覧を取得

- **MCPClientRegistry**: 複数のMCPサーバーを管理するグローバルレジストリ
  - `register()`: サーバー設定を登録
  - `callTool()`: 特定のサーバーのツールを呼び出す

- **callMCPTool()**: 生成されたコードから使用されるメイン関数
  - サーバー名、ツール名、引数を受け取る
  - 結果をパースして返す

### 2. ツール定義ジェネレーター (`src/generator.ts`)

MCPサーバーからツール定義を取得し、TypeScriptファイルを生成します。

#### 主要機能

- **generateToolFile()**: 単一のツール用のTypeScriptファイルを生成
  - JSON SchemaからTypeScript型を生成
  - ツール名をcamelCaseの関数名に変換
  - 入力/出力インターフェースを生成

- **generateServerFiles()**: 単一サーバーの全ツールファイルを生成
  - MCPサーバーに接続してツール一覧を取得
  - 各ツール用のファイルを生成
  - index.tsを生成して全ツールをエクスポート

- **generateAllServers()**: 複数サーバーのファイルを一括生成
  - クライアントラッパーファイルを生成
  - 各サーバーのファイルを生成

### 3. CLIツール (`src/generate.ts`)

コマンドラインからツール定義を生成するためのCLIツールです。

- Claude Desktopの設定ファイルを読み込む
- MCPサーバー設定を抽出
- ツール定義を生成

## 使用方法

### 1. ビルド

```bash
cd mcp-code-execution
npm install
npm run build
```

### 2. ツール定義の生成

```bash
npm run generate [config-path] [output-dir]
```

例：
```bash
# Windows
npm run generate "%APPDATA%\Claude\claude_desktop_config.json" ./servers

# Mac
npm run generate ~/Library/Application\ Support/Claude/claude_desktop_config.json ./servers
```

### 3. 生成されるファイル構造

```
servers/
├── client.ts                    # MCPクライアントラッパー
├── google_drive/
│   ├── getDocument.ts          # 個別のツールファイル
│   ├── search.ts
│   └── index.ts                # エクスポートファイル
└── salesforce/
    ├── updateRecord.ts
    └── index.ts
```

### 4. 生成されたコードの使用

```typescript
import { initializeMCPServers } from './servers/client.js';
import * as gdrive from './servers/google_drive/index.js';

// サーバーを初期化
await initializeMCPServers({
  google_drive: {
    command: 'node',
    args: ['path/to/server.js'],
    env: { API_KEY: 'your-key' }
  }
});

// ツールを使用
const doc = await gdrive.getDocument({ documentId: 'abc123' });
```

## 利点

### 1. プログレッシブディスクロージャー

エージェントは必要なツールのみをオンデマンドで読み込むことができます。すべてのツール定義を一度に読み込む必要がありません。

### 2. コンテキスト効率

大きなデータセットをコード実行環境でフィルタリング・変換してからモデルに返すことができます。

```typescript
const allRows = await gdrive.getSheet({ sheetId: 'abc123' });
const filtered = allRows.filter(row => row.status === 'pending');
// フィルタリングされた結果のみがモデルのコンテキストに入る
```

### 3. プライバシー保護

機密データをコード実行環境内で処理し、モデルのコンテキストに含めないことができます。

### 4. 状態の永続化

ファイルシステムに状態を保存して操作を再開可能にします。

## 今後の拡張

- [ ] トークン化機能（PIIの自動トークン化）
- [ ] スキルシステム（再利用可能なコードパターンの保存）
- [ ] 検索機能（ツール検索API）
- [ ] エラーハンドリングの改善
- [ ] テストスイートの追加

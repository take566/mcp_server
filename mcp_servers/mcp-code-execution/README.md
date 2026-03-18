# MCP Code Execution

MCPサーバーをコードAPIとして使用するためのツールキット。記事「[Code execution with MCP: Building more efficient agents](https://www.anthropic.com/engineering/code-execution-with-mcp)」の内容を実装しています。

## 概要

このツールは、MCPサーバーのツール定義をTypeScriptファイルとして生成し、エージェントがコード実行環境でMCPツールを呼び出せるようにします。これにより、以下の利点があります：

1. **プログレッシブディスクロージャー**: 必要なツールのみをオンデマンドで読み込む
2. **コンテキスト効率**: 中間結果をコード実行環境で処理してからモデルに返す
3. **プライバシー保護**: 機密データをコード実行環境内で処理し、モデルのコンテキストに含めない
4. **状態の永続化**: ファイルシステムに状態を保存して操作を再開可能にする

## インストール

```bash
cd mcp-code-execution
npm install
npm run build
```

## 使用方法

### 1. ツール定義の生成

Claude Desktopの設定ファイルからMCPサーバーのツール定義を生成：

```bash
npm run generate [config-path] [output-dir]
```

例：
```bash
# Windowsの場合
npm run generate "%APPDATA%\Claude\claude_desktop_config.json" ./servers

# Macの場合
npm run generate ~/Library/Application\ Support/Claude/claude_desktop_config.json ./servers
```

### 2. 生成されるファイル構造

```
servers/
├── client.ts                    # MCPツール呼び出し関数
├── google_drive/
│   ├── getDocument.ts          # 個別のツールファイル
│   ├── search.ts
│   └── index.ts                # エクスポートファイル
├── salesforce/
│   ├── updateRecord.ts
│   └── index.ts
└── ...
```

### 3. 生成されたコードの使用例

```typescript
// Read transcript from Google Docs and add to Salesforce prospect
import * as gdrive from './servers/google_drive';
import * as salesforce from './servers/salesforce';

const transcript = (await gdrive.getDocument({ documentId: 'abc123' })).content;
await salesforce.updateRecord({
  objectType: 'SalesMeeting',
  recordId: '00Q5f000001abcXYZ',
  data: { Notes: transcript }
});
```

### 4. データフィルタリングの例

```typescript
// 大きなデータセットをフィルタリングしてから返す
const allRows = await gdrive.getSheet({ sheetId: 'abc123' });
const pendingOrders = allRows.filter(row => 
  row["Status"] === 'pending'
);
console.log(`Found ${pendingOrders.length} pending orders`);
console.log(pendingOrders.slice(0, 5)); // 最初の5件のみを表示
```

## アーキテクチャ

### MCPクライアント (`client.ts`)

MCPサーバーへの接続とツール呼び出しを管理します。

- `MCPClient`: 単一のMCPサーバーへの接続を管理
- `mcpRegistry`: 複数のMCPサーバーを管理するグローバルレジストリ
- `callMCPTool`: 生成されたコードから使用されるメイン関数

### ジェネレーター (`generator.ts`)

MCPサーバーからツール定義を取得し、TypeScriptファイルを生成します。

- `generateServerFiles`: 単一サーバーのツールファイルを生成
- `generateAllServers`: 複数サーバーのファイルを生成

## 設定

### Claude Desktop設定ファイルの形式

```json
{
  "mcpServers": {
    "google-drive": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}
```

## 開発

```bash
# ビルド
npm run build

# 開発モード（ウォッチ）
npm run dev

# 生成スクリプトの実行
npm run generate
```

## 実装の詳細

詳細な実装情報については、[IMPLEMENTATION.md](./IMPLEMENTATION.md)を参照してください。

## トラブルシューティング

### MCPサーバーに接続できない

- MCPサーバーのコマンドパスが正しいか確認してください
- 環境変数が正しく設定されているか確認してください
- MCPサーバーが正常に起動できるか確認してください

### 生成されたファイルが正しく動作しない

- `initializeMCPServers()`を呼び出してからツールを使用しているか確認してください
- サーバー設定が正しいか確認してください
- ビルド済みの`dist/client.js`が存在するか確認してください

## 参考資料

- [Code execution with MCP: Building more efficient agents](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)

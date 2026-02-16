# MCP Inspector ガイド

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) は、Model Context Protocol サーバーをテスト・デバッグするための対話型開発者ツールです。このドキュメントでは、プロジェクト内の MCP サーバーで Inspector を使用する方法を説明します。

## インストールと基本使用

Inspector は `npx` 経由でインストール不要で実行できます：

```bash
npx @modelcontextprotocol/inspector <command>
```

## このプロジェクトでの使い方

### 基本的な起動

プロジェクトルートで以下を実行します：

```bash
# Inspector UI を起動（サーバーは UI から手動で設定）
npm run inspector

# または直接実行
npx -y @modelcontextprotocol/inspector
```

### 各 MCP サーバーを Inspector でテスト

プロジェクトに登録されている主要な MCP サーバーを Inspector で起動するスクリプトが用意されています。

#### Draw.io MCP

```bash
npm run inspector:drawio
```

#### Chrome DevTools MCP

Chrome をリモートデバッグモードで起動してから実行してください：

```powershell
# Windows: 別ターミナルで Chrome を起動
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

```bash
npm run inspector:chrome-devtools
```

#### Context7

API キーが必要です。環境変数 `CONTEXT7_API_KEY` を設定するか、Inspector の環境変数パネルで設定してください：

```bash
# 環境変数を設定してから実行（PowerShell）
$env:CONTEXT7_API_KEY = "your-api-key"
npm run inspector:context7
```

#### Claude Mem（ローカル）

```bash
npm run inspector:claude-mem
```

事前に `mcp_servers/claude-mem` で `npm run build` を実行してください。

#### mcp-server-kubernetes

事前にビルドが必要です：

```bash
cd mcp_servers/mcp-server-kubernetes
npm install && npm run build
cd ../..
npm run inspector:kubernetes
```

## 手動で Inspector を起動する

### npm / npx パッケージの場合

```bash
npx -y @modelcontextprotocol/inspector npx <package-name> <args>
```

例：

```bash
npx -y @modelcontextprotocol/inspector npx -y @drawio/mcp
npx -y @modelcontextprotocol/inspector npx -y @modelcontextprotocol/server-filesystem D:\work\
```

### ローカル開発サーバー（TypeScript）

```bash
npx @modelcontextprotocol/inspector node path/to/server/dist/index.js [args...]
```

例：

```bash
npx -y @modelcontextprotocol/inspector node mcp_servers/mcp-server-kubernetes/dist/index.js
```

### PyPI パッケージの場合

```bash
npx @modelcontextprotocol/inspector uvx <package-name> [args...]
```

例：

```bash
npx -y @modelcontextprotocol/inspector uvx mcp-server-git --repository ~/code/mcp/servers.git
```

### Python プロジェクト（ローカル）

```bash
npx @modelcontextprotocol/inspector uv --directory path/to/server run package-name [args...]
```

## Inspector の機能

- **Server connection pane**: トランスポートの選択、コマンドライン引数・環境変数のカスタマイズ
- **Resources タブ**: リソース一覧、メタデータ、コンテンツの確認、サブスクリプションのテスト
- **Prompts タブ**: プロンプトテンプレートの表示、引数の指定、テスト実行
- **Tools タブ**: ツール一覧、スキーマ確認、入力によるツールテスト、実行結果の表示
- **Notifications パネル**: サーバーログと通知の表示

## 開発フローでのベストプラクティス

1. **接続確認**
   - Inspector でサーバーを起動
   - 基本的な接続と機能の確認を行う

2. **反復テスト**
   - サーバーを修正
   - ビルドし直す
   - Inspector で再接続して変更を検証

3. **エッジケースのテスト**
   - 不正な入力
   - 不足しているプロンプト引数
   - 同時実行
   - エラーハンドリングの確認

## PowerShell スクリプト（Windows）

プロジェクトに `tools/inspector.ps1` が含まれています。対話式メニューでサーバーを選択して Inspector を起動できます。

```powershell
# プロジェクトルートで実行
.\tools\inspector.ps1

# サーバーを指定して直接起動
.\tools\inspector.ps1 drawio
.\tools\inspector.ps1 claude-mem
.\tools\inspector.ps1 kubernetes
```

## トラブルシューティング

### Inspector が起動しない

- Node.js 18 以上がインストールされているか確認
- `npx -y @modelcontextprotocol/inspector` を直接実行してエラーメッセージを確認

### サーバーに接続できない

- サーバーのコマンド・引数が正しいか確認
- 環境変数（API キー等）が必要なサーバーは、Inspector の環境変数パネルで設定
- ローカルサーバーの場合、事前にビルド済みか確認

### パスの問題（Windows）

- パス区切りは `/` または `\\` を使用
- プロジェクトルートからの相対パス（例: `mcp_servers/claude-mem/...`）で指定

## 参考リンク

- [MCP Inspector 公式ドキュメント](https://modelcontextprotocol.io/docs/tools/inspector)
- [MCP Inspector リポジトリ](https://github.com/modelcontextprotocol/inspector)
- [MCP デバッグガイド](https://modelcontextprotocol.io/docs/tools/debugging)

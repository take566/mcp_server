# MCPサーバーセットアップガイド

このドキュメントでは、プロジェクトに統合されているMCPサーバーのセットアップ方法を説明します。

## 統合済みMCPサーバー

### 1. Chrome DevTools MCP

Chrome DevTools Protocolを使用してブラウザを操作できるMCPサーバーです。

#### セットアップ

1. **Chromeをリモートデバッグモードで起動**

   - **Windows:**
     ```powershell
     & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
     ```

   - **macOS:**
     ```bash
     /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
     ```

   - **Linux:**
     ```bash
     google-chrome --remote-debugging-port=9222
     ```

2. **設定確認**

   `.mcp.json`に以下の設定が含まれています：

   ```json
   "chrome-devtools": {
     "type": "stdio",
     "command": "npx",
     "args": ["-y", "chrome-devtools-mcp@latest"],
     "env": {}
   }
   ```

3. **使用方法**

   MCPクライアントから以下のようなコマンドを実行できます：
   - パフォーマンス分析
   - ページのスクリーンショット取得
   - コンソールログの取得
   - ネットワークリクエストの監視

#### 参考リンク

- [GitHub: ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)

---

### 2. Claude Mem

Claude Codeのセッション間でコンテキストを永続化するメモリ圧縮システムです。

#### セットアップ

1. **インストール済み**

   プロジェクトの`mcp_servers/claude-mem`ディレクトリにクローン済みです。

2. **ビルド済み**

   以下のコマンドでビルド済みです：
   ```bash
   cd mcp_servers/claude-mem
   npm install
   npm run build
   ```

3. **設定確認**

   `.mcp.json`に以下の設定が含まれています：

   ```json
   "claude-mem": {
     "type": "stdio",
     "command": "node",
     "args": ["d:\\work\\mcp_server\\mcp_servers\\claude-mem\\plugin\\scripts\\mcp-server.cjs"],
     "env": {}
   }
   ```

4. **使用方法**

   - セッション間でコンテキストを自動的に保存・圧縮
   - 過去の会話を検索可能
   - 知識グラフの構築

#### 参考リンク

- [GitHub: thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)

---

### 3. Context7 (Upstash)

最新のライブラリドキュメントとコード例を取得できるMCPサーバーです。

#### セットアップ

1. **APIキーの取得**

   [context7.com/dashboard](https://context7.com/dashboard)で無料アカウントを作成し、APIキーを取得します。

2. **環境変数の設定**

   `.mcp.json`の`context7`セクションで、`env`オブジェクトにAPIキーを設定します：

   ```json
   "context7": {
     "type": "stdio",
     "command": "npx",
     "args": [
       "-y",
       "@upstash/context7-mcp",
       "--api-key",
       "${CONTEXT7_API_KEY}"
     ],
     "env": {
       "CONTEXT7_API_KEY": "YOUR_API_KEY_HERE"
     }
   }
   ```

   または、環境変数として設定：

   ```powershell
   # Windows PowerShell
   $env:CONTEXT7_API_KEY = "YOUR_API_KEY_HERE"
   ```

   ```bash
   # Linux/macOS
   export CONTEXT7_API_KEY="YOUR_API_KEY_HERE"
   ```

3. **使用方法**

   MCPクライアントから以下のようなコマンドを実行できます：
   - 最新のライブラリドキュメントの取得
   - コード例の検索
   - フレームワーク固有の情報の取得

#### 参考リンク

- [GitHub: mcp/upstash/context7](https://github.com/mcp/upstash/context7)
- [Context7 インストールガイド](https://context7.com/docs/installation)

---

### 4. Figma MCP Server

Figmaデザインファイルからコンテキストを取得し、コード生成を支援するMCPサーバーです。

#### セットアップ

1. **Figmaデスクトップアプリの準備**

   - Figmaデスクトップアプリを最新版に更新
   - デザインファイルを開く
   - Dev Modeに切り替え（`Shift + D`）
   - インスペクトパネルで「Enable desktop MCP server」をクリック

2. **サーバーの起動確認**

   サーバーが`http://127.0.0.1:3845/mcp`で起動していることを確認します。

3. **設定確認**

   `.mcp.json`に以下の設定が含まれています：

   ```json
   "figma-desktop": {
     "type": "sse",
     "url": "http://127.0.0.1:3845/mcp"
   }
   ```

4. **使用方法**

   - Figmaでフレームやレイヤーを選択
   - MCPクライアントに「選択中のデザインを実装して」と指示
   - または、FigmaのURLを提供してデザインを実装

#### アクセス制限

- **StarterプランまたはView/Collabシート**: 月6回まで
- **Dev/Fullシート（Professional/Organization/Enterprise）**: 分単位のレート制限

#### 参考リンク

- [Figma MCP Server ドキュメント](https://developers.figma.com/docs/figma-mcp-server/)

---

## 設定ファイルの場所

### Cursor

設定ファイル: `~/.cursor/mcp.json` または `%APPDATA%\Cursor\mcp.json`

### Claude Desktop

設定ファイル:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### プロジェクト設定

このプロジェクトの`.mcp.json`ファイルを参考に、各クライアントの設定ファイルを更新してください。

---

## トラブルシューティング

### Chrome DevTools MCP

- **問題**: Chromeに接続できない
  - **解決策**: Chromeがリモートデバッグモードで起動していることを確認。他のChromeインスタンスをすべて終了してから起動。

### Claude Mem

- **問題**: MCPサーバーが起動しない
  - **解決策**: `mcp_servers/claude-mem`ディレクトリで`npm run build`を実行してビルドを確認。

### Context7

- **問題**: APIキーエラー
  - **解決策**: APIキーが正しく設定されているか確認。環境変数または`.mcp.json`の`env`セクションを確認。

### Figma MCP

- **問題**: サーバーに接続できない
  - **解決策**: FigmaデスクトップアプリでMCPサーバーが有効になっているか確認。`http://127.0.0.1:3845/mcp`にアクセスできるか確認。

---

## 追加のMCPサーバー

他のMCPサーバーを追加する場合は、[glama.ai/mcp/servers](https://glama.ai/mcp/servers)または[GitHub: modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)を参照してください。

---

## 更新履歴

- 2025-01-XX: 初版作成
  - Chrome DevTools MCP統合
  - Claude Mem統合
  - Context7統合
  - Figma MCP Server統合

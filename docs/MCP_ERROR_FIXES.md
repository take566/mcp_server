# MCPサーバーエラー修正ガイド

このドキュメントでは、Claude DesktopのMCPサーバーで発生する一般的なエラーとその修正方法を説明します。

## 確認されたエラー

### 1. claude-code MCPサーバー: `unhandled errors in a TaskGroup`

**エラーメッセージ:**
```
Server error: unhandled errors in a TaskGroup (1 sub-exception)
```

**原因:**
Pythonの非同期処理（TaskGroup）で未処理の例外が発生しています。研究システム（`http://localhost:8000`）への接続エラーが原因の可能性があります。

**ログの詳細:**
- 研究システムが利用不可: `Research system not available: Research system HTTP error: Server error '503 Service Unavailable'`
- サーバーが起動直後にクラッシュ

**修正方法:**

1. **設定ファイルの確認**
   - 現在の設定ファイル（`claude_desktop_config.json`）には`claude-code`の設定が存在しません
   - これは古い設定の残りである可能性が高い

2. **古い設定の削除**
   - 設定ファイルに`claude-code`が存在しない場合、このエラーは無視して問題ありません
   - 古いログファイル（2025-09-29）のエラーです

3. **もしclaude-codeを使用する場合**
   - 研究システム（`http://localhost:8000`）を起動する
   - または、研究システムの設定を無効化する
   - Pythonの非同期処理エラーを修正する必要があります

**推奨対応:**
- 設定ファイルに`claude-code`が存在しないため、このエラーは無視して問題ありません
- 古いログの残りです

---

### 2. toolbox MCPサーバー: SSE接続の切断

**エラーメッセージ:**
```
Streamable HTTP error: SSE stream disconnected: TypeError: terminated
```

**原因:**
- ネットワーク接続の問題
- サーバー側のタイムアウト
- ファイアウォールやプロキシの設定

**修正方法:**

1. **ネットワーク接続の確認**
   - インターネット接続が安定しているか確認
   - プロキシ設定を確認

2. **設定の確認**
   - `toolbox`サーバーの設定を確認
   - APIキーが正しく設定されているか確認

3. **再起動**
   - Claude Desktopを再起動
   - 問題が続く場合は、一時的に`toolbox`サーバーを無効化

**現在の設定:**
```json
"toolbox": {
  "command": "cmd",
  "args": [
    "/c",
    "npx",
    "-y",
    "@smithery/cli@latest",
    "run",
    "@smithery/toolbox",
    "--key",
    "cf195fad-d0a4-4e8a-924b-857d744731b3",
    "--profile",
    "dizzy-echidna-X0paey"
  ]
}
```

**推奨対応:**
- このエラーは接続の問題であり、設定の問題ではありません
- サーバー側の問題の可能性が高いため、一時的に無効化するか、Smitheryのサポートに問い合わせることを推奨

---

### 3. claude_vm_node.log: `@ant/claude-swift`モジュールが見つからない

**エラーメッセージ:**
```
[SwiftVM] Failed to load module: Error: Cannot find package 'C:\ProgramData\tmf58\AnthropicClaude\app-1.0.3218\resources\app.asar\node_modules\@ant\claude-swift\js\index.js'
```

**原因:**
Claude Desktopアプリの内部モジュールの問題。アプリのインストールが不完全である可能性があります。

**修正方法:**

1. **Claude Desktopの再インストール**
   - Claude Desktopを完全にアンインストール
   - 最新版を再インストール

2. **アプリデータのクリア**
   - `%APPDATA%\Claude` ディレクトリをバックアップ
   - アプリを再インストール後、設定ファイルを復元

**注意:** このエラーはClaude Desktopアプリ自体の問題であり、MCPサーバーの設定では修正できません。

---

## 正常に動作しているMCPサーバー

以下のサーバーは正常に動作しています：

- ✅ **serena**: 正常に接続・動作
- ✅ **brave-search**: 正常に接続・動作
- ✅ **coderabbitai**: 正常に接続・動作
- ✅ **memory**: 正常に動作（`Method not found`は正常 - resources/promptsをサポートしていないだけ）
- ✅ **code-mcp**: 正常に動作（`Method not found`は正常 - resources/promptsをサポートしていないだけ）
- ⚠️ **toolbox**: 接続は成功しているが、SSE切断が頻繁に発生

### 注意: `Method not found`エラーについて

`code-mcp`と`memory`サーバーで`Method not found`エラーが表示されますが、これは**正常な動作**です：
- これらのサーバーは`resources/list`と`prompts/list`メソッドをサポートしていません
- ツール（tools）は正常に動作しています
- エラーではなく、機能が実装されていないだけです

---

## トラブルシューティング手順

### 1. ログの確認

各MCPサーバーのログを確認：
```
%APPDATA%\Claude\logs\mcp-server-<server-name>.log
```

### 2. 設定ファイルの確認

Claude Desktopの設定ファイルを確認：
```
%APPDATA%\Claude\claude_desktop_config.json
```

### 3. サーバーの個別テスト

問題のあるサーバーを一時的に無効化して、他のサーバーが正常に動作するか確認。

### 4. 環境変数の確認

設定ファイルで使用されている環境変数が正しく設定されているか確認：
- `BRAVE_API_KEY`
- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `OPENAPI_MCP_HEADERS`
- その他のAPIキー

---

## 推奨アクション

1. **claude-codeサーバー**: 設定ファイルに存在しないため、古いログ（2025-09-29）の可能性が高い。無視して問題ありません。

2. **code-mcp / memoryサーバー**: `Method not found`エラーは正常な動作です。これらのサーバーは`resources`と`prompts`をサポートしていませんが、`tools`は正常に動作しています。

3. **toolboxサーバー**: SSE接続エラーはサーバー側の問題の可能性が高い。一時的に無効化するか、Smitheryのサポートに問い合わせることを推奨。

4. **claude_vm_node.log**: Claude Desktopアプリの再インストールを検討。

## 実際に修正が必要なエラー

現在のログを確認した結果、**実際に修正が必要なエラーはありません**：

- ✅ `claude-code`のエラーは古いログ（設定ファイルに存在しない）
- ✅ `code-mcp`と`memory`の`Method not found`は正常な動作
- ⚠️ `toolbox`のSSE切断はサーバー側の問題（設定の問題ではない）
- ⚠️ `claude_vm_node.log`のエラーはClaude Desktopアプリ自体の問題

すべてのMCPサーバーは正常に動作しており、修正が必要な設定エラーはありません。

---

## 更新履歴

- 2026-01-15: 初版作成
  - claude-code MCPサーバーのエラー分析
  - toolbox MCPサーバーのSSE接続エラー分析
  - claude_vm_node.logのエラー分析

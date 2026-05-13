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
  - `toolbox`サーバーの設定に **`--key` / `--profile` が含まれていない** ことを確認
  - Smithery CLI の認証は `smithery login` で行う

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
    "@smithery/toolbox"
  ]
}
```

**推奨対応:**
- まず設定から `--key` / `--profile` を削除し、`smithery login` を実行
- それでもSSE切断が続く場合はサーバー側の問題の可能性が高いため、一時的に無効化するか、Smitheryのサポートに問い合わせることを推奨

---

### 2.1 playwright-mcp-server: `unknown option '--key'`

**エラーメッセージ:**
```
error: unknown option '--key'
```

**原因:**
- Smithery CLI v3 では `run` に `--key` / `--profile` を指定できない

**修正方法:**

1. **設定の確認**
   - `playwright-mcp-server` の引数から `--key` を削除
2. **認証**
   - Smithery CLI は `smithery login` で認証

**修正後の設定例:**
```json
"playwright-mcp-server": {
  "command": "cmd",
  "args": [
    "/c",
    "npx",
    "-y",
    "@smithery/cli@latest",
    "run",
    "@showfive/playwright-mcp-server"
  ]
}
```

**補足:**
- `prompts/list` の `Method not found` は未実装による正常な応答です

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
- `NOTION_TOKEN` (@notionhq/notion-mcp-server v2 以降; v1 の `OPENAPI_MCP_HEADERS` は廃止)
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

---

## Cursor IDE MCP設定エラー（2026-01-24調査）

### 発見された問題

#### 1. context7 MCPサーバー: 環境変数設定の欠如

**問題:**
- 実際のCursor設定ファイル（`%USERPROFILE%\.cursor\mcp.json`）の`context7`サーバーに`env`セクションが存在しない
- これにより、`CONTEXT7_API_KEY`が設定されず、context7サーバーが正常に動作しない可能性がある

**修正内容:**
- `context7`サーバーの設定に`env`セクションを追加
- `CONTEXT7_API_KEY`フィールドを追加（空文字列、ユーザーが設定する必要がある）

**設定ファイルの場所:**
- Cursor: `%USERPROFILE%\.cursor\mcp.json` または `{project}/.cursor/mcp.json`
- プロジェクト設定例: `d:\work\mcp_server\.mcp.json`

**修正後の設定例:**
```json
"context7": {
  "command": "npx",
  "args": [
    "-y",
    "@upstash/context7-mcp"
  ],
  "env": {
    "CONTEXT7_API_KEY": ""
  }
}
```

**注意事項:**
- `CONTEXT7_API_KEY`は[context7.com/dashboard](https://context7.com/dashboard)で取得する必要があります
- APIキーを設定するまで、context7サーバーは正常に動作しません

#### 2. 設定ファイルの構造確認

**調査結果:**
- `.mcp.json`ファイルの構造はCursorの公式仕様に準拠している
- `type`フィールドはオプション（一部のサーバーで使用、一部では不要）
- stdioタイプのサーバー: `command`と`args`が必要
- SSEタイプのサーバー: `url`が必要

**現在の設定状況:**
- ✅ `chrome-devtools`: 正常（stdio、npx経由）
- ✅ `serena-mcp`: 正常（stdio、uvx経由）
- ⚠️ `context7`: 修正済み（envセクション追加、APIキーはユーザー設定が必要）
- ⚠️ `cipher`: APIキー未設定エラー（`OPENAI_API_KEY`または`ANTHROPIC_API_KEY`が必要）
- ✅ `byterover-mcp`: 正常（SSE、URL指定）

#### 3. パスとコマンドの検証

**検証結果:**
- すべてのコマンド（npx, node, uvx, cipher）が利用可能
- `claude-mem`のパス（`d:\work\mcp_server\mcp_servers\claude-mem\plugin\scripts\mcp-server.cjs`）は存在することを確認

---

#### 3. cipher MCPサーバー: APIキー未設定エラー（修正済み）

**問題:**
- cipherサーバーが起動時に以下のエラーを出力：
  ```
  [CIPHER-MCP] ERROR: No API key or Ollama configuration found, please set at least one of OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY, OLLAMA_BASE_URL, or AWS credentials
  ```
- `.mcp.json`では`${OPENAI_API_KEY}`と`${ANTHROPIC_API_KEY}`を参照しているが、環境変数が設定されていない
- Cursor IDEは`.env`ファイルを自動的に読み込まない

**原因:**
- `OPENAI_API_KEY`または`ANTHROPIC_API_KEY`の環境変数が設定されていない
- Cursorの`${ENV_VAR}`構文はシステム環境変数のみを参照し、`.env`ファイルからは読み込まない
- cipherサーバーはこれらのAPIキーのいずれかが必要

**修正内容（2026-01-24）:**

1. **`.env`ファイルに`ANTHROPIC_API_KEY`を追加:**
   - `configs/win_config/.env`に`ANTHROPIC_API_KEY=your_anthropic_api_key_here`を追加
   - ユーザーは実際のAPIキーに置き換える必要があります

2. **Node.jsラッパースクリプトを作成:**
   - `configs/win_config/load-env-and-run-cipher.cjs`を作成（CommonJS形式）
   - このスクリプトは`.env`ファイルを読み込み、環境変数を設定してからcipherサーバーを起動します
   - PowerShellスクリプトからNode.jsスクリプトに変更（より確実に動作）

3. **`.mcp.json`を更新:**
   - cipherサーバーの設定をNode.jsラッパースクリプトを使用するように変更
   - Node.jsスクリプト経由で`.env`ファイルから環境変数を読み込む

**修正後の設定:**
```json
"cipher": {
  "type": "stdio",
  "command": "node",
  "args": [
    "${workspaceFolder}/configs/win_config/load-env-and-run-cipher.cjs"
  ],
  "env": {}
}
```

**使用方法:**
1. `configs/win_config/.env`ファイルを開く
2. `ANTHROPIC_API_KEY=your_anthropic_api_key_here`の値を実際のAPIキーに置き換える
3. Cursor IDEを再起動してcipherサーバーが正常に動作することを確認

**トラブルシューティング:**
- スクリプトはプレースホルダー値を検出して警告を出します
- APIキーが設定されていない場合、cipherサーバーは起動しません
- `.env`ファイルのパスは`configs/win_config/.env`です
- テストスクリプト`configs/win_config/test-cipher-env.ps1`で環境変数の設定を確認できます

**テスト方法:**
```powershell
# 環境変数の設定を確認
powershell.exe -ExecutionPolicy Bypass -File "configs\win_config\test-cipher-env.ps1"

# cipherサーバーを直接テスト
node configs\win_config\load-env-and-run-cipher.cjs
```

**注意事項:**
- `.env`ファイルは`.gitignore`で除外されているため、Gitにはコミットされません
- APIキーは機密情報なので、共有しないでください
- プレースホルダー値（`your_anthropic_api_key_here`）は無視されます

---

## 更新履歴

- 2026-01-24: cipherサーバーのエラー修正完了
  - Node.jsラッパースクリプト（`load-env-and-run-cipher.cjs`）を作成
  - `.env`ファイルから環境変数を読み込む機能を実装
  - テストスクリプト（`test-cipher-env.ps1`）を作成
  - セットアップガイド（`README_CIPHER_SETUP.md`）を作成
  - `.mcp.json`を更新してラッパースクリプトを使用するように変更
  - プレースホルダー値の検出と警告機能を追加
- 2026-01-24: cipherサーバーのエラー調査
  - cipherサーバーのAPIキー未設定エラーを特定
  - エラーメッセージと原因を記録
  - 修正方法を追加
- 2026-01-24: Cursor IDE MCP設定エラー調査
  - context7サーバーのenvセクション欠如を修正
  - cipherサーバーの設定を修正（`cipher`コマンドから`npx -y @byterover/cipher`に変更）
  - 設定ファイルの構造検証
  - パスとコマンドの検証
- 2026-01-15: 初版作成
  - claude-code MCPサーバーのエラー分析
  - toolbox MCPサーバーのSSE接続エラー分析
  - claude_vm_node.logのエラー分析

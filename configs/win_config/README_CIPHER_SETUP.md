# Cipher MCP Server セットアップガイド

## 概要

cipher MCPサーバーは`.env`ファイルから環境変数を読み込むように設定されています。

## セットアップ手順

### 1. `.env`ファイルにAPIキーを設定

`configs/win_config/.env`ファイルを開き、以下の行を実際のAPIキーに置き換えてください：

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

↓ 実際のAPIキーに置き換え

```env
ANTHROPIC_API_KEY=sk-ant-api03-実際のAPIキーをここに入力
```

**注意:** 
- `your_anthropic_api_key_here`はプレースホルダーです。実際のAPIキーに置き換える必要があります。
- APIキーは`sk-ant-api03-`で始まります。

### 2. 環境変数の確認

以下のコマンドで環境変数の設定を確認できます：

```powershell
powershell.exe -ExecutionPolicy Bypass -File "configs\win_config\test-cipher-env.ps1"
```

### 3. Cursor IDEの再起動

`.env`ファイルを更新した後、Cursor IDEを再起動してください。

## 動作確認

cipherサーバーが正常に動作しているか確認するには：

```powershell
node configs\win_config\load-env-and-run-cipher.cjs
```

エラーが表示されず、サーバーが起動すれば正常です。

## ファイル構成

- **`.env`**: 環境変数（APIキーなど）を設定するファイル
- **`load-env-and-run-cipher.cjs`**: `.env`ファイルを読み込んでcipherサーバーを起動するNode.jsスクリプト
- **`test-cipher-env.ps1`**: 環境変数の設定を確認するテストスクリプト
- **`.mcp.json`**: Cursor IDEのMCPサーバー設定ファイル

## トラブルシューティング

### エラー: "No API key or Ollama configuration found"

**原因:** `.env`ファイルに`ANTHROPIC_API_KEY`が設定されていないか、プレースホルダーのままです。

**解決方法:**
1. `configs/win_config/.env`ファイルを開く
2. `ANTHROPIC_API_KEY=your_anthropic_api_key_here`を実際のAPIキーに置き換える
3. Cursor IDEを再起動

### エラー: "Warning: ANTHROPIC_API_KEY is set to placeholder value"

**原因:** `.env`ファイルの`ANTHROPIC_API_KEY`がまだプレースホルダー（`your_anthropic_api_key_here`）のままです。

**解決方法:** 上記のセットアップ手順に従って、実際のAPIキーを設定してください。

## セキュリティに関する注意

- `.env`ファイルは`.gitignore`で除外されているため、Gitにはコミットされません
- APIキーは機密情報です。共有しないでください
- `.env`ファイルの内容を公開リポジトリにコミットしないでください

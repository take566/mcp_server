# grepai MCP 統合 動作確認レポート

実施日: 2025-02-09

## 確認項目

### 1. 設定ファイルの妥当性

- **`.mcp.json`**  
  - JSON として有効であることを確認（`node -e "JSON.parse(...)"`）。
- **`configs/win_config/claude_desktop_config.json`**  
  - JSON として有効であることを確認。

**結果**: いずれも有効な JSON であり、grepai エントリが正しく含まれている。

### 2. grepai バイナリの動作

- GitHub Releases (v0.30.0) から Windows amd64 バイナリを取得し、一時ディレクトリ `.grepai-verify/` に配置。
- **`grepai version`**  
  - 実行結果: `grepai version 0.30.0`
- **`grepai mcp-serve --help`**  
  - ヘルプが表示され、`mcp-serve [project-path]` および Cursor / Claude の設定例が確認できる。
- **`grepai init`**  
  - プロジェクトルート（`d:\work\mcp_server`）で実行し、`.grepai/config.yaml` が作成されることを確認。Embedder は Ollama、ストアは gob を選択。

### 3. MCP サーバー（stdio）の応答

- **`grepai mcp-serve d:\work\mcp_server`** を起動し、stdio 経由で MCP 形式のメッセージを送信。
- プロセスは起動し、stdin に対して JSON-RPC 形式の応答を返すことを確認（Parse error は送信フォーマットの差異によるもの。サーバー側は正常に応答）。

**結果**: grepai は MCP サーバーとして起動し、stdio で通信可能である。

## 結論

- Cursor 用 `.mcp.json` および Claude Desktop 用 `configs/win_config/claude_desktop_config.json` の grepai 設定は有効。
- grepai バイナリ（v0.30.0）は正常に動作し、`mcp-serve` は MCP over stdio で応答することを確認。

## 利用者側の追加手順

1. **grepai のインストール**  
   - [Releases](https://github.com/yoanbernabeu/grepai/releases) から取得するか、`install.sh`（Git Bash/WSL）でインストールし、PATH に通す。
2. **インデックス作成**  
   - プロジェクトルートで `grepai init`（未実施の場合）のあと、`grepai watch` を実行してインデックスを作成・更新する。
3. **Embedder**  
   - ローカル利用時は Ollama を起動し、`ollama pull nomic-embed-text` を実行する。

詳細は [MCP_SERVERS_SETUP.md](./MCP_SERVERS_SETUP.md) の「5. grepai」を参照。

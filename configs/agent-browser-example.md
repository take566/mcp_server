# Agent Browser 設定例

## 1. スタンドアロン CLI（本リポジトリ実装）

`tools/agent-browser` は MCP サーバーではなく、CLI でタスクを渡して実行するスタンドアロンです。

```bash
cd tools/agent-browser
uv sync
playwright install chromium
export ANTHROPIC_API_KEY=your_key
uv run agent-browser "https://example.com を開いて見出しを教えて"
```

## 2. Playwright MCP（Claude Desktop 連携）

公式の `@playwright/mcp` を Claude Desktop に追加する例です。

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Windows の場合は `cmd /c` 経由でも可です（.mcp.json の他サーバーと同様）。

## 3. 本リポジトリの Agent Browser と MCP の違い

| 項目 | tools/agent-browser | Playwright MCP |
|------|---------------------|----------------|
| 形態 | CLI / Python ライブラリ | MCP サーバー |
| 起動 | `uv run agent-browser "タスク"` | Claude Desktop が起動 |
| 制御 | 1タスクあたりエージェントループ | 都度ツール呼び出し |

CI やスクリプトから「この URL を開いて〜」と決め打ちで回す場合は `tools/agent-browser`、対話的に Claude にブラウザ操作させたい場合は Playwright MCP を利用してください。

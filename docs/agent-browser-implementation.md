# Agent Browser 実装ガイド

Agent Browser とは、LLM がブラウザを自律的に操作してタスクをこなすシステムです。本リポジトリでの実装方針と使い方をまとめます。

---

## アーキテクチャの選択肢

### 1. ツールベース（MCP + Playwright）

```
LLM → MCP Server → Playwright → Browser
```

最もシンプルで制御しやすい構成。

### 2. Vision + DOM 操作

```
LLM → スクリーンショット解析 → クリック/入力指示 → Browser
```

汎用性が高いが遅め。

### 3. HTML/Accessibility Tree 渡し

```
LLM → DOM/AXTree 抽出 → アクション決定 → Browser
```

速度とコストのバランスが良い。

---

## 本リポジトリの実装（ツールベース）

**場所**: `tools/agent-browser/`

- **Python + Playwright + Anthropic SDK**
- ツール: `navigate`, `click`, `type_text`, `get_page_content`, `screenshot`
- エージェントループ: Claude がツールを繰り返し呼び出し、`end_turn` まで実行

### 使い方

```bash
cd tools/agent-browser
uv sync
playwright install chromium
export ANTHROPIC_API_KEY=your_key
uv run agent-browser "https://example.com を開いて見出しを教えて"
```

詳細は [tools/agent-browser/README.md](../tools/agent-browser/README.md) を参照。

---

## Claude Desktop + Playwright MCP（推奨連携）

Claude Desktop からブラウザ操作する場合は、公式 Playwright MCP の利用を推奨します。

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

---

## 主要フレームワーク比較

| フレームワーク   | 特徴           | 向いている用途           |
|------------------|----------------|--------------------------|
| **Playwright MCP** | 公式、安定     | Claude Desktop 連携      |
| **本実装 (agent-browser)** | CLI/ライブラリ、Anthropic 直接 | スクリプト・CI からの自動化 |
| **browser-use**   | 高機能 OSS     | 汎用タスク自動化         |
| **Stagehand**     | Vercel 製、TS  | Web スクレイピング       |
| **Skyvern**       | Vision 特化    | 複雑な UI 操作           |

---

## セキュリティ・運用上の注意

- **サンドボックス化**: 本番環境では Docker コンテナ内で実行することを推奨
- **タイムアウト設定**: 無限ループ防止のため `--max-steps` を設定
- **ログ記録**: 全アクションをトレース可能にしておく
- **認証情報**: API キーは環境変数経由で渡す

---

## 参考リンク

- [Playwright MCP (GitHub)](https://github.com/microsoft/playwright-mcp)
- [browser-use (GitHub)](https://github.com/browser-use/browser-use)
- [Anthropic Tool Use Docs](https://docs.anthropic.com/ja/docs/tool-use)

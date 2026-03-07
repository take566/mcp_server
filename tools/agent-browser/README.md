# Agent Browser

LLM（Anthropic Claude）がブラウザを自律操作するツールです。  
Playwright + Anthropic SDK のツールベース構成です。

## アーキテクチャ

```
LLM (Claude) → ツール呼び出し → Playwright → Browser
```

## セットアップ

### 1. 依存関係

```bash
cd tools/agent-browser
uv sync
# または
pip install -r requirements.txt
```

### 2. Playwright ブラウザのインストール

```bash
playwright install chromium
```

### 3. API キー

```bash
export ANTHROPIC_API_KEY=your_key
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY = "your_key"
```

## 使い方

### CLI

```bash
# デフォルトタスク（example.com を開いて見出しを取得）
uv run agent-browser

# タスクを指定
uv run agent-browser "https://github.com を開いてトップのリポジトリ名を教えて"

# ヘッドレスで実行
uv run agent-browser "https://example.com のタイトルを取得" --headless

# 最大ステップ数・モデル指定
uv run agent-browser "Google で検索" --model claude-sonnet-4-20250514 --max-steps 20
```

### Python から呼び出し

```python
import asyncio
from playwright.async_api import async_playwright
from agent_browser.agent import run_agent

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        result = await run_agent(page, "https://example.com を開いて見出しを教えて")
        print(result)
        await browser.close()

asyncio.run(main())
```

## 利用可能なツール

| ツール | 説明 |
|--------|------|
| `navigate` | 指定URLに移動 |
| `click` | セレクタで要素をクリック |
| `type_text` | 要素にテキストを入力 |
| `get_page_content` | ページのテキストを取得（最大3000文字） |
| `screenshot` | スクリーンショットを `screenshots/` に保存 |

## セキュリティ・運用

- **サンドボックス**: 本番では Docker 等で隔離して実行することを推奨
- **タイムアウト**: `--max-steps` で無限ループを防止
- **認証**: API キーは環境変数で渡すこと

## 参考

- [Agent Browser 実装ガイド](../../docs)（プロジェクト内）
- [Playwright](https://playwright.dev/python/)
- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/tool-use)

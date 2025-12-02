# AIコーディング環境構築ガイド (2025年12月版要約)

この記事は Zenn 記事「AIコーディング実践環境の構築方法【2025年12月】」を参考に、本リポジトリ向けに再構成した要約ガイドです。原文全体の転載はせず、実践ポイントのみを整理しています。

## 基本方針
- ドキュメントとコードを並行管理 (仕様駆動開発 / SDD)
- Linter / Formatter を機械化し AI のトークン浪費を防止
- 複数ツールを併用しロックイン回避 (Claude Code / Codex CLI / Gemini CLI / GitHub Copilot 等)
- MCPサーバーで最新仕様・外部操作能力を補強 (Context7 / Playwright など)
- 定期的にコンテキストをクリアし、生成ドキュメントを起点に再作業

## ツール群概要
| 区分 | 目的 | 代表例 |
|------|------|--------|
| AIコーディング | 高品質/高速生成 | Claude Code, Codex CLI, Gemini CLI, Copilot |
| 仕様駆動開発 | 要件/タスク生成 | cc-sdd, Kiro, Spec Kit |
| コード品質 | 自動Lint/Format | Ruff (Python), ESLint/Prettier (TS/JS) |
| リポジトリ操作 | CLI自動化 | gh (GitHub CLI) |
| コンテキスト拡張 | 外部API/最新仕様取得 | MCPサーバー (Context7, Playwright 他) |

## Node/npm & CLI セットアップ (macOS/Linux)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# nvm 読み込み後
nvm install --lts
npm install -g @anthropic-ai/claude-code @openai/codex @google/gemini-cli mmcp
```
Windows は nvm-windows (https://github.com/coreybutler/nvm-windows) を利用、PowerShell 管理者でインストーラ実行後 `nvm install lts`。

## mmcp による MCP サーバー設定
```bash
# 利用するエージェント追加 (必要なもののみ選択)
mmcp agents add claude-code codex-cli gemini-cli
# 便利な MCP 例
mmcp add context7 -- npx -y @upstash/context7-mcp
mmcp add playwright -- npx -y @playwright/mcp@latest
mmcp apply
```
Context7: 最新ライブラリ仕様取得。Prompt末尾に「Context7を使って」と付記するだけで参照可能。
Playwright MCP: ブラウザ操作 (UI動作確認 / E2E テスト補助) を LLM に委譲。

## Python プロジェクト品質設定 (Ruff 推奨)
`pyproject.toml` に以下を追加済み:
```toml
[tool.ruff]
line-length = 120
select = ["E", "F", "B", "I", "UP"]
ignore = ["E501"]
```
保存前後で `ruff check` / `ruff format` を CI へ統合推奨。

## 仕様駆動開発 (cc-sdd 例)
```bash
npx cc-sdd@latest --claude --lang ja
# 生成後: /kiro:spec-init <プロジェクト概要>
# タスク/仕様ドキュメントは .kiro/steering 下に生成 -> Git管理対象
```
`.claude/` や `.kiro/settings/` はユーザー設定のため `.gitignore` に追加し除外、`.kiro/steering` のドキュメントはバージョン管理します。

## gh (GitHub CLI)
```bash
# Mac(Homebrew)
brew install gh
# Linux/WSL (Debian系)
sudo apt install gh
# 認証
gh auth login
# Project 権限追加 (必要時)
gh auth refresh -s project
```
AI エージェントへ: 「issues化」「PR作成」「レビュー依頼」など CLI 指示可能。

## 推奨ワークフロー概要
1. テンプレート/既存コード取得
2. cc-sdd で初期仕様/タスク生成 → `.kiro/steering` を commit
3. MCP サーバー (Context7 等) 有効化
4. タスク単位で AI 実装 → PR 作成 (gh)
5. Ruff / ESLint で自動品質チェック
6. 人 + 複数 AI でレビュー (Copilot / Claude Code など)
7. マージ後定期的に `/clear` でコンテキスト整理

## Windows / PowerShell 簡易セットアップスクリプト
`tools/setup_ai_env.ps1` を参照 (nvm-windows 導入は別途)。

## クロスプラットフォーム スクリプト
`tools/setup_ai_env.sh` は UNIX 系向け。必要に応じて環境変数/代理店プロキシ設定など拡張してください。

## gitignore ポリシー
- 追跡する: 仕様/タスクドキュメント (`.kiro/steering/**`)
- 追跡しない: 個別設定 (`.claude/`, `.kiro/settings/`)

## 今後の拡張案
- CI で Ruff / Playwright E2E を並列実行
- Context7 + 生成コード差分検証ジョブ
- PR テンプレートに "使用MCP一覧" セクション追加

## 参考
- 原典Zenn記事: AIコーディング実践環境の構築方法 (2025年12月版)
- mmcp: https://github.com/koki-develop/mmcp
- cc-sdd: https://github.com/gotalab/cc-sdd
- Ruff: https://docs.astral.sh/ruff/
- Context7 MCP: @upstash/context7-mcp
- Playwright MCP: @playwright/mcp

(本ファイルは要約と追加整理であり、原文の再配布ではありません)

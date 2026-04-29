# Claude Code プラグイン導入ガイド (本 monorepo 用)

Claude Code の `/plugin` で導入できるプラグインのうち、**この MCP server monorepo の作業に実際に効くもの**だけを厳選して列挙する。

元記事 (36 選): <https://x.com/ClaudeCode_love/status/2049469282107691216>

## 設計方針

- **既存 MCP サーバーと重複するものは入れない**
  本リポでは `chrome-devtools`, `context7`, `claude-mem`, `serena`, `arxiv` などを既に MCP として運用中 (`.mcp.json` 参照)。Slack/Notion/Linear 等は claude.ai 経由のホスト型 MCP で利用可能。同名プラグインを入れると機能と context token が二重に乗るので避ける。
- **既存スキルと重複するものは入れない**
  `/review`, `/security-review` などは既に利用可。Code Review プラグインは不要。
- **3〜5 個ルールを厳守**
  各プラグインは context token を消費する。元記事も最適は 3〜5 個と明記。
- **TypeScript と Python の両言語に対応**
  本 monorepo は TS (`mcp_servers/*/src/`) と Python (uv 管理) が混在するため両 LSP を入れる価値がある。

## 推奨セット

### Tier 1 — 必須 (常時 ON)

| #  | プラグイン        | 入れる理由                                       |
| -- | ----------------- | ------------------------------------------------ |
| 09 | TypeScript LSP    | TS の型エラー・定義ジャンプ。serena では出ない診断を補完 |
| 10 | Python LSP        | Python サーバー (uv) の型・参照解析              |

### Tier 2 — 強く推奨 (作業内容に応じて)

| #  | プラグイン        | 入れる理由                                                         |
| -- | ----------------- | ------------------------------------------------------------------ |
| 06 | Commit Commands   | git ワークフローの自動化 (CLAUDE.md にも `git commit/push` 指示あり) |
| 05 | Security Guidance | OWASP/認証・シークレット検査。MCP サーバーは credential 扱うので定期スキャン推奨 |

### Tier 3 — 状況によって (デフォルト OFF を推奨)

| #  | プラグイン   | 入れる理由 / 注意                                                  |
| -- | ------------ | ------------------------------------------------------------------ |
| 13 | Ralph Loop   | 細分化タスクを自律実行。CLAUDE.md の PDCA サイクル指示と相性◯       |
| 17 | Sourcegraph  | monorepo 横断検索。serena と機能重複あるが、外部リポ検索は強い      |
| 27 | Sentry       | 本番監視するなら。現状 prod 運用がないなら不要                      |

## 入れない (理由付き)

| #  | プラグイン            | スキップ理由                                  |
| -- | --------------------- | --------------------------------------------- |
| 01 | Frontend Design       | 本リポはバックエンド (MCP サーバー) 中心       |
| 02 | Superpowers           | 既存スキルと機能重複が多い                    |
| 03 | Context7              | 既に MCP として導入済 (`.mcp.json`)           |
| 04 | Code Review           | `/review` スキルで代替可                      |
| 07 | Feature Dev           | 既存ワークフロー (CLAUDE.md) と競合           |
| 08 | Plugin Toolkit        | プラグイン作成は本リポのスコープ外            |
| 14 | Chrome DevTools       | 既に MCP として導入済                         |
| 15 | Playwright            | UI テストは本リポ対象外                       |
| 25 | GitHub                | `github-mcp-server` で代替                    |
| 26 | Slack                 | claude.ai 経由の Slack MCP で代替可           |
| 31-36 | Knowledge Work系   | 業務系。本リポは開発ツール                    |

## インストール手順

### 1. ターミナルで Claude Code を開いた状態で実行

```text
/plugin
```

→ Discover タブで以下を検索してインストール:
- `typescript-lsp`
- `python-lsp`
- `commit-commands`
- `security-guidance`

### 2. 公式マーケットプレイス以外の追加 (必要なら)

`anthropics/knowledge-work-plugins` を使う場合のみ:

```text
/plugin marketplace add anthropics/knowledge-work-plugins
```

ただし本リポでは knowledge-work 系は不要のため、追加は任意。

### 3. インストール範囲の選び方

- **user スコープ** ── 全プロジェクトで使う (LSP 系はこちら)
- **project スコープ** ── 本 monorepo 限定 (Security Guidance はこちら推奨)

## 運用

### 使ってないプラグインは無効化

```text
/plugin disable <plugin-name>
```

context token を節約できる。とくに作業フェーズが変わったら入れ替える。

### 既存 MCP サーバーとの優先順位

`.mcp.json` に登録済の MCP サーバーが優先。同等機能のプラグインは原則入れない。
重複に気付いたら片方を必ず disable / remove する。

## 参考

- [全プラグインカタログ](https://claude.com/plugins)
- [公式リポジトリ](https://github.com/anthropics/claude-plugins-official)
- [プラグインドキュメント](https://code.claude.com/docs/en/discover-plugins)
- 元記事 (36 選): <https://x.com/ClaudeCode_love/status/2049469282107691216>

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase

## まとめ:何ができるか

1. claude-md-improver(スキル) -CLAUDE.mdの品質監査

-「CLAUDE.mdを監査して」「CLAUDE.mdをチェックして」で発動
-全CLAUDE.mdファイルを発見し、6つの基準でスコアリング:
ーコマンド/ワークフロー(20点)
-アーキテクチャの明確さ(20点)
-非自明なパターン(15点)
-簡潔さ(15点)
-最新性(15点)
-実行可能性(15点)
-A~Fのグレードで品質レポートを出力
-改善提案をdiff形式で提示→承認後に自動反映

2./revise-claude-md(コマンド) -セッションの学びを記録

-セッション終了時に/revise-claude-md で実行
-そのセッションで発見したコマンド、パターン、gotchasなどを自動抽出
- CLAUDE.md vs .claude.local.md のどちらに書くべきか判断
-承認したものだけ反映

 そのセッションで発見したコマンド・gotchas・パターンを自動抽出して


あなたはマネージャーでagentオーケストレーターです
あなたは絶対に実装せず、全てsubagentやtask agent
に委託すること
タスクは超細分化し、PDCAサイクルを構築するこ
と。

いまプロジェクトをゼロから自由に再設計できるとしたら、どういう設計にしますか？

Codexはcliを使ってください

Codexにチームを作成してチームで仕事をするように依頼して
必ず反証するようなチームメンバーを追加してね
また、各エージェントがどのような役割でどのような仕事をしたのかもレスポンスしてね

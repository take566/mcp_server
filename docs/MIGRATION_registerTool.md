# registerTool + zod 移行に伴う互換性メモ

低レベル `Server` + `setRequestHandler`（ListTools / CallTool）から `McpServer.registerTool` + zod への移行（#42 openrouter / #43 _template / #44 gdrive / #45 slack・notion wrapper / #46 arxiv / #47 chrome-devtools、Refs #40）で生じた、クライアントから観測できる差異をまとめる。

- 各項目は PR 本文と main 上のコードで照合した（確認の範囲は各項目に記載。未再現のものは「未検証」）。加えて `_template` / `arxiv-mcp` / `gdrive-mcp` / `openrouter-mcp` の `dist` を in-memory Client で実際に呼び出して、tools/list と tools/call の出力を確認した（SDK ^1.32.2）。
- 「移行前」の挙動は PR 本文と移行前コミット（git history）のコード読みに基づく。移行前ビルドの再実行はしていない。
- 検証できなかった項目は「未検証」と明記する。

## 全サーバー共通（SDK 標準の挙動）

| 項目 | 内容 |
|------|------|
| tools/list の `inputSchema` | zod 由来で `additionalProperties: false` と `$schema`（`http://json-schema.org/draft-07/schema#`）が付く |
| tools/list の各ツール | `execution: { taskSupport: "forbidden" }` が付く |
| サーバー capabilities | `tools: { listChanged: true }`（gdrive は `resources: { listChanged: true }` も） |
| 不正な引数 | ハンドラに到達する前に SDK が検証し、`isError: true` の結果で返す。例: `MCP error -32602: Input validation error: Invalid arguments for tool hello: String must contain at least 1 character(s) at name` |
| 未知のツール名 | `isError: true` の結果（`MCP error -32602: Tool nope not found`）。JSON-RPC エラーとしては投げられない |

ツール名・プロパティ名・基本の型は移行前後で維持されている（PR #42 / #46 / #47 の before/after 比較による）。ただし下記サーバー別の差異（gdrive の `minLength`、openrouter の `minItems` / `required: []` 省略、_template の `outputSchema` 等）がある。

上記の共通挙動は `_template` / `arxiv-mcp` / `gdrive-mcp` / `openrouter-mcp` で実行確認した。chrome-devtools-mcp は tools/call を再現しておらず未検証（同じ SDK 経路のため同様と推定）。

## サーバー別

### openrouter-mcp（#42）

- `messages` に `minItems: 1` が付く（`messages: []` は検証エラー）。
- `list_models` の `required: []` は出力されなくなった。
- `max_tokens`（正の整数）/ `temperature`（0..2）/ `top_p`（0..1）/ `limit` の範囲チェックは `.refine` による呼び出し時検証のみ。advertised schema は `type: number` のままで `minimum` / `maximum` は載らない。範囲外は `isError` の検証エラー（例: `temperature: 5` -> `must be between 0 and 2 at temperature`）。
- 説明文の一部が言い換えられている（PR 本文による）。

### _template（#43）

- `hello.name` は `z.string().min(1)`。空文字は拒否され、`name` 欠落も `isError` の検証エラー（`Required at name`）になる。
- `outputSchema` と `structuredContent` を持つ（テンプレートの新規仕様）。

### gdrive-mcp（#44）

- 空文字の `query` は schema で拒否される（`minLength: 1` を advertise）。旧実装の `McpError(InvalidParams)`「検索クエリが指定されていません」ではなく、`isError` の結果になる。`query` 欠落も同様。
- 未知のツール名は、旧実装の `McpError(MethodNotFound, -32601)` ではなく `isError` の結果になる。
- 旧実装の上記エラーは、移行前コミット `5bdbf3d^` の `src/index.ts` で確認した。
- リソースの list / read ハンドラは従来どおり下層の `server` に登録されている。
- ファクトリは `src/server.ts` の `createServer` に移動。`node dist/index.js` の起動方法は変わらない。

### arxiv-mcp（#46）

- `get_paper` の `ids` が配列以外の場合、入力検証エラー（`Expected array, received string at ids`）になる。旧実装は型検証がなく `getPaperById` 内の `ids.join` に到達していた（コード読みによる。「ids.join is not a function」という実メッセージの再現は未検証）。
- `maxResults` の範囲や `group` の enum は、スキーマを変えないために意図的に追加していない（PR 本文）。

### chrome-devtools-mcp（#47）

- 不正な引数（例: `click {}`）はハンドラ到達前に拒否される。旧実装ではハンドラに到達していた（PR 本文）。tools/call の実行までは今回再現していない（未検証。tools/list の比較は PR で実施済み）。
- `emulate` は viewport（width/height）と geolocation（latitude/longitude）の必須項目をハンドラ冒頭で検証し、欠落時は何も適用せずエラーにする（`src/tools/emulation.ts` で確認）。スキーマ上の内部フィールドは従来どおり optional。
- `press_key` は押下した修飾キーを `finally` で解放する（PR 本文と `src/tools/interaction.ts` の `press_key` で確認）。
- 29 ツール、名前・schema 型は同一（PR 本文）。

### slack-mcp / notion-mcp-server wrapper（#45）

- 挙動変更なし。upstream パッケージ・環境変数名（`SLACK_BOT_TOKEN` / `SLACK_TEAM_ID` / `NOTION_TOKEN`）は不変。
- package.json の整理（dangling な `main`、空メタデータ、`type: commonjs` の削除、`private` 化、`test` script 追加）と `tests/wrappers.test.mjs` の追加のみ。

## クライアント側で確認すべきこと

- エラー文字列の完全一致で分岐しているクライアントは影響を受ける。特に gdrive の「検索クエリが指定されていません」や、JSON-RPC エラーコード（-32601 / -32602 を例外として期待する実装）。現在は `isError: true` の tools/call 結果の本文テキスト（`MCP error -32602: ...`）で返る。
- `isError` の結果を例外とは別経路で扱っているか確認する。
- tools/list を厳密検証するクライアントは、`additionalProperties: false`（未知のキーを送ると拒否される）、`$schema`、`execution.taskSupport`、`minLength` / `minItems` を許容する必要がある。
- 範囲制約（openrouter の temperature など）は schema に載らないため、事前検証には使えない。呼び出して初めて分かる。
- スキーマに載らない値を送るクライアントは、`additionalProperties: false` により拒否されうる。

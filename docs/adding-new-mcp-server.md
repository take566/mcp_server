# 新規MCPサーバー追加ガイド

## TypeScript MCPサーバーの追加

### 📋 チェックリスト

- [ ] 1. サーバーディレクトリ作成
- [ ] 2. package.json設定
- [ ] 3. tsconfig.json設定
- [ ] 4. registerTool + zod でツール実装
- [ ] 5. ビルドスクリプト追加
- [ ] 6. テスト追加 (推奨)
- [ ] 7. CI/CD自動統合確認

### ステップバイステップ

#### 1. テンプレートをコピー
```bash
cp -r mcp_servers/_template mcp_servers/your-mcp-server
rm -rf mcp_servers/your-mcp-server/dist
```
その後ルート `package.json` の `workspaces` に `mcp_servers/your-mcp-server` を追加し、`npm install` を実行する。

#### 2. package.json
`name`（例: `@mcp/your-server`）と `description` を書き換える。`test` スクリプトの `mcp_servers/_template/src` も新ディレクトリ名に変更する。
```json
{
  "name": "@mcp/your-server",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "start:http": "node dist/http.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --root ../.. mcp_servers/your-mcp-server/src"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.32.2",
    "zod": "^3.25.76"
  }
}
```

**重要**: SDK は `^1.32.2`、`tsconfig.json` はルートの `tsconfig.base.json` を extends する。vitest / typescript / biome はルートで一元管理。

#### 3. tsconfig.json
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "src/**/*.test.ts"]
}
```

#### 4. ツール実装 (`McpServer.registerTool` + zod)
低レベル `Server` + `setRequestHandler` ではなく `McpServer.registerTool` を使う。入力・出力は zod スキーマで定義し、`structuredContent` を返す。
```typescript
// src/tools/hello.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerHelloTool(server: McpServer): void {
  server.registerTool(
    "hello",
    {
      title: "Hello",
      description: "Returns a greeting for the given name",
      inputSchema: { name: z.string().min(1).describe("Name to greet") },
      outputSchema: { greeting: z.string() },
    },
    async ({ name }) => {
      const result = { greeting: `Hello, ${name}!` };
      return { content: [{ type: "text", text: result.greeting }], structuredContent: result };
    },
  );
}
```
```typescript
// src/server.ts
export function createServer(): McpServer {
  const server = new McpServer({ name: "your-mcp-server", version: "1.0.0" });
  registerHelloTool(server);
  return server;
}
```
```typescript
// src/index.ts (stdio)
await createServer().connect(new StdioServerTransport());
```
Streamable HTTP が必要な場合は `src/http.ts`（ステートレス・loopback のみ）を参照。ログは必ず `console.error`（stdout は JSON-RPC 専用）。

#### 4.5 テスト
`InMemoryTransport.createLinkedPair()` で Client と Server を接続し、`listTools` と `callTool` を検証する（`src/server.test.ts` 参照）。ルートで `npm test` を実行すると全 workspace のテストが走る。

#### 4.6 検証
```bash
npm run build -w @mcp/your-server
npm run typecheck && npm run lint && npm run format:check && npm test
```

#### 5. CI/CD自動統合

新しいサーバーを追加すると、**自動的にCI/CDに統合**されます:

1. **変更検知**: `detect-changes.yml` が `mcp_servers/your-mcp-server/**` を検知
2. **動的マトリクス**: `ts-mcp-ci.yml` のマトリクスに自動追加
3. **並列ビルド**: 他のサーバーと並列でビルド・テスト実行
4. **SDK互換性**: 自動的にSDKバージョンチェック

**手動設定不要** - パスが `mcp_servers/*/` であれば自動認識されます。

---

## Python MCPサーバーの追加

### 📋 チェックリスト

- [ ] 1. サーバーディレクトリ作成
- [ ] 2. pyproject.toml設定
- [ ] 3. main.py実装
- [ ] 4. uv依存関係設定
- [ ] 5. テスト追加 (推奨)
- [ ] 6. CI/CD自動統合確認

### ステップバイステップ

#### 1. ディレクトリ構造作成
```bash
mkdir -p tools/your-python-mcp
cd tools/your-python-mcp
```

#### 2. pyproject.toml作成
```toml
[project]
name = "your-python-mcp"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
    "mcp>=1.0.0"
]

[project.scripts]
your-python-mcp = "your_python_mcp.main:main"
```

#### 3. main.py実装
```python
from mcp.server import Server
from mcp.server.stdio import stdio_server

app = Server("your-python-mcp")

@app.list_tools()
async def list_tools():
    return [...]

if __name__ == "__main__":
    stdio_server(app.run)
```

#### 4. uv依存関係管理
```bash
uv sync
uv add mcp
```

#### 5. CI/CD自動統合

Python MCPサーバーは `tools/**/*.py` パスで自動認識:

1. **変更検知**: `detect-changes.yml` が検知
2. **Python CI実行**: `py-mcp-ci.yml` が自動実行
3. **マトリックステスト**: Python 3.11, 3.12 で並列テスト
4. **品質チェック**: Ruff + mypy + pytest 自動実行

---

## CI/CD動作確認

### 初回プッシュ後の確認
```bash
git add mcp_servers/your-mcp-server/
git commit -m "feat: add your-mcp-server"
git push
```

GitHub Actions タブで確認:
- ✅ `detect-changes` ジョブで新サーバー検知
- ✅ `ts-mcp-ci` または `py-mcp-ci` で自動ビルド
- ✅ `ci-summary` でレポート生成

### トラブルシューティング

**問題**: サーバーが検知されない
**原因**: パスが `mcp_servers/` 配下にない
**解決**: `mcp_servers/your-server/` に移動

**問題**: SDK互換性エラー
**原因**: 古いSDKバージョン使用
**解決**: `@modelcontextprotocol/sdk@^1.32.2` に更新

**問題**: ビルド失敗
**原因**: package.jsonのビルドスクリプト不足
**解決**: `"build": "tsc"` を追加

---

## 詳細ドキュメント

- CI/CDアーキテクチャ: [docs/ci-cd/architecture.md](ci-cd/architecture.md)
- トラブルシューティング: [docs/ci-cd/troubleshooting.md](ci-cd/troubleshooting.md)
- クイックスタート: [docs/ci-cd/quick-start.md](ci-cd/quick-start.md)

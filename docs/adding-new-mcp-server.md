# 新規MCPサーバー追加ガイド

## TypeScript MCPサーバーの追加

### 📋 チェックリスト

- [ ] 1. サーバーディレクトリ作成
- [ ] 2. package.json設定
- [ ] 3. tsconfig.json設定
- [ ] 4. src/index.ts実装
- [ ] 5. ビルドスクリプト追加
- [ ] 6. テスト追加 (推奨)
- [ ] 7. CI/CD自動統合確認

### ステップバイステップ

#### 1. ディレクトリ構造作成
```bash
mkdir -p mcp_servers/your-mcp-server/src
cd mcp_servers/your-mcp-server
```

#### 2. package.json作成
```json
{
  "name": "your-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc && shx chmod +x dist/*.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.25.3"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "@types/node": "^22.0.0",
    "shx": "^0.3.4"
  }
}
```

**重要**: SDK バージョンは `^1.25.3` を使用してください。

#### 3. tsconfig.json作成
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

#### 4. src/index.ts実装
```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'your-mcp-server',
  version: '1.0.0'
}, {
  capabilities: { tools: {} }
});

// Tool handlers here...

const transport = new StdioServerTransport();
await server.connect(transport);
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
**解決**: `@modelcontextprotocol/sdk@^1.25.3` に更新

**問題**: ビルド失敗
**原因**: package.jsonのビルドスクリプト不足
**解決**: `"build": "tsc && shx chmod +x dist/*.js"` を追加

---

## 詳細ドキュメント

- CI/CDアーキテクチャ: [docs/ci-cd/architecture.md](ci-cd/architecture.md)
- トラブルシューティング: [docs/ci-cd/troubleshooting.md](ci-cd/troubleshooting.md)
- クイックスタート: [docs/ci-cd/quick-start.md](ci-cd/quick-start.md)

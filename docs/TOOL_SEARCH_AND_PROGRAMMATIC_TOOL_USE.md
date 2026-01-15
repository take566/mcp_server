# Tool Search と Programmatic Tool Use のサポート

このドキュメントでは、Anthropicのベータ機能である **Tool Search** と **Programmatic Tool Use** の実装方法について説明します。

## 概要

### Tool Search (`tool-search-2025-04-15`)

Tool Search機能により、ツールを`defer_loading: true`でマークすることで、セッション開始時にコンテキストトークンを消費せずにツールを発見可能にできます。Claudeは必要に応じて検索メカニズムを通じて関連ツールを発見します。

**報告された利点:**
- トークン使用量を85%削減しながら、完全なツールアクセスを維持
- 精度の大幅な向上（Opus 4: 49% → 74%, Opus 4.5: 79.5% → 88.1%）

### Programmatic Tool Use (`programmatic-tool-use-2025-04-15`)

Programmatic Tool Use機能により、Claudeは複数のツールを個別のAPIラウンドトリップではなく、コード実行を通じてオーケストレーションできます。最終結果のみがコンテキストに入ります。

**報告された利点:**
- 複雑なマルチツールタスクで37%のトークン削減
- 複数のラウンドトリップからの推論オーバーヘッドを排除

## 設定方法

### 1. Claude Desktop設定ファイルの拡張

`claude_desktop_config.json`にベータ機能を有効化する設定を追加します：

```json
{
  "mcpServers": {
    "your-server": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {},
      "betaFeatures": {
        "toolSearch": true,
        "programmaticToolUse": true
      },
      "tools": {
        "deferLoading": [
          "tool-name-1",
          "tool-name-2"
        ]
      }
    }
  }
}
```

### 2. .mcp.json設定ファイルの拡張

`.mcp.json`ファイルにも同様の設定を追加できます：

```json
{
  "mcpServers": {
    "your-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "your-mcp-server"],
      "betaFeatures": {
        "toolSearch": true,
        "programmaticToolUse": true
      },
      "tools": {
        "deferLoading": ["tool-name"]
      }
    }
  }
}
```

## MCPサーバー側の実装

### defer_loadingフラグのサポート

MCPサーバーでツール定義に`defer_loading`フラグを追加するには、ツールスキーマに以下のプロパティを追加します：

```typescript
import { ToolSchema } from './types';

export const myTool: ToolSchema = {
  name: "my-tool",
  description: "My tool description",
  inputSchema: {
    type: "object",
    properties: {
      // ... your properties
    }
  },
  defer_loading: true  // このフラグを追加
};
```

### ユーティリティ関数の使用

このプロジェクトでは、`tools/mcp-tool-utils.ts`にユーティリティ関数を提供しています：

```typescript
import { createDeferredTool, createProgrammaticTool } from '../tools/mcp-tool-utils';

// defer_loadingをサポートするツールを作成
const deferredTool = createDeferredTool({
  name: "my-tool",
  description: "My tool description",
  inputSchema: { /* ... */ }
});

// programmatic tool useをサポートするツールを作成
const programmaticTool = createProgrammaticTool({
  name: "my-tool",
  description: "My tool description",
  inputSchema: { /* ... */ },
  allowedCallers: ["code-execution"]  // コード実行環境からの呼び出しを許可
});
```

## 使用例

### 例1: 複数のMCPサーバーを持つ設定

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["path/to/filesystem-server.js"],
      "betaFeatures": {
        "toolSearch": true
      },
      "tools": {
        "deferLoading": ["read_file", "write_file", "list_directory"]
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "betaFeatures": {
        "toolSearch": true,
        "programmaticToolUse": true
      },
      "tools": {
        "deferLoading": ["search_repositories", "get_issue"]
      }
    }
  }
}
```

### 例2: コード実行環境での使用

`mcp-code-execution`プロジェクトを使用して、Programmatic Tool Useを活用できます：

```typescript
import { initializeMCPServers } from './servers/client.js';
import * as github from './servers/github/index.js';
import * as filesystem from './servers/filesystem/index.js';

// サーバーを初期化
await initializeMCPServers({
  github: { /* config */ },
  filesystem: { /* config */ }
});

// 複数のツールを効率的に実行
async function processRepository(repoName: string) {
  // これらの呼び出しはコード実行環境内で実行され、
  // 最終結果のみがClaudeのコンテキストに入る
  const repo = await github.searchRepositories({ query: repoName });
  const issues = await github.getIssues({ repo: repoName });
  const readme = await filesystem.readFile({ path: `${repoName}/README.md` });
  
  return {
    repo,
    issueCount: issues.length,
    hasReadme: !!readme
  };
}
```

## ベストプラクティス

1. **defer_loadingの適用**
   - 頻繁に使用されないツールに`defer_loading: true`を設定
   - セッション開始時に常に必要なツールは通常通りロード

2. **Programmatic Tool Useの活用**
   - 複数のツールを連続して呼び出す必要がある場合に使用
   - データのフィルタリングや変換をコード実行環境で行う

3. **パフォーマンス最適化**
   - 大きなデータセットはコード実行環境で処理してから返す
   - 不要なデータをClaudeのコンテキストに入れない

## 参考資料

- [Anthropic Engineering: Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Anthropic API Documentation: Token-Efficient Tool Use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/token-efficient-tool-use)
- [GitHub Issue #12836](https://github.com/anthropics/claude-code/issues/12836)

## トラブルシューティング

### ツールが検索されない

- `defer_loading`が正しく設定されているか確認
- ツールの`description`が適切に設定されているか確認（検索に使用されます）

### Programmatic Tool Useが動作しない

- `allowedCallers`が正しく設定されているか確認
- コード実行環境が正しく初期化されているか確認

### トークン削減が期待通りでない

- 実際に使用されているツールのみが`defer_loading`になっているか確認
- 不要なツール定義を削除または`defer_loading`に設定

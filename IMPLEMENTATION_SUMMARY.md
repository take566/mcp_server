# Tool Search と Programmatic Tool Use の実装サマリー

このドキュメントは、GitHub Issue #12836で要求された機能の実装サマリーです。

## 実装内容

### 1. ドキュメント

- **`docs/TOOL_SEARCH_AND_PROGRAMMATIC_TOOL_USE.md`**
  - Tool SearchとProgrammatic Tool Useの詳細な説明
  - 設定方法と使用例
  - ベストプラクティスとトラブルシューティング

### 2. ユーティリティ関数

- **`tools/mcp-tool-utils.ts`**
  - `createDeferredTool()`: defer_loadingフラグを設定したツールを作成
  - `createProgrammaticTool()`: Programmatic Tool Useをサポートするツールを作成
  - `createAdvancedTool()`: 両方の機能をサポートするツールを作成
  - その他のヘルパー関数

### 3. サンプルコード

- **`examples/tool-search-example.ts`**
  - 各種ツール定義の例
  - MCPサーバーでの実装例
  - コード実行環境での使用例

### 4. 設定ファイル例

- **`configs/example_beta_features_config.json`**
  - 複数のMCPサーバーでのベータ機能設定例
  - コメント付きの設定説明

### 5. README更新

- **`README.md`**
  - 新機能の説明を追加
  - ディレクトリ構造を更新
  - ドキュメントへのリンクを追加

## 使用方法

### 基本的な使用

1. **設定ファイルの拡張**
   ```json
   {
     "mcpServers": {
       "your-server": {
         "command": "node",
         "args": ["server.js"],
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

2. **ツール定義での使用**
   ```typescript
   import { createDeferredTool } from '../tools/mcp-tool-utils';
   
   const tool = createDeferredTool({
     name: "my-tool",
     description: "My tool",
     inputSchema: { /* ... */ }
   });
   ```

### 詳細情報

詳細な使用方法と例については、以下を参照してください：

- `docs/TOOL_SEARCH_AND_PROGRAMMATIC_TOOL_USE.md` - 完全なドキュメント
- `examples/tool-search-example.ts` - 実装例
- `configs/example_beta_features_config.json` - 設定例

## 注意事項

この実装は、MCPサーバー側でのTool SearchとProgrammatic Tool Useのサポートを提供します。実際の機能の有効化は、Claude Code（Cursor）側で行う必要があります。

現在、これらのベータ機能はAnthropic APIで利用可能ですが、Claude Code（Cursor）でのサポートはまだ実装されていません。この実装により、将来のサポートが追加された際にすぐに利用できるようになります。

## 参考リンク

- [GitHub Issue #12836](https://github.com/anthropics/claude-code/issues/12836)
- [Anthropic Engineering: Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Anthropic API Documentation: Token-Efficient Tool Use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/token-efficient-tool-use)

# Memory Bank - mcp_server

## 1. ProjectBrief

- **目的**: Model Context Protocol (MCP) サーバーのコレクションと関連ツールの管理
- **スコープ**: MCPサーバー実装、設定ファイル、ドキュメント、開発ツール
- **方向性のソース**: README.md、CLAUDE.md、docs/

## 2. ProductContext

- **解決する課題**: Claude Desktop や Cursor で利用する MCP サーバーの一元管理
- **主要ユーザー体験**: 各種 MCP サーバーのセットアップ、設定、運用
- **差別化要素**: 複数 MCP サーバーを統合管理、環境別設定の提供

## 3. SystemPatterns

- **アーキテクチャ**: `mcp_servers/` 配下に各 MCP サーバーを配置、`configs/` で設定管理
- **技術スタック**: TypeScript/Node.js（多数）、Python（一部）、uv（Python 依存関係）
- **主要コンポーネント**: MCP サーバー、Claude Desktop 設定、Cursor .mcp.json

## 4. CodingGuidelines

- **コーディング規約**: 各 MCP サーバーは標準的な MCP SDK パターンに準拠
- **ベストプラクティス**: 環境変数でシークレット管理、README にセットアップ手順を記載
- **テスト方針**: 各サーバーに `npm test` を定義、MCP Inspector での動作確認

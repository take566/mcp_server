# CI/CD クイックリファレンス

> 5分で理解するモノレポCI/CDシステム

## 🚀 概要

このリポジトリは、**インテリジェント変更検知**と**並列実行**による高速CI/CDシステムを採用しています。

**特徴**:
- ⚡ 最大90%の実行時間短縮 (50分 → 5分)
- 🎯 変更部分のみ自動実行
- 🔄 7サーバー並列ビルド
- 📊 包括的レポート自動生成

## 📂 主要ワークフロー

| ファイル | 役割 | トリガー |
|---------|------|---------|
| `monorepo-ci.yml` | メインオーケストレーター | push/PR |
| `detect-changes.yml` | 変更検知・影響分析 | workflow_call |
| `ts-mcp-ci.yml` | TypeScript MCP CI | 条件付き |
| `py-mcp-ci.yml` | Python MCP CI | 条件付き |

## 🎯 基本的な流れ

```
1. コード変更してプッシュ
   ↓
2. detect-changes が自動実行
   ↓
3. 変更検知結果に基づいて適切なCIを実行
   - TypeScript変更 → ts-mcp-ci
   - Python変更 → py-mcp-ci
   - 両方 → 並列実行
   ↓
4. 結果をGitHub Summaryに統合レポート
```

## ⏱️ 実行時間の目安

| あなたの変更 | CI実行時間 |
|------------|----------|
| 単一ファイル修正 | 3-5分 |
| 1つのMCPサーバー変更 | 3-5分 |
| 複数サーバー変更 | 5-7分 |
| ルート設定変更 | 7-10分 (全サーバー) |

**初回実行**: キャッシュなしで12-15分
**2回目以降**: キャッシュありで上記時間

## 📊 実行状況の確認

### GitHub Actions UI
```
GitHub → Actions タブ → 最新ワークフロー
```

### サマリーレポート
各ワークフロー実行の最後に包括的なレポートが生成されます:
- 実行されたCI
- 各ジョブの成否
- 実行時間
- キャッシュヒット率

## 🛠️ よくある操作

### 新しいMCPサーバーを追加
```bash
# 1. サーバーディレクトリ作成
mkdir -p mcp_servers/new-server/src

# 2. package.json, tsconfig.json, src/index.ts 作成
# 詳細: docs/adding-new-mcp-server.md

# 3. プッシュ
git add mcp_servers/new-server/
git commit -m "feat: add new-server"
git push

# 4. CI自動実行を確認 ✅
```

**手動設定不要** - パスベースで自動認識されます。

### CI失敗時の対応
```bash
# 1. GitHub Actions UIでログ確認
# 2. エラーメッセージを確認
# 3. トラブルシューティングガイド参照
# 詳細: docs/ci-cd-troubleshooting.md
```

### キャッシュをクリア
```bash
# GitHub CLIで実行
gh cache list
gh cache delete <cache-key>
```

## 🆘 緊急時対応

### CI が止まらない
```bash
# 実行中のワークフローをキャンセル
GitHub Actions UI → 実行中ワークフロー → Cancel workflow
```

### 全サーバーで強制テスト実行
```bash
# workflow_dispatch で手動トリガー
GitHub Actions → monorepo-ci → Run workflow
```

### CIをスキップしたい
```bash
# コミットメッセージに追加
git commit -m "docs: update README [skip ci]"
```

## 📚 詳細ドキュメント

### 最初に読むべき
- **クイックスタート**: `claudedocs/QUICK_START_CI.md`
- **アーキテクチャ**: `docs/ci-cd-architecture.md`

### 実装詳細
- **変更検知**: `claudedocs/detect-changes-workflow.md`
- **TypeScript CI**: `claudedocs/ts-mcp-ci-implementation.md`
- **Python CI**: `claudedocs/py-mcp-ci-guide.md`
- **オーケストレーション**: `claudedocs/ORCHESTRATION_SUMMARY.md`

### トラブルシューティング
- **問題解決**: `docs/ci-cd-troubleshooting.md`
- **新規サーバー追加**: `docs/adding-new-mcp-server.md`

### 移行ガイド
- **既存CIからの移行**: `claudedocs/ci-migration-guide.md`

## 🎯 パフォーマンス最適化のヒント

1. **コミットを小さく**: 変更範囲を限定してCI時間短縮
2. **キャッシュを活用**: 2回目以降は自動的に高速化
3. **並列実行を意識**: 独立した変更は別のファイル/サーバーで
4. **テストを早く**: 失敗するテストは早めに検知

## 🔗 リンク集

- **GitHub Actions**: [Actions タブ](../../actions)
- **Issues**: [問題報告](../../issues)
- **PRテンプレート**: `.github/pull_request_template.md`

---

**質問・フィードバック**: GitHub Issues でお気軽にどうぞ

**更新日**: 2026-02-26

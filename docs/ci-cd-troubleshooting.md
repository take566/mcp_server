# CI/CDトラブルシューティングガイド

## よくある問題と解決策

### 🔴 ワークフロー実行エラー

| 問題 | 症状 | 原因 | 解決方法 |
|------|------|------|---------|
| **YAML構文エラー** | ワークフロー開始せず | YAMLインデント誤り | yamllint でチェック、インデント修正 |
| **Permission denied** | ビルドスクリプト失敗 | 実行権限なし | `chmod +x` をビルドに追加 |
| **Module not found** | インポートエラー | 依存関係未インストール | `npm ci` または `uv sync` 実行確認 |
| **Timeout** | 10分でタイムアウト | 処理が長すぎる | timeout値を増やす、処理を最適化 |

### 🟡 キャッシュ問題

#### 症状: キャッシュヒットしない

**診断手順**:
```bash
# 1. キャッシュキーを確認
echo ${{ hashFiles('**/package-lock.json') }}

# 2. キャッシュパスが正しいか確認
ls ~/.npm
ls node_modules

# 3. キャッシュサイズ確認 (GitHub上限: 10GB)
gh cache list
```

**解決方法**:
- キャッシュキーにハッシュ関数が含まれているか確認
- `restore-keys` でフォールバックキャッシュ設定
- 大きすぎるキャッシュは分割

#### 症状: 古いキャッシュが残る

**解決方法**:
```bash
# 古いキャッシュを削除
gh cache delete <cache-key>

# または全キャッシュクリア
gh cache delete --all
```

### 🟢 SDK互換性エラー

#### エラーメッセージ: "SDK version mismatch"

**原因**: 異なるSDKバージョンが混在

**診断**:
```bash
# 全サーバーのSDKバージョン確認
grep -r "@modelcontextprotocol/sdk" mcp_servers/*/package.json
```

**解決方法**:
1. 推奨バージョンに統一: `^1.25.3`
2. package.jsonを更新:
   ```json
   "dependencies": {
     "@modelcontextprotocol/sdk": "^1.25.3"
   }
   ```
3. 依存関係再インストール:
   ```bash
   npm install
   # または
   pnpm install
   ```

**自動検証**: `ts-mcp-ci.yml` のSDK互換性ジョブでレポート確認

### 🔵 ビルド失敗

#### TypeScriptコンパイルエラー

**診断**:
```bash
# ローカルでビルド実行
cd mcp_servers/your-server
npm run build
```

**よくあるエラー**:
- `Cannot find module`: tsconfig.json の `paths` 設定確認
- `Type error`: strict mode での型エラー → 型定義追加
- `Emit error`: outDir設定確認

#### Python Ruffエラー

**診断**:
```bash
# ローカルでRuff実行
cd tools/your-python-mcp
ruff check .
ruff format --check .
```

**解決方法**:
```bash
# 自動修正
ruff check --fix .
ruff format .
```

**設定**: `ruff.toml` でルール調整可能

### ⚪ 変更検知の問題

#### 症状: 変更したのにCIが実行されない

**診断**:
```bash
# detect-changes ログを確認
# GitHub Actions → detect-changes job → logs

# パスフィルター定義確認
cat .github/workflows/detect-changes.yml | grep -A 10 "filters:"
```

**解決方法**:
1. パスが正しいか確認: `mcp_servers/*/` パターンに一致するか
2. `.github/workflows/detect-changes.yml` のパスフィルター更新
3. 強制実行: `workflow_dispatch` で手動トリガー

#### 症状: 変更していないのにCIが実行される

**原因**: ルート設定変更 (package.json, .github/workflows/**)

**動作**: 正常 - CRITICAL変更として全サーバーCI実行

**回避**: 部分的な設定変更は避け、まとめて実行

### 🟣 並列実行の問題

#### 症状: ジョブが並列実行されない

**診断**:
```yaml
# GitHub Actions UIで確認
# 同じジョブが順次実行されている場合
```

**原因**: concurrency group設定が厳しすぎる

**解決方法**:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}-${{ matrix.server }}
  cancel-in-progress: true
```

#### 症状: リソース不足エラー

**原因**: GitHub Actions の並列実行上限 (max 20 jobs)

**解決方法**:
- `max-parallel` 設定を追加:
  ```yaml
  strategy:
    max-parallel: 10
    matrix: ...
  ```

---

## デバッグ手順

### 1. ログの読み方

**GitHub Actions UI**:
```
Actions タブ → 該当ワークフロー → 失敗したジョブ → Logs
```

**重要なログセクション**:
- `Set up job`: 環境セットアップ
- `Checkout`: コードチェックアウト
- `Install dependencies`: キャッシュヒット、インストール時間
- `Build`: ビルドエラーメッセージ
- `Test`: テスト結果
- `Post job`: キャッシュ保存

### 2. ローカル再現

```bash
# CIと同じ環境を再現
git clone <repo>
cd <repo>/<server>

# 依存関係インストール
npm ci  # またはpnpm/bunを使用

# ビルド
npm run build

# テスト
npm test
```

### 3. GitHub Actions Debugモード

```bash
# リポジトリシークレットに追加
ACTIONS_RUNNER_DEBUG: true
ACTIONS_STEP_DEBUG: true
```

再実行すると詳細ログが表示されます。

---

## エラーメッセージ対応表

| エラーメッセージ | 意味 | 対処法 |
|---------------|------|--------|
| `Error: Process completed with exit code 1` | ビルド/テスト失敗 | ログで具体的なエラー確認 |
| `Error: Unable to locate executable file: npm` | Node.js未インストール | setup-node アクション追加 |
| `Error: Cache not found` | キャッシュミス | 初回実行は正常、2回目も出る場合はキー確認 |
| `Error: Resource not accessible by integration` | Permission不足 | workflow permissions 設定確認 |
| `Error: API rate limit exceeded` | GitHub API制限 | GITHUB_TOKEN 権限確認、待機 |

---

## サポート

**ドキュメント**:
- クイックスタート: `claudedocs/QUICK_START_CI.md`
- アーキテクチャ: `docs/ci-cd-architecture.md`
- 変更検知詳細: `claudedocs/detect-changes-workflow.md`

**デバッグツール**:
- ワークフロー検証: `.github/scripts/validate-workflow.sh`
- yamllint: `yamllint .github/workflows/`

**GitHub Issues**: 解決しない場合は Issue を作成してください。

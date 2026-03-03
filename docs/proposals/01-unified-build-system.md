# 提案1: 統一ビルドシステムの設計

## エグゼクティブサマリー

**決定: pnpm workspaces + Turborepo**

- パッケージマネージャー統一により、CI時間を30-40%短縮
- Turborepoによるキャッシュで、変更のないパッケージのビルドをスキップ
- 移行コスト: 2-3営業日、リスク: 低

---

## パッケージマネージャー選定

### 現状の問題点

| 問題 | 影響 |
|------|------|
| 3種類のパッケージマネージャー (npm, pnpm, bun) | CI検出ロジックが複雑、キャッシュ戦略が分散 |
| 7つの異なるロックファイル | マージコンフリクト頻発、依存関係の一貫性なし |
| 開発者ごとに異なる環境 | "works on my machine" 問題 |

### 候補比較

| 項目 | npm workspaces | pnpm workspaces | Bun workspaces | Yarn Berry PnP |
|------|----------------|-----------------|----------------|----------------|
| **Windows互換性** | ✅ 完全 | ✅ 完全 | ⚠️ 実験的 | ✅ 完全 |
| **インストール速度** | 遅い (60s) | 高速 (15s) | 最速 (5s) | 高速 (20s) |
| **ディスク効率** | ❌ 重複多い | ✅ ハードリンク | ✅ シンボリックリンク | ✅ Zip PnP |
| **Monorepo機能** | 基本的 | ✅ 強力 | 基本的 | ✅ 強力 |
| **CI互換性** | ✅ 完全 | ✅ 完全 | ⚠️ GitHub Actions不安定 | ⚠️ 設定複雑 |
| **MCP SDK互換性** | ✅ 完全 | ✅ 完全 | ⚠️ TypeScript ESM問題あり | ⚠️ PnPモード問題あり |
| **学習コスト** | 低 | 低 | 中 | 高 (PnP概念) |
| **コミュニティ** | 最大 | 大きい | 成長中 | 中規模 |

### 決定理由: pnpm workspaces

1. **Windows環境で実績あり** - 現環境 (win32) で安定動作
2. **CI最適化** - GitHub ActionsでのAction公式サポート (`pnpm/action-setup@v4`)
3. **ディスク効率** - `~/.pnpm-store`で全プロジェクト共通の依存を共有
4. **npmとの互換性** - `package.json` スクリプトはそのまま動作
5. **Monorepo特化** - フィルタリング機能 (`pnpm --filter`)が強力
6. **Turborepoとの相性** - 公式推奨

**Bunを選ばない理由:**
- Windows環境で安定性に欠ける (2026年3月時点)
- GitHub Actionsでのキャッシュがまだ成熟していない
- MCP SDK (TypeScript ESM) でのエッジケース報告あり

---

## Turborepo導入

### なぜTurborepo?

| 機能 | 説明 | 効果 |
|------|------|------|
| **リモートキャッシュ** | ビルド成果物をVercel/S3にキャッシュ | CI時間50%削減 |
| **インクリメンタルビルド** | 変更のないパッケージはスキップ | ローカル開発の体感速度向上 |
| **依存関係グラフ** | `turbo.json`で並列実行を自動最適化 | 手動並列化不要 |
| **タスクパイプライン** | `build → test → lint` の順序を自動制御 | ワークフロー簡素化 |

### turbo.json 設計例

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "tsconfig.json",
    ".env"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", "plugin/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### ルート package.json

```json
{
  "name": "mcp-server-collection",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "mcp_servers/*",
    "tools/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "build:affected": "turbo run build --filter='...[HEAD^1]'",
    "test": "turbo run test",
    "test:affected": "turbo run test --filter='...[HEAD^1]'",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev --parallel",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "turbo run build && changeset publish"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.4.0",
    "@changesets/cli": "^2.27.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.2",
  "engines": {
    "node": ">=18",
    "pnpm": ">=9"
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'mcp_servers/*'
  - 'tools/*'
```

---

## 移行プラン

### Phase 1: 準備 (1日)

```bash
# 1. pnpmインストール
npm install -g pnpm@9

# 2. ルート設定ファイル作成
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'mcp_servers/*'
  - 'tools/*'
EOF

# 3. .npmrc設定 (Windows path長制限対策)
cat > .npmrc << 'EOF'
shamefully-hoist=false
strict-peer-dependencies=false
auto-install-peers=true
node-linker=hoisted
public-hoist-pattern[]=*@modelcontextprotocol*
EOF
```

### Phase 2: 個別パッケージ移行 (1日)

```bash
# 各サーバーで実行
cd mcp_servers/claude-mem
rm -rf node_modules package-lock.json
pnpm install

# 動作確認
pnpm run build
pnpm run test

# 次のサーバーへ (9サーバー並列で実行可能)
```

### Phase 3: Turborepo統合 (0.5日)

```bash
# ルートでTurborepoインストール
pnpm add -Dw turbo

# turbo.json作成 (上記の設定)
# 各サーバーのpackage.jsonにoutputsを追加
```

### Phase 4: CI更新 (0.5日)

```yaml
# .github/workflows/ts-mcp-ci.yml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9

- name: Get pnpm store directory
  shell: bash
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-

- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Build affected packages
  run: pnpm turbo run build --filter='...[HEAD^1]'
```

---

## 期待効果

### パフォーマンス

| 指標 | 現状 | 移行後 | 改善率 |
|------|------|--------|--------|
| ローカルビルド (全体) | 120秒 | 40秒 | 67%↑ |
| CI初回実行 | 8分 | 5分 | 38%↑ |
| CIキャッシュヒット時 | 5分 | 2分 | 60%↑ |
| `npm install` 時間 | 60秒 | 15秒 | 75%↑ |

### 開発者体験

- ✅ 単一コマンドで全サーバービルド: `pnpm build`
- ✅ 変更されたサーバーのみテスト: `pnpm test:affected`
- ✅ ロックファイルコンフリクト90%削減
- ✅ ディスク使用量50%削減 (重複依存の排除)

---

## リスクとロールバック

### リスク

| リスク | 確率 | 影響 | 軽減策 |
|--------|------|------|--------|
| Windows pathmax超過 | 低 | 中 | `node-linker=hoisted` で回避 |
| MCP SDK互換性問題 | 低 | 高 | 事前に全サーバーで動作確認 |
| 開発者の学習コスト | 中 | 低 | ドキュメント + Slack説明会 |

### ロールバック手順

```bash
# 各サーバーで元の package manager に戻す
cd mcp_servers/claude-mem
rm -rf node_modules pnpm-lock.yaml
npm install  # or bun install

# ルートからTurborepo削除
pnpm remove -Dw turbo
rm turbo.json pnpm-workspace.yaml
```

---

## 次のステップ

1. ✅ この提案をチームレビュー
2. 📅 feature/unified-build ブランチで実装
3. 🧪 全MCPサーバーのE2Eテスト (Claude Desktop接続確認)
4. 📊 パフォーマンス測定 (Before/After)
5. 🚀 mainブランチへマージ

**実装優先度: 🔴 CRITICAL** - 他の提案(CI/CD再設計、テスト戦略)の前提条件

# infra — Google 公式 Workspace MCP（IaC）

Google 公式の Workspace MCP（Developer Preview / Streamable HTTP のリモート MCP / OAuth 2.0）を
Claude Code・Codex・Gemini CLI・Claude Desktop に配置するための宣言的設定。

```
infra/
  mcp/servers.yaml               単一の真実（server key = google-<product>, url, scopes, targets, gcp_services, client_id, callback_port）
  mcp/apply.mjs                  servers.yaml → 各クライアント設定（google-* キーだけを冪等マージ）
  mcp/secrets.sops.yaml.example  client_secret の SOPS テンプレート（実ファイル secrets.sops.yaml は暗号化済みのみコミット可）
  terraform/gcp/                 GCP API 有効化（標準 API + *mcp.googleapis.com）
../.sops.yaml                    SOPS creation rule（age 公開鍵はプレースホルダ）
../configs/codex/google-workspace.toml  生成物（Codex 用スニペット）
../configs/connectors.md                生成物（Claude Desktop / claude.ai 手動チェックリスト）
```

## エンドポイント

| server key | URL | 既定 |
|---|---|---|
| google-gmail | `https://gmailmcp.googleapis.com/mcp/v1` | 有効 |
| google-drive | `https://drivemcp.googleapis.com/mcp/v1` | 有効 |
| google-docs | `https://docsmcp.googleapis.com/mcp/v1` | 有効 |
| google-sheets | `https://sheetsmcp.googleapis.com/mcp/v1` | 有効 |
| google-calendar | `https://calendarmcp.googleapis.com/mcp/v1` | 有効 |
| google-slides / google-chat / google-classroom | `https://{slides,chat,classroom}mcp.googleapis.com/mcp/v1` | 無効 |
| google-people | `https://people.googleapis.com/mcp/v1` | 無効 |
| google-workspace（統合検索） | `https://workspacemcp.googleapis.com/mcp/v1` | 無効 |

scope は readonly 優先。広げる場合は `servers.yaml` の該当サーバーだけを変更する。

## 前提（自動化不可・手動）

1. **Google Workspace Developer Preview Program** への参加（Workspace MCP は Developer Preview。未参加だと接続できない）。
2. GCP プロジェクトで API を有効化: `terraform -chdir=infra/terraform/gcp init && terraform -chdir=infra/terraform/gcp apply -var project_id=<id>`
   （`plan` / `apply` は認証済み gcloud ADC が必要。CI は `fmt` / `validate` のみ）。
3. **OAuth 同意画面 + OAuth クライアントの作成は Terraform 非対応のため手動**:
   1. Google Cloud Console > Google Auth Platform > Clients > Create client。種類は **Web application**。
   2. **「Use this client for an AI-powered agent」(is_agentic) にチェック**を入れる。
   3. Authorized redirect URIs に**次を正確に**登録する（`<port>` は `servers.yaml` の `oauth.callback_port`、既定 8765）:
      - `https://claude.ai/api/mcp/auth_callback`（Claude Desktop / claude.ai Connectors）
      - `http://localhost:<port>/callback`（Claude Code）
      - `http://127.0.0.1:<port>/callback`（Codex 等 loopback IP を使うクライアント）
      - `http://localhost:<port>/oauth/callback`（Gemini CLI の既定コールバックパス。**UNVERIFIED**: Gemini CLI 実機で要確認）
   4. 作成された **client_id** を `infra/mcp/servers.yaml` の `oauth.client_id` に書き（client_id は秘密ではない）、
      `node infra/mcp/apply.mjs --apply` を実行する。
      **client_id がプレースホルダ（`YOUR_CLIENT_ID.apps.googleusercontent.com`）のままの間は、`.mcp.json` / Gemini / Codex スニペットに
      google-* エントリを一切出力しない**（存在しないクライアントで接続を試みないため）。`--apply --home` はエラー（exit 1）で止まる。
      `configs/connectors.md` と Terraform はプレースホルダでも生成・利用できる。
   5. **client_secret** は SOPS で暗号化して保存（下記）。
4. 同意画面が **External かつ Publishing status = Testing** の場合、**refresh token は 7 日で失効**する。
   週次で再ログインが必要。恒常運用するなら Internal（Workspace 組織内）にするか公開審査を通す。

## シークレット（client_secret のみ）

```sh
# 1. .sops.yaml の age1REPLACE_... を自分の age 公開鍵に置き換える
# 2. 暗号化ファイルを sops で直接作成・編集する（保存時に暗号化される。平文ファイルを作らない）
sops edit infra/mcp/secrets.sops.yaml     # 中身は secrets.sops.yaml.example と同じ形: GOOGLE_MCP_CLIENT_SECRET: <secret>
```

- `secrets.sops.yaml.example` を `secrets.sops.yaml` に **cp しない**（平文のままコミットされる危険がある）。
  どうしても cp する場合は直後に `sops --encrypt --in-place infra/mcp/secrets.sops.yaml` を実行してから値を入れる。
- 平文の取り違え対策: 復号済みの別名（`infra/mcp/secrets.yaml`、`*.dec.yaml`、`*.decrypted.*`）は `.gitignore` 済み。
  `secrets.sops.yaml` 自体は暗号化版をコミットする前提なので無視できない。代わりにテスト（`tests/infra-apply.test.mjs`）が
  「ファイルが存在するならトップレベルに `sops:` があり、全ての値が `ENC[` で始まる」ことを CI で検査する。
- 平文の secret を**ファイルにも argv にも置かない**。ログイン/起動時に環境変数として注入する（下記レシピ）。
- `apply.mjs` は secret を一切出力しない。生成物には `${GOOGLE_MCP_CLIENT_SECRET}` という**環境変数参照**だけが入る（Gemini）。
  自分が生成するエントリに secret らしき値（`GOCSPX-...`、`client_secret = "..."`、環境変数の実値）があれば、対象ファイル名を示して書き込みを拒否する。
- **OS キーチェーンに保存されるとは限らない**。Windows の Claude Code は OAuth トークン/クライアント secret を
  `~/.claude/.credentials.json`（平文 JSON、ユーザープロファイルのファイル権限のみで保護）に保存する。Mac の保存先は本 IaC では未検証（UNVERIFIED）。
  Gemini CLI も `~/.gemini/` 配下にトークンを保存する。これらは本リポジトリにコミットしないこと。

### secret の注入レシピ

Windows（PowerShell）— 値は sops の標準出力からセッションの環境変数に入るだけで、ファイルにも argv にも出ない:

```powershell
$env:GOOGLE_MCP_CLIENT_SECRET = sops decrypt --extract '["GOOGLE_MCP_CLIENT_SECRET"]' infra/mcp/secrets.sops.yaml
$env:MCP_CLIENT_SECRET = $env:GOOGLE_MCP_CLIENT_SECRET   # Claude Code の --client-secret が読む名前
claude    # または gemini
Remove-Item Env:GOOGLE_MCP_CLIENT_SECRET, Env:MCP_CLIENT_SECRET   # 終わったら消す
```

Mac / Linux（POSIX シェル）:

```sh
sops exec-env infra/mcp/secrets.sops.yaml 'MCP_CLIENT_SECRET="$GOOGLE_MCP_CLIENT_SECRET" claude'   # または gemini
```

## 適用

```sh
node infra/mcp/apply.mjs --check          # CI と同じ。リポジトリ内生成物の google-* 部分だけを検査（OS 非依存）
node infra/mcp/apply.mjs --apply          # .mcp.json / configs/codex/google-workspace.toml / configs/connectors.md を生成
node infra/mcp/apply.mjs --apply --home   # さらに ~/.gemini/settings.json にマージ（変更時のみ .bak-<時刻>-<pid> を作成）
node infra/mcp/apply.mjs --check --home   # ホーム側も検査
```

- マージ対象は **`google-` で始まるキーのみ**。それ以外の内容はバイト単位で保持する（`tests/infra-apply.test.mjs` の
  CRLF・4 スペースインデントの fixture で「適用→google-* 除去で元ファイルと一致」を検査）。冪等。書き込みは一時ファイル + rename。
- JSON はコメント付き（JSONC）や重複した `mcpServers` キーがあると解析を拒否する（壊さないため）。エラーには行・列だけを出し、内容は出さない。
- **`~/.codex/config.toml` には書き込まない**（下記 Codex 参照）。生成するのはレビュー用スニペット
  `configs/codex/google-workspace.toml` のみ。

## クライアント別のログインと scope 強制

| クライアント | 設定の場所 | scope の強制方法 | ログイン |
|---|---|---|---|
| Claude Code | プロジェクト `.mcp.json`（`type:"http"`, `oauth.clientId` / `oauth.callbackPort` / `oauth.scopes`＝空白区切り文字列） | `oauth.scopes` | 上記レシピで secret を注入して起動し `/mcp` から認証（**UNVERIFIED**: `.mcp.json` 定義サーバーで `MCP_CLIENT_SECRET` が読まれるかは実機確認要。効かない場合は同じ環境で `claude mcp add --transport http --client-id <id> --client-secret --callback-port <port> <name> <url>` を実行。ただしこれは local スコープに登録され、下記のとおりプロジェクト定義を上書きする） |
| Codex | **自動では書き込まない**。`configs/codex/google-workspace.toml` を検証後に手で `~/.codex/config.toml` へコピー | `codex mcp login <name> --scopes <comma-separated>`（スニペットのコメント参照） | **UNVERIFIED**: Codex が事前登録 client_id（非 DCR）を受け付けるか、`--scopes` の書式は公式ドキュメントで未確認 |
| Gemini CLI | `~/.gemini/settings.json`（`httpUrl` + `oauth{enabled, clientId, clientSecret:"${GOOGLE_MCP_CLIENT_SECRET}", scopes[], redirectUri}`） | `oauth.scopes` | 上記レシピで `gemini` を起動し `/mcp auth <name>` |
| Claude Desktop / claude.ai | アカウント単位（Settings > Connectors > Add custom connector、**手動**） | **なし**（コネクタ側で scope 指定不可。クライアント許可画面で要求されたものになる） | `configs/connectors.md` のチェックリストに従う |

### 注意点

- **プロジェクトスコープの `.mcp.json`** のサーバーは、通常は Claude Code 初回起動時に承認が必要。ただしこのリポジトリのように
  `enableAllProjectMcpServers: true` が設定されている環境では**承認プロンプトは出ず自動で有効**になる。
- `claude mcp add`（local / user スコープ）で同名のサーバーを登録すると、**プロジェクト `.mcp.json` の定義より優先され、こちらが隠れる**。
  `claude mcp list` で実際にどの定義が使われているか確認すること。
- **既存の claude.ai Google Drive コネクタと重複**する。claude.ai 側で接続済みの Google Drive コネクタ
  （`mcp__claude_ai_Google_Drive__*`）と `google-drive` はツールが重複するので、どちらかを無効化するか用途を分けること。
  Gmail / Calendar の claude.ai コネクタも同様。
- **Claude Desktop はアカウントレベル**の Connectors で設定する（ローカル JSON では設定しない）。そのため OS 別の生成物は作らず
  `configs/connectors.md` を 1 つだけ生成する。
- `configs/mac/claude_desktop_config.json` は**古いサンプル**で、本 IaC の対象外（更新されない）。
- Workspace MCP は Developer Preview のため、エンドポイント・必要 scope は変更されうる。scope は**UNVERIFIED**（実機で最小 scope を確認すること）。

## Terraform

`infra/terraform/gcp` は `servers.yaml` を `yamldecode` し、`enabled: true` のサーバーの `gcp_services`
（標準 API + `*mcp.googleapis.com`）を `google_project_service` で有効化する。`disable_on_destroy = false`
なので `destroy` しても API は無効化されない。state（`*.tfstate*`）と `.terraform/` は `.gitignore` 済み。

```sh
terraform -chdir=infra/terraform/gcp init -backend=false && terraform -chdir=infra/terraform/gcp validate   # CI と同じ
```

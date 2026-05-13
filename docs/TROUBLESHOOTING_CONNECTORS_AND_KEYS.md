# コネクタ・APIキー トラブルシューティング

Claude デスクトップでよくある「再接続」「トークン確認」「キー未解決」の対処手順です。

---

## 1. GitHub — コネクタの再接続（再認証）

**現象**: GitHub 連携が切れた、認証エラーが出る。

**手順**:
1. Claude デスクトップアプリを開く
2. **設定**（歯車アイコン）→ **Integrations** または **コネクタ**
3. **GitHub** の項目で **再接続** または **再認証** をクリック
4. ブラウザで GitHub の認可画面が出たら **Authorize** を許可
5. Claude を再起動し、GitHub ツールが使えるか確認

**MCP で GitHub を使っている場合**  
設定で `GITHUB_PERSONAL_ACCESS_TOKEN` を参照している場合は、[GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) でトークンを再発行し、環境変数または設定の値を更新してください。

---

## 2. Brave Search — API トークンの確認・更新

**現象**: Brave Search が動かない、API エラーになる。

**手順**:
1. [Brave Search API ダッシュボード](https://brave.com/search/api/) にアクセス
2. ログインして **有効なサブスクリプション** と **API キー** を確認
3. キーをコピーし、次のいずれかで設定:
   - **環境変数**: ターミナルで  
     `export BRAVE_API_KEY="あなたのキー"`  
     （恒久化する場合は `~/.zshrc` や `~/.bash_profile` に追加）
   - **Claude 設定**: `claude_desktop_config.json` の `mcpServers.brave-search.env.BRAVE_API_KEY` を  
     `"${BRAVE_API_KEY}"` のままにする場合は、上記の環境変数が読み込まれるようにする
4. Claude デスクトップを再起動

---

## 3. Google Analytics — GOOGLE_PRIVATE_KEY のフォーマット

**現象**: `GOOGLE_PRIVATE_KEY` のフォーマットエラー、認証失敗。

**原因**: サービスアカウントの秘密鍵（JSON 内の `private_key`）を設定する際、改行が失われたりエスケープが壊れたりしていることが多いです。

**手順**:
1. [Google Cloud Console](https://console.cloud.google.com/) → 対象プロジェクト → **IAM と管理** → **サービス アカウント**
2. 該当サービスアカウント → **キー** → **鍵を追加** → **新しい鍵を作成** → **JSON** でダウンロード
3. ダウンロードした JSON を開き、`private_key` の値をコピー（`-----BEGIN PRIVATE KEY-----` から `-----END PRIVATE KEY-----` まで全体、改行を含む）
4. 環境変数に設定する場合:
   - **改行をそのまま使う**: シェルでは複数行を扱いづらいため、多くの場合は次の方法を使います
   - **改行を `\n` に置換**: 鍵の中の実際の改行を、文字列 `\n` に置き換えて1行にする  
     例: `export GOOGLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----'`
5. 同様に `GOOGLE_CLIENT_EMAIL` と `GA_PROPERTY_ID` も JSON および GA4 プロパティから取得して設定
6. Claude デスクトップを再起動

---

## 4. Notion API（2つ目のインテグレーション含む）— トークン再発行

**現象**: Notion MCP が 401 / 認証エラーになる。

**手順**:
1. [Notion マイ インテグレーション](https://www.notion.so/my-integrations) を開く
2. 該当インテグレーション（または2つ目を使う場合はそのインテグレーション）を選択
3. **新しいトークンを発行** または **シークレットの再表示** でトークンをコピー
4. 設定の更新（@notionhq/notion-mcp-server v2 以降）:
   - **環境変数で渡す場合**:  
     `export NOTION_TOKEN="secret_xxxx"`  
     かつ、`claude_desktop_config.json` の Notion 用エントリで  
     `"NOTION_TOKEN": "${NOTION_TOKEN}"` を設定
   - **直接書く場合**（非推奨）:  
     `"NOTION_TOKEN": "secret_あなたのトークン"` を設定（環境変数推奨）
   - **v1 の `OPENAPI_MCP_HEADERS` は v2 で廃止**。残っている場合は `NOTION_TOKEN` に置換
5. 使うページ・データベースで、そのインテグレーションに「アクセスを許可」しているか確認
6. Claude デスクトップを再起動

---

## 5. Cipher — OPENAI_API_KEY が未解決（${OPENAI_API_KEY} のまま）

**現象**: Cipher MCP の設定で `OPENAI_API_KEY` が `${OPENAI_API_KEY}` のまま展開されずエラーになる。

**対応（推奨）**: このリポジトリでは、Cipher 用に **`.env` を読み込む MCP 起動ラッパー** を用意しています。

1. **Cipher のディレクトリ**（例: `/Users/tmf58/Documents/cipher/`）に `.env` を作成
2. 次のように **実際の OpenAI API キー** を書く:  
   `OPENAI_API_KEY=sk-xxxxxxxx`  
   （`${OPENAI_API_KEY}` のままにしない）
3. `.mcp.json` で Cipher の `command` が `bash`、`args` が `["/Users/tmf58/Documents/cipher/run-mcp.sh"]` になっていることを確認（ラッパーが `.env` を読み込んでから `npx @byterover/cipher --mode mcp` を実行します）
4. まだラッパーを使っていない場合は、上記の通り `run-mcp.sh` を使う設定に変更する

**別案（環境変数で渡す）**:  
Claude デスクトップを起動する前に、ターミナルで  
`export OPENAI_API_KEY=sk-xxxxxxxx`  
を実行するか、`~/.zshrc` 等に書いておく。その場合でも、Cipher の `env` で `"OPENAI_API_KEY": "${OPENAI_API_KEY}"` としていれば、シェルから起動したときは展開されます。

---

## 6. Google Drive — コネクタの再接続

**現象**: Google Drive 連携が切れた、ファイル検索ができない。

**手順**:
1. Claude デスクトップアプリを開く
2. **設定** → **Integrations** / **コネクタ**
3. **Google Drive** の **再接続** をクリック
4. ブラウザで Google アカウントの認可を行い、Claude に戻る
5. Claude を再起動し、Google Drive が使えるか確認

---

## 設定ファイルの場所（参考）

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- 本リポジトリのサンプル: `configs/mac/claude_desktop_config.json`

環境変数は、Claude デスクトップを **どの環境から起動したか** で変わります。GUI から起動している場合は、`~/.zshrc` や `~/.bash_profile` で export しておくか、ランチャー／ラッパーで明示的に環境変数を読み込んでから Claude を起動してください。

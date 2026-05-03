# MCPサーバーセットアップガイド

このドキュメントでは、プロジェクトに統合されているMCPサーバーのセットアップ方法を説明します。

## 統合済みMCPサーバー

### 1. Chrome DevTools MCP

Chrome DevTools Protocolを使用してブラウザを操作できるMCPサーバーです。

#### セットアップ

1. **Chromeをリモートデバッグモードで起動**

   - **Windows:**
     ```powershell
     & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
     ```

   - **macOS:**
     ```bash
     /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
     ```

   - **Linux:**
     ```bash
     google-chrome --remote-debugging-port=9222
     ```

2. **設定確認**

   `.mcp.json`に以下の設定が含まれています：

   ```json
   "chrome-devtools": {
     "type": "stdio",
     "command": "npx",
     "args": ["-y", "chrome-devtools-mcp@latest"],
     "env": {}
   }
   ```

3. **使用方法**

   MCPクライアントから以下のようなコマンドを実行できます：
   - パフォーマンス分析
   - ページのスクリーンショット取得
   - コンソールログの取得
   - ネットワークリクエストの監視

#### 参考リンク

- [GitHub: ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)

---

### 2. Claude Mem

Claude Codeのセッション間でコンテキストを永続化するメモリ圧縮システムです。

#### セットアップ

1. **インストール済み**

   プロジェクトの`mcp_servers/claude-mem`ディレクトリにクローン済みです。

2. **ビルド済み**

   以下のコマンドでビルド済みです：
   ```bash
   cd mcp_servers/claude-mem
   npm install
   npm run build
   ```

3. **設定確認**

   `.mcp.json`に以下の設定が含まれています：

   ```json
   "claude-mem": {
     "type": "stdio",
     "command": "node",
     "args": ["d:\\work\\mcp_server\\mcp_servers\\claude-mem\\plugin\\scripts\\mcp-server.cjs"],
     "env": {}
   }
   ```

4. **使用方法**

   - セッション間でコンテキストを自動的に保存・圧縮
   - 過去の会話を検索可能
   - 知識グラフの構築

#### 参考リンク

- [GitHub: thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)

---

### 3. Context7 (Upstash)

最新のライブラリドキュメントとコード例を取得できるMCPサーバーです。

#### セットアップ

1. **APIキーの取得**

   [context7.com/dashboard](https://context7.com/dashboard)で無料アカウントを作成し、APIキーを取得します。

2. **環境変数の設定**

   `.mcp.json`の`context7`セクションで、`env`オブジェクトにAPIキーを設定します：

   ```json
   "context7": {
     "type": "stdio",
     "command": "npx",
     "args": [
       "-y",
       "@upstash/context7-mcp",
       "--api-key",
       "${CONTEXT7_API_KEY}"
     ],
     "env": {
       "CONTEXT7_API_KEY": "YOUR_API_KEY_HERE"
     }
   }
   ```

   または、環境変数として設定：

   ```powershell
   # Windows PowerShell
   $env:CONTEXT7_API_KEY = "YOUR_API_KEY_HERE"
   ```

   ```bash
   # Linux/macOS
   export CONTEXT7_API_KEY="YOUR_API_KEY_HERE"
   ```

3. **使用方法**

   MCPクライアントから以下のようなコマンドを実行できます：
   - 最新のライブラリドキュメントの取得
   - コード例の検索
   - フレームワーク固有の情報の取得

#### 参考リンク

- [GitHub: mcp/upstash/context7](https://github.com/mcp/upstash/context7)
- [Context7 インストールガイド](https://context7.com/docs/installation)

---

### 4. Figma MCP Server

Figmaデザインファイルからコンテキストを取得し、コード生成を支援するMCPサーバーです。

#### セットアップ

1. **Figmaデスクトップアプリの準備**

   - Figmaデスクトップアプリを最新版に更新
   - デザインファイルを開く
   - Dev Modeに切り替え（`Shift + D`）
   - インスペクトパネルで「Enable desktop MCP server」をクリック

2. **サーバーの起動確認**

   サーバーが`http://127.0.0.1:3845/mcp`で起動していることを確認します。

3. **設定確認**

   `.mcp.json`に以下の設定が含まれています：

   ```json
   "figma-desktop": {
     "type": "sse",
     "url": "http://127.0.0.1:3845/mcp"
   }
   ```

4. **使用方法**

   - Figmaでフレームやレイヤーを選択
   - MCPクライアントに「選択中のデザインを実装して」と指示
   - または、FigmaのURLを提供してデザインを実装

#### アクセス制限

- **StarterプランまたはView/Collabシート**: 月6回まで
- **Dev/Fullシート（Professional/Organization/Enterprise）**: 分単位のレート制限

#### 参考リンク

- [Figma MCP Server ドキュメント](https://developers.figma.com/docs/figma-mcp-server/)

---

### 5. Storybook MCP

[Storybook](https://storybook.js.org/) の AI 機能（manifests と MCP）に接続し、コンポーネント一覧・ドキュメント・ストーリー作成支援・テスト実行などのツールをエージェントから使えます。**現状は React プロジェクトが前提**（[プレビュー機能](https://storybook.js.org/docs/releases/features#preview)）。

#### セットアップ

1. **対象プロジェクト（React + Storybook）でアドオンを追加**

   ```bash
   npx storybook add @storybook/addon-mcp
   ```

2. **Storybook を起動**

   デフォルトでは `http://localhost:6006` で dev サーバーが立ち上がり、MCP は **`http://127.0.0.1:6006/mcp`**（ポートは `--port` や設定で変わる場合あり）。

3. **Cursor の設定**

   リポジトリの `.mcp.json` に以下が含まれています（ポートを変えた場合は `url` を合わせて変更してください）。

   ```json
   "storybook": {
     "type": "sse",
     "url": "http://127.0.0.1:6006/mcp"
   }
   ```

4. **利用前の確認**

   - ブラウザで `http://127.0.0.1:6006/mcp` を開き、ツール一覧が表示されることを確認
   - MCP を使うときは **Storybook の dev サーバーが起動したまま**にする

#### 参考リンク

- [MCP server（概要・ツール一覧）](https://storybook.js.org/docs/ai/mcp/overview)
- [Self-host / `@storybook/mcp` パッケージ](https://github.com/storybookjs/mcp/blob/main/packages/mcp/README.md)（独自 HTTP サーバーに組み込む場合）

---

### 6. grepai

コードの意味に基づくセマンティック検索とコールグラフ追跡を提供するMCPサーバーです。自然言語でコードを検索し、関数の呼び出し元・呼び出し先を追跡できます。100%ローカル（Ollama）またはクラウド（OpenAI）のEmbedderに対応しています。

#### セットアップ

1. **grepaiのインストール**

   grepaiは単一バイナリのCLIです。バイナリはユーザーが各自インストールする前提で、リポジトリには含めません。

   - **Linux / macOS / Git Bash / WSL:**
     ```bash
     curl -sSL https://raw.githubusercontent.com/yoanbernabeu/grepai/main/install.sh | sh
     ```
   - **Windows（PowerShellでは上記が使えない場合）:**
     - [GitHub Releases](https://github.com/yoanbernabeu/grepai/releases) から `grepai_*_windows_amd64.zip`（または該当アーキテクチャ）をダウンロード
     - 解凍して `grepai.exe` をPATHの通ったフォルダに配置

2. **プロジェクトの初期化とインデックス**

   検索対象のプロジェクトのルートで以下を実行します。

   ```bash
   cd <プロジェクトルート>
   grepai init
   grepai watch
   ```

   `grepai watch` はファイル変更を監視してインデックスを更新します。MCPで検索を使う前に、**一度は `grepai watch` を実行**（またはバックグラウンドで常時起動）してインデックスを作成してください。

   - バックグラウンド実行の例（別ターミナル）:
     ```bash
     grepai watch
     ```

3. **Embedder（任意）**

   セマンティック検索にはEmbedderの設定が必要です。プロジェクトルートの `.grepai/config.yaml` で指定します。

   - **ローカル（Ollama・推奨）:** 事前に [Ollama](https://ollama.com/) をインストールし、`nomic-embed-text` を用意した上で:
     ```yaml
     # .grepai/config.yaml
     embedder:
       provider: ollama
       model: nomic-embed-text
     ```
   - **クラウド（OpenAI）:** APIキーが必要です。詳細は[公式ドキュメント（Embedders）](https://yoanbernabeu.github.io/grepai/backends/embedders/)を参照してください。

4. **MCP設定**

   **Cursor（`.mcp.json` またはプロジェクトの `.mcp.json`）:**

   ```json
   "grepai": {
     "type": "stdio",
     "command": "grepai",
     "args": ["mcp-serve", "${workspaceFolder}"],
     "env": {}
   }
   ```

   `${workspaceFolder}` はCursorが開いているワークスペースのパスに解決されます。Windowsではプロジェクトパスを明示する場合、`"args": ["mcp-serve", "D:\\work\\mcp_server"]` のように指定することもできます。

   **Claude Desktop（`claude_desktop_config.json`）:**

   ```json
   "grepai": {
     "command": "grepai",
     "args": ["mcp-serve", "D:\\work\\mcp_server"]
   }
   ```

   利用するプロジェクトに合わせて `args` のパスを書き換えてください。

5. **利用可能なツール**

   | ツール名 | 説明 |
   |----------|------|
   | `grepai_search` | 自然言語によるセマンティックコード検索 |
   | `grepai_trace_callers` | 指定シンボルを呼び出している関数を検索 |
   | `grepai_trace_callees` | 指定シンボルが呼び出している関数を検索 |
   | `grepai_trace_graph` | シンボル周辺のコールグラフを構築 |
   | `grepai_index_status` | インデックスの状態と統計を確認 |

#### 参考リンク

- [grepai 公式サイト](https://yoanbernabeu.github.io/grepai/)
- [GitHub: yoanbernabeu/grepai](https://github.com/yoanbernabeu/grepai)
- [grepai mcp-serve コマンド](https://yoanbernabeu.github.io/grepai/commands/grepai_mcp-serve/)

---

### 7. Draw.io MCP

[draw.io](https://www.draw.io) 公式の MCP サーバーです。LLM が draw.io エディタで図を開いたり作成したりできるようにします。XML（draw.io ネイティブ）、CSV（組織図・フローチャート等）、Mermaid.js 形式をサポートし、URL からコンテンツを取得することもできます。

#### セットアップ

1. **インストール（npx 推奨）**

   追加のインストールは不要です。`npx @drawio/mcp` で起動します。初回実行時にパッケージが取得されます。

   - グローバルインストールする場合:
     ```bash
     npm install -g @drawio/mcp
     drawio-mcp
     ```

2. **MCP設定**

   **Cursor（`.mcp.json`）:**

   ```json
   "drawio": {
     "type": "stdio",
     "command": "npx",
     "args": ["-y", "@drawio/mcp"],
     "env": {}
   }
   ```

   **Claude Desktop（`claude_desktop_config.json`）:**

   ```json
   "drawio": {
     "command": "npx",
     "args": ["-y", "@drawio/mcp"]
   }
   ```

3. **利用可能なツール**

   | ツール名 | 説明 |
   |----------|------|
   | `open_drawio_xml` | draw.io 形式の XML または XML の URL をエディタで開く |
   | `open_drawio_csv` | CSV データまたは URL を図に変換して開く（組織図・フローチャート等） |
   | `open_drawio_mermaid` | Mermaid 記法または URL を draw.io 図に変換して開く |

   各ツールでは `content`（必須）、`lightbox`（読み取り専用表示）、`dark`（"auto" / "true" / "false"）を指定できます。

4. **使用例（プロンプト）**

   - 「`open_drawio_mermaid` でユーザーログイン処理のフローチャートを作成して」
   - 「`open_drawio_csv` で CEO → CTO/CFO、CTO 配下にエンジニア 3 名の組織図を作成して」
   - 「`open_drawio_xml` で VPC とサブネット、セキュリティグループを含む AWS 構成図を作成して」

   Claude Desktop で draw.io MCP を使う場合は、プロンプトでツール名を明示するか、プロジェクトのシステム指示に「図の作成には draw.io MCP のツール（open_drawio_mermaid, open_drawio_csv, open_drawio_xml）を使用する」と追加すると確実です。

#### 参考リンク

- [draw.io](https://www.draw.io) - オンライン図エディタ
- [@drawio/mcp - npm](https://www.npmjs.com/package/@drawio/mcp)
- [GitHub: jgraph/drawio-mcp](https://github.com/jgraph/drawio-mcp)
- [Mermaid.js ドキュメント](https://mermaid.js.org/intro/)

---

### MCP Inspector によるテスト

MCP サーバーのデバッグ・テストには [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) を使用できます。

```bash
# Inspector を起動
npm run inspector

# 特定のサーバーで Inspector をテスト
npm run inspector:drawio       # Draw.io
npm run inspector:claude-mem   # Claude Mem
```

詳細は [MCP Inspector ガイド](MCP_INSPECTOR.md) を参照してください。

---

## 設定ファイルの場所

### Cursor

設定ファイル: `~/.cursor/mcp.json` または `%APPDATA%\Cursor\mcp.json`

### Claude Desktop

設定ファイル:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### プロジェクト設定

このプロジェクトの`.mcp.json`ファイルを参考に、各クライアントの設定ファイルを更新してください。

---

## トラブルシューティング

### Chrome DevTools MCP

- **問題**: Chromeに接続できない
  - **解決策**: Chromeがリモートデバッグモードで起動していることを確認。他のChromeインスタンスをすべて終了してから起動。

### Claude Mem

- **問題**: MCPサーバーが起動しない
  - **解決策**: `mcp_servers/claude-mem`ディレクトリで`npm run build`を実行してビルドを確認。

### Context7

- **問題**: APIキーエラー
  - **解決策**: APIキーが正しく設定されているか確認。環境変数または`.mcp.json`の`env`セクションを確認。

### Figma MCP

- **問題**: サーバーに接続できない
  - **解決策**: FigmaデスクトップアプリでMCPサーバーが有効になっているか確認。`http://127.0.0.1:3845/mcp`にアクセスできるか確認。

### Storybook MCP

- **問題**: Cursor から接続できない・ツールが空
  - **解決策**: 対象の React プロジェクトで `npx storybook add @storybook/addon-mcp` を実行済みか確認。Storybook の dev サーバーを起動し、`.mcp.json` の `url` のポートが実際の Storybook（例: `6006`）と一致しているか確認。

### grepai

- **問題**: 検索結果が空、または「インデックスがない」と出る
  - **解決策**: プロジェクトルートで `grepai init` を実行した後、`grepai watch` を実行してインデックスを作成・更新してください。
- **問題**: `grepai` コマンドが見つからない
  - **解決策**: grepaiバイナリをインストールし、PATHに含まれているか確認してください。Windowsの場合はReleasesからダウンロードした `grepai.exe` の配置先をPATHに追加してください。

### Draw.io MCP

- **問題**: 図が開かない、または URL が壊れる
  - **解決策**: draw.io MCP はコンテンツを圧縮して draw.io の `#create` URL を返します。LLM が URL を書き換えないよう、プロンプトで「open_drawio_* ツールを使って図を作成し、返された URL をそのまま提示して」と指定するか、プロジェクトのシステム指示に draw.io MCP の利用を明記してください。
- **問題**: npx で起動しない
  - **解決策**: Node.js と npm がインストールされ、`npx` が PATH に含まれているか確認してください。`npm install -g @drawio/mcp` でグローバルインストールし、`drawio-mcp` を command に指定する方法もあります。

---

## 追加のMCPサーバー

他のMCPサーバーを追加する場合は、[glama.ai/mcp/servers](https://glama.ai/mcp/servers)または[GitHub: modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)を参照してください。

---

## 更新履歴

- 2025-03-27: Storybook MCP（`.mcp.json` の SSE 接続とセットアップ手順）
- 2025-02-XX: Draw.io MCP統合
  - @drawio/mcp のセットアップ手順とMCP設定を追加
- 2025-02-XX: grepai MCP統合
  - grepaiセットアップ手順とMCP設定を追加
- 2025-01-XX: 初版作成
  - Chrome DevTools MCP統合
  - Claude Mem統合
  - Context7統合
  - Figma MCP Server統合

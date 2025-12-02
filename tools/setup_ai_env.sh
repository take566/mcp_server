#!/usr/bin/env bash
set -euo pipefail

echo "[AI ENV] Bootstrap start"

if ! command -v nvm >/dev/null 2>&1; then
  echo "[WARN] nvm 未検出。以下でインストールしてください:" >&2
  echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash" >&2
else
  echo "[INFO] nvm OK"
  nvm install --lts >/dev/null
fi

echo "[INFO] Global npm packages install"
npm install -g @anthropic-ai/claude-code @openai/codex @google/gemini-cli mmcp >/dev/null

echo "[INFO] mmcp agents add"
mmcp agents add claude-code codex-cli gemini-cli || true

echo "[INFO] Add MCP servers"
mmcp add context7 -- npx -y @upstash/context7-mcp || true
mmcp add playwright -- npx -y @playwright/mcp@latest || true

mmcp apply || true

echo "[INFO] 完了: 必要に応じて .gitignore に .claude/ .kiro/settings/ を追加してください (既に追加済みならOK)"
echo "[NEXT] cc-sdd 初期化例: npx cc-sdd@latest --claude --lang ja"

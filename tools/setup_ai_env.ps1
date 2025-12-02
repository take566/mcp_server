Param(
  [switch]$SkipNvm
)
Write-Host "[AI ENV] Bootstrap start" -ForegroundColor Cyan

function Install-NvmHint {
  Write-Host "[WARN] nvm-windows 未検出。以下URLからインストーラ取得:" -ForegroundColor Yellow
  Write-Host "https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor Yellow
}

if (-not $SkipNvm) {
  if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    Install-NvmHint
  } else {
    Write-Host "[INFO] nvm OK" -ForegroundColor Green
    nvm install lts | Out-Null
    nvm use lts | Out-Null
  }
} else {
  Write-Host "[INFO] nvm スキップ" -ForegroundColor DarkGray
}

Write-Host "[INFO] Global npm packages install" -ForegroundColor Green
npm install -g @anthropic-ai/claude-code @openai/codex @google/gemini-cli mmcp | Out-Null

Write-Host "[INFO] mmcp agents add" -ForegroundColor Green
mmcp agents add claude-code codex-cli gemini-cli | Out-Null

Write-Host "[INFO] Add MCP servers" -ForegroundColor Green
mmcp add context7 -- npx -y @upstash/context7-mcp | Out-Null
mmcp add playwright -- npx -y @playwright/mcp@latest | Out-Null
mmcp apply | Out-Null

Write-Host "[DONE] 基本セットアップ完了" -ForegroundColor Cyan
Write-Host "[NEXT] 仕様駆動開発初期化: npx cc-sdd@latest --claude --lang ja" -ForegroundColor Magenta
Write-Host "[CHECK] .gitignore に .claude/ と .kiro/settings/ が含まれていることを確認" -ForegroundColor Magenta

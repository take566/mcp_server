# MCP Inspector 起動スクリプト
# プロジェクトルートで実行: .\tools\inspector.ps1 [server-name]
#
# 使用例:
#   .\tools\inspector.ps1              # メニュー表示
#   .\tools\inspector.ps1 drawio       # Draw.io で Inspector 起動
#   .\tools\inspector.ps1 claude-mem   # Claude Mem で Inspector 起動

param(
    [Parameter(Position = 0)]
    [string]$Server = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $ProjectRoot

function Show-Menu {
    Write-Host ""
    Write-Host "MCP Inspector - テストするサーバーを選択してください:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. drawio          - Draw.io MCP"
    Write-Host "  2. chrome-devtools - Chrome DevTools MCP"
    Write-Host "  3. context7        - Context7 (Upstash)"
    Write-Host "  4. claude-mem      - Claude Mem (ローカル)"
    Write-Host "  5. kubernetes      - mcp-server-kubernetes"
    Write-Host "  6. inspector only  - Inspector のみ起動（サーバーは手動設定）"
    Write-Host "  q. 終了"
    Write-Host ""
    $choice = Read-Host "番号またはサーバー名を入力"
    return $choice
}

function Invoke-Inspector {
    param([string[]]$ServerArgs)
    Write-Host "実行: npx -y @modelcontextprotocol/inspector $($ServerArgs -join ' ')" -ForegroundColor Gray
    & npx -y @modelcontextprotocol/inspector @ServerArgs
}

$serverMap = @{
    "1" = "drawio"
    "2" = "chrome-devtools"
    "3" = "context7"
    "4" = "claude-mem"
    "5" = "kubernetes"
    "6" = "standalone"
    "drawio" = "drawio"
    "chrome-devtools" = "chrome-devtools"
    "context7" = "context7"
    "claude-mem" = "claude-mem"
    "kubernetes" = "kubernetes"
    "standalone" = "standalone"
}

$selected = if ($Server) { $Server.ToLower() } else { Show-Menu }
$serverName = if ($serverMap.ContainsKey($selected)) { $serverMap[$selected] } else { $selected }

switch ($serverName) {
    "drawio" {
        Invoke-Inspector "npx", "-y", "@drawio/mcp"
    }
    "chrome-devtools" {
        Write-Host "Chrome をリモートデバッグモードで起動してから実行してください:" -ForegroundColor Yellow
        Write-Host '  & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222' -ForegroundColor Gray
        Invoke-Inspector "npx", "-y", "chrome-devtools-mcp@latest"
    }
    "context7" {
        Write-Host "CONTEXT7_API_KEY が必要な場合があります。" -ForegroundColor Yellow
        Invoke-Inspector "npx", "-y", "@upstash/context7-mcp"
    }
    "claude-mem" {
        $mcpServer = Join-Path $ProjectRoot "mcp_servers\claude-mem\plugin\scripts\mcp-server.cjs"
        if (-not (Test-Path $mcpServer)) {
            Write-Host "エラー: Claude Mem が見つかりません: $mcpServer" -ForegroundColor Red
            Pop-Location
            exit 1
        }
        Invoke-Inspector "node", $mcpServer
    }
    "kubernetes" {
        $distPath = Join-Path $ProjectRoot "mcp_servers\mcp-server-kubernetes\dist\index.js"
        if (-not (Test-Path $distPath)) {
            Write-Host "ビルドが必要です: cd mcp_servers/mcp-server-kubernetes && npm run build" -ForegroundColor Yellow
            $build = Read-Host "今すぐビルドしますか? (y/n)"
            if ($build -eq "y") {
                Push-Location (Join-Path $ProjectRoot "mcp_servers\mcp-server-kubernetes")
                npm run build
                Pop-Location
            } else {
                Pop-Location
                exit 1
            }
        }
        Invoke-Inspector "node", $distPath
    }
    "standalone" {
        npx -y @modelcontextprotocol/inspector
    }
    "q" {
        Write-Host "終了しました。"
        Pop-Location
        exit 0
    }
    default {
        Write-Host "不明なサーバー: $selected" -ForegroundColor Red
        Write-Host "利用可能: drawio, chrome-devtools, context7, claude-mem, kubernetes, standalone"
        Pop-Location
        exit 1
    }
}

Pop-Location

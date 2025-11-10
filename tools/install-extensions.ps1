# VS Code拡張機能一括インストールスクリプト (PowerShell用)
# 使用例: .\install-extensions.ps1 [ファイル名]

param(
    [string]$ExtensionsFile = "vscode-extensions.txt"
)

Write-Host "VS Code拡張機能を一括インストールしています..." -ForegroundColor Green
Write-Host "使用ファイル: $ExtensionsFile" -ForegroundColor Cyan
Write-Host

# VS Codeがインストールされているかチェック
try {
    $null = Get-Command code -ErrorAction Stop
} catch {
    Write-Host "エラー: VS Codeがインストールされていないか、PATHに設定されていません" -ForegroundColor Red
    Write-Host "VS Codeをインストールするか、PATHに追加してください" -ForegroundColor Yellow
    Read-Host "何かキーを押してください"
    exit 1
}

# 拡張機能リストファイルが存在するかチェック
if (-not (Test-Path $ExtensionsFile)) {
    Write-Host "エラー: ファイル '$ExtensionsFile' が見つかりません" -ForegroundColor Red
    Write-Host "先に .\export-extensions.ps1 を実行して拡張機能リストを作成してください" -ForegroundColor Yellow
    Read-Host "何かキーを押してください"
    exit 1
}

# 拡張機能の数を取得
$extensions = Get-Content $ExtensionsFile | Where-Object { $_.Trim() -ne "" }
$total = $extensions.Count

if ($total -eq 0) {
    Write-Host "エラー: インストールする拡張機能が見つかりません" -ForegroundColor Red
    Read-Host "何かキーを押してください"
    exit 1
}

Write-Host " $total 個の拡張機能をインストールします..." -ForegroundColor Yellow
Write-Host

# インストール処理
$count = 0
$success = 0
$failed = 0
$failedExtensions = @()

foreach ($extension in $extensions) {
    $count++
    Write-Host "[$count/$total] インストール中: $extension" -ForegroundColor Cyan
    
    try {
        $result = & code --install-extension $extension 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   成功" -ForegroundColor Green
            $success++
        } else {
            Write-Host "   失敗" -ForegroundColor Red
            $failed++
            $failedExtensions += $extension
        }
    } catch {
        Write-Host "   失敗: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
        $failedExtensions += $extension
    }
    Write-Host
}

# 結果表示
Write-Host "================================" -ForegroundColor Magenta
Write-Host " インストール結果:" -ForegroundColor Yellow
Write-Host "  成功: $success/$total" -ForegroundColor Green
Write-Host "  失敗: $failed/$total" -ForegroundColor Red

if ($failed -gt 0) {
    Write-Host
    Write-Host "  失敗した拡張機能:" -ForegroundColor Yellow
    $failedExtensions | Out-File -FilePath "failed-extensions.txt" -Encoding UTF8
    foreach ($ext in $failedExtensions) {
        Write-Host "    - $ext" -ForegroundColor Red
    }
    Write-Host
    Write-Host "失敗した拡張機能は failed-extensions.txt に保存されました" -ForegroundColor Yellow
    Write-Host "手動でインストールするか、後で再試行してください" -ForegroundColor Yellow
}

Write-Host
Write-Host "インストール確認のため VS Code を再起動することをお勧めします" -ForegroundColor Cyan
Write-Host "完了しました。" -ForegroundColor Green
Read-Host "何かキーを押してください"



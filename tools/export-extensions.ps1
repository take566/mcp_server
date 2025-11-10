# VS Code拡張機能リスト出力スクリプト (PowerShell用)
# 使用例: .\export-extensions.ps1

Write-Host "VS Code拡張機能をファイルに出力しています..." -ForegroundColor Green
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

# 拡張機能リストをファイルに出力
try {
    $extensions = & code --list-extensions
    $extensions | Out-File -FilePath "vscode-extensions.txt" -Encoding UTF8
} catch {
    Write-Host "エラー: 拡張機能リストの出力に失敗しました" -ForegroundColor Red
    Read-Host "何かキーを押してください"
    exit 1
}

# 出力結果を表示
Write-Host " 拡張機能リストを vscode-extensions.txt に出力しました" -ForegroundColor Green
Write-Host
Write-Host " ファイル位置: $((Get-Location).Path)\vscode-extensions.txt" -ForegroundColor Cyan
Write-Host

# 拡張機能の数を表示
$count = (Get-Content "vscode-extensions.txt" | Where-Object { $_.Trim() -ne "" }).Count
Write-Host " 出力された拡張機能数: $count 個" -ForegroundColor Yellow
Write-Host

# 内容確認の選択肢
$choice = Read-Host "内容を確認しますか？ (y/n)"
if ($choice -eq "y" -or $choice -eq "Y") {
    Write-Host
    Write-Host "=== インストール済み拡張機能 ===" -ForegroundColor Magenta
    Get-Content "vscode-extensions.txt"
    Write-Host
}

Write-Host "完了しました。" -ForegroundColor Green
Read-Host "何かキーを押してください"


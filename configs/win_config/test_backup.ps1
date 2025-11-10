# 簡単なテストスクリプト
param(
    [string]$SourceDir = "claude_desktop_config.json",
    [string]$BackupDir = ".",
    [int]$MaxBackups = 3
)

Write-Host "テスト開始: MCP設定バックアップ"
Write-Host "ソース: $SourceDir"
Write-Host "バックアップ先: $BackupDir"

# ソースファイルの存在確認
if (Test-Path $SourceDir) {
    Write-Host "✓ ソースファイルが見つかりました: $SourceDir"
} else {
    Write-Host "✗ エラー: ソースファイルが見つかりません: $SourceDir"
    exit 1
}

# タイムスタンプ付きバックアップファイル名
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "claude_desktop_config_$timestamp.json"
$backupFilePath = Join-Path $BackupDir $backupFileName

try {
    # ファイルをコピー
    Copy-Item -Path $SourceDir -Destination $backupFilePath -Force
    Write-Host "✓ バックアップ完了: $backupFileName"
    
    # バックアップファイル一覧を表示
    $backupFiles = Get-ChildItem -Path $BackupDir -Filter "claude_desktop_config_*.json" | Sort-Object LastWriteTime -Descending
    Write-Host "現在のバックアップファイル数: $($backupFiles.Count)"
    
    foreach ($file in $backupFiles) {
        Write-Host "  - $($file.Name) ($($file.LastWriteTime))"
    }
    
} catch {
    Write-Host "✗ エラー: バックアップに失敗しました - $($_.Exception.Message)"
    exit 1
}

Write-Host "✓ テスト完了"

# MCP設定ファイルのバックアップスクリプト
# PowerShell スクリプト

param(
    [string]$SourceDir = "C:\Users\$env:USERNAME\AppData\Roaming\Claude\claude_desktop_config.json",
    [string]$BackupDir = "D:\work\mcp_server\configs\win_config",
    [int]$MaxBackups = 10
)

# ログ出力関数
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

# バックアップディレクトリが存在しない場合は作成
if (-not (Test-Path $BackupDir)) {
    Write-Log "バックアップディレクトリを作成: $BackupDir"
    New-Item -ItemType Directory -Path $BackupDir -Force
}

# ソースファイルの存在確認
if (-not (Test-Path $SourceDir)) {
    Write-Log "エラー: ソースファイルが見つかりません: $SourceDir"
    exit 1
}

# タイムスタンプ付きバックアップファイル名
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "claude_desktop_config_$timestamp.json"
$backupFilePath = Join-Path $BackupDir $backupFileName

try {
    # ファイルをコピー
    Copy-Item -Path $SourceDir -Destination $backupFilePath -Force
    Write-Log "バックアップ完了: $backupFilePath"
    
    # 古いバックアップファイルを削除（MaxBackups数を超えた場合）
    $backupFiles = Get-ChildItem -Path $BackupDir -Filter "claude_desktop_config_*.json" | 
                   Sort-Object LastWriteTime -Descending
    
    if ($backupFiles.Count -gt $MaxBackups) {
        $filesToDelete = $backupFiles | Select-Object -Skip $MaxBackups
        foreach ($file in $filesToDelete) {
            Remove-Item $file.FullName -Force
            Write-Log "古いバックアップを削除: $($file.Name)"
        }
    }
    
    # バックアップ統計
    $totalBackups = (Get-ChildItem -Path $BackupDir -Filter "claude_desktop_config_*.json").Count
    Write-Log "バックアップ統計: 合計 $totalBackups ファイル"
    
} catch {
    Write-Log "エラー: バックアップに失敗しました - $($_.Exception.Message)"
    exit 1
}

Write-Log "MCP設定のバックアップ処理が完了しました"

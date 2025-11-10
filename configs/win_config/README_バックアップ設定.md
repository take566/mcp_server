# MCP設定ファイルの定期バックアップ設定

このディレクトリには、Windows環境でのMCP設定ファイルの自動バックアップシステムが含まれています。

## ファイル構成

### メインスクリプト
- `backup_mcp_config.ps1` - PowerShellバックアップスクリプト（メイン処理）
- `backup_mcp_config.bat` - バッチファイル（PowerShellスクリプトを呼び出し）

### タスクスケジューラ設定
- `setup_backup_task.xml` - Windows タスクスケジューラの設定ファイル
- `install_backup_task.bat` - タスクスケジューラにタスクをインストールするスクリプト

### 設定ファイル
- `claude_desktop_config.json` - 現在のMCP設定ファイル
- `claude_desktop_config.json.bak` - バックアップファイル

## セットアップ手順

### 1. 管理者権限でインストールスクリプトを実行
```cmd
install_backup_task.bat
```
※右クリックして「管理者として実行」を選択してください

### 2. 実行スケジュール
- **毎日午前9時**に自動実行
- **システム起動時**（5分遅延後）にも実行
- 最大10ファイルまでバックアップを保持

## 手動実行

### バックアップを手動実行する場合
```cmd
# バッチファイルで実行
backup_mcp_config.bat

# またはタスクスケジューラで実行
schtasks /run /tn "MCP設定バックアップ"
```

### PowerShellスクリプトを直接実行する場合
```powershell
# デフォルト設定で実行
.\backup_mcp_config.ps1

# カスタム設定で実行
.\backup_mcp_config.ps1 -SourceDir "C:\Users\username\AppData\Roaming\Claude\claude_desktop_config.json" -BackupDir "D:\backup" -MaxBackups 5
```

## 設定のカスタマイズ

### バックアップ設定の変更
`backup_mcp_config.ps1`のパラメータを変更：

```powershell
param(
    [string]$SourceDir = "C:\Users\$env:USERNAME\AppData\Roaming\Claude\claude_desktop_config.json",  # ソースファイル
    [string]$BackupDir = "D:\work\mcp_server\configs\win_config",  # バックアップ先
    [int]$MaxBackups = 10  # 保持するバックアップ数
)
```

### 実行スケジュールの変更
`setup_backup_task.xml`の`<Triggers>`セクションを編集：

```xml
<!-- 毎日午前9時 -->
<CalendarTrigger>
    <StartBoundary>2024-01-01T09:00:00</StartBoundary>
    <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
    </ScheduleByDay>
</CalendarTrigger>

<!-- 毎週月曜日の午前8時 -->
<CalendarTrigger>
    <StartBoundary>2024-01-01T08:00:00</StartBoundary>
    <ScheduleByWeek>
        <WeeksInterval>1</WeeksInterval>
        <DaysOfWeek>
            <Monday />
        </DaysOfWeek>
    </ScheduleByWeek>
</CalendarTrigger>
```

## ログとモニタリング

### ログファイル
- `backup_log.txt` - バックアップ実行ログ（自動でローテーション）

### タスクの状態確認
```cmd
# タスクの状態を確認
schtasks /query /tn "MCP設定バックアップ" /fo list

# タスクの実行履歴を確認
schtasks /query /tn "MCP設定バックアップ" /v /fo list
```

## トラブルシューティング

### よくある問題

1. **「実行ポリシー」エラー**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **パスが見つからない**
   - ソースファイルのパスを確認
   - バックアップ先ディレクトリの存在確認

3. **権限エラー**
   - 管理者権限で実行
   - ファイルのアクセス権限を確認

### タスクの削除
```cmd
schtasks /delete /tn "MCP設定バックアップ" /f
```

## バックアップファイルの命名規則

バックアップファイルは以下の形式で保存されます：
```
claude_desktop_config_YYYYMMDD_HHMMSS.json
```

例：`claude_desktop_config_20240115_090000.json`

## 注意事項

- バックアップファイルは最大10個まで保持されます（設定で変更可能）
- 古いバックアップは自動的に削除されます
- ログファイルは10MBを超えると自動的にローテーションされます
- タスクスケジューラのタスクは管理者権限でインストールする必要があります

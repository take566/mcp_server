@echo off
REM Windows タスクスケジューラにMCP設定バックアップタスクをインストールするスクリプト

setlocal enabledelayedexpansion

echo ========================================
echo MCP設定バックアップタスクのインストール
echo ========================================

REM 管理者権限の確認
net session >nul 2>&1
if %errorLevel% == 0 (
    echo 管理者権限で実行されています。
) else (
    echo エラー: このスクリプトは管理者権限で実行する必要があります。
    echo 右クリックして「管理者として実行」を選択してください。
    pause
    exit /b 1
)

REM スクリプトのディレクトリを取得
set "SCRIPT_DIR=%~dp0"
set "TASK_XML=%SCRIPT_DIR%setup_backup_task.xml"

REM 既存のタスクを削除（存在する場合）
echo 既存のMCPバックアップタスクを削除中...
schtasks /delete /tn "MCP設定バックアップ" /f >nul 2>&1

REM 新しいタスクを作成
echo 新しいMCPバックアップタスクを作成中...
schtasks /create /tn "MCP設定バックアップ" /xml "%TASK_XML%"

if %errorLevel% == 0 (
    echo.
    echo  MCP設定バックアップタスクが正常にインストールされました！
    echo.
    echo 設定内容:
    echo - 毎日午前9時に自動実行
    echo - システム起動時にも実行
    echo - バックアップ先: %SCRIPT_DIR%
    echo - 最大バックアップ数: 10ファイル
    echo.
    echo 手動実行する場合:
    echo   schtasks /run /tn "MCP設定バックアップ"
    echo.
    echo タスクを削除する場合:
    echo   schtasks /delete /tn "MCP設定バックアップ" /f
    echo.
) else (
    echo.
    echo  エラー: タスクのインストールに失敗しました。
    echo XMLファイルのパスを確認してください: %TASK_XML%
    echo.
)

REM タスクの状態を表示
echo 現在のタスク状態:
schtasks /query /tn "MCP設定バックアップ" /fo list 2>nul | findstr /C:"状態:"

echo.
echo 処理が完了しました。何かキーを押してください...
pause >nul

endlocal

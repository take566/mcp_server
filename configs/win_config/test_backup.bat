@echo off
echo ========================================
echo MCP設定バックアップ動作テスト
echo ========================================

REM 現在のディレクトリを表示
echo 現在のディレクトリ: %CD%

REM ファイル一覧を表示
echo.
echo 現在のファイル一覧:
dir /b *.json

REM テスト用のバックアップファイルを作成
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "BACKUP_FILE=claude_desktop_config_test_%TIMESTAMP%.json"

echo.
echo テストバックアップファイルを作成: %BACKUP_FILE%

REM ファイルをコピー
if exist "claude_desktop_config.json" (
    copy "claude_desktop_config.json" "%BACKUP_FILE%" >nul
    if %ERRORLEVEL% EQU 0 (
        echo ✓ バックアップ作成成功: %BACKUP_FILE%
    ) else (
        echo ✗ バックアップ作成失敗
    )
) else (
    echo ✗ ソースファイルが見つかりません: claude_desktop_config.json
)

REM バックアップファイル一覧を表示
echo.
echo バックアップファイル一覧:
dir /b claude_desktop_config_*.json

echo.
echo テスト完了
pause

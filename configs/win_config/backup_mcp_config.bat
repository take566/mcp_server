@echo off
REM MCP設定ファイルのバックアップ用バッチファイル
REM PowerShellスクリプトを実行

setlocal enabledelayedexpansion

REM スクリプトのディレクトリを取得
set "SCRIPT_DIR=%~dp0"
set "POWERSHELL_SCRIPT=%SCRIPT_DIR%backup_mcp_config.ps1"

REM ログファイルの設定
set "LOG_FILE=%SCRIPT_DIR%backup_log.txt"
set "TIMESTAMP=%date:~0,4%-%date:~5,2%-%date:~8,2% %time:~0,2%:%time:~3,2%:%time:~6,2%"

REM ログ出力関数
echo [%TIMESTAMP%] MCP設定バックアップ処理を開始します >> "%LOG_FILE%"

REM PowerShellスクリプトの実行
powershell.exe -ExecutionPolicy Bypass -File "%POWERSHELL_SCRIPT%"

if %ERRORLEVEL% EQU 0 (
    echo [%TIMESTAMP%] バックアップ処理が正常に完了しました >> "%LOG_FILE%"
) else (
    echo [%TIMESTAMP%] エラー: バックアップ処理に失敗しました (エラーコード: %ERRORLEVEL%) >> "%LOG_FILE%"
)

REM ログファイルのサイズチェック（10MBを超える場合は古いログを削除）
for %%F in ("%LOG_FILE%") do set "LOG_SIZE=%%~zF"
if %LOG_SIZE% GTR 10485760 (
    echo [%TIMESTAMP%] ログファイルが大きくなったため、古いログを削除します >> "%LOG_FILE%"
    powershell.exe -Command "Get-Content '%LOG_FILE%' | Select-Object -Last 1000 | Set-Content '%LOG_FILE%'"
)

endlocal

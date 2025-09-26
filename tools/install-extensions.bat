@echo off
REM VS Code拡張機能一括インストールスクリプト (Windows用)
REM 使用例: install-extensions.bat [ファイル名]

setlocal enabledelayedexpansion

REM ファイル名の設定
set "extensions_file=vscode-extensions.txt"
if not "%1"=="" set "extensions_file=%1"

echo VS Code拡張機能を一括インストールしています...
echo 使用ファイル: %extensions_file%
echo.

REM VS Codeがインストールされているかチェック
where code >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo エラー: VS Codeがインストールされていないか、PATHに設定されていません
    echo VS Codeをインストールするか、PATHに追加してください
    pause
    exit /b 1
)

REM 拡張機能リストファイルが存在するかチェック
if not exist "%extensions_file%" (
    echo エラー: ファイル "%extensions_file%" が見つかりません
    echo 先に export-extensions.bat を実行して拡張機能リストを作成してください
    pause
    exit /b 1
)

REM 拡張機能の数を取得
for /f %%i in ('type "%extensions_file%" ^| find /c /v ""') do set total=%%i

if %total% equ 0 (
    echo エラー: インストールする拡張機能が見つかりません
    pause
    exit /b 1
)

echo 📦 %total%個の拡張機能をインストールします...
echo.

REM インストール処理
set count=0
set success=0
set failed=0

for /f "usebackq delims=" %%a in ("%extensions_file%") do (
    set /a count+=1
    echo [!count!/%total%] インストール中: %%a
    
    code --install-extension "%%a" >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        echo   ✅ 成功
        set /a success+=1
    ) else (
        echo   ❌ 失敗
        set /a failed+=1
        echo %%a >> failed-extensions.txt
    )
    echo.
)

REM 結果表示
echo ================================
echo 📊 インストール結果:
echo   成功: %success%/%total%
echo   失敗: %failed%/%total%

if %failed% gtr 0 (
    echo.
    echo ⚠️  失敗した拡張機能は failed-extensions.txt に保存されました
    echo    手動でインストールするか、後で再試行してください
)

echo.
echo インストール確認のため VS Code を再起動することをお勧めします
echo 完了しました。
pause


@echo off
REM VS Code拡張機能リスト出力スクリプト (Windows用)
REM 使用例: export-extensions.bat

echo VS Code拡張機能をファイルに出力しています...
echo.

REM VS Codeがインストールされているかチェック
where code >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo エラー: VS Codeがインストールされていないか、PATHに設定されていません
    echo VS Codeをインストールするか、PATHに追加してください
    pause
    exit /b 1
)

REM 拡張機能リストをファイルに出力
code --list-extensions > vscode-extensions.txt

if %ERRORLEVEL% neq 0 (
    echo エラー: 拡張機能リストの出力に失敗しました
    pause
    exit /b 1
)

REM 出力結果を表示
echo ✅ 拡張機能リストを vscode-extensions.txt に出力しました
echo.
echo 📁 ファイル位置: %CD%\vscode-extensions.txt
echo.

REM 拡張機能の数を表示
for /f %%i in ('type vscode-extensions.txt ^| find /c /v ""') do set count=%%i
echo 📦 出力された拡張機能数: %count%個
echo.

echo 内容を確認しますか？ (y/n)
set /p choice="選択してください: "
if /i "%choice%"=="y" (
    echo.
    echo === インストール済み拡張機能 ===
    type vscode-extensions.txt
    echo.
)

echo 完了しました。
pause


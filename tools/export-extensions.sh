#!/bin/bash
# VS Code拡張機能リスト出力スクリプト (Mac/Linux用)
# 使用例: ./export-extensions.sh

set -e

echo "VS Code拡張機能をファイルに出力しています..."
echo

# VS Codeがインストールされているかチェック
if ! command -v code &> /dev/null; then
    echo "エラー: VS Codeがインストールされていないか、PATHに設定されていません"
    echo "VS Codeをインストールするか、PATHに追加してください"
    exit 1
fi

# 拡張機能リストをファイルに出力
if ! code --list-extensions > vscode-extensions.txt; then
    echo "エラー: 拡張機能リストの出力に失敗しました"
    exit 1
fi

# 出力結果を表示
echo " 拡張機能リストを vscode-extensions.txt に出力しました"
echo
echo " ファイル位置: $(pwd)/vscode-extensions.txt"
echo

# 拡張機能の数を表示
count=$(wc -l < vscode-extensions.txt | tr -d ' ')
echo " 出力された拡張機能数: ${count}個"
echo

# 内容確認の選択肢
read -p "内容を確認しますか？ (y/n): " choice
if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
    echo
    echo "=== インストール済み拡張機能 ==="
    cat vscode-extensions.txt
    echo
fi

echo "完了しました。"


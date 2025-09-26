#!/bin/bash
# VS Code拡張機能一括インストールスクリプト (Mac/Linux用)
# 使用例: ./install-extensions.sh [ファイル名]

set -e

# ファイル名の設定
extensions_file="${1:-vscode-extensions.txt}"

echo "VS Code拡張機能を一括インストールしています..."
echo "使用ファイル: $extensions_file"
echo

# VS Codeがインストールされているかチェック
if ! command -v code &> /dev/null; then
    echo "エラー: VS Codeがインストールされていないか、PATHに設定されていません"
    echo "VS Codeをインストールするか、PATHに追加してください"
    exit 1
fi

# 拡張機能リストファイルが存在するかチェック
if [[ ! -f "$extensions_file" ]]; then
    echo "エラー: ファイル '$extensions_file' が見つかりません"
    echo "先に ./export-extensions.sh を実行して拡張機能リストを作成してください"
    exit 1
fi

# 拡張機能の数を取得
total=$(wc -l < "$extensions_file" | tr -d ' ')

if [[ $total -eq 0 ]]; then
    echo "エラー: インストールする拡張機能が見つかりません"
    exit 1
fi

echo "📦 ${total}個の拡張機能をインストールします..."
echo

# インストール処理
count=0
success=0
failed=0
failed_extensions=()

while IFS= read -r extension; do
    # 空行をスキップ
    [[ -z "$extension" ]] && continue
    
    ((count++))
    echo "[$count/$total] インストール中: $extension"
    
    if code --install-extension "$extension" > /dev/null 2>&1; then
        echo "  ✅ 成功"
        ((success++))
    else
        echo "  ❌ 失敗"
        ((failed++))
        failed_extensions+=("$extension")
    fi
    echo
done < "$extensions_file"

# 結果表示
echo "================================"
echo "📊 インストール結果:"
echo "  成功: $success/$total"
echo "  失敗: $failed/$total"

if [[ $failed -gt 0 ]]; then
    echo
    echo "⚠️  失敗した拡張機能:"
    printf '%s\n' "${failed_extensions[@]}" > failed-extensions.txt
    for ext in "${failed_extensions[@]}"; do
        echo "    - $ext"
    done
    echo
    echo "失敗した拡張機能は failed-extensions.txt に保存されました"
    echo "手動でインストールするか、後で再試行してください"
fi

echo
echo "インストール確認のため VS Code を再起動することをお勧めします"
echo "完了しました。"


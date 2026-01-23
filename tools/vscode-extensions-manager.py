#!/usr/bin/env python3
"""
VS Code拡張機能管理スクリプト
VS Codeの拡張機能リストをファイルに出力し、別環境で一括インストールする機能を提供
"""

import subprocess
import sys
import os
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

class VSCodeExtensionManager:
    def __init__(self, max_workers: int = 8):
        self.extensions_file = "vscode-extensions.txt"
        self.extensions_json = "vscode-extensions.json"
        self.max_workers = max_workers
        self._extension_details_cache: Dict[str, Dict[str, Any]] = {}
        
    def check_vscode_installed(self) -> bool:
        """VS Codeがインストールされているかチェック"""
        try:
            result = subprocess.run(['code', '--version'], 
                                  capture_output=True, text=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def list_extensions(self) -> List[str]:
        """インストール済み拡張機能のリストを取得"""
        try:
            result = subprocess.run(['code', '--list-extensions'], 
                                  capture_output=True, text=True, check=True)
            extensions = [ext.strip() for ext in result.stdout.strip().split('\n') if ext.strip()]
            return extensions
        except subprocess.CalledProcessError as e:
            print(f"エラー: 拡張機能リストの取得に失敗しました: {e}")
            return []
    
    def _load_all_extension_details(self) -> Dict[str, Dict[str, Any]]:
        """すべての拡張機能の詳細情報を一度に取得（キャッシュ）"""
        if self._extension_details_cache:
            return self._extension_details_cache
        
        try:
            result = subprocess.run(['code', '--list-extensions', '--show-versions'], 
                                  capture_output=True, text=True, check=True)
            details = {}
            for line in result.stdout.strip().split('\n'):
                if '@' in line:
                    parts = line.split('@')
                    if len(parts) == 2:
                        ext_id = parts[0].strip()
                        version = parts[1].strip()
                        details[ext_id] = {
                            'id': ext_id,
                            'version': version,
                            'name': ext_id
                        }
            self._extension_details_cache = details
            return details
        except subprocess.CalledProcessError:
            return {}
    
    def get_extension_details(self, extension_id: str) -> Dict[str, Any]:
        """拡張機能の詳細情報を取得（キャッシュから）"""
        details = self._load_all_extension_details()
        return details.get(extension_id, {'id': extension_id, 'version': 'unknown', 'name': extension_id})
    
    def export_extensions_txt(self) -> bool:
        """拡張機能リストをテキストファイルに出力"""
        if not self.check_vscode_installed():
            print("エラー: VS Codeがインストールされていないか、PATHに設定されていません")
            return False
        
        extensions = self.list_extensions()
        if not extensions:
            print("インストールされている拡張機能が見つかりません")
            return False
        
        try:
            with open(self.extensions_file, 'w', encoding='utf-8') as f:
                for ext in extensions:
                    f.write(f"{ext}\n")
            
            print(f" {len(extensions)}個の拡張機能を {self.extensions_file} に出力しました")
            print(f" ファイル位置: {os.path.abspath(self.extensions_file)}")
            return True
        except IOError as e:
            print(f"エラー: ファイルの書き込みに失敗しました: {e}")
            return False
    
    def export_extensions_json(self) -> bool:
        """拡張機能リストをJSONファイルに出力（詳細情報付き、並列処理対応）"""
        if not self.check_vscode_installed():
            print("エラー: VS Codeがインストールされていないか、PATHに設定されていません")
            return False
        
        extensions = self.list_extensions()
        if not extensions:
            print("インストールされている拡張機能が見つかりません")
            return False
        
        # すべての拡張機能の詳細を一度に取得（キャッシュされる）
        all_details = self._load_all_extension_details()
        
        extensions_data = {
            'exported_at': datetime.now().isoformat(),
            'vscode_version': self.get_vscode_version(),
            'extensions': []
        }
        
        # 並列処理で詳細情報を取得（実際にはキャッシュから取得されるが、将来の拡張に備える）
        with ThreadPoolExecutor(max_workers=min(self.max_workers, len(extensions))) as executor:
            future_to_ext = {executor.submit(self.get_extension_details, ext): ext for ext in extensions}
            
            for future in as_completed(future_to_ext):
                ext = future_to_ext[future]
                try:
                    ext_details = future.result()
                    extensions_data['extensions'].append(ext_details)
                except Exception as e:
                    print(f"警告: 拡張機能 {ext} の詳細取得に失敗: {e}")
                    extensions_data['extensions'].append({
                        'id': ext,
                        'version': 'unknown',
                        'name': ext
                    })
        
        try:
            with open(self.extensions_json, 'w', encoding='utf-8') as f:
                json.dump(extensions_data, f, indent=2, ensure_ascii=False)
            
            print(f" {len(extensions)}個の拡張機能を {self.extensions_json} に出力しました")
            print(f" ファイル位置: {os.path.abspath(self.extensions_json)}")
            return True
        except IOError as e:
            print(f"エラー: ファイルの書き込みに失敗しました: {e}")
            return False
    
    def get_vscode_version(self) -> str:
        """VS Codeのバージョンを取得"""
        try:
            result = subprocess.run(['code', '--version'], 
                                  capture_output=True, text=True, check=True)
            return result.stdout.strip().split('\n')[0]
        except subprocess.CalledProcessError:
            return "unknown"
    
    def _install_single_extension(self, ext: str) -> tuple[str, bool, str]:
        """単一の拡張機能をインストール（並列処理用）"""
        try:
            result = subprocess.run(['code', '--install-extension', ext], 
                                  capture_output=True, text=True, check=True, timeout=120)
            return (ext, True, "成功")
        except subprocess.TimeoutExpired:
            return (ext, False, "タイムアウト")
        except subprocess.CalledProcessError as e:
            return (ext, False, f"エラー: {e}")
        except Exception as e:
            return (ext, False, f"予期しないエラー: {e}")
    
    def install_extensions_from_file(self, filename: str = None) -> bool:
        """ファイルから拡張機能を一括インストール（並列処理対応）"""
        if filename is None:
            filename = self.extensions_file
        
        if not os.path.exists(filename):
            print(f"エラー: ファイル {filename} が見つかりません")
            return False
        
        if not self.check_vscode_installed():
            print("エラー: VS Codeがインストールされていないか、PATHに設定されていません")
            return False
        
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                extensions = [line.strip() for line in f.readlines() if line.strip()]
            
            if not extensions:
                print("インストールする拡張機能が見つかりません")
                return False
            
            print(f" {len(extensions)}個の拡張機能をインストールします...")
            print(f" 並列処理: 最大{min(self.max_workers, len(extensions))}個同時実行")
            
            success_count = 0
            failed_extensions = []
            completed = 0
            
            # 並列インストール（VS Codeの制約を考慮して最大5並列に制限）
            max_install_workers = min(5, self.max_workers, len(extensions))
            with ThreadPoolExecutor(max_workers=max_install_workers) as executor:
                future_to_ext = {executor.submit(self._install_single_extension, ext): ext for ext in extensions}
                
                for future in as_completed(future_to_ext):
                    completed += 1
                    ext, success, message = future.result()
                    
                    status = "✓" if success else "✗"
                    print(f"[{completed}/{len(extensions)}] {status} {ext}: {message}")
                    
                    if success:
                        success_count += 1
                    else:
                        failed_extensions.append((ext, message))
            
            print(f"\n インストール結果:")
            print(f"  成功: {success_count}/{len(extensions)}")
            if failed_extensions:
                print(f"  失敗: {len(failed_extensions)}")
                print("  失敗した拡張機能:")
                for ext, msg in failed_extensions:
                    print(f"    - {ext}: {msg}")
            
            return len(failed_extensions) == 0
            
        except IOError as e:
            print(f"エラー: ファイルの読み込みに失敗しました: {e}")
            return False
    
    def install_extensions_from_json(self, filename: str = None) -> bool:
        """JSONファイルから拡張機能を一括インストール"""
        if filename is None:
            filename = self.extensions_json
        
        if not os.path.exists(filename):
            print(f"エラー: ファイル {filename} が見つかりません")
            return False
        
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            extensions = [ext['id'] for ext in data.get('extensions', [])]
            
            if not extensions:
                print("インストールする拡張機能が見つかりません")
                return False
            
            # 一時的にテキストファイルを作成してインストール
            temp_file = "temp_extensions.txt"
            with open(temp_file, 'w', encoding='utf-8') as f:
                for ext in extensions:
                    f.write(f"{ext}\n")
            
            result = self.install_extensions_from_file(temp_file)
            
            # 一時ファイルを削除
            if os.path.exists(temp_file):
                os.remove(temp_file)
            
            return result
            
        except (IOError, json.JSONDecodeError) as e:
            print(f"エラー: ファイルの読み込みに失敗しました: {e}")
            return False
    
    def show_installed_extensions(self):
        """インストール済み拡張機能を表示"""
        if not self.check_vscode_installed():
            print("エラー: VS Codeがインストールされていないか、PATHに設定されていません")
            return
        
        extensions = self.list_extensions()
        if not extensions:
            print("インストールされている拡張機能が見つかりません")
            return
        
        print(f" インストール済み拡張機能 ({len(extensions)}個):")
        for i, ext in enumerate(extensions, 1):
            print(f"  {i:2d}. {ext}")

def main():
    parser = argparse.ArgumentParser(description='VS Code拡張機能管理スクリプト')
    parser.add_argument('action', choices=['export', 'export-json', 'install', 'install-json', 'list'], 
                       help='実行するアクション')
    parser.add_argument('--file', '-f', help='使用するファイル名')
    
    args = parser.parse_args()
    
    manager = VSCodeExtensionManager()
    
    if args.action == 'export':
        manager.export_extensions_txt()
    elif args.action == 'export-json':
        manager.export_extensions_json()
    elif args.action == 'install':
        manager.install_extensions_from_file(args.file)
    elif args.action == 'install-json':
        manager.install_extensions_from_json(args.file)
    elif args.action == 'list':
        manager.show_installed_extensions()

if __name__ == '__main__':
    main()


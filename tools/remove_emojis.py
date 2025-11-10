from __future__ import annotations

import argparse
import unicodedata
from pathlib import Path
from typing import Iterable


EMOJI_RANGES = [
    (0x1F300, 0x1FAFF),  # Miscellaneous Symbols and Pictographs to Symbols for Legacy Computing
    (0x1F600, 0x1F64F),  # Emoticons
    (0x1F680, 0x1F6FF),  # Transport and Map Symbols
    (0x2600, 0x27BF),    # Miscellaneous Symbols to Dingbats
    (0x1F900, 0x1F9FF),  # Supplemental Symbols and Pictographs
    (0x1FA70, 0x1FAFF),  # Symbols and Pictographs Extended-A
    (0x1F1E6, 0x1F1FF),  # Regional Indicator Symbols (flags)
]

EXPLICIT_POINTS = {
    0x200D,  # Zero Width Joiner
    0xFE0F,  # Variation Selector-16
}

SKIP_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
}


def is_emoji(char: str) -> bool:
    code_point = ord(char)
    if code_point in EXPLICIT_POINTS:
        return True
    for start, end in EMOJI_RANGES:
        if start <= code_point <= end:
            return True
    name = unicodedata.name(char, "")
    return "EMOJI" in name


def iter_files(root: Path, include_hidden: bool = False) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_dir():
            continue
        if not include_hidden and any(part.startswith(".") for part in path.parts):
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


def strip_emojis(text: str) -> str:
    return "".join(ch for ch in text if not is_emoji(ch))


def process_file(path: Path, apply_changes: bool) -> tuple[int, int]:
    try:
        original = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        original = path.read_text(encoding="utf-8", errors="ignore")
    cleaned = strip_emojis(original)
    if cleaned == original:
        return (0, 0)
    if apply_changes:
        path.write_text(cleaned, encoding="utf-8")
    removed = len(original) - len(cleaned)
    return (1, removed)


def main() -> None:
    parser = argparse.ArgumentParser(description="Remove emoji characters from text files.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to files. Without this flag a report is printed.",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path("."),
        help="Root directory to scan. Defaults to current working directory.",
    )
    parser.add_argument(
        "--include-hidden",
        action="store_true",
        help="Include hidden directories and files in the scan.",
    )
    args = parser.parse_args()

    files_with_emojis = 0
    total_removed = 0
    root = args.root.resolve()
    for file_path in iter_files(root, include_hidden=args.include_hidden):
        changed, removed = process_file(file_path, apply_changes=args.apply)
        if changed:
            files_with_emojis += 1
            total_removed += removed
            status = "Updated" if args.apply else "Needs update"
            print(f"{status}: {file_path}")

    if files_with_emojis == 0:
        print("No emojis found.")
    else:
        action = "Removed" if args.apply else "Identified"
        print(f"{action} emojis in {files_with_emojis} file(s); total characters: {total_removed}.")


if __name__ == "__main__":
    main()


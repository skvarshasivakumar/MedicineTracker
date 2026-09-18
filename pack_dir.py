"""pack_dir.py — bundle a directory into a single Markdown snapshot.

Usage:
    python pack_dir.py <source_dir> [-o snapshot.md]
                       [--exclude .venv __pycache__ .git ...]
                       [--max-bytes 5242880]

The output Markdown can be re-expanded back into a directory tree with
`unpack_dir.py`.

Format (the contract shared with unpack_dir.py):

    # Project Snapshot
    - Root: <name>
    - Generated: <iso timestamp>

    ## Folder structure
    ```text
    <ascii tree>
    ```

    ## Files

    <!-- FILE: relative/path.ext -->
    ```<lang>
    ...contents...
    ```

Binary files are stored as base64 with a `base64` language tag.
"""
from __future__ import annotations

import argparse
import base64
import os
import re
import sys
from datetime import datetime
from pathlib import Path

DEFAULT_EXCLUDES = [
    ".venv", ".git", "__pycache__", "node_modules",
    ".pytest_cache", ".idea", ".vscode", "bin", "build", "dist",
]

EXT_LANG = {
    ".py": "python", ".md": "markdown", ".json": "json", ".yml": "yaml",
    ".yaml": "yaml", ".toml": "toml", ".cfg": "ini", ".ini": "ini",
    ".txt": "text", ".kv": "text", ".spec": "ini", ".sh": "bash",
    ".ps1": "powershell", ".html": "html", ".css": "css", ".js": "javascript",
    ".ts": "typescript", ".xml": "xml", ".gitignore": "text",
}

def _is_excluded(path: Path, root: Path, excludes: set[str]) -> bool:
    try:
        rel_parts = path.relative_to(root).parts
    except ValueError:
        return False
    return any(part in excludes for part in rel_parts)

def _walk_files(root: Path, excludes: set[str]) -> list[Path]:
    out: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in excludes]
        for name in filenames:
            p = Path(dirpath) / name
            if _is_excluded(p, root, excludes):
                continue
            out.append(p)
    return sorted(out)

def _build_tree(root: Path, excludes: set[str]) -> str:
    """Return an ASCII tree of `root`, honoring excludes."""
    lines: list[str] = [f"{root.name}/"]

    def _recurse(dir_path: Path, prefix: str):
        try:
            entries = sorted(
                [e for e in dir_path.iterdir() if e.name not in excludes],
                key=lambda p: (p.is_file(), p.name.lower()),
            )
        except PermissionError:
            return
        for i, entry in enumerate(entries):
            is_last = i == len(entries) - 1
            branch = "└── " if is_last else "├── "
            suffix = "/" if entry.is_dir() else ""
            lines.append(f"{prefix}{branch}{entry.name}{suffix}")
            if entry.is_dir():
                extension = "    " if is_last else "│   "
                _recurse(entry, prefix + extension)

    _recurse(root, "")
    return "\n".join(lines)

def _detect_lang(path: Path) -> str:
    return EXT_LANG.get(path.suffix.lower(), "text")

def _read_file(path: Path, max_bytes: int) -> tuple[str, str, bool]:
    """Return (content, language, was_skipped).

    Tries UTF-8 text; falls back to base64 for binary. Skips if over `max_bytes`.
    """
    size = path.stat().st_size
    if size > max_bytes:
        return (
            f"[SKIPPED: file is {size} bytes, larger than max_bytes={max_bytes}]",
            "text",
            True,
        )
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
        # Collapse 3+ consecutive blank lines to at most 2 (one blank line).
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text, _detect_lang(path), False
    except UnicodeDecodeError:
        return base64.b64encode(raw).decode("ascii"), "base64", False

def _safe_fence(content: str) -> str:
    """Return a fence string that doesn't appear in `content`."""
    fence = "```"
    while fence in content:
        fence += "`"
    return fence

def pack(source: Path, output: Path, excludes: set[str], max_bytes: int,
         max_chars: int) -> int:
    source = source.resolve()
    if not source.is_dir():
        raise SystemExit(f"Not a directory: {source}")

    files = _walk_files(source, excludes)
    tree = _build_tree(source, excludes)
    generated = datetime.now().isoformat(timespec='seconds')

    # Build the per-file blocks first (these are the units we split on).
    blocks: list[tuple[str, str]] = []  # (relative_path, block_text)
    skipped = 0
    for f in files:
        rel = f.relative_to(source).as_posix()
        content, lang, was_skipped = _read_file(f, max_bytes)
        if was_skipped:
            skipped += 1
        fence = _safe_fence(content)
        block = (
            f"<!-- FILE: {rel} -->\n"
            f"{fence}{lang}\n"
            f"{content}\n"
            f"{fence}\n\n"
        )
        blocks.append((rel, block))

    def _header(part_idx: int, total_parts: int) -> str:
        return (
            "# Project Snapshot"
            + (f" (part {part_idx} of {total_parts})" if total_parts > 1 else "")
            + "\n"
            f"- Root: {source.name}\n"
            f"- Generated: {generated}\n"
            f"- File count: {len(files)}\n"
            + (f"- Part: {part_idx}/{total_parts}\n" if total_parts > 1 else "")
            + "\n"
            "## Folder structure\n"
            "```text\n"
            f"{tree}\n"
            "```\n\n"
            "## Files\n\n"
        )

    # First pass: pack greedily into parts, splitting only at file boundaries.
    # Header size depends on part count, so size assuming worst case (3-digit parts).
    header_budget = len(_header(999, 999))
    parts: list[list[tuple[str, str]]] = [[]]
    running = header_budget
    for rel, block in blocks:
        block_len = len(block)
        if block_len + header_budget > max_chars and not parts[-1]:
            # Oversized single file in its own part — unavoidable; emit a warning.
            print(f"[warn] {rel} ({block_len} chars) exceeds max_chars={max_chars}; "
                  "placing in its own part.")
            parts[-1].append((rel, block))
            parts.append([])
            running = header_budget
            continue
        if running + block_len > max_chars:
            parts.append([])
            running = header_budget
        parts[-1].append((rel, block))
        running += block_len
    if not parts[-1]:
        parts.pop()

    total_parts = len(parts)
    written_files: list[Path] = []
    for i, chunk in enumerate(parts, start=1):
        if total_parts == 1:
            out_path = output
        elif i == 1:
            out_path = output
        else:
            out_path = output.with_name(f"{output.stem}.part{i}{output.suffix}")
        body = _header(i, total_parts) + "".join(b for _, b in chunk)
        out_path.write_text(body, encoding="utf-8")
        written_files.append(out_path)
        print(f"[pack_dir] part {i}/{total_parts}: {len(chunk)} files, "
              f"{len(body)} chars -> {out_path}")

    print(f"[pack_dir] done: {len(files)} files ({skipped} skipped) across "
          f"{total_parts} part(s)")
    return len(files)

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Pack a directory into one or more Markdown files.")
    ap.add_argument("source", type=Path, help="Source directory")
    ap.add_argument("-o", "--output", type=Path, default=Path("project_snapshot.md"))
    ap.add_argument("--exclude", nargs="*", default=DEFAULT_EXCLUDES,
                    help=f"Folder/file names to skip (default: {' '.join(DEFAULT_EXCLUDES)})")
    ap.add_argument("--max-bytes", type=int, default=5 * 1024 * 1024,
                    help="Skip files larger than this (default 5 MB)")
    ap.add_argument("--max-chars", type=int, default=500_000,
                    help="Max characters per output .md (default 500000 = 5 lakh). "
                         "Additional parts are named <stem>.part2.md, .part3.md, ...")
    args = ap.parse_args(argv)
    pack(args.source, args.output, set(args.exclude), args.max_bytes, args.max_chars)
    return 0

if __name__ == "__main__":
    sys.exit(main())

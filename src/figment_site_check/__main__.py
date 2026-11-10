import argparse
import json
import os
import pathlib
import sys
from . import audit_files, MAX_ENTRIES


def main():
    parser = argparse.ArgumentParser(description="Check file names and sizes in a website folder. No uploads.")
    parser.add_argument("folder")
    parser.add_argument("--max-file-mib", type=float, default=20)
    parser.add_argument("--max-total-mib", type=float, default=50)
    args = parser.parse_args()
    try:
        root = pathlib.Path(args.folder).resolve(strict=True)
        if not root.is_dir():
            raise ValueError("The input must be a directory.")
        entries, visited = [], 0

        def walk(directory, prefix="", depth=0):
            nonlocal visited
            if depth > 100:
                raise ValueError("Folder nesting exceeds 100 levels.")
            with os.scandir(directory) as scan:
                children = sorted(scan, key=lambda e: e.name)
            for entry in children:
                visited += 1
                if visited > MAX_ENTRIES:
                    raise ValueError("Folder contains more than 10000 entries. Select the built website folder.")
                name = prefix + entry.name
                if entry.is_symlink():
                    entries.append(dict(path=name, size=0, kind="symlink"))
                elif entry.is_dir(follow_symlinks=False):
                    if entry.name in [".git", ".svn", ".hg", "node_modules"]:
                        entries.append(dict(path=name, size=0))
                    else:
                        walk(entry.path, name + "/", depth + 1)
                elif entry.is_file(follow_symlinks=False):
                    entries.append(dict(path=name, size=entry.stat(follow_symlinks=False).st_size))
                else:
                    raise ValueError(f"Unsupported file type: {name}")

        walk(root)
        limits = {}
        for key, mib in [("maxFileBytes", args.max_file_mib), ("maxTotalBytes", args.max_total_mib)]:
            value = mib * 1048576
            if not value.is_integer() or value <= 0:
                raise ValueError(f"{key} must convert to a positive whole number of bytes.")
            limits[key] = int(value)
        result = audit_files(entries, limits)
        print(json.dumps(result, indent=2))
        return 0 if result["ok"] else 1
    except (OSError, ValueError, TypeError, OverflowError) as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())

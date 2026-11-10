"""Inspect file manifests for common static-site upload mistakes."""
import re

DEFAULTS = {"maxFileBytes": 20 * 1024 * 1024, "maxTotalBytes": 50 * 1024 * 1024}
MAX_ENTRIES = 10000
_MAX_SAFE = 9007199254740991
_SENSITIVE = re.compile(r"^(?:\.env(?:\..*)?|\.git|\.svn|\.hg|\.npmrc|\.pypirc|id_rsa|id_ed25519|credentials|secrets?\.json)$|\.(?:pem|key|p12|pfx)$", re.I)


def _integer(value):
    return type(value) is int and 0 <= value <= _MAX_SAFE


def audit_files(entries, options=None):
    """Read names and sizes only. Does not inspect file contents or upload files."""
    if not isinstance(entries, list) or len(entries) > MAX_ENTRIES:
        raise TypeError("Pass a list of at most 10000 file entries.")
    if options is not None and not isinstance(options, dict):
        raise TypeError("Options must be a dict.")
    limits = {**DEFAULTS, **(options or {})}
    for key in DEFAULTS:
        if not _integer(limits[key]) or limits[key] <= 0:
            raise TypeError(f"{key} must be a positive safe integer.")
    issues, seen, folded = [], set(), set()
    total, has_entry = 0, False

    def add(severity, code, path, message):
        issues.append(dict(severity=severity, code=code, path=path, message=message))

    for item in entries:
        if not isinstance(item, dict) or not isinstance(item.get("path"), str) or not _integer(item.get("size")) or item.get("kind", "file") not in ["file", "symlink"]:
            raise TypeError("Each entry needs a relative path, non-negative safe integer size, and optional kind: file or symlink.")
        path = item["path"]
        parts = path.split("/")
        if not path or len(path) > 4096 or re.search(r"[\\\x00-\x1f\x7f:]", path) or any(p in ["", ".", ".."] for p in parts):
            add("error", "invalid_path", path, "Use a relative path with forward slashes and no traversal.")
            continue
        if path in seen:
            add("error", "duplicate_path", path, "This path occurs more than once.")
        elif path.lower() in folded:
            add("error", "case_collision", path, "Another file has the same path with different capitalization.")
        seen.add(path)
        folded.add(path.lower())
        if item.get("kind") == "symlink":
            add("error", "symlink", path, "Replace this link with a real file inside the site folder.")
        elif path == "index.html":
            has_entry = True
        if any(_SENSITIVE.search(p) for p in parts):
            add("error", "sensitive_path", path, "Remove this private or credential-related path before upload.")
        if "node_modules" in parts:
            add("warning", "dependencies", path, "Upload the built website, not node_modules.")
        if re.search(r"\.(tsx?|jsx|vue|svelte)$", path, re.I):
            add("warning", "source_file", path, "This looks like source code. Build the site before upload.")
        if re.search(r"\.(php|py|rb|cgi|pl|aspx?)$", path, re.I):
            add("warning", "server_file", path, "A static host will not run this server-side file.")
        if item["size"] > limits["maxFileBytes"]:
            add("error", "large_file", path, "This file exceeds the selected per-file limit.")
        total += item["size"]
        if total > _MAX_SAFE:
            raise ValueError("Total size exceeds the safe integer range.")
    if not has_entry:
        add("error", "missing_index", None, "Put index.html at the root of the folder you upload.")
    if total > limits["maxTotalBytes"]:
        add("error", "large_site", None, "The folder exceeds the selected total size limit.")
    return dict(ok=not any(i["severity"] == "error" for i in issues), fileCount=len(entries), totalBytes=total, limits=limits, issues=issues)

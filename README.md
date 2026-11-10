# Figment Site Check

Catch common upload mistakes before publishing a static website. Check a local folder, or pass a list of file names and sizes to the library. The tool does not read file contents, execute site code, change files, or send data anywhere.

Built by [Figment](https://figment.so/), a website host for sites made with Figma, HTML, ChatGPT, or Claude. The checker also works with other static hosts.

## Quick start

```sh
npx figment-site-check ./dist
```

Or use Python:

```sh
pip install figment-site-check
figment-site-check ./dist
```

Each command prints JSON. Exit codes: `0` means no error findings, `1` means error findings, and `2` means invalid input or a file access error. Warnings do not change exit code 0.

## What it checks

| Check | Result |
| --- | --- |
| Missing root `index.html` | Error |
| `.env`, `.git`, private key files, and other named sensitive paths | Error |
| Absolute paths, traversal, duplicate paths, or case collisions | Error |
| Symbolic links inside the folder | Error; links are not followed |
| File or folder exceeds the selected size limit | Error |
| TypeScript, JSX, Vue, or Svelte source | Warning; build first |
| PHP, Python, or other server-side files | Warning; static hosting does not execute them |
| `node_modules` | Warning; select the build output |

Defaults are 20 MiB per file and 50 MiB total. These are checker defaults, **not Figment plan limits**. Set the limits to match your host:

```sh
figment-site-check ./dist --max-file-mib 10 --max-total-mib 100
```

The CLI stops at 10,000 directory entries or 100 nested folders. It reports `.git`, `.svn`, `.hg`, and `node_modules` without entering them. Their contents are not counted in the reported size. An empty folder produces a missing-entry error.

## JavaScript API

```js
const {auditFiles} = require('figment-site-check');
const report = auditFiles([
  {path: 'index.html', size: 1800},
  {path: 'assets/site.css', size: 900}
], {maxTotalBytes: 50 * 1024 * 1024});
console.log(report.ok); // true
```

TypeScript definitions are included. The package also works with ESM via a default import.

## Python API

```python
from figment_site_check import audit_files
report = audit_files([
    {"path": "index.html", "size": 1800},
    {"path": "assets/site.css", "size": 900},
])
print(report["ok"])
```

Both versions use the same JSON keys. File entries have a relative forward-slash `path`, a byte `size`, and optional `kind` (`file` or `symlink`).

## Limits

This is a file-manifest check, not a security audit or a full website test. It does not find secrets hidden inside ordinary files, broken links, missing assets, browser errors, or failing forms. A clean result does not guarantee that the website works. Test the published site in a browser.

## Development

```sh
npm test
PYTHONPATH=src python3 -m unittest discover -s test -p 'test_*.py'
```

JavaScript and Python share `test/cases.json`. No runtime dependencies. MIT license.

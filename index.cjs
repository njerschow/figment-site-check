'use strict';

const DEFAULTS = {maxFileBytes: 20 * 1024 * 1024, maxTotalBytes: 50 * 1024 * 1024};
const MAX_ENTRIES = 10000;
const SENSITIVE = /^(?:\.env(?:\..*)?|\.git|\.svn|\.hg|\.npmrc|\.pypirc|id_rsa|id_ed25519|credentials|secrets?\.json)$|\.(?:pem|key|p12|pfx)$/i;

function auditFiles(entries, options = {}) {
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) throw new TypeError('Pass an array of at most 10000 file entries.');
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Options must be an object.');
  const limits = {...DEFAULTS, ...options};
  for (const key of Object.keys(DEFAULTS)) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0) throw new TypeError(`${key} must be a positive safe integer.`);
  }
  const issues = [];
  const seen = new Set();
  const folded = new Set();
  let totalBytes = 0;
  let hasEntry = false;
  const add = (severity, code, path, message) => issues.push({severity, code, path, message});
  for (const item of entries) {
    if (!item || typeof item.path !== 'string' || !Number.isSafeInteger(item.size) || item.size < 0 || !['file', 'symlink'].includes(item.kind === undefined ? 'file' : item.kind)) {
      throw new TypeError('Each entry needs a relative path, non-negative safe integer size, and optional kind: file or symlink.');
    }
    const path = item.path;
    const parts = path.split('/');
    if (!path || path.length > 4096 || /[\\\x00-\x1f\x7f:]/.test(path) || parts.some(p => p === '' || p === '.' || p === '..')) {
      add('error', 'invalid_path', path, 'Use a relative path with forward slashes and no traversal.');
      continue;
    }
    if (seen.has(path)) add('error', 'duplicate_path', path, 'This path occurs more than once.');
    else if (folded.has(path.toLowerCase())) add('error', 'case_collision', path, 'Another file has the same path with different capitalization.');
    seen.add(path);
    folded.add(path.toLowerCase());
    if (item.kind === 'symlink') add('error', 'symlink', path, 'Replace this link with a real file inside the site folder.');
    else if (path === 'index.html') hasEntry = true;
    if (parts.some(p => SENSITIVE.test(p))) add('error', 'sensitive_path', path, 'Remove this private or credential-related path before upload.');
    if (parts.includes('node_modules')) add('warning', 'dependencies', path, 'Upload the built website, not node_modules.');
    if (/\.(tsx?|jsx|vue|svelte)$/i.test(path)) add('warning', 'source_file', path, 'This looks like source code. Build the site before upload.');
    if (/\.(php|py|rb|cgi|pl|aspx?)$/i.test(path)) add('warning', 'server_file', path, 'A static host will not run this server-side file.');
    if (item.size > limits.maxFileBytes) add('error', 'large_file', path, 'This file exceeds the selected per-file limit.');
    totalBytes += item.size;
    if (!Number.isSafeInteger(totalBytes)) throw new RangeError('Total size exceeds the safe integer range.');
  }
  if (!hasEntry) add('error', 'missing_index', null, 'Put index.html at the root of the folder you upload.');
  if (totalBytes > limits.maxTotalBytes) add('error', 'large_site', null, 'The folder exceeds the selected total size limit.');
  return {ok: !issues.some(i => i.severity === 'error'), fileCount: entries.length, totalBytes, limits, issues};
}

module.exports = {auditFiles, DEFAULTS, MAX_ENTRIES};

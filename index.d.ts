export interface FileEntry { path: string; size: number; kind?: 'file' | 'symlink'; }
export interface Limits { maxFileBytes?: number; maxTotalBytes?: number; }
export interface Issue { severity: 'error' | 'warning'; code: string; path: string | null; message: string; }
export function auditFiles(entries: FileEntry[], options?: Limits): {
  ok: boolean; fileCount: number; totalBytes: number;
  limits: Required<Limits>; issues: Issue[];
};
export const DEFAULTS: Required<Limits>;
export const MAX_ENTRIES: number;

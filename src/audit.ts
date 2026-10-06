export const LIMITS = { entries: 20_000, path: 4_096, characters: 2_000_000, nodes: 100_000 } as const;
export type EntryKind = 'file' | 'directory' | 'symlink';
export interface PathEntry { path: string; kind: EntryKind }
export interface Finding { code: string; severity: 'error' | 'warning'; path: string; related?: string; message: string }
export interface AuditReport {
  schema: 'pathcarry/v1'; entries: number; destinationPrefix: number;
  errors: number; warnings: number; findings: Finding[]; notes: string[];
}
export const SCOPE = 'Filename preflight only. Contents, archive integrity and exact filesystem behavior are not verified.';

export function validateEntries(entries: readonly PathEntry[]): void {
  if (!Array.isArray(entries) || entries.length > LIMITS.entries) throw new Error(`Choose at most ${LIMITS.entries.toLocaleString('en-US')} entries.`);
  let characters = 0;
  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string' || !['file', 'directory', 'symlink'].includes(entry.kind)) throw new Error('Invalid path entry.');
    characters += entry.path.length;
    if (entry.path.length > LIMITS.path || characters > LIMITS.characters) throw new Error('Path text exceeds the safety limit (4,096 characters per path; 2 million total).');
  }
}

export function parseManifest(text: string): PathEntry[] {
  if (text.length > LIMITS.characters) throw new Error('Path list exceeds 2 million characters.');
  const entries = text.split(/\r?\n/).filter(line => line !== '').map(path => ({ path, kind: path.endsWith('/') ? 'directory' as const : 'file' as const }));
  validateEntries(entries);
  return entries;
}

export function audit(entries: readonly PathEntry[], destinationPrefix = 40, notes: string[] = []): AuditReport {
  validateEntries(entries);
  if (!Number.isInteger(destinationPrefix) || destinationPrefix < 0 || destinationPrefix > 32_000) throw new Error('Destination prefix must be a whole number from 0 to 32,000.');
  const findings: Finding[] = [];
  const nodes = new Map<string, Set<EntryKind>>();
  let nodeCharacters = 0;
  const explicit = new Set<string>();
  const add = (code: string, severity: Finding['severity'], path: string, message: string, related?: string): void => {
    if (findings.length >= 50_000) throw new Error('More than 50,000 findings. Check smaller groups of paths to get a complete report.');
    findings.push({ code, severity, path, message, ...(related === undefined ? {} : { related }) });
  };
  const register = (path: string, kind: EntryKind): void => {
    let kinds = nodes.get(path);
    if (!kinds) {
      if (nodes.size >= LIMITS.nodes) throw new Error('Too many directory components. Use a smaller selection.');
      nodeCharacters += path.length;
      if (nodeCharacters > 8_000_000) throw new Error('Expanded directory components exceed the 8 million character budget. Use a smaller selection.');
      kinds = new Set(); nodes.set(path, kinds);
    }
    kinds.add(kind);
  };
  for (const entry of entries) {
    const path = entry.kind === 'directory' && entry.path.endsWith('/') ? entry.path.slice(0, -1) : entry.path;
    if (explicit.has(path)) add('duplicate', 'error', path, 'This path appears more than once. Extraction or copying may overwrite an entry.');
    explicit.add(path);
    const parts = path.split('/');
    if (!path || /^[\\/]|^[a-z]:/i.test(path) || path.split(/[\\/]/).some(part => part === '..' || part === '.' || part === '')) {
      add('unsafe-path', 'error', entry.path, 'Use a nonempty relative path without empty, dot or parent-directory components.');
    }
    let prefix = '';
    parts.forEach((part, index) => {
      prefix = index ? `${prefix}/${part}` : part;
      register(prefix, index === parts.length - 1 ? entry.kind : 'directory');
    });
    if (entry.kind === 'symlink') add('symlink', 'warning', path, 'Symbolic link or junction: the target is not followed or inspected, and may not survive a handoff.');
    if (destinationPrefix + path.length + 1 > 260) add('long-path', 'warning', path, `Estimated destination length is ${destinationPrefix + path.length + 1} UTF-16 units including the terminator. Legacy Windows applications may exceed MAX_PATH (260).`);
  }
  const folded = new Map<string, string>();
  const normalized = new Map<string, string>();
  const windows = new Map<string, string>();
  const encoder = new TextEncoder();
  for (const [path, kinds] of nodes) {
    const name = path.slice(path.lastIndexOf('/') + 1);
    if (kinds.has('directory') && (kinds.has('file') || kinds.has('symlink'))) add('type-conflict', 'error', path, 'The same path is needed as both a directory and a file or link.');
    if (/[<>:"\\|?*\u0000-\u001f]/u.test(name)) add('windows-character', 'error', path, 'This component contains a character forbidden in ordinary Windows filenames.');
    if (/[ .]$/.test(name)) add('trailing-character', 'error', path, 'Windows tools commonly strip or reject a trailing space or period. Rename this component before copying.');
    if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name.replace(/[ .]+$/, ''))) add('reserved-name', 'error', path, 'Windows reserves this device name, even when it has a file extension.');
    if (name.length > 255 || encoder.encode(name).length > 255) add('long-component', 'warning', path, 'This component exceeds 255 UTF-16 units or UTF-8 bytes. Common filesystems may reject it.');
    if (/[\u202a-\u202e\u2066-\u2069]/u.test(name)) add('bidi-control', 'warning', path, 'Bidirectional formatting characters can make this name appear different from its stored order.');
    const nfc = path.normalize('NFC');
    const previousNfc = normalized.get(nfc);
    if (previousNfc !== undefined && previousNfc !== path) add('unicode-collision', 'warning', path, 'These paths become identical after Unicode normalization. Some systems treat them as the same path.', previousNfc);
    else normalized.set(nfc, path);
    const key = nfc.toLowerCase();
    const previous = folded.get(key);
    if (previous !== undefined && previous !== path && previous.normalize('NFC') !== nfc) add('case-collision', 'warning', path, 'These paths differ by case (possibly also Unicode normalization). Files may overwrite, or directories may merge, on a case-insensitive destination.', previous);
    else if (previous === undefined) folded.set(key, path);
    const windowsKey = path.split('/').map(part => part.replace(/[ .]+$/, '').normalize('NFC').toLowerCase()).join('/');
    const previousWindows = windows.get(windowsKey);
    if (previousWindows !== undefined && previousWindows !== path && previousWindows.normalize('NFC').toLowerCase() !== key) add('windows-collision', 'error', path, 'These paths collide when trailing periods/spaces are removed and case is ignored.', previousWindows);
    else if (previousWindows === undefined) windows.set(windowsKey, path);
  }
  findings.sort((a, b) => Number(a.severity === 'warning') - Number(b.severity === 'warning') || compare(a.path, b.path) || compare(a.code, b.code));
  return { schema: 'pathcarry/v1', entries: entries.length, destinationPrefix, errors: findings.filter(item => item.severity === 'error').length, warnings: findings.filter(item => item.severity === 'warning').length, findings, notes: [SCOPE, 'Case and Unicode comparisons are heuristics; filesystem and application policies vary.', ...notes] };
}

function compare(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

export const SAMPLE = `Project/README.md
Project/readme.md
Project/Art/logo.svg
Project/art/banner.svg
Project/exports/CON.pdf
Project/invoices/Invoice: July.pdf
Project/notes/final.txt${' '}
Project/notes/final.txt
Project/café.txt
Project/café.txt
Project/assets/cover.png`;

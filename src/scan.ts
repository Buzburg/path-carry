import { opendir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { LIMITS, type PathEntry } from './audit';

/** Do not recurse through links. Root and entries must remain unchanged during a scan. */
export async function scanFolder(root: string): Promise<PathEntry[]> {
  const stat = await lstat(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Folder root must be a real directory, not a symbolic link or junction.');
  const entries: PathEntry[] = [];
  const pending = [''];
  let characters = 0;
  while (pending.length) {
    const relative = pending.pop()!;
    const full = join(root, relative);
    const current = await lstat(full);
    if (current.isSymbolicLink() || !current.isDirectory()) throw new Error('A directory changed during scanning. Keep the folder unchanged and retry.');
    const directory = await opendir(full);
    for await (const item of directory) {
      const path = relative ? `${relative}/${item.name}` : item.name;
      characters += path.length;
      if (entries.length >= LIMITS.entries || characters > LIMITS.characters || path.length > LIMITS.path) throw new Error('Folder exceeds the entry or path-text limits. Choose a smaller folder.');
      const kind = item.isSymbolicLink() ? 'symlink' : item.isDirectory() ? 'directory' : item.isFile() ? 'file' : undefined;
      if (!kind) throw new Error('Folder contains an unsupported special filesystem entry. Choose a smaller selection.');
      entries.push({ path, kind });
      if (kind === 'directory') pending.push(path);
    }
  }
  return entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

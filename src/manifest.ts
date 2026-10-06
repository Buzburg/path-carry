import { open, stat } from 'node:fs/promises';
import { LIMITS, parseManifest, type PathEntry } from './audit';

export async function readManifest(path: string): Promise<PathEntry[]> {
  if (!(await stat(path)).isFile()) throw new Error('Path list must be a regular UTF-8 text file.');
  const file = await open(path, 'r');
  try {
    const stat = await file.stat();
    const limit = LIMITS.characters * 4;
    if (!stat.isFile()) throw new Error('Path list must be a regular UTF-8 text file.');
    if (stat.size > limit) throw new Error('Path list file exceeds 8 MB.');
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > limit) throw new Error('Path list file exceeds 8 MB.');
    return parseManifest(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length)));
  } finally { await file.close(); }
}

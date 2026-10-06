import { BlobReader, ZipReader } from '@zip.js/zip.js/lib/zip-core-native.js';
import { LIMITS, validateEntries, type PathEntry } from './audit';

/** Random-access metadata reads only: never call an entry's getData(). */
export class BoundedBlobReader extends BlobReader {
  private consumed = 0;
  override async readUint8Array(index: number, length: number): Promise<Uint8Array> {
    if (!Number.isSafeInteger(index) || !Number.isSafeInteger(length) || index < 0 || length < 0 || length > 16 * 1024 * 1024 || this.consumed + length > 32 * 1024 * 1024) throw new Error('ZIP metadata exceeds the read budget (16 MiB per read; 32 MiB total).');
    this.consumed += length;
    return super.readUint8Array(index, length);
  }
}

export async function readZip(blob: Blob): Promise<{ entries: PathEntry[]; notes: string[] }> {
  const reader = new ZipReader(new BoundedBlobReader(blob), { useWebWorkers: false, strictness: 'balanced', filenameValidation: 'tolerant', maxAppendedDataSize: 0 });
  const entries: PathEntry[] = [];
  let characters = 0;
  let encrypted = 0;
  try {
    for await (const entry of reader.getEntriesGenerator()) {
      characters += entry.filename.length;
      if (entries.length >= LIMITS.entries || entry.filename.length > LIMITS.path || characters > LIMITS.characters) throw new Error('ZIP has too many entries or too much path text. Limit: 20,000 entries and 2 million characters.');
      entries.push({ path: entry.filename, kind: entry.symlink ? 'symlink' : entry.directory ? 'directory' : 'file' });
      if (entry.encrypted) encrypted++;
    }
    validateEntries(entries);
    const notes = ['ZIP central-directory names only: no files were extracted, decompressed or checked for integrity.'];
    if (encrypted) notes.push(`${encrypted} encrypted entries: their visible names were checked; their contents were not read.`);
    if (reader.warnings?.length) throw new Error('ZIP metadata is ambiguous or nonstandard. No complete report was produced. Re-create the archive with a trusted tool.');
    return { entries, notes };
  } finally { await reader.close(); }
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BlobWriter, ZipWriter, TextReader } from '@zip.js/zip.js';
import { BoundedBlobReader, readZip } from '../src/zip';
import { audit } from '../src/audit';

async function fixture(names: string[], zip64 = false): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false, level: 0, zip64 });
  for (const name of names) await writer.add(name, new TextReader('Contents are irrelevant to filename checking.'));
  return writer.close();
}
test('real ZIP central-directory metadata is read without extracting files', async () => {
  const result = await readZip(await fixture(['Art/logo.svg', 'art/banner.svg', 'CON.txt']));
  assert.equal(result.entries.length, 3);
  assert.ok(audit(result.entries).findings.some(item => item.code === 'case-collision'));
  assert.ok(audit(result.entries).findings.some(item => item.code === 'reserved-name'));
});
test('ZIP64 and Unicode names are supported', async () => {
  const result = await readZip(await fixture(['café.txt', '資料.txt'], true));
  assert.deepEqual(result.entries.map(entry => entry.path), ['café.txt', '資料.txt']);
});
test('empty ZIP is a valid complete metadata check', async () => {
  assert.deepEqual((await readZip(await fixture([]))).entries, []);
});
test('invalid and truncated ZIPs fail closed', async () => {
  await assert.rejects(readZip(new Blob(['not a zip'])));
  const blob = await fixture(['a']);
  await assert.rejects(readZip(blob.slice(0, blob.size - 10)));
});
test('metadata reader rejects oversized and invalid requests before allocating', async () => {
  const reader = new BoundedBlobReader(new Blob(['abc']));
  await assert.rejects(reader.readUint8Array(0, 17 * 1024 * 1024), /read budget/);
  await assert.rejects(reader.readUint8Array(-1, 3), /read budget/);
  await assert.rejects(reader.readUint8Array(0, NaN), /read budget/);
});
test('ZIP symlinks are detected from metadata without reading their targets', async () => {
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false, level: 0 });
  await writer.add('link', new TextReader('../../outside'), { unixMode: 0o120777 });
  const result = await readZip(await writer.close());
  assert.equal(result.entries[0]?.kind, 'symlink');
});
test('contents can be corrupt and the metadata-only report does not certify them', async () => {
  const bytes = new Uint8Array(await (await fixture(['okay.txt'])).arrayBuffer());
  bytes[40] = (bytes[40] ?? 0) ^ 255;
  const result = await readZip(new Blob([bytes]));
  assert.equal(result.entries[0]?.path, 'okay.txt');
  assert.ok(result.notes.some(note => note.includes('integrity')));
});
test('unsafe archive paths are reported rather than extracted or normalized away', async () => {
  const bytes = new Uint8Array(await (await fixture(['aa/file'])).arrayBuffer());
  for (let index = 0; index < bytes.length - 7; index++) {
    if (bytes[index] === 97 && bytes[index + 1] === 97 && bytes[index + 2] === 47) { bytes[index] = 46; bytes[index + 1] = 46; }
  }
  const result = await readZip(new Blob([bytes]));
  assert.equal(result.entries[0]?.path, '../file');
  assert.ok(audit(result.entries).findings.some(item => item.code === 'unsafe-path'));
});

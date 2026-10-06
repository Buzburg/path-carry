import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readManifest } from '../src/manifest';

test('manifest handles UTF-8 with a BOM without including the BOM in a name', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pathcarry-manifest-'));
  try {
    const path = join(root, 'list'); await writeFile(path, '\ufeffcafé.txt\nempty/');
    assert.deepEqual(await readManifest(path), [{ path: 'café.txt', kind: 'file' }, { path: 'empty/', kind: 'directory' }]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('manifest rejects invalid UTF-8 rather than silently replacing filenames', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pathcarry-manifest-'));
  try {
    const path = join(root, 'list'); await writeFile(path, Buffer.from([0xff, 0xfe]));
    await assert.rejects(readManifest(path), /encoded data/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('manifest rejects oversized input before reading it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pathcarry-manifest-'));
  try {
    const path = join(root, 'list'); await writeFile(path, Buffer.alloc(8_000_001, 97));
    await assert.rejects(readManifest(path), /8 MB/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('manifest does not read directories or special devices', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pathcarry-manifest-'));
  try {
    await assert.rejects(readManifest(root));
    if (process.platform !== 'win32') await assert.rejects(readManifest('/dev/zero'), /regular UTF-8/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

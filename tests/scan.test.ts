import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanFolder } from '../src/scan';

test('folder scan includes empty directories, preserves contents and never follows a link', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pathcarry-test-'));
  try {
    await mkdir(join(root, 'empty'));
    await writeFile(join(root, 'private.txt'), 'leave this exact content alone');
    await symlink(join(root, 'empty'), join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    const result = await scanFolder(root);
    assert.deepEqual(result, [{ path: 'empty', kind: 'directory' }, { path: 'linked', kind: 'symlink' }, { path: 'private.txt', kind: 'file' }]);
    assert.equal(await readFile(join(root, 'private.txt'), 'utf8'), 'leave this exact content alone');
    await assert.rejects(scanFolder(join(root, 'linked')), /not a symbolic link/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('missing folder fails instead of reporting no findings', async () => {
  await assert.rejects(scanFolder(join(tmpdir(), 'pathcarry-nonexistent-folder-9f657d')));
});

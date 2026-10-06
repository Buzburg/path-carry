import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { BlobWriter, ZipWriter, TextReader } from '@zip.js/zip.js';
const cli = resolve('dist/path-carry.mjs');
const run = (args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 10_000 });
test('built CLI prints help and rejects incomplete or ambiguous arguments', () => {
  assert.equal(run(['--help']).status, 0);
  for (const args of [[], ['--wat'], ['--zip'], ['a', 'b'], ['--format', 'yaml', 'a'], ['--prefix', '-1', 'a']]) {
    const result = run(args); assert.equal(result.status, 2, JSON.stringify(args)); assert.equal(result.stdout, '');
  }
});
test('built CLI folder, manifest and ZIP checks use stable exit codes and JSON', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pathcarry-cli-'));
  try {
    const directory = join(root, 'folder'); await mkdir(directory); await mkdir(join(directory, 'empty'));
    await writeFile(join(directory, 'safe.txt'), 'untouched');
    let result = run([directory, '--format', 'json']);
    assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).entries, 2);
    const list = join(root, 'paths.txt'); await writeFile(list, 'Art/a\nart/b\nCON.txt');
    result = run(['--list', list, '--format', 'json']);
    assert.equal(result.status, 1, result.stderr); assert.equal(JSON.parse(result.stdout).schema, 'pathcarry/v1');
    result = run(['--list', list, '--format', 'html']);
    assert.equal(result.status, 1); assert.ok(result.stdout.startsWith('<!doctype html>'));
    const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false, level: 0 });
    await writer.add('AUX.md', new TextReader('payload'));
    const zip = join(root, 'archive.zip'); await writeFile(zip, new Uint8Array(await (await writer.close()).arrayBuffer()));
    result = run(['--zip', zip, '--format', 'json']);
    assert.equal(result.status, 1, result.stderr); assert.equal(JSON.parse(result.stdout).findings[0].code, 'reserved-name');
    await writeFile(zip, 'corrupt'); result = run(['--zip', zip]);
    assert.equal(result.status, 2); assert.equal(result.stdout, '');
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('terminal control characters in filenames are escaped in text reports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pathcarry-terminal-'));
  try {
    const list = join(root, 'paths.txt'); await writeFile(list, 'evil\u001b[2J.txt');
    const result = run(['--list', list]);
    assert.equal(result.status, 1); assert.ok(!result.stdout.includes('\u001b')); assert.ok(result.stdout.includes('\\u001b'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audit, LIMITS, parseManifest, SAMPLE, type PathEntry } from '../src/audit';
import { htmlReport } from '../src/report';

const file = (path: string): PathEntry => ({ path, kind: 'file' });
const codes = (path: string): string[] => audit([file(path)]).findings.map(item => item.code);
for (const path of ['CON', 'con.txt', 'AUX.tar.gz', 'LPT9.log', 'COM¹.txt', 'LPT²', 'NUL.', 'PRN ']) {
  test(`reserved Windows device: ${path}`, () => assert.ok(codes(path).includes('reserved-name')));
}
for (const path of ['COM0', 'COM10', 'conifer.txt', 'auxiliary', 'LPT0', 'com⁴.txt']) {
  test(`ordinary name: ${path}`, () => assert.equal(audit([file(path)]).findings.length, 0));
}
for (const path of ['a:b', 'a?b', 'a\\b', 'a\u0000b', 'a\nb', 'a<b', 'a>b', 'a|b', 'a*b', 'a"b']) {
  test(`invalid Windows character: ${JSON.stringify(path)}`, () => assert.ok(codes(path).includes('windows-character')));
}
for (const path of ['../x', 'a/../x', '/etc/passwd', 'C:/file', '\\server\\share', 'a//b', './a', '', 'a/']) {
  test(`unsafe relative path: ${JSON.stringify(path)}`, () => assert.ok(codes(path).includes('unsafe-path')));
}
test('safe directory trailing slash is not an empty component', () => {
  assert.equal(audit([{ path: 'a/b/', kind: 'directory' }]).findings.length, 0);
});
test('case collisions include ancestor directories with different leaves', () => {
  const result = audit([file('Art/logo.svg'), file('art/banner.svg')]);
  assert.deepEqual(result.findings.map(({ code, path, related }) => ({ code, path, related })), [{ code: 'case-collision', path: 'art', related: 'Art' }]);
});
test('Unicode normalization collisions differ from case collisions', () => {
  const result = audit([file('café/a'), file('cafe\u0301/b')]);
  assert.equal(result.findings[0]?.code, 'unicode-collision');
  assert.equal(result.findings.length, 1);
});
test('case plus Unicode differences are still found', () => {
  assert.ok(audit([file('CAFÉ'), file('cafe\u0301')]).findings.some(item => item.code === 'case-collision'));
});
test('trailing dot/space collisions include ancestor directories', () => {
  const result = audit([file('report/a'), file('report. /b')]);
  assert.ok(result.findings.some(item => item.code === 'windows-collision' && item.path === 'report. '));
});
test('file cannot also be a parent directory', () => {
  assert.ok(audit([file('data'), file('data/file')]).findings.some(item => item.code === 'type-conflict'));
});
test('explicit directory plus inferred directory is not a duplicate', () => {
  assert.equal(audit([{ path: 'data/', kind: 'directory' }, file('data/file')]).findings.length, 0);
});
test('duplicate entries are reported', () => {
  assert.equal(audit([file('a'), file('a')]).findings[0]?.code, 'duplicate');
});
test('UTF-8 component length matters even below 255 JS characters', () => {
  assert.ok(codes('é'.repeat(128)).includes('long-component'));
  assert.ok(!codes('é'.repeat(127)).includes('long-component'));
});
test('MAX_PATH includes prefix and terminator', () => {
  assert.ok(!audit([file('a'.repeat(219))], 40).findings.some(item => item.code === 'long-path'));
  assert.ok(audit([file('a'.repeat(220))], 40).findings.some(item => item.code === 'long-path'));
});
test('bidi controls and symbolic links are advisory', () => {
  const result = audit([{ path: 'x\u202etxt', kind: 'symlink' }]);
  assert.equal(result.errors, 0); assert.equal(result.warnings, 2);
});
test('manifest preserves spaces, ignores blank lines and accepts CRLF', () => {
  assert.deepEqual(parseManifest('a \r\n\r\nb/\n'), [file('a '), { path: 'b/', kind: 'directory' }]);
});
test('input limits reject rather than silently truncate', () => {
  assert.throws(() => audit(Array.from({ length: LIMITS.entries + 1 }, () => file('x'))), /20,000/);
  assert.throws(() => audit([file('a'.repeat(LIMITS.path + 1))]), /safety limit/);
  assert.throws(() => parseManifest('a'.repeat(LIMITS.characters + 1)), /2 million/);
  assert.throws(() => audit(Array.from({ length: 501 }, () => file('a'.repeat(4000)))), /safety limit/);
});
test('directory expansion is bounded independently of input count', () => {
  const entries = Array.from({ length: 600 }, (_, index) => file(`${index}/${'a/'.repeat(200)}z`));
  assert.throws(() => audit(entries), /directory components/);
});
test('findings are bounded', () => {
  const entries = Array.from({ length: 18_000 }, (_, index) => file(`${index}/CON. /a?`));
  assert.throws(() => audit(entries), /50,000 findings/);
});
test('invalid settings cannot produce a clean result', () => {
  for (const prefix of [-1, NaN, 0.5, 32001, Infinity]) assert.throws(() => audit([], prefix), /Destination prefix/);
});
test('20,000 ordinary entries finish without findings', () => {
  const result = audit(Array.from({ length: 20_000 }, (_, index) => file(`photos/day${index % 30}/image${index}.jpg`)));
  assert.equal(result.entries, 20_000); assert.equal(result.findings.length, 0);
});
test('sample has meaningful collisions and Windows errors', () => {
  const result = audit(parseManifest(SAMPLE));
  assert.equal(result.entries, 11); assert.ok(result.errors >= 3); assert.ok(result.warnings >= 3);
  assert.deepEqual(result, audit(parseManifest(SAMPLE)));
});
test('HTML report escapes untrusted path and note text', () => {
  const report = audit([file('<img src=x onerror=alert(1)>.txt')], 40, ['</li><script>alert(1)</script>']);
  const html = htmlReport(report);
  assert.ok(!html.includes('<img')); assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;img')); assert.ok(html.includes("default-src 'none'"));
});

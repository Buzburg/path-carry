import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';

const app = pathToFileURL(resolve('dist/path-carry.html')).href;
async function sample(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Try a messy example' }).click();
  await expect(page.locator('#status')).toContainText('Complete.');
}
async function paths(page: Page, text: string): Promise<void> {
  await page.locator('#paste-panel').evaluate((element: HTMLDetailsElement) => { element.open = true; });
  await page.locator('#paths').fill(text);
  await page.getByRole('button', { name: 'Check these paths' }).click();
  await expect(page.locator('#status')).toContainText('Complete.');
}
test.beforeEach(async ({ page, context }) => {
  await context.setOffline(true);
  await page.goto(app);
});

test('works as a local HTML file offline with no external requests', async ({ page }) => {
  const requests: string[] = []; const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await sample(page);
  await expect(page.locator('#entry-count')).toHaveText('11');
  await expect(page.locator('#findings')).toContainText('case-collision');
  await expect(page.locator('#findings')).toContainText('reserved-name');
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});
test('filters results without changing complete exports', async ({ page }) => {
  await sample(page);
  await page.locator('#severity').selectOption('error');
  await page.locator('#search').fill('CON');
  await expect(page.locator('.finding')).toHaveCount(1);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save JSON' }).click();
  const download = await downloadEvent;
  const file = await download.path();
  expect(file).toBeTruthy();
  const { readFile } = await import('node:fs/promises');
  const report = JSON.parse(await readFile(file!, 'utf8')) as { findings: unknown[]; entries: number };
  expect(report.entries).toBe(11); expect(report.findings.length).toBeGreaterThan(1);
});
test('downloaded report renders safely as standalone HTML', async ({ page }, testInfo) => {
  await paths(page, '<img src=x onerror=alert(1)>.txt');
  await expect(page.locator('#findings img')).toHaveCount(0);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save readable report' }).click();
  const download = await downloadEvent;
  const file = testInfo.outputPath('report.html'); await download.saveAs(file);
  await page.goto(pathToFileURL(file).href);
  await expect(page.getByRole('heading', { name: 'Review before the handoff.' })).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.locator('body')).toContainText('<img src=x onerror=alert(1)>.txt');
});
test('edited input or prefix invalidates an old report', async ({ page }) => {
  await sample(page);
  await page.locator('#prefix').fill('80');
  await expect(page.locator('#results')).toBeHidden();
  await expect(page.locator('#status')).toContainText('Run the check again');
  await sample(page);
  await page.locator('#paths').fill('safe.txt');
  await expect(page.locator('#results')).toBeHidden();
});
test('invalid input has no stale successful result', async ({ page }) => {
  await sample(page);
  await page.locator('#prefix').fill('');
  await page.getByRole('button', { name: 'Check these paths' }).click();
  await expect(page.getByRole('alert')).toContainText('destination prefix');
  await expect(page.locator('#results')).toBeHidden();
});
test('clear discards paths and report', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Clear this check' }).click();
  await expect(page.locator('#results')).toBeHidden();
  await expect(page.locator('#paths')).toHaveValue('');
});
test('safe paths produce a qualified clean result', async ({ page }) => {
  await paths(page, 'project/docs/readme.md\nproject/assets/logo.svg');
  await expect(page.locator('#result-title')).toHaveText('No filename issues found.');
  await expect(page.locator('#findings')).toContainText('does not verify file contents');
});
test('ZIP input checks real metadata and rejects corrupt input', async ({ page }) => {
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false, level: 0 });
  await writer.add('CON.txt', new TextReader('not uploaded'));
  const blob = await writer.close();
  await page.locator('#zip').setInputFiles({ name: 'handoff.zip', mimeType: 'application/zip', buffer: Buffer.from(await blob.arrayBuffer()) });
  await expect(page.locator('#status')).toContainText('Complete.');
  await expect(page.locator('#findings')).toContainText('reserved-name');
  await page.locator('#zip').setInputFiles({ name: 'broken.zip', mimeType: 'application/zip', buffer: Buffer.from('broken') });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#results')).toBeHidden();
});
test('folder picker inspects relative paths', async ({ page }, testInfo) => {
  const directory = testInfo.outputPath('selected-folder');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'safe.txt'), 'private payload');
  await page.locator('#folder').setInputFiles(directory);
  await expect(page.locator('#status')).toContainText('Complete.');
  await expect(page.locator('#entry-count')).toHaveText('1');
  await expect(page.locator('#notes')).toContainText('empty directories');
});
test('long lists paginate the display', async ({ page }) => {
  await paths(page, Array.from({ length: 150 }, (_, index) => `a${index}?.txt`).join('\n'));
  await expect(page.locator('.finding')).toHaveCount(100);
  await page.getByRole('button', { name: 'Show 100 more' }).click();
  await expect(page.locator('.finding')).toHaveCount(150);
});
test('cancel prevents an in-flight check from publishing a result', async ({ page }) => {
  await page.locator('#paste-panel').evaluate((element: HTMLDetailsElement) => { element.open = true; });
  await page.locator('#paths').fill(Array.from({ length: 200 }, (_, index) => `folder/file${index}`).join('\n'));
  await page.evaluate(() => {
    (document.getElementById('check-paths') as HTMLButtonElement).click();
    (document.getElementById('cancel') as HTMLButtonElement).click();
  });
  await expect(page.locator('#status')).toContainText('cancelled');
  await expect(page.locator('#results')).toBeHidden();
  await sample(page);
});
test('keyboard can reach and activate the example', async ({ page }) => {
  await page.getByRole('button', { name: 'Try a messy example' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#status')).toContainText('Complete.');
  await expect(page.locator('#result-title')).toBeFocused();
});
test('worker checks a full 20,000-entry manifest', async ({ page }) => {
  await page.evaluate(() => {
    const input = document.getElementById('paths') as HTMLTextAreaElement;
    input.value = Array.from({ length: 20_000 }, (_, index) => `folder/file${index}`).join('\n');
    input.dispatchEvent(new Event('input'));
    (document.getElementById('check-paths') as HTMLButtonElement).click();
  });
  await expect(page.locator('#status')).toContainText('Complete.', { timeout: 15_000 });
  await expect(page.locator('#entry-count')).toHaveText('20,000');
});
test('initial and result screens have no automated accessibility violations', async ({ page }) => {
  for (const state of ['initial', 'results']) {
    if (state === 'results') await sample(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), state).toEqual([]);
  }
});
for (const width of [320, 768, 1440]) {
  test(`layout fits a ${width}px viewport`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await sample(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`pathcarry-${width}.png`), fullPage: true });
  });
}

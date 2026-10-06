import { LIMITS, parseManifest, SAMPLE, type AuditReport, type PathEntry } from './audit';
import { htmlReport } from './report';
declare const __WORKER_SOURCE__: string;
const get = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing interface element: ${id}`);
  return element as T;
};
let worker: Worker | undefined;
let workerUrl: string | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let report: AuditReport | undefined;
let visible = 100;
const status = get('status');
const error = get('error');
const folder = get<HTMLInputElement>('folder');
const zip = get<HTMLInputElement>('zip');
const prefix = get<HTMLInputElement>('prefix');

function stop(): void {
  worker?.terminate(); worker = undefined;
  if (workerUrl) URL.revokeObjectURL(workerUrl);
  workerUrl = undefined;
  clearTimeout(timer);
  get('cancel').hidden = true;
}
function discard(): void {
  report = undefined; get('results').hidden = true;
  get('findings').replaceChildren(); get('notes').replaceChildren();
  get('source').textContent = '';
}
function fail(message: string): void {
  stop(); discard(); error.textContent = message; error.hidden = false;
  status.textContent = 'Check incomplete. No report was produced.';
}
function start(input: { entries: PathEntry[]; notes: string[] } | { zip: Blob }, source: string): void {
  stop(); discard(); error.hidden = true;
  const value = prefix.value === '' ? NaN : Number(prefix.value);
  if (!Number.isInteger(value) || value < 0 || value > 32000) return fail('Enter a destination prefix from 0 to 32,000.');
  status.textContent = 'Checking names on this device…'; get('cancel').hidden = false;
  try {
    workerUrl = URL.createObjectURL(new Blob([__WORKER_SOURCE__], { type: 'text/javascript' }));
    worker = new Worker(workerUrl);
    worker.onmessage = (event: MessageEvent<{ report?: AuditReport; error?: string }>): void => {
      stop();
      if (!event.data.report) return fail(event.data.error ?? 'The check could not be completed.');
      report = event.data.report;
      get('source').textContent = source;
      get('entry-count').textContent = report.entries.toLocaleString();
      get('error-count').textContent = report.errors.toLocaleString();
      get('warning-count').textContent = report.warnings.toLocaleString();
      get('result-title').textContent = report.findings.length ? 'A few things to sort out.' : 'No filename issues found.';
      get('notes').replaceChildren(...report.notes.map(note => { const li = document.createElement('li'); li.textContent = note; return li; }));
      get<HTMLInputElement>('search').value = ''; get<HTMLSelectElement>('severity').value = 'all'; visible = 100;
      get('results').hidden = false; render();
      status.textContent = `Complete. ${report.entries.toLocaleString()} entries checked. No source files changed.`;
      get('result-title').focus({ preventScroll: true });
    };
    worker.onerror = (): void => fail('The local checker stopped unexpectedly. Try a smaller selection or a supported browser.');
    worker.onmessageerror = (): void => fail('The checker returned an unreadable result.');
    timer = setTimeout(() => fail('The check exceeded 30 seconds. Try a smaller selection.'), 30_000);
    worker.postMessage({ ...input, prefix: value });
  } catch (reason) { fail(reason instanceof Error ? reason.message : 'Cannot start the local checker.'); }
}
function render(): void {
  if (!report) return;
  const query = get<HTMLInputElement>('search').value.toLowerCase();
  const severity = get<HTMLSelectElement>('severity').value;
  const filtered = report.findings.filter(item => (severity === 'all' || item.severity === severity) && `${item.path}\n${item.related ?? ''}\n${item.code}`.toLowerCase().includes(query));
  const container = get('findings'); container.replaceChildren();
  for (const finding of filtered.slice(0, visible)) {
    const article = document.createElement('article'); article.className = 'finding';
    const marker = document.createElement('div');
    const badge = document.createElement('span'); badge.className = `badge ${finding.severity}`; badge.textContent = finding.severity;
    const code = document.createElement('p'); code.className = 'issue-code'; code.textContent = finding.code;
    marker.append(badge, code);
    const body = document.createElement('div'); const heading = document.createElement('h3');
    const path = document.createElement('code'); path.textContent = finding.path || '(empty path)'; heading.append(path); body.append(heading);
    if (finding.related !== undefined) { const related = document.createElement('p'); related.append('Also: '); const other = document.createElement('code'); other.textContent = finding.related; related.append(other); body.append(related); }
    const message = document.createElement('p'); message.textContent = finding.message; body.append(message);
    article.append(marker, body); container.append(article);
  }
  if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'clean'; empty.textContent = report.findings.length ? 'No findings match this filter.' : 'Nothing flagged by these rules. Check the scope below: a clean filename report does not verify file contents or guarantee a successful transfer.'; container.append(empty); }
  get('shown').textContent = `Showing ${Math.min(visible, filtered.length).toLocaleString()} of ${filtered.length.toLocaleString()} findings. Exports always include the complete report.`;
  get('more').hidden = filtered.length <= visible;
}
function fromText(source = 'Pasted path list'): void {
  try {
    const entries = parseManifest(get<HTMLTextAreaElement>('paths').value);
    if (!entries.length) throw new Error('Paste at least one relative path.');
    start({ entries, notes: ['Pasted list: one slash-separated relative path per line. Empty lines were ignored.'] }, source);
  } catch (reason) { fail(reason instanceof Error ? reason.message : 'Cannot read the path list.'); }
}
get('sample').onclick = (): void => { get<HTMLTextAreaElement>('paths').value = SAMPLE; get<HTMLDetailsElement>('paste-panel').open = true; fromText('Synthetic example'); };
get('check-paths').onclick = (): void => fromText();
folder.onchange = (): void => {
  const files = folder.files;
  if (!files?.length) return;
  if (files.length > LIMITS.entries) { folder.value = ''; return fail('Choose a folder with at most 20,000 files.'); }
  const entries = Array.from(files, file => ({ path: file.webkitRelativePath || file.name, kind: 'file' as const }));
  folder.value = '';
  start({ entries, notes: ['Browser folder selection: file names only; empty directories and some links may be omitted. Use the CLI to include empty directories and detect links.'] }, 'Selected folder · file names only');
};
zip.onchange = (): void => {
  const file = zip.files?.[0]; zip.value = '';
  if (file) start({ zip: file }, `ZIP: ${file.name}`);
};
get('cancel').onclick = (): void => { stop(); discard(); status.textContent = 'Check cancelled. No report was produced.'; };
get('clear').onclick = (): void => {
  stop(); discard(); get<HTMLTextAreaElement>('paths').value = ''; folder.value = ''; zip.value = ''; error.hidden = true;
  status.textContent = 'Cleared. Ready for another handoff.'; get('sample').focus();
};
prefix.oninput = (): void => { if (report || worker) { stop(); discard(); status.textContent = 'Destination length changed. Run the check again.'; } };
get<HTMLTextAreaElement>('paths').oninput = (): void => { if (report || worker) { stop(); discard(); status.textContent = 'Paths changed. Run the check again.'; } };
get('search').oninput = (): void => { visible = 100; render(); };
get('severity').onchange = (): void => { visible = 100; render(); };
get('more').onclick = (): void => { visible += 100; render(); };
function download(format: 'html' | 'json'): void {
  if (!report) return;
  const blob = new Blob([format === 'html' ? htmlReport(report) : JSON.stringify(report, null, 2)], { type: format === 'html' ? 'text/html;charset=utf-8' : 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `pathcarry-report.${format}`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
get('export-html').onclick = (): void => download('html');
get('export-json').onclick = (): void => download('json');
window.addEventListener('pagehide', stop);

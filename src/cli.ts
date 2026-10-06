import { openAsBlob } from 'node:fs';
import { audit } from './audit';
import { readManifest } from './manifest';
import { scanFolder } from './scan';
import { readZip } from './zip';
import { htmlReport } from './report';

const HELP = `PathCarry 0.1.0 — read-only filename preflight

Usage: node path-carry.mjs <folder> [--prefix 40] [--format text|json|html]
       node path-carry.mjs --zip archive.zip [options]
       node path-carry.mjs --list paths.txt [options]

--prefix is the UTF-16 length before relative paths, including the final separator.
Reports go to stdout. Errors go to stderr. No source files are modified.
Exit: 0 no findings, 1 findings, 2 invalid input or incomplete check.
Folder scans include empty directories and do not follow detected links.
Keep the source folder unchanged during scanning; this is not a security sandbox.
ZIP checks inspect central-directory names, not file contents or archive integrity.
Limits: 20,000 entries, 4,096 characters/path, 2 million path characters.
`;

async function main(args: string[]): Promise<void> {
  if (args.length === 1 && ['--help', '-h'].includes(args[0]!)) { process.stdout.write(HELP); return; }
  let source: string | undefined;
  let mode = 'folder';
  let format = 'text';
  let prefix = 40;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (['--zip', '--list', '--format', '--prefix'].includes(arg)) {
      if (seen.has(arg)) throw new Error(`Repeated option: ${arg}`);
      seen.add(arg);
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}.`);
      if (arg === '--format') format = value;
      else if (arg === '--prefix') prefix = /^\d+$/.test(value) ? Number(value) : NaN;
      else { if (source) throw new Error('Choose exactly one input.'); source = value; mode = arg.slice(2); }
    } else {
      if (arg.startsWith('-') || source) throw new Error(`Unexpected argument: ${JSON.stringify(arg)}`);
      source = arg;
    }
  }
  if (!source) throw new Error(`Choose a folder, --zip or --list. Use --help for examples.`);
  if (!['text', 'json', 'html'].includes(format)) throw new Error('Format must be text, json or html.');
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32000) throw new Error('Prefix must be a whole number from 0 to 32,000.');
  const input = mode === 'zip' ? await readZip(await openAsBlob(source)) : mode === 'list'
    ? { entries: await readManifest(source), notes: ['UTF-8 path manifest: blank lines ignored; directory paths end with /.'] }
    : { entries: await scanFolder(source), notes: ['CLI folder scan: includes empty directories. Detected links were not followed. Keep the folder unchanged while scanning.'] };
  const report = audit(input.entries, prefix, input.notes);
  const output = format === 'json' ? JSON.stringify(report, null, 2) : format === 'html' ? htmlReport(report) : [
    `PathCarry: ${report.entries} entries, ${report.errors} errors, ${report.warnings} warnings.`,
    ...report.findings.map(item => `${item.severity.toUpperCase()} ${item.code} ${JSON.stringify(item.path)}${item.related === undefined ? '' : ` ↔ ${JSON.stringify(item.related)}`}\n  ${item.message}`),
    ...report.notes,
  ].join('\n');
  process.stdout.write(`${output}\n`);
  process.exitCode = report.findings.length ? 1 : 0;
}
main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`PathCarry: ${JSON.stringify(error instanceof Error ? error.message : 'Check failed.')}\n`);
  process.exitCode = 2;
});

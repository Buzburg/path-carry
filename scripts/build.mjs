import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

await mkdir('dist', { recursive: true });
const common = { bundle: true, minify: true, target: 'es2022', legalComments: 'inline', write: false };
const worker = await build({ ...common, entryPoints: ['src/worker.ts'], format: 'iife' });
const app = await build({ ...common, entryPoints: ['src/main.ts'], format: 'iife', define: { __WORKER_SOURCE__: JSON.stringify(worker.outputFiles[0].text) } });
const script = app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await transform(await readFile('src/styles.css', 'utf8'), { loader: 'css', minify: true });
const hash = createHash('sha256').update(script).digest('base64');
const csp = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; worker-src blob:; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
const notice = await readFile('node_modules/@zip.js/zip.js/LICENSE', 'utf8');
const license = await readFile('LICENSE', 'utf8');
const html = (await readFile('src/index.html', 'utf8')).replace('<!--CSP-->', () => `<meta http-equiv="Content-Security-Policy" content="${csp}">`).replace('/*STYLES*/', () => css.code).replace('/*SCRIPT*/', () => script).replace('<html lang="en">', () => `<!--\n${license}\nThird-party software: zip.js 2.23.0\n${notice}\n-->\n<html lang="en">`);
await writeFile('dist/path-carry.html', html);
await build({ entryPoints: ['src/cli.ts'], outfile: 'dist/path-carry.mjs', bundle: true, platform: 'node', format: 'esm', target: 'node22', legalComments: 'inline', banner: { js: `/*\n${license}\nThird-party software: zip.js 2.23.0\n${notice}\n*/` } });
await writeFile('dist/THIRD-PARTY-NOTICES.txt', `PathCarry includes zip.js 2.23.0.\n\n${notice}`);
const files = ['path-carry.html', 'path-carry.mjs', 'THIRD-PARTY-NOTICES.txt'];
const sums = [];
for (const name of files) {
  const data = await readFile(`dist/${name}`);
  sums.push(`${createHash('sha256').update(data).digest('hex')}  ${name}`);
  console.log(`${name}: ${data.length.toLocaleString('en-US')} bytes`);
}
await writeFile('dist/SHA256SUMS.txt', `${sums.join('\n')}\n`);

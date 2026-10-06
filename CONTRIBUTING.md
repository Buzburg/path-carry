# Contributing

Start with a synthetic failing example and the destination filesystem/application involved. State the platform, Node/browser version and expected behavior. Do not attach personal folder listings or private archives.

Run `npm ci --ignore-scripts`, `npm run typecheck`, `npm test`, then `npx playwright install chromium firefox` and `npm run test:browser`. Keep the browser and CLI on the shared audit engine. Add meaningful regression tests for changes to rules or limits.

Preserve read-only operation, bounded work, offline standalone builds, escaped report output and accurate limitations. New cloud-specific rules need a documented source and an explicit scope; avoid implying universal filesystem compatibility.

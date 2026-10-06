# Verification record

Local verification: October 6, 2026. Windows, Node 25.9.0, Playwright 1.58.2 with Chromium and Firefox. The release workflow independently repeats the checks on Ubuntu with Node 22.

- Strict TypeScript check passed.
- 65 unit/integration checks passed: reserved names, unsafe paths, ancestor collisions, Unicode, expanded-node/finding limits, 20,000-entry checks, real ZIP/ZIP64 metadata, corrupt archives, symlinks and the bundled CLI's exit codes/output.
- 34 browser checks passed: offline file:// use, no runtime HTTP requests, real folder/ZIP input, corrupt ZIP rejection, filtering, complete downloads, safe report rendering, invalidation of stale results, clear/cancel, keyboard access, 20,000 entries, and 320/768/1440-pixel layouts.
- Automated axe scans found no violations on the initial and sample-results screens in either browser. This is not a full accessibility certification.
- Desktop and narrow-screen screenshots were inspected for layout and legibility.
- Dependency installation audit reported zero known vulnerabilities. The release workflow performs another lockfile audit.

## Review findings resolved before release

- Standalone HTML string replacement could interpret dollar sequences inside bundled library code and break the script/CSP hash. Build insertion now uses callbacks. Real offline browser tests cover the resulting artifact.
- Expanded directory prefixes could amplify input size. Both node count and expanded path characters are now bounded, independently of original input length.
- Editing the path list or destination prefix invalidates a previous result, including in-flight work. Cancellation terminates the worker; failed checks discard old reports.
- Filenames are text nodes in the app, HTML-escaped in standalone reports and JSON-escaped in terminal text output. Exports include full findings even when the display is filtered or paginated.
- MIT and third-party BSD notices are embedded in both standalone artifacts, as well as included in the release files.

## Limits of the evidence

No Safari/mobile folder-selection claim, exact filesystem-emulation claim, archive-integrity claim or proof of market adoption is made. Synthetic fixtures cover stated filename rules; real-world destination software can impose additional restrictions. No public community posts or user studies were performed.

# Release verification — path-carry v0.1.2

Verified locally on October 27, 2026, Linux x86-64. Toolchains: Python 3.14.8, Rust 1.98.1, Node.js 26.8.1, Go 1.27.1 and Mojo 1.1.0, as applicable. CI covers additional versions/platforms where configured; consult the workflow run for the release commit rather than an older green run.

## Checks

```sh
npm ci --ignore-scripts
npm audit --audit-level=high
npm run typecheck
npm test
npx playwright install chromium firefox
npm run test:browser
```

**Local result: PASS.** 69 core/CLI tests and 34 Chromium/Firefox tests, including offline local-file operation, exports, ZIP/folder inputs, keyboard/accessibility checks and responsive layouts. Dependency audit reported zero vulnerabilities.

The Python build command requires the `build` package; Unity checks also require `mypy` and `ruff`. Native Mojo experiments are optional and require Mojo 1.1.0. CLI acceptance used disposable fixtures and no real customer data.

## Release changes

Make tag publication idempotent: an existing release is preserved after the workflow verifies the tag build and browser behavior.

Refresh the product story and verify the downloadable app and CLI across both browser engines.

The README and repository summary now explain the supported behavior, installation, and limits without unverified speed or security promises.

## Limits

Filename preflight only: no archive-content integrity or malware guarantees. Browser testing is Chromium/Firefox on Linux; destination filesystem behavior can differ.

Git history was checked for common credential/key patterns. Matches in Envghost were synthetic scanner fixtures; no live credentials were identified by that scan. This is a limited pattern check, not a comprehensive security certification.

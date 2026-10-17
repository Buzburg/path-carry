# Launch readiness — path-carry

Reviewed October 17, 2026. Visibility has not been changed by this review.

**Recommendation: Launch first.**

A focused offline filename and ZIP compatibility checker. 69 unit tests and 17 local Chromium browser tests passed; types, build and npm audit passed.

## Scope and limits

Read-only checks identify potential compatibility problems; they do not guarantee every target filesystem accepts a transfer.

## Evidence

Baseline reviewed: `f3f10ae169d3da38c4b2a55d30afa7208770a798`. Documentation and focused corrections may follow this baseline; check CI on the final commit before releasing.

Local checks used Linux x86-64, Python 3.12.14, Node 26.8.1, the installed Rust toolchain, and Mojo 1.1.0 where relevant. Native/Python/HTTP coverage is distinguished; a passing subset is not a full product certification.

- `browser-local`: PASS — 17 passed (5.0s).
- `unit`: PASS — ℹ tests 69.
- `build`: PASS.
- `types`: PASS.
- `audit`: PASS.
- Baseline hosted workflow [Release](https://github.com/Buzburg/path-carry/actions/runs/37497525164): success.
- Baseline hosted workflow [Verify](https://github.com/Buzburg/path-carry/actions/runs/37497521618): success.

Detailed command logs and setup diagnostics are retained in the private local launch-review workspace. Browser checks used installed Chromium; matching baseline CI includes the configured browser matrix. Downloading the pinned browser bundle timed out locally, so this review does not claim a new local Firefox run.

# Security boundaries

PathCarry treats filenames, path lists and archive metadata as untrusted data. It never extracts ZIP entries, executes filenames, renames source files or follows detected filesystem links. Findings are inserted as text; exported HTML escapes all path/note content and disallows scripts. The app has a restrictive content-security policy and no network calls or persistent storage.

Input, expanded directory nodes, findings and ZIP metadata reads have explicit limits. Browser checks run in a cancellable worker with a 30-second timeout. Malformed, ambiguous or oversized archives fail without a report. zip.js is pinned; the release pipeline audits the dependency lockfile.

## What this does not protect against

- Malicious archive contents, local-header tricks, integrity errors, decompression bombs or dangerous symbolic-link targets. Contents are never decompressed or validated.
- A compromised browser, operating system, Node installation, application download or dependency supply chain.
- Concurrent mutation of a CLI source tree. The scan checks links before descending but cannot atomically guarantee an unchanged directory across platform APIs. Scan stable, operator-owned trees.
- Every filesystem comparison rule, cloud-provider rule or application-specific path limit.
- Disclosure caused by deliberately sharing a report. Reports contain original paths, possibly including private names.

No secrets or accounts are required. When reporting a security problem through the repository's private reporting facility (if enabled), use a small synthetic reproduction rather than private files. If private reporting is unavailable, do not publish confidential material in an issue; use an established private contact with the repository owner.

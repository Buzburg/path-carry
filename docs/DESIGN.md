# PathCarry v0.1

Catch file-name problems before a folder or ZIP moves between machines. The deliverable is a downloadable offline HTML app and a Node 22+ command-line checker, sharing one deterministic audit engine. No account, telemetry, extraction, renaming, or payload inspection.

## Contract

- Folder picker: examine relative names only. Browser folder selection omits empty directories and may omit links. The CLI includes empty directories and flags links without following them.
- ZIP: inspect central-directory metadata with zip.js, without extracting or decompressing entries. This is not an archive-integrity or malware check. Local headers and contents are not verified.
- Manifest: one relative slash-separated path per line; a final slash denotes a directory. Blank lines are ignored. Newline-bearing names require folder or ZIP input.
- Flag Windows-invalid names, reserved device names, trailing dots/spaces, unsafe paths, duplicate entries and file/directory conflicts. Warn about case/Unicode-normalization collisions including ancestor directories, long components, long destination paths, and links.
- Case folding uses Unicode NFC plus JavaScript lowercase. It is a conservative heuristic, not an exact model of every filesystem. Do not claim compatibility certification.
- Bound entries (20,000), path length (4,096 characters), total path characters (2 million), synthesized nodes (100,000 and 8 million expanded path characters), findings (50,000), and ZIP metadata reads (32 MiB cumulative, 16 MiB per read). Reject oversized input; never silently report a partial scan as clean.
- Complete JSON and escaped standalone HTML reports; both contain filenames and must be treated as potentially sensitive.
- Deterministic issue order. No source mutation. Errors never produce a clean result. CLI exit 0=no findings, 1=findings, 2=usage/incomplete check.

## Verification

Unit tests exercise tricky names, directory merges, duplicate metadata, malicious paths, limits, ZIP metadata bounds and actual ZIP files. CLI integration checks folders, links and reports. Chromium and Firefox tests run the built HTML offline, including folder/ZIP selection, report downloads, malicious filenames, keyboard access, small screens and accessibility.

## Deliberate limits

Cloud-specific policies (OneDrive, Dropbox, SharePoint), exact APFS/NTFS comparison rules, content checksums, automated renaming and archive extraction are outside v0.1. Long-path warnings assume a configurable destination prefix, default 40 characters. They describe legacy Windows software; long-path-aware applications may accept these paths.

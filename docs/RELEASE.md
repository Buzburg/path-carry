# PathCarry 0.1.0

Catch troublesome filenames before a folder or ZIP changes hands.

- Download **path-carry.html** and open it locally in Chromium or Firefox. No installation, account or connection needed.
- Download **path-carry.mjs** for the same checks in Node.js 22+ or a build workflow.
- Check Windows names, parent-directory case collisions, Unicode normalization, unsafe paths, file/directory conflicts, length limits and links.
- Export complete readable HTML or JSON reports. Sources remain unchanged; ZIPs are never extracted.
- Includes a synthetic example, resource limits, cancellation, responsive layouts, keyboard access and automated accessibility checks.

The ZIP check inspects central-directory names only. It does not verify contents or archive integrity. Filesystem-specific behavior varies; review warnings for your destination. Reports include filenames.

All runtime code is bundled. License notices are embedded and also provided separately. SHA256SUMS.txt covers the application, CLI and third-party notice file.

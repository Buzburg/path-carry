# Why build PathCarry?

Research date: October 6, 2026. Demand evidence establishes a recurring problem, not a prediction of popularity.

- [Cherry Studio issue #18272](https://github.com/CherryHQ/cherry-studio/issues/18272): unsanitized knowledge-material filenames break backup/restore on Windows and case collisions can overwrite extraction targets.
- [Go issue #80123](https://github.com/golang/go/issues/80123): insufficient Windows ZIP filename normalization; trailing periods/spaces and colliding names matter even in mature tooling.
- [DataHoarder discussion](https://www.reddit.com/r/DataHoarder/comments/1u0bzx6/how_do_deal_with_1m_files_with_not_allowed/): archive names containing colons become troublesome when accessed from another system.
- [Notion export discussion](https://www.reddit.com/r/Notion/comments/j3r6gl): long exported paths make Windows ZIP handoffs fail.

Existing tools include [Filesystem Portability Auditor](https://teck-tani.com/en/filesystem-portability-auditor), [renamed.to Filename Checker](https://www.renamed.to/tools/filename-checker), GNU pathchk and detox. This is not a new category. PathCarry's testable proposition is a portable offline HTML file plus the same checks in a command-line tool, including ZIP metadata and ancestor-directory collision analysis.

Other candidates considered: ICS viewers/generators, HAR analyzers and folder checksum tools. These already have many near-identical offerings. PathCarry still competes with existing tools; a clear demo and useful reports matter more than novelty claims.

## Technical references

- [Microsoft naming rules](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)
- [Windows maximum path length](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation)
- [zip.js ZipReader](https://gildas-lormeau.github.io/zip.js/api/classes/ZipReader.html)
- [zip.js entry metadata](https://gildas-lormeau.github.io/zip.js/api/interfaces/EntryMetaData.html)

Launch hypothesis: show a harmless synthetic folder that works on one machine but collides on another, then offer a no-install check. Measure completed checks, reproducible bug reports and repeat use after public release. No invented user counts, endorsements, benchmarks or guaranteed virality.

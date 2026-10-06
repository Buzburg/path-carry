# Launch kit (draft, not posted)

Repository remains private until the owner chooses to publish it. A private repository cannot accumulate public discovery or community contributions.

## One-line pitch

PathCarry checks a folder or ZIP before you send it—catching filenames that break on another machine, entirely offline.

## 30-second demo

1. Open the downloaded HTML with internet access disabled.
2. Click “Try a messy example.”
3. Show how `Project/Art/logo.svg` and `Project/art/banner.svg` can merge at the parent folder.
4. Show a Windows-reserved name and two visually identical Unicode names.
5. Save the readable report. Explain that no files were renamed, uploaded or extracted.

## Suggested release post

I built PathCarry after seeing how often cross-platform folder handoffs fail because of filenames. It is a small offline HTML app plus a Node CLI: check a folder, ZIP or pasted path list; review collisions and Windows naming problems; export a report. No account, uploads or automatic renaming. It does not inspect contents or certify every filesystem. Synthetic edge cases and reproducible bug reports are especially welcome.

## After public release

Ask a few people who actually exchange design assets, backups or exported workspaces to try it. Measure whether they find a real handoff problem and understand the report. Prioritize reproducible missing rules over feature count. Check competitor tools before claiming differentiation. Do not claim universal demand, guaranteed virality or invented adoption metrics.

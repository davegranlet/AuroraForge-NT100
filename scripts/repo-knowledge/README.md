# Repository knowledge index utilities

These recovered utilities build and query a local searchable inventory of Aurora Forge files. They are project-maintenance tools, not game converters.

`aurora-knowledge-audit.js` walks the canonical repository, classifies files by extension/path, samples selected text files, relates duplicate filenames, and writes JSONL plus summary/index JSON under `.local/repo-knowledge/`. It omits `.git`, `.local`, `.tools`, `node_modules`, and `third_party` directories. Optional SHA-256 hashing is enabled only with `AURORA_AUDIT_HASH=1`; files larger than 64 MiB are skipped by that hash pass. The script refuses a root other than this canonical repository and refuses output outside its `.local` directory.

```powershell
node scripts/repo-knowledge/aurora-knowledge-audit.js
node scripts/repo-knowledge/aurora-knowledge-query.js "victory animation"
```

To enable hashing for the audit, set `AURORA_AUDIT_HASH=1` in the current shell before the first command. The inventory's purposes and tags are deterministic heuristics; they are search aids, not authoritative code review. The archive versions hard-coded `D:/AuroraForge-Aug26`, so this active copy was adapted to the canonical repository and local output boundary. The unchanged source snapshot remains under `.local/consolidation-2026-10-16/sources/aug26/scripts/`.

`build-tool-capability-catalog.ps1` regenerates the full dated capability catalog from the initial source census plus workflow scripts, UI modules, packaged tool copies, recovered utilities, and bundled executable/dependency files. Its output is an audit artifact; it does not execute cataloged tools.

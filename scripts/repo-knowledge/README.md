# Repository knowledge index utilities

These utilities are Aurora Forge's local searchable project-knowledge tools. They are project-maintenance tools, not game converters. Before repeating a test, investigation, or claim, search prior notes and outcomes first.

`aurora-knowledge-audit.js` walks the canonical repository, classifies files by extension/path, samples selected text files, relates duplicate filenames, and writes JSONL plus summary/index JSON under `.local/repo-knowledge/`. It omits `.git`, `.local`, `.tools`, `node_modules`, and `third_party` directories. Optional SHA-256 hashing is enabled only with `AURORA_AUDIT_HASH=1`; files larger than 64 MiB are skipped by that hash pass. The script refuses a root other than this canonical repository and refuses output outside its `.local` directory.

```powershell
node scripts/repo-knowledge/aurora-knowledge-audit.js
node scripts/repo-knowledge/aurora-knowledge-query.js "victory animation"
node scripts/repo-knowledge/aurora-project-history-search.js "rigid camera no visible change" --area victory-6100-2k19
```

`aurora-knowledge-query.js` searches the generated file metadata database (paths, categories, purposes, tags, and short text summaries). `aurora-project-history-search.js` searches project notes, test reports, receipts, logs, and documentation using Node's filesystem APIs. It requires every query term to occur in a file, ranks exact phrase matches first, returns matching line numbers/snippets, and can restrict the search with `--area`. By default it searches history/documentation formats throughout the project, including `.local` historical notes and imported research. It skips the generated `.local/repo-knowledge` database (query that with `aurora-knowledge-query.js`), binary/large files, and vendor/build directories (`.git`, `.tools`, `node_modules`, `third_party`, `obj`, `bin`). Add `--all` to include source code or `--canonical-only` to omit `.local` historical copies.

Recommended first action for new work:

1. Search the exact component, game/version, IDs, error/result phrases, and candidate names.
2. Read the referenced history entries and evidence files before deciding what is still unknown.
3. Record the query and the evidence already found in the active ledger.
4. Propose a new test only if existing evidence leaves a specific unresolved question and the new test distinguishes between concrete alternatives.

To enable hashing for the audit, set `AURORA_AUDIT_HASH=1` in the current shell before the first command. The inventory's purposes and tags are deterministic heuristics; they are search aids, not authoritative code review. The archive versions hard-coded `D:/AuroraForge-Aug26`, so this active copy was adapted to the canonical repository and local output boundary. The unchanged source snapshot remains under `.local/consolidation-2026-10-16/sources/aug26/scripts/`.

`build-tool-capability-catalog.ps1` regenerates the full dated capability catalog from the initial source census plus workflow scripts, UI modules, packaged tool copies, recovered utilities, and bundled executable/dependency files. Its output is an audit artifact; it does not execute cataloged tools.

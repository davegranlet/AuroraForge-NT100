# DeepSeek v4.1 Handoff — Aurora Forge WWE 2K19 → WWE 2K25

## Mandatory continuity opening

This handoff is not a fresh project brief. Before any search, test, edit, bake, staging action, or conclusion, read all of the following completely and in order:

1. `AURORA_FORGE_ACTIVE_STATE.md`
2. `AURORA_FORGE_CONVERSATION_LEDGER_2026-09-19.md`
3. This handoff document
4. The final task prompt preserved in the conversation ledger

Then compare those records with the live workspace, enabled archive set, loader log, and crash evidence. If anything differs, update the Active Log before proceeding. Continue from the final task prompt and the current post-mount crash boundary; do not restart from an earlier package or reinterpret the goal.

## Mission

Continue the fixed objective: build and validate an additive WWE 2K19 → WWE 2K25 entrance/victory animation converter with runnable modern `.clips/.adefs` output and concrete verification evidence.

Do not claim conversion is in-game valid, usable by end users, or complete until WWE 2K25 loads the package without crashing, exposes `TEST 14000`, and previews the imported motion.

Read `AURORA_FORGE_ACTIVE_STATE.md` before any Aurora Forge search, test, or edit. Preserve existing user work. Do not repeat the obsolete 6185 path: stock motion ID 6185 is occupied and must be rejected.

## Current authoritative state

The current candidate is `aurora-14000-tribute-v160-v102k.cak`.

Offline evidence:

- Full source is the user-designated fresh Tribute 26 v1.6.0 BakeMe.
- Original aggregate: 62 files, 19,841,251 bytes.
- Final aggregate: 64 files, 20,416,328 bytes before baking.
- All 62 originals preserved.
- 59 originals byte-identical.
- Exactly 3 originals intentionally changed: Cutscene registry, Victory list, and SDB.
- Exactly 2 new files: `Animation/Victory/14000.clips` and `Animation/Victory/14000.adefs`.
- `14000.clips`: 555,592 bytes, 17 records, SHA-256 `31A9A292B86E8474C91F3B49BCD967DD34A70C9910A474611F19518FDF1578B7`.
- `14000.adefs`: 4,206 bytes, SHA-256 `01FD0B9BBD74088AC3ADD2BE6D7EFF3FCFD530B761413E80A25468F4A45E5EC3`.
- VictoryListData: 713 → 714 rows; exactly one new wrestler/entry ID 14000; `nameString=4294957742`, `type=1`, `someId=14000`, `victoryFace=14000`; all 713 original rows are semantically unchanged.
- Cutscene registry: 2,342 → 2,343 entries; exactly one ID 14000 entry with name ID 4294957742; all 2,343 tables validate.
- ENG.sdb: 113,779 → 113,780 records; new ID 4294957742 / signed -9554 decodes to `TEST 14000`.
- Foundry/FTribTool result: `verified=true`, `payloadVerified=true`, `fileCount=64`, `sourceFileCount=64`, `folderCount=41`, archive size 10,365,112 bytes.
- Source and staged archive SHA-256: `C1DE81250FE0CAA33246EED9FDB156835764EBA9D496CF6D6ACC5831996D4ACA`.
- Only one CAK was enabled for the test.

## New in-game failure

The user launched WWE 2K25 with only v102k enabled. The loader log records:

- 15:43:20 — CAK accepted.
- 15:43:20 — mount sequence completed: accepted=1, rejected=0, failed=0.
- 15:43:22 — CrashReporter created a 70,592,896-byte minidump.

Therefore:

- This was not an archive collision.
- This was not a loader mount rejection.
- The crash occurred approximately two seconds after successful mount, before the requested picker/preview verdict.
- In-game validity is unproven and the current candidate must not be called usable.

## Leading hypothesis, not yet proven

The aggregate came from Tribute 26 v1.6.0 while the test target is WWE 2K25. The immediate post-mount crash may be caused by a 2K26 database/schema aggregate being mounted into 2K25, rather than by the new ID 14000 assets.

Do not assume this hypothesis is true until the controls below are tested.

## Required next isolation sequence

1. Preserve the crash dump and current v102k archive. Do not overwrite either.
2. Read the Active Log first and record this crash as a material failure.
3. Build a control archive from the untouched Tribute 26 v1.6.0 BakeMe using FTribTool, with no ID 14000 changes. The raw-storage rule for high-entropy `.sdb` files is already required for this source.
4. Stage only that control archive and launch WWE 2K25 once.
   - If the control also crashes immediately after mount, the full Tribute 26 aggregate is incompatible with WWE 2K25.
   - If the control launches, the crash is introduced by one of the 14000 changes and must be isolated by binary comparison of the five intended additions.
5. If the control crashes, stop modifying the animation payload. Find the current WWE 2K25-compatible full BakeMe/aggregate source and transplant only the additive 14000 registrations/assets into that base.
6. If the control launches, test a package with the same full base plus only the two animation files, then add registry files one at a time. Do not request a user test for each speculative package; use loader acceptance and controlled crash evidence.
7. Use the crash dump with WinDbg/CDB if available. Capture exception code, faulting module, and top stack frames. Do not infer those from the mere existence of the dump.

## Implemented code changes

- Cutscene registry finder/appender now follows FlatBuffer pointers and supports both observed root layouts.
- Appender rejects duplicate motion IDs before serialization.
- SDB appender now preserves valid aliased/shared payload offsets and re-keys unique payloads safely after table growth.
- SDB appender regression covers shared payload aliases.
- Focused codec/registry/SDB suite passes 8/8.
- FTribTool is the Aurora-branded archive backend. It stores `.sdb` raw when Oodle would expand the transformed database and rejects false-success fatal backend output.

## Hard constraints

- Additive IDs only; new test ID starts at 14000.
- Preserve stock files and all original full-tree files.
- Never reuse stock 6185.
- Never call a reference clone, unchanged target file, mockup, generic preview, or repackager a conversion.
- Never call the package in-game valid without a crash-free game load, visible `TEST 14000`, and preview evidence.
- Keep exactly one registry-bearing CAK enabled during tests.
- The prior known candidate remains preserved offline; do not restore it during the current crash investigation unless explicitly needed as a control.

## Current stopping point

The next meaningful result is the untouched Tribute 26 full-aggregate control launch, or a crash-dump stack identifying the failing module. User feedback is required only after that controlled test reaches a clear launch/picker boundary.

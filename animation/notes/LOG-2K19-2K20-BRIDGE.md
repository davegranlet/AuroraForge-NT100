# 2K19-2K20-BRIDGE (split from ACTIVE log 2026-09-17)

## 2026-09-14

### Goal setup

- Active goal created: finish the WWE 2K19 to WWE 2K20 full package update with converted ACTS and converted EVD for Victory 6100, app integration, focused tests, and push-ready update.
- Five-minute heartbeat created: `Aurora Forge 2K20 package goal reminder`.

### Baseline package-builder work before this log existed

Implemented:

- `tools/build-2k19-to-2k20-victory-package.js`
- `tools/build-2k19-to-2k20-victory-package.test.js`
- `tools/patch-acts20-yanm.test.js`

Updated:

- `tools/patch-acts20-yanm.js`

Finding:

- The old ACTS patcher raw-spliced the converted `YANM20` body into a 2K20 `.acts`.
- That shrank the embedded YANM but did not update the AMYM entry directory.
- The patcher now detects AMYM, replaces the YANM inside the containing AMYM entry, and rebuilds the AMYM size table.

Validation command:

```powershell
node --test tools/patch-acts20-yanm.test.js tools/build-2k19-to-2k20-victory-package.test.js
```

Result:

```text
2 tests passed
```

### Event body coverage progress before this log existed

Added measured EVD body converters for Victory 6100:

- index `19`: circular pose body;
- index `20`: wrapped single-pose body;
- index `21`: wrapped dual-pose body;
- index `22`: wrapped triple-pose body;
- index `0`: setup-table body.

Repeated focused validation:

```powershell
node --test tools/fop19-evd20-body-model.test.js tools/build-2k19-to-2k20-victory-package.test.js
```

Latest result before index 23:

```text
26 tests passed
```

Package-builder state before index 23:

```text
ACTS generated and AMYM-rebuilt.
EVD blocked only on event body index 23.
```

### Index 23 analysis

Command:

```powershell
node -e "<inspection script splitting source and target markers for event index 23>"
```

Finding:

- Index `23` is not a fixed `0x2f4` body.
- It is a chained tail body:
  - `0x10` bytes of prefix padding;
  - subrecord at target offset `0x10` for event `0x61be`;
  - subrecord at target offset `0x324` for event `0x61bf`;
  - subrecord at target offset `0x638` for event `0x61c0`;
  - terminal marker at target offset `0x94c`.
- Source index `23` contains source markers at offsets:
  - `0x000`: event `0x61bf`;
  - `0x314`: event `0x61c0`;
  - `0x62c`: terminal marker / `0FOP` tail material.

Implemented:

- `convertKnownChainedTailFop19BodyToEvd20`
- Tests for exact measured 6100 chained-tail body at index `23`.

Validation command:

```powershell
node --test tools/fop19-evd20-body-model.test.js tools/build-2k19-to-2k20-victory-package.test.js
```

Result:

```text
Failed before converter comparison.
Reason: existing test helper `bodyAtIndex` assumed `entries[index + 1]` exists. Index 23 is the final event entry, so the helper crashed while reading `payloadOffsetBE` from `undefined`.
Next action: update the helper to use EOF / EVD EOF for the final body.
```

Edit:

- Updated `tools/fop19-evd20-body-model.test.js` helper `bodyAtIndex` so final event index `23` uses `fopBuffer.length` and `evdBuffer.length` when there is no next table entry.

Validation command:

```powershell
node --test tools/fop19-evd20-body-model.test.js tools/build-2k19-to-2k20-victory-package.test.js
```

Result:

```text
28 tests passed.
Index 23 chained-tail converter is byte-exact against the real 6100 EVD fixture.
```

Package-builder command:

```powershell
node tools\build-2k19-to-2k20-victory-package.js --source19 "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" --fop19 "D:\AuroraForge-Aug26\_work\2k19-victory-6100-event\00_0CE8FE35827FD8DE.unpacked.0fop" --referenceActs20 "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.acts" --referenceEvd20 "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.evd" --outputRoot "D:\AuroraForge-Aug26\_work\2k20-package-6100" --id 6100
```

Result:

```json
{
  "ok": true,
  "outputRoot": "D:\\AuroraForge-Aug26\\_work\\2k20-package-6100",
  "motion": { "bytes": 174976, "tracks": 62, "sentinel": true },
  "acts": { "bytes": 429196, "replacedBytes": 489264, "replacementBytes": 174976, "container": "AMYM" },
  "evd": { "bytes": 20610, "eventBodies": 24 }
}
```

Finding:

- The builder now creates both package files:
  - `D:\AuroraForge-Aug26\_work\2k20-package-6100\Root\Animation\Victory\6100.acts`
  - `D:\AuroraForge-Aug26\_work\2k20-package-6100\Root\Animation\Victory\6100.evd`

Read-back validation command:

```powershell
node -e "<AMYM parse + YANM20 decode + EVD reader check>"
```

Result:

```json
{
  "actsBytes": 429196,
  "amymEntries": 15,
  "lastEntryBytes": 392176,
  "yanmRecords": 63,
  "yanmTracks": 62,
  "allTracksHaveTwoStreams": true,
  "evdBytes": 20610,
  "evdMotionId": 6100,
  "evdInternalName": "6100_VIC_SINGLE_The_Rock_M_Face",
  "evdPayloadBytes": 20576
}
```

Focused suite command:

```powershell
node --test tools/fop19-reader.test.js tools/evd-reader.test.js tools/fop19-evd20-table-model.test.js tools/fop19-evd20-body-model.test.js tools/amym-container.test.js tools/patch-acts20-yanm.test.js tools/build-2k19-to-2k20-victory-package.test.js
```

Result:

```text
44 tests passed.
```

## 2026-09-14 - App integration resume after compaction

Command/action:
- Inspected app source just before compaction: `app/main.js`, `app/preload.js`, `app/app.js`, and `app/index.html`.

Result/finding:
- Existing app flow still targets a loose YANM20 bridge through `tools/aurora-converter.js`.
- UI currently has a 2K19 source file, 2K20 reference ACTS file, and loose output file path.
- Full 2K20 package builder needs five inputs: 2K19 decoded motion body, 2K19 event 0FOP, 2K20 reference ACTS, 2K20 reference EVD, and an output package root directory.
- Next work item is to preserve the loose converter IPC and add a package-builder IPC/UI path for the measured Victory 6100 package.

## 2026-09-14 - App IPC patch attempt with wrong shell syntax

Command/action:
- Tried to patch `app/main.js` and `app/preload.js` using a Bash-style `python - <<'PY'` heredoc from PowerShell.

Result:
- PowerShell rejected the heredoc syntax with `Missing file specification after redirection operator`.
- No app source files were changed by that failed command.
- Next action is to rerun the patch using a PowerShell here-string piped to Python.

## 2026-09-14 - Active log handoff header corrected

Command/action:
- Fixed the active log after an earlier PowerShell here-string mistake wrote Python script text into the file instead of executing it.
- Stripped the accidental preamble and inserted the intended handoff block at the top.

Result:
- `notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md` now starts with a clean one-file handoff prompt and keeps the chronological log below it.

## 2026-09-14 - Active log path rendering fixed

Command/action:
- Corrected the active-log path in the handoff block after `\notes` briefly rendered as a newline plus `otes`.

Result:
- The handoff's active-log path is now copy-paste safe.

## 2026-09-14 - App package-builder integration patched

Command/action:
- Patched `app/main.js` with `pick-directory` and `build-package` IPC handlers.
- Patched `app/preload.js` to expose `pickDirectory` and `buildPackage`.
- Replaced `app/app.js` renderer flow so the main conversion button builds the 2K20 package using five inputs: 2K19 decoded motion, 2K19 event 0FOP, 2K20 reference ACTS, 2K20 reference EVD, and output package root.
- Updated `app/index.html` labels and help text to describe a full 2K20 ACTS/EVD package folder instead of only loose YANM20 output.

Validation command:
```powershell
node --check app\app.js
node --check app\main.js
node --check app\preload.js
```

Result:
```text
All three JavaScript files passed syntax checks.
```

## 2026-09-14 - Focused package/converter suite after app patch

Command/action:
```powershell
node --test tools/fop19-reader.test.js tools/evd-reader.test.js tools/fop19-evd20-table-model.test.js tools/fop19-evd20-body-model.test.js tools/amym-container.test.js tools/patch-acts20-yanm.test.js tools/build-2k19-to-2k20-victory-package.test.js
```

Result:
```text
44 tests passed, 0 failed.
```

Finding:
- App integration changes did not break the package/converter toolchain.
- One package-builder test title still says it refuses incomplete EVD package claims; the assertion now expects a completed 24-body package, so the test title should be renamed before release.

## 2026-09-14 - Package-builder test title corrected

Command/action:
- Renamed `tools/build-2k19-to-2k20-victory-package.test.js` test title from the old incomplete-EVD wording to `builds converted 2K20 ACTS and EVD package for Victory 6100`.

Validation command:
```powershell
node --test tools/build-2k19-to-2k20-victory-package.test.js tools/fop19-evd20-body-model.test.js
```

Result:
```text
28 tests passed, 0 failed.
```

## 2026-09-14 - Full focused suite after test rename

Command/action:
```powershell
node --test tools/fop19-reader.test.js tools/evd-reader.test.js tools/fop19-evd20-table-model.test.js tools/fop19-evd20-body-model.test.js tools/amym-container.test.js tools/patch-acts20-yanm.test.js tools/build-2k19-to-2k20-victory-package.test.js
```

Result:
```text
44 tests passed, 0 failed.
```

## 2026-09-14 - Real package rebuild after app integration

Command/action:
```powershell
node tools\build-2k19-to-2k20-victory-package.js --source19 "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" --fop19 "D:\AuroraForge-Aug26\_work\2k19-victory-6100-event\00_0CE8FE35827FD8DE.unpacked.0fop" --referenceActs20 "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.acts" --referenceEvd20 "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.evd" --outputRoot "D:\AuroraForge-Aug26\_work\2k20-package-6100" --id 6100
```

Result:
```json
{
  "ok": true,
  "id": "6100",
  "outputRoot": "D:\\AuroraForge-Aug26\\_work\\2k20-package-6100",
  "motion": { "bytes": 174976, "tracks": 62, "sentinel": true },
  "acts": { "bytes": 429196, "replacedBytes": 489264, "replacementBytes": 174976, "container": "AMYM" },
  "evd": { "bytes": 20610, "eventBodies": 24 }
}
```

Read-back validation result:
```json
{
  "actsBytes": 429196,
  "amymEntries": 15,
  "lastEntryBytes": 392176,
  "yanmRecords": 63,
  "yanmTracks": 62,
  "allTracksHaveTwoStreams": true,
  "evdBytes": 20610,
  "evdMotionId": 6100,
  "evdInternalName": "6100_VIC_SINGLE_The_Rock_M_Face",
  "evdPayloadBytes": 20576
}
```

## 2026-09-14 - Heartbeat updated for handoff log

Command/action:
- Updated heartbeat automation `aurora-forge-2k20-package-goal-reminder` in place.

Result:
- Heartbeat now instructs future runs to read the top handoff block in this active log before continuing and to keep this log updated.
- Heartbeat status remains active on a five-minute interval.

## 2026-09-14 - App package script and diff inspection

Command/action:
```powershell
Get-Content -LiteralPath app\package.json
git diff -- app/main.js app/preload.js app/app.js app/index.html tools/build-2k19-to-2k20-victory-package.test.js notes/ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md --stat
```

Result/finding:
- `app/package.json` has `start` and `package` scripts; package runs `electron-builder --win portable`.
- App build config copies `../tools` to `aurora-tools/tools`, so the new package-builder script and supporting tools should be included in a packaged app build.
- Diff confirms app source now targets the package-builder flow and the package-builder test title has been corrected.

## 2026-09-14 - First app package command failed from wrong directory

Command/action:
```powershell
npm run package
```

Result:
```text
Failed: npm looked for D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\package.json and returned ENOENT.
```

Finding:
- The command shell had been reset to the repository root before `npm run package` ran.
- Correct package command must run from `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app`.

## 2026-09-14 - App portable package build

Command/action:
```powershell
Set-Location D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app
npm run package
```

Result:
```text
Succeeded. electron-builder completed portable Windows build and signed dist\aurora-forge-converter 0.9.0.exe.
```

Notes:
- electron-builder warned that `description`, `author`, and a custom app icon are missing in `app/package.json`; these warnings did not block the build.

## 2026-09-14 - Packaged resource verification

Command/action:
```powershell
Get-Item app\dist\aurora-forge-converter\ 0.9.0.exe
Get-Item app\dist\win-unpacked\resources\aurora-tools\tools\build-2k19-to-2k20-victory-package.js
node --check app\dist\win-unpacked\resources\aurora-tools\tools\build-2k19-to-2k20-victory-package.js
```

Result:
- Portable EXE exists at `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\aurora-forge-converter 0.9.0.exe`.
- Packaged resources include `tools\build-2k19-to-2k20-victory-package.js`.
- Packaged package-builder script passed `node --check`.

## 2026-09-14 - Working tree status after package build

Command/action:
```powershell
git status --short
```

Result/finding:
- Working tree contains app source changes, packaged `app/dist` changes, new docs/notes, new package-builder/AMYM tools/tests, and older unrelated dirty files from prior work.
- `app/node_modules/` is untracked from packaging and should not be committed as release source.
- Need inspect diffs carefully before any push or commit so unrelated prior work is not accidentally bundled.

## 2026-09-14 - README/dist/patreon diff inspection

Command/action:
```powershell
git diff -- README.md
git ls-files app/dist app/node_modules | Select-Object -First 80
git diff -- tools/patreon-access.js tools/patreon-access.test.js
```

Result/finding:
- README currently only links the quick tutorial; it should also mention the new full package-builder path.
- `app/dist` is tracked in this repo, so packaged app artifacts are part of the working tree after `npm run package`.
- `app/node_modules` is not tracked and should remain out of commits.
- Patreon verifier changes are present and are relevant to the app's clearer access messages, so its focused test should be run.

## 2026-09-14 - README updated for full 2K20 package flow

Command/action:
- Updated `README.md` Desktop app section to describe the new package-builder flow.

Result:
- README now tells users the app collects 2K19 motion, 2K19 event 0FOP, 2K20 reference ACTS, 2K20 reference EVD, and an output folder.
- README states the app writes `Root\Animation\Victory\6100.acts` and `6100.evd`.
- README also preserves the limitation that the output is not a complete installable 2K20 mod package by itself and still needs separate in-game packaging/testing.

## 2026-09-14 - Final focused validation after README update

Command/action:
```powershell
node --check app\app.js
node --check app\main.js
node --check app\preload.js
node --test tools/build-2k19-to-2k20-victory-package.test.js tools/patch-acts20-yanm.test.js tools/amym-container.test.js tools/fop19-evd20-body-model.test.js tools/patreon-access.test.js
```

Result:
```text
App syntax checks passed.
43 focused tests passed, 0 failed.
```

## 2026-09-14 - Branch/remote/status check before push prep

Command/action:
```powershell
git branch --show-current
git branch -vv
git remote -v
git status --short --untracked-files=all | Select-Object -First 220
```

Result/finding:
- Current branch is `main`, tracking `origin/main` at `f5f205f`.
- Remote is `https://github.com/davegranlet/Aurora-Forge-WWE2K19-Animation-Research.git`.
- Working tree includes relevant release changes plus unrelated/pre-existing dirty files and untracked `app/node_modules` from packaging.
- A push should only happen after staging a deliberate release set; do not stage `app/node_modules` or local-only active logs.

## 2026-09-14 - Public docs scrubbed of local workspace paths

Command/action:
- Replaced local `D:\AuroraForge-Aug26` and `D:\games` examples in `README.md` and `docs\2K19-TO-2K20-CONVERTER-TUTORIAL.md` with user-owned placeholders.
- Updated the tutorial app section to mention the current full package-builder inputs and button while preserving notes for the older loose bridge.

Validation command:
```powershell
rg -n "AuroraForge-Aug26|D:\\games|_work\\converted|_work/converted" docs README.md
```

Result:
```text
No matches.
```

## 2026-09-14 - Handoff header refreshed with current status

Command/action:
- Updated the top handoff block in this active log after app integration, package build, docs scrub, and final validation.

Result:
- A new chat can now read the handoff and see the current safe next step: prepare a deliberate commit/push set without staging `app/node_modules`, this local log, or unrelated dirty files.

## 2026-09-14 - Handoff header path rendering corrected with forward slashes

Command/action:
- Rewrote the top handoff block using forward-slash Windows paths to avoid Python interpreting backslash sequences such as `\n`, `\t`, `\a`, or `\0`.

Result:
- The handoff block now renders cleanly and remains copy-paste usable for a new chat.

## 2026-09-14 - Heartbeat refreshed after final handoff correction

Command/action:
- Updated heartbeat automation `aurora-forge-2k20-package-goal-reminder` again.

Result:
- Heartbeat now points to the corrected forward-slash handoff paths and the current status: app integrated, docs scrubbed, tests/package build passed, next step safe source/docs commit/push set.

## 2026-09-14 - Source/docs/tool release set staged

Command/action:
```powershell
git add -- README.md app/app.js app/index.html app/main.js app/preload.js docs/2K19-TO-2K20-CONVERTER-TUTORIAL.md docs/DISCORD-2K19-TO-2K20-CONVERTER-MULTIPOST.md tools/amym-container.js tools/amym-container.test.js tools/patch-acts20-yanm.js tools/patch-acts20-yanm.test.js tools/build-2k19-to-2k20-victory-package.js tools/build-2k19-to-2k20-victory-package.test.js tools/fop19-evd20-body-model.js tools/fop19-evd20-body-model.test.js tools/patreon-access.js tools/patreon-access.test.js
```

Result:
- Staged 17 source/docs/tool files for the 2K20 package-builder update.
- Deliberately did not stage `app/dist`, `app/node_modules`, `notes`, or the active local log.

## 2026-09-14 - Staged public docs local-path scan

Command/action:
```powershell
git diff --cached --unified=0 -- README.md docs\2K19-TO-2K20-CONVERTER-TUTORIAL.md docs\DISCORD-2K19-TO-2K20-CONVERTER-MULTIPOST.md | added-lines-only path scan
```

Result:
```text
No added public-doc local path matches in staged diff.
```

## 2026-09-14 - Release source commit created

Command/action:
```powershell
git commit -m "Add 2K20 Victory package builder"
```

Result:
```text
Created commit e0abe6a Add 2K20 Victory package builder.
17 files changed, 1609 insertions, 83 deletions.
```

Notes:
- Commit includes source/docs/tool changes only.
- Generated `app/dist`, `app/node_modules`, notes, and this local active log were not included.

## 2026-09-14 - Commit pushed to GitHub

Command/action:
```powershell
git push origin main
```

Result:
```text
Pushed main from f5f205f to e0abe6a.
Remote: https://github.com/davegranlet/Aurora-Forge-WWE2K19-Animation-Research.git
```

Remaining local status after push:
- Generated `app/dist` changes remain local and unstaged.
- `app/node_modules` remains untracked and unstaged.
- Older unrelated dirty files such as `tools/amym-tbuf-report.js` remain local and unstaged.
- Local notes, including this active log, remain unstaged.

## 2026-09-14 - Batch 2K19 to 2K20 folder converter started

Command/action:
- User asked whether we can process a whole folder of 2K19 to 2K20 conversions.
- Inspected `tools\build-2k19-to-2k20-victory-package.js` and its test.

Finding:
- The existing builder is a proven single-id path requiring 2K19 motion, 2K19 0FOP, 2K20 ACTS, 2K20 EVD, and output root.
- Batch conversion needs id matching across folders. 2K20 files usually carry the id in `6100.acts`/`6100.evd`; decoded 2K19 motion often carries zero-padded `06100`; 0FOP files may require the id in their parent folder or a manifest.
- Next action is to add a batch wrapper that supports automatic path-id matching plus manifest rows for ambiguous folders.

## 2026-09-14 - Batch converter initial implementation

Command/action:
- Added `tools\batch-2k19-to-2k20-victory-packages.js`.
- Added `tools\batch-2k19-to-2k20-victory-packages.test.js`.
- The tool supports manifest-driven batch conversion and automatic folder matching by animation id when ids are present in paths.

Validation command:
```powershell
node --check tools\batch-2k19-to-2k20-victory-packages.js
node --test tools\batch-2k19-to-2k20-victory-packages.test.js
```

Result:
```text
4 tests passed, 0 failed.
```

## 2026-09-14 - Batch docs and folder-mode build validation

Command/action:
- Added `docs\BATCH-2K19-TO-2K20-VICTORY-PACKAGES.md`.
- Linked batch docs from `README.md`.
- Ran automatic folder-mode batch build for id `6100`.

Validation command:
```powershell
node tools\batch-2k19-to-2k20-victory-packages.js --source19Dir "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis" --fop19Dir "D:\AuroraForge-Aug26\_work" --reference20Root "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory" --outputRoot "D:\AuroraForge-Aug26\_work\2k20-batch-test" --ids 6100
```

Result:
```json
{
  "ok": true,
  "total": 1,
  "succeeded": 1,
  "failed": 0,
  "results": [
    {
      "id": "6100",
      "motion": { "bytes": 174976, "tracks": 62, "sentinel": true },
      "acts": { "bytes": 429196, "container": "AMYM" },
      "evd": { "bytes": 20610, "eventBodies": 24 }
    }
  ]
}
```

## 2026-09-14 - Pause point before account switch

Command/action:
- User asked to run the batch bit and stop, then asked for log updates before switching accounts.

Current uncommitted batch work:
- Added `tools\batch-2k19-to-2k20-victory-packages.js`.
- Added `tools\batch-2k19-to-2k20-victory-packages.test.js`.
- Added `docs\BATCH-2K19-TO-2K20-VICTORY-PACKAGES.md`.
- Updated `README.md` with a link to the batch package-builder docs.

What the batch tool does:
- Wraps the proven single-id Victory package builder over multiple ids.
- Supports automatic folder matching when ids appear in paths.
- Supports manifest mode for ambiguous extraction layouts where hashed `0FOP` names do not carry ids.
- Writes package outputs to `<outputRoot>\Root\Animation\Victory\<id>.acts` and `<id>.evd`.
- Writes converted intermediates to `<outputRoot>\_intermediate\<id>.yanm20.bin`.

Validation already run:
```powershell
node --check tools\batch-2k19-to-2k20-victory-packages.js
node --test tools\batch-2k19-to-2k20-victory-packages.test.js
```
Result: 4 tests passed.

Automatic folder-mode dry run:
```powershell
node tools\batch-2k19-to-2k20-victory-packages.js --source19Dir "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis" --fop19Dir "D:\AuroraForge-Aug26\_work" --reference20Root "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory" --outputRoot "D:\AuroraForge-Aug26\_work\2k20-batch-test" --ids 6100 --dry-run true
```
Result: matched source motion, 0FOP, reference ACTS, and reference EVD for id `6100`.

Automatic folder-mode real build:
```powershell
node tools\batch-2k19-to-2k20-victory-packages.js --source19Dir "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis" --fop19Dir "D:\AuroraForge-Aug26\_work" --reference20Root "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory" --outputRoot "D:\AuroraForge-Aug26\_work\2k20-batch-test" --ids 6100
```
Result:
```json
{
  "ok": true,
  "total": 1,
  "succeeded": 1,
  "failed": 0,
  "motion": { "bytes": 174976, "tracks": 62, "sentinel": true },
  "acts": { "bytes": 429196, "container": "AMYM" },
  "evd": { "bytes": 20610, "eventBodies": 24 }
}
```

Focused suite with batch tests:
```powershell
node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js
```
Result: 38 tests passed, 0 failed.

Important pause instruction:
- User explicitly said to stop after this log update.
- Do not commit or push the batch update until the user returns and asks to continue.
- Previously pushed commit remains `e0abe6a Add 2K20 Victory package builder` on `origin/main`.
- Batch work is local/uncommitted as of this pause point.

## 2026-09-14 - Batch converter finished and pushed

Command/action:
- User returned and asked to finish the batch converter.
- Hardened `tools\batch-2k19-to-2k20-victory-packages.js` so malformed manifest rows fail clearly and empty automatic batches fail with `no batch rows matched`.
- Expanded `tools\batch-2k19-to-2k20-victory-packages.test.js` with synthetic-folder coverage for id extraction, automatic folder matching, partial missing-file reports, malformed manifest rows, and empty automatic batches.
- Updated `docs\BATCH-2K19-TO-2K20-VICTORY-PACKAGES.md` with the new failure behavior.
- Staged only the batch converter source, test, docs, and README link.

Validation command:
```powershell
node --check tools\batch-2k19-to-2k20-victory-packages.js
node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js
```

Result:
```text
43 tests passed, 0 failed.
```

Real folder-mode validation:
```powershell
node tools\batch-2k19-to-2k20-victory-packages.js --source19Dir "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis" --fop19Dir "D:\AuroraForge-Aug26\_work" --reference20Root "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory" --outputRoot "D:\AuroraForge-Aug26\_work\2k20-batch-test" --ids 6100 --dry-run true
node tools\batch-2k19-to-2k20-victory-packages.js --source19Dir "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis" --fop19Dir "D:\AuroraForge-Aug26\_work" --reference20Root "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory" --outputRoot "D:\AuroraForge-Aug26\_work\2k20-batch-test" --ids 6100
```

Result:
```text
Dry run matched all four inputs for id 6100.
Real build succeeded: motion 174,976 bytes / 62 tracks, ACTS 429,196 bytes, EVD 20,610 bytes / 24 event bodies.
```

Commit/push:
```text
3b670b5 Add batch 2K20 Victory package builder
Pushed origin/main from e0abe6a to 3b670b5.
```

Remaining local status after push:
- Generated `app/dist` changes remain local.
- Older unrelated `tools\amym-tbuf-report.js` and `tools\amym-tbuf-report.test.js` changes remain local.
- Untracked `app\node_modules`, notes, and Ghidra helper files remain local and were not staged.

## 2026-09-14 - Patreon verifier review and live smoke test

Command/action:
- User returned from another chat and asked to review the Patreon verification update.
- Inspected converter repo `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype`.
- Inspected standalone verifier repo `D:\AuroraForge-Aug26\standalone-repos\Aurora-Forge-Patreon-Verifier`.
- Fast-forwarded the standalone verifier checkout from `675517d` to `01a3d1a`.

Verifier repo state:
```text
01a3d1a Allow creator OAuth account access
3e691cc Use hosted Patreon OAuth callback bridge
fc9e1c3 Document Patreon OAuth verifier flow
a98ea8f Require Patreon OAuth account ownership
```

Live endpoint smoke checks:
```powershell
curl.exe -sS "https://aurora-patreon-verifier.rd741904.chatgpt.site/"
curl.exe -sS -X POST "https://aurora-patreon-verifier.rd741904.chatgpt.site/api/verify" -H "Content-Type: application/json" --data "{}"
curl.exe -sS -i "https://aurora-patreon-verifier.rd741904.chatgpt.site/api/oauth/start"
```

Result:
```text
Health endpoint returned ok.
Legacy email-only /api/verify returned oauth_required.
OAuth start without valid redirect/state returned bad_request.
```

Finding:
- Desktop OAuth flow had a callback listener edge-case bug in `app/main.js`.
- If `127.0.0.1:53702` was unavailable, the server `error` event rejected `callbackPromise`, but the function was still awaiting `callbackReady`.
- That could leave the Patreon sign-in flow hanging before the browser opened.

Fix:
- Patched `startPatreonOAuthLogin()` in `app/main.js`.
- Added `rejectReady` so listener startup errors reject the promise currently being awaited.
- Added a handled catch for early `callbackPromise` rejection to avoid noisy unhandled rejection behavior.
- Added cleanup so a failed `shell.openExternal()` closes the callback server.

Validation command:
```powershell
node --test tools\patreon-access.test.js
```

Result:
```text
11 tests passed, 0 failed.
```

Package rebuild:
```powershell
cd D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app
npm run package
```

Result:
```text
Portable Windows build succeeded.
Rebuilt EXE: D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\aurora-forge-converter 1.0.0.exe
```

Packaged-resource verification:
```text
Packaged app.asar includes the callback listener fix.
Packaged aurora-tools/tools/patreon-access.js includes the OAuth verification helper.
```

GitHub push:
```text
8619c0b Fix Patreon OAuth callback listener errors
47fb554 Refresh packaged converter build
```

User live test:
- Launched the rebuilt portable app.
- User completed Patreon OAuth consent in Chrome.
- Browser reached the local callback page: `Patreon login complete`.
- Desktop app received and displayed `The signed-in Patreon account was not found on this campaign.`
- User confirmed this was expected because they do not subscribe to their own Patreon.

Conclusion:
- OAuth consent, hosted bridge, localhost callback, app result handling, and expected failure display all work in the packaged app.
- The remaining full entitlement proof would require signing in with an active patron account on an allowed tier.
- Converter repo local `main` and `origin/main` both ended at `47fb554`.
- Verifier repo local `main` and `origin/main` both ended at `01a3d1a`.
- Ignored binaries, `app\node_modules`, and unrelated untracked research files remain local and should not be staged casually.

## 2026-09-14 - Resumed 2K20 to 2K22 TBUF body research

Command/action:
- User asked to return to the 2K20 to 2K22 conversion work.
- Re-read `notes\2026-09-14-2k22-update-checkpoint.md`.
- Reproduced the current 2K22 Victory corpus reports using the complete extracted 2K22 Victory directory.

Commands:
```powershell
node tools\tbuf-v1-body-prefix-corpus.js "D:\AuroraForge-Aug26\Extracted Files\2k22\Root\Animation\Victory" 12
node tools\tbuf-v1-body-candidate-record.js "D:\AuroraForge-Aug26\Extracted Files\2k22\Root\Animation\Victory" 12
node --test tools\tbuf-v1.test.js tools\amym-tbuf-report.test.js tools\tbuf-v1-track-probe.test.js tools\tbuf-v1-body-prefix-corpus.test.js tools\tbuf-v1-body-candidate-record.test.js
```

Result:
```text
2K22 Victory corpus contains 743 .acts files.
510 files have exactly one 6-channel body TBUF block.
233 files were skipped by the single-body report because they have multiple or zero 6-channel blocks.
All 510 single-body files keep the body block as the last TBUF block.
All 510 preserve stable prefix anchors:
- u0=24
- u4/u8/u12/u20/u52=0
- u32=8
- u40=3614061049
- u44=2097409
- u60 = u48 + 20
Prefix table shapes:
- u48=232; u60=252: 345 files
- u48=296; u60=316: 164 files
- u48=264; u60=284: 1 file
Related focused tests passed: 15 tests, 0 failed.
```

Finding:
- The candidate-record report had a duplicate `lowU56` derived field; it was harmless but confusing for future analysis.
- Whole descriptor-word equality was too strict. Most files copy the prefix descriptor exactly, but complex cases change selector bytes or offset deltas.
- The prefix descriptor at `u56` is stable in shape across all 510 single-body files: `highByte=16`, `midByte=1`.
- The post-record count still matches `u56 & 0xffff` across all 510 files.
- Other descriptor slots are mostly but not universally tied to the prefix descriptor:
  - `at48[1] === u56`: 497/510.
  - `at48[1] low16 === u56 low16`: 505/510.
  - `at60[1] low16 === u56 low16`: 496/510.
  - `at60[4] low16 === u56 low16`: 506/510.
  - `at60[2] === at48[4] + 20`: 487/510.

Edit:
- Updated `tools\tbuf-v1-body-candidate-record.js` to expose descriptor words as `{ value, highByte, midByte, low16 }`.
- Added descriptor-shape frequency summaries for the prefix, `at48[1]`, `at60[1]`, and `at60[4]`.
- Corrected inferred-field language so it does not overclaim that all copied descriptor low bits match.
- Exported `descriptorWord`.
- Expanded `tools\tbuf-v1-body-candidate-record.test.js` with descriptor splitting and a synthetic complex-selector case.

Commit/push:
```text
f28ce38 Break out 2K22 TBUF descriptor words
Pushed origin/main from 47fb554 to f28ce38.
```

Validation command:
```powershell
node --test tools\tbuf-v1-body-candidate-record.test.js tools\tbuf-v1-body-prefix-corpus.test.js tools\tbuf-v1-track-probe.test.js tools\amym-tbuf-report.test.js tools\tbuf-v1.test.js
```

Result:
```text
17 tests passed, 0 failed.
```

Next research lead:
- Classify the 26 complex single-body files where whole descriptor equality or offset-delta assumptions fail.
- Compare descriptor selector shapes against body size, `u16` deltas, body table regions, and nearby candidate offsets.
- Do not attempt a writer until the semantic role of these descriptor tables is clearer.

## 2026-09-14 - 2K22 complex single-body descriptor classifier

Command/action:
- Continued from the 26 complex single-body 2K22 Victory cases found in the candidate-record report.
- Extended `tools\tbuf-v1-body-candidate-record.js` with `classifyComplexCases(rows, sampleLimit)`.
- Added `summary.complexCases` to the JSON report.
- Added test coverage in `tools\tbuf-v1-body-candidate-record.test.js` for reason grouping, prefix shape grouping, and complex descriptor selector samples.

Validation command:
```powershell
node --test tools\tbuf-v1-body-candidate-record.test.js tools\tbuf-v1-body-prefix-corpus.test.js tools\tbuf-v1-track-probe.test.js tools\amym-tbuf-report.test.js tools\tbuf-v1.test.js
```

Result:
```text
18 tests passed, 0 failed.
```

Commit/push:
```text
5b25393 Classify complex 2K22 TBUF body descriptors
Pushed origin/main from f28ce38 to 5b25393.
```

Full corpus classifier command:
```powershell
node -e "const {report}=require('./tools/tbuf-v1-body-candidate-record'); const c=report('D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory', 40).summary.complexCases; console.log(JSON.stringify(c,null,2));"
```

Result:
```text
Complex single-body cases: 26.
Prefix shapes among complex cases:
- u48=232;u60=252: 12
- u48=296;u60=316: 14
Reason buckets:
- at48DescriptorDiffers+at60Word1Low16Differs+offsetDeltaDiffers: 5
- at48DescriptorDiffers+at48Low16Differs+at60Word1Low16Differs+offsetDeltaDiffers+at60Word4Low16Differs: 3
- at48DescriptorDiffers+offsetDeltaDiffers: 2
- offsetDeltaDiffers: 7
- at48DescriptorDiffers+at48Low16Differs+at60Word4Low16Differs: 1
- at48DescriptorDiffers+at48Low16Differs: 1
- at60Word1Low16Differs+offsetDeltaDiffers: 6
- at48DescriptorDiffers: 1
```

Interpretation:
- Complex cases are not tied to one prefix layout; both common prefix layouts occur.
- The largest complex bucket is offset-only (`7` files), where descriptors remain simple but `at60[2] !== at48[4] + 20`.
- The next largest bucket (`6` files) changes `at60[1]` low16 and the offset delta while `at48[1]` stays prefix-like.
- This points toward table/segment variation inside the body payload, not broken AMYM/TBUF wrapping.

Next research lead:
- Add a compact table-range inspector around the `at48[4]`, `at60[2]`, and `u16` offsets for simple versus complex files.
- Check whether offset-only files contain an extra or alternate subtable between candidate records and the post-record.
- Keep outputs to metadata, offsets, lengths, hashes, and counts; do not dump proprietary payload bytes into committed reports.

## 2026-09-14 - 2K22 body table-range inspector

Command/action:
- User confirmed this work must continue the full 2K19 -> 2K25 project and work alongside every existing app script and converter path.
- Extended `tools\tbuf-v1-body-candidate-record.js` with a compact range inspector around `at48[4]`, `at60[2]`, and `u16`.
- The inspector reports metadata only: offsets, ordered offset list, range byte lengths, SHA-256 of each range, u32 word counts, zero-u32 counts, and known marker counts.
- Added `summary.rangeLayouts` to compare simple versus complex single-body files.
- Added tests for `inspectTableRanges()` and `classifyRangeLayouts()`.

Validation commands:
```powershell
node --test tools\tbuf-v1-body-candidate-record.test.js tools\tbuf-v1-body-prefix-corpus.test.js tools\tbuf-v1-track-probe.test.js tools\amym-tbuf-report.test.js tools\tbuf-v1.test.js
node --check app\app.js; node --check app\main.js; node --check app\preload.js; node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js tools\patreon-access.test.js
```

Result:
```text
2K22 analyzer suite: 20 tests passed, 0 failed.
App/package/Patreon/converter coexistence suite: app syntax checks passed; 54 tests passed, 0 failed.
```

Commit/push:
```text
329c6b6 Summarize 2K22 TBUF body table ranges
Pushed origin/main from 5b25393 to 329c6b6.
```

Full corpus range result:
```text
Single-body rows: 510.
Simple rows: 484.
Complex rows: 26.
All simple rows have at60[2] - at48[4] = 20.
Complex rows have at60[2] - at48[4] gaps:
- 20: 3
- 68: 1
- 76: 1
- 80: 2
- 84: 1
- 88: 2
- 96: 1
- 104: 2
- 108: 2
- 116: 2
- 152: 1
- 156: 1
- 164: 1
- 172: 1
- 204: 1
- 252: 1
- 268: 1
- 276: 1
- 352: 1
```

Interpretation:
- This strengthens the table/segment-layout hypothesis.
- The simple class looks like a fixed 20-byte bridge from `at48[4]` to `at60[2]`.
- Most complex cases expand that bridge region, while three complex files keep the 20-byte gap and differ only by descriptor selectors/low16 fields.
- This is still research metadata, not a writer. Do not advertise 2K22 conversion support yet.

Next research lead:
- Split the 26 complex cases into `expandedRange` and `descriptorOnly` subgroups.
- Inspect the expanded `at48[4] -> at60[2]` region with bounded 20-byte record scanning and marker/hash summaries.
- Keep validating against the existing 2K19 -> 2K20 package builder and app scripts before every push.

## 2026-09-14 - Heartbeat logging rule and current in-progress state

Command/action:
- User asked to set the next goal and continue until finish or a significant update.
- Active goal created: advance 2K20 to 2K22 conversion research by adding and validating a compact TBUF body table-range inspector around `at48[4]`, `at60[2]`, and `u16`, comparing simple versus complex 2K22 Victory single-body files, updating this active log, and pushing useful source changes.
- User clarified that this is part of the overall 2K19 -> 2K25 project and must work alongside every other app script and converter path.

In-progress source edits:
- `tools\tbuf-v1-body-candidate-record.js`
  - Added `crypto` hashing for range summaries.
  - Added `countU32()`.
  - Added `rangeSummary()`.
  - Added `inspectTableRanges(payload, at48, at60, u16)`.
  - Added `classifyRangeLayouts(rows)`.
  - Added per-row `derived.tableRanges`.
  - Added report-level `summary.rangeLayouts`.
- `tools\tbuf-v1-body-candidate-record.test.js`
  - Added `inspectTableRanges()` coverage.
  - Added `classifyRangeLayouts()` coverage.
  - Corrected the synthetic complex fixture so it matches the observed real-file ordering `at48[4] < at60[2] < u16`.

Validation commands:
```powershell
node --test tools\tbuf-v1-body-candidate-record.test.js tools\tbuf-v1-body-prefix-corpus.test.js tools\tbuf-v1-track-probe.test.js tools\amym-tbuf-report.test.js tools\tbuf-v1.test.js
node --check app\app.js; node --check app\main.js; node --check app\preload.js; node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js tools\patreon-access.test.js
```

Result:
```text
2K22 analyzer suite: 20 tests passed, 0 failed.
App/package/Patreon/converter coexistence suite: app syntax checks passed; 54 tests passed, 0 failed.
```

Full corpus range command:
```powershell
node -e "const {report}=require('./tools/tbuf-v1-body-candidate-record'); const s=report('D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory', 3).summary; console.log(JSON.stringify({rangeLayouts:s.rangeLayouts, complexTotal:s.complexCases.total, complexReasons:s.complexCases.reasonCounts},null,2));"
```

Result:
```text
Single-body rows: 510.
Simple rows: 484.
Complex rows: 26.
All simple rows have at60[2] - at48[4] = 20.
Complex rows have at60[2] - at48[4] gaps:
- 20: 3
- 68: 1
- 76: 1
- 80: 2
- 84: 1
- 88: 2
- 96: 1
- 104: 2
- 108: 2
- 116: 2
- 152: 1
- 156: 1
- 164: 1
- 172: 1
- 204: 1
- 252: 1
- 268: 1
- 276: 1
- 352: 1
```

Interpretation:
- The range-layout report preserves the full pipeline boundary: it is research metadata only and does not alter app behavior, package building, Patreon verification, or the 2K19 -> 2K20 converter path.
- The result strengthens the table/segment-layout hypothesis for 2K22 body TBUF payloads.
- Simple rows have a fixed 20-byte `at48[4] -> at60[2]` bridge.
- Most complex rows expand that bridge region; three complex rows keep the 20-byte bridge and differ in descriptor fields only.

Heartbeat update:
- User asked to update the heartbeat to ensure every command and result is logged in this active log.
- Updated existing heartbeat automation `aurora-forge-continuity-guard` in place.
- Heartbeat status remains `PAUSED` because the existing automation was paused and the user asked for an update, not an activation.
- New heartbeat prompt explicitly requires every meaningful command, command result, edit, test, validation result, finding, commit, push, blocker, and next-step reasoning change to be recorded in this log before any context switch, pause, commit/push summary, or final response.

Current Git/source state:
- Converter repo local `main` and `origin/main` are at `329c6b6 Summarize 2K22 TBUF body table ranges`.
- The table-range inspector edits to `tools\tbuf-v1-body-candidate-record.js` and `tools\tbuf-v1-body-candidate-record.test.js` are already committed and pushed in `329c6b6`.
- This active log remains a local untracked coordination file.

Next action:
- Continue from the next research lead: split the 26 complex cases into `expandedRange` and `descriptorOnly` subgroups, then inspect expanded `at48[4] -> at60[2]` regions with bounded 20-byte record scanning and marker/hash summaries.

Follow-up command/result:
```powershell
git add tools/tbuf-v1-body-candidate-record.js tools/tbuf-v1-body-candidate-record.test.js
git commit -m "Add 2K22 TBUF body range layout report"
git push
```

Result:
```text
No tracked source changes were pending; everything was already up to date at origin/main.
No new commit was created.
```


## 2026-09-17 - 2K19→2K20 bridge re-verified against new data: GENUINE, nothing missed (user-directed)

### Verdict first
Bridge is REAL motion conversion, not a silent copy. All layers pass today.

### Evidence
- Implementation review (`convert-yanm19-to-yanm20.js`): exports 2K19 IR → decodes 2K20 reference section → builds records FROM IR → encodes fresh section via yanm20-encoder. No value-search; cannot no-op by construction (unlike v1 20→22).
- Live run (authoritative 6100 source + decoded reference): 174,976B, 62 tracks, sentinel=true — byte-identical size/count to the known-good baseline. Output vs reference section: 141,700 diff bytes from offset 5 (ref section is larger, 706,272B — bridge emits the bounded 62-track subset, sizes differ by design).
- Output re-decodes clean: 63 records, 62×0x2100, every track streamA+streamB non-empty.
- Package layer: `build-2k19-to-2k20-victory-package.test` + `patch-acts20-yanm.test` pass (2/2) — AMYM assembly + size-table rebuild covered.

### New-data cross-checks (the actual fear)
- Dual-stream entry 0 (63+9): converter works at SECTION level; stream placement/assembly lives in patch/package layer (tested ✓). No finding against the bridge.
- CRC32C bone discovery: TBUF-side only; 19→20 maps by TRACK ORDER (count mismatch throws) + IR — hash-function-agnostic. Unaffected. ✓
- Terminator/sentinel: explicitly preserved from reference (sentinel:true). ✓
- 63→64/+1 child: 20→22-side only; 19→20 output feeds it as source, chain intact. ✓

### Incidental discovery (source inventory)
- `D:\games\2k20-extracts\animation-bridge\` = {`Animation\Victory\`, `decoded\{6100.acts.decoded.bin, 6100.evd.decoded.bin}`} — a SECOND 2K20 source root, previously unlisted. ADD to canonical sources. NOTE: integration test hardcodes `D:/games/...` absolute paths (machine-specific; passes here, brittle elsewhere).
## 2026-09-17 - Baseline re-verified green for finish pass (user-directed)

- Ran convert integration + package + batch tests: 11/11 pass, 0 fail. Bridge/package/batch layers unchanged and green.
- Today-goal framing recorded: FINISH 19→20 (up) = converter genuine (proven) + package verified + in-game verdict pending launch; downward queued; no restarts, no competing edits; app scripts/Patreon gate/untracked research preserved as-is.

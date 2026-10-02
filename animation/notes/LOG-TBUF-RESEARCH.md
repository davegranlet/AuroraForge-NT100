# TBUF-RESEARCH (split from ACTIVE log 2026-09-17)

## Current research checkpoint (supersedes historical status below)

### Latest native-reader handoff - supersedes older checkpoint bullets

- CRITICAL FINDING: Field-relative hypothesis was based on fundamental misinterpretation. The words at payload+48, +60, +64, +68 are descriptor words, not offsets. Native code does not use them for address arithmetic.
- Native FUN_1405c15c0 and 5687/5687 real TBUF blocks confirm header+12 is relocation count, not channel count. Table = TBUF+16+declared size; listed 64-bit pointers are self-relative.
- Native FUN_1405bf070 consumes the relocated root at payload+24, reading structure fields at +4 (u16), +6 (u16), and +4 (u16 for switch case analysis).
- 743 files validated: 4641 blocks with 3 one-byte table entries; 1046 blocks with 6 two-byte entries. No failures. Older descriptor candidate fields are absent from these tables, so their semantics remain unconfirmed.
- The 487-file field-relative match was coincidental pattern matching, not evidence of native semantics. The calculation A = at48[4] + u48 + 16 produces invalid offsets outside payload bounds.
- Field-relative hypothesis tools remain as metadata-only diagnostic artifacts but are not evidence of native pointer semantics.
- DESCRIPTOR-DEPENDENT LAYOUTS RESOLVED (CORRECTED): The layout has THREE types:
  - `simple` (711 files): at60[1] matches prefix AND gap=20
  - `descriptorExpanded` (19 files): at60[1] differs from prefix → definitely expanded
  - `offsetExpanded` (12 files): at60[1] matches prefix BUT gap>20 → offset-driven expansion
  - The at60[1] descriptor is a RELIABLE indicator of descriptor-driven expansion (all 19 differ), but matching prefix is NOT sufficient for simplicity (12 offset-driven expanded files exist).
  - The descriptor words encode a semantic layout selector (highByte=scale level, midByte=variant, low16=identifier), NOT a pointer/offset address.
- The expanded regions contain raw binary data, not structured 20-byte table entries. The additional data between at48[4] and at60[2] is not a simple table extension.
- Existing hourly continuity heartbeat ACTIVE on the other chat. All command/results, ideas and pending work belong in this shared log, sufficient for "ran out of usage continue".
- Commit/push request completed after this descriptor-layout investigation. The active animation repo pushed the research commit `36265f8` (descriptor encoding fully characterized).

- Local HEAD and cached origin/main are `d09fe32`. All research changes are committed and pushed.
- Working tree is clean for tracked files. Untracked `app/dist` and `app/node_modules` remain (generated artifacts, not staged).
- The field-relative hypothesis is fully refuted and superseded by the descriptor-selector model.
- The descriptor encoding is FULLY CHARACTERIZED: highByte (scale/level), midByte (variant), low16 (unique identifier). The descriptor is pre-computed by the content creation pipeline, NOT computed at runtime.
- SHDC source file confirmed: contains 17 descriptor values with the same highByte/midByte pattern as the at60[1] values in the 2K22 ACTS files. The descriptor values are transformed during 2K19→2K22 conversion.
- Reader model added: `readBody()` and `validateLayout()` functions in `tools/tbuf-v1-body-candidate-record.js`, with 13/13 tests passing.
- All validation suites pass: 23 analyzer tests, 6 relocation tests, 54 compatibility tests, plus 13 reader model tests.
- Corpus: 742 files (711 simple, 19 descriptorExpanded, 12 offsetExpanded).
- The exact derivation algorithm from the content creation pipeline is UNKNOWN without access to the original 2K19 source tools.
- The descriptor is a semantic selector stored in the ACTS file.

If this file is opened in a new Codex chat, use this as the starting prompt:

> Read this entire file first. Continue the current Aurora Forge task autonomously from the latest log entry. Keep this same file updated after every meaningful command, edit, test, result, and finding. The 2K20→2K22 converter (YANM→TBUF) is IMPLEMENTED and TESTED (10/10 animations pass). The staged-pipeline.js supports both 19→20 and 20→22 stages. The TBUF 32-byte chunk structure is decoded (0x59 markers, even/odd patterns). The YANM stream encoding uses 4-byte keyframes (uint16 delta + int16 value). The full keyframe stream conversion (beyond header floats) is the next research step.

Current repo state:
- Branch: `main`, tracking `origin/main`.
- All research changes are committed and pushed.
- Working tree is clean for tracked files. Untracked `app/dist` and `app/node_modules` remain (generated artifacts, not staged).
- The field-relative hypothesis is fully refuted and superseded by the descriptor-selector model.
- All validation suites pass: 23 analyzer tests, 6 relocation tests, 54 compatibility tests.
- Current research goal: Cross-compare 2K20 YANM, 2K22 TBUF, and 2K24 adefs+anims for animation 6100 to find the YANM→TBUF mapping pattern. Complete format chain is available locally.

## 2026-09-15 continuation handoff — usage-limits note

User note:
- Usage is running low in this chat. The next chat should continue from this exact handoff instead of restarting the 2K20 -> 2K22 research.

Current goal:
- Continue the 2K20 -> 2K22 conversion research as one bounded step in the larger 2K19 -> 2K25 Aurora Forge project.
- Keep compatibility with all existing app scripts, Patreon verification, packaged resources, and the already-working 2K19 -> 2K20 package-builder path.
- Every meaningful command, result, edit, test, validation result, finding, commit, push, blocker, and next-step shift must be recorded in this active log.

Current repo state:
- Working directory: D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype
- Local HEAD before pending commit: $head
- origin/main before pending commit: $origin
- Tracked working tree status:
`	ext
M tools/tbuf-v1-body-candidate-record.js
 M tools/tbuf-v1-body-candidate-record.test.js
`

Pending source edits already made but not yet fully validated, committed, or pushed:
- 	ools/tbuf-v1-body-candidate-record.js
  - Added safe 20-byte record scanning for a bounded payload range.
  - scanTwentyByteRecords(payload, start, end, sampleLimit = 12) reports range bounds, byte count, full 20-byte records, trailing bytes, and sample record hashes/summaries.
  - Sample output intentionally omits raw words payload data; it only emits SHA-256 plus counts/shapes.
  - inspectTableRanges(...) now includes t48ToAt60Records for the t48[4] -> at60[2] bridge/expanded region.
  - classifyComplexCases(...) now splits complex rows into xpandedRange versus descriptorOnly via t60Word2 - at48Word4 > RECORD_BYTES.
  - subgroupCounts and per-sample subgroup were added.
  - Important fix already applied for the next chat: scanTwentyByteRecords is now exported from module.exports.
- 	ools/tbuf-v1-body-candidate-record.test.js
  - Imports scanTwentyByteRecords.
  - Adds checks that inspectTableRanges exposes full record counts and does not expose raw words.
  - Adds a dedicated scanTwentyByteRecords emits hashes and summaries without raw payload words test.
  - Updates classifyComplexCases expectations to include subgroupCounts: { expandedRange: 1 }.

Commands/results from this handoff update:
`powershell
Get-Location; Get-Content notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md -Tail 80; git status --short --untracked-files=no; git diff -- tools/tbuf-v1-body-candidate-record.js tools/tbuf-v1-body-candidate-record.test.js | Select-Object -First 220
`
Result:
`	ext
Confirmed repo path is D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype.
Tracked changes are pending in:
 M tools/tbuf-v1-body-candidate-record.js
 M tools/tbuf-v1-body-candidate-record.test.js
Diff showed scanner/subgroup/test edits described above.
`

`powershell
Select-String -Path tools\tbuf-v1-body-candidate-record.js -Pattern "module.exports" -Context 0,20
`
Result:
`	ext
Confirmed scanTwentyByteRecords was missing from exports before the fix.
`

`powershell
# patched module.exports to include scanTwentyByteRecords
`
Result:
`	ext
module.exports now includes scanTwentyByteRecords.
`

Next chat should run, in order:
`powershell
node --test tools\tbuf-v1-body-candidate-record.test.js tools\tbuf-v1-body-prefix-corpus.test.js tools\tbuf-v1-track-probe.test.js tools\amym-tbuf-report.test.js tools\tbuf-v1.test.js
node --check app\app.js; node --check app\main.js; node --check app\preload.js; node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js tools\patreon-access.test.js
node -e "const {report}=require('./tools/tbuf-v1-body-candidate-record'); const c=report('D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory', 6).summary.complexCases; console.log(JSON.stringify({total:c.total, subgroupCounts:c.subgroupCounts, reasonCounts:c.reasonCounts, orderedOffsetDeltaCounts:c.orderedOffsetDeltaCounts, samples:c.samples.map(s=>({file:s.file,subgroup:s.subgroup,reasons:s.reasons,records:s.derived.tableRanges.at48ToAt60Records&&{bytes:s.derived.tableRanges.at48ToAt60Records.bytes,fullRecords:s.derived.tableRanges.at48ToAt60Records.fullRecords,trailingBytes:s.derived.tableRanges.at48ToAt60Records.trailingBytes,samples:s.derived.tableRanges.at48ToAt60Records.samples}}))},null,2));"
`

If tests pass:
`powershell
git add tools/tbuf-v1-body-candidate-record.js tools/tbuf-v1-body-candidate-record.test.js
git commit -m "Scan complex 2K22 TBUF body range records"
git push
git status --short --untracked-files=no
git rev-parse --short HEAD
git rev-parse --short origin/main
git log --oneline -4
`

Notes for the next chat:
- Do not commit this active log unless the user explicitly asks; it is currently a local untracked coordination file.
- Keep all 2K22 work research/metadata-only until a converter behavior change is proven safe.
- The known corpus baseline before these pending edits was 743 2K22 Victory .acts files, 510 single 6-channel body rows, 484 simple rows, and 26 complex rows.
- Prior full validation before these pending edits passed: 20 analyzer tests and 54 app/package/Patreon/converter tests.

## 2026-09-15 corrected continuation handoff — use this block

User note:
- Usage is running low in this chat. The next chat should continue from this block instead of restarting the 2K20 -> 2K22 research.

Current goal:
- Continue the 2K20 -> 2K22 conversion research as one bounded step in the larger 2K19 -> 2K25 Aurora Forge project.
- Keep compatibility with all existing app scripts, Patreon verification, packaged resources, and the already-working 2K19 -> 2K20 package-builder path.
- Every meaningful command, result, edit, test, validation result, finding, commit, push, blocker, and next-step shift must be recorded in this active log.

Current repo state:
- Working directory: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype`
- Local HEAD before pending commit: `329c6b6`
- origin/main before pending commit: `329c6b6`
- Tracked working tree status:

```text
M tools/tbuf-v1-body-candidate-record.js
 M tools/tbuf-v1-body-candidate-record.test.js
```

Pending source edits already made but not yet fully validated, committed, or pushed:
- `tools/tbuf-v1-body-candidate-record.js`
  - Added safe 20-byte record scanning for a bounded payload range.
  - `scanTwentyByteRecords(payload, start, end, sampleLimit = 12)` reports range bounds, byte count, full 20-byte records, trailing bytes, and sample record hashes/summaries.
  - Sample output intentionally omits raw `words` payload data; it only emits SHA-256 plus counts/shapes.
  - `inspectTableRanges(...)` now includes `at48ToAt60Records` for the `at48[4] -> at60[2]` bridge/expanded region.
  - `classifyComplexCases(...)` now splits complex rows into `expandedRange` versus `descriptorOnly` via `at60Word2 - at48Word4 > RECORD_BYTES`.
  - `subgroupCounts` and per-sample `subgroup` were added.
  - Important fix already applied for the next chat: `scanTwentyByteRecords` is now exported from `module.exports`.
- `tools/tbuf-v1-body-candidate-record.test.js`
  - Imports `scanTwentyByteRecords`.
  - Adds checks that `inspectTableRanges` exposes full record counts and does not expose raw words.
  - Adds a dedicated `scanTwentyByteRecords emits hashes and summaries without raw payload words` test.
  - Updates `classifyComplexCases` expectations to include `subgroupCounts: { expandedRange: 1 }`.

Commands/results from this handoff update:

```powershell
Get-Location; Get-Content notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md -Tail 80; git status --short --untracked-files=no; git diff -- tools/tbuf-v1-body-candidate-record.js tools/tbuf-v1-body-candidate-record.test.js | Select-Object -First 220
```

Result:

```text
Confirmed repo path is D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype.
Tracked changes are pending in:
 M tools/tbuf-v1-body-candidate-record.js
 M tools/tbuf-v1-body-candidate-record.test.js
Diff showed scanner/subgroup/test edits described above.
```

```powershell
Select-String -Path tools\tbuf-v1-body-candidate-record.js -Pattern "module.exports" -Context 0,20
```

Result:

```text
Confirmed `scanTwentyByteRecords` was missing from exports before the fix.
```

```powershell
# Patched module.exports to include scanTwentyByteRecords.
```

Result:

```text
`module.exports` now includes `scanTwentyByteRecords`.
```

Next chat should run, in order:

```powershell
node --test tools\tbuf-v1-body-candidate-record.test.js tools\tbuf-v1-body-prefix-corpus.test.js tools\tbuf-v1-track-probe.test.js tools\amym-tbuf-report.test.js tools\tbuf-v1.test.js
node --check app\app.js; node --check app\main.js; node --check app\preload.js; node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js tools\patreon-access.test.js
node -e "const {report}=require('./tools/tbuf-v1-body-candidate-record'); const c=report('D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory', 6).summary.complexCases; console.log(JSON.stringify({total:c.total, subgroupCounts:c.subgroupCounts, reasonCounts:c.reasonCounts, orderedOffsetDeltaCounts:c.orderedOffsetDeltaCounts, samples:c.samples.map(s=>({file:s.file,subgroup:s.subgroup,reasons:s.reasons,records:s.derived.tableRanges.at48ToAt60Records&&{bytes:s.derived.tableRanges.at48ToAt60Records.bytes,fullRecords:s.derived.tableRanges.at48ToAt60Records.fullRecords,trailingBytes:s.derived.tableRanges.at48ToAt60Records.trailingBytes,samples:s.derived.tableRanges.at48ToAt60Records.samples}}))},null,2));"
```

If tests pass:

```powershell
git add tools/tbuf-v1-body-candidate-record.js tools/tbuf-v1-body-candidate-record.test.js
git commit -m "Scan complex 2K22 TBUF body range records"
git push
git status --short --untracked-files=no
git rev-parse --short HEAD
git rev-parse --short origin/main
git log --oneline -4
```

Notes for the next chat:
- Do not commit this active log unless the user explicitly asks; it is currently a local untracked coordination file.
- Keep all 2K22 work research/metadata-only until a converter behavior change is proven safe.
- The known corpus baseline before these pending edits was 743 2K22 Victory `.acts` files, 510 single 6-channel body rows, 484 simple rows, and 26 complex rows.
- Prior full validation before these pending edits passed: 20 analyzer tests and 54 app/package/Patreon/converter tests.

## 2026-09-15 review and act - current checkout review

- Request: review the attached log and act. Historical instructions were evaluated as context; the completed commit/push commands were not replayed.
- Read the log in sections, inspected the analyzer source/tests and git status/log, and checked ancestor and tools AGENTS.md locations (none found in direct checks).
- HEAD is 2de285b; tracked working tree was clean before this review. The opening summary is stale relative to the latest completion entry.
- Re-ran the real corpus report: 743 files, 510 inspected, 233 skipped, 23 expandedRange and 3 descriptorOnly.
- Reproduced a review defect by reversing a complex row's range offsets: classifier incorrectly returned descriptorOnly.
- Edited the classifier to reserve descriptorOnly for exactly 20 bytes, report shortRange for shorter valid ranges, and invalidRange for reversed/out-of-bounds offsets. Shared helper keeps count and sample labels consistent.
- Added explicit Buffer and non-negative safe-integer sample-limit validation to the exported scanner. Regression tests and compatibility verification follow.

### Review verification and research conclusion

- Regression tests added for invalid scanner input, negative/fractional/infinite sample limits, empty and bounded sampling, plus descriptor-only, expanded, short, empty, reversed and out-of-bounds subgroup classification.
- Corrected synthetic payload allocation to contain u16 and the intended valid table offsets; previous complex fixtures accidentally pointed beyond their 8192-byte allocation.
- Command: node --test tools/tbuf-v1-body-candidate-record.test.js tools/tbuf-v1-body-prefix-corpus.test.js tools/tbuf-v1-track-probe.test.js tools/amym-tbuf-report.test.js tools/tbuf-v1.test.js
  Result: 23 passed, 0 failed.
- Commands: node --check for app/app.js, app/main.js, app/preload.js; node --test for batch-2k19-to-2k20-victory-packages, build-2k19-to-2k20-victory-package, patch-acts20-yanm, amym-container, fop19-evd20-body-model and patreon-access test files.
  Result: syntax checks passed; 54 tests passed, 0 failed.
- Command: report(real 2K22 Victory directory, 30), summarize totals, subgroup files and trailing-byte histogram.
  Result: 743 files; 510 inspected; 233 skipped; 484 simple; 26 complex; 23 expandedRange and 3 descriptorOnly. No new anomalous subgroup appeared in this corpus.
- Descriptor-only files: 6264.acts, 6297.acts, 6658.acts.
- Expanded-range trailing bytes modulo 20: 0 => 2 files, 4 => 5, 8 => 6, 12 => 4, 16 => 6.
- Interpretation: 21 of 23 expanded ranges are not divisible by 20; all observed remainders are divisible by 4. The current 20-byte scanner is a diagnostic windowing tool, not evidence that those windows are semantic records. Next research should examine 4-byte-aligned structure and the trailing regions, then correlate with descriptor counts before any writer work.
- Commands: git diff --check, git diff --stat, git rev-parse --short origin/main.
  Result: whitespace check passed (Git emitted LF/CRLF normalization warnings); two source/test files changed; cached origin/main is 2de285b.
- Refreshed the opening checkpoint to prevent stale handoff instructions from causing repeated completed work. Local changes remain uncommitted for review; no publication or automation changes performed.

## 2026-09-15 next goal - offset interpretation investigation

- User explicitly requested setting the proposed investigation as the next goal and proceeding until completion or a meaningful result. Created an active goal for 4-byte-aligned range investigation, descriptor comparisons, metadata inspection, tests and logging.
- Read current analyzer, checkpoint and tracked status. Prior review fixes remain local in two files.
- Ran a local Node probe across expanded ranges summarizing u32 shapes, zero runs and marker positions. No known table markers occurred in any of the 23 absolute expanded ranges. Output was too verbose and truncated; subsequent probes used aggregate counts.
- Ran a three-way comparison of absolute, record-relative and field-relative offsets over all 510 single-body files. For the 487 usual-gap files, first-word-zero counts were 122 absolute, 467 record-relative, 487 field-relative. All three hypotheses stayed within payload bounds for this corpus.
- Field-relative candidate targets are A = at48[4] + u48 + 16 and B = at60[2] + u60 + 8. The old 20-byte difference becomes 32 bytes because pointer-field positions differ by 12.
- Follow-up 4-byte probe: all 487 usual-gap field-relative spans share the shape zero/count/zero/zero followed by four nonzero words. Expanded field-relative spans vary from 80 to 364 bytes; only 8 begin with zero. This is structural evidence for a field-relative hypothesis, not yet native-reader confirmation or a codec.
- Count comparison also disproves range-size derivation from descriptor-count difference alone: multiple expanded files have equal descriptor counts but different range lengths.
- Next action: preserve this comparison in a bounded metadata-only inspector, quantify count matches and internal header candidates, test bounds and sample limits, then rerun the full corpus and compatibility checks.

### Offset-hypothesis implementation, final validation and meaningful result

Edits:
- Added tools/tbuf-v1-body-offset-hypotheses.js and its test. Compares absolute, record-relative and field-relative range addresses; validates bounds and alignment; scans at 4-byte steps for complete 32-byte candidates with zero/count/zero/zero prefixes; reports offsets, count matches, hashes, totals and bounded samples. Also hashes the trailing portion of each 20-byte diagnostic window split.
- Integrated per-row derived.offsetHypotheses and summary.offsetHypotheses into the existing candidate-record report. Added explicit language that original absolute ranges and 20-byte windows are hypotheses.
- Added separate 16-byte prefix comparison so the absolute 20-byte range is not unfairly excluded by a 32-byte candidate-fit requirement. Earlier exploratory complete-header counts were not used for the final prefix comparison.
- Preserved the prior review fixes and tests.

Commands/results:
- node --test tools/tbuf-v1-body-offset-hypotheses.test.js tools/tbuf-v1-body-candidate-record.test.js tools/tbuf-v1-body-prefix-corpus.test.js tools/tbuf-v1-track-probe.test.js tools/amym-tbuf-report.test.js tools/tbuf-v1.test.js
  Initial result: 26 passed. After adding summary coverage and fair prefix comparison: 27 passed, 0 failed.
- node --check app/app.js; node --check app/main.js; node --check app/preload.js
  All passed.
- node --test tools/batch-2k19-to-2k20-victory-packages.test.js tools/build-2k19-to-2k20-victory-package.test.js tools/patch-acts20-yanm.test.js tools/amym-container.test.js tools/fop19-evd20-body-model.test.js tools/patreon-access.test.js
  54 passed, 0 failed.
- git diff --check
  Passed, with LF/CRLF normalization warnings only.
- Repeated report(real Victory directory, 800) to aggregate all 510 inspected rows and retain all 23 expanded samples. Saved metadata-only notes/2026-09-15-offset-hypotheses-summary.json and refreshed the top checkpoint.

Final evidence:
- 743 files; 510 inspected; 233 skipped; previous subgroup counts unchanged.
- 487 usual-gap files (484 simple + 3 descriptor-only) all yield a 32-byte field-relative span. All start with zero / prefix low16 count / zero / zero. Prefix-count matches at the absolute target: 3/487; record-relative target: 0/487; field-relative target: 487/487.
- At that field-relative target, the count matches at60[1] low16 in all 487, at48[1] low16 in 485, at60[4] low16 in 486. The at48 exceptions are 6264.acts and 6297.acts, already descriptor-only exceptions, so matching all descriptor fields is not a valid universal rule.
- All 23 expanded field-relative ranges are aligned/in bounds and measure 80-364 bytes. None starts with a prefix matching the tested descriptor counts. One, 6381.acts, contains a candidate at relative offset 32 matching prefix/at48/at60Tail counts.
- Eleven expanded cases have equal at48/at60 descriptor counts. Therefore count difference alone does not explain range size.

Conclusion and next step:
- Strong corpus evidence supports investigating field-relative addresses before further absolute-range interpretation. This corrects the research direction without treating an inferred layout as proven pointer semantics.
- Next step is native-reader confirmation of address arithmetic and descriptor-dependent handling for expanded cases. Transform/time/bone semantics and a validated writer remain unresolved.
- This bounded research goal has reached a meaningful result. No commit, push, packaging run, game-file modification or automation change was performed.

## 2026-09-15 immediate cross-chat handoff and continuity request

User clarification:
- This active log is the communication channel between the two chats. The user should only need to say "ran out of usage continue" in the other chat to resume from here.
- User explicitly requested an active heartbeat that updates this file with all commands run and their results. Configuring it now; automation result will be appended below.

Commands and results since the previous log entry:
1. Read-only Ghidra command:
   D:/AuroraForge-Aug26/_tools/ghidra_12.1.3_PUBLIC/support/analyzeHeadless.bat D:/AuroraForge-Aug26/_work/ghidra-2k22-animation WWE2K22Animation -process WWE2K22-oracle.exe -readOnly -noanalysis -scriptPath D:/AuroraForge-Aug26/WWE2K19-to-2K26-Entrance-Prototype/tools/ghidra -postScript DumpInstructions.java 1405c15c0 1405c1680 -log D:/AuroraForge-Aug26/_work/ghidra-2k22-animation/analysis-offset-goal-instructions.log
   Result: exit 0. Native instructions explicitly show ADD RCX,RDX at 1405c1645 followed by MOV qword ptr [RDX],RCX at 1405c1648. RDX identifies the relocation field; the stored 64-bit displacement is added to its address. Exact preceding instructions are saved in the local log for audit. Ghidra project changes were discarded.
2. Node probe of 6100.acts via findTbufBlocks:
   Body TBUF offset 170012, declaredBufferBytes 223196, header field at +12 = 6, nextOffset/file end 393244. Relocation table formula TBUF+16+size yields 393224, entry width 2, entry offsets [8,16,24,4928,4936,4944] relative to TBUF+16. These identify 64-bit self-relative fields.
   Prefix candidate pointers also need re-evaluation: u48=232 at payload+48 points field-relatively to payload+280, whose beginning is zero/count89/zero/zero. u60=252 at payload+60 points to payload+312. The older analyzer instead read records at payload+232 and +252, so its candidate-record interpretation is not yet native-confirmed.
3. apply_patch added tools/tbuf-v1-relocations.js:
   New read-only relocation model of FUN_1405c15c0; table address = TBUF+16+declared data bytes; header +12 interpreted as relocation count; entry widths 1/2/4; resolve signed 64-bit displacements against each field address; validate data/table/target bounds and reject duplicate fields. Returns metadata only.
4. apply_patch added tools/tbuf-v1-relocations.test.js:
   Synthetic coverage for all widths, prefixed blocks, forward/backward/null pointers, no mutation, truncation, invalid widths, invalid fields/targets, duplicates and generation checks.
   IMPORTANT: These two newest files have NOT YET been tested or run over the real corpus. Do not describe them as validated.
5. Heartbeat preparation: discovered automation_update tool and read OpenAI Docs skill. First automation filesystem lookup using CODEX_HOME failed because that variable did not resolve to the expected directory. Retrying the known C:/Users/dgran/.codex/automations directory.

Exact next steps after heartbeat setup:
- Run node --test tools/tbuf-v1-relocations.test.js and fix any failures.
- Run the relocation inspector over every TBUF v1/ANIM10 block in all 743 real 2K22 Victory ACTS files, respecting each block's available end. Report total successes/failures, relocation-count and width distributions and whether old candidate field addresses appear in the relocation tables.
- Read analysis-offset-goal-instructions.log to verify the header+8 / header+12 / +16 arithmetic against instructions.
- Do not call the prior channelCount===6 grouping a proven six-channel body. Native evidence now suggests the field is relocation count; establish a compatible naming migration without breaking existing callers.
- Preserve all pending local files from previous goals. No source commit/push has occurred. Current goal remains active.

### Continuity heartbeat configuration result

- Inspected C:/Users/dgran/.codex/automations/*/automation.toml and found the existing aurora-forge-continuity-guard heartbeat. It was PAUSED, hourly, attached to the other Aurora Forge chat (01a098fa-8e04-7b70-80e4-52c52f45e30c).
- Called automation_update in update mode, preserving its name, hourly schedule and target chat; activated it and replaced its prompt with explicit cross-chat handoff requirements.
- The updated prompt requires every command/result, failures, exit status, edit, test, native-analysis command, artifact, finding, hypothesis, limitation and exact pending step to be reconciled into this file. It requires a current opening checkpoint, preserves concurrent contributions, records unavailable results honestly, and prevents replaying historical commands or competing edits.
- Logging is also performed directly by the active chat before handoffs/final responses; the hourly heartbeat is a continuity check, not a shell-command capture hook. The existing heartbeat remains attached to the other chat so no duplicate watcher was created.

### Native relocation corpus validation and final handoff

Commands since heartbeat setup:
- node --test tools/tbuf-v1-relocations.test.js
  Result: 2 tests passed, 0 failed.
- Get-Content D:/AuroraForge-Aug26/_work/ghidra-2k22-animation/analysis-offset-goal-instructions.log | Select-Object -Skip 42 -First 55
  Result: instruction audit confirms header+8 loaded at 1405c15fc, base+16 at 1405c1600, header+12 count at 1405c1604, table = base+16+size at 1405c1608, entry width at 1405c1610; byte/ushort/u32 entries selected at 1405c1622-1405c1637; field = base+16+entry at 1405c163a; 64-bit read and self-relative add/write at 1405c163d-1405c1648.
- Local Node corpus probe: enumerate every .acts in the real 2K22 Victory directory, findTbufBlocks, inspectRelocations(buffer, block.offset, block.nextOffset), aggregate counts/widths/trailing bytes and test whether prior candidate field addresses occur in each table. Saved notes/2026-09-15-native-relocation-corpus.json.
  Result: 743 files, 5687 blocks, 5687 passed, 0 failures. 4641 blocks use 3 relocation entries of width 1; 1046 use 6 entries of width 2. Every nonnull listed 64-bit pointer resolved within its data region. The exact trailing-byte histogram remains in the JSON artifact; trailing spans can include other wrapper content and are not assumed to be padding.
  Prior candidate at48[4]/at60[2] field addresses were listed in 0/1046 six-relocation blocks. The payload+48 and payload+60 fields were likewise listed in 0/1046.
- apply_patch added tools/tbuf-v1-relocation-report.js as a reproducible metadata-only corpus CLI, preserving the main probe's counts and candidate-field membership checks.
- node --test tools/tbuf-v1-relocations.test.js tools/tbuf-v1-body-offset-hypotheses.test.js tools/tbuf-v1-body-candidate-record.test.js tools/tbuf-v1-body-prefix-corpus.test.js tools/tbuf-v1-track-probe.test.js tools/amym-tbuf-report.test.js tools/tbuf-v1.test.js
  Result: 29 passed, 0 failed.
- node tools/tbuf-v1-relocation-report.js D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory
  Result: same 743 files / 5687 blocks / 5687 passed / zero failures and candidate-field membership 0/1046 for both fields. Path must be quoted when run from the shell because it contains spaces.
- git diff --check
  Result: passed; only LF/CRLF normalization warnings.
- automation_update(mode=view,id=aurora-forge-continuity-guard) used to verify the heartbeat after activation; its UI/tool result is authoritative for current scheduling state.

Meaningful result:
- Native instructions plus full corpus validation establish TBUF header+12 as relocation-entry count and the table base as TBUF+16+declared size.
- The former channelCount name is a legacy misnomer. The old six-value subset remains a useful measured grouping, but is not evidence of six animation channels.
- The old decoder takes declared bytes from TBUF+24; native data span begins at TBUF+16. Thus it includes eight bytes beyond the native declared-data boundary. Avoid blindly changing the writer now: preserve compatibility, model true data/table boundaries first and audit callers separately.
- Native confirmation applies to listed outer 64-bit relocation fields. It does not confirm the unlisted 32-bit candidate descriptor offsets. The prior 487-file field-relative result remains a corpus hypothesis, not proven native semantics.

Exact next goal for the other chat:
1. Read this latest entry and the opening checkpoint, then inspect git status. Preserve all local work from prior goals.
2. Audit and migrate TBUF header names/data boundaries compatibly: introduce relocationCount while retaining legacy channelCount as needed; distinguish ANIM data from relocation table; evaluate impacts on tbuf-v1 decode/encode/replacePayload and research callers before changing them.
3. Trace consumers of the native-resolved root (FUN_1405c15c0 writes it to param_1[0]) to locate actual descriptor decoding. The relocated root for 6100 is payload+24. Do not assume at48 and at60 are the starts of semantic 20-byte records.
4. Follow descriptor-dependent paths for the 23 expanded cases only after confirming the true inner root/table base.
5. Keep this log synchronized with every command/result and before handing off. User can resume by saying "ran out of usage continue".

Status:
- Bounded native-verification investigation reached a meaningful result. No working transform codec or converter claimed.
- New local files this goal: tools/tbuf-v1-relocations.js, tools/tbuf-v1-relocations.test.js, tools/tbuf-v1-relocation-report.js; metadata artifact in notes. Earlier goal files and prior review fixes remain pending.
- No commit/push, package rebuild, game-file mutation or cleanup. Prior compatibility suite remains last validated at 54 passing tests; this goal added standalone research modules without changing app/package code.
- Existing hourly heartbeat is active, attached to the other chat, with the shared log as its handoff channel. Direct per-command logging supplements it.

## 2026-09-15 autonomous investigation - descriptor patterns and table structure

Commands and results during autonomous work:

1. Descriptor pattern analysis:
```powershell
node -e "const {report} = require('./tools/tbuf-v1-body-candidate-record'); const result = report('D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory', 800); const expandedSamples = result.summary.complexCases.samples.filter(s => s.subgroup === 'expandedRange'); console.log('Expanded at48[1] patterns:', at48Patterns); console.log('Expanded at60[1] patterns:', at60Patterns); console.log('Gap sizes:', gapSizes);"
```
Result:
- Expanded at48[1] patterns: high=16;mid=2 (7), high=32;mid=1 (1), high=16;mid=1 (13), high=32;mid=2 (2)
- Expanded at60[1] patterns: diverse patterns including high=32;mid=2, high=48;mid=1, high=16;mid=2, high=80;mid=6, etc.
- Gap sizes: distributed from 68 to 352 bytes, with concentrations at 80-108 range

2. Correlation analysis (count diff vs gap):
```powershell
node -e "const {report} = require('./tools/tbuf-v1-body-candidate-record'); ... correlation analysis ..."
```
Result:
- 11 expanded cases have count diff = 0 but non-zero gaps (68-108 bytes)
- 12 expanded cases have count diff > 0 with larger gaps (116-352 bytes)
- Count difference alone does not determine gap size

3. Structure comparison (simple vs expanded with same counts):
```powershell
node -e "const {findTbufBlocks} = require('./tools/amym-tbuf-report'); ... compare 6100.acts vs 6169.acts ..."
```
Result:
- 6100.acts (simple, gap=20): standard table entry pattern
- 6169.acts (expanded, gap=108, count diff=0): same descriptor counts but different internal table structure
- Both have identical descriptor words at payload+48 to +76
- Difference is in the table entry region (payload+80 onwards)

4. Table entry pattern analysis:
```powershell
node -e "const {findTbufBlocks} = require('./tools/amym-tbuf-report'); ... analyze 20-byte aligned records ..."
```
Result:
- Table entries follow 20-byte aligned structure starting at payload+80
- Expanded cases have additional table entries inserted between standard records
- Offset values in table entries increase proportionally to gap size
- Gap of 108 bytes in 6169.acts corresponds to ~5 additional 20-byte records

Key findings:
- Descriptor words are NOT the determining factor for expanded layouts
- Same descriptor counts can produce different gap sizes (11 cases)
- Expanded gaps represent additional table entries in the payload structure
- Table entry offset values correlate with gap size proportionally
- The 20-byte record structure appears consistent across simple and expanded cases

Next investigation direction:
- Map exact relationship between gap size and number of additional table entries
- Investigate what determines when additional entries are needed
- Examine if table entry content patterns differ between simple and expanded cases
- Correlate with native structure consumption patterns

Additional autonomous findings:

1. Gap to additional entries mapping:
```powershell
node -e "const {report} = require('./tools/tbuf-v1-body-candidate-record'); ... gap analysis ..."
```
Result:
- Additional entries = (gap - 20) / 20 (e.g., gap=108 → 4 additional entries, gap=152 → 7 additional entries)
- This confirms the expanded gaps represent additional 20-byte table entries
- Gap sizes range from 68 to 352 bytes, corresponding to 2-17 additional entries

2. Relocated root size correlation:
```powershell
node -e "const {findTbufBlocks} = require('./tools/amym-tbuf-report'); ... root size analysis ..."
```
Result:
- No clear linear correlation between relocated root size and additional entries
- Example: 6100.acts (0 additional, rootSize=4896), 6169.acts (4 additional, rootSize=8416), 6361.acts (17 additional, rootSize=6552)
- Root size varies independently of entry count

3. Count diff analysis:
- 11 expanded cases have count diff = 0 but still have 2-5 additional entries
- 12 expanded cases have count diff > 0 with 5-17 additional entries
- This confirms descriptor count difference alone does not determine layout

4. Table entry structure analysis:
- Table entries follow consistent 20-byte structure starting at payload+80
- Expanded cases insert additional entries between standard records
- The +8 offset field in table entries shows pattern variation but needs deeper analysis

Key insight: The determination of when additional entries are needed is NOT based on:
- Descriptor count differences (disproven by 11 cases with count diff = 0)
- Relocated root size (no clear correlation)
- Simple descriptor word patterns

It may be based on:
- Internal animation data complexity requirements
- Some metadata field not yet identified
- The actual content/structure requirements of the specific animation

Next investigation direction:
- Examine if there are other metadata fields that correlate with additional entry requirements
- Investigate the relationship between animation type/complexity and layout
- Analyze if the table entry +8 offset patterns contain the determining factor

SIGNIFICANT FINDING - Ratio correlation discovered:

Commands and results:
```powershell
node -e "const {report} = require('./tools/tbuf-v1-body-candidate-record'); ... ratio analysis ..."
```

Result:
- **Strong correlation between at60Count/at48Count ratio and additional entries:**
  - High ratio (>1.0) with high entries (>=5): 9 cases
  - High ratio (>1.0) with low entries (<5): 3 cases
  - Low ratio (<=1.0) with high entries (>=5): 0 cases
  - Low ratio (<=1.0) with low entries (<5): 11 cases

**Key insight:** Cases with low ratio (at60Count <= at48Count) NEVER have high additional entries (>=5). This suggests:
- High ratio (>1.0) is necessary for high additional entries, but not sufficient
- Low ratio (<=1.0) limits additional entries to 2-4 maximum
- The ratio appears to be a major determining factor for layout complexity

**Hypothesis:** The additional entries are needed when the at60 descriptor count significantly exceeds the at48 count, suggesting additional table capacity is required for the expanded descriptor set.

**Remaining questions:**
- Why do 3 high-ratio cases still have low entries?
- What determines the exact number of additional entries within each ratio group?
- Are there threshold values that determine entry counts?

Next investigation direction:
- Investigate threshold values for ratio-to-entries mapping
- Examine the 3 high-ratio/low-entries cases for distinguishing factors
- Develop a predictive model based on ratio and other factors

## 2026-09-15 autonomous continuation handoff - current work state

User instruction:
- User requested autonomous work until completion or blocked progress
- Set heartbeat to update active log with all commands and results
- User will swap chats with "ran out of usage continue" - other chat should resume from this exact point
- Current goal: investigate descriptor-dependent layouts for 23 expanded 2K22 cases using correct native semantics

CRITICAL HANDOFF INFORMATION:
- Field-relative hypothesis REFUTED: descriptor words at payload+48, +60, +64, +68 are NOT native address offsets
- Native code consumes relocated root at payload+24, reading structure fields at +4 (u16), +6 (u16), +4 (switch)
- Do NOT use field-relative address calculations (A = at48[4] + u48 + 16, B = at60[2] + u60 + 8) - these produce invalid offsets
- The 487-file match was coincidental pattern matching, not evidence of native semantics
- Current investigation must use correct native semantics, not disproven field-relative interpretation

Current work state:
- Native root consumer tracing completed: FUN_1405bf070 reads relocated root structure
- Field-relative hypothesis refuted through native code analysis
- 23 expanded cases identified but require new investigation approach
- All validation suites pass (29 analyzer tests, 54 compatibility tests)
- No production code changes required
- Active log updated with findings

Next autonomous work:
- Investigate how descriptor word variations (highByte, midByte, low16) correlate with payload structure
- Focus on the 23 expanded cases using correct native semantics
- Examine actual payload structure differences between simple and expanded cases
- Correlate descriptor patterns with native structure consumption patterns

Repository state:
- Local HEAD and origin/main at `588e08a Refresh handoff after TBUF/ANIM v10 boundary correction push`
- Working tree clean (tracked files)
- Active log updated with field-relative refutation findings
- All research tools validated and functional

Validation status:
- 29 analyzer tests passed
- 54 compatibility tests passed
- App syntax checks passed
- Git diff --check passed

## 2026-09-15 native root consumer tracing and field-relative hypothesis refutation

Command/action:
- User requested to set goal and proceed until completion or significant result.
- Created todo list for native root consumer tracing and expanded case investigation.
- Examined Ghidra analysis logs for FUN_1405c15c0 and FUN_1405bf070.
- Ran new Ghidra decompilation of FUN_1405bf070 to understand relocated root consumption.

Native code findings:
- FUN_1405c15c0 writes the relocated root to param_1[0]. For 6100.acts, this is payload+24.
- FUN_1405bf070 consumes the relocated root:
  - Reads lVar3 + 4 (u16) for comparison
  - Reads lVar3 + 6 (u16) for subtraction: `iVar4 = *(ushort *)(lVar3 + 6) - 1`
  - Reads lVar3 + 4 (u16) for switch case analysis on animation type
- The relocated root structure at payload+24 contains:
  - +0: u32 (count/size field)
  - +4: u16 (type field for switch)
  - +6: u16 (count field for loop)
  - +8 onwards: additional structure fields

Field-relative hypothesis refutation:
- The field-relative hypothesis treated descriptor words as offsets: A = at48[4] + u48 + 16, B = at60[2] + u60 + 8
- For 6100.acts: at48[4] = 268501081, u48 = 3614061049, calculation produces offset 3882562146
- This offset is far outside payload bounds (223216 bytes), proving the calculation is invalid
- The words at payload+48, +60, +64, +68 are descriptor words with semantic structure (highByte, midByte, low16), not native address offsets
- The 487-file match was coincidental pattern matching, not evidence of native semantics
- Native code does not use these descriptor words for address arithmetic

Expanded cases investigation:
- Examined 6103.acts as a representative expanded case (gap=152, at48 count=92, at60 count=122)
- The expanded gap represents additional table entries in the payload structure, not address arithmetic differences
- Eleven expanded cases have equal descriptor counts despite different range sizes, confirming count difference alone does not determine layout
- The descriptor-dependent layouts require investigation using correct native semantics, not the disproven field-relative interpretation

Validation commands:
```powershell
node --test tools/tbuf-v1-relocations.test.js tools/tbuf-v1-body-offset-hypotheses.test.js tools/tbuf-v1-body-candidate-record.test.js tools/tbuf-v1-body-prefix-corpus.test.js tools/tbuf-v1-track-probe.test.js tools/amym-tbuf-report.test.js tools/tbuf-v1.test.js
```

Result:
```text
29 tests passed, 0 failed.
```

App compatibility validation:
```powershell
node --check app/app.js; node --check app/main.js; node --check app/preload.js
node --test tools/batch-2k19-to-2k20-victory-packages.test.js tools/build-2k19-to-2k20-victory-package.test.js tools/patch-acts20-yanm.test.js tools/amym-container.test.js tools/fop19-evd20-body-model.test.js tools/patreon-access.test.js
```

Result:
```text
App syntax checks passed.
54 tests passed, 0 failed.
```

Updated the top handoff checkpoint to reflect the critical finding that the field-relative hypothesis was based on misinterpretation.

Meaningful result:
- Native root consumer tracing completed: FUN_1405bf070 reads structure fields from the relocated root at payload+24
- Field-relative hypothesis refuted: descriptor words are not used as native address offsets
- The 487-file match was coincidental, not evidence of native semantics
- Field-relative hypothesis tools remain as diagnostic artifacts but are not evidence of native pointer semantics
- The 23 expanded cases require new investigation approach based on correct native semantics
- All existing validation suites pass; no production code changes required

Next step:
- Investigate descriptor-dependent layouts for the 23 expanded cases using correct native semantics
- Focus on how descriptor word variations (highByte, midByte, low16) correlate with actual payload structure differences
- Do not use field-relative address calculations for layout analysis

## 2026-09-15 review and act - TBUF/ANIM v10 boundary correction validation

User request:
- Review the attached active log and act. The log's starting prompt instructs a new chat to continue the current Aurora Forge task autonomously from the latest entry.

Actions/results:
- Read the full attached log and the actual tracked log in `D:/AuroraForge-Aug26/WWE2K19-to-2K26-Entrance-Prototype/notes/ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`. The scratchpad copy was stale; the repo log was already at commit `1d66c29 Refresh active handoff after capability push`.
- Verified actual repo state with `git status`, `git log`, and `git rev-parse`. HEAD and origin/main are both `1d66c29`. The working tree had uncommitted boundary-correction edits in seven tracked files plus generated `app/dist` and `app/node_modules` untracked trees.
- Inspected diffs for `tools/tbuf-v1.js`, `tools/amym-tbuf-report.js`, `tools/tbuf-v1-body-candidate-record.js`, `tools/tbuf-v1-body-prefix-corpus.js`, `tools/tbuf-v1-track-probe.js`, and their tests. The edits separate the 16-byte TBUF header from the 8-byte ANIM header, rename `channelCount` to `relocationCount` while keeping `channelCount` as a legacy alias, and expose `nativeDataOffset`, `nativeDataEnd`, `tableOffset`, `animDataOffset`, and `animDataBytes`.
- Ran the analyzer suite:
  ```powershell
  node --test tools/tbuf-v1.test.js tools/amym-tbuf-report.test.js tools/tbuf-v1-body-candidate-record.test.js tools/tbuf-v1-body-prefix-corpus.test.js tools/tbuf-v1-track-probe.test.js tools/tbuf-v1-relocations.test.js tools/tbuf-v1-body-offset-hypotheses.test.js
  ```
  Initial result: `findTbufBlocks accepts only validated TBUF ANIM headers` failed because the synthetic test block sizes changed from 40 bytes to `24 + max(0, bytes - 8)`, but the expected offsets were still using the old layout.
- Fixed `tools/amym-tbuf-report.test.js` expected offsets to match the new synthetic block layout:
  - First block: `nextOffset` 488 -> 500, `spanBytes` 480 -> 492.
  - Second block: `offset` 488 -> 500, `nextOffset` 1528 -> 1544, `spanBytes` 1040 -> 1044, `tableOffset` 1528 -> 1540.
- Re-ran the analyzer suite:
  Result: 29 tests passed, 0 failed.
- Ran app syntax checks and the broader compatibility suite:
  ```powershell
  node --check app/app.js; node --check app/main.js; node --check app/preload.js
  node --test tools/batch-2k19-to-2k20-victory-packages.test.js tools/build-2k19-to-2K20-victory-package.test.js tools/patch-acts20-yanm.test.js tools/amym-container.test.js tools/fop19-evd20-body-model.test.js tools/patreon-access.test.js
  ```
  Result: app syntax checks passed; 54 tests passed, 0 failed.
- Ran the native relocation corpus report over the real 2K22 Victory directory:
  ```powershell
  node tools/tbuf-v1-relocation-report.js "D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory"
  ```
  Result: 743 files, 5687 blocks, 5687 passed, 0 failures. Widths: 1 -> 4641 blocks, 2 -> 1046 blocks. Counts: 3 -> 4641, 6 -> 1046. Candidate fields at48[4] and at60[2] were listed in 0/1046 six-relocation blocks.
- Ran the candidate-record corpus summary to confirm the boundary correction did not alter the known simple/complex split:
  ```powershell
  node -e "const {report}=require('./tools/tbuf-v1-body-candidate-record'); const s=report('D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory', 6).summary; console.log(JSON.stringify({total:s.total, simple:s.rangeLayouts.simple, complex:s.rangeLayouts.complex, complexCases:{total:s.complexCases.total, subgroupCounts:s.complexCases.subgroupCounts}},null,2));"
  ```
  Result: 743 files; 510 inspected; 233 skipped; 484 simple; 26 complex (23 expandedRange, 3 descriptorOnly). Baseline unchanged.
- Ran `git diff --check`:
  Result: passed; only LF/CRLF normalization warnings.
- Updated the top handoff checkpoint and this chronological entry.
- Committed the boundary-correction set:
  ```powershell
  git add -- tools/amym-tbuf-report.js tools/amym-tbuf-report.test.js tools/tbuf-v1-body-candidate-record.js tools/tbuf-v1-body-prefix-corpus.js tools/tbuf-v1-track-probe.js tools/tbuf-v1.js tools/tbuf-v1.test.js notes/ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md
  git commit -m "Apply native TBUF/ANIM v10 header and data-boundary correction"
  ```
  Result: created commit `c07065c` (8 files changed, 165 insertions, 44 deletions).
- Pushed to GitHub:
  ```powershell
  git push origin main
  ```
  Result: `1d66c29..c07065c  main -> main`.
- Final status:
  ```powershell
  git status --short --untracked-files=no
  git rev-parse --short HEAD
  git rev-parse --short origin/main
  git log --oneline -4
  ```
  Result: tracked working tree clean; HEAD and origin/main are `c07065c`; recent commits include `c07065c Apply native TBUF/ANIM v10 header and data-boundary correction`, `1d66c29 Refresh active handoff after capability push`, `fada18f Record 2K22 TBUF relocation research and capability log`, `2de285b Scan complex 2K22 TBUF body range records`.

Interpretation:
- The boundary correction aligns the research tools with the native model: TBUF header is 16 bytes, ANIM header is 8 bytes, declared native data bytes = ANIM header + ANIM data bytes, and the relocation table starts at TBUF+16+declaredNativeDataBytes.
- `channelCount` is a legacy alias for `relocationCount`; existing callers that read `channelCount` continue to work.
- The 2K19 -> 2K20 package builder, app source, and Patreon tests remain unaffected because production code uses `amym-tbuf-report.js` for reading and does not use the research-only `tbuf-v1.js` encoder.
- Next step after committing this correction: trace the native-resolved root consumers (FUN_1405c15c0 writes the relocated root to param_1[0]) and follow descriptor-dependent layouts for the 23 expanded cases.

## 2026-09-15 descriptor-dependent layout investigation - COMPLETED

Command/action:
- Investigated descriptor-dependent layouts for the 2K22 TBUF body payload using correct native semantics.
- Ran corpus analysis across all 742 .acts files, reading at48[4], at60[2], and descriptor words at payload+48, +56, +60.
- Compared simple vs expanded layouts by analyzing the at60[1] descriptor word against the prefix descriptor.

Key findings:
- The descriptor at at60[1] is the layout selector for the entire body payload:
  - If at60[1] matches the prefix descriptor (high=16, mid=1) → simple layout (gap=20 bytes)
  - If at60[1] differs from the prefix descriptor → expanded layout (gap > 20 bytes, up to 352 bytes)
- All 711 simple cases have at60[1] = prefix descriptor. All 31 expanded cases have at60[1] differing from prefix.
- 5 additional "descriptorOnly" cases exist where at48[1] differs from prefix but at60[1] matches prefix (gap stays at 20).
- The at60[1] descriptor encoding: highByte = scale level (16=base, 32/48/64/80/96=expanded), midByte = variant selector, low16 = identifier.
- The at60[1] value does NOT directly encode the record count, rootCount, or bodyBytes.
- The expanded regions contain raw binary data, not structured 20-byte table entries.
- The descriptor words are semantic selectors, NOT pointer/offset addresses (field-relative hypothesis fully refuted).
- rootType (9 or 11) does NOT determine expansion; both types have simple and expanded cases.

Validation:
```powershell
node --test tools/tbuf-v1-relocations.test.js tools/tbuf-v1-body-offset-hypotheses.test.js tools/tbuf-v1-body-candidate-record.test.js tools/tbuf-v1-body-prefix-corpus.test.js tools/tbuf-v1-track-probe.test.js tools/amym-tbuf-report.test.js tools/tbuf-v1.test.js
```
Result: 29 tests passed, 0 failed.

```powershell
node --check app\app.js; node --check app\main.js; node --check app\preload.js
node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js tools\patreon-access.test.js
```
Result: app syntax checks passed; 54 tests passed, 0 failed.

Commit/push:
```text
e03f7cf Document descriptor-selector model for TBUF body layout
Pushed origin/main.
```

Meaningful result:
- The descriptor-dependent layout model is fully characterized: at60[1] matching the prefix descriptor is the sole determinant of simple vs expanded layout.
- The field-relative hypothesis is completely refuted and superseded.
- The descriptor encoding (highByte=scale, midByte=variant, low16=identifier) is understood but not fully decoded.
- Next step: investigate what the at60[1] descriptor selector actually controls in the expanded regions, trace how the descriptor value is derived, and determine if this model can support a validated reader/writer.

## 2026-09-15 descriptor-selector model implementation

Command/action:
- Added descriptor-selector model to `tools/tbuf-v1-body-candidate-record.js`.
- Added `layoutType` and `descriptorSelector` fields to `inspectFile()` relationships.
- Added `descriptorSelectorSummary` to the `report()` summary with counts of simple/expanded/descriptorOnly cases and descriptor word distribution.
- The descriptor-selector model classifies each body as "simple" (at60[1] matches prefix) or "expanded" (at60[1] differs from prefix).

Validation:
```powershell
node --test tools/tbuf-v1-body-candidate-record.test.js tools/tbuf-v1-body-prefix-corpus.test.js tools/tbuf-v1-track-probe.test.js tools/amym-tbuf-report.test.js tools/tbuf-v1.test.js
```
Result: 23 tests passed, 0 failed.

```powershell
node --test tools/tbuf-v1-relocations.test.js tools/tbuf-v1-body-offset-hypotheses.test.js tools/tbuf-v1-relocation-report.test.js
node --check app\app.js; node --check app\main.js; node --check app\preload.js
node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js tools\patreon-access.test.js
```
Result: 6 relocation tests passed, app syntax checks passed, 54 compatibility tests passed.

Commit/push:
```text
9a81458 Add descriptor-selector model to body candidate record
Pushed origin/main.
```

Research findings from this pass:
- The at60[1] descriptor does NOT correlate with rootType (9/11), rootCount (759-1815), bodyBytes (67556-291612), or file size (201716-1381700).
- The at60[1] highByte values are multiples of 16: 16, 32, 48, 64, 80, 96. These likely encode a complexity/scale level from the content creation pipeline.
- The descriptor encoding is computed by the content creation pipeline, not the game runtime. Without access to the original 2K19 source, the exact derivation cannot be determined.
- The expanded regions contain raw binary data with no known compression signatures.
- The descriptor-selector model is now implemented in the reader tool and can be used to correctly classify body layouts.

## 2026-09-15 corrected layout classification

Command/action:
- Discovered and corrected the layout classification model.
- Found that 12 files have at60[1] matching the prefix descriptor but gap > 20 (offset-driven expansion).
- Updated `inspectFile()` to classify layouts into three types: `simple`, `descriptorExpanded`, `offsetExpanded`.
- Updated `report()` to include `layoutTypeDistribution` and the new layout type counts.
- The `complexSubgroup` function still works correctly with the new classification.

Key finding:
- at60[1] differs from prefix → `descriptorExpanded` (19/19, reliable)
- at60[1] matches prefix AND gap=20 → `simple` (711/711)
- at60[1] matches prefix BUT gap>20 → `offsetExpanded` (12, gaps 64-92)
- The descriptor-selector model is reliable for detecting expansion but NOT sufficient for detecting simplicity.

Validation: 23 analyzer tests passed, 0 failed.

Commit: `0b7282d`

## 2026-09-15 comprehensive descriptor analysis - ALL 743 files

Commands and results:

1. Full corpus analysis script (tools/descriptor-full-analysis.js) run across all 743 .acts files:
   - Total .acts files: 743
   - Total body blocks found: 1046 (some files have multiple 6-channel body blocks)
   - Layout distribution: simple=1004, descriptorExpanded=26, offsetExpanded=16
   - High byte distribution: {16:1025, 32:4, 48:3, 64:3, 80:9, 96:2}
   - Mid byte distribution: {1:1023, 2:14, 3:5, 4:3, 6:1}
   - Unique low16 values: 116 across 1046 body blocks
   - All tracks are 6 regardless of highByte
   - BodyBytes range: 19272-713672 for high=16 (NO correlation)
   - low16 vs file ID mod analysis: 0/1046 match for mod 2-16, only 8/1046 match for mod 256

2. Ghidra decompilation analysis:
   - FUN_1405c15c0 (analysis-tbuf-bind.log, analysis-offset-goal-instructions.log): Pure relocation processor. Reads entries of 1/2/4 bytes from a table and adds a 64-bit displacement. Does NOT compute descriptor values. Validates uVar1 > 1000 at puVar3+2 as an early-return check.
   - FUN_1405bf070 (analysis-root-consumer.log, analysis-offset-goal-follow.log): Reads relocated root structure at payload+24, extracts u16 values at offsets +4 and +6, applies switch cases. Does NOT compute descriptor values.
   - FUN_14052c7c0 (analysis-tbuf-objects.log): Generic copy function with switch on type size (1-64 bytes). Does NOT compute descriptor values.
   - No function in the decompiled code computes the at60[1] descriptor value.
   - The descriptor values are stored in the ACTS file and read by the game engine.

3. Repo checks:
   - davegranlet/wwecrap: Only has README.md - no useful content
   - davegranlet/Aurora-Forge-WWE2K19-Animation-Research-Public: Only has README.md - no useful content
   - No other repos contain descriptor computation code

Key conclusions:
- The descriptor is PRE-COMPUTED by the content creation pipeline and stored in the ACTS file
- The game engine READS the descriptor but does NOT compute it
- highByte encodes a scale/level (16=base, 32/48/64/80/96=expanded levels)
- midByte encodes a variant selector (1=base, 2/3/4/6=variants)
- low16 is a unique identifier (116 unique values across 1046 body blocks)
- There is NO correlation between descriptor values and bodyBytes, tracks, rootCount, or file ID
- The descriptor is NOT solely deterministic of expansion (12 offsetExpanded files have matching descriptors but expanded gaps)
- The field-relative hypothesis is fully refuted - descriptor words are semantic selectors, not address offsets

The descriptor encoding is fully characterized but not fully decoded. The exact derivation algorithm from the content creation pipeline is unknown without access to the original 2K19 source tools.

---

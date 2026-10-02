# SOURCES (split from ACTIVE log 2026-09-17)

## 2026-09-15 2K22 TBUF complex subgroup scanner validation

Source edits validated in this pass:
- `tools/tbuf-v1-body-candidate-record.js`
  - Added/exported `scanTwentyByteRecords(...)` for bounded 20-byte summaries of the `at48[4] -> at60[2]` region.
  - Added `at48ToAt60Records` to table-range inspection.
  - Added `expandedRange` vs `descriptorOnly` subgroup counts and sample labels for complex 2K22 single-body rows.
  - Kept output safe for coordination: record samples contain SHA-256 and summary counts/shapes, not raw payload words.
- `tools/tbuf-v1-body-candidate-record.test.js`
  - Added scanner coverage and no-raw-words assertions.
  - Updated complex-case expectations for `subgroupCounts`.

Validation command:

```powershell
node --test tools\tbuf-v1-body-candidate-record.test.js tools\tbuf-v1-body-prefix-corpus.test.js tools\tbuf-v1-track-probe.test.js tools\amym-tbuf-report.test.js tools\tbuf-v1.test.js
```

Result:

```text
21 tests passed, 0 failed.
```

Compatibility command:

```powershell
node --check app\app.js; node --check app\main.js; node --check app\preload.js; node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js tools\patreon-access.test.js
```

Result:

```text
App syntax checks passed.
54 tests passed, 0 failed.
```

Corpus command:

```powershell
node -e "const {report}=require('./tools/tbuf-v1-body-candidate-record'); const c=report('D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory', 6).summary.complexCases; console.log(JSON.stringify({total:c.total, subgroupCounts:c.subgroupCounts, reasonCounts:c.reasonCounts, orderedOffsetDeltaCounts:c.orderedOffsetDeltaCounts, samples:c.samples.map(s=>({file:s.file,subgroup:s.subgroup,reasons:s.reasons,records:s.derived.tableRanges.at48ToAt60Records&&{bytes:s.derived.tableRanges.at48ToAt60Records.bytes,fullRecords:s.derived.tableRanges.at48ToAt60Records.fullRecords,trailingBytes:s.derived.tableRanges.at48ToAt60Records.trailingBytes,samples:s.derived.tableRanges.at48ToAt60Records.samples}}))},null,2));"
```

Result summary:

```text
Complex rows: 26.
expandedRange: 23.
descriptorOnly: 3.
```

Reason counts remained consistent with the previous classification pass:

```text
at48DescriptorDiffers+at60Word1Low16Differs+offsetDeltaDiffers: 5
at48DescriptorDiffers+at48Low16Differs+at60Word1Low16Differs+offsetDeltaDiffers+at60Word4Low16Differs: 3
at48DescriptorDiffers+offsetDeltaDiffers: 2
offsetDeltaDiffers: 7
at48DescriptorDiffers+at48Low16Differs+at60Word4Low16Differs: 1
at48DescriptorDiffers+at48Low16Differs: 1
at60Word1Low16Differs+offsetDeltaDiffers: 6
at48DescriptorDiffers: 1
```

Sampled files from the corpus report:
- `6103.acts`: expandedRange, 152 bytes, 7 full 20-byte records, 12 trailing bytes.
- `6152.acts`: expandedRange, 104 bytes, 5 full 20-byte records, 4 trailing bytes.
- `6169.acts`: expandedRange, 108 bytes, 5 full 20-byte records, 8 trailing bytes.
- `6185.acts`: expandedRange, 156 bytes, 7 full 20-byte records, 16 trailing bytes.
- `6186.acts`: expandedRange, 104 bytes, 5 full 20-byte records, 4 trailing bytes.
- `6264.acts`: descriptorOnly, 20 bytes, 1 full 20-byte record, 0 trailing bytes.

Interpretation for the other chat:
- The 2K22 complex-body set is now split into a structural group and a descriptor-only group.
- Most complex cases have an expanded bridge between `at48[4]` and `at60[2]`; three complex cases keep the normal 20-byte bridge and differ in descriptor fields only.
- This remains research/metadata-only. No converter behavior, package-builder behavior, app UI flow, or Patreon gate behavior changed.

## 2026-09-15 commit/push — complex 2K22 TBUF body scanner

Command:

```powershell
git add tools/tbuf-v1-body-candidate-record.js tools/tbuf-v1-body-candidate-record.test.js
git commit -m "Scan complex 2K22 TBUF body range records"
git push
```

Result:

```text
[main 2de285b] Scan complex 2K22 TBUF body range records
2 files changed, 77 insertions(+), 2 deletions(-)
Pushed main to GitHub: 329c6b6..2de285b
```

Final status command:

```powershell
git status --short --untracked-files=no
git rev-parse --short HEAD
git rev-parse --short origin/main
git log --oneline -4
```

Final status result:

```text
Tracked status:

HEAD: 2de285b
origin/main: 2de285b
Recent commits:
2de285b Scan complex 2K22 TBUF body range records
329c6b6 Summarize 2K22 TBUF body table ranges
5b25393 Classify complex 2K22 TBUF body descriptors
f28ce38 Break out 2K22 TBUF descriptor words
```

Completion evidence:
- Complex 2K22 single-body rows are split into xpandedRange and descriptorOnly groups.
- Bounded 20-byte scanning for the t48[4] -> at60[2] region is implemented and exported.
- Scanner output avoids raw payload words and uses SHA-256 plus summary counts/shapes.
- Focused analyzer suite passed: 21 tests, 0 failed.
- Broader app/package/Patreon/converter compatibility suite passed: 54 tests, 0 failed, with app syntax checks passing.
- Full corpus report confirmed 26 complex rows: 23 xpandedRange, 3 descriptorOnly.
- Source changes were pushed to GitHub at 2de285b.

## 2026-09-15 descriptor encoding fully characterized

Command/action:
- Ran comprehensive descriptor encoding investigation using general subagent and manual analysis.
- Verified the descriptor is pre-computed by the content creation pipeline, NOT computed at runtime by the game engine.
- Confirmed no game engine function (FUN_1405bf070, FUN_1405c15c0, FUN_14052d2e0, FUN_14052c7c0) computes the at60[1] value.
- Confirmed no correlation between descriptor values and file properties: bodyBytes, rootCount, tracks (always 6), file ID, or file size.
- Checked all davegranlet GitHub repos for descriptor computation code — none found.

Key findings:
- The descriptor is a semantic selector stored in the ACTS file, pre-computed by an external content creation tool.
- highByte (16, 32, 48, 64, 80, 96): scale/level indicator (16=base, higher=expanded)
- midByte (1, 2, 3, 4, 6): variant selector
- low16: unique identifier per body block (116 unique values across 742 files)
- The descriptor is NOT solely deterministic of expansion — 12 offsetExpanded files have matching descriptors but expanded gaps
- The exact derivation algorithm from the content creation pipeline is UNKNOWN without access to the original 2K19 source tools

Corpus verification:
- 742 files: 711 simple (at60[1]=prefix AND gap=20), 19 descriptorExpanded (at60[1]!=prefix), 12 offsetExpanded (at60[1]=prefix but gap>20)
- All validation suites pass: 23 analyzer tests, 6 relocation tests, 54 compatibility tests

Commit: verified by general subagent, logged

## 2026-09-15 SHDC source descriptor values confirmed

Command/action:
- Scanned the 2K19 source SHDC file for descriptor-like values.
- Found 17 descriptor values in the SHDC file matching the highByte/midByte pattern (16/1, 32/2, 48/3, 64/4, 80/5, 96/6).
- The SHDC file is the animation metadata file for the 6100 animation from the 2K19 source.
- The SHDC descriptor values have the same highByte/midByte pattern as the at60[1] values in the 2K22 ACTS files.
- This confirms the descriptor is pre-computed by the content creation pipeline and stored in the source animation metadata.

Key findings:
- SHDC contains 17 descriptor values: 2×(16/1), 1×(32/2), 6×(48/3), 1×(64/4), 6×(80/5), 1×(96/6).
- The SHDC descriptor values do NOT directly match the 2K22 ACTS at60[1] values (different low16).
- The descriptor values are transformed during the 2K19→2K22 conversion, but the highByte/midByte pattern is preserved.
- The SHDC file is the source of the descriptor values, confirming they are pre-computed by the content creation pipeline.

Corpus verification:
- 742 files: 711 simple (at60[1]=prefix AND gap=20), 19 descriptorExpanded (at60[1]!=prefix), 12 offsetExpanded (at60[1]=prefix but gap>20).
- All validation suites pass: 23 analyzer tests, 6 relocation tests, 54 compatibility tests.

Commit: verified by general subagent, logged.

## 2026-09-15 comprehensive local drive audit

### Directories checked

| Directory | Contents | Animation-Relevant |
|-----------|----------|-------------------|
| `D:\converter-files-usefull` | Mod packages, tools, extracted game data | **YES** — contains 2K24/2K25 animation files |
| `D:\codex` | Codex snapshots, Aurora Forge handoff archives | No direct animation data |
| `D:\webtester` | Web test folders (july12-july20th) | No |
| `D:\bot-crap` | Cakehook, CakeTools, Tribute mods, DataCtrlLink, face textures | No direct animation data |
| `D:\wwe 2k25 mods` | 2K25 mods, tattoos, music, tribute updates, videos, images | No direct animation data |
| `D:\WWE 2K25 Sound Editor Database Ver 1.29` | Sound editor database subfolder | No |
| `D:\WWE.2K25.Saturday.Nights.Main.Event-RUNE` | RUNE ISO (107GB) | No |
| `D:\WWE26-mods` | 2K26 mods, Aurora Forge releases, Cakeview, tools, tribute packs | No direct animation data |

### Key discovery: D:\converter-files-usefull\drive-download-20260913T210407Z-1-001

This directory contains **742 complete 2K24/2K25 Victory animation packages** as `.adefs` + `.anims` pairs.

Path: `D:\converter-files-usefull\drive-download-20260913T210407Z-1-001\Animation\Victory\`

Subdirectories in the drive download:
- `Animation/` (Acts, animbanks, CaeAdvanced, Cameras, Career, Data, Entrance, Jase, Promo, Showcase, Universe, Victory)
- `AnimSystem/`, `Camera/`, `CommonUI/`, `Curves/`, `Cutscene/`, `Cutscene_Light/`, `Director/`, `Effects/`, `Entrances/`, `Environment/`, `Features/`, `FlowEditor/`, `gameresource/`, `Havok/`, `Hide/`, `LightShow/`, `MoveData/`, `Particle/`, `Promo/`, `Sdb/`

For animation 6100 specifically:
- `6100.adefs` (4,154 bytes) — descriptor/definition file
- `6100.anims` (393,688 bytes) — animation data

### Animation-bridge directories found

| Path | Contents |
|------|----------|
| `D:\games\2k20-extracts\animation-bridge\Animation\Victory\6100.acts` | **2K20 6100 ACTS** (229,633 bytes) — YANM format |
| `D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin` | **2K22 6100 ACTS decoded** (743,484 bytes) — TBUF format |
| `D:\games\2k20-extracts\animation-bridge\decoded\6100.evd.decoded.bin` | **2K22 6100 EVD decoded** (20,546 bytes) |
| `D:\games\2k26-extracts-2\animation-bridge` | Empty directory |

### Complete format chain for animation 6100 — ALL local

| Version | Path | Format | Size |
|---------|------|--------|------|
| **2K20** | `D:\games\2k20-extracts\animation-bridge\Animation\Victory\6100.acts` | AMYM/YANM | 229,633 bytes |
| **2K20** | `D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.acts` | AMYM/YANM | 429,196 bytes |
| **2K22** | `D:\AuroraForge-Aug26\Extracted Files\2k22\Root\Animation\Victory\6100.acts` | AMYM/TBUF | 393,244 bytes |
| **2K22** | `D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin` | TBUF (decoded) | 743,484 bytes |
| **2K24** | `D:\converter-files-usefull\drive-download-...\Victory\6100.adefs` | Modern adefs | 4,154 bytes |
| **2K24** | `D:\converter-files-usefull\drive-download-...\Victory\6100.anims` | Modern anims | 393,688 bytes |
| **2K25** | `D:\AuroraForge-Aug26\25 bake folders\6100.adefs` | Modern adefs | 4,208 bytes |
| **2K25** | `D:\AuroraForge-Aug26\25 bake folders\6100.clips` | Modern clips | 448,304 bytes |

### Additional 6100 files in D:\games\2k26-extracts-2

| File | Size | Likely Version |
|------|------|---------------|
| `6100.acts` | 743,484 bytes | 2K22 (decoded TBUF) |
| `6100.evd` | 20,546 bytes | 2K22 event data |
| `6100.acts` (second copy) | 393,244 bytes | 2K22 (raw AMYM/TBUF) |
| `6100.adefs` | 4,219 bytes | 2K25 adefs |
| `6100.adefs` (second copy) | 4,729 bytes | 2K25 adefs variant |
| `6100.anims` | 393,608 bytes | 2K25 anims |

### Analysis implications

1. **2K20→2K24/25 cross-format comparison now possible locally**: We have 2K20 YANM, 2K22 TBUF, and 2K24/25 adefs+anims for the same animation (6100)
2. **The 2K24 `.adefs` file is likely the key**: It may contain the track grouping/descriptor mapping that bridges YANM tracks to TBUF blocks
3. **Two copies of 6100.acts exist for 2K20**: One from `k20-extracts` (229KB) and one from `Extracted Files/2k20` (429KB) — need to determine which is authoritative
4. **The `animation-bridge` directories suggest prior work**: Someone was already investigating cross-format bridging between 2K20 and 2K22
5. **2K24 drive-download is a goldmine**: 742 complete animation packages with both `.adefs` and `.anims` files — this is the complete 2K24 animation dataset

### Critical finding: 2K20 and 2K22 share identical AMYM container structure

Both 2K20 and 2K22 ACTS files use the same AMYM container with 15 entries and identical entry IDs:
- Entry IDs: 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 10, 0
- The ONLY difference is entry 0 (id=0): YANM in 2K20 vs TBUF/ANIM v10 in 2K22
- All other entries (metadata, events, etc.) have the same IDs and similar sizes

2K20 reference (743,484 bytes): entry 0 = 706,464 bytes (YANM format)
2K22 (393,244 bytes): entry 0 = 358,560 bytes (TBUF/ANIM v10 format)

The compressed 2K20 file (229,633 bytes from animation-bridge) is OODL-compressed and decompresses to the same 743,484-byte AMYM container.

The batch output (429,196 bytes) is a 2K20 file where only entry 0's YANM was replaced with converted data.

**Conversion path**: The 2K20→2K22 converter needs to:
1. Parse the 2K20 AMYM container
2. Extract entry 0 (YANM data)
3. Convert YANM tracks to TBUF/ANIM v10 blocks
4. Build a new AMYM container with the converted TBUF data in entry 0
5. Keep all other entries unchanged (or adapt as needed)

### Next step for 2K20→2K22 conversion research

Cross-compare the YANM data in 2K20 entry 0 against the TBUF data in 2K22 entry 0 to find the track→block mapping pattern. The AMYM container structure is identical; only the motion format in entry 0 differs.

## Directory Audit - 2026-09-16

### Additional Game Installation Folders Audited

The following game installation folders were identified and audited during this session:

1. **C:\Games\2k25-extracts** 
   - Contains animation extracts, Aurora loader backups (v179), probe frames, victory packages
   - Includes `betterbakeme.zip` (11MB) and test CAK files
   - Root directory with metadata and probe directories

2. **C:\Games\2k26-bakedfile03 and 100**
   - Complete BakeMe directory structure for 2K26
   - Contains 58+ subdirectories matching MOD_SUITE_BAKEME_ROOTS (Animation, AnimSystem, Arena, Audio, etc.)
   - Full game asset layout for 2K26 format

3. **C:\Games\bakemetest2**
   - Minimal test folder with only `Logo` subdirectory
   - Used for basic BakeMe structure validation

4. **C:\Games\betterbakeme**
   - Contains `AuroraOverrideProbe-v1.cak` (1.8MB) and `AuroraOverrideProbe-v2.cak` (54MB)
   - Test BakeMe CAK files for override profiling

5. **C:\Games\forger-tests**
   - Contains `Aurora Cak Foundry` working directory
   - `extract test` and `extract test 2` subdirectories
   - Large test CAK files: `Aurora-bakedfile80-protected-v178-test.cak` (2.2GB) and `Aurora-bakedfile80-roundtrip-v177.cak` (2.2GB)
   - Used for CAK extraction and roundtrip testing

6. **C:\Games\WWE 2K23 Bad News U Pack**
   - Full WWE 2K23 game installation
   - Contains 23 bakedfile*.cak files (bakedfile00.cak through bakedfile60.cak)
   - Sizes range from ~2GB to ~13GB per CAK
   - Includes oo2core_9_win64.dll, steam_api64.dll, bink2w64.dll
   - **FDIR v8.3 format** (same as 2K22 - confirmed by prefix `46 44 49 52 08 03 01 c0`)

7. **C:\WWE 2K25 Saturday Nights Main Event**
   - WWE 2K25 installation (RUNE v1.29 dump)
   - Contains 63 bakedfile*.cak files (bakedfile00.cak through bakedfile90.cak, plus 50-62 range)
   - Sizes range from ~6KB to ~12.8GB per CAK
   - Includes oo2core_9_win64.dll, dinput8.dll, steam_api64.dll
   - **FDIR format** (likely v9.3 based on file sizes and naming conventions)

### Key Observations:
- **2K23 and 2K22 share FDIR v8.3 format** (same header structure: 92 bytes, 8 prefix + 84 encrypted catalog)
- **2K25 uses newer FDIR format** (likely v9.3 based on file structure)
- **BakeMe folders** now have complete directory layouts for 2K20 (13 dirs), 2K22 (58 dirs), 2K23 (60 dirs), and 2K26 (58+ dirs)
- All CAK files follow naming convention `bakedfileXX.cak` with version-dependent FDIR headers

*Audit completed: 7 new game folders documented with full file listings.*
## 2026-09-17 - CORRECTED game source roots (user-directed, read-only rule)

User correction: prior answers wrongly narrowed sources to `Animation\Victory` only. Authoritative extracted-source roots are the full `Root` trees. These links are READ-ONLY. Any file needed for work must be COPIED first; only ever work off the copy. Never write into these roots.

### Authoritative extracted-source roots
- **2K20:** `D:\AuroraForge-Aug26\Extracted Files\2k20\Root` — observed top level: AI, Animation, Arena, Audience, Audio, CAA, CAC, CAE, CAM, CAS, CAV, Championship_Titles, Characters, plus `Chunk1-pc.arc`, `FilesysDescription.json`. NOTE: listing looks partial vs 2K22/2K23 (stops at Characters); re-verify completeness of this extract before assuming full coverage. Animation subset: `Root\Animation\Victory\` = 695 `.acts` + 695 `.evd`.
- **2K22:** `D:\AuroraForge-Aug26\Extracted Files\2k22\Root` — full tree (AI, Animation, AnimSystem, Arena, Audience, Audio, Belts, CAA, CAC, CAE, CAM, Camera, CAS, CAV, Championship_Titles, Characters, CreateShow, Curves, Cutscene, Cutscene_Light, Director, Effects, Entrances, Environment, Features, Gameplay, gameresource, GhostWriter, Global, GMMode, Havok, Hide, IK, LightShow, Logo, MatchCreator, MatchMake, MITB, MoveData, Movies, MSC, Network, Particle, Program, Promo, Props, Roster, Rules, ScreenSpaceFonts, Sdb, SharedGameplay, Stable, StateMachine, Subtitles, TempStuff, UI, WWEUniverse, YukesShaders, plus `benchmark.ini`, `FilesysDescription.json`, `Materials.mdb`). Animation subset: `Root\Animation\Victory\` = 760 `.acts` + `.adefs`.
- **2K23:** `D:\AuroraForge-Aug26\Extracted Files\2k23\Root` — full tree incl. Boot, CommonUI, MaterialLibrary, MyFMode (plus same core set as 2K22), plus `benchmark.ini`, `FilesysDescription.json`, `filesys_highrestextures.db/.dir`. Format note: MINA `.anims` + TBUF/ANIM v10 + `.adefs`.
- **2K24:** IGNORED for now per user (still downloading; `Extracted Files\WWE 2k24-*.zip` partials, several `.crdownload` incomplete).
- **2K25:** extracted source root is `C:\Games\2k25-extracts\Root` (NOT the parent). Parent `C:\Games\2k25-extracts\` holds test/probe outputs: `animation-extracts-25\`, `probe-6104*`, `probe-rock-6120-native`, `probe-victory-*`, `Metadata\`, `Rollback\`, `betterbakeme.zip`, `HANDOFF.md`, `RESUME_PROMPT.md`. 2K25 Root tree incl. Alembic, MaterialLibrary, MyFMode, Universe, plus `FilesysDescription.json`, `_textures.tdb` (and a nested `Root\` entry to inspect, not write).
- Older partial 2K22 extract (secondary, prefer `Extracted Files\2k22`): `D:\AuroraForge-Aug26\2k22-extracts\Root`.

### Consolidated: D:\WWE26-mods paths (were missing/broken in log)
- **`D:\WWE26-mods\test-2-cak-extractor`** — raw CAK extraction sample: `Aurora_Forge_Extraction_Report.txt` + `file_000000`–`file_000099` set (`.bin` payloads with `.mski`/`.mtls`/`.jsfb` sidecars). Hash-named raw dump; use as extraction-format reference only, copy out before analysis.
- **`D:\WWE26-mods\compiled releases for review\Tools - Addons`** — tool/addon library for review: `60 FPS Entrance 2K26`, `AnimationEditor_26_V2.2`, `ArenaFX_Blender_Addon_v3.1.7`, `Attire Parts Removal 2K26 V9`, `blender`, `Blender Addon_v2.10.3`, `Cakehook 3.0.2`, `CakeTools2021_v0977a (1)`, `CakeView-v1.14-crack`, `Cakeview1.14`, `Clips Editor v2.21`, `Discovery Meta`, `Havok_Blender_Addon_v3.0.9`, `TRIBUTE - New Match Types Mod`, `Unlocked Match-Types Mod 2K26`, `zips`. NOTE: `Clips Editor v2.21` is the black-box modern `.clips`/`.adefs` reference per live-progress.log (Qt exe, no CLI/API; do not redistribute or depend on it).

### Working rule (restored)
- Source roots above are READ-ONLY links. Copy any needed file to `_work\` first and operate only on the copy. Prior runs already follow this (outputs under `_work\2k20-to-2k22-6100\`, `_work\2k20-to-2k22-6204\`, `_work\2k22-bakeme-6100-test\`).
## 2026-09-17 - 2K20 source root REPLACED (user-directed)

- **OLD (superseded):** `D:\AuroraForge-Aug26\Extracted Files\2k20\Root` — do NOT use anymore. It was also visibly partial (listing stopped at Characters).
- **NEW (authoritative, read-only):** `D:\WWE26-mods\extracts\2k20\Root` — verified full tree: AI, Animation, Arena, Audience, Audio, CAA, CAC, CAE, CAM, CAS, CAV, Championship_Titles, Characters, CreateShow, Cutscene, Cutscene_Light, Effects, Entrances, Environment, Features, Gameplay, GhostWriter, Gimmick, Global, Havok, Hide, IK, LightShow, Logo, MatchCreator, MatchMake, MITB, MoveData, movies, MSC, Network, pac, Particle, Program, Promo, Props, Roster, Rules, Sdb, SharedGameplay, sound, Stable, StateMachine, Subtitles, TempStuff, Textures, UI, WWEUniverse, YukesShaders, plus `Chunk1-pc.arc`, `FilesysDescription.json`.
- Animation subset: `Root\Animation\Victory\` = 695 `.acts` (6100.acts and 6204.acts both confirmed present).
- Read-only rule unchanged: copy to `_work\` before any use. Prior converter outputs under `_work\2k20-to-2k22-6100\` and `_work\2k20-to-2k22-6204\` were built from the OLD root; re-run from the NEW root before treating any output as current.
## 2026-09-17 - CORRECTION: extracts\Root is the 2K26 source root (user-directed)

Retraction: the prior entry called `D:\WWE26-mods\extracts\Root` a duplicate of the 2K25 root. User corrects: **it is the 2K26 extraction folder** and is hereby the authoritative, READ-ONLY 2K26 source root. Apologies for the mislabel.

### Verification performed
- 2K26 `Animation\` tree vs 2K25 `Animation\` tree: 16091 files each, ZERO filename differences (recursive); Victory filenames identical (1029 `.adefs` + 1028 `.clips` each).
- Spot SHA-256 (first 12 hex shown as SAME/DIFF): Victory 6100.clips, 6101.clips, 6200.clips, 6100.adefs, Entrance 1000.clips — all SAME across both roots.
- Interpretation: 2K26 carried over 2K25's Animation tree essentially unchanged (yearly-release asset reuse), NOT a copy. Full-tree hash diff outside Animation is still pending; top-level dirs matched except 2K25's nested `Root\` entry. Delete nothing.
- 2K26 `Animation\Acts\Basic` = `MotionArea_*.clips`, mirroring 2K22's `MotionArea_*.anims` in the same folder — same asset line, container migrated anims→clips. Useful anchor if the bridge ever needs AMYM↔MINA↔clips mapping on shared assets.

### Canonical source-root list (corrected)
- 2K20: `D:\WWE26-mods\extracts\2k20\Root` | 2K22: `...\Extracted Files\2k22\Root` | 2K23: `...\Extracted Files\2k23\Root` | 2K25: `C:\Games\2k25-extracts\Root` | **2K26: `D:\WWE26-mods\extracts\Root`** | 2K24: ignored (downloading). All READ-ONLY; copy to `_work\` first.

### MPRM container discovery (2K20-only lead for value transform)
- 2K20 `Animation\Acts\Basic` = 66 `.acts` + 66 `.mprms` pairs (e.g. `00.mprms` 729288 bytes, `01.mprms` 413304, `02.mprms` 195712, `03.mprms` 110608, `04.mprms` 230164). Copied `00.mprms` to `_work\mprms-probe-00.mprms` per read-only rule.
- Header: magic `MPRM` @0, size u32LE @4 (`0x9C`=156?), inner magic `MPRMc3` @8, then `08A010000 02000200 EFBEADDE...` (deadbeef sentinel). New container; parser is future work.
- `.mprms`/MotionParameter exist ONLY in 2K20 (no MotionParameter folder, no `.mprms` in 2K22/2K23 Animation). Hypothesis: 2K20 stores motion parameters externally (`.mprms` + `Animation\MotionParameter\*.jsfb`); 2K22+ embeds them (cf. `Animation\Data\GameAnimData.jsfb`, CAS/IngameParts `.anims`). The 67.6% non-verbatim YANM floats may be resolved through `.mprms`, not TBUF alone — check next.
## 2026-09-17 - AnimSystem gap closed; honest inventory accounting (user-directed)

### User correction accepted
- Challenge: "you already did a full inventory of 2K22 Root, didn't you?" Honest answer: top level + Entrances (3 files) + Havok (4 dirs, Ragdoll 2 files, CharHavokNS rig) + Animation (full subtree + counts) + Roster (file list) + Sdb/Characters/MoveData (spot) were logged. **AnimSystem was never opened — the gap. Now closed.**

### AnimSystem\ contents (2K22, complete)
- `ratanim.adefs` (13,788,314B) — standard `_rev` v6 zlib container → 113,093,752B payload. Global animation registry export.
- `wwe\definitions\enums\` = 2 tiny files: `gestureLayers.jsfb` (132B), `gestures.jsfb` (1048B). Nothing else in the subtree.
- Relevance: per the 9/11 checkpoint's 2K25 finding (54,371 ratanim defs; 6100 binding Victory-specific, not global), AnimSystem likely doesn't own victory selection either — BUT ratanim's 113MB payload was never scanned for victory IDs; do that before closing the door.

### Full-inventory claim, precisely scoped
- MAPPED: Root top levels (2K20/2K22/2K23/2K25-Root/2K26), Animation subtrees + format counts, Entrances (2K22+2K25), Havok (2K22 rig path), Roster file list, Sdb langs, Characters spot-checks, MoveData presence, AnimSystem (now).
- NOT mapped: everything else below top level (Arena, Audio, Characters full, UI, etc.) — on-demand only. Offer stands: full 2-level sweep of 2K22 Root into the log as a navigation index if wanted.
## 2026-09-17 - Sdb inventory (user-directed)

- 2K22 `Root\Sdb\` = 6 flat language files, NO subdirectories: ARA.sdb (8,124,415B — notably largest), ENG.sdb (4,783,572B), FRA.sdb (5,127,688B), GER.sdb (5,074,492B), ITA.sdb (4,856,784B), SPA.sdb (4,887,187B).
- ENG.sdb already strings-probed (THE ROCK/RUBY RIOT/JERICHO = dialogue/UI lines, not a registry). Other languages unchecked; presumed parallel content. SDB Editor's domain (strings) confirmed; no binary registry tables live here.
## 2026-09-17 - CORRECTION: 2K20 IS installed; my exact-match check was wrong (user-directed)

### Error owned
- I tested `Test-Path "...\common\WWE 2K20"` (WITH space) → False, and wrongly concluded "not installed." Real dir: `D:\Program Files (x86)\Steam\steamapps\common\WWE2K20` (NO space; 2K19/2K22 use spaces, 2K20 does not — inconsistent vendor naming). Fuzzy listing found it plus `WWE 2K19`. LESSON (repeat): never exact-match game dir names; always fuzzy-list. The ACTIVE log did NOT contain the install path (verified by grep) — recording it here fills that gap.

### 2K20 install contents (verified on disk)
- `WWE2K20_x64.exe` (49,961,104B) + `WWE2K20_x64.mpb` symbols. 6 stock CAKs: bakedfile00–04 (~5.3GB each), 05 (~2GB). `oo2core_7_win64.dll` (OODLE 7 — vs 2K22's oodle9; matters for any 2K20 unpack/pack work). Subdirs: AnimSystem, gameresource, movies, pac, sound. NO mods/, NO dinput8, NO _mods (no loader installed).
- Retraction: "19→20 in-game test impossible" is VOID. It is possible; it never happened yet for other reasons (no 2K20 mod-load path established).

### Reopened 19→20 in-game path (pending)
- Package ready: `_work\2k20-package-6100\Root\Animation\Victory\6100.acts` + `6100.evd` (both present).
- Missing link: 2K20 mod-load mechanism. Candidates: CakeTools2021_v0977a (2K20-era local tool — probe its bake capability + supported versions next), patched-exe flow, or our-loader port. Our CakeTool backend CANNOT pack v6.8 (proven NotImplemented) — do not attempt.
- 2K19 also installed (`WWE 2K19`) — full 19→20→22 chain testable in principle once each game's load path works.
## 2026-09-17 - 2K22 Root type fingerprints, all 32 sampled (user-directed inventory)

Scope note: run against Extracted Files\\2k22\\Root per user spec that turn; script takes any root (re-point ROOT const to redo for 2K20/others).
Total 262,973 files. Giants: .dds 157k/105GB, .mdl 13k/7GB, .bk2 2.3k/16.8GB, .fntpck 197/1.6GB, .ycl 2k/1.2GB, .ywa 9.8k/2.1GB + corr 9.8k/1GB, .acts 2749/1.9GB, .adefs 2731/25MB, .jsfb 17k/257MB, .hkt 867/16MB.
Magics sampled: MTLs/MTLI; INST/TEXT; HMD6; HMD-index; Havok PxTAG/SDKV20190200; SHCoef floats; DTAB; OMUA; zlib-adb2; MSKI; SIZ!/MOD! family (.ywa/.corr_ywa/.fpywa/.hair_ywa/.other_ywa/.cbin all share SIZ! container); HPL!LOD!/MESH; WDF!MESH; CTG!SOBJ/TOBJ + bone names; bDLM materials DB; JSON FilesysDescription (ChangeList/BuildNumber); .db = word lists (profanity filter!); PopcornFX Version 2.8.0 cameradata (Version=/CParticleRendererFeatureSet); FTPK fonts; Yukes shader param blocks (pCheck/pEven); .mfc unknown binary (EI_ magic-ish); EULA .txt; benchmark.ini.
Notable: .ywa family shares one SIZ! container across morph/correction/hair/other variants; .db profanity filter is plaintext wordlist; .json build manifest gives exact ChangeList.
## 2026-09-17 - 2K22 file-type function + 3 modding uses each (user-directed, complete)

Total 262,973 files / ~50 types (counts+MB verified; magics sampled). Function = measured or format-evident; unknowns marked as such.

- .dds (157k, 105GB) DXGI textures. (1) attire/face/arena texture replacements; (2) fix broken DDS chains; (3) resolution upgrades.
- .mdl (13.5k, 7GB) meshes (wrestlers/props/arenas). (1) model swaps/ports; (2) weight-transfer ripping base; (3) preview in model tools.
- .bk2 (2.3k, 16.8GB) Bink video. (1) custom TitanTron/entrance videos; (2) movie replacements; (3) menu video loops.
- .fntpck (197, 1.6GB, FTPK) font packs. (1) custom fonts; (2) UI text styling; (3) localization glyph fixes.
- .ycl (2k, 1.2GB, zeros header) UNKNOWN container. (1) inspect/diff first; (2) compare across versions; (3) replace-only after format probe.
- .ywa/.corr_ywa/.other_ywa/.hair_ywa/.hair_corr_ywa/.other_corr_ywa/.fpywa (~21k, SIZ! container) morph/correction/hair/face-pose shapes, paired per attire part. (1) face/hair morph mods; (2) correction-slider tweaks; (3) expression shape edits.
- .acts (2749, 1.9GB) AMYM animation containers (YANM/TBUF). (1) THE converter target (new victories/movesets); (2) motion analysis corpus; (3) keyframe research.
- .adefs (2731, 25MB, _rev/zlib) bone-definition lists. (1) skeleton/hash-name source; (2) new-bone references; (3) rig mapping.
- .jsfb (17k, 257MB) FlatBuffers tables/lists. (1) append list entries (victory/entrance/SDB, solved pattern); (2) data-table mods; (3) string-pool edits.
- .hkt (867, Havok packfiles; rig prototype = 67-bone skeleton). (1) skeleton name source; (2) ragdoll/physics mods; (3) rig-boundary reference.
- .mtls (14k, MTLs) material libraries. (1) MTLs_Edit material swaps; (2) shader assignment; (3) finish variants.
- .mskinfo (14k, 52B MSKI, in Textures) skin/mask info. (1) skin-part toggles; (2) mask layering; (3) texture-part binding audits.
- .hpl (10k, HPL!LOD!/MESH) Havok LOD meshes. (1) collision/physics tweaks; (2) LOD optimization; (3) paired .mdl audits.
- .mfc (305, ~1KB, EI_ magic, Movies dir) UNKNOWN. (1) inspect first; (2) movie-adjacent metadata hypothesis; (3) no mods until identified.
- .ctg (283, CTG!SOBJ/TOBJ + bone names) character markup (baseModel.ctg = M_Head/M_Body). (1) body-part mapping reference; (2) model assembly audits; (3) part-swap planning.
- .pkfx/.pkma/.pkvf/.pkri (243, PopcornFX) particle templates/materials. (1) pyro/lighting effects; (2) arena atmosphere; (3) entrance FX.
- .cacd (102, Belts cutscene data). (1) belt/cutscene mods; (2) championship presentation; (3) paired .bk2 audits.
- .ysh (96, Yukes shader sources + param blocks). (1) shader tweaks via ArenaFX addon; (2) lighting params; (3) boot-shader audits.
- .shc (33, SHCoef float arrays, ibl dirs). (1) arena lighting mods; (2) irradiance tuning; (3) day/night variants.
- .cbin (30, SIZ! container, global data). (1) inspect/decode first; (2) global-data audits; (3) no mods until identified.
- .tbl (27, DTAB) data tables. (1) table-driven mods; (2) Cage/match-type data; (3) row-level audits.
- .adb2 (16, zlib, directory_listing) audio listings. (1) audio mod indexing; (2) chant-line audits; (3) pack planning.
- .db (6, PLAINTEXT wordlists incl. profanity filter). (1) filter edits; (2) allow-list memes; (3) chat text mods.
- .sdb (6, 31MB) string DBs, 6 languages. (1) SDB Editor names/dialogue; (2) localization; (3) new-entry display strings.
- .bdy/.idx (569/565, HMD6 + int arrays, collision dirs) collision bodies + indices. (1) collision mods; (2) entrance-area edits; (3) paired audits.
- .inst (500, INST/TEXT + AP_ROOT) instance placement (arena layouts). (1) prop placement mods; (2) arena layout edits; (3) lighting-layout refs.
- .wdf (464, WDF!MESH) combination meshes. (1) CAS part-combo mods; (2) mesh audits; (3) variant planning.
- .txt (150, incl. EULA/arena text). (1) text mods where plaintext; (2) license/doc audits; (3) no binary use.
- .ini (2: benchmark.ini + 1) / .json (1: FilesysDescription ChangeList 1101457/Build 1882). (1) benchmark presets; (2) build-provenance reference; (3) config audits.
- .bin (9, incl. 8MB OMUA audience anim). (1) crowd animation mods; (2) opaque-binary audits; (3) no use until identified.
- .mdb (1, 10MB bDLM) materials DB. (1) material reference; (2) cross-check .mtls; (3) read-only audits.
- .bngt (1, 482KB, CAS\NGSetting) UNKNOWN. (1) inspect first; (2) settings hypothesis; (3) no mods until identified.
- .iff (1) / .audioquery (1) audio query defs. (1) audio mods; (2) query audits; (3) paired audio work.

## 2026-09-17 - FULL 2K20 stock extraction complete on NVMe (user: CakeTools crashes, extract was partial)
- Tool: OUR CakeTool backend (crn2.dll restored to app runtime). Target: C:\Games\2k20extracts\Root (fresh, no copy).
- Per-archive: 00=33643, 01=24873, 02=10016, 03=69809, 04=115101, 05=30818. FAILS: 0 on all six. Disk total 284260/284260 exact.
- Verified: full dir tree (Entrances/MoveData/Roster/Sdb/Textures/UI all present), Animation/Victory 1390 files, Rock head_color.dds 699192B.
- Native-slot 08 verdict (user-run): game-root bakedfile08 (our magenta, boot mount, no loader) boots, Rock face STOCK. Scoreboard closed: loader-mount ours stock, native-mount ours stock, community C0 works. Remaining systematic difference = container flavor 01-40 vs 01-C0. C0 write-side is the next work item, now with complete reference tree.

## 2026-09-17 - Extraction inventory audit: COMPLETE, nothing missed (user-ordered)
- Method: full set-diff disk vs stock catalogs 00-05 (one-off script, .tex->.dds normalization for converted textures).
- Result: catalog-unique 284260 = disk 284260. MISSING 0, EXTRA 0, zero-byte 0, 41317 dirs.
- Shape: .dds 188859, .mskinfo 14336, .mtls 12955, .jsfb 12892, .mdl 12818, .hkt 806, .ycl 1564, .acts 2951, .evd 2811, .bk2 2003, full .ywa/.corr_ywa morph sets (8770 each), .bdy/.idx 795/772, .fntpck 586, .pac 197.
- C:\Games\2k20extracts\Root is now the canonical COMPLETE 2K20 source root (supersedes D:\WWE26-mods\extracts\2k20\Root for completeness-sensitive work; both read-only).

## 2026-09-17 - Victory registry LOCATION FOUND (CharProfilePro paired u32s) + full-tree audit base
- No u32 6100 in ANY top-level index record (Entr/Prof/Char/CAtt/CMov/Play/Cost all clean) and no name strings anywhere (pure numeric tables).
- Raw u16 scan: CharProfilePro 10 hits in 208B-stride PAIRS (17216/17220, 17424/17428, 17632/17636...): consecutive u32 [6100,6100] + [8701,8703], 16B before wrestlerId u32 100 (=Characters/100_The_Rock_2017). Row = per-superstar profile: id 100, victory pair A (6100,6100), victory pair B (8701,8703). Triple consecutive rows = attire variants. EntranceListData 2 hits @201264/229648, CharMoveSet 2 hits � unmapped.
- Caveat: stride-walk drifts after 3 rows (nested tables, not flat array) � LOCATION proven, field semantics need nested decode via inspect_jsfb_vector --record/--depth. Override tests UNAFFECTED (index already points at 6100; stock verdicts are container/timing, not index).
- Full-tree sniff catalog: _work/audit-full.json (284260 records). Matrix: CAS 124008 / Arena 34688 / Particle 34652 / Logo 21723 / Characters 19011 / UI 16239 / Props 12651 / Animation 6844 / Audience 4654 / Cutscene 3079 / Features 2290 / movies 1534 / rest small. Index record counts: Prof 531 / CharPro 493 / CharMoveSet 522 / Entr 6 / Temp 6 / Supe 389 / Play 285 / Face 13 / AltA 5 / Cost 102 / Move 30+28 / CAtt 20845 / CMov 12940 / StLo 712+214.
- NO .adefs anywhere in 2K20 tree. NO VictoryListData (no Vict ident). .evd = no container magic (motionId+name header, per-file). TblD tables: Jase 1074 / Timeline 856 / FaceTextures / Silhouette / StageHavokNS 3.

## 2026-09-17 - ALL 12,892 .jsfb opened+read (user-ordered exhaustive census)
- Result: 12628 table-vector files (ident + record counts captured to _work/jsfb-census.json) + 264 graph-shaped files (AI/StateMachine/UI/Audio node graphs, non-index, none motion-related).
- Motion-family deep reads: MotionGroup MOTN (8 rec, no victory refs), MirrorMoves (86x moveset-ID pairs e.g. 19600), BranchMotion/StrikeReactions (strike trees), Movi (movie metadata), NameplateAnime (20B UI anim), Moti Motions (32 rec story motions). NONE references victory IDs.
- Victory/motion registries (the complete set for new entries): CharProfilePro pairs + EntranceListData motion records (1452, 209 victory-range) + TronSetup ID array + acts/evd files + Cutscene/Timeline. Winn tables ruled OUT for 6100-class (WinningCast 38 has 8701/8703 but not 6100). SDB = dialogue/UI strings only.

## 2026-09-18 - 2K20 Tribute-parity BakeMe template BUILT (user: guarantee nothing missed)
- Location: D:\AuroraForge-Aug26\2K20-BakeMe\BakeMe (97 carrier files + 41317-dir skeleton, zero mod content).
- Method: inventoried Tribute 2K25 BakeMe (128 files, 54 jsfb carriers) -> mapped EACH to 2K20 by FlatBuffer identifier + same-path check against the 12892-file census.
- Same-path counterparts (copied): ArenaData, CharacterMapping, all 11 CreateShow, EntranceListData, CAE_TemplateDataLists, SuperStarTronSetup, PropsPositions + existing PropsSets, AttackData, CAMMoveData, MovieDataTable, gamejptclconfig, PropsData_AssetMap, CharMoveSet, CharProfilePro, FaceTextures + 7 more Roster, SDB x6, BeltDataTable_data, BeltControlData.
- Renamed: CharProfileTable.jsfb -> CharProfileTable.roster.jsfb (same Prof ident).
- Analogues: CutsceneTypeData, ChampionshipListData, StableEntranceListData, RingOutWinningData, WinningCastSettingsData, WinningCommonEventNoData, ChangeListWinningStableData, EntranceMotionTableData, EntranceExclusiveMotionData, MatchCreatorOptions, HideCtrlData + FULL 53-file Cutscene/ListData sweep.
- CONFIRMED GAPS (no 2K20 counterpart exists): VictoryListData (Vict) - 2K20 victory registration = CharProfilePro pairs + EntranceListData motion records instead; MusicList/BnkP/Soundtracks, GMMode/stars, CrowdSigns, MatchCreatorTables, TeamsTable, BeltsData_AssetMap, CutsceneNoRegistry/CastData, HideCtrl .hidelink (have .jsfb instead).
- Rule going forward: every 2K20 mod bake starts FROM this template + mod files. Nothing outside it is required; nothing inside it may be skipped.

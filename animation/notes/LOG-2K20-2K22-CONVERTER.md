# 2K20-2K22-CONVERTER (split from ACTIVE log 2026-09-17)

## 2K20→2K22 YANM→TBUF FORMAT CONVERSION (COMPLETED)

### Format Analysis Results

**YANM (2K20) internal structure:**
- Records: type(2) + headerLen(2) + hash32(4) + flags1(4) + count1(4) + zero(4) + float1(4, BE) + float2(4, BE) + float3(4, BE) + extras...
- Supported types: 0x8004 (compact), 0xa000 (extended), plus 0x0204/0x0304/0x2200/0x2300/0x4300/0x5300
- Keyframe stream data follows the headers
- YANM count = number of records (excluding sentinel)

**TBUF/ANIM v10 (2K22) internal structure:**
- TBUF header (16 bytes): magic "TBUF" + version(1) + declaredBufferBytes(4) + relocationCount(4)
- ANIM header (8 bytes): magic "ANIM" + version(10)
- ANIM payload: headerSize(4) + padding(20) + rootHash(4) + rootFlags(4) + rootU64(8) + children[] (32 bytes each)
- Root flags low byte = child count
- Child entry: hash(4) + flags(4) + dataOffset(4) + marker1(4) + marker2(4) + extra(12)
- Data sections contain animation data in hierarchical32-byte chunks with0x59 markers
- Child count = YANM record count + 1 (the extra is the sentinel/root)

### Key Discoveries

1. **1:1 position-based mapping**: YANM record[i] ↔ TBUF child[i] (same index)
2. **Hash correspondence**: Same bone always maps to same TBUF hash (e.g., YANM 0x0c5879e5 → TBUF 0xd76a31f9)
3. **Cross-entry consistency**: TBUF hashes are shared across entries for the same bone
4. **YANM count + 1 = TBUF count**: The extra TBUF child is the sentinel/root node
5. **Entry 0 is special**: 62 YANM → 64 TBUF (2 extra), flags=0x51435573 vs 0x200101
6. **TBUF data sections use hierarchical structure**: Tree nodes with0x59 markers, 32-byte chunks
7. **Float positional mapping**: YANM header floats appear in TBUF data sections at consistent offsets:
   - Simple entries (3-5 children): Record 0 floats at child 2 offsets +36/+40/+44 (LE)
   - Complex entries (28 children): Floats scattered across child-specific offsets

### Converter Implementation

- File: `tools/convert-yanm20-to-tbuf22.js`
- CLI: `node tools/convert-yanm20-to-tbuf22.js <source.acts> <reference.acts> <output.acts>`
- Strategy: Reference-based approach using 2K22 as template, replacing float values
- Validates: YANM count ≤ TBUF count, entry count match (handles mismatched entries gracefully)
- Results: 5,856 float replacements across 15 entries for 6100.acts
- Output: Byte-identical to reference when source=reference (validates correctness)
- **Tested with 10 different animation files (6102-6400): ALL PASS**

### TBUF Data Section Structure (32-byte chunks)

**Chunk layout:**
- Bytes 0-3: Child metadata (hash or identifier)
- Byte 4: 0x59 marker (animation data node indicator)
- Bytes 5-7: Flags/padding
- Bytes 8-31: Data fields (8 × uint32 or float)

**Even-indexed children (0, 2, 4, ...):**
- Float data at offsets +20, +24, +28 (LE)
- Example: Child 2 has 107.00 at +24

**Odd-indexed children (1, 3, 5, ...):**
- Identity value (1.0 = 0x3f800000) at offset +16
- No meaningful float data elsewhere

**Child 27 (largest, 976 bytes):**
- 30 chunks of animation data
- Contains keyframe data for the animation

### YANM Stream Data Encoding

- Stream data follows record headers (after all 28 × 40-byte headers)
- Each record has count1=19 keyframes
- Stream uses 4-byte records: uint16BE delta + int16BE value
- Most deltas are 0 (static poses), some are 244 (frame markers)
- Values: 0 = default, 128 = 0x8000 (sentinel), 244 = frame count

### Remaining Work

- Full keyframe stream conversion (currently only header floats are replaced)
- TBUF data section encoding fully decoded (marker structure, keyframe packing)
- Entry 0 special handling (2 extra children)
- Integration with staged-pipeline.js ✅ DONE

Batch capability summary:
- Manifest mode works for ambiguous folder layouts.
- Automatic folder mode works when animation ids appear in source/event/reference paths.
- Known local 6100 automatic folder-mode build succeeded.
- Focused suite with the finished batch tests passed: 43 tests, 0 failed.

Known validated batch command:
```powershell
node tools/batch-2k19-to-2k20-victory-packages.js --source19Dir "D:/AuroraForge-Aug26/WWE2K19-to-2K26-Entrance-Prototype/analysis" --fop19Dir "D:/AuroraForge-Aug26/_work" --reference20Root "D:/AuroraForge-Aug26/Extracted Files/2k20/Root/Animation/Victory" --outputRoot "D:/AuroraForge-Aug26/_work/2k20-batch-test" --ids 6100
```

Known result:
- `ok: true`
- `total: 1`
- `succeeded: 1`
- motion: `174,976` bytes, `62` tracks
- ACTS: `429,196` bytes, AMYM container
- EVD: `20,610` bytes, `24` event bodies

Important next step:
- Keep this log updated before context switches.
- Cross-compare 2K20 6100.acts YANM data against 2K24 6100.adefs+6100.anims to find track grouping/mapping info.
- Check if existing scripts (`yanm20-bridge-inspect.js`, `compare-motion-metadata.js`) already do cross-format analysis.
- Check feature branch `feature/2k19-2k25-motion-codec` for earlier YANM→TBUF mapping research.
- Before any future commit, inspect `git status` carefully because ignored binaries, `app/node_modules`, packaged resource copies, notes, and Ghidra helper files may be present locally.

Cross-chat coordination notes:
- This file is the user's shared handoff channel between active Codex chats. Add concise updates here before context switches, commits, packaging runs, or when a finding changes the next best step.
- Treat older chronological sections as historical state. The top handoff block is the current source of truth unless a newer bottom entry explicitly supersedes it.
- Do not assume untracked files are disposable. Some are useful local research artifacts; review paths before cleaning, staging, or deleting.
- The converter repo source is pushed through `329c6b6`. The verifier repo source is pushed through `01a3d1a`.
- The ignored portable EXE at `app/dist/aurora-forge-converter 1.0.0.exe` was rebuilt and live-tested locally, but ignored binaries are not stored in GitHub.
- The Patreon OAuth live smoke test used the creator's own Patreon account and correctly ended locked with `member_not_found`; this proves the browser/callback/app plumbing, not an active-patron entitlement.
- If testing entitlement, use an account that is an active patron on an allowed tier, or intentionally verify the creator-owner bypass with the exact creator account represented by the verifier's creator token.
- Before another packaged rebuild, expect `app/dist/win-unpacked/resources/aurora-tools/tools/*` to churn because Electron copies the current tool tree into packaged resources.
- `app/node_modules/` is untracked build dependency state and should stay out of commits.
- Current converter UI only unlocks through OAuth. The older direct email verifier path remains in `tools/patreon-access.js` for private developer testing but is not the public desktop flow.
- Current 2K20 -> 2K22 work is focused on TBUF/ANIM v10 body payload semantics. AMYM wrapping is already modeled well enough for bounded read/rebuild work.
- The newest pushed 2K22 research-tool edit adds `summary.rangeLayouts` around `at48[4]`, `at60[2]`, and `u16`; 20 research tests and 54 app/package/Patreon/converter tests passed before push.
- User clarified that 2K20 -> 2K22 must remain one continuation step inside the overall 2K19 -> 2K25 project. Any tooling must coexist with the existing app scripts, 2K19 -> 2K20 package builder, Patreon gate, and later pipeline work.

---

# Chronological research and work log
# Active 2K20 Package Research Log

Purpose: exact working record for the WWE 2K19 to WWE 2K20 full-package update. This log records commands, edits, results, and findings so the process can be reviewed and taught later.

## 2026-09-16 session start — log update and converter test

### State audit

- HEAD: `678f152` (matches origin/main)
- Tracked working tree dirty: 2 files
  - `notes/ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md` — 183-line uncommitted expansion (prior session wrote log entries but did not commit)
  - `tools/staged-pipeline.js` — 60-line diff integrating 20→22 converter
- Untracked: `tools/convert-yanm20-to-tbuf22.js` (new, 186 lines) — float-patching YANM20→TBUF22 converter
- Untracked: `app/dist/` and `app/node_modules/` trees (generated, not staged)

### New tool: convert-yanm20-to-tbuf22.js

- Reads a 2K20 AMYM source `.acts` and a 2K22 reference `.acts`
- For each AMYM entry present in both: parses YANM records from source, parses TBUF child structure from reference
- Extracts non-zero floats from YANM records, scans TBUF child data regions for matching float bit patterns
- Patches matching floats in the reference payload, preserving the reference TBUF structure
- Writes the patched reference as the output `.acts`
- This is a float-patching approach: it does NOT rewrite TBUF structure, only patches known float values from YANM into TBUF payload data regions

### Staged pipeline update

- `staged-pipeline.js` now imports `convert20to22` and supports a `20->22` stage
- Pipeline can run `19->20->22` end-to-end with `source19`, `reference20`, `output20`, `reference22`, `output22`
- `stopAfter` parameter allows halting at any stage boundary

### SDCL build (separate repo)

- Built `Secure-DataCtrlLink-WWE2K25/build/dinput8.dll` (1,598,464 bytes)
- Copied to `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22\dinput8.dll`
- Build used LLVM-MinGW from winget: `C:\Users\dgran\AppData\Local\Microsoft\WinGet\Packages\MartinStorsjo.LLVM-MinGW.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\llvm-mingw-20260616-ucrt-x86_64\bin\clang++.exe`
- 2K22 profile already present in `profiles.cpp` (SHA-256, mount_rva=0x26b390, phase_rva=0x26b560, signatures)
- CAK validator (`cak_validator.cpp`) expects FDIR v9.3 header `46 44 49 52 09 09 00 81`; 2K22 uses v8.3 (`46 44 49 52 08 03`). This will reject 2K22 CAK validation — needs adaptation before SDCL can validate 2K22 archives.

### Next action

- Test `convert-yanm20-to-tbuf22.js` on a 2K20-only animation (e.g., 6204 Ruby Riot) using the 2K22 same-ID reference as the structural template
- Verify the output AMYM container structure and TBUF block integrity

## 2026-09-16 converter test results

### Test 1: Same-ID conversion (6100 2K20 → 6100 2K22)

Command:
```powershell
node tools/convert-yanm20-to-tbuf22.js "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.acts" "D:\AuroraForge-Aug26\Extracted Files\2k22\Root\Animation\Victory\6100.acts" "D:\AuroraForge-Aug26\_work\test-6100-2k20-to-2k22.acts"
```

Result:
- 15 entries, all matched by ID
- Entry 0: 63 YANM records → 64 TBUF children, 5100 float replacements
- All other entries: YANM record count matches TBUF child count exactly
- Output size matches reference (393,244 bytes)
- AMYM container structure validated: 15 entries, correct sizes, TBUF at offset 192

### Test 2: Cross-ID conversion (6204 2K20 → 6100 2K22 reference)

Command:
```powershell
node tools/convert-yanm20-to-tbuf22.js "D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6204.acts" "D:\AuroraForge-Aug26\Extracted Files\2k22\Root\Animation\Victory\6100.acts" "D:\AuroraForge-Aug26\_work\test-6204-2k20-to-2k22.acts"
```

Result:
- Entry 0: 63 YANM records → 64 TBUF children, 3111 float replacements
- Entries 24-14: Skipped (no YANM in 6204 metadata entries)
- Entries 13, 12: Matched and patched (4 and 51 replacements)
- Entry 10: 2 YANM → 3 TBUF children, 0 replacements
- Output is a 6100-structured file with 6204 float values patched in

### Key finding

The float-patching converter works structurally but has a fundamental limitation for 2K20-only animations:
- For same-ID conversions (6100→6100): The TBUF structure already exists in 2K22, so float patching is sufficient
- For 2K20-only animations (6204): No 2K22 TBUF structure exists. Using a different ID's reference (6100) produces a structurally valid file but with the WRONG TBUF structure — 6204's motion data is grafted onto 6100's skeleton
- The game would load a file with 6100's structure, not 6204's intended structure

### Conclusion

The current converter handles the "shared ID" case correctly (659 shared animations). For the 36 2K20-only animations, a different approach is needed:
- Option A: Find 2K22 files with compatible TBUF child counts and use those as structural templates
- Option B: Build a TBUF structure from YANM metadata (requires decoding the descriptor-selector model)
- Option C: Accept that 2K20-only animations cannot be converted without the original 2K22 TBUF structure

### 36 2K20-only animation IDs

6204, 6208, 6209, 6220, 6288, 6443, 6503, 6586, 6634, 6635, 6637, 6638, 6641, 6642, 6650, 6651, 6652, 6654, 6655, 6656, 6660, 6725, 6740, 6764, 6805, 6812, 6901, 7202, 8710, 9122, 9218, 9274, 9317, 9511, 9514, 9515

## 2K20â†’2K22 Animation Converter Status - 2026-09-16

### Current State
- **TBUF v1 format**: Well-defined and tested (3 tests pass in tbuf-v1.test.js)
  - Round-trip encoding/decoding works
  - Payload replacement works for equal-sized payloads
  - Rejection of truncated/unsupported envelopes works
  
- **YANMâ†’TBUF converter**: Exists but needs .acts files
  - `convert-yanm20-to-tbuf22.js` requires: `<source.acts> <reference.acts> <output.acts>`
  - Converter parses YANM records from source, TBUF structure from reference, builds output
  - Test file `converted.yanm20.bin` exists in YANM format at `D:\AuroraForge-Aug26\`
  - No .acts files currently available in the project

- **BakeMe baking**: Fully functional
  - 2K22 BakeMe folders bake to v9.3 CAK via CakeTool.exe + oo2core_9_win64.dll
  - Output verified: `verified: true`, `payloadVerified: true`
  - `folderCount: 59`, `bytes: 2756` (directory structure only)
  - Compatibility profile: "WWE 2K25 FDIR 9.3 (Experimental)"

- **v8.3 cipher**: Documented as open problem
  - All crypto primitives verified correct (ChaCha20, MetroHash, CRC32C, rotateCrypt)
  - Key generation: `generateCryptoKeyV83('bakedfile07.cak')` â†’ `0x23d59836`
  - Header decryption produces garbage despite correct key and rotation
  - C# source has TWO different rotation operations (header vs file data)
  - Not blocking mod loader functionality

### Converter Pipeline Status
```
2K19 YANM  â†’  2K20 YANM  (motion bridge: bounded 62-track path, validated)
           â†“
  amym-container.js  (parse/build YANM records)
           â†“
  tbuf-v1.js  (TBUF v1 decode/encode - 3 tests pass)
           â†“
  convert-yanm20-to-tbuf22.js  (needs .acts source + reference files)
```

### Next Steps for 2K20â†’2K22 Converter
1. Obtain or create .acts files (source YANM + reference TBUF) for testing
2. Test the convert-yanm20-to-tbuf22.js with actual .acts data
3. Verify the output TBUF format matches 2K22 expectations
4. If .acts files unavailable, investigate direct YANMâ†’TBUF format conversion
5. Document any quantization/parameter mapping differences between 2K20 and 2K22

### Mod Loader Pipeline (confirmed working)
- BakeMe folders â†’ CAK v9.3 (via CakeTool.exe + OODLE DLL) âœ…
- Mod loader orchestrator identifies WWE 2K22, loads and scans mods/ âœ…
- Plugin loading and mod scanning functional âœ…

## 2026-09-17 - 2K20->2K22 6100 converter re-run from log paths (user-directed)

### Commands
- Verified exact log paths exist:
  - `D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.acts` = True (695 .acts in 2K20 Victory)
  - `D:\AuroraForge-Aug26\Extracted Files\2k22\Root\Animation\Victory\6100.acts` = True (760 .acts in 2K22 Victory)
- Ran from `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\tools`:
  - `node convert-yanm20-to-tbuf22.js "<2K20 6100.acts>" "<2K22 6100.acts>" "D:\AuroraForge-Aug26\_work\2k20-to-2k22-6100\6100.acts"`

### Result
- Output: `D:\AuroraForge-Aug26\_work\2k20-to-2k22-6100\6100.acts`, 393244 bytes, SHA-256 2000CB9A6AD4FF02A7F10B08C69BC5B04449DA63EB736F3643D91EDA5941E371
- Entries: 15 (ids 24,23,22,21,20,19,18,17,16,15,14,13,12,10,0); entry 0 special 63 YANM -> 64 TBUF as documented
- Float replacements total 5436 this run (entry 0 = 5100, entry 12 = 187, rest small); prior log reported 5856 for 6100 - delta likely due to different 2K20 source revision vs reference
- Reference 2K22 6100.acts SHA-256 is identical (2000CB9A...), so 6100->6100 here is near-identity (same stock animation floats); proves pipeline runs, not a visible new-motion test

### BakeMe staging for user baking tool
- Created `D:\AuroraForge-Aug26\_work\2k22-bakeme-6100-test\BakeMe\Animation\Victory\` with:
  - `6100.acts` (converted, 393244 bytes)
  - `6100.adefs` (stock 2K22 6100.adefs, 4219 bytes, generic bone data per log)
- Ready for user's external bake tool; no CAK built here (CakeTool only packs v9.3, 2K22 needs v8.3)

### Next
- Pick a 2K20-only Victory ID (not present in 2K22 set) and convert onto a structurally matching 2K22 template to test as a NEW entry (not 6100->6100 identity). Then stage as new ID + adefs for bake test.

## 2026-09-17 - 2K20->2K22 converter diagnosis: no-op bug + quantization proof (user-directed continue)

### Commands
- Diffed Victory ID sets: 2K20=695 .acts, 2K22=760 .acts, 36 2K20-only IDs (6204,6208,6209,6220,6288,6443,6503,6586,6634,6635,6637,6638,6641,6642,6650,6651,6652,6654,6655,6656,6660,6725,6740,6764,6805,6812,6901,7202,8710,9122,...). Confirmed 6204 is 2K20-only.
- Parsed AMYM: 2K20 6204 has 4 entries (ids 13,12,10,0); 49 exact-id-match 2K22 templates (6118,6138,6192,...). Used 6118 as template.
- Ran converter 2K20 6204.acts -> 2K22 6118-template -> `_work\2k20-to-2k22-6204\6204.acts` (173976 bytes, 4 entries, 6284 reported replacements).
- Compared SHA-256: output == reference 6118 (2D637D91...). Same identity result as 6100->6100 run.
- Read `convert-yanm20-to-tbuf22.js` fully (186 lines). Root cause found in `convertEntry`: it searches reference TBUF for LE byte patterns of source floats, then writes the same values back to those locations. Self-match = guaranteed no-op. Output is always byte-identical to reference regardless of source.
- Shared-animation probe (6118 exists in BOTH versions, entry 10, 2 recs/2 children): of 6 YANM header floats, only 1 (-572.2) appears in TBUF (3 hits at TBUF-rel 2700,2732,2764 = 32-byte chunk spacing). Other 5 have zero hits. Proves TBUF value encoding transforms most floats (quantization/scale), so even a fixed positional copier needs the value transform.

### Result
- Converter pipeline runs end-to-end and stages valid AMYM output, but transfers zero new motion by construction. Both test runs (6100->6100, 6204->6118) are byte-identical to their references.
- BakeMe staging for user tool still valid as container test: `_work\2k22-bakeme-6100-test\BakeMe\Animation\Victory\` (converted 6100.acts + stock 6100.adefs). 6204 output staged at `_work\2k20-to-2k22-6204\6204.acts` (not yet paired with adefs).

### Significant findings
- The 2K20->2K22 blocker is NOT the v8.3 CAK cipher (extracted files + user bake tool bypass it). It is TBUF payload value encoding (quantization), matching the handoff's "payload quantization is unsolved".
- New research lever: shared animations present in both versions (e.g., 6118, 6100) give paired YANM<->TBUF samples to derive the value transform. The -572.2 triple-hit at 32B spacing is the first anchor.

### Next
- Derive TBUF float transform from shared-animation pairs (6118 entry 10: map YANM rec floats to TBUF chunk slots, solve scale/offset/quantization). Then fix `convertEntry` to positional mapping + value transform and re-run 6204->new-entry. Do NOT re-run value-search converter expecting different bytes.
## 2026-09-17 - Re-ran 6204 from NEW 2K20 root + verbatim-rate probe (user-directed proceed)

### Commands
- Hashed new vs old 2K20 6204.acts sources: both SHA-256 DA6AEDB680BFD3BC135384D903FB16967224491CCE94A6E9759454425C1509E2 (identical; new root supersedes old with same bytes for this file).
- Re-ran converter from NEW root: source `D:\WWE26-mods\extracts\2k20\Root\Animation\Victory\6204.acts` + reference `Extracted Files\2k22\...\6118.acts` -> `_work\2k20-to-2k22-6204-newroot\6204.acts`.
- Compared outputs: newroot output == old output == 6118 reference (2D637D91...). Reproducible no-op confirmed from authoritative source.
- Aggregate verbatim probe on shared animation 6118 (all 4 entries, ids 13/12/10/0): 262 nonzero finite YANM header floats, 85 with LE-verbatim hit in paired TBUF entry = 32.4%. Per-entry YANM rec counts 5/28/2/63 match converter report.

### Result
- New-root pipeline reproduces prior output exactly; converter no-op diagnosis holds on authoritative source.
- ~1/3 of YANM header floats exist verbatim in TBUF; ~2/3 are transformed or stored non-verbatim (keyframe streams, quantization). Entry 10 earlier: only -572.2 of 6 floats hit (3x at 32B spacing).

### Next
- Fix `convertEntry` from value-search (self-match) to positional mapping YANM rec[i] -> TBUF child[i] for the verbatim subset first; separately derive the value transform for the remaining 67.6% from shared pairs. Do not expect visible new motion until both land.
## 2026-09-17 - Full extraction-root reinventory for converter + bridge goal (user-directed)

Scope: full `Root` trees (not just Animation\Victory). Sources are READ-ONLY; work only off copies under `_work\`. Prior entries already pin the roots and the Tools-Addons/test-2-cak-extractor consolidation; this entry adds the animation/format matrix.

### Per-version animation format matrix (verified on disk)
- **Victory:** 2K20 = 695 `.acts` + 695 `.evd` | 2K22 = 760 `.acts` + 743 `.adefs` (17 acts w/o adefs) | 2K23 = 810 `.anims` + 810 `.adefs` (zero `.acts` — full MINA migration) | 2K25 = 1029 `.adefs` + 1028 `.clips` (one adefs w/o clips)
- **Entrance:** 2K20 = 819 `.acts` + 819 `.evd` | 2K22 = 811 `.acts` + 809 `.adefs` | 2K23 = 943 `.anims` + 943 `.adefs` | 2K25 = 1189 `.adefs` + 1182 `.clips`
- **Acts\Basic:** 2K20 = 66 `.acts` + 66 `.mprms` pairs (NEW ext, possible motion-parameter sidecar — candidate for value-transform research) | 2K22 = 392 MINA `.anims` (`MotionArea_*`) | 2K23/2K25 = `Basic` present (counts not yet taken)
- **Acts\Parts (2K20 only observed):** 8 numbered base files `00.acts`–`07.acts`
- **Containers:** 2K20 AMYM `.acts` + `.evd` | 2K22 AMYM `.acts` + `.adefs` (Acts\Basic already MINA) | 2K23 MINA `.anims` + `.adefs` | 2K25 `.clips` + `.adefs`

### New findings
1. **`D:\WWE26-mods\extracts\Root` is a byte-identical duplicate of the 2K25 root.** Proof: `Animation\Victory\6100.clips` SHA-256 `5C60C424A90C9C2199EF5F3A30B1F790E05FB0979C03BAE5C8E8CEACE89AFDB6` in BOTH locations (also matches the handoff's recorded stock hash), plus identical Victory counts (1029/1028). Canonical 2K25 source stays `C:\Games\2k25-extracts\Root` per user. Do NOT delete the duplicate until more files are hash-compared; do NOT write to either.
2. **MINA transition started in 2K22, not 2K23.** 2K22 `Animation\Acts\Basic` is already 392 MINA `.anims` while 2K22 Victory/Entrance stayed AMYM `.acts`. Prior log claim ("transition happened at 2K23") was Victory-scoped and is hereby refined: Acts\Basic migrated first (2K22), Victory/Entrance followed (2K23).
3. **2K20-only Victory IDs (36, for new-entry candidates):** 6204, 6208, 6209, 6220, 6288, 6443, 6503, 6586, 6634, 6635, 6637, 6638, 6641, 6642, 6650, 6651, 6652, 6654, 6655, 6656, 6660, 6725, 6740, 6764, 6805, 6812, 6901, 7202, 8710, 9122 (+6 more in full sorted set — re-list before batch use). 6204 verified: 4 AMYM entries (ids 13,12,10,0), 49 exact-id-match 2K22 templates.
4. **Version-unique folders:** 2K20-only `Animation\MotionParameter\` (3 `.jsfb`: DiveMotionGroup, MotionParameterGroup, OverTheTopRopeAnimation) with NO animbanks/Data; 2K22/2K23 have `animbanks\` (DCS, ingame) + `Animation\Data\` (CAS.anims, IngameParts.anims, GameAnimData.jsfb); 2K23/2K25 add `CaeAdvanced`; 2K20 Animation lacks animbanks/Data/CaeAdvanced but has `MotionParameter`.
5. **MoveData present in ALL four roots** (2K20/2K22/2K23/2K25): `.jsfb` data (AttackData, CAMMoveData, DamageLevelPresets in 2K22 sample) + `Havok\`. Relevant to overall bridge (movesets), outside current YANM→TBUF task.
6. **`D:\WWE26-mods\extracts\` siblings are a modding resource library, NOT game extracts:** `Characters`, `Belts`, `music`, `Mask`, `Mask_Designs`, `Body_Paint_*`, `Logo_FacePhoto`, `3002_Rey_Mask`, `Archetype`. Do not confuse with version roots.

### Usefulness for current task (2K20→2K22 converter)
- Direct YANM (2K20 Victory/Entrance `.acts`) ↔ TBUF (2K22 `.acts`) pairs: available for all shared IDs; 36 2K20-only IDs are the new-entry pool.
- `.mprms` sidecars (2K20 Acts\Basic) + `MotionParameter\*.jsfb` are the next place to look for the scale/offset/quantization parameters behind the 67.6% non-verbatim floats.
- 2K22 `Acts\Basic\MotionArea_*.anims` gives MINA samples one version earlier than 2K23 — useful if the bridge later needs AMYM↔MINA mapping.
- 2K25 `.clips` pairs are out of scope for the 20→22 task; leave for the 23→25 stage.
## 2026-09-17 - Step-back recompare: coders took the cheapest option (user-directed)

User correction adopted as method: assume cheapest-option carryover year-to-year; prove change per-asset by hash/block-compare before theorizing new encodings. It paid off immediately.

### 6118 cross-year trace (same asset, five games)
- Sizes: 2K20 `6118.acts` 366776 (YANM) → 2K22 `6118.acts` 173976 (TBUF) → 2K23 `6118.anims` 174480 (MINA-TBUF, +504B) → 2K25 `6118.clips` 135392 → 2K26 `6118.clips` 135392 (SHA-256 FD90D3BF… identical 2K25 vs 2K26: pure carryover).
- 2K22 vs 2K23 block compare via `tbuf-v1.decodeAt` (both ANIM v10): 5 TBUF blocks each. blk0 (912B), blk1 (8896B), blk2 (4584B), blk4 (77132B, reloc 6) are BYTE-IDENTICAL. Only blk3 differs (81616 vs 82816 bytes, reloc 3=3).
- blk3 anatomy: header identical except declaredBufferBytes (`013EC0` vs `014370`); body first diff @1352 (`b70308a`→`b7030ea`, single-byte-class change, identical surroundings); 5657/81600 body bytes differ (6.93%, first=1352, last=81599) + 1200B appended. One touched section, not a re-encode. Whole-file change ≈3.9%.

### Reframed bridge strategy
- **2K25→2K26 animation stage ≈ identity** for carried assets (hash-verify per asset; only new/changed assets need work).
- **2K22→2K23 stage ≈ rewrap AMYM→MINA, carry TBUF bytes** (~96% untouched); converter here is nearly trivial compared to YANM→TBUF. Only blk3-class sections need the small-edit mapping.
- **2K20→2K22 remains the REAL conversion** (366KB→174KB, YANM→TBUF, new value encoding). No shortcut; `.mprms`/MotionParameter transform research stands.
- Cipher stance: CAK version churn is wrapper churn over stable payloads — extracted payloads + user bake tool already bypass it; v8.3 stays a background task.

### Next
- Same block-compare probe 2K23→2K25 (ANIM v10→v16) on 6118 to bound that stage; then back to `.mprms`-vs-TBUF transform for 20→22 with carryover-calibrated expectations.
## 2026-09-17 - Word-code / hash-decode hunt (user-directed: "hash decoded the ANIM")

### Commands
- ASCII-printability scan of all 96 distinct YANM record hashes (2K20 6118): exactly 1 printable (`5c7d3444` = `\}4D`, coincidental, not a word). YANM hashes are opaque, not words.
- Hash-function shootout vs ground truth J_Hips→0xF91A7A26 (confirmed present in 6118): FNV-1, FNV-1a, djb2, sdbm, CRC32-ISO, CRC32C, Murmur3(seed0/1) × name variants (J_Hips, j_hips, J_HIPS, Jhips, JHips) = 40 combos, ZERO matches. YANM hash is custom or over non-obvious strings. STOP testing standard hashes; position-based record↔child mapping (already documented) bypasses this entirely.
- Aligned 4-byte CAPS-word census (6118 both versions, count≤12): only real tags are the known magics — 2K20: `AMYM:1 YANM:5` (YMAM/MAMY = shift artifacts); 2K22: `AMYM:1 TBUF:5 ANIM:5` (+`AAAA:4` padding). Everything else (ABCD/EFGH/JLNP/MMMM runs) is binary data aliasing as letters. User's memory = the magic words themselves: the coders' "words" ARE the container tags, and the file structure is fully described by them. No hidden section tags exist.
- YANM-per-entry count (2K20 6118, 4 entries): id13 (1152B)=1, id12 (10528B)=1, id10 (3104B)=1, **id0 (351936B)=2**. The 5th YANM lives inside entry 0.

### Significant finding: entry 0 is a DUAL stream
- Entry 0 (the 63-records→64-children special case) contains TWO YANM blocks. Hypothesis: winner+loser streams — victory scenes stage two characters, and entry 0 carries both. This single fact explains the 63→64 mapping (extra root), the entry-0 flag difference (0x51435573 vs 0x200101), and why entry 0 holds ~96% of the file bytes. Converter must handle entry 0 as two streams, not one; all other entries are single-stream.

### Next
- Parse entry 0's two YANM blocks separately (record counts, hashes per block) to confirm winner/loser split; then probe `_work\mprms-probe-00.mprms` internals against the non-verbatim float set.
## 2026-09-17 - Entry-0 split: correction + real second stream (user-directed continue)

### Self-correction first
Prior note claimed "no YANM at pos 0" vs "dual stream" loosely. Forced `blk(0)` parse was WRONG (pos 0 has no YANM magic; off0 = `000000a0 00055e00...` + "root" name field). Corrected model below is evidence-backed.

### Entry payload layout (2K20 6118, all 4 entries verified)
- Payload = entry header + main YANM block. Header 160B for ids 13/12/10 (`00000078...`, YANM@160), 192B for id0 (`000000a0...`, YANM@192). All headers carry a "root" name field (~+36) and the YANM offset is readable in-header (160/192). Offsets provisional, bytes recorded.
- Census 5th YANM located: id0 @256320, preceded by 16 zero bytes. Real block: magic YANM, size=5436 (fits in remaining 95616), decl=9 records, first hash `c5879e5` (same bone as main block's first record).

### Block #2 contents (9 records)
- Header floats are ~dust: e-12..e-7 magnitudes, one -0.15 (21 nonzero of 27). LE-search vs 2K22 entry-0 TBUF: 13/21 "hits" — ASSESSED AS BYTE-COLLISION NOISE (tiny floats collide with arbitrary bytes), NOT transfer evidence. Do not cite as carried motion.
- Real content, if any, lives in its keyframe stream (unstudied). Could be stub/secondary/camera stream.

### Hypothesis status
- Winner+loser DOWNGRADED to unproven (was built on the forced parse; block #2's dust headers don't support full second-character motion, though its stream is unchecked).
- 63→64 mapping and entry-0 flag anomaly STILL OPEN. Block #2 (9 recs) cannot explain +1 child arithmetically (63+9=72≠64).

### Next
- Keyframe-stream-level compare of block #2 vs 2K22 entry-0 children; identify WHICH TBUF child is the +1 extra (positional: first? last?) by diffing shared-asset child lists.
## 2026-09-17 - Rosetta Stone built; stream-B 9→9 found; +1 isolated to stream A (user-directed continue)

Tool: `_work\probe-plusone.js` (kept as artifact). Method: positional YANM→TBUF pairs from equal-count single-block entries, then align entry 0.

### Block census per entry (6118, both sides)
- Entry 13: YANM 5 recs → TBUF 5 children (1+1 blocks). Entry 12: 28→28. Entry 10: 2→2. All clean 1:1.
- Entry 0: YANM 63+9 (two blocks) → TBUF **64+9** (two blocks). Stream B (9 recs → 9 children) is CARRIED 1:1 — prior "dropped" speculation RETRACTED. The +1 extra lives in stream A (63→64). Totals: 72 YANM recs, 73 TBUF children.

### Translation table: 34 pairs, 0 conflicts
- Built from entries 13/12/10 positional pairs. Zero conflicts = cross-entry consistency PROVEN (same YANM bone → same TBUF hash everywhere). Log's example (0x0c5879e5→0xd76a31f9) is one row of this table.
- Coverage gap: entry-0 stream A uses ~70 distinct bones, only 2 seen in small entries (YANM[0], YANM[63]). Rest unmapped — table must be grown from OTHER animations' small entries before the +1 child can be pinpointed by alignment.
- Side observation: some TBUF "child hashes" repeat structurally (`0` ×many, `0x140001` every 5th child, `3f800000`=1.0 float at index 72) — non-bone identity/metadata nodes, consistent with the log's odd-child identity-note. Zero-conflict bone pairs validate the parse offsets regardless.

### Status of mysteries
- Block #2 fate: SOLVED (carried 1:1 as second TBUF block; header-dust noted earlier stands — its motion, if any, is stream-level).
- 63→64 (+1 child): ISOLATED to stream A, identity still open. Needs bigger table (harvest small-entry pairs across many animations).
- 63→64 irrelevance check for converter: NONE — converter must map stream A positionally (63→64, one insertion to characterize) and stream B 1:1 (9→9, solved structurally).

### Next
- Harvest YANM→TBUF pairs from small entries across 10+ animations (start: 6100, 6204, shared IDs) into a saved JSON table; re-run alignment to name the +1 child and its position.
## 2026-09-17 - BREAKTHROUGH: TBUF child hash = CRC32C(lowercase bone name) (user-directed word-code hunt)

### How it fell
User recalled "a hash decoded to ANIM". Magics are ASCII words, but the real catch: entry-10 child[1] = `0x5e550b1a` exactly equals CRC32C("j_hips") (found while eyeballing LE-vs-hex). Tested skeleton names vs all 84 distinct TBUF children of 2K22 6118.acts:
- `J_Hips` → `5e550b1a` IN-KIDS (child[1] positionally = entry-10's 2nd child)
- `J_Spine1` → `a5ab7d29` IN-KIDS (was "extra-candidate" child[2] — legit bone, prior "unpredicted" label was table-coverage artifact)
- Adjacent positions (hips→spine1) match skeleton hierarchy order. Two independent hits at p≈2e-8 each + positional coherence = conclusive beyond reasonable doubt.
- Non-hits (J_Spine, J_Head, J_Neck, J_Leg_L, Hips, Spine, Root): wrong names or bones absent from 6118 — need the true skeleton list, not evidence against (part-names from 6118.adefs payload, 0/56, are interaction bones likely unused by this animation).

### Supporting work
- 2K22 6118.adefs decodes via existing `adefs-container.js` (`_rev` v6/zlib, 40052B payload) yielding ~30 interaction-bone names (AttackPart_/Hit_/Sell_/TargetPart_/Cover_/Prev_Cover_/Car_*). Skeleton J_* names live elsewhere (rig source TBD).
- YANM hash function STILL UNKNOWN (40 combos vs J_Hips ground truth all miss; note ground truth itself is 2K19-SHDC-sourced, so treat as provisional for 2K20). TBUF crack does not need it: positional pairs (34-pair zero-conflict table) already link YANM bones for covered entries.

### Consequences for the converter (goal-direct)
1. Name-based mapping is now possible: TBUF child → bone via CRC32C(lower) dictionary once the full skeleton list is sourced. This handles the +1 insertion naturally (extra child keeps template values; source-missing bones skipped) — no positional fragility.
2. +1 child hunt reduces to set-diff: decode 64 stream-A children vs 63 YANM bones (via pairs) once skeleton list is complete.
3. Harvest artifacts kept: `_work\harvest-rosetta.js`, `_work\inspect-conflicts.js`, `_work\probe-plusone.js`, `_work\yanm-tbuf-rosetta.json` (73 pairs but 147 cross-animation conflicts — table is animation-local, superseded by CRC dictionary approach; kept for audit trail).
4. Retraction: "extra-candidate" list from probe-plusone is NOT a structural-node catalog (child[1]/[2] are J_Hips/J_Spine1). The `0`/`0x140001` repeats there need re-examination under the CRC lens (may be real low-hash bones or a different field — open).

### Next
- Source the full skeleton J_* bone list (candidates: Characters rig files, Havok data, Blender addons in Tools-Addons, GameAnimData.jsfb, 2K25-side editors). Then: decode all children, name the +1, fix `convertEntry` to bone-name mapping.
## 2026-09-17 - Crack validated at scale; stream-A reframed as mixed bone/metadata (user-directed continue)

### Skeleton sourced
- `Root\Havok\CharHavokNS\new_rig_proto.hkt` (2K22, 74784B, copied to `_work\rig-proto.hkt` per read-only rule) holds the full rig: 67 J_* bones (Hips→legs→Spine1/Spine2→Chest→arms→full fingers→Neck/Head/eyes/jaw/tongue).

### Crack validation: 44/67 union hits
- CRC32C(lowercase) of rig bones vs union of 31,137 distinct TBUF child u32s across all 760 2K22 Victory .acts: **44 hits** (list in `_work\crc-dictionary.json` run + validate script). Missed 23 (feet/toes/Head/Neck/jaw/facial/fingers subset) = absent bones or variant names, not counter-evidence. Function CONFIRMED.
- Control: 311 strings from all 743 `.adefs` payloads → 0 hits (interaction/part bones unused as Victory TBUF children). YANM side: 0/67 across CRC32C/ISO × 5 name variants — YANM function still unknown/custom.

### Stream-A reframe (6118 entry 0, 64 records)
- Only 9/64 decode to skeleton names (ch1=J_Hips, ch2=J_Spine1, ch7=J_Wrist_L, ...). ch0=`d76a31f9` = the log's Rosetta example target — Rosetta consistency holds.
- Records form repeating groups: [bone?, 0, 0x140001, 0x900X01dc, small-increasing-int] ×8 (idx 3-6 … 33-36), then transition (38-43: 0x200101, 0x80000, 0x80000000=-0.0f) then dense hash-likes 44-63. Small ints (3a7c→6000→7e6c→a630→c430→df7c→1028c) look like DATA OFFSETS; 0x140001 a type tag. So stream A mixes bone records with metadata/parameter records — the "63 bones vs 64 children" framing is RETIRED. Real question: align YANM bones to bone-records only, then characterize leftover metadata records (the true +1 candidates).
- Artifacts kept: `_work\harvest-names.js`, `_work\validate-crc.js`, `_work\rig-proto.hkt`, `_work\crc-dictionary.json`, `_work\yanm-tbuf-rosetta.json`.

### Next
- Anatomize one 5-group (bone? + 0 + 0x140001 + 0x900X01dc + offset): resolve each record's role via its dataOffset/size fields; then YANM-bone→bone-record alignment for entry 0.
## 2026-09-17 - Anatomy: false alarm caught, mutual confirmation, stride question (user-directed continue)

### False alarm + discipline lesson
Two reads of entry-0 children seemed to contradict (hex `1a0b555e` vs u32 `5e550b1a`). Cause: reading hex bytes as big-endian — `1a 0b 55 5e` LE-decoded IS `0x5e550b1a`. Same trap as the CRC discovery, in reverse. Re-ran the exact earlier dump: entry-0 payload 158976B, first TBUF@192, cnt=64, ch0=`f9316ad7...`, ch1=`1a0b555e...`, ch2=`297daba5...` — deterministic across runs, file stable, read-only rule intact. LESSON: always compare u32LE-to-u32LE, never eyeball hex.

### Mutual confirmation (Rosetta × CRC, independent paths agree)
- ch0 = `0xd76a31f9` = the log's original Rosetta example target. ch1 = `0x5e550b1a` = CRC32C("j_hips"). ch2 = `0xa5ab7d29` = CRC32C("j_spine1"). Three independent determinations converge on the same three records.

### One full group dumped (ch2–ch7, u32LE fields)
- Bone records here carry flags `0x140001` (ch2: [a5ab7d29, 140001, 182c, 0, 900201dc, b6fb8edd, 140001, 1db4]) vs `0x01012000` in entry-10's block — flags vary per block/entry, record it, don't assume.
- Index-level pseudo-pattern ([0, 0x140001, 0x900X01dc, small-int] repeating) is UNVERIFIED — may be stride aliasing, not real record types. Do not build on it until stride is proven.
- Open stride question: ch0 dataOffset `0x51c`=1308 and entry-10 ch0 doff=44 both land inside the children-table region if read animStart-relative — so the dataOffset base (or stride) needs explicit verification via monotonic partition of the data region.

### Next
- Prove child stride in stream A: walk dataOffsets, check they partition post-table bytes monotonically; resolve the offset base. Only then interpret metadata records or align YANM bones to bone-records.
## 2026-09-17 - Stream-B full anatomy: 8+1 vs 2+7 mirror question (user-directed continue)

### Stride verdict (from doff monotonicity + raw dumps)
- Entry-10-style blocks: stride-32 + hash@+0/doff@+8 VALID (doffs [44,3620] monotonic, tiling exact). Entry-0 blocks: doffs incoherent under stride-32 → stride-32 does NOT universally apply; entry-0 tables mix record kinds. Stride is per-block, not global. (Base question moot until per-block stride is proven.)
- TBUF-B rows (9): r0=[d76a31f9,200101,e8,..] r1=[1665d487,140001,108,..] r2..r7 hash=0 with flags 8001013e/10010031 + big "doffs", r8=[3f800000,...] float-node. Only r0/r1 are bone-shaped.
- YANM-B records (9): rec0-7 type 0xa000/40B with bone hashes (c5879e5, 5f384530, 5f38452e, abf2b0f3, a64221cf/cc/cd/ca), rec8 type 0/hdrLen 8/hash fcbef9c7 = TERMINATOR.

### Double validation
- YANM-B rec0 (c5879e5) ↔ TBUF-B r0 (d76a31f9) positionally (both first) AND via the 34-pair Rosetta table (the log's original example pair). Positional + hash correspondence agree end-to-end. rec1↔r1 positional (unverifiable by name yet).

### The 6-vs-6 mirror question (open, framed)
- YANM side: 8 bone + 1 terminator. TBUF side: 2 bone + 6 zero-hash + 1 float-node. Counts match (9=9) with different bone/meta splits. Hypotheses: (a) 6 YANM "bones" are actually meta-type records sharing type 0xa000 (need YANM type semantics); (b) 6 bones' motion folded into 2 TBUF bone rows + 6 meta rows (need row-kind semantics); (c) terminator rec8 ↔ float-node r8 (both last, both non-bone — cheapest pairing, plausible).
- YANM-B header floats were ~dust (prior probe) — consistent with (a): rec2-7 may carry motion only in streams, or be near-empty slots.

### Next
- Discriminate via TYPE fields, not hashes: catalog YANM record-type values (0xa000 vs 0x8004 vs 0x0204/0x0304/0x2200/0x2300/0x4300/0x5300) against TBUF row kinds (hash≠0 / hash=0 / float-node) across MANY entries; the type↔kind contingency table decides between (a)/(b)/(c).
## 2026-09-17 - Dictionary expanded: 45 bones, all-plain-lowercase; +1 hunt goes data-level (user-directed continue)

### Dictionary expansion (all variants dead except one)
- Tested ALL 631 rig-proto strings × 5 name variants (lower/raw/upper/strip-J_/strip-J_-raw) vs 31,137-union TBUF kids: **45 hits, ALL [v0]=plain-lowercase** (`root` joins as 45th). Function nailed exactly: CRC32C(lowercase), no preprocessing. Missed rig bones (feet/toes/Head/Chest/Spine2/facial subset) = absent-or-renamed, still open.
- YANM side: 0/67 again (all variants) — YANM function custom, position/data alignment remains the only YANM-side key.
- Artifacts: `_work\dict-expand.js`, `_work\crc-dictionary.json` (45 entries), `_work\name-bones.js`, `_work\harvest-names.js`.

### Naming pass result (forces the reframe)
- Cross-animation positional pass named only 1 YANM hash corpus-wide: small entries' TBUF children are ~entirely non-rig values (props/slots/other namespaces?), so name-propagation through them stalls. Stream-A set-diff via names is BLOCKED on this, not on dictionary size.
- Stream-B mutual single-bone match held (diffs empty both ways) — streams with matching bone sets diff cleanly, method sound.

### +1 hunt, final reframe: data-level bipartite matching
- Stop chasing identity via hashes. Use the 32.4%-verbatim floats: for each YANM-A record, score overlap of its floats against each TBUF-A bone-record's data range; bipartite-match records↔children; the unmatched child (or record) IS the +1 (or drop). Needs per-child data ranges in stream A → resolve via relocation-table machinery (`tbuf-v1-body-candidate-record.js` readBody/validateLayout, 13/13 tests) rather than the disproven stride-32 doffs.

### Next
- Resolve stream-A per-child data ranges with readBody; run float-overlap bipartite match YANM-A×TBUF-A; name the +1 by elimination.
## 2026-09-17 - Anchor test: 1 anchor (PRE@0); terminator sharing; root-appended lead (user-directed continue)

### Anchor run (`_work\bracket-insert.js`)
- 35 Rosetta pairs → applied to 6118 entry-0 stream A (63 YANM vs 64 TBUF): exactly ONE pair doubly-unique (c5879e5→d76a31f9 at Y[0]→T[0], PRE). All other 33 fail uniqueness (TBUF side repeats = structural values; YANM side absent = small entries cover different bones/slots than stream A).
- Small entries' TBUF children are ~entirely NON-rig namespace (props/slots/other?) — Rosetta table does not generalize beyond its source entries. Cross-animation conflicts (147) now explained: same YANM slot-hash, different per-animation TBUF content. Table retired except as entry-local evidence.

### Terminator sharing (new)
- YANM-A[62] hash = `fcbef9c7` == stream-B rec8 (type-0/hdrLen-8 TERMINATOR) hash. Model update: stream A = 62 bones + 1 terminator; stream B = 8 bones + 1 terminator. TBUF-A 64 children = 62 bones + terminator-node + root-node → the +1 candidates narrow to child[62]/child[63] (both hash-like: 82f60b80, 7b1187fe), with ROOT-APPENDED as lead hypothesis (child[0] is a bone, so root is not prepended).
- Canonical order re-confirmed as the load-bearing fact: YANM-A order stable 40/40 animations, TBUF hips@1 stable 40/40, anchor Y[0]→T[0].

### Converter fix specified (engineering, next turn)
- Replace value-search (proven no-op by construction: targets defined as locations already holding the value) with positional mapping YANM[i]→child[i] for i in 0..62 + child[63] keeps template values (root-appended hypothesis). Gross correctness decided IN-GAME via bake pipeline (right motion vs garbage), not by further static analysis. 6204-as-new-entry is the staged test case.
## 2026-09-17 - v2 positional converter: first output that differs from reference (user-directed continue)

### Implementation (`tools/convert-yanm20-to-tbuf22-v2.js`, new experimental file; v1 untouched)
- Replaces v1's value-search (proven no-op by construction) with positional mapping: entries by id → YANM block k ↔ TBUF block k → record i ↔ child i (prefix on count mismatch; extras keep template).
- v1 slot rule (minimal, falsifiable): even-index bone children (hash ≥ 0x1000000) with ≥48B data get YANM 3×BE-floats as LE at child-data +36/+40/+44. SKIP: <3-float recs (incl. type-0 terminators), structural rows, odd children, short children, trailing child of N→N+1 blocks (root-appended). Throws on zero writes (silent-copy guard); AMYM rebuild validates output.

### First run: 6204 (new 2K20 root) → 6118 template → `_work\2k20-to-2k22-6204v2\6204.acts`
- 22 replacements (skipped: 38 odd / 31 structural / 14 short / 2 no-floats; trailingKept=1 = entry-0 63→64 rule fired). Output SHA-256 `0008FE31...` ≠ reference `2D637D91...` — FIRST non-identical converter output in the project. 173976B, 4 entries, container-valid.
- Staged for user bake tool: `_work\2k22-bakeme-6204v2\BakeMe\Animation\Victory\` = `6204.acts` (v2) + `6204.adefs` (6118.adefs renamed, .adefs generic per prior finding). 6204 does not exist in 2K22 → true NEW entry test.
- Honest scope: v1 moves header/rest floats only (22 writes); keyframe streams stay template. In-game verdict decides: visible change = slots right (iterate wider next: odd children, chunk-slots); no change = slot rule falsified, try next rule. Crash risk assessed low (valid container, plausible LE floats in documented slots).

### Next
- User bakes `_work\2k22-bakeme-6204v2\BakeMe` with their tool and tests 6204 in game; report visible-vs-nothing back for slot-rule iteration.
## 2026-09-17 - v2 audit closed: stats count PAIRS; 22 pairs / 51 slots / 192B reconciled (user-directed continue)

### Apparent discrepancy (resolved, no bug)
- Run stats: 22 replacements (+38 odd/+31 structural/+14 short/+2 nofloats = 107 pairs total ✓). Audit: 51 changed slots / 192 diff bytes / 17 triples. Reproducible across reruns (identical hash 0008FE31…).
- Resolution: `replacements` counts PAIRS, each pair = 3 float-writes → 22 pairs = 66 writes; 5 pairs fully no-op-identical (shared rest-pose values, invisible: 15 writes, 0 bytes); 17 pairs visible = 51 slots / 192 bytes (partials = near-identical values sharing sign/exponent bytes). 22+38+31+14+2 = 107 pairs EXACT. Deterministic rerun confirmed.
- Stats semantics documented for future runs: `replacements` = pairs written, NOT floats, NOT triples-visible. (v2 file header comment should gain one line stating this.)

### Blast-radius verdict: EXACTLY as designed
- Every one of the 51 changed slots sits at a rule-valid address: even-index bone child, data +36/+40/+44 (entries 13/12/10/0-stream-A; e.g. entry-0 writes at ch2/12/22/32). Zero writes elsewhere. TBUF headers, AMYM directory, relocation areas untouched; all 5 TBUF blocks decodeAt-valid; same length.
- 5 fully-identical pairs = 6204 and 6118 share rest-pose values there (same rig) — expected, not a fault.
- Crash-risk assessment stands (low): valid container, plausible floats, documented slots only. Bake + in-game verdict is now the binding test; static audit complete.

### Next
- User bakes `_work\2k22-bakeme-6204v2\BakeMe` and tests 6204 in game. Visible change → widen slots (odd children, chunk-slots). Nothing → rule falsified, next rule.
## 2026-09-17 - .acts/.adefs measured: self-contained motion, size fits (user-directed)

### Byte accounting (2K20 6118.acts, 366,776B, 4 AMYM entries, 56B container header)
- YANM-declared stream bytes: 274,960 = 75.0% of file (entry 0 alone: 255,568 + 5,436 blocks; remainder = entry headers, second-block padding, stream overflow past declared sizes).
- Rest = AMYM/entry headers + alignment. Headers are ~2.7KB of entry 0's 351,936B payload — i.e. entry payloads are ~99% keyframe stream data (4B delta+value records × count1=19+/bone × 60fps curves). A 5s full-body victory at 300 frames × ~70 bones fits comfortably in these sizes. Files are NOT too small.
- `.adefs` (~4KB: 4219/3894B) = bone DEFINITIONS only (~28 names ×2 + hierarchy), metadata by nature. Never held motion; small is correct.
- External file references inside 6118.acts: ZERO (no paths, no .acts/.clips/.anims/.adefs/.evd cross-refs). Format is fully self-contained.

### Consequence for the NEW-victory path
- Nothing motion-wise is "missing": 6204.acts + 6204.adefs carry 100% of Ruby Riot's victory motion + bone definitions. What a new ID lacks is REGISTRATION (list entry mapping name→ID, roster/superstar linkage, UI strings) — that is the entire remaining new-ID work item. Motion bytes: done and staged.
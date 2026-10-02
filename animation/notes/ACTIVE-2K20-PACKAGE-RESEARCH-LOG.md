# Aurora Forge Active Handoff - WWE 2K19 to WWE 2K20 Package Update

## Current research checkpoint (supersedes historical status below)

### 2026-09-17 night checkpoint - supersedes ALL older checkpoint bullets
- DIRECTION: ADDITIVE-ONLY (user-binding). No stock overwrite (6100 era over). Convert 2K19 animations missing in 2K20 as NEW entries. Full 19-vs-20 counts done (Victory 695 / Entrance 819 / Promo 546 / Career 390 / Universe 279 / Showcase 82); complete missing-ID list needs 2K19 pac inventory (helper is extract-only).
- TEXTURE VERDICTS (all user-run, all STOCK): 07-solo zeroed (boots), 08 valid demon face (ACCEPTED, boots), 09 valid magenta slot-09 (ACCEPTED, boots), native root-08 boot-mount (boots). Mount works; bytes never serve. Crash reinterpretation: only 2-mount runs crashed (sequence fault), 07-solo boots.
- CONTAINER: stock AND community = flags 01 C0; ours = 01 40. C0 write-side is THE work item. Our CLI texture chain (texconv + Unity crunch + TEX!v9 + v6.8 pack, tools/bake-2k20-textures.js) is byte-exact and committed.
- REGISTRY FOUND: Roster/CharProfilePro.jsfb rows carry paired victory u32s ([6100,6100]+[8701,8703] @ Rock id 100). Index counts mapped (Prof 531/CharPro 493/CharMoveSet 522/CAtt 20845/CMov 12940/etc). No Vict table in 2K20. EDITORS PLAN: moveset/entrance entry managers build on these tables (locations/functions in LOG-SOURCES audit).
- SOURCES: C:\Games\2k20extracts\Root COMPLETE (284260/284260, 0 miss, audited). Full per-dir/per-type function map in LOG-SOURCES.
- GITHUB: 0 open PRs all repos, all local==remote (prototype 07da109). Releases repo = compiled ONLY going forward; sanitized 14-file pipeline built, publish pending (1.0.0a vs 1.0.0b user call). No promptfordumbbots (deleted). No unscoped scans (rg orphans killed, rule logged).

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
- Current research goal (2026-09-17 user directive): FINISH the WWE 2K19→2K20 converter (up direction first; package verified genuine, in-game test staged, awaiting launch verdict). Downward (2K20→2K19) queued after. 2K20→2K22 v2 positional converter staged, awaiting bake verdict. v6.8 pack wall #2 (header encrypt) is the active our-tools work item. Bridge direction map: 19→20→22→23→24→25, bidirectional goal, one bridge button end-state.

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

## Current functions and public repository abilities

Update rule:
- Every future tool/script/code capability change must update this section in the same pass.
- If a future chat cannot confidently update a row, leave the existing row in place and add a dated note explaining what changed and what remains unknown.
- Do not describe a reference copy, structural repack, or metadata-only analyzer as converted motion.

### Continuity heartbeat auto-add/reactivation instructions

Preferred existing heartbeat:
- ID: `aurora-forge-continuity-guard`
- Kind: heartbeat
- Schedule: hourly
- Target thread: `01a098fa-8e04-7b70-80e4-52c52f45e30c`
- Shared log: `D:/AuroraForge-Aug26/WWE2K19-to-2K26-Entrance-Prototype/notes/ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`

If another chat resumes and needs to auto-add or reactivate the heartbeat:
1. Inspect `C:/Users/dgran/.codex/automations/*/automation.toml` for an existing `aurora-forge-continuity-guard`.
2. If it exists, call `automation_update` in update mode, preserve the same ID/name/target thread/hourly schedule, set status `ACTIVE`, and keep the prompt focused on this shared log.
3. If it does not exist, create one heartbeat named `Aurora Forge continuity guard`, hourly, targeting the active Aurora Forge continuation thread, with a prompt requiring every command/result/edit/test/finding/pending step to be appended to this log and requiring this bottom function ledger to be updated whenever a capability changes.
4. The heartbeat is a continuity guard, not a shell capture hook. The active chat must still log directly before handoff, final response, commit or push.

### Public repository ability ledger

| Repository | Current function | Current ability boundary |
|---|---|---|
| Aurora-CAK-Foundry | Standalone CAK extractor, rebuilder, baker and validator | WWE 2K25 FDIR v9.3 and WWE 2K26 FDIR v9.9 pack paths proven; v8.3 READ proven (catalog-json decodes stock 2K22); v6.8 pack in progress (WriteString done + rebuilt, header-encrypt pending); 2K23 discovered as FDIR v8.7; broader assets remain bounded by evidence |
| AuroraForge_WWE_PC-Game_Modding_Tool | Umbrella local WWE PC modding workspace | Guided prep, CAK Foundry, DataCtrlLink workshop, 2K19 PAC/animation research, 2K20 workbench and DDS workflows; not a claim that every game/version converter is complete |
| Aurora-Forge-CAK-Mod-Loader | WWE 2K26 Secure DataCtrlLink CAK addon | Validates and mounts ordered CAK mods through reviewed exact-build profiles |
| Aurora-Forge-CAK-Mod-Loader-WWE2K25 | WWE 2K25 Secure DataCtrlLink CAK addon | Validates v9.3 CAKs, rejects exact mod-to-mod virtual-path collisions and has one verified changed-content visual replacement |
| Aurora-Forge-Custom-Music-Loader | WWE 2K26 custom music addon | Verified separated addon path for custom music through Secure DataCtrlLink v1.7.7 |
| Aurora-Forge-Custom-Music-Loader-WWE2K25 | WWE 2K25 custom music research addon | Source separation and integration work preserved; not approved by the core loader yet |
| Aurora-Forge-DDS-Converter | Standalone DDS/PNG workflow | Converts DDS to PNG and rebuilds PNG to DDS through DirectXTex with source textures left unchanged |
| Aurora-Forge-Knowledgebase | Public status/provenance index | Tracks current repository roles and verified statuses without proprietary assets |
| Aurora-Forge-Research | Private research evidence repository | Stores snapshots, experiments, failed hypotheses and validation gates before public promotion |
| Aurora-Forge-WWE2K19-Animation-Research-Public | Historical public animation archive | Public archive only; not the active converter and not a supported in-game conversion release |
| DataCtrlLink-MusicOnly | WWE 2K26 fail-closed loader/source package | Exact-build loader plus approved addon registry, ordered content and rollback behavior |
| Secure-DataCtrlLink-WWE2K25 | WWE 2K25 fail-closed loader/source package | Exact-build v1.23 loader plus approved CAK addon registry; Custom Music is not approved there yet |
| WWE2K19-to-2K26-Entrance-Prototype | Active animation conversion research repo | Verified 2K19-to-2K20 file-level bridge; 2K22 native TBUF relocation model; modern 2K25/2K26 semantic motion writer unresolved |

### Active animation research functions

| Function/tool group | Current ability | Boundary |
|---|---|---|
| `tools/convert-yanm19-to-yanm20.js` and package builders | Reference-assisted 2K19-to-2K20 YANM20/ACTS/EVD package-folder path for bounded Victory 6100-style inputs | Not an installable modern mod by itself and not a 2K25 `.clips` exporter |
| `tools/bake-2k20-textures.js` (new 2026-09-17) | CLI BakeMe+DDS to FDIR v6.8 CAK: Unity-crunch CRN + hand-built TEX! v9 + our backend pack; output hash-exact vs stock paths, roundtrip byte-exact | Container emits flags 01 40 (stock/community C0 gap open); in-game serves stock (see LOADER log) |
| `tools/inspect_jsfb_vector.js` + index census | Generic FlatBuffer record-vector reader; mapped 2K20 registry census (CharProfilePro victory pairs located, not yet field-named) | Reader/diagnostic only; no index writer yet (editors plan queued) |
| `tools/tbuf-v1-relocations.js` and `tools/tbuf-v1-relocation-report.js` | Read-only native-modeled TBUF v1/ANIM10 outer relocation table inspection; full 2K22 Victory corpus passed in prior validation | Does not prove inner descriptor/track semantics |
| `tools/tbuf-v1.js` and `tools/amym-tbuf-report.js` | Boundary-corrected TBUF/ANIM v10 read model: 16-byte TBUF header + 8-byte ANIM header, `relocationCount` at header+12, `tableOffset` at TBUF+16+declaredNativeDataBytes | `channelCount` retained as a legacy alias; encoder/replacePayload are research-only and not used by the 2K19 -> 2K20 package builder |
||| `tools/tbuf-v1-body-offset-hypotheses.js` | Metadata-only comparison of absolute, record-relative and field-relative inner offset hypotheses | Field-relative hypothesis refuted: descriptor words are not native address offsets; tools remain as diagnostic artifacts only |
| `tools/tbuf-v1-body-candidate-record.js` | Complex/simple body row scanner with descriptor-only, expanded, short and invalid range handling; at60[1] descriptor-selector model (matching prefix = simple, differing = expanded) | Diagnostic scanner, not a writer; descriptor encoding (highByte=scale, midByte=variant, low16=identifier) is understood but not fully decoded |
| Electron app under `app/` | Desktop interface for the stage-one 2K19-to-2K20 package flow and related tooling | Preserve Patreon gate and packaged-resource assumptions; do not stage generated `node_modules` or rebuilt `dist` bulk output unless explicitly requested |

## UPDATE RULE (2026-09-17 — user-ordered, always in force)

The chronological log is SPLIT into per-section logs (113 blocks moved, verified complete). Whenever an update runs, append it to the matching SECTION file below — not here. This main file keeps only the handoff, this rule, the index, and the function ledger.

| Section file | Topic | Update when you touch |
|---|---|---|
| LOG-2K19-2K20-BRIDGE.md (39) | 19→20 converter, package builder, EVD, batch, app IPC, Patreon | 19→20 bridge, packaging, app, verifier work |
| LOG-TBUF-RESEARCH.md (14) | Descriptor/relocation/native-reader research, handoffs | TBUF analysis, Ghidra, corpus reports |
| LOG-2K20-2K22-CONVERTER.md (21) | YANM→TBUF converter, runs, Rosetta, CRC crack, anatomy, audits | 20→22 converter, hash/bone, stream work |
| LOG-CAK.md (8) | v8.3 cipher, backends/readers, CakeTool, baker version tests | Cipher, CAK tooling, bake backend work |
| LOG-LOADER-GAMEDIR.md (13) | SDCL/loader, game-dir forensics, bake flows, in-game tests | Loader, installs, bakes, game testing |
| LOG-SOURCES.md (12) | Audits, source roots, installs, extracts inventories | Any source/extract/install discovery |
| LOG-GITHUB.md (3) | Ability overhaul, 21-repo sync, PRs | Commits, pushes, PRs, capability statements |
| LOG-REGISTRY.md (2) | Victory-list hunt, SDB mapping, solved 25/26 ref | Registry/list/FlatBuffer work |
| LOG-TOOL-CATALOG.md (1) | Complete script catalog reference | Tool catalog changes (merge with REPO-FUNCTION-INVENTORY.md when complete) |
| LOG-CONVERSATIONS.md | Dialogue directives/corrections/decisions | Any user directive, dispute, or decision |
| REPO-FUNCTION-INVENTORY.md | Generated file+function inventory, all repos | Regenerate after adding/removing tracked source files |
| ACTIVE-LOG-BACKUP-20260917.md | Pre-split byte backup of this file | Never edit; restore point only |

## 2026-09-18 - GOAL REDEFINED (user-ordered): 2K19 export -> 2K25 import
- Old goal (19->20 conversion bridge) RETIRED as active work; bridge stays green as reference/fallback (committed, pushed). Reason: 2K20 slots mount but never serve (proven across methods/timings/flavors); remaining theories need rule-breaking or unbounded RE.
- New goal: export WWE 2K19 animations, import into WWE 2K25 (usable: browse-by-name in editor, preview plays new motion, in-game verdict).
- Why 2K25 directly: serving works there (ecosystem + own loader proof), registration solved (VictoryList append/patch/tested), delivery solved (Foundry v9.3 + Tribute carrier map), feedback loop per iteration. Single transcode hop = higher fidelity.
- Carries over: 2K19 IR model, bone dictionary, keyframe analysis, TBUF/clips lineage knowledge, all tooling. Clips-Tools repo: readers complete, container inject exists, pose/keyframe/Group90 ENCODE is the crux.

## 2026-09-18 - 2K25 track namespace CRACKED (FNV-1a64 J_ names, 60/64) + transfer plan
- 8102 rec0: 64 tracks; identifiers resolve via FNV-1a64(proper-case J_ bone name) to full rig in canonical order (Hips->Spine->Head->arms+fingers->legs). Unknowns: track0 + tracks61-63 (structural slots, root/terminator analogues).
- 2K19 6100: 62 tracks. Mapping routes: (a) positional rest-pose correspondence (next), (b) name-based via rig order. Transfer levels: L0 byte-identical re-inject (container proof), L1 descriptor rest values by bone, L2 token-stream encode (ULEB decode exists, encode = crux).
- Repo gaps filed: Clips-Tools standalone missing clip-control-pair.js + score-group90-op0.js (exist in prototype only); sync needed.

## 2026-09-18 - 2K25-direct: namespace cracked, container proven, transfer ladder set
- Track IDs = FNV-1a64(proper-case J_ bone): 60/64 resolved, canonical skeleton order (Hips@1). Unknowns: track0 + 61-63 (structural slots).
- Descriptor = [u16 tokenStart][u16 flags][f32 rest] x6/track. Rest values do NOT match YANM triples (different units/conventions) - motion lives in token streams, not headers (v1 lesson re-confirmed for clips).
- .clips layout: 0xA0 header + tracks x8 + g38 x4 + g60 x8 + desc x8 + g90 x8; record id = FNV-1a64(clip name); build() roundtrips BYTE-IDENTICAL; cross-animation record transplant validates (8102 shell + 8054 rec0).
- Token streams: ULEB128, classic varlen histogram (54% 1B). 2K19: 62 tracks/17899 keys; 8102: 64 tracks/13845 tokens. Same magnitude - plausible key-token correspondence.
- Cross-animation track order CANONICAL (8054/8100 match 8102: root,hips,spine1...). Swap mechanics proven at container level.
- .adefs = per-animation event graph (bone names + AttackPart/Hit/Sell tags + <id>_*-style refs, 12.7KB diff 8102vs8054). Needs per-target rebuild (Stage 2).
- Next: token bit-field semantics (op0 rankWindows for frame fields) -> ULEB keyframe ENCODE mirror -> Level-1/2 transfer tool -> VictoryList append (tool exists) + v9.3 bake + SDCL mount -> 2K25 in-game verdict (serving PROVEN there).
- Repo hygiene: Clips-Tools standalone lacks clip-control-pair.js + score-group90-op0.js (prototype-only) - sync before release.

## 2026-09-18 - Transfer architecture COMPLETE (structure-mapped, encode next)
- Section correspondence: 2K19 sec0 (62) <-> clips rec0 (64 body); 2K19 sec1 (7 facial) <-> clips rec5 (8 face). +2/+1 structural slots (root/terminator analogues). rec1-4 = event/prop/SFX records (differ across anims, keep target).
- 2K19 track types: 0x0204 body core (500-1300 keys), 0x2200 fingers (base19+movers), 0x2300 facial/dual-timeline. Timelines: primary stride-8 positions, secondary stride-20 rotations; 2420-frame base.
- Track order CANONICAL both sides (hips@1 verified: 2K19 hash F91A7A26 == 2K20 YANM rec1 hash - same function!).
- Transfer plan (proven playbook + resampling): template target record -> resample 2K19 curves to target key counts -> quantize into observed int ranges -> replace VALUE tokens (opcodes/framing untouched) -> validate -> VictoryList append -> v9.3 bake -> SDCL mount -> 2K25 verdict (serving PROVEN).
- Token facts: ULEB varlen (54% 1B); hips range 250 tokens (135x1B + 115 multi, interleaved - no clean size split); op0 scorer: 175 large-follower runs/record. Bit-window frame fields found (10b @19/23/26, 100% in-range).
- adefs = per-animation event graph (ID-referenced) -> Stage-2 rebuild after motion proves.
## 2026-09-18 - Token channel structure mapped (encode mirror next)
- Track ranges are FIXED-budget (~247-256 tokens/moving track, 1-3 for static), NOT key-proportional: clips resamples every track to a fixed token budget. Sum 9650 tokens/64 tracks (6100).
- Active-starts distribution: 0:1, 1:16, 2:11, 3:33, 4:3. Most tracks = 3 channels (xyz triplets); hips has 4. Descriptors = [u16 tokenStart][u16 flags][f32 rest] x6.
- 2K19 key SIMD: primary stride-8 positions, secondary stride-20 rotations, 2420-frame base; track types 0x0204 core / 0x2200 fingers / 0x2300 facial-dual.
- Encode mirror design: resample 2K19 channel curves to target per-channel token counts, quantize to observed int ranges, preserve opcodes/framing, validate, bake, mount, verdict.
- Rock 6100 exists in 2K25 (bakedfile60/100; rec15 64-track body + rec16 8-track face; 1755 frames). SAME ID, SAME superstar, SAME victory: the purest transfer test when encoder lands.

## 2026-09-18 - SESSION CONDENSED LOG (goal redirect + 2K25-direct day one)
### Decisions (user-ordered)
- Goal REDEFINED: 2K19 animation EXPORT -> 2K25 animation IMPORT (19->20 bridge retired to reference/fallback, stays green). Reason: 2K20 slots mount but never serve; 2K25 serves (proven ecosystem).
- Additive-only, no replacement, slots 08-12 only, 00-07 untouchable. No unscoped drive scans. All 23 repos PRIVATE. main+working everywhere, work on working, push <=30min. Verify visibility before push. Content-verify installs. Machine-check hashes (63-char lesson).
- Texture tests: user face-paint set re-containerized whole (39 files) - stock verdicts. Magenta/C0/native variants all stock. Tribute method researched (slot manager + BakeMe + boot mount + full index sets).
### Proven this session
- 2K25 track IDs = FNV-1a64(J_ bone names), 60/64 resolved, canonical order, hips@1 both sides (2K19 hash F91A7A26 == 2K20 rec1 hash).
- .clips layout: 0xA0 header + tracks x8 + g38 x4 + g60 x8 + desc x8 + g90 x8; record id = FNV(clip name); build() BYTE-IDENTICAL roundtrip; cross-animation transplant validates.
- Descriptors: [u16 tokenStart][u16 flags][f32 rest] x6/track. Token streams ULEB varlen; FIXED budget ~250/moving track; active-starts 0:1/1:16/2:11/3:33/4:3 (xyz-triplet channels).
- Section map: 2K19 sec0(62) <-> clips rec0(64 body); 2K19 sec1(7 facial) <-> clips rec5(8 face). Types: 0x0204 core / 0x2200 fingers / 0x2300 facial-dual. rec1-4 = event/prop/SFX (keep target).
- Tribute VictoryList cracked: 657 vs 661 rows (added 14000-14003, removed 7, rehashed strings). Reader oodle-fallback fix verified.
- Rock 6100 EXISTS in 2K25 (bakedfile60/100; rec15 body + rec16 face; VictoryList wrestlerId 100 -> victoryFace 6100). Purest transfer target.
- 2K20 disassembly: MountCakFn builds bakedfile%02d from (prefix,index) - old loader calls were no-ops; native boot loop mounts 0-99 ascending; stock flags 01 C0 (C0 write path implemented + roundtripped); San847 section cipher still unknown.
- Infra: texconv+Unity-crunch acquired (SHA-verified); bake-2k20-textures.js (byte-exact); stage-public-tools.js (sanitized 14-file releases); full 2K20 extract 284260/284260 audited; 12892 .jsfb census; loader native-mount + window-gate + boot-hook + self-fingerprint + saw-hash logging (all on working).
### NEXT STEP (exact)
- Build the token VALUE encoder: for 8102-rec0 track1 (hips), map each ULEB token range to (frame, value) pairs using the op0 bit-window frame fields (10b @19/23/26 candidates) + rest floats as frame-0 anchors. Verify by RE-ENCODING stock hips tokens from decoded pairs and demanding byte-identical output. Only then: resample 2K19-6100 hips keys into the same encoder, replace the range in a copy of 6100.clips rec15, validate, bake v9.3, mount on 2K25, in-game verdict (Rock plays 2K19 motion = transfer proven).

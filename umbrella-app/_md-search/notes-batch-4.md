# notes-batch-4 — Aurora Forge / WWE 2K19→2K25 entrance conversion

Batch: `_md-search\batch-4.txt` (53 files, all read to EOF 2026-09-24). Sources cited by key:

- [NSP] `C:\AuroraForge-Aug26\AURORA-FORGE-NEXT-SESSION-PROMPT.md` (current mission, SNME, test10)
- [ALL] `C:\AuroraForge-Aug26\allfiles.md` (workspace study + loader root-cause ledger + status ledger)
- [MAST] `C:\AuroraForge-Aug26\AURORA-FORGE-MASTER-TASK.md`
- [C25] `C:\AuroraForge-Aug26\AURORA-FORGE-WWE2K25-COMPACT-HANDOFF.md`
- [HEP] `...\WWE2K19-to-2K26-Entrance-Prototype\HANDOFF_EXACT_POINT_2026-09-10.md`
- [LR] `...\WWE2K19-to-2K26-Entrance-Prototype\notes\LOG-REGISTRY.md`
- [LT] `...\WWE2K19-to-2K26-Entrance-Prototype\notes\LOG-TBUF-RESEARCH.md`
- [MDL] `...\WWE2K19-to-2K26-Entrance-Prototype\notes\2026-09-12-wwe2k-mdl-per-file-capability-ledger.md`
- [CV] `...\Aurora-Forge-Converter-Releases\README.md`
- [TRB] `_archive\handoffs\AuroraForge-WWE-Modding-Knowledge-Handoff-2026-08-25\TRIBUTE-REPLACEMENT-STATUS.md`
- [PKG] `_archive\handoffs\Aurora-WWE-Project-Knowledge-Pack-2026-09-05\conversion\README.md`
- [CR] `_archive\handoffs\AuroraForge-WWE-Modding-Handoff-2026-08-27-2K22-Payload-Key-Checkpoint\CLEAN-ROOM-EVIDENCE.md` + `RESUME-PLAN.md`
- [2K22S] `_archive\handoffs\AuroraForge-WWE-Modding-Handoff-2026-08-26-2K22-Start\CURRENT-APP-STATUS.md` + `STANDALONE-TOOLS-STATUS.md`
- [SDCL-CODEX] `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\CODEX_HANDOFF_NEW_PROJECT.md`
- [SDCL-REN] `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\REVERSE_ENGINEERING_NOTES.md`
- [SDCL-SEC] `...\release\Secure-DataCtrlLink-WWE2K26-1.0.0-provenance-check\SECURITY.md`
- [SDCL-177] `...\release\Secure-DataCtrlLink-WWE2K26-1.7.7\README.md`
- [V176] `...\_forge2-merged-20260924\sdcl-release\RELEASE_BODY_v1.7.6.md`
- [FND778] `...\Aurora-CAK-Foundry\build\clean-package-test-v1.7.8-final\CAK_FOUNDRY_RELEASE_NOTES_1.7.8.md`
- [FNDBUG] `...\Aurora-CAK-Foundry\docs\AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md` (+ build-copy variants)
- [FNDFIX] `...\Aurora-CAK-Foundry\build\standalone-cak\AURORA_CAK_FOUNDRY_v1.7.8_BUG_REPORT.md`
- [DSC] `...\reverse-analysis\reconstructed\DISCORD_FORUM_POSTS.md`

---

# ANSWERS TO THE 10 QUESTIONS

Status codes: **E** = directly evidenced in this batch; **P** = partial; **X** = not in batch 4.

## Q1. Which row to clone as template for new entries (per registration file)
- **P (rule known, exact stock row ids mostly not in batch).** Rule: "Template ids for the writers: use the proven bobnobob/14000 values where available (see handoff) and the writer test fixtures; verify each block's output with its verify step" [NSP]. Victory writer is explicitly clone-based: `tools/append_2k25_victory_entry.js` "CLI clones an entry + appends with overrides" [LR]. Entrance writer `append_2k25_entrance_clone_graph.js` + `edit-2k25-entrance-entry.js` preserve the "11-field shapes" of the cloned row [NSP]. Known concrete clone source: 2K25 entrance `.adefs` for the mono build were "cloned from 852" [NSP]. Known 2K25 VictoryListData stock record for wrestler slot 100 (Rock): face victory `6100`, alternates `9100`/`8712` [PKG]; 2K20 analogue row: wrestlerId 100 with paired victory u32s [6100,6100]+[8701,8703], 208-byte-stride triple rows [LR]. Exact template row ids per each of the 12 registration blocks are NOT in batch 4 — they live in `notes\HANDOFF-2026-09-20-BOBNOBOB-TEST-CAK.md` and `analysis\tribute-bake-test-sept19-cak\common-diffs.json` [NSP].

## Q2. Which files MUST be written for a new entry to appear in-game and play (tested file sets)
- **E for the list; the "full chain" test itself is the pending next step.** An entry appears ONLY when its name id + row are written into ALL tables that the owner's working Tribute/CakeView bake touches; our converter writes only 4 [NSP]. Tested set so far = 4 files (mounted, entry did NOT appear) [NSP][ALL]:
  - `Entrances\EntranceListData.jsfb`
  - `Entrances\VictoryListData.jsfb`
  - `Cutscene\CutsceneNoRegistry.jsfb`
  - `Sdb\ENG.sdb`
- MISSED and must be written: `Hide\HideCtrlData.hidelink.jsfb`, `Roster\CharMoveSetDataTable.jsfb`, `Roster\FaceTextures.jsfb`, `Roster\CharProfilePro.jsfb`, `Roster\CharProfileTable.jsfb`, `Characters\CharacterMapping.jsfb`, `MoveData\CAMMoveData.jsfb`, `Stable\TeamsTable.jsfb` (+ CreateShow/Audio/Movies per the 32-file diff list) [NSP]. Full proof set: `notes\HANDOFF-2026-09-20-BOBNOBOB-TEST-CAK.md` + `analysis\tribute-bake-test-sept19-cak\common-diffs.json` (32 files) [NSP].
- **Conflict to note:** owner later ruled `Hide\HideCtrlData.hidelink.jsfb` OUT OF SCOPE for entry registration — it is checked only at load, only exists in modded files, and if several mod CAKs carry it only the last/latest is used [ALL]. The 2026-09-24 prompt still lists it among MISSED [NSP]. Owner authority rule: when notes conflict, the published working release + original working code wins [ALL].
- Timing requirement (equally mandatory): the CAK carrying these tables must be mounted **at boot**, before the game parses registration JSFBs; replacements (textures/clips) are read on demand and always worked [ALL].
- The orchestrator block list (12 blocks) matches the table list: `sdb, victory, entrance, cutscene, teams, charmapping, cammove, facetextures, charmoveset, charprofilepro, charprofiletable, hidemotion` [NSP].

## Q3. Name/string id scheme (SDB ids, negative ids, hashes)
- **E.** Name id example `4294957742` = signed `-9554`; it must be referenced in each table's `nameString`; the human text lives ONLY in `Sdb\ENG.sdb` (XOR payload) [NSP]. `sdb-name.js` find-or-append name ids; "next id = last+1, negative space" [NSP]. SDB strings are dialogue/UI lines (e.g. `RUBY RIOT`@855178, `THE ROCK`@921551), not a registry; strings alone cannot register a new ID (tested against 6204) [LR]. 2K20 victory registry (CharProfilePro) is pure numeric — no name strings in any table [LR]. VictoryListData carries a `nameString u32` field [LR]. CAK path identity uses case-insensitive FNV-1a 64 (`SysCore::Hash::FNV64StringI`, offset `14695981039346656037`, prime `0x100000001b3`) [ALL]; Wwise event ids use lowercase FNV-1 (multiply then XOR), NOT FNV-1a [SDCL-REN][DSC].

## Q4. CAMMoveData (MoveData/CAMMoveData.jsfb) — role and values
- **P.** It is one of the mandatory registration tables (`cammove` block in the orchestrator; writer `tools\append-2k25-*` family) [NSP]. It is grouped with `AttackData/CAMMoveData/DamageLevelPresets + Havok/` under `MoveData/*.jsfb` and was a candidate location for the victory registry mapping before CharProfilePro was proven [LR]. Editors plan records it as "(move defs)" groundwork for a moveset/motion entry manager [LR]. Exact row fields/values for a new motion entry are NOT in batch 4 — they are in the `append-2k25-cammove` writer + its test fixture (see Q9 tools).

## Q5. New-entry id numbering rules
- **E (multiple, partly conflicting — flag for owner).** House rule: "new IDs start at 14000" [ALL]. Owner rule used for the current test: new id **16086** = `EntranceListData sec8 max 13086 + 3000` [NSP]. Tribute assigns new addon characters IDs in the **1500+** range, not 14000 [ALL]. SDB names: next id = last+1 in negative space [NSP]. New motion namespace probe used `6104` (`aurora-6104-probe.cak`, virtual `Animation/Victory/6104.adefs/.clips`) as a non-destructive new-asset mount test [C25]. Converter picker test targets an additive `TEST 14000` entry (not yet proven) [CV]. Victory registry new-ID path was blocked at id 6204 on 2K22 [LR].

## Q6. EntranceListData row field values for new entries
- **P.** 2K25 rows are edited byte-preserving with 11-field shapes; `edit-2k25-entrance-entry.js` aliases: `--motion --title-motion --mitb-motion --double-title --music --gfx` (kebab `--name-string` flag fix pending) [NSP]. Stock 2K25 `EntranceListData.jsfb` = 357,552 B in the 129-file test bake; 2K22 version is 553 KB with a DIFFERENT `Entr` schema (2K25-pattern navigation lands on count=0 at EOF) [NSP][LR]. 2K20 `Entr` index census count = 6 [LR]. No field-by-field value table in batch 4 — see the handoff + writer fixtures [NSP].

## Q7. VictoryListData vs EntranceListData (separate tables, row shapes)
- **E.** Separate files, separate identifiers/schemas, separate editors (`edit-2k25-victory-entry.js` vs `edit-2k25-entrance-entry.js`) [NSP][LR].
  - `VictoryListData.jsfb` identifier `Vict`: root→wrapper→vector of **10-field records** (wrestlerId u16, nameString u32, type u8, hideId u64, someId u32, victoryFace, victoryHeel, titleFace, titleHeel, doubleTitle u32s). Clean-room FlatBuffer reader/writer exists; stock 2K25 file 33,208 B; 33,000 B in test bake [LR][NSP].
  - `EntranceListData.jsfb` identifier `Entr`: 2K25 uses 11-field row shapes; 2K22 uses a different `Entr` schema (do NOT assume field parity) [NSP][LR].
  - No separate victory list in 2K22 (`Root\Entrances\` = CAE_TemplateDataLists, EntranceListData, SuperStarTronSetup only); no `Vict` in 2K22 EntranceListData, no `Vict` in 2K20 either [LR].

## Q8. How animation files are registered
- **E for the tested mono build.** `Animation\Entrance\16086.clips` (29 records; body records 22/24/10/26/27 replaced from `100.bin` sections 0/2/4/6/8) + `.adefs` cloned from stock `852`; plus **5 phase files** in `Animation\CaeAdvanced\1x0016086.*` [NSP]. Entrance decode verified: 10 sections (bodies 62 tracks / secondary 7 tracks); codec fix in `build-imported-clips.js` (`sectionIndex`, `SUPPORTED_TRACK_TYPES`, template-driven loop) [NSP]. Related registration surfaces: `Cutscene\CutsceneNoRegistry.jsfb`; `Cutscene\<id>_cdef.jsfb`; `Cutscene\CaeAdvanced\<id>.jsfb` (listed as next work once registration works) [ALL]. 2K25 `Animation\Entrance\100.clips` holds the same 35 identifiers as the five CaeAdvanced pairs `1000100`–`1400100`, reordered/partitioned 5/5/5/9/11 [PKG]. Modern tree also has `Animation\Data\MotionAreaData.jsfb`, `Animation\animbanks`, `AnimSystem\ratanim.adefs` [HEP]. The Unlisted Motions mod shows the `Animation`/`CaeAdvanced`/`_cdef` registration-file pattern [ALL]. Victory equivalent: `Animation\Victory\6100.clips` + `6100.adefs` (byte-identical 2K25↔2K26) [HEP][PKG].

## Q9. Which tool/flow builds the CAK for a new entry
- **E.** Config-driven applier `tools\bakeme-orchestrator.js` with 12 blocks (Q2 list); all writers exist under `tools\append-2k25-*` (8 files, 38/38 tests, built 2026-09-21); example config `tools\bakeme-orchestrator.test.js` [NSP]. Bake step: **FTribTool v9.3 with `--encrypt-header`** [NSP]. Foundry path: Aurora CAK Foundry v1.7.8 writes the protected/obfuscated FDIR 9.3 catalog (protected declared sections, scrambled strings, filename-derived key) — full 2,004-file `bakedfile80` rebuild reproduced every payload byte-for-byte and WWE 2K25 v1.23 returned success on mount [C25][FND778]. Converter app Beta1.0.0c "builds and reopens a loader-ready replacement CAK through Aurora CAK Foundry" [CV]. `Aurora Forge v1.8.0-beta.1` test manager (GUI + `npm run test-manager`) backs up/installs the verified loader pair, stages one controlled CAK into `mods`, writes `mods/manifest.json`, supports enable/disable/order, and resets to a recorded baseline [CV]. Reference-only CAK writer knowledge: Bakery CakeTool `CakeFileBuilder.cs` (Oodle Kraken Normal, compress if size ≥ 0x100 and extension not in no-compress list `.tdb,.bk2,.adefs,.hkt,.bdy,.idx,.bin,.audioquery,.adb2,.iff,.pck,.bgnt,.ini,.dds,.db`) [ALL].

## Q10. Intended end-to-end user flow
- **E (assembled from stated steps).**
  1. Import 2K19 animation: HSPC/BPE decode (`tools\extract_2k19_pac.py`, C reference `tools\reference_unbpe.c`), YANM keyframe decode (`tools\yanm-keyframes.js`; body 62 tracks, secondary 7, camera 2 for Victory 6100) [HEP][PKG].
  2. Bridge 2K19→2K20: `staged-pipeline.js` (19→20 stage), `patch-acts20-yanm.js`; 2K20 embedded YANM is the semantic bridge (identical track hashes; stream A canonical) [LT][HEP].
  3. Bridge 2K20→2K22: YANM→TBUF converter implemented and tested **10/10 animations pass** [LT].
  4. Convert to modern 2K25 `.clips`: template-driven re-encode (`build-imported-clips.js`), validated by `compare-motion-metadata.js` / crosswalks; converter Beta1.0.0c does "decoded 2K19 motion → replacement `.clips`" [CV][NSP][HEP].
  5. Create the new entry: clone + in-place edit stock JSFBs (`append_2k25_entrance_clone_graph.js`, `edit-2k25-entrance-entry.js`, `edit-2k25-victory-entry.js`, `sdb-name.js`) [NSP].
  6. Write the FULL registration chain with `bakeme-orchestrator.js` (12 blocks) onto the stock SNME tree (source `C:\Games\2k25-extraction\`), new id 16086 [NSP].
  7. Ship the animation files (`Animation\Entrance\16086.clips` + `.adefs`, `Animation\CaeAdvanced\1x0016086.*`) [NSP].
  8. Bake protected FDIR 9.3 CAK (FTribTool v9.3 `--encrypt-header`), stage BOM-free `mods\manifest.json`, copy+SHA-256 verify [NSP].
  9. Owner tests in SNME: entry appears with name and plays the converted `100.bin` motion [NSP].
  Later: secondary (trk10, `0x2300`) track support → full-library batch → app wiring [NSP].

---

# REGISTRATION CHAIN (detailed)

- 12 orchestrator blocks ↔ tables: `sdb, victory, entrance, cutscene, teams, charmapping, cammove, facetextures, charmoveset, charprofilepro, charprofiletable, hidemotion` [NSP].
- Editor groundwork/field knowledge per table [LR]: CharProfilePro (victory pairs), CharMoveSetDataTable (moveset map), EntranceListData/`Entr` (entrance list), FaceTextures/`Play` (face index), AttackData/CAMMoveData (move defs). 2K20 census: Prof 531 / CharPro 493 / CharMoveSet 522 / Entr 6 / Supe 389 / Play 285 / Cost 102 / CAtt 20845 / CMov 12940 [LR].
- Save rule for all editors: preserve sizes/padding/unknown bytes (CactusBack pattern), clone-row for new IDs, never overwrite stock rows [LR].
- House rule: never rebuild stock JSFBs — clone + in-place edit only [NSP].
- Loader timing rule: registry JSFBs are read at boot; replacements are on-demand → only an in-sequence boot mount registers new rows [ALL].
- Under-registration was proven by test10/SNME: CAK mounted, stock names displayed, but entry 16086 did not appear and selecting rows showed wrong data; 4 files only [NSP].

# NAME / ID SCHEME (extra)

- Negative-name space example: `4294957742` (u32) = `-9554` (signed); text only in ENG.sdb XOR payload [NSP].
- sdb-name.js: find-or-append, next id = last+1 [NSP].
- VictoryListData `nameString` is a u32 id field per record [LR].
- 2K20 victory registry (CharProfilePro): numeric only; Rock row wrestlerId 100, paired victory u32s [6100,6100]+[8701,8703]; 208-byte stride triple rows (attire variants); no top-level u32 refs anywhere [LR].
- Wwise ids: lowercase FNV-1 (`id = id*0x01000193 ^ lower(letter)`, start `0x811C9DC5`) [SDCL-REN][DSC]; music bank object `0x8FD5129D`, game_mode `0x8BD6CED5`, streaming_install `0x54BF3665` [DSC].
- CAK virtual-path hashing: case-insensitive FNV-1a 64 (`FNV64StringI`) [ALL].

# ANIMATION REGISTRATION & CODEC (extra)

- 2K19 Victory 6100 decode: section 0 = 62 tracks (all supported/timeline-matched), section 1 = 7 tracks, camera = 2 tracks [HEP].
- 2K25 Victory 6100 targets: body record 15 = `0xA57FCBAB77BC9BD5` (64 tracks, frameValue 1755, fps 60, 2 target-only tracks), camera record 14 = `0xC2E6DE4A51C9AEDD` (3 tracks, 1 target-only) [HEP].
- Descriptor slot masks: `0x2200`→000111, `0x0204`→000111, J_Hips `0x0304`→010111, final `0x2300` dual-timeline body→010010; camera masks 111111 and 111000 (camera is front-loaded; don't copy camera assumptions to body) [HEP].
- J_Hips bridge: source hash32 `0xF91A7A26` type `0x0304`; target id64 `0xF4043B2D54A71FC8` mask 010111 slots 1,3,4,5; 2K19 timelines primary stride 8/1319 keys, secondary stride 20/530 keys, totalFrames 2420; quantization candidates `0.00013908474647905678`, `58.72182083129883`, `1.7271270751953125`, `10.367934226989746` [HEP].
- 2K25 descriptor `firstU32` is likely a Group90 ULEB token index (shared template segments; repeats: 2806×18, 1786×15, 247×13, 506×10, 1783×10, 3315×7, 2039×6, 2550×6) — NOT a 2K20 offset/count [HEP].
- Group90 = full ULEB framing, not transform decoding; body record 15: 122,808 B / 69,492 tokens; camera: 41,072 B / 21,781 tokens; the old "exactly 221 Opcode 0 body runs" note is not trustworthy [HEP].
- 2K20 ACTS/EVD wrapper: `0x00` outer magic ACTS/EVD, `0x04` version 2, `0x08` inner magic, `0x0C` stored size = file size − 24, `0x10` OODL, `0x14` decompressed size, `0x18` Oodle payload; decoded with 2K20 `oo2core_7_win64.dll` (6100.acts 743,484 B; 6100.evd 20,546 B); `.acts` starts `AMYM`, embedded YANM at offset 284; `.evd` names motion `6100_VIC_SINGLE_The_Rock_M_Face` [HEP].
- 2K20 body YANM block: offset 37212, size 489256, count 63; record table 37228; records 0–61 are 40-byte `0x2100` records matching 2K19 hashes exactly and in order; record 62 sentinel-like; J_Hips record at 37268 (`u32_8=2800`, `u32_12=2092`, `u32_16=19536`, `u32_20=1873`, same quantization floats) [HEP].
- 2K20 rule: stream A = main/canonical motion; stream B = common 19-key auxiliary except J_Hips (1873) and final `0x2300` (550) [HEP].
- TBUF v1/ANIM v10 (2K22): TBUF header 16 B + ANIM header 8 B; relocation table = `TBUF+16+declared size`; header+12 = relocation count (legacy name `channelCount` is a misnomer); 743 files / 5687 blocks validated (4641 × 3 entries width 1; 1046 × 6 entries width 2); relocated root at payload+24 consumed by `FUN_1405bf070` [LT].
- TBUF descriptor-selector model: `at60[1]` matching prefix descriptor → `simple` (711); differs → `descriptorExpanded` (19); matches but gap>20 → `offsetExpanded` (12); highByte = scale level (16 base; 32/48/64/80/96 expanded), midByte = variant, low16 = identifier; pre-computed by content pipeline, not by the game [LT].
- 2K19→2K20 converter YANM→(bridge) implemented and tested; staged pipeline supports 19→20 and 20→22; TBUF 32-byte chunk structure decoded (0x59 markers); YANM stream uses 4-byte keyframes (uint16 delta + int16 value) [LT].
- 2K25 entrance mono build = `Animation/Entrance/16086.clips` 29 records + `.adefs` cloned from 852 + 5 CaeAdvanced phase files [NSP].
- `Animation\Entrance\100.clips` (2K25) contains the same 35 identifiers as CaeAdvanced pairs `1000100`–`1400100`, partitioned 5/5/5/9/11 [PKG].

# CAK BAKE & LOADER (extra)

- Loader root cause (solved): mod CAK was mounted too late (window thread ~+8 s); game reads registration JSFBs at boot. Fix = poll until packed `.text` unpacks (~5 s), hook the **mount function** (`profile->mount_rva`; v1.23 `0x2DFDA0`), inject the mod CAK from inside the game's own boot archive sequence on the boot thread, right after the low `bakedfileNN` mounts; mirrors CakeHook 2.7.1 [ALL].
- Do NOT hook the phase function on 2K25 v1.23 (`0x2DFF50` is not called in this build) [ALL]. (The published 2K26 source hooks `phase_rva`; that is a 2K26/other-build design [ALL].)
- Mount ABI (verified): `bool(const CakPathView*, void*, uint32 origin, uint32 index)`, `CakPathView = {char* data; size_t length}`; mods `(absPath, nullptr, 2, 1)`; stock boot `(relative bakedfileNN.cak, nullptr, 0, index)`; ResourceSync `(…, 1, -2)` [ALL][SDCL-CODEX].
- Wrong old ABI (the bug): `bool(*)(char*, const char*, const char*, int)` called as `g_cak_mount(scratch[260], "%s%02d.cak", "bakedfile", index)` + renaming the mod CAK to `bakedfileNN.cak` — breaks the filename-derived archive key [ALL].
- Final verified loader pair (both v1.23 and SNME): core `E600D04F2E1A9AF3C23A358462E8B5C25064D6C08411819377E278581EF0ED2F`, addon `8DF85F88EF117CAE07D9BA3788AB255C5986E3E460F905EDAB7C5972918E3E33` ("boot mount-injection") [NSP][ALL].
- Profiles: v1.23 mount `0x2DFDA0` / sig `0x2DFEAD` / stock `0x2DFF50`; SNME mount `0x2E03F0` / sig `0x2E04FD` / `0x2E05A0`; mount signature `40 46 74 3e 72 ff 48 85 c0 48 0f 44`; correct v1.23 phase prologue `48 89 5c 24 08 48 89 6c 24 10 48 89 74 24 18 57` [NSP][ALL][C25].
- 2K26 values (for contrast): mount wrapper RVA `0x2811A91`, signature RVA `0x2811BFC` [SDCL-CODEX].
- SNME environment: game `C:\WWE 2K25 Saturday Nights Main Event\`, exe 529,611,216 B SHA-256 `C6BC0459D4D29667C9E8F1DCACA013AE4691D615E4C79D069AD272F70E2CEE01`; loader `dinput8.dll` `E600D04F…` + `plugins\AuroraForge.CAKModLoader.ftrib` `8DF85F88…`; mods staging `mods\manifest.json` must be BOM-free; currently `cakOrder: []` [NSP].
- v1.23 (DEAD, do not touch): `D:/WWE 2K25-1.23/WWE 2K25`, exe SHA-256 `B608E7ED18BFB6291CA195532ACCF40081CBF1A1F4850E63943906D155B9AC98`, Oodle `01301592C8E51660BFDD8785ED1AD762FD103033C85414C925FC3DD4B8B6E999` [C25][NSP].
- Foundry: all 15 v1.23 CAKs open, 386,873 files / 93,738 folders, zero rejected; v1.7.8 portable ZIP SHA-256 `888253B4D4B195FDCFB6B9C8E406174DA1018FF3A9D89E1BB5729689F51E495A`; protected 2,004-file rebuild accepted by game mount [C25].
- FDIR 9.3 facts: files start `46 44 49 52 09 09 00 81`; following 84-byte encrypted header holds catalog counts/sizes/offsets/key; catalog protection after the 8-byte prefix; v9.3 cryptor key `W?#i]}UvfXzW[iQx;QbLzJH3j}ct/KZ[`, IV `+e{*;_hX`, ChaCha sigma `Tf!UM*18EWf]$X_&`; version byte 25 = v9.3; keys are filename-derived → **never rename a baked CAK** [SDCL-REN][ALL][FNDBUG].
- Foundry v1.7.8 protected test CAK: 2,214,802,300 B SHA-256 `DA50A25904803B002864B69BCF0033A76974CEA5F91CE95E4E344441C63B0818` [FNDBUG].
- Resource ids: `.jsfb`→JSFB, `.clips`→CLIP, `.sdb`→XLOC, `.tex`→TEX! [ALL].

# VERIFIED FACTS (hashes/paths, batch 4)

- SNME exe `C6BC0459…`; loader pair `E600D04F…`/`8DF85F88…` [NSP].
- v1.23 exe `B608E7ED…`, Oodle `01301592…` [C25].
- Foundry v1.7.8 ZIP `888253B4…`; protected test CAK `DA50A259…` [C25][FNDBUG].
- 2K26 exe `7F558607BD6881C4547D752EA107FB03282A2980E47EF19ADE597E096DE4A0E9`; original DataCtrlLink proxy `A1104F95…`; golden rebuilt bank `F83C9B85C8D1D50C948B0D221DD6C65CFBE713CAAAACF722C3B79CAAEBE4B749` [SDCL-CODEX][SDCL-REN].
- SDCL v1.7.6 binaries: dinput8 `88A0A9D0…`, mod_loader `4DDA01A6…`, music_loader `84EF5BEF…`, mygm_mod `DBEFF00A…`; ZIP `67941A58…` [V176].
- 2K25 Victory body `0xA57FCBAB77BC9BD5` rec 15, camera `0xC2E6DE4A51C9AEDD` rec 14; J_Hips 2K19 `0xF91A7A26` / 2K25 `0xF4043B2D54A71FC8` [HEP].
- 2K20 decoded bridge paths: `D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin` (+ `.evd.decoded.bin`); source CAK `...\WWE2K20\bakedfile00.cak`; Oodle `oo2core_7_win64.dll` [HEP].
- 2K19 decoded source: `...\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin` and `..._entry_1_(ZLIB).bin`; crosswalk `...\2k19-2k25-victory-6100-crosswalk.json` [HEP].
- 2K25 target specimen: `D:\wwe 2k25 mods\extracts\Root\Animation\Victory\6100.clips` + `.adefs`; alt `C:\Games\2k25-extracts\Root\...` [HEP].
- 2K26 extract: `D:\games\2k26-extracts-2\aurora-full-extract-v116-20260903-221507` (many real `.clips/.adefs`, e.g. `Animation\Acts\Basic\MotionArea_*.clips`) [HEP].
- Test bake `thisistest2.cak` = 55,837,764 B SHA `191E49AE…`; 129 files, FDIR 9.3; contains CutsceneNoRegistry 95,552 / EntranceListData 357,552 / VictoryListData 33,000 / ENG.sdb 6,778,433; accepted, no new entries (window-thread loader) [ALL].
- 2K22 reference: exe `CF1ED486…`, Oodle `019CAFD2…`, 8 CAKs (sizes listed), 262,956 files, build 1882/changelist 1101457 [CR].
- Ghidra 12.1.3 official SHA `93a5d11a9ad510622acaaf908c556a7b9b764d338e78a7567f3689bf5081fd54` [CR].
- MyGM $50M example: CakeView 1.14.1.0 CAK 3,098 B SHA `1A39A717…`, live UI verified 30 Aug 2026 [ALL].

# HOUSE RULES

- Never rebuild stock JSFBs — clone + in-place edit only [NSP].
- Never touch v1.23 (owner: DONE). Don't edit snapshots (`latest\`, `Aurora Forge Sept 20\`, `_worktrees\`) [NSP].
- ONE registry-changing CAK per test; BOM-free manifest; copy + SHA-256 verify when staging [NSP].
- "Loader accepted" ≠ works in game [NSP][SDCL-SEC].
- `forge2\` — NEVER ENTER [NSP].
- New IDs start at 14000 (house) but current owner rule = 16086 (sec8 max 13086 + 3000) [ALL][NSP].
- Never commit/package game files, Oodle, extracted assets, captures, prior addon binaries, research dumps, rollback copies, decompiler projects [MAST][C25].
- Exact-build fail-closed: never update only a hash without validating complete RVA/ABI profile [MAST].
- Preserve provenance wording: human-created addon first; AI assisted security audit; not a formal clean room [C25][MAST][SDCL-CODEX].
- Every first-party release/explainer doc must start with the exact readability note [C25].
- Do not build/launch loader without owner go-ahead; owner compiles releases [MAST][2K22S].
- Status labels mandatory: Ready / Experimental / Research [MAST].
- Newest-code-wins; inspect status/history before editing; never reset/clean broadly [ALL][MAST].

# GOTCHAS / DEAD ENDS (do not repeat)

- Window-thread / too-late mounts never register rows; worker-thread direct mount crashed and was removed; hardware-trigger crashed; "worker-thread mounts crash" was an artifact of wrong ABI/point, not fundamental [ALL][C25].
- Wrong v1.23 phase prologue made the signature poll never match (earlier `…10…18…56 57 41 55 41 56` wrong) [ALL].
- Rejected mount candidate `0x2DFD42` (subtracting the 2K26 delta) lands inside a caller — keep as regression guard [C25].
- 2K22: no separate victory list; 2K25 `Entr` navigation pattern does not fit 2K22; SDB strings are not a registry; character folders are models/textures only; `Animation\Data\` is a 36 B stub [LR].
- TBUF field-relative hypothesis fully refuted (descriptor words are not offsets; A = at48[4]+u48+16 produces out-of-bounds); 487-file match was coincidental [LT].
- Old claim "exactly 221 Opcode 0 body runs" not trustworthy; "second non-ULEB codec" claim false [HEP][ALL].
- Descriptor at60[1] matching prefix is NOT sufficient for simplicity (12 offsetExpanded files exist) [LT].
- Do not use the cracked CakeView variant; do not assume CakeTools has an Export All [HEP].
- Mounting a v1.23-era CAK into SNME hung once — CAK must match target build's table format [ALL].
- PowerShell `Set-Content -Encoding UTF8` writes a BOM → loader rejects `mod manifest invalid`; use `[System.IO.File]::WriteAllText($p,$json,(New-Object System.Text.UTF8Encoding($false)))` [NSP].
- `Compress-Archive -LiteralPath` with a wildcard silently creates no ZIP (Foundry ACF-177-009) [FNDBUG].
- 2K26 string-table decoder started records 2 bytes late (ACF-177-006); protection checksum must cover only declared section bytes, not alignment padding (AFC-178-002) [FNDBUG][FNDFIX].
- HideCtrlData.hidelink.jsfb = red herring for entry registration (owner ruling) [ALL].
- 2K25 build 1.23 is dead; SNME is the only target [NSP].
- Blender Addon v2.10.3 has NO YANM reader/importer — do not expect animation import from it (only Yukes PAC/YOBJ + armature builder) [MDL].
- 2K22 payload-key derivation still unresolved; must be deterministic from archive data, never a shipped key table [CR].

# TOOL INVENTORY (paths + purpose)

- Registration writers: `tools\append-2k25-*` (8 files; victory/entrance/cutscene/teams/charmapping/cammove/facetextures/charmoveset/charprofilepro/charprofiletable/hidemotion/sdb) [NSP].
- Orchestrator: `tools\bakeme-orchestrator.js`; config example `tools\bakeme-orchestrator.test.js` [NSP].
- Entrance editors: `append_2k25_entrance_clone_graph.js`, `edit-2k25-entrance-entry.js` (aliases `--motion --title-motion --mitb-motion --double-title --music --gfx`), `edit-2k25-victory-entry.js`, `list-2k25-options.js`, `sdb-name.js` [NSP].
- Codec: `build-imported-clips.js` (sectionIndex/SUPPORTED_TRACK_TYPES), `clips-layout.js`, `scan-clips-corpus.js`, `compare-motion-metadata.js`, `inspect-track-codec-candidate.js`, `score-group90-op0.js`, `summarize-track-descriptor-patterns.js`, `pretty-jhips-report.js`, `yanm-keyframes.js`, `export-yanm-ir.js`, `yanm20-bridge-inspect.js`, `yanm20-body-table-report.js` [HEP].
- 2K19 extraction: `tools\extract_2k19_pac.py`, `tools\reference_unbpe.c`, `tools\inspect_2k19_shdc.py`, `tools\decode_2k19_menu_payloads.js`, `tools\analyze_2k19_menu_templates.js`, `py -3 tools\parse_2k19_cae_menu.py` [PKG].
- TBUF research (2K22): `tbuf-v1.js`, `amym-tbuf-report.js`, `tbuf-v1-body-candidate-record.js`, `tbuf-v1-body-prefix-corpus.js`, `tbuf-v1-track-probe.js`, `tbuf-v1-relocations.js`, `tbuf-v1-relocation-report.js`, `tbuf-v1-body-offset-hypotheses.js`, `descriptor-full-analysis.js` [LT].
- Bridge/converter: `staged-pipeline.js` (19→20 and 20→22), `patch-acts20-yanm.js`, `batch-2k19-to-2k20-victory-packages.js`, `build-2k19-to-2k20-victory-package.js`, `amym-container.js`, `fop19-evd20-body-model.js` [LT].
- CAK readers/builders: `Aurora-CAK-Foundry\electron\cak20-reader.js`; Foundry 9.3/9.9 backends; reference `Bakery-git\CakeTool\*` (CakeFileBuilder, CakeRegistryFile, CakeCryptor, ChaCha20, SFMT, FNV1A64, CRC32C, Oodle.cs) [HEP][ALL].
- Loader: `Secure-DataCtrlLink-WWE2K25` (core) + `Aurora-Forge-CAK-Mod-Loader-WWE2K25` (addon; `mod_loader.cpp`, `profiles.cpp`); build via repo `build.ps1` with LLVM-MinGW [ALL].
- App/release: `npm run verify`, `verify:cak20`, `build:pac19-helper`, `verify:pac19`, `build:portable`, `npm run test-manager` [2K22S][CV].
- Ghidra: `ghidra_scripts\AuditReport.java`, `BakerAudit.java`, `ExportAllDecompiled.java`, `FocusedDecompile.java`, `TargetAudit.java`; `_research\inspect-wwe-runtime.py`, `scan-wwe2k25-runtime.ps1`, `analyze-2k25-phase.py` [ALL].

# FILE-FORMAT FINDINGS (quick reference)

- **FDIR/CAK**: 8-byte header `FDIR`+version; 5 sections (dir-lookup, file-lookup, file-info, dir-info, string-table); 12-byte EntryLookup (u64 hash + u32 flags; bit31 = empty); FileEntry ≥9 = `0x22+chunks*4`; `_textures.tdb` magic `T_DB`; version byte 25 = 9.3; filename-derived key → no rename [ALL][FNDBUG].
- **JSFB**: FlatBuffers; 2K25 `Vict` 10-field victory records, `Entr` 11-field entrance records; other ids `Char`, `Prof`, `StAl` (MyGM Params) [LR][ALL].
- **SDB**: XOR payload string store (`XLOC`); not a registry [NSP][LR][ALL].
- **clips/adefs**: 2K25 modern animation container; `6100.adefs` wrapper uses ZLIB (not Oodle); `6100.clips` 64 body tracks incl. 2 target-only; Group78 descriptors + Group90 ULEB tokens [PKG][HEP].
- **ACTS/EVD (2K20)**: OODL-wrapped, inner AMYM + embedded YANM; 40-byte `0x2100` records; two 8-byte triplet streams [HEP].
- **YANM (2K19)**: 62-track body sections; 12-byte guarded header-preamble variant exists; 4-byte keyframes (uint16 delta + int16 value) [PKG][LT].
- **TBUF (2K22)**: 16-byte TBUF + 8-byte ANIM header; self-relative relocation table at TBUF+16+declared size [LT].
- **Wwise**: AKPK table validation; music bank rebuild 1,041,380 B; FNV-1 event hashing; absolute-path registration required (relative → result 66 `AK_FileNotFound`) [SDCL-REN][SDCL-CODEX].
- **Bink**: unresolved external payloads are `KB2n` Bink 2 video [ALL].

# PRODUCT / STATUS / PROVENANCE (batch 4)

- Current mission: make NEW 2K25 entrance entries play their OWN converted 2K19 animation on SNME only; work in `...\WWE2K19-to-2K26-Entrance-Prototype\` [NSP].
- Proven: Victory path end-to-end (2K19 → clips replace → registration → in-game distinct motions); entrance codec decode; mono entrance build files; byte-preserving JSFB editing [NSP].
- Not yet proven: entry appears with full registration chain; secondary (trk10/`0x2300`) track support; full-library batch; app wiring; additive `TEST 14000` picker [NSP][CV].
- Converter status: Beta1.0.0c "controlled WWE 2K25 replacement ready for owner testing, not a final compatibility claim"; root/pose alignment + facial conversion experimental [CV].
- Hub roadmap: #12 "Edit Entrances and Victories", #25 "Preview and Edit Animation Clips", #30 "Move a 2K25 Mod into 2K26" remain Coming Soon; Ready list = 9 operations [TRB][2K22S].
- Provenance (canonical): DataCtrlLink was working human-created software before AI; AI assisted audit/rewrite; no Tribute/PWM/CakeHook source available/copied; not a formal clean room; compiled third-party behavior inspected for interoperability only [MAST][SDCL-CODEX][V176].
- Authority rule: on conflicting notes, the original code version reported working wins — published SDCL releases (notably `forge2\sdcl-release\Secure-DataCtrlLink-WWE2K26-1.7.6 sorry i hurt your feelings edition\` + `SHA256SUMS.txt`) [ALL].
- PDFs are unreadable by this model (e.g. `DataCtrlLink_Plain_Language_Guide.pdf`) [ALL].

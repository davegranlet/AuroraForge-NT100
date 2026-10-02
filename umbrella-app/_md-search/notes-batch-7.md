# Notes — batch-7 (54 files)

Source list: `_md-search\batch-7.txt`. All facts cite the source file; abbreviations:

- `KN` = `...\WWE2K19-to-2K26-Entrance-Prototype\knowledge.md`
- `AS` = `C:\AuroraForge-Aug26\latest\Aurora-Forge-WWE2K19-Animation-Research\AURORA_FORGE_ACTIVE_STATE.md`
- `AS-A` = `_archive\workspace-consolidation-2026-09-20\...\WWE2K19-to-2K26-Entrance-Prototype\AURORA_FORGE_ACTIVE_STATE.md`
- `H22` = `C:\AuroraForge-Aug26\HANDOFF-2026-09-22-1.0.0d-OWNER-BRANCH.md`
- `XFR` = `...\WWE2K19-to-2K26-Entrance-Prototype\AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-13-CURRENT.md`
- `CHAT` = `...\WWE2K19-to-2K26-Entrance-Prototype\CHAT_TRANSCRIPT_FOR_TRAE.md`
- `CAT` = `...\WWE2K19-to-2K26-Entrance-Prototype\notes\LOG-TOOL-CATALOG.md`
- `STS` = `...\WWE2K19-to-2K26-Entrance-Prototype\notes\STATUS-SUMMARY.md`
- `CATSRC` = `...\WWE2K19-to-2K26-Entrance-Prototype\notes\2026-09-12-extracted-animation-catalog-sources.md`
- `MDL` = `...\notes\2026-09-12-wwe2k-mdl-source-audit.md`
- `ARCH` = `...\Secure-DataCtrlLink-WWE2K25\docs\ARCHITECTURE.md`
- `SDCL25` = `...\latest\Secure-DataCtrlLink-WWE2K25\README.md`
- `README26` = `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\README.md`
- `F177` = `...\Aurora-CAK-Foundry\package-tests\hidden-references-final-20260906-2330\AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md`
- `R178` = `...\Aurora-CAK-Foundry\build\standalone-cak\AURORA_CAK_FOUNDRY_v1.7.8_FIX_REPORT.md`
- `INST` = `...\Aurora-CAK-Foundry\build\standalone-cak\INSTALLATION_AND_ROLLBACK.md`
- `TUT` = `Aurora Forge Sept 20\Aurora-Forge-2K19-to-2K20-Converter\docs\2K19-TO-2K20-CONVERTER-TUTORIAL.md`
- `WW` = `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\third_party_reference\wwiser\doc\WWISER.md`
- `R180` = `...\RELEASE_NOTES_1.8.0-beta.1.md`
- `A04` = `C:\AuroraForge-Aug26\allfiles-04-release-archive.md`
- `CKP` = `...\Aurora-Forge-Knowledgebase\status\WWE2K25-V123-OVERRIDE-TEST-CHECKPOINT-2026-09-08.md`
- `CER` = `...\docs\CAK-EXTRACT-REBUILD.md`
- `LCR` = `C:\AuroraForge-Aug26\latest\LATEST-CONSOLIDATION-REPORT.md`
- `BOOT` = `_archive\handoffs\Aurora-WWE-Project-Knowledge-Pack-2026-09-05\knowledge\BOOTSTRAP_PROMPT.md`
- `GQ1..GQ5` = `ghidra_12.1.3_PUBLIC` docs (Ghidra tutorials, no WWE content)
- `FAQ` = `...\FAQ.md`; `PP` = `...\PUBLIC_POSTS_v1.7.5.md`; `RN16` = `...\RELEASE_NOTES_1.6.0_RC1.md`
- `M177` = `...\Aurora-Forge-CAK-Mod-Loader-WWE2K25\docs\RELEASE-NOTES-1.0.02.md`; `MT` = same repo `TESTING.md`
- `SDCL26B` = `Aurora Forge Sept 20\Secure-DataCtrlLink-WWE2K26\docs\BUGS-AND-FIXES-1.7.7.md`
- `ROLL` = `local-release-archive\WWE2K25-loader-pre-v1001-20260906-1955\ROLLBACK-INSTRUCTIONS.md`
- `PROV` = `Aurora Forge Sept 20\Aurora-Forge-Custom-Music-Loader-WWE2K25\docs\DEVELOPMENT-AND-PROVENANCE-FAQ.md`
- `PACS` = `Aurora Forge Sept 20\Aurora-Forge-2K19-PAC-Tools\README.md`; `CAP` = `Aurora Forge Sept 20\Aurora-Forge-Converter-App\README.md`
- `SEP` = `...\Aurora-CAK-Foundry\docs\SOURCE-SEPARATION-BUGS-AND-FIXES.md`
- `CMREADME`/`CMRC` = Custom-Music-Loader README / release README; `TPL` = release-note templates (2K26 + MusicOnly, identical text)
- `MFIX` = `...\Aurora-CAK-Foundry\build\clean-package-test-v1.7.7-final\AURORA_CAK_FOUNDRY_v1.7.7_FIX_REPORT.md`
- `T26` = `...\Secure-DataCtrlLink-WWE2K26\TESTING.md`; `RB26` = `...\RELEASE-NOTES-1.7.7.md`
- `KF` = `Aurora-Forge-Custom-Music-Loader-WWE2K25\README.md`; `RES` = `_work\Aurora-Forge-Research\README.md`

---

## ANSWERS TO THE 10 QUESTIONS

### Q1. Which row to clone as template for new entries in each registration file

- **VictoryListData.jsfb**: clone a visible stock Victory template row; the proven clone target is **The Rock's template ID 100** (`--clone-id 100`). v7 control was "a full clone of current visible template ID 100 (The Rock) in section 8, with only its ID changed to 14000 and name-string changed to Draven. It preserves the clone's 12-field vtable, hide metadata, and all other scalar fields" (KN:183-191). Clean-room writer `append_2k25_victory_entry.js` reads the current `Vict` FlatBuffer, rebuilds all records, preserves absent optional fields as absent, then appends (KN:552-562). Tribute's own generated 14000 row was **index 654** (KN:526-540).
- **EntranceListData.jsfb**: new rows go in **section 8 (template vector)**. v7 cloned "current visible template ID 100 (The Rock) in section 8" (KN:183-191). v4 appended section-8 record with id 14000/nameString 4294957742/type 1/field4-9 (KN:307-317). BakeMe's new record landed at **index 673** (KN:275-297).
- **CutsceneNoRegistry**: clone a **same-shape stock template table** and splice one vector slot; v103a appended "Cutscene 14000 (template 6100, name 4294957753) via shared-vtable splice" (AS:166). Tribute 26 v1.6.0's family tables are **22 bytes**; stock families mix **28/32/36/40-byte** tables (AS:149-150, 166). Our original 32-byte appender refuses the 22-byte family (AS:150).
- **ENG.sdb**: append one string record; no clone row (KN:564-584).
- **Extended tables (six writers built 2026-09-21)**: "clone a same-shape stock record, patch ID/name words only, splice one vector slot, repair every crossing reference, validate count+1 + new row + every old row identical" — applies to teams, character-mapping, CAMMoveData, FaceTextures, CharMoveSet slot, CharProfilePro, CharProfileTable, HideCtrl-motion (AS:18-19).
- **CharMoveSetDataTable.jsfb**: Tribute's editor does **not** change it; registration/naming is separate from assigning a template to a wrestler (KN:516-517).

### Q2. Which files MUST be written for a new entry to appear in-game and play (tested file sets)

- **Minimum proven-by-test sets:**
  - Victory-list + SDB only → **insufficient** (v2/v3: mounted, stock text fine, Draven invisible in both Motion and Template lists) (KN:362-369, 275-297).
  - EntranceListData + VictoryListData + ENG.sdb (3 files, v4/v5) → v4 crashed at intro; v5 loaded but Draven still invisible (KN:319-327, 249-271).
  - clips + adefs + VictoryListData + CutsceneNoRegistry + SDB (5 files, v102g / 6185 registry-inclusive, `fileCount=5`, 5,053,772-5,053,756 bytes) → mount accepted `accepted=1 rejected=0 failed=0`, game loaded crash-free, but **TEST 14000/6185 absent from picker** — remaining variable is serving order/mount timing (AS:267-273, 171-176, 429-441).
  - Full Tribute aggregate (v103a, 130 source files + baker `_textures.tdb`) → crash-free full-aggregate mount, still no picker visibility (AS:164-176).
- **Tribute's own recipe**: Victory + Entrance + Cutscene + SDB, **zero new asset files** (v1.6.0) (AS:149); Tribute 25 v1.5-merged recipe is **3 files, no Cutscene** (AS:183-187).
- **Working conclusion (batch evidence)**: for a new *animation* the candidate file set is `Animation/<id>.clips` + `Animation/<id>.adefs` + `Entrances\EntranceListData.jsfb` + `Entrances\VictoryListData.jsfb` + `Cutscene\...\CutsceneNoRegistry` (+ `EntranceMotionTableData.jsfb` per catalog notes, CATSRC:7) + `Sdb\ENG.sdb`; offline all linkages pass, in-game picker visibility is **unproven** and blocked on pre-frontend mount timing (AS:175-176, 188, 271-273).

### Q3. Name/string id scheme (SDB ids, negative ids, hashes)

- **ENG.sdb format**: `u32` version (256) + `u32` record count + sorted 12-byte records `(absolute offset, byte length, unsigned string ID)` + null-terminated rolling-XOR UTF-8 strings (KN:566-574). Cipher: `firstKey = (absoluteOffset & 0xff) ^ 0xcd; cipher[0]=plain[0]^firstKey; cipher[n]=plain[n]^cipher[n-1]` (KN:575-581).
- **Negative/signed IDs**: strings are unsigned `4294957742` = signed `-9554` (Draven); stock ENG.sdb ends at signed `-9555` (KN:583-584). Other observed: `-9545`/`4294957751` = `watchvictory`, `-9550`/`4294957746` = `test4` (KN:140-145, 159-166). Tribute 26 v1.6.0 SDB next available ID was `4,294,957,742` (AS:241).
- **Record counts**: stock ENG.sdb 96,477 records (KN:583); v102i 96,290 / v160 113,783 / 2K26 113,779 (AS:202, 241); v160 SDB 7,252,991 bytes (AS:128); one 2K25 stock base 6,826,851 bytes (AS:432).
- **SDB gotcha**: appending a table record shifts every payload by 12 bytes, changing every first key; the writer must decode old strings with old offsets and re-encode with new (KN:586-601). A fixed `0x31` first key is wrong (KN:588-590).
- **Hashes**: CAK virtual paths reproduce stored **FNV-1a 64-bit** hashes (F177:37-42); `.clips` track names resolved via FNV1a-64 (`fnv-track-resolve.js`, CAT:31); measured FNV-1a `clipNameId` helper in `tools/clips-layout.js` (XFR:47). Hide IDs are 64-bit (`7871869299616959835`, KN:526-540). Tribute 26 SDB payload cipher is a **2K26-generation** scheme that does not decode under the rolling-XOR model; Tribute 25 and the clean-room appender write stock-cipher payloads that 2K25 reads (AS:202-203).

### Q4. CAMMoveData (MoveData/CAMMoveData.jsfb) — role and values for a new motion entry

- `MoveData\CAMMoveData.jsfb` is part of the Tribute BakeMe baseline (KN:68) and one of the **extended registration tables** wired into the BakeMe orchestrator (AS:18-24).
- The 2026-09-21 batch built `tools/append-2k25-cammove-entry.js`; its pattern: clone a same-shape stock record, patch ID/name words only, splice one vector slot, repair crossing references, verify old rows unchanged + count+1 (AS:18-19).
- Orchestrator block name is `cammove` with verify ops (AS:22). No field schema/values are given in this batch beyond the clone/append rule; the roster-side ID choice for Pro/Table/Face was still the open semantic question (H22:59, AS:24).

### Q5. New-entry id numbering rules

- **New animation IDs start at 14000; 6185 is taken** (H22:63). Stock Cutscene 6185 = `THE USOS 1`; a duplicate append had failed before (AS:256). The Cutscene appender now **rejects** an existing motion ID (e.g. 6185) before serialization (AS:260-264).
- Tribute test IDs observed: 14000, 14001, 14002, 14003 (KN:520-524), HideCtrl oracle 14004 (AS:20). Tribute's new content generally gets IDs **above vanilla range** (wrestlers 1500+) (CAT:162).
- ID 14000 verified free in stock inputs: absent from 2,160-entry stock Cutscene registry, 680-row stock VictoryListData; SDB next test-string ID reserved (AS:260-264).
- New string IDs: next free SDB record (KN:583-584). New hide ID used by Tribute rows: `7871869299616959835` (KN:526-540).

### Q6. EntranceListData row field values for new entries

- v4 appended section-8 template record (KN:307-317):
  ```
  id: 14000
  nameString: 4294957742 (-9554 / Draven)
  type: 1
  field4: 852
  field5: 852
  field6: 1161
  field7: 26008
  field8: 2236
  field9: 10226
  ```
- Tribute v1.6.0 entrance recipe: sec8 row `14000` / name `4294957742` / `type 1` (AS:149). Tribute 25 v1.5-merged: sec8 row `14000` / name `4294957742` / `type 1` / f4-f5 stock refs (AS:185).
- File shape: stock EntranceListData.jsfb = 358,752 bytes, nine root fields/vectors (CATSRC:5); current game had 6,275 records across those vectors and 666 nonzero field-3 hide IDs (KN:301-305, 258-264). Tribute entrance-only save: 357,568 → 357,592 bytes (KN:134-136). Preserving-graph writer output: 361,616 bytes, 678 templates (KN:232-239).
- **Gotcha**: some EntranceListData `u32` fields are FlatBuffer offsets, not scalars; rebuilding them as scalars produced a structurally parseable but runtime-invalid list (v4 crash) (KN:328-336).

### Q7. VictoryListData vs EntranceListData (separate tables, row shapes)

- Both live under `Entrances\` but are separate files: `EntranceListData.jsfb` (358,752 bytes stock; nine root fields; section 8 = templates) and `VictoryListData.jsfb` (33,208 bytes stock; nested root-table field) (CATSRC:5-6; KN:232-239, 301-317).
- Victory row shape (Tribute 14000 Draven, KN:526-540): `entry/template ID, nameString, type, hideId, someId/base, victoryFace, victoryHeel, titleVictoryFace, titleVictoryHeel, doubleTitleVictoryFace` — 10 fields; v7 notes the stock clone carries a **12-field vtable** (KN:183-191).
- Counts: stock Victory 680/661/681 rows across snapshots; Tribute 655/657; current updated game 661 (AS:263, 270; KN:545-548). VictoryListData 49,076 bytes in a 5-file package (AS:432).
- Saves are independent: Entrance-only save changed only EntranceListData + SDB; Victory-only save changed only VictoryListData + SDB (KN:134-138).
- Tribute VictoryListData diff vs stock: added rows 14000/14001/14003, removed 7 rows (1382-1402 range), changed 136 (string-pool rehash + type flags; motion IDs untouched) (CAT:169).

### Q8. How animation files are registered (Animation/Entrance/<id>.clips, .adefs, CaeAdvanced, CutsceneNoRegistry, motion tables)

- Modern motion pair is `.clips` + sibling `.adefs`; native loader derives the `.adefs` path by extension replacement from the chosen `.clips` and parses `adef`/`args`/`cmds`/`proj`/`rmts` chunks (XFR:111-113). `.adefs` is a **zlib (78 DA) v6 envelope**, not Oodle (CHAT:969-971; XFR:53-68).
- `.clips` record layout (native parser `FUN_1400023a0`, 200-byte AnimClip record): five variable tables in order — `trackCount*8` @+0xA0, `group38Count*4`, `group60Count*8`, `group78Count*8`, `group90Count*8`; loaded into AnimClip fields +0x20/+0x40/+0x70/+0x90/+0xB0. For a 73-bone fixture `438 = 73*6` Group78 descriptor words; per-bone decoder reads six descriptor words from +0x90 (XFR:127-131).
- Native writer `FUN_14001d4c0` emits vectors in exactly: 64-bit track IDs (+0x18), 32-bit Group38 (+0x38), 64-bit Group60 (+0x68), 64-bit Group78 descriptors (+0x88), 64-bit Group90 words (+0xA8) (XFR:153-155).
- Group90 primitive: little-endian arbitrary-width bit reader (`FUN_140004600`); descriptor = signed low byte, bits 8-15 width, high uint32; scalar expansion `float(highUint32Bits) + packed * ((signedLowByte + 0x7F) * 0x800000)` (XFR:131-147).
- CutsceneNoRegistry: stock 2,160 entries (AS:263); registry grew 97,032 → 97,068 bytes for one entry (AS:432); Tribute v1.6.0 2,342 entries, v103a 2,127/2,128 (AS:149, 166, 144).
- Catalog tables discovered in 2K25 root (CATSRC:5-11): `Entrances\EntranceListData.jsfb`, `Entrances\VictoryListData.jsfb`, `Cutscene\ListData\EntranceMotionTableData.jsfb`, `Animation\Data\GameAnimData.jsfb`, `Animation\Data\MotionAreaData.jsfb`, `Roster\CharMoveSetDataTable.jsfb`, `Gameplay\MotionParameter\MotionParameterGroup.jsfb` (need schemas; generic FlatBuffer inspector only verifies roots).
- 2K20 census (Winn): `WinningCastSettingsData` 38x{motion,cast} (8701/8703; 6100 absent), `WinningCommonEventNoData` 53x{event}, `RingOutWinning` 1x{6139}; `EntranceMotionTableData` 40x5 = **entrance-range only (29000s)** — 6100-class victories need none (CAT:165). Victory-6100 full set = acts + evd + CharProfilePro pairs + EntranceListData motion record (1452-record registry, 209 victory-range, 6100 present) + TronSetup ID array; missing pieces were "#4 append + #5 append" needing FlatBuffer vector-append tooling (CAT:166).
- Entrance partitioning: `Animation\Entrance\100.clips` holds the same 35 clip records as the five `CaeAdvanced` Rock phase files, only reordered/split 5/5/5/9/11 (CHAT:955).
- 2K19 side: `pac\evt\06100.pac` → decoded `0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`; `pac/menu/cae_item.pac` entry 0/0 = 217 CAE records; record 0 maps event `10000` → PAC `100` → `pac/evt/00100.pac` (CHAT:840-858; TUT:44-60).

### Q9. Which tool/flow builds the CAK for a new entry

- **Foundry CLI** is the bake path (KN:441-446):
  ```
  node '...\Aurora-CAK-Foundry\scripts\bake-v93-cli.js' --source <Root> --output <cak> --oodle <game>\oo2core_9_win64.dll
  ```
  Later: bundled self-contained `FTribTool.exe` + FDIR 9.3 + encrypted header; DLL-backed invocation needs a local .NET 9 host, else self-contained backend (AS:9). `--encrypt-header` used for control bake (AS:128).
- Orchestration: `tools/bakeme-orchestrator.js` copies a source BakeMe dir to a fresh output dir, applies allowlisted asset copies and active registry/string edits (SDB, Victory, Entrance, Cutscene + 8 extended blocks), writes `aurora-bakeme-proof.json` (AS:73, 22). Suite driver `pipeline-editor-suite.js` maps active/coming (AS:90).
- Writers: `append_2k25_victory_entry.js`, `append_2k25_entrance_entry.js`, `append_2k25_entrance_template_entry.js`, `append_2k25_entrance_preserving_graph.js`, `append_2k25_entrance_clone_graph.js`, `append_2k25_sdb_string.js`, `append-cutscene-entry.js`, plus 2026-09-21 six (`append-2k25-teams-entry.js`, `append-2k25-character-mapping-entry.js`, `append-2k25-cammove-entry.js`, `append-2k25-face-textures-entry.js`, `append-2k25-charmoveset-slot.js`, `append-2k25-charprofilepro-entry.js`, `append-2k25-charprofiletable-entry.js`, `append-hide-ctrl-entry.js`) with shared `tools/jsfb-append-lib.js` (CAT:87-100; AS:18-19).
- Converter chain: `staged-pipeline.js` (19→20→22→23→25; only verified writers execute), `aurora-converter.js` CLI (19→20 only), `convert-yanm19-to-yanm20.js` (CAT:41-49). Modern 2K25 writer status: reader complete/writer in progress (STS:21, 91); later "codec is cracked and V1/V2 bit-identity gates pass; the split codec batch is committed; the importer smoke build produces a parseable modern `.clips` container" (AS:404). Bundled app: "Aurora Forge Animation Converter Beta1.0.0c … builds replacement `.clips` output and a loader-ready CAK candidate" (R180:10-16).
- **CAK naming rule**: FDIR 9.3 protected-archive keys are derived from the CAK filename; do not rename — rebuild under the final name (R178:5; SDCL25:128; INST:24).

### Q10. Intended end-to-end user flow

1. **2K19 source**: copy/extract one matching `pac\evt\<zero-padded id>.pac` (e.g. 6100 → `06100.pac`), decode to the `*_entry_0_(ZLIB).bin` body motion (TUT:44-60). Do not extract the whole game (TUT:17-19).
2. **Convert**: decoded 2K19 motion + 2K25 template → modern `.clips`/`.adefs` (importer produces e.g. 555,592-byte `14000.clips`, 4,206-byte `14000.adefs`) (AS:270); the 2K19→2K20 bridge is the proven stage-one path (TUT:1-7; XFR:41).
3. **Create entry**: run appenders/orchestrator to add the new row (Victory + Entrance sec8 + Cutscene + SDB, plus extended tables) using ID 14000 and clone-based row surgery (H22:54-59; AS:22-24).
4. **Bake**: Foundry `bake-v93-cli.js`/FTribTool, full aggregate, under the intended final filename; verify reopen + every payload byte-for-byte (AS:9, 218-220; MFIX:29).
5. **Stage**: one registry-changing CAK in `<game>\mods` enabled via `mods\manifest.json` `cakOrder`; never overwrite stock CAKs (KN:459-488; H22:64).
6. **Game test**: launch WWE 2K25 → MOVE-SET → wrestler → Victory → check `MOTION: FACE` list and preview; user-run verdict required before any validity claim (KN:452-457; AS:386-389). Loader log: `<game>\DataCtrlLink.log`.
7. **App surface**: flagship Electron shell (`AuroraForge_WWE_PC-Game_Modding_Tool` v1.7.5) with Conversion Lab / CAK Foundry / DDS / Mod Workshop sections; Beta app UI = hero "Build Test Package" + 2K19/2K20/2K25-replace flow; Patreon/Discord gate on normal branch, `owner` branch gate-disabled (H22:11-24; AS:190-194).
8. Umbrella beta bundles "WWE 2K25 v1.23/SNME loader pair with checksum-verified boot-thread CAK mounting" and converter Beta1.0.0c (R180:10-12).

---

## VERIFIED FACTS — HASHES, PATHS, COUNTS

### Game builds / executables
- WWE 2K25 v1.23 exe SHA-256 `b608e7ed18bfb6291ca195532accf40081cbf1a1f4850e63943906d155b9ac98` (SDCL25:61). Only this profile approved; unknown hashes fail closed (SDCL25:11).
- WWE 2K26 approved exe hashes: `dfb08c59f547ccd9c2a5820dd7520af064ca93d8642959b9f005e0c6f2958466` (original), `7f558607bd6881c4547d752ea107fb03282a2980e47ef19ade597e096de4a0e9` (v1.14), `5f82c813e905ceb96053280cf3488f7f54bc35258c1a0eb027355d45f6c56da7` (v1.16) (README26:61-63).
- Game installs referenced: `C:\WWE 2K25 Saturday Nights Main Event` (KN:463), `D:\WWE 2K25-1.23\WWE 2K25` (CHAT:888), `D:\games\WWE 2K26` (v1.16, CHAT:170), `D:\Program Files (x86)\Steam\steamapps\common\WWE2K20` (AS-A:90).

### 2K19→2K20 bridge (proven)
- Source: `analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`; reference `D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.acts` (AS-A:37-43).
- Output `victory-6100-2k20.yanm20.bin`: 174,976 bytes, 63 records, 62 motion tracks, both streams on every track; packaged-runtime output SHA-256 `544CC0CE567F346E859F2897167A69828F76147D757A8CB41B4CB062BB025462` (AS-A:45-84; TUT:154-181). Converter default 2K20 YANM offset `37212` (TUT:150).
- `0FOP→EVD` body model reproduces all 33 modeled body conversions byte-for-byte (6100/6101/6102, indices 1-11) (XFR:43).
- Format chain (STS:15-23): 2K19 = YANM keyframes in PAC(0FOP); 2K20 = YANM stream records in AMYM; 2K22 = TBUF/ANIM v10; 2K23 = TBUF in MINA; 2K24/25 = modern `.adefs`+`.clips` FlatBuffer. **AMYM is byte-identical 2K20↔2K22**; only payload changes YANM→TBUF (STS:23). TBUF header: 16-byte TBUF + 8-byte ANIM; +12 is relocation count; relocation table at TBUF+16+declared data bytes; validated across 743 files/5,687 blocks (STS:36-39).
- TBUF descriptor model: Simple 711 files / Descriptor-expanded 19 / Offset-expanded 12; descriptor = scale (high byte), variant (mid byte), unique ID (low 16 bits) (STS:41-48).

### Modern 2K25 assets
- `14000.clips` = 555,592 bytes, parses as 17 records, imported-motion hash `31A9A292...`; `14000.adefs` = 4,206 bytes (AS:270, 167, 122). 6185 package mirrors this shape (AS:411).
- 2K24 6100 adefs: 4,154-byte envelope, expanded 31,043, payload SHA-256 `5D31B7AA91B5990CF50C1CD4BE71E3CA59B74AADFD32E7AAB8ED02979439BBC0`; 2K25 6100: 4,208-byte envelope, expanded 31,169, payload `829A8227193562EADF1501930EB455B6FA74400118FA582B015C211D95D40C55`; 15,086 bytes differ, first diff at payload offset 12 — **not safely copyable** (XFR:64-68).
- Fixture `record1_original.clip` ID `0xE9EB9C7CBB3BDAC0`, 9,920 bytes, 60 fps, frame 111, 73 tracks, 438 Group78 descriptors, 709 Group90 entries (XFR:50). `test_anim.clips` record 1 first schedule: non-stepped run length 111, mode 0, next read bit offset 10 (XFR:141). Bone 1 descriptor 2 = `0x80000000000007F9` (low signed byte -7, width 7, high uint32 2147483648), 45,376 addressable Group90 bits (XFR:135).
- 2K19 SHDC shared metadata prefix hash `2E2F497E47020B3E5C16AB12055F1617B1D88C2D23E7EB13DE6F31729378F43A`; entrance 7 / victory 4 / CAE 10 OODL children; entrance children 1-6 = 974 bytes ~89-90% similar; victory children 1-2 = 2,480 bytes 85.4% similar (CHAT:646-672).

### CAK / archive
- FDIR versions: 2K25 = **9.3**, 2K26 = **9.9** (CHAT:911); 2K22 = 8.3 with ChaCha20 + MetroHash key derivation + RotateCrypt byte cipher (STS:75-76).
- Foundry 9.3 backend: 2K25 v1.23 = 15 archives, 386,873 files, 93,738 folders, 0 failures; `bakedfile02.cak` 53/53 named (MFIX:9-15). 2K26 v1.16 = 412,095 payloads + 279 zero-payload metadata refs, 15 archives, all paths named (F177:33-42, MFIX:33-39).
- Full merged 2K26 v1.16 extraction: 412,095 payloads, 279 refs, 0 failures, 96,368 same-path collisions (later archive wins), 379,454,432,701 bytes; full repack deliberately NOT done (CHAT:486-493, 511-556).
- Protected catalog is tied to final CAK filename; renaming unsupported (R178:5). Rebuild writes FDIR v9 catalog + hashed paths, protected payloads (key from archive key, stored size, final offset), root `_textures.tdb` v6 (16-byte empty DB ok for replacements; new texture hashes need populated DB) (CER:14-29).
- 2K25 v1.23 protected 2,004-file round-trip archive mounted `true`, `accepted=1 rejected=0 failed=0`, no crash (M177:5-15). Visible changed-asset override confirmed: `VISIBLE_CHANGED_ASSET`, accepted=1 (CKP:45-51).
- Loader mount contract: custom archive mode/slot `(2, 1)` on the game-owned window thread (CKP:23). Window-thread mount is the only stable path (A04:39-41).
- CAK manifest: `mods\manifest.json` allowlist with `cakOrder`/`packageOrder`; invalid manifest fails closed; no manifest → direct-child CAKs sorted lexically (CKP:20-22; SDCL25:86-100). `plugins/addons.txt` = addon allowlist + init order (SDCL26B:12-16).
- `DataCtrlLink.ini` bounded keys: MaxFileBytes 1-64MiB, MaxCustomPackages 1-16, MaxCakArchives 1-32, ReadyTimeoutMs 5000-300000, CakPostPrimeDelayMs 0-10000 (SDCL25:102-116); 2K25 addon also parses `RuntimePreWindowMount`, `EarlyPreWindowMount`, `DxgiOverlayNotice` (0/1, default 0) (AS:38).

### Loader binaries (2K25 line, chronological)
- Stable fallback pair: core `0BE398DA94F2913F05DAA3082DACE0803DB0CEE1BB25EC91D194E088D57BC563`, addon `2AA4C21D8CDFD814136D12298D0BDAB86541E1F2DCF1047BD988A087EACFF3F7` (AS:29). Known-good runtime core `92C26247...` (AS:135).
- Native mount-observer pair: addon `DFB9BFA98F582C5751548953334CA2E86332B8385BB1360C3F1399682652E70B` (1,636,864 B), core `4962599F25E6E1D75B520A4FFDF0B9DABCC5AB74706DC6D1FD0320F5AEBDC480` (1,609,728 B) (AS:31-33).
- Gated pre-window pair: addon `a808a933545e94e1b2400858c478b969cf80f4aea69b0c9fa61a0ffb0641f8e4` (1,644,544 B), core `1560642598000d0862c4082b327d27deba21384053ccfd78984e7953d5874f76` (1,607,168 B) (AS:39).
- DXGI/runtime-prewindow crash pair: core `02D6BFF68BDEB169F613D19F7820F02513541D7B151069171DE31B282DE3E91C` (1,605,120 B), addon `447B878E5973BAADC75A2379508BC82B8191A9F6137CA321F81F72FF444C3C33` (1,642,496 B); crashes ~2s after mount, dumps 475,854,567 B / 475,842,970 B (AS:46-52).
- Pre-v1001 loader-test evidence folder logs (window-thread mount works; returns false at that point) (A04:16-41; ROLL:1-15).
- Reproducible builds: LLVM-MinGW reproducible PE timestamp option makes identical builds hash-identical (SDCL26B:18-23).

### Test artifacts (2K25 registration)
- `aurora-victory-entry-14000-draven-v3.cak` staged, mounted accepted (KN:38-54, 494-499).
- v4 crash at intro; v5 SHA-256 `7A3EBB1513E8BE8C4426F52D8D78AC2EB96509DE2465D062720818DB14D7C157` (KN:324-327, 348-350).
- v6 SHA-256 `96DE8A22ACCE664BA990BDCA553420A13D4A876457279C8E612FE7B94B4D1530` (KN:191).
- v8 CakeView `aurora-v8-cakeview.cak` SHA-256 `37977D51AAEC2EF46248128B08D3573DEFF3BC957A28DFCACAE76276D32C6286` (KN:90-97); v8 test4 `618BD2F82F6F74E5DD48FAA53DBD51A98FC352B579542BFB4E281EC9C1800C39` (KN:171-172).
- v102g `4D32869DD9F9CD65CE2A0066B8F1F73D6CF48EAE443419422BD8791CAB752E86`, 5,053,772 B (AS:270); 6185 registry-inclusive `22D210A156B6996F01A38B0167BCA1280D5616CB9F9D632BF758C5CEA43E9455`, 5,053,756 B (AS:439).
- v102k `C1DE81250FE0CAA33246EED9FDB156835764EBA9D496CF6D6ACC5831996D4ACA`, 10,365,112 B (AS:112, 219).
- Control `control-untouched-tribute-v160.cak` `AE2AAD53D5A61A5EBF9742CED6A87FB9CF827E64FD264768CEB597B1367739E7`, 10,120,488 B, 62 files (AS:129).
- v103a `E57757C7...0578C`, 56,080,748 B, 131 files (AS:166); thisistest2.cak `191E49AECCB9A520D729FEEBA39F797177E8E9C7F113EA8718ABBECC8DAC206B`, 55,837,764 B (AS:10).
- Collision-rejected Tribute test hash `CA5E5F6C229F268CCFB12D2E612E433FF19121946AFA79372585DFD48279100F` (AS:451).
- Broken/never-stage partials: `control-original-tribute-v160.cak`, `control-original-unencrypted.cak`, `aurora-14000-tribute-v160-v102j.cak` (corrupt partials; `Num Files: 1653179904`) (AS:114, 122).

### App artifacts
- `Aurora-Forge-Beta1.0.0d-Preview.exe` 76,057,877 B, SHA-256 `35AE7A5662B4376D2CD08471A8C1BC1CC22ABF531D9E1B7AE679A32A144273AA` (H22:11-13).
- Beta1.0.0a previews: `F556E4C34CF2A08020966611828CE58DA8CC335D6AA0EF92837CD3540C8A00FE` (76,031,009 B), `8E8F3914115FD7A410F699E5C76A966412DE8AB7A6329C70178F4C04509B095B` (76,031,648 B), `3F368A5FA4E8041ACB40BFD14370AF9E97056B7D6993B55529D43A3D1A0D5D87` (76,028,440 B) (AS:58, 74, 82).
- v1.7.5 public ZIP SHA-256 `AE06262DEFC867B3B90AF33B9B1C4EC7CAC5021E1349EC9A406BF4A51D227DF0` (PP:82).
- Ghidra 12.1.3 ZIP SHA-256 `93A5D11A9AD510622ACAAF908C556A7B9B764D338E78A7567F3689BF5081FD54` (XFR:109).
- Converters: packaged Electron runtime proof (ELECTRON_RUN_AS_NODE=1); 122/122 source-tool suite, 11/11 bridge suite (AS-A:80-84). Later suites: 119/120/122, then 115/119/120 checkpoints (XFR:125, 141, 147); ADEF suite 5/5 (XFR:81).

---

## HOUSE RULES (all cited)

1. New animation IDs start at 14000; 6185 is taken (H22:63).
2. One registry-changing CAK per test (H22:64).
3. Copy, don't move; verify SHA-256 both sides (H22:65).
4. Commit/push/release only with owner's explicit yes (H22:66).
5. Never enter `forge2/`; never touch `D:\zips` (H22:67; AS:117).
6. Never overwrite stock game files/CAKs; modded CAKs go in `<game>\mods` via its manifest (KN:663-664; AS:322).
7. One exact user action only when an in-game test is required; never wait silently (KN:657-665).
8. Review existing research before new work; avoid repeating completed codec/parser/archive tests (KN:661, 666).
9. TRIBUTE (and Bakery/PWM) are behavioral oracles only — do not copy code (KN:667-668).
10. Version every product change; small changes use `1.1.1.a`-style suffixes (KN:669; RES:20-25).
11. Never whole-game extraction/repacking for the conversion task; bounded test specimens only (BOOT:15; CHAT:511).
12. Do not package game assets, Oodle binaries, extracted payloads, third-party executables, research dumps, or rollback copies in releases (BOOT:16).
13. Claim only what evidence proves; no in-game validity claim before user verdict (AS:391-399; AS-A:119-128).
14. Do not ask the user to repeat the canonical prompt, source map, exports, or completed tests (XFR:95-97).
15. CAK keys derive from filename — never rename a completed CAK; rebuild under the final name (R178:5; SDCL25:128).
16. Loader compatibility updates: reconfirm full exe hash, Wwise exports/ABIs, mount RVA/ABI, archive-phase RVA/signatures, timing, malformed-input rejection, visible/audible results — changing only `kExpectedExeSha256` is unsafe (ARCH:93-95).
17. `DllMain` does minimal loader-safe work; FS/hashing/validation/hooks/Wwise/notifications after attach (ARCH:85-87).
18. Fail closed: unsupported/ambiguous state disables the mod feature and logs; never guess addresses (ARCH:89-91).
19. Install requires closed game; rollback = remove `dinput8.dll`, restore backup; never restore/remove files while game runs (ROLL:5-15; SDCL25:130-134).
20. Public-repo separation: research/experimental findings stay private; releases get versioned notes and provenance statements (RES:13-25; PROV:126-141).

---

## GOTCHAS / DEAD ENDS (what NOT to repeat)

### Registration / visibility dead ends
- **v2–v9 name/ID oracle series all negative**: two-file Victory+SDB oracle (v9), v8 name/type-only patch of Victory record ID 1 (`DIRE INTENTIONS`→test4) not consumed, v7 normal-category clone invisible, v6 Custom Superstar tab invisible, v5/v4/v3 invisible or crash (KN:38-51, 83-129, 150-228, 249-297). "Do not repeat v5/v6/v7/v8/v9."
- **v4 crash cause**: rebuilt EntranceListData `u32` values are FlatBuffer offsets to nested tables/vectors; writing them as scalars yields structurally parseable but runtime-invalid lists (KN:328-336).
- **v5 data-loss defect**: v5 writer zeroed all 666 present nonzero field-3 hide IDs and dropped vtables beyond 10 fields; scalar comparisons using the same incomplete schema were insufficient (KN:258-264).
- **Duplicate ID 6185**: stock 6185 = `THE USOS 1`; duplicate append failed before; appender now rejects (AS:255-264). Do not repeat identical 6185 tests.
- **Collision**: two enabled CAKs that both supply the Cutscene registry → loader rejects both (`accepted=0 rejected=2`); only one registry-supplying CAK per test (AS:445-451).
- **Tribute 26 v1.6.0 aggregate is 2K26-native and crashes 2K25 ~2s post-mount; the untouched control crashes identically** — animation payload work on that base stops (AS:139-143, 208-213). Do not use v1.6.0 base for 2K25 again (AS:161).
- **Serving-order conclusion**: compatible base + complete offline bindings + loader acceptance + crash-free load still insufficient; the frontend reads Victory/Cutscene tables before the window-thread mount lands — package/name iteration must stop, work on pre-read mount timing (AS:171-176).
- **Pre-window mount attempts crash**: runtime-ready/DXGI pre-window mount too early for 2K25 v1.23; no PRE-WINDOW accept lines; crash dumps ~475MB; no local CDB/WinDbg/dumpchk (AS:44-53). Window-thread mount is the only stable path (A04:39-41).
- **Rename = break**: renaming a finished CAK invalidates its protected catalog (R178:5; SDCL25:128).
- **Whole-game repack not required**: 379 GB merged-root repack was stopped; representative 5-storage-profile round trip is the gate (CHAT:511-556). Do not treat whole-game repack as a blocker.

### Data-format dead ends
- **SDB fixed first key 0x31 is wrong**; adding a record shifts payload offsets by 12 bytes, corrupting first characters (`ATTENTION`→`STTENTION` etc.) (KN:586-601).
- **Tribute 26 SDB payloads** do not decode under the rolling-XOR model (2K26-generation cipher); don't force the 2K25 appender onto v1.6.0 SDB — it refused at record 36 due to non-contiguous payloads (AS:150, 202-203, 241).
- **2K24 vs 2K25 .adefs are not copyable** (15,086 bytes differ; first diff at offset 12) (XFR:64-68).
- **2K19 menu project payloads are opaque**: no magic/strings/pointer schema; entrance 1-6 near-identical 974-byte records, victory 1-2 2,480-byte records; sibling project family ~61.5% identical — semantic labeling blocked; do not write a converter from them (CHAT:646-677, 756-795).
- **`cae_light.pac` is lighting, not menu data** — ruled out (contains `kroot`, `25100light_def`-`25199light_def`, `E_Fspot001`-`E_Fspot014`) (CHAT:705-721).
- **FBX/Blender route**: WWE2K_MDL has no YANM parser (`io_scene_yukes_anims` absent); visual correctness needs 4 verified pieces (real skeleton, track→bone mapping, packed transform decode, application relative to `bone.matrix_local` with X=-90 convention) (MDL:11-23, 63-72). Blender add-on was paused as "too vague" (CHAT:584).
- **Native Clips Editor is GUI-only**: `--help` doesn't return; no headless pose export; viewer showed bind pose with timeline `0 / 0` after controlled mutation — negative semantic evidence, do not call structural mutations playable (XFR:103-105, 151-153).
- **2K20-only animations (36)** have no 2K22 TBUF structure to patch into; 2K23 MINA mapped but no converter; ANIM v10→v16 jump (STS:84-91).
- **Modern writer gap**: `.clips/.adefs` readers complete but writer not implemented as of 09-16 (STS:91); later the codec is described as cracked with bit-identity gates and a parseable `.clips` smoke build (AS:404) — keep the distinction: parseable container ≠ playable motion.
- **Roster-side ID choice is open**: Pro/Table/Face mint the caller-supplied char id; oracle never shows the motion id there (AS:24; H22:59).
- **HideCtrl has NO name-id registration**; the sole candidate word was a soff header colliding with SDB id 4294957742; the genuine pattern is motion rows (s0/s17 field-0 low-u16; oracle 14004). Building a name writer would corrupt live tables (AS:20-21).
- **soff collisions** in raw u16/u32 scans generally (CharMoveSet motion hits = SDB-low-half noise; FaceTextures/CharMapping hits = slot/hash interiors); use only field-resolved references (AS:21).
- **Cutscene table size families mix 28/32/36/40 bytes; Tribute 26 uses 22-byte tables** — a fixed 32-byte appender refuses; validator errors made en route: misread vtable size as table size, assumed single shared vtable (AS:150, 166).
- **Entrance writers unfit for test until full fields + referenced objects preserved** (pre-v6 state) (KN:258-264).
- **CakeView single-instance** intercept: an old 2K26 copy intercepts launches (CHAT:929-931).
- **Foundry reader quirk (fixed ec8b74f)**: community writers store oodle payloads with the flag clear; `expandedSize` mismatch is the signal; raw branch tries oodle-to-expandedSize then falls back raw (CAT:171).
- **FTribTool false success**: wrapper could report success on partial archives; `.sdb` added to raw-storage extensions because Tribute 26 ENG.sdb is pre-transformed and Oodle expands it (AS:226-229).
- **PowerShell `Compress-Archive -LiteralPath` wildcard returned success and created no ZIP** — use `-Path` + require nonempty ZIP (F177:59-64).
- **Electron/CAK release gotchas**: don't ship Foundry bookkeeping files (`.aurora-cak-manifest.json`, `Aurora_Forge_Extraction_Report.txt`) — builder must exclude (F177:17-21; R178 report context); external-reference sidecar `.aurora-cak-external-references.json` must be excluded on rebuild (F177:89-93).
- **Cakehook 2.7 not installed in live game**; active loader is `plugins\AuroraForge.CAKModLoader.ftrib` — do not reopen loader comparison without new regression (KN:19-23).
- **Loader work closed**: user verified in-game texture override through Aurora's loader; do not reopen loader timing/delivery without a specific new regression (KN:25-29, 48-51).

---

## TOOL INVENTORY (script path → purpose; all under `...\WWE2K19-to-2K26-Entrance-Prototype\` unless noted)

### Format libraries (CAT:7-35)
- `tools/tbuf-v1.js` TBUF v1/ANIM v10 reader/encoder/same-size replacer; `tools/yanm-keyframes.js` YANM keyframe decoder; `tools/yanm20-reader.js`, `yanm20-encoder.js`, `yanm20-ir-writer.js`, `yanm20-normalized-ir.js` YANM20 chain; `tools/amym-container.js`, `amym-tbuf-report.js` AMYM envelope; `tools/evd-reader.js` EVD FlatBuffer (34-byte header, 32-byte name); `tools/fop19-reader.js` 2K19 0FOP reader; `fop19-evd20-table-model.js`, `fop19-evd20-body-model.js` 0FOP→EVD (6100/6101/6102 only).
- `tools/adefs-container.js` 2K25 `.adefs` zlib envelope decoder; `tools/adefs-tool.js` read-only inspect/compare CLI (XFR:53-62); `tools/clips-layout.js` `.clips` container reader + FNV-1a `clipNameId`; `tools/clips-tool.js` safe list/validate/extract/inject/rebuild/compare CLI; `tools/clip-control-pair.js`; `tools/clips-native-inspect.js` native read mirror (Group90 bit reader, timing prelude, `decodeQuantizedValue`); `tools/group90-*.js` (entries/uleb/encoder/descriptor-ranges/segment-summary/token-index-map); `tools/fnv-track-resolve.js`.
- Catalog readers: `tools/victory-list.js` (Vict FlatBuffer), `tools/entrance-motion-table.js` (Entr FlatBuffer 2K24/2K25), `tools/adefs-json-export.js`, `tools/adefs-symbol-compare.js`.

### Converters / pipeline (CAT:41-49)
`convert-yanm19-to-yanm20.js` (main, proven), `convert-acts22-to-anims23.js` (safety gate: byte-identical TBUF only), `patch-acts20-yanm.js`, `build-2k19-to-2k20-victory-package.js`, `batch-2k19-to-2k20-victory-packages.js`, `aurora-converter.js` (CLI, 19→20 only), `staged-pipeline.js` (19→20→22→23→25 orchestrator), `export-yanm-ir.js`, `package-exported-clips.js`.

### 2K25 writers/appenders (CAT:87-100 + AS:18-19)
`append_2k25_victory_entry.js` (clean-room victory row), `append_2k25_entrance_entry.js` (rebuild 9 vectors + append), `append_2k25_entrance_template_entry.js` (preserve bytes, replace section 8), `append_2k25_entrance_preserving_graph.js` (prepend root/vector, keep original graph), `append_2k25_entrance_clone_graph.js`, `append_2k25_sdb_string.js` (rolling-XOR, offset-dependent seed), `patch_2k25_victory_list.js`, `patch_2k25_victory_name_type.js`, `parse_2k25_victory_list.js`, `prepare-6104-editor-import.js`, `append-cutscene-entry.js`, `inspect-cutscene-registry.js`, `diff-2k25-entrance-entries.js`, `find-2k25-entrance-entry.js`, `sdb-read.js`, `cak-catalog-summary.js`; 2026-09-21 set: `jsfb-append-lib.js`, `append-2k25-teams-entry.js`, `append-2k25-character-mapping-entry.js`, `append-2k25-cammove-entry.js`, `append-2k25-face-textures-entry.js`, `append-2k25-charmoveset-slot.js`, `append-2k25-charprofilepro-entry.js`, `append-2k25-charprofiletable-entry.js`, `append-hide-ctrl-entry.js`.

### Orchestration / validation / access
`tools/bakeme-orchestrator.js` (8 extended config blocks + SDB/Victory/Entrance/Cutscene edits; writes `aurora-bakeme-proof.json`), `tools/pipeline-editor-suite.js` (active/coming map), `tools/check-datactrlink-log.js` (grades DataCtrlLink.log sessions), `tools/patreon-access.js`, `tools/copy-working-14000-registration.js` (H22:51-55), `scripts/stage-public-tools.js` (fail-closed allowlist; 57 files staged as of 1.0.0d) (H22:15, 37), `scripts/bake-v93-cli.js` + `FTribTool.exe` (Foundry; H22-style path `D:\AuroraForge-Aug26\Aurora-CAK-Foundry\scripts\bake-v93-cli.js`) (KN:441-446; AS:9).

### 2K19 extraction
`tools/inspect_2k19_archive.js`, `tools/extract_2k19_archive_entries.js`, `tools/extract_2k19_pac.py`, `tools/decode_2k19_menu_payloads.js`, `tools/analyze_2k19_menu_templates.js`, `tools/inspect_jsfb_vector.js`, `tools/decode_adefs_wrapper.js`, `tools/audit-extracted-root.js`, `tools/inspect_2k19_shdc.py`, `tools/parse_2k19_cae_menu.py` (CAT:102-112; CHAT:599-630, 850).

### Ghidra scripts (read-only, `tools/ghidra/`)
`DecompileFunctions.java`, `DecompileEntrypoints.java`, `DumpInstructions.java`, `DumpMemoryWords.java`, `FindEditorStringReferences.java`, `FindSymbols.java`, `ReferencesToRange.java` (CAT:128-140).

### App/UI
`app/main.js` (IPC, Patreon auth, tool spawning), `app/preload.js`, `app/app.js` (CAT:142-148). Gate: `requireAccess()` + `patreon-status` in `app/main.js`, config `tools/patreon-access.js` (H22:16).

### Foundry / loader tools (other repos)
- Foundry: `scripts/bake-v93-cli.js`, FDIR 9.3/9.9 backends, `AuroraCakHelper.exe` (SEP:11), portable builder, payload verifier (CER:20-25).
- Mod Loader 2K25: `src/plugins/mod_loader/mod_loader.cpp` (mount detour, file-open observers, DXGI hook, pre-window gates) (AS:30, 38, 64); tests `status_message_tests.exe`, `mod_manifest_tests.exe`, `runtime_config_tests.exe`, `cak_validator_tests.exe` (MT:19-44).
- SDCL core: `src/proxy.cpp`, `src/core/addon_registry.*`, `addon_selection.*`, `src/shared/cak_validator.cpp`, `src/shared/bank_builder.cpp`, `src/status_message.cpp`, `src/mod_manifest.cpp`, `src/runtime_config.cpp` (ARCH:20-84).
- CAK Foundry extraction scripts in flagship: `scripts/extract-all-2k26-caks.js`, `scripts/verify-cak-roundtrip-samples.js` (CHAT:224, 550).
- External oracles: WrestleMINUS 2.3.3.0 zip in `third_party\WrestleMINUS-2.3.3.0.zip` (CHAT:854-858); CakeView 1.6.9 build (CHAT:923); Tribute BakeMe dirs (KN:505); third-party Wwise tools `bnkextr`, `WwiseParser`, `wwiser`, `wwiser-utils` (LCR:46-49).

---

## FILE-FORMAT FINDINGS (beyond Q3/Q6/Q7/Q8 answers)

- **.adefs**: zlib `78 DA` v6 envelope; 2K24/2K25 Victory 6100 expanded 31,043/31,169 bytes; native parser reads chunks `adef`, `args`, `cmds`, `proj`, `rmts`; `CAnimDefinitions` vtable parser `FUN_14000d7b0` reads layered binary tables (counts, 64-bit IDs, flags, var-length strings, reference arrays) — does not read Group90/pose samples (XFR:111-117).
- **.clips**: native `.clips` open handlers `FUN_140039dc0`/`FUN_14003d4c0` → `FUN_140037500` → sibling `.adefs` derivation `FUN_140038d30`; native AnimClip→AnimationData `FUN_140023fc0` allocates one 0x1c-byte key record per frame; per-bone `FUN_140003530` reads six-word-per-bone block at `param_1 + 0x90`, expands via `FUN_140004600`, stores translation + normalized quaternion; `FUN_1400042b0` applies root-motion adjustment for two hashed bones (XFR:119-123).
- **Zero-Group90 controlled edit**: `original.clip` → `slice_0_30.clip` changed frame 11001→31 and 159 Group78 descriptors, zero Group90 — proves timing edits but not pose encoding (XFR:50-51).
- **SDB**: format and cipher as Q3; headers all report version 256 across generations (AS:202).
- **VictoryListData**: `Vict` FlatBuffer; Tribute stored form `12358` flagged raw oodle-decodes to 33,024 B / 657 rows vs stock 661 (CAT:169). Port to 2K20: same shape on CharProfilePro rows + EntranceListData motion records; 2K20 tables numeric-only, no string pools (CAT:172).
- **EntranceMotionTableData**: 2K20 `40x5` entrance-range only (29000s) (CAT:165); 2K25 file 1,204 bytes nested root-table field (CATSRC:7).
- **CutsceneNoRegistry**: per-family tables 22/28/32/36/40 bytes; v103a 2,128 tables in-bounds, entry found at last slot, clone 5/5 words (AS:166).
- **YANM 2K19 variant**: one champion-victory specimen inserts a **12-byte preamble** before otherwise normal channel headers (CHAT:983-985). YANM20 output records: 63 records/62 motion tracks/2 streams per track (AS-A:51-56).
- **0FOP**: 2K19 archive format with prefix, inner header, entry table (`fop19-reader.js`, CAT:18); `06100.pac` decoded body = `0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`, camera = `...entry_1_(ZLIB).bin` (TUT:56-66).
- **SHDC/BPE**: entrance 7 / victory 4 / CAE 10 OODL children; first four metadata records byte-identical across all three containers (CHAT:644-650).
- **CAE menu**: `pac/menu/cae_item.pac` entry 0/0 = 217 records; record 0 maps event 10000 → PAC 100; matches WrestleMINUS reader direction (CHAT:840-858).
- **YANM20 native target**: `FUN_1405c15c0` relocation resolver modeled in `tbuf-v1-relocations.js` (CAT:56).
- **Wwise (music addon context)**: ShortIDs = FNV-1 32b of lowercase names (events/GameSyncs) or 30-bit FNV of GUID bytes (objects/wems); collision-prone; bank chunks BKHD/HIRC/DATA/DIDX/STMG/ENVS/FXPR; AKPK package-table validation + HIRC reconstruction used by bank_builder (WW:176-190, 111-118; ARCH:55-59).
- **2K26 v9.9 vs 2K25 v9.3 CAK**: 2K25 FDIR 9.3 protected catalog; 2K26 FDIR 9; root `_textures.tdb` version-6 record (CER:14-19); 2K25 protected catalog flag + recoverable encrypted header (ARCH:42-53).

---

## NON-WWE FILES IN THIS BATCH (no findings extracted)

Ghidra 12.1.3 tutorials (`BSimTutorial_Creating_Database_From_GUI.md`, `BSimTutorial_Ghidra_Command_Line.md`, `BSimTutorial_Scripting.md`, `Debugger\A1-GettingStarted.md`, `Debugger\B1-RemoteTargets.md`, `serialFilterREADME.md`, `analyzeHeadlessREADME.md`) are stock tool documentation. Only context: Ghidra 12.1.3 is installed at `D:\AuroraForge-Aug26\_tools\ghidra_12.1.3_PUBLIC` and used for read-only Clips Editor analysis (XFR:109). `allfiles-04-release-archive.md` is a survey of `local-release-archive\` (2,322 files; loader pre-v1001 logs + generated desktop builds) (A04:1-92). `LATEST-CONSOLIDATION-REPORT.md` is a copy-only 33-repo consolidation (11,909 files, ~10.42 GB) (LCR:1-121). `RES`/`BOOT`/`FAQ`/`PP`/`RN16`/`CAP`/`PACS`/`CMREADME`/`CMRC`/`KF`/`PROV`/`TPL`/`T26`/`RB26`/`SDCL26B`/`M177`/`MT`/`MFIX`/`F177`/`R178`/`INST`/`SEP`/`CER`/`CKP`/`WW`/`TUT`/`T26` are release/process/provenance documents; their WWE-relevant facts are cited above.

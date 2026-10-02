# notes-batch-1 — 2K19→2K25 entrance/victory conversion (59 files, batch 1)

All facts cite source tags [S#]; key at bottom. Files 19–30 of the batch (Ghidra docs) are generic Ghidra training material (BSim/Debugger/processor READMEs) with zero WWE-modding content — nothing extracted, listed under "Non-evidence files" for completeness.

---

## ANSWERS TO THE 10 QUESTIONS

### 1. Which row to clone as template for new entries in each registration file
- **VictoryListData** — clone **The Rock's stock victory row** (the "type omitted like Rock, hideId clone" pattern): appended row = `wrestlerId 14000`, type omitted, `someId/victoryFace = <motion id>`, `nameString = -9554`, fresh `hideId` [S54:332-334]. The Tribute-observed 14000 row (their oracle) was: `type=1`, `someId=victoryFace=6101`, `hideId 7871869299616959835`, `nameString -9554` [S54:385-386]. Later Tribute CakeView bake used row `14000`, nameString −9543 "Test 14000", `victoryFace 146` [S51:53-56].
- **CutsceneNoRegistry** — clone the **6100 (The Rock) entry table**, append at EOF with new id + new nameString, reusing the shared vtable (32 B table; f0@+8=id, f1@+12=nameString, f7@+24=per-entry hash, f8@+20=-1) [S54:446-453].
- **EntranceListData** — writer set exists (`append_2k25_entrance_entry.js` + `append_2k25_entrance_template_entry.js` + `append_2k25_entrance_preserving_graph.js` + `append_2k25_entrance_clone_graph.js`); the clone-graph variant is the row-clone path [S55:41; S56:975-978]. Exact template row not recorded in this batch.
- **ENG.sdb** — append new string record via `append_2k25_sdb_string.js` (rolling-XOR, offset-seeded key) [S55:43].
- User rule: a new ID must be registered in **multiple places, not just one menu row** — animation asset filenames, VictoryListData references, Cutscene motion registry, SDB name binding (entrances to follow the same principle) [S52:19].

### 2. Which files MUST be written for a new entry to appear in-game and play (tested file sets)
- **Tested set A (Testv1.02b, victory, 4 files)**: `Animation/Victory/6185.clips` + `6185.adefs` + `Entrances/VictoryListData.jsfb` (680→681 rows) + `Sdb/ENG.sdb` (name −9554 "TEST 6185") [S54:330-339]. CAK 5,021,040 B, 4 files, verified+payloadVerified, opens [S54:336-337].
- **Tested set B (Testv1.02d, 4 files)**: `Cutscene/CutsceneNoRegistry.jsfb` (2,160→2,161 entries) + `Animation/Victory/6185.clips` + `6185.adefs` + `Sdb/ENG.sdb` ("TEST 6185" @ −9554) [S54:454-457].
- **Tested set C (test5, 4 files)**: `14100.clips` (17-rec stock clone, rec15 = motion) + `14100.adefs` (clone) + `VictoryListData.jsfb` (clone Rock: face 14100, name −9554) + `ENG.sdb` [S54:421-426].
- **Tribute recipe (measured twice via whole-folder hash diff)**: a victory entry writes **ONLY** `Entrances/VictoryListData.jsfb` (new row) + `Sdb/ENG.sdb` (name) — nothing else changes anywhere [S51:36-39].
- **The real blocker for a NEW menu slot**: six registration files still have **no parser/writer**: `Roster/CharMoveSetDataTable.jsfb` (`Char`), `Roster/CharProfilePro.jsfb`/`CharProfileTable.jsfb` (`Prof`), `Roster/FaceTextures.jsfb` (`Play`), `Hide/HideCtrlData.hidelink.jsfb` (`Data`), `MoveData/CAMMoveData.jsfb` (`CMov`), `Characters/CharacterMapping.jsfb`+`Stable/TeamsTable.jsfb` [S55:9-22].
- **Negative result**: registry/UI table overrides (renamed stock entries ZOMBIE→TEST 585858585, 6185→TEST 6185, appended Test 14000 row) **never appeared in-game**, while `.clips` overrides **do serve** → frontend reads registry tables before/independently of the mount; unresolved when the game reads them [S51:47-52].
- **Post-mount crash (v102k)**: 64-file aggregate CAK mounted accepted=1/0/0 at 15:43:20, CrashReporter minidump 70,592,896 B at 15:43:22 (~2 s later), before picker visibility → offline validity proven, in-game validity disproven [S52:38-42]. Leading hypothesis: full Tribute 26 v1.6.0 aggregate incompatible with 2K25 (unproven; control bake required) [S52:42].

### 3. Name/string id scheme (SDB ids, negative ids, hashes)
- `nameString` values are **negative signed SDB ids**: −9554 = `4294957742` unsigned; "next SDB ID was 4294957742, signed −9554" [S52:32]; used for "TEST 14000"/"TEST 6185"/"test5" [S52:32; S54:334,423].
- ENG.sdb encoding: first-byte key `(offset & 0xff) ^ 0xcd`; names are numeric keys into an XOR-encoded SDB, never plaintext [S55:118]. Live copy of ENG.sdb is inside **bakedfile03** (patch archive) [S54:424].
- SDB writer repaired to **preserve shared/aliased payload ranges** and re-key unique payloads safely; aliasing regression test added; old writer refused current SDB because records may share aliased payload offsets [S52:33-34].
- Cutscene name binding: entry table field f1@+12 = nameString; verified 6100 → nameString `0x17717C81` resolves in ENG.sdb to `THE ROCK` [S54:446-449].
- Other id/hash lanes: `hideId 7871869299616959835` (Tribute row) [S54:385]; per-entry Cutscene hash at f7@+24 [S54:447]; CAK archive keys derive from the **CAK filename** (folded FNV-1a64 lowercase name) [S54:265-274; S50:129]; TBUF child hash = CRC32C(lowercase bone), 45-bone dictionary `_work/crc-dictionary.json` [S53:11]; CakeTool implements FNV64StringI + CRC32C + MetroHash [S56:99-101].

### 4. CAMMoveData (MoveData/CAMMoveData.jsfb) — role and values
- Batch-1 evidence: `MoveData/CAMMoveData.jsfb`, identifier `CMov`, **no parser/writer exists** [S55:19]. It is one of the six missing writers described as **the actual blocker to making a NEW victory/entrance menu slot appear** — i.e. writing the numeric name-id into the **full registration graph**, not just Vict/Entr/Cuts/SDB [S55:22]. No field values or row shapes for CMov appear in this batch.
- Resources to build it: modded-CAK oracle (correct final state of all 9 registration files, baked by user's CakeView) `D:\AuroraForge-Aug26\25 bake folders\extracted-modded-cak` [S55:25]; generic FlatBuffer vector reader `tools/inspect_jsfb_vector.js` [S55:26; S56:1050]; generic dumper `tools/parse-2k25-jsfb.js` [S55:27]; writer pattern to copy `tools/append_2k25_victory_entry.js` (parse → clone record → rebuild whole file with hardcoded schema) [S55:28]; stock 2K25 root `C:\Games\2k25-extracts\Root` (re-verify before use) [S55:29].

### 5. New-entry id numbering rules
- New imported animation IDs **start at 14000**; additive-only; stock files/IDs preserved [S52:9].
- Registry/template ID **14000 is a separate high-buffer entry ID**; imported animation IDs must be allocated from the **2K19-missing set** [S54:306-308].
- TRUE 2K19-only (missing from 2K25) animation ids = **19**: `6104, 6901, 7001, 7009, 7012, 7013, 7100, 7101, 7105, 7150, 7153, 7180, 7181, 7600, 7602, 7604, 8050, 8400, 8755` [S51:40-42]. (Earlier "74 missing" list was wrong — corrected [S54:463-469].)
- Testv1.02b used `victoryFace=6185` **before** the correction; 6185 turned out to be **stock ("THE USOS 1")** — duplicate-id append **lost to the stock entry** and never appeared [S54:463-468]. Do not reuse occupied ids.
- test5 allocation example: **motion 14100 (free) + entry 14004 (free, above vanilla)** + SDB "test5" [S54:421-422].
- Absence checks at 14000: absent from 713-row Victory list, 2,342-entry Cutscene registry, 113,779-record SDB [S52:32].
- 2K25 Victory ID universe: union of `Animation/Victory/*.clips` across all 15 archives = **1,042 ids**; bakedfile01/03 patch archives hold 75 "missing" ids, bakedfile100 holds 968 [S54:463-469].

### 6. EntranceListData row field values for new entries
- Batch-1 does not contain a measured EntranceListData row dump. Recorded facts:
  - `EntranceListData.jsfb` ident `Entr`; writers: `append_2k25_entrance_entry.js`, `append_2k25_entrance_template_entry.js`, `append_2k25_entrance_preserving_graph.js`, `append_2k25_entrance_clone_graph.js`; plus `entrance-motion-table.js` for `EntranceMotionTableData` (five-lane registration records) [S55:41; S56:1011-1013].
  - Picker names are **not** VictoryListData nameStrings (0/680 matches); `TIME TRAVELER` appears exactly once as u32 in EntranceListData [S54:340-345].
  - Entrance animation convention: `Entrance/100.clips` holds the same 35 byte-identical clip payloads as advanced pairs `1000100, 1100100, 1200100, 1300100, 1400100`, partitioned **5/5/5/9/11**; those pairs are byte-identical between 2K25 and 2K26 extracted roots [S2:82].
  - Crosswalk tooling for entrances: `tools/build_2k25_entrance_partition_map.js`; evidence `analysis/2k25-entrance-100-partition-map.json` [S56:988; S2:70].
  - Victory row shape for comparison (Victorian row fields): `wrestlerId`, `type`, `someId`, `victoryFace`, `nameString`, `hideId` [S54:332-334,385-386].

### 7. VictoryListData vs EntranceListData (separate tables, row shapes)
- Separate files/identifiers: `Entrances/VictoryListData.jsfb` = `Vict`; `Entrances/EntranceListData.jsfb` = `Entr` [S55:12-13].
- VictoryListData counts seen: 680 rows (Testv1.02b era) [S54:332]; 713 rows (Tribute 26 v1.6.0) [S52:32]; 654 rows in user's CakeView bake [S51:53-56]. Row fields: `wrestlerId`, `type`, `someId`, `victoryFace`, `nameString`, `hideId` [S54:332-334,385-386].
- Victory motion asset binding: `victoryFace N → Animation/Victory/N.clips (+N.adefs)`; 930 motions in bakedfile60 [S54:379-381].
- The victory **picker list is not fed by VL rows alone** — it is driven by `Cutscene/CutsceneNoRegistry.jsfb` ("Cuts", live copy in bakedfile02, 97,032 B, 2,160 entries): every probe picker name (`THUMBS UP, THUMBS DOWN`, `TIME TRAVELER`, `TECH CHAIRWOMAN`, `SLAM TO WIN`, `SKY PIRATE`) is in the registry; 0/680 in VL [S54:438-449].
- Picker lists **move names**, not wrestler names (user correction) [S54:438].
- EntranceListData additionally carries motion-name u32s (e.g. `TIME TRAVELER`) [S54:343].
- Open question recorded: whether a new 14000 row surfaces in the TEMPLATE list, the MOTION list, or neither [S54:344-345].

### 8. How animation files are registered (clips/adefs/CaeAdvanced/Cutscene/motion tables)
- Convention: `Animation/Victory/<id>.clips` + `<id>.adefs`; `.adefs` payload has **NO id/record refs → byte-clone safe** [S54:379-381,420].
- `.clips` container: stock 6100 has **17 records**; a new-motion build replaces rec15 (body) while all other records stay verbatim; new record id example `0x1F8578484DFD2C30` (FNV of "test5"), 18 records total, 665,104 B [S54:429-434]. Modern boundary model: fixed **0xA0-byte header + five bounded sections** [S2:90].
- Group90 codec (cracked, proven): LSB-first bit stream, **not ULEB tokens**; descriptor per channel 8 B LE = `[i8 scale][u8 width][u16 0][f32 rest]`; `value = readBits(width) * 2^scale + rest`; width 0 = static (rest only, zero stream bits); slots 0-2 = position xyz, slots 3-5 = rotation vector → quat (native sin/cos + slerp); stream zero-padded up to whole u64 count [S54:26-37,354-362]. Decode→dense re-encode of stock is bit-identical [S54:36-37]. Codec now shipped as one-function-per-file modules in `tools/clips-codec/` (26 files, 5/5 tests); orchestrator `build-imported-clips.js` rebuilds the 6185 import byte-identical (`31A9A292…`) [S51:27-31].
- CaeAdvanced: phase-partitioned advanced entrance targets live under `Animation/CaeAdvanced` [S2:62]; `Entrance/100.clips` payloads partition into advanced pairs (5/5/5/9/11) [S2:82].
- CutsceneNoRegistry registration: FlatBuffer root→table(field0 uoffset)→vector of uoffset entry tables; appender splice-inserts 4 B at vector end, shifts region +4, appends cloned 6100 table at EOF with new id + nameString, reuses shared vtable → 2,161 entries, 0 invalid tables [S54:441-453].
- Motion tables: `EntranceMotionTableData` reader exists (`FILE_IDENTIFIER`, `RECORD_FIELDS`, `readEntranceMotionTable`; "measured five-lane" records) [S56:1011-1013]; `CAMMoveData` (CMov) has **no writer** [S55:19].
- 2K25 stock truth: 930 Victory motions in bakedfile60; 15 archives total; adefs/clips of Victory 6100 byte-identical between 2K25 and 2K26 roots [S54:379-381; S2:85].

### 9. Which tool/flow builds the CAK for a new entry (converters, orchestrators, bake)
- **Aurora CAK Foundry** is the CAK baker; archive backend renamed **FTribTool** for the Aurora product boundary; backend stores `.sdb` **raw when compression would expand it** and **rejects fatal backend output even when the process exit code is 0** [S52:37].
- Bake CLI: `Aurora-CAK-Foundry/scripts/bake-v93-cli.js` [S56:68]; v9.3 protected writer verified by `scripts/verify-cak-v93-protected-writer.js` [S56:74]; helper `tools/AuroraCakHelper/Program.cs` (compress/decompress/extract/derivePayloadKey/recoverPayload) [S56:115].
- Foundry v1.7.8 completes the **protected WWE 2K25 FDIR v9.3 rebuild path**: filename-derived protected catalog, header+catalog protection, scrambled catalog strings, plaintext checksums; 2,004-file `bakedfile80` extract/rebuild/reopen byte-for-byte; 2,004 files/1,137 folders [S15:5-19].
- Full-aggregate bake flow: copy the **complete BakeMe folder including every file with original relative folder structure**; source tree verified by byte/hash copy audit before modification; aggregate reopened through FTribTool in 8.2 s with `verified=true, payloadVerified=true, fileCount=64, sourceFileCount=64, folderCount=41, 10,365,112 bytes`; source/staged SHA-256 `C1DE81250FE0CAA33246EED9FDB156835764EBA9D496CF6D6ACC5831996D4ACA` [S52:31,38].
- Tribute comparison: their CakeView bake = the entire 129-file workspace, mounts fine [S51:36-39]; Tribute 26 v1.6.0 fresh BakeMe = 62 files/19,841,251 B; final aggregate 64 files [S52:31,38].
- **Bake under the FINAL name — v9.3 keys derive from the CAK filename; renaming a baked CAK breaks the mount** ("game mount routine returned false"; root cause `cake_name_key` = folded FNV-1a64 lowercase name, `cak_validator.cpp:24`) [S54:262-275,387-388; S50:129].
- Oodle is taken from the user's game install; never bundled [S16:9; S50:171; S59:41].
- 2K26 path (v9.9) unchanged; 2K26 file-key rule identical (do not rename) [S8:31; S47:1-36].
- Mount serving: loader calls the game mount function with **custom-archive mode/slot `(path, null, 2, 1)`** — `(path, null, 0, 101)` (provisional stock-style) returned false [S14:43-49].

### 10. Intended end-to-end user flow (import 2K19 → convert → entry → fields → CAK → game)
1. **Import**: 2K19 source `pac/evt/<id>.pac` (e.g. 06100) extracted + Yukes BPE-decoded; body section = 62 tracks (type distribution/order matches 6100) [S54:311-317]. 2K19 install has 22,661 PACs, 5,992 under `pac/evt` [S2:152].
2. **Convert**: transfer encoder maps 2K19 YANM tracks to 2K25 `.clips` rec15 — structural map `19[i]→25[i]` for i=0..61 (62,63 stock); rotation contiguous triples; gains pos 4.4e-4 / rot 5.3e-6 min-anchored at rest; per-channel auto-fit widths (widen only when out of stock band) → 0 clamps; Catmull-Rom + Gaussian σ2.5f resample; arm swap 7↔8, 30↔31; legs 53-60 stock or transferred [S54:66-117,323-328].
3. **Build assets**: new `Animation/Victory/<id>.clips` (stock 17-record clone, rec15 replaced, new record id optional) + `<id>.adefs` byte-clone [S54:330-331,429-434].
4. **Register**: append full row to `VictoryListData.jsfb` (clone Rock shape) + append Cutscene registry entry + append `ENG.sdb` name [S54:332-337,454-457]. Entrances use the entrance writers + EntranceMotionTable [S55:41; S56:1011-1013].
5. **Bake**: Foundry bake under final name from the full copied BakeMe tree; verify reopen + payload bytes [S52:20,38; S15].
6. **Stage**: CAK into `<game>/mods` + manifest `cakOrder` (allowlist; omitted files not loaded) [S54:54,81-82; S50:89-101]. Exactly **one registry-bearing CAK enabled** at a time [S52:66].
7. **Verify in-game**: user launches; DataCtrlLink.log accepted/rejected/failed counts; look for `TEST <id>` in the picker (T section) and preview motion [S54:459-461; S50:76-83]. Crash-free launch + visible name + preview required before calling it valid [S52:67].
8. Entrance-specific flow: pair source phases (A00/A06) with target `9100_a_00_m`/`9100_b_00_m`, crosswalk body tracks, resolve auxiliary-count differences [S2:18]. Entrance Conversion Lab maturity = Inspect → Preview/map → Convert/export, each component independent [S1:362-368]. Blender add-on is preview-only (crosswalk JSON → timeline markers); `.clips/.adefs` export deliberately disabled [S33:5-12].

---

## VERIFIED FACTS (hashes / paths / counts)

- **2K25 loader pair (working runtime, content-verified)**: dinput8 `92C26247BCF9EC1F…`, ftrib `B8C8A7A9ABD4F07E…`; canonical product pair dinput8 `FC0771822612DC5F…`, ftrib `84089A2CE223E08F…`; `84089A2C` pinned by `Secure-DataCtrlLink-WWE2K25/tests/addon_registry_tests.cpp`. Loader problem = SOLVED, do not rebuild [S51:15-26].
- **2K25 supported exe SHA-256**: Saturday Night's Main Event `c6bc0459d4d29667c9e8f1dcaca013ae4691d615e4c79d069ad272f70e2cee01`; v1.23 `b608e7ed18bfb6291ca195532accf40081cbf1a1f4850e63943906d155b9ac98` [S50:59-64].
- **2K26 exe allowlist**: ORIG `dfb08c59f547ccd9c2a5820dd7520af064ca93d8642959b9f005e0c6f2958466`; v1.14 `7f558607bd6881c4547d752ea107fb03282a2980e47ef19ade597e096de4a0e9`; v1.16 `5f82c813e905ceb96053280cf3488f7f54bc35258c1a0eb027355d45f6c56da7` [S2:135-136].
- **Build/test CAK hashes**: Testv1.02b `581689D1CC838CFDCE32E842A742C899809304070BF048A74292081B094CF8DE` [S54:337]; Testv1.02d `E9022EC8DD01C76DD7D23FF7B7114216187B6C05F76A56D2716D239D231B57EC` [S54:457]; Testv1.02e `0C32056319C36028EEBE15A8FCBB9900EB49C73A5F0534F086D6107859A20BAE` [S54:474]; test5 `85FED3B6…EB0F` [S54:426]; T1 `39F10FEF…98ED9` [S54:273]; v7 `CA8ADD99…B8026` [S54:153]; T1 legs-stock build `3B08700D…25CCAB8C7` [S54:239]; 64-file aggregate source/staged `C1DE81250FE0CAA33246EED9FDB156835764EBA9D496CF6D6ACC5831996D4ACA` [S52:38].
- **Foundry v1.7.7 (2K25)**: 15 CAKs opened; 386,873/386,873 catalog entries named; 93,738 folders; bakedfile100 54,481 named files; 53/53 encrypted/chunked extraction [S46:20-27].
- **Foundry v1.7.6c (2K26)**: 386,052/386,052 (original), 407,815/407,815 (v1.14), 412,095/412,095 (v1.16) stored payloads named; mod23.cak leading-zero regression derives key `f755512d` [S17:29-40; S45:17-22].
- **Foundry v1.7.7 bug fixes**: 412,095 payloads + 279 metadata refs; Bink sets recovered (`Movies/Arena/WRESTLEMANIA_42_N1/N2`, `Movies/SS/CAEV_JEFFHARDY1_2026`); 5 storage profiles pass [S48:27-50].
- **ID truth**: 2K19-minus-2K25 inventory JSON `analysis/2k19-minus-2k25-victory-inventory.json` (540 scoped 2K19 IDs, 930 2K25 Victory IDs); evidence hashes JSON `38872DE1…CBF1`, 2K19 set `28A84EF5…4D79`, 2K25 set `1C17155C…BA2E` [S54:292-308].
- **Victory 6100 structure**: 2K19 source 16 YANM motions vs 17 target clips; 62 source body channels preserve exact order of first 62 target body tracks; 7/7 resolved joint names agree; target appends 2 tracks [S2:84]. 9100 = second specimen: source 2×62-record bodies + 2×7-record faces + 16-record prop candidate + camera/ring-mat/10 aux; target 2×64-track bodies + 2 facial + 67-track prop + camera/ring-mat/9 aux [S2:86].
- **CutsceneNoRegistry**: identifier `Cuts`, live copy in bakedfile02, 97,032 B, 2,160 entries → 2,161 after append; entry id 6100 → nameString `0x17717C81` → "THE ROCK" [S54:440-453].
- **Aggregate bake numbers**: FTribTool reopen 8.2 s; 64 files/41 folders/10,365,112 bytes [S52:38].
- **Loader/mount history**: AFCML-CAK-006 — mount `(path,null,2,1)` returned true on v1.23 with a 2,004-file protected CAK; accepted=1/0/0 [S14:43-49].
- **Repo/cleanup state**: prototype repo was ahead 12 with ~155 dirty entries; 30 new untracked tools have no filename match in other repos → new work [S9:68-80]. Clips-Tools retired; canonical tools = prototype `tools/` + `tools/clips-codec/` [S49:1-4; S9:58-66].
- **Paths (canonical)**: 2K25 game `C:\WWE 2K25 Saturday Nights Main Event\` (mods/, plugins/, DataCtrlLink.log) [S51:75]; 2K19 `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19` [S51:76]; 2K25 extracts `D:/wwe 2k25 mods/extracts/Root` (Entrance, CaeAdvanced, Victory subdirs) [S2:60-63]; 2K26 extracts `D:/WWE26-mods/extracts/Root` [S2:64]; 2K20 extracts `D:\WWE26-mods\extracts\2k20\Root` [S53:26]; 2K22 extracts `D:\AuroraForge-Aug26\Extracted Files\2k22\Root` [S53:26]; 2K22 install `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22` [S5:24]; external 2K22 baker `D:\bot-crap\CakeToolsv098a\release` (animation-blind, verified) [S53:27]; temp scratch `C:\Users\dgran\AppData\Local\Temp\opencode\` [S51:80].

---

## HOUSE RULES (standing constraints)

- **Additive-only**; new IDs only; never overwrite stock game files; new imported IDs start at 14000 [S52:9; S51:11-12].
- **No success claim without evidence**: never call working/converted/valid without crash-free load + visible name + preview; label offline/loader-acceptance results exactly as such [S52:47,67].
- **One registry-bearing CAK enabled at a time** [S52:66].
- **Never rename a baked CAK**; decide version names before bake; rebuild under the final name [S54:274-275,387-388; S50:129].
- **Bake the full copied BakeMe folder** with every file and original relative structure; no small isolated 5-file package as the final aggregate [S52:20].
- **Game archives read-only**; never extract/repack an entire game folder; bounded test specimens only [S2:31-32; S6:37].
- **User launches games; agent reads logs**; video never prescribes numbers; Codex = footage observer only [S54:405-410,170,223].
- **No unscoped D: scans**; all repos private; work on working branches [S51:12].
- **Never distribute** game files, Oodle, extracted assets, third-party tools/binaries [S6:38-39; S58:9].
- **Fail-closed loader**; never bypass exe hash/signature checks; no `.asi`/`.dlp`/arbitrary DLL loading [S1:50-52; S41:30].
- **Public-claim boundary**: in-game transfer proven on **2K25 ONLY**; 2K26 same format but untested boot [S54:126-128].
- **Preserve dirty worktrees**; never reset/clean; no destructive git [S3:34; S7:8-9].
- **Distinguish current-version facts from historical-version facts**; never invent IDs/offsets/hashes [S6:21,41].
- Continuity guard must read Active Log before search/test/edit; record mismatches; don't repeat completed scans [S52:11,61].

---

## GOTCHAS & DEAD ENDS (do NOT repeat)

- **6185 is stock ("THE USOS 1")** — a duplicate-id append silently loses to the stock entry; that was why an early test never appeared [S54:463-468].
- **"74 missing" was wrong** — the union across all 15 archives is 1,042; patch archives (bakedfile01/03) contain 75 of the "missing" ids; bakedfile100 has 968 [S54:463-469].
- **ULEB-token model of Group90 is dead** — descriptor u16le[0] is really `[i8 scale][u8 width]`; ULEB decodes any bytes so "decodedBytes == total" proved nothing [S54:8-14,354-362].
- **v1 rot bug** — strided `(x,x,x)` words instead of contiguous triples caused ~109° pelvis twist/fold [S54:73-74,99-102].
- **Amplitude root cause** — span-fill + quantum-full forced every channel to 100% quantum → flight/floor-sink/accordion; correct gains pos 4.4e-4, rot 5.3e-6 [S54:92-105].
- **bone61 mis-map** — mapping 2K19 idx61 (probably face/jaw) into root-level carrier bone61 (rest posY −85.688/rotY −2.78) folded the whole skeleton [S54:83-91].
- **Judder ≠ quantization** — arm value-steps were 0.0025/frame (invisible); real cause = linear interp of ~4.4f-spaced keys → Catmull-Rom + Gaussian σ2.5f [S54:138-144].
- **Worker-thread mount crashes** 2K25 v1.23 (access violation `0xc0000005`) — needs game archive-thread state [S14:11-17].
- **Hardware debug-register trigger crashes** 2K25 before callback — rejected and removed [S14:19-24].
- **Mount args**: `(path, null, 0, 101)` provisional stock-style returned false; custom-archive contract is `(path, null, 2, 1)` [S14:26-33,43-49].
- **Renaming a CAK breaks the mount** (filename-keyed v9.3 crypto); Testv1.01a failed exactly this way [S54:262-275].
- **Old Tribute v1.20 BakeMe is stale** — never baked/staged; use Tribute 26 v1.6.0's fresh BakeMe [S52:21].
- **Small isolated 5-file package is not the final aggregate workflow** [S52:20].
- **Registry overrides/renames do not surface in-game** (mounted after frontend reads tables); clips overrides DO serve [S51:47-52].
- **v102k post-mount crash** ~2 s after accepted mount (70,592,896 B minidump); cause unproven; control bake of untouched Tribute aggregate required before blaming our additions [S52:40-42].
- **No face transfer exists** — all face records so far are stock rec16 byte-identical; 19sec1→rec16 mapping/gains never authored [S54:119-125].
- **2K22 extractor is research-only**: catalog + first payload decode, but per-entry payload key derivation unresolved; no cak22-reader; do not describe as working [S4:127-136; S5:44-46].
- **Protected Foundry archives were once rejected** by an outdated validator rule treating header protection as "stock" — fixed by bounded key recovery [S14:35-41].
- **`Compress-Archive -LiteralPath` with a wildcard silently created no ZIP** while printing "Created" — use `-Path` + verify nonzero length [S48:59-64].
- **Readable strings in MCD/MTLS/JMTL/YCL are not a binary spec** [S6:130].
- **Don't "fix" the loader** — signature-gate/boot-burst-hook experiments are parked; shipped binaries predate source drift [S51:24-26].
- **Editor preview ≠ build proof**: editor selection fades can show loading/default motion; T0/T1 must hold character/slot/camera/launch constant [S54:203-223].

---

## TOOL INVENTORY (path → purpose)

Registration writers (prototype `WWE2K19-to-2K26-Entrance-Prototype/tools/`):
- `append_2k25_victory_entry.js` — parse→clone→rebuild VictoryListData (`Vict`); the writer pattern to copy [S55:40; S56:980].
- `append_2k25_entrance_entry.js`, `append_2k25_entrance_template_entry.js`, `append_2k25_entrance_preserving_graph.js`, `append_2k25_entrance_clone_graph.js` — EntranceListData (`Entr`) append/clone variants [S55:41; S56:975-978].
- `append_2k25_sdb_string.js` — ENG.sdb string append (rolling-XOR, offset-seeded key) [S55:43; S56:979].
- `clips-codec/append-cutscene-entry.js`, `find-cutscene-entry.js`, `rename-cutscene-entry.js`, `locate-cutscene-vector.js`, `inspect-cutscene-registry.js` — CutsceneNoRegistry (`Cuts`) [S55:42].
- `victory-list.js`, `parse_2k25_victory_list.js`, `patch_2k25_victory_list.js`, `patch_2k25_victory_name_type.js` — VL read/patch [S55:40; S56:1053-1057].
- `locate-entrance-vectors.js`, `find-2k25-entrance-entry.js`, `diff-2k25-entrance-entries.js`, `entrance-motion-table.js` (EntranceMotionTableData reader) [S55:41; S56:1012].
- `inspect_jsfb_vector.js` (generic FlatBuffer vector reader), `parse-2k25-jsfb.js` (generic dumper) [S55:26-27; S56:1050].

Motion codecs:
- `tools/clips-codec/` — Group90 LSB bitstream codec: bit reader/writer, parse/eval/encode groups, descriptors `[i8 scale][u8 width][u16 0][f32 rest]`, `build-imported-clips.js` orchestrator; 26 files, 5/5 tests [S51:27-31; S55:47].
- `tools/clips-layout.js` (container parse/build; `clipNameId`), `group90-*` (uleb, entries, descriptor-ranges, token-index-map, segment-summary, encoder), `clips-tool.js` (extract/inject/list/patchGroup90/rebuild/validate) [S56:996-1001,1035-1046,1192-1205].
- `.adefs`: `adefs-container.js` (v6 zlib envelope decode/encode), `adefs-tool.js`, `decode_adefs_wrapper.js`, `adefs-json-export.js`, `adefs-symbol-compare.js` [S55:48; S56:961-969].
- 2K20 bridge: `amym-container.js`, `yanm20-reader/encoder/ir-writer.js`, `yanm-keyframes.js`, `patch-acts20-yanm.js` [S55:49; S56:1134-1168].
- 2K22/23: `tbuf-v1.js`, `convert-acts22-to-anims23.js`, `convert-yanm19-to-yanm20.js`, `convert-yanm20-to-tbuf22.js` [S55:50; S56:1003-1007].
- 2K19: `extract_2k19_pac.py` (HSPC+Yukes BPE), `inspect_2k19_shdc.py`, `parse_2k19_cae_menu.py` (0x28-byte CAE menu records), `decode_2k19_menu_payloads.js`, `fop19-reader.js`, `evd-reader.js`, `fop19-evd20-body-model.js` [S55:51; S56:1019-1027,1145].
- Crosswalks/orchestrators: `build_2k19_2k25_victory_crosswalk.js`, `build_2k25_entrance_partition_map.js`, `batch-2k19-to-2k20-victory-packages.js`, `build-2k19-to-2k20-victory-package.js`, `staged-pipeline.js`, `package-exported-clips.js`, `prepare-6104-editor-import.js` [S55:40-41; S56:983-988,1051,1060,1065].
- Analysis/verification: `scan-clips-corpus.js`, `clips-controlled-diff.js`, `clips-descriptor-lattice-report.js`, `score-group90-op0.js`, `summarize-track-descriptor-patterns.js`, `pretty-jhips-report.js`, `compare-motion-metadata.js`, `clip-control-pair.js`, `tbuf-*`, `yanm20-*` [S56:990-1010,1063-1112].
- Ghidra scripts (reverse-engineering support): `tools/ghidra/DecompileEntrypoints.java`, `DecompileFunctions.java`, `DumpInstructions.java`, `DumpMemoryWords.java`, `FindEditorStringReferences.java`, `FindSymbols.java`, `ReferencesToRange.java` [S56:1028-1034].
- Temp scratch (research, promote later): `clips_bitcodec.js`, `clips_encode.js`, `transplant.js`, `rosetta6100.js`, `target_curves.js`, `hips_dump.js`, `add-cutscene-entry.js` [S54:248-254,451].

CAK / serving:
- `Aurora-CAK-Foundry/scripts/bake-v93-cli.js` (bake), `electron/archive-repackager.js` (buildCak/verifyCak/scanBakeFolder/derivePayloadKey/protectPayload), `electron/cak-v93-backend.js`, `electron/cak-v99-key.js`, `tools/AuroraCakHelper/Program.cs` [S56:34-40,68,114-115].
- `Aurora-CAK-Foundry/scripts/verify-cak-v93-protected-writer.js`, `verify-raw-hash-roundtrip.js`, `verify-repackager.js` [S56:74-77].
- Secure-DataCtrlLink 2K25 (`dinput8.dll` proxy, fail-closed, approved addons only) + `AuroraForge.CAKModLoader.ftrib` mount plugin [S50:1-19; S43:33-37].
- Pac19 helper `AuroraPac19Helper.exe` (HSPC/SHDC/EPAC/EPK8/PACH inspect/extract/replace; loads `oo2core_6_win64.dll` from user's 2K19) [S58:9; S56:557].
- `Aurora-Forge-Blender-Animation-Tools` — FBX preview + Entrance Lab sidebar; crosswalk JSON → timeline markers; no export [S33; S34].

---

## FILE-FORMAT FINDINGS

- **`.clips` (2K25)**: 0xA0-byte header + five bounded sections; payload = records; Group90 = LSB-first bit stream with per-channel 8-byte descriptors; zero-padded to whole u64 count; stock 6100 = 17 records; slots 0-2 pos xyz / 3-5 rot vec→quat [S54:26-37; S2:90].
- **`.adefs` (2K25)**: version-6 ZLIB envelope; no ID/record refs inside → byte-clone safe; ADefs Editor handles definitions/events only, no `.clips` writer [S56:961-963; S2:145; S54:380].
- **`.jsfb`**: FlatBuffers; registration files each have an identifier (`Vict`, `Entr`, `Cuts`, `Char`, `Prof`, `Play`, `Data`, `CMov`); root→vector→record tables; Cutscene entry table 32 B with shared vtable [S55:9-22; S54:446-449].
- **SDB**: XOR-encoded string database; first-byte key `(offset & 0xff) ^ 0xcd`; records may share aliased payload offsets (writer must preserve them); 113,779 records at 14000-check time [S55:118; S52:32-34].
- **CAK/FDIR**: 2K25 = FDIR v9.3 (filename-derived key, protected header+catalog, scrambled strings, plaintext checksums); 2K26 = FDIR v9.9 (same rename rule); 2K22 = FDIR `0x0308` flags `0xC001`, 32-byte file records, custom byte transform `a=ror8(cipher[j],((j-1)&7 ^ 0x0D)&7); b=a ^ (((j-1)+key[(j+1)&3])&0xFF); plain=rol8(b,(j+1)&7)`, per-entry payload key still unresolved [S15:5-12; S46:12-19; S4:7-99,127-136].
- **Hashing**: FNV-1a64 (FNV64StringI), CRC32C (bones; TBUF child = CRC32C(lowercase bone)), MetroHash128crc/UnkCustomV9_1, SFMT PRNG in CakeTool [S56:99-104; S53:11].
- **2K19**: HSPC/SHDC/EPAC/EPK8/PACH containers; Yukes BPE; 0FOP event index; CAE menu 0x28-byte records [S55:51; S2:149-156].
- **2K20**: YANM/AMYM/ACTS/EVD chain (verified 6100 package build) [S56:1134-1168; S55:49].
- **2K22/23**: TBUF v1/v2 / ANIM v10/v11/v16 envelopes, MINA `.anims`; 2K22→2K23 conversion refuses unresolved payload copies [S56:1082,1004].
- **Format chain (public)**: YANM→AMYM→TBUF→MINA→.adefs/.clips [S55:65].
- **Motion-table registration**: EntranceMotionTableData = measured five-lane records [S56:1011-1013]; CAMMoveData/CMov = unparsed [S55:19].

---

## REGISTRATION GRAPH STATUS (from S55:9-22)

| File | ident | Writer | Notes |
|---|---|---|---|
| `Entrances/VictoryListData.jsfb` | `Vict` | ✅ `append_2k25_victory_entry.js` | clone Rock row; tested in-game (motion serves) |
| `Entrances/EntranceListData.jsfb` | `Entr` | ✅ `append_2k25_entrance_entry.js` + clone/preserving variants | row shape not measured in batch-1 |
| `Cutscene/CutsceneNoRegistry.jsfb` | `Cuts` | ✅ `clips-codec/append-cutscene-entry.js` | picker-name source; 2,160 stock entries |
| `Sdb/ENG.sdb` | — | ✅ `append_2k25_sdb_string.js` | negative-id names |
| `Roster/CharMoveSetDataTable.jsfb` | `Char` | ❌ missing | blocker for new slot visibility |
| `Roster/CharProfilePro.jsfb` / `CharProfileTable.jsfb` | `Prof` | ❌ missing | same |
| `Roster/FaceTextures.jsfb` | `Play` | ❌ missing | same |
| `Hide/HideCtrlData.hidelink.jsfb` | `Data` | ❌ missing | same |
| `MoveData/CAMMoveData.jsfb` | `CMov` | ❌ missing | same |
| `Characters/CharacterMapping.jsfb` + `Stable/TeamsTable.jsfb` | — | ❌ missing | only named in docs |

---

## CONVERSION PIPELINE FACTS (2K19→2K25 motion)

- Track map: `19[i]→25[i]` for i=0..61 (root?, Hips..Toe + 3 structural; 62/63 stock); finger orders verified; clav/shoulder pairs swapped in 2K25 → source swap {7:8,8:7,30:31,31:30} [S54:66-117].
- Routing: 0204 9-word rot (triple0≈triple2; triple1 zero-start) → contiguous rot words; 2200 3-word → rot; 0304 hips primary.w1 → posY (X/Z stock); 2300 idx61 dual → bone61 posY/rotY (tentative) [S54:71-74].
- Fidelity: normalized-shape correlation 19src vs decoded-new = 1.0000 body/legs/bone61; worst 0.9936 (3-bit finger quantum) [S54:79-80].
- Bake evidence: 6100 hips19 CAK 222,300 B verified; fullbody 265,716 B; v7 231,164 B; T1 230,776 B [S54:51-54,76-78,153,237-239].
- Verdict trail: v1 hips19 = transfer PROVEN in-game (new bob rhythm, janky); v2/v3 fullbody = flying+fold; v4 gains = grounded; v5 arm swap = orientation fixed; v6 smooth; v7 bands; T0 failure reproduced; T1 legs-stock staged [S54:364-376].
- Face stage: 19sec1 7 tracks → rec16 8 tracks × 96ch morph layout — future work, not authored [S54:119-125].

---

## NON-EVIDENCE FILES (read, zero modding content)

[S19] BSimTutorial_Enabling.md; [S20] BSimTutorial_Evaluating_Matches.md; [S21] A6-MemoryMap.md; [S22] B2-Emulation.md; [S23] ByteViewer/README.md; [S24] 6502/README.md; [S25] 68000/README.md; [S26] 8048/README.md; [S27] AARCH64/README.md; [S28] Atmel/README.md; [S29] CP1600/README.md; [S30] DATA/README.md — all generic Ghidra 12.1.3 training docs (debugger memory maps, p-code emulation, BSim workflow) under `.tools\ghidra_12.1.3_PUBLIC\`. [S10] ilspycmd README (dotnet decompiler CLI), [S11] sfextract NuGet.md (single-file-app extractor), [S12] NuGet.Build.Tasks.Pack README (1 line), [S13] CakeTools-AlphaPreview v0.9.a README (2 lines) — build tooling notes only. [S42] wwiser EXAMPLES.md — Wwise bank-structure case studies (event→play→…→mranseq/segment/track, loops, switches, volume states) across ~40 games; relevant only as reference if custom-music bank work resumes.

---

## SOURCE KEY

S1 `_archive\handoffs\Aurora-Forge-Fun-Features-Handoff-2026-08-31\AURORA-FORGE-INTEGRATION-HANDOFF.md`
S2 `_archive\handoffs\Aurora-WWE-Project-Knowledge-Pack-2026-09-05\knowledge\wwe-modding.context.md`
S3 `_archive\handoffs\AuroraForge-WWE-Modding-Handoff-2026-08-26-2K22-Start\START-HERE.md`
S4 `_archive\handoffs\AuroraForge-WWE-Modding-Handoff-2026-08-27-2K22-Payload-Key-Checkpoint\EXACT-CHECKPOINT.md`
S5 `_archive\handoffs\AuroraForge-WWE-Modding-Handoff-2026-08-27-2K22-Payload-Key-Checkpoint\START-HERE.md`
S6 `_archive\handoffs\AuroraForge-WWE-Modding-Knowledge-Handoff-2026-08-20\START-HERE.md`
S7 `_archive\handoffs\AuroraForge-WWE-Modding-Knowledge-Handoff-2026-08-25\CURRENT-WORKTREE.md`
S8 `_archive\releases\release-metadata\GITHUB_RELEASE_BODY_v1.7.5a.md`
S9 `_archive\workspace-consolidation-2026-09-20\dirty-repo-cleanup\DIRTY-REPO-CODE-INVENTORY.md`
S10–S13 small tool READMEs (see Non-evidence section)
S14 `_worktrees\cak-mod-loader-override\docs\BUGS-AND-FIXES.md`
S15 `_worktrees\foundry-v93-verify\build\standalone-cak\CAK_FOUNDRY_RELEASE_NOTES_1.7.8.md`
S16 `_worktrees\foundry-v93-verify\build\standalone-cak\THIRD-PARTY-NOTICES\Nenkai-Bakery-Aurora-Integration-Notice.md`
S17 `_worktrees\foundry-v93-verify\docs\AURORA_CAK_FOUNDRY_v1.7.6c_FIX_REPORT.md`
S18 `_worktrees\foundry-v93-verify\docs\CAK_FOUNDRY_RELEASE_NOTES_1.7.7.md`
S19–S30 Ghidra docs (see Non-evidence section)
S31 `allfiles-03-worktrees.md`
S32 `allfiles-06-sept20.md`
S33 `Aurora Forge Sept 20\Aurora-Forge-Blender-Animation-Tools\blender_addon\README.md`
S34 `Aurora Forge Sept 20\Aurora-Forge-Blender-Animation-Tools\README.md`
S35 `Aurora Forge Sept 20\Aurora-Forge-Custom-Music-Loader-WWE2K25\docs\BUGS-AND-FIXES.md`
S36 `Aurora Forge Sept 20\Aurora-Forge-Custom-Music-Loader-WWE2K25\docs\METHODOLOGY-AND-PROVENANCE.md`
S37 `Aurora Forge Sept 20\Aurora-Forge-Patreon-Verifier\README.md`
S38 `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\docs\METHODOLOGY-AND-PROVENANCE.md`
S39 `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\release\Secure-DataCtrlLink-WWE2K26-1.0.0-provenance-check\EXPLAIN-LIKE-IM-FIVE.md`
S40 `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\release\Secure-DataCtrlLink-WWE2K26-1.0.0-readability-auto-check\EXPLAIN-LIKE-IM-FIVE.md`
S41 `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\release\Secure-DataCtrlLink-WWE2K26-1.0.0-readability-auto-check\SECURITY.md`
S42 `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\third_party_reference\wwiser\doc\EXAMPLES.md`
S43 `Aurora Forge Sept 20\Secure-DataCtrlLink-WWE2K26\docs\ADDON-MANAGEMENT.md`
S44 `Aurora Forge Sept 20\Secure-DataCtrlLink-WWE2K26\docs\METHODOLOGY-AND-PROVENANCE.md`
S45 `AuroraForge_WWE_PC-Game_Modding_Tool\Aurora-CAK-Foundry\docs\CAK_FOUNDRY_RELEASE_NOTES_1.7.6c.md`
S46 `AuroraForge_WWE_PC-Game_Modding_Tool\Aurora-CAK-Foundry\docs\CAK_FOUNDRY_RELEASE_NOTES_1.7.7.md`
S47 `AuroraForge_WWE_PC-Game_Modding_Tool\Aurora-CAK-Foundry\package-tests\hidden-references-final-20260906-2330\CAK_FOUNDRY_RELEASE_NOTES_1.7.7.md`
S48 `AuroraForge_WWE_PC-Game_Modding_Tool\Aurora-CAK-Foundry\package-tests\resolved-folder-final-20260906-2320\asar-audit\AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md`
S49 `AuroraForge_WWE_PC-Game_Modding_Tool\Aurora-Forge-Clips-Tools\README.md`
S50 `AuroraForge_WWE_PC-Game_Modding_Tool\Secure-DataCtrlLink-WWE2K25\README.md`
S51 `AuroraForge_WWE_PC-Game_Modding_Tool\Sept18th-2026\HANDOFF-2026-09-19-2K25-DIRECT.md`
S52 `AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\AURORA_FORGE_CONVERSATION_LEDGER_2026-09-19.md`
S53 `AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\notes\HANDOFF-2026-09-17-MOUNT-PROVEN.md`
S54 `AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\notes\LOG-2K19-2K25-TRANSFER.md`
S55 `AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\notes\REPO-CONTENTS-AUDIT-2026-09-20.md`
S56 `AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\notes\REPO-FUNCTION-INVENTORY.md`
S57 `FINAL-GOAL-UMBRELLA.md`
S58 `local-release-archive\AuroraForge-desktop-generated-2026-09-07\build\release-test-aurora-forge-final\resources\app.asar.unpacked\app\tools\pac19-helper\THIRD-PARTY-NOTICES.md`
S59 `local-release-archive\AuroraForge-desktop-portable-release-2026-09-07\Aurora-CAK-Foundry-v1.7.5a-Windows-x64\FAQ.md`

# Notes — batch-6 (12 files)

Source tags used below (full paths):
- **[STATE]** `C:\AuroraForge-Aug26\AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\AURORA_FORGE_ACTIVE_STATE.md`
- **[BACKUP]** `C:\AuroraForge-Aug26\AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\notes\ACTIVE-LOG-BACKUP-20260917.md`
- **[2K20-DEAD]** `C:\AuroraForge-Aug26\AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\notes\HANDOFF-2026-09-18-2K20-SLOTS-DEAD.md`
- **[GITHUB]** `C:\AuroraForge-Aug26\AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\notes\LOG-GITHUB.md`
- **[CAK25]** `C:\AuroraForge-Aug26\AuroraForge_WWE_PC-Game_Modding_Tool\Aurora-Forge-CAK-Mod-Loader-WWE2K25\README.md`
- **[SDCL26]** `C:\AuroraForge-Aug26\Aurora Forge Sept 20\Secure-DataCtrlLink-WWE2K26\README.md`
- **[HANDOFF-1.6]** `C:\AuroraForge-Aug26\_archive\legacy-workspaces\Aurora-Forge-1.6.0m-Complete-Dual-Platform\Documentation\AURORA_FORGE_HANDOFF.md`
- Ghidra docs (no modding content): `...\.tools\ghidra_12.1.3_PUBLIC\server\svrREADME.md`, `...\docs\GhidraClass\BSim\BSimTutorial_Basic_Queries.md`, `...\docs\GhidraClass\Debugger\A4-MachineState.md`, `...\GPL\DemanglerGnu\README.md` (1 line), `...\GPL\DMG\README.md` (1 line)

---

## ANSWERS TO THE 10 QUESTIONS

### Q1. Which row to clone as template for new entries in each registration file
- **Rule (all 8 extended writers):** clone a **same-shape stock record**, patch **ID/name words only**, splice **one vector slot**, repair every crossing reference; validate count+1, new row present, every old row identical (+ full ref-repair proof for nested/multi-section files). [STATE:31-32]
- **CutsceneNoRegistry:** clone **stock template 6100** (v103a append used template 6100, name 4294957753, shared-vtable splice, strict validation: 2128 tables in-bounds, entry at last slot, clone 5/5 words). [STATE:179]
- **VictoryListData:** clone a same-shape stock victory record then override ID/name (`append_2k25_victory_entry.js`: "CLI clones an entry + appends with overrides"). [BACKUP:3910] The registry-inclusive 6185 bake "cloned … from the known stock template". [STATE:444]
- **EntranceListData:** clone **section 8** (the entrance vector). `append_2k25_entrance_template_entry.js` = "preserves Entr byte-for-byte, replaces section 8"; `append_2k25_entrance_entry.js` = "rebuilds 9 vectors of EntranceListData.jsfb + appends template"; `append_2k25_entrance_preserving_graph.js` / `append_2k25_entrance_clone_graph.js` retain original graph. [BACKUP:2445-2448]
- **Tribute's own recipe (reference for what the game accepts):** Victory row cloned as `14000/name 4294957742/type 1/face 14000`; Entrance row as `sec8 14000/name 4294957742/type 1`; Cutscene entry `14000/name 4294957742`. [STATE:162]
- **Tribute 25 v1.5-merged:** template rows clone **STOCK motions** (6229/247/502-class refs) and share ONE SDB name across victory+entrance rows. [STATE:199]

### Q2. Which files MUST be written for a new entry to appear in-game and play (tested file sets)
- **Tribute 26 v1.6.0 live recipe (user-created in Tribute, diffed vs pristine): exactly 4 changed files, 0 new assets** — `VictoryListData` (+1 row 14000/name 4294957742/type 1/face 14000), `EntranceListData` (+1 sec8 row 14000/name 4294957742/type 1), `CutsceneNoRegistry` (+1 entry 14000/name 4294957742), `SDB` (+2 records 4294957742/4294957743). [STATE:160-165]
- **Tribute 25 v1.5-merged recipe: 3 changed files** — VictoryListData, EntranceListData, SDB; CutsceneNoRegistry byte-identical (14000 absent). [STATE:196-201]
- **Our 14000 motion package (corrected v102g): exactly 5 files** — `14000.clips`, `14000.adefs`, `VictoryListData` (681 rows, one row ID 14000/type 1/someId=14000/victoryFace=14000 + measured hide ID), `CutsceneNoRegistry` (2,161 count, one entry 14000/name 4294957742), `SDB` (96,993 records, decodes `TEST 14000`). [STATE:280-286]
- **v103a full aggregate: 131 files** (130 source + baker-generated `_textures.tdb`); includes Victory 654 rows w/14000, Cutscene 14000 (shared vtable), SDB `Test 14000`, clips `31A9A292...`, adefs `01FD0B9B...`. Mounted clean; **picker still absent** → proves the 5-file offline set alone is insufficient for UI visibility (serving-order problem). [STATE:177-189]
- **Extended registration set (writers built 2026-09-21, not yet in-game proven):** teams, character-mapping, cammove, face-textures, charmoveset, charprofilepro, charprofiletable, hide-ctrl(motion op only). Files: `append-2k25-teams-entry.js`, `append-2k25-character-mapping-entry.js`, `append-2k25-cammove-entry.js`, `append-2k25-face-textures-entry.js`, `append-2k25-charmoveset-slot.js`, `append-2k25-charprofilepro-entry.js`, `append-2k25-charprofiletable-entry.js`, `append-hide-ctrl-entry.js`, plus `jsfb-append-lib.js` + `parse-2k25-jsfb.js`. [STATE:28-37]
- **In-game proof status:** mount acceptance ≠ visibility. 6185 and 14000 both mounted (`accepted=1 rejected=0 failed=0`) but never appeared in the MOTION:FACE picker (T-section: TERRY FUNK → THE BAD GIRL). [STATE:184-189, 435-440]

### Q3. Name/string id scheme (SDB ids, negative ids, hashes)
- **SDB name IDs are u32 in the negative/high range:** next available stock ID = **4,294,957,742** (0xFFFFDAAE); used IDs 4294957742, 4294957743, 4294957744, 4294957745 (Tribute 26 wrote 4294957742/43/44/45 for BOB ENTRANCE A/B/C and victory 14000..14002). [STATE:21, 162, 175, 254, 276]
- **0xFFFFDAAE is a "negative soff" collision hazard:** the word at s14 rec69 table+188 = 0xFFFFDAAE is the **soff header of interleaved slot67** (table @861456 → vtable @871010, soff **-9554**, colliding with SDB id 4294957742). Raw u16/u32 scan counts are unreliable ("CharMoveSet motion hits are SDB-low-half noise; FaceTextures/CharMapping hits are slot/hash interiors"); only field-resolved references may be used. `jsfb-append-lib.js` provides **negative-soff-aware** splice primitives + ref-repair prover. [STATE:31-34]
- **SDB payload encoding:** rolling-XOR string pool with offset-dependent seed (`append_2k25_sdb_string.js`). Stock 2K25 base decodes (96,290 records; 81,209 printable); Tribute 25/our appender write stock-cipher payloads (decode: "Draven", "Test 14000", "Testing 6"). **Tribute 26 v1.6.0 SDB payloads do NOT decode under the rolling-XOR model** (1,333/113,783 printable) — 2K26-generation encoding; all SDB headers report version 256. [STATE:163, 215-216]
- **Bone/track hash:** TBUF child hash = **CRC32C(lowercase bone name)** — verified 44-45 hits across 31,137 distinct child u32s vs the 67-bone `new_rig_proto.hkt` rig; `J_Hips`→0x5e550b1a, `J_Spine1`→0xa5ab7d29, `root`→45th hit. Variants all dead except plain lowercase. **YANM hash function is unknown/custom** (40 combos of FNV-1/FNV-1a/djb2/sdbm/CRC32-ISO/CRC32C/Murmur3 × name variants = 0 matches). [BACKUP:3618-3646, 3706-3710]
- **CAK/path hashes:** 2K20 catalog hash == stock path hash using **FNV-1a64 lowercase** (v6.8). [2K20-DEAD:19-21] FNV1a-64 name-based key derivation is also the basis of the 2K20 CAK reader (`cak20-reader.js`). [BACKUP:2727]
- `.clips` track names resolved via **FNV1a-64** (`fnv-track-resolve.js`). [BACKUP:2384]

### Q4. CAMMoveData (MoveData/CAMMoveData.jsfb) — role and values for a new motion entry
- **Existence/role:** MoveData is present in **ALL four roots** (2K20/2K22/2K23/2K25) as `.jsfb` data — 2K22 sample contains `AttackData`, `CAMMoveData`, `DamageLevelPresets` — plus `Havok\`. It is described as "Relevant to overall bridge (movesets), outside current YANM→TBUF task." [BACKUP:3524]
- **Writer exists for 2K25:** `append-2k25-cammove-entry.js` (2026-09-21) — same-shape stock record clone, ID/name-word patch, single vector-slot splice, full ref-repair; wired into `bakeme-orchestrator.js` as the `cammove` config block with verify ops and into `pipeline-editor-suite.js`. [STATE:28-37]
- **Specific field values for a new motion entry: NOT documented in this batch.** (No CAMMoveData row dumps/field lists in these 12 files.) Treat as open: writer mechanics known, field semantics unproven.

### Q5. New-entry id numbering rules
- **New entries use the 14000+ series** (14000, 14001, 14002, 14003). Tribute writes 14000/14001/14002 as victory+entrance+cutscene triples; Tribute 25/26 add rows at 14000. [STATE:160-165, 175, 198, 232]
- **New-ID invariant (enforced in code):** writers must **reject any ID that already exists in stock** (e.g., 6185 is stock "THE USOS 1" — duplicate append rejected; Cutscene appender now rejects existing motion IDs before serialization). 14000 is verified absent from the 2,160-entry stock Cutscene registry and 680-row stock VictoryListData. [STATE:268-277]
- **SDB string IDs:** mint from the next free high-range ID (4,294,957,742 upward). Tribute 26 reused the same three name IDs (4294957742..44) across victory rows 14000..14002 ("BOB VICTORY A/B/C are not separate records"). [STATE:21]
- **Cutscene table sizes differ by family:** Tribute-25 family tables are **22 bytes** (stock share one vtable; Tribute's new table carries a fresh vtable; +40 bytes total) — the 32-byte appender refuses that family; families mix 28/32/36/40-byte tables. [STATE:163, 179]
- **Entry↔motion linkage:** Victory and Entrance entries correctly **share one motion ID each** (14000 set, 14001 set). [STATE:175]
- **Roster-side ID choice is the open semantic question** — Pro/Table/Face writers mint the caller-supplied character id; the oracle never shows the motion id there. [STATE:10, 37]

### Q6. EntranceListData row field values for new entries
- **2K25 writer approach:** rebuild the 9-vector file and append a template entry, or (narrow) preserve Entr byte-for-byte and replace **section 8**; alternate writers retain the whole original object graph and clone the section-8 graph (for visibility controls). [BACKUP:2445-2448]
- **Observed new-row values:** Tribute 25 v1.5-merged — `+1 sec8 row 14000 / name 4294957742 / type 1 / f4-f5 = stock refs`. Tribute 26 v1.6.0 — `+1 sec8 row 14000 / name 4294957742 / type 1`. [STATE:198, 162]
- **Schema warning:** 2K22 `EntranceListData.jsfb` uses a **different `Entr` schema** (2K25-pattern navigation root→field0→wrapper→field0→vector lands on count=0 at EOF); do NOT assume field parity with 2K25. [BACKUP:3914]
- 2K25 `EntranceListData.jsfb` lives under `Root\Entrances\`; 2K20 `EntranceListData` holds 1,452 motion records (209 victory-range). [BACKUP:3910, 3913; 2K20-DEAD:26-28]

### Q7. VictoryListData vs EntranceListData (separate tables, row shapes)
- **Separate files/tables.** VictoryListData identifier `Vict`; **root→wrapper→vector of 10-field records**: `wrestlerId u16, nameString u32, type u8, hideId u64, someId u32, victoryFace, victoryHeel, titleFace, titleHeel, doubleTitle u32s`. 2K25 file: `Root\Entrances\VictoryListData.jsfb` (33,208 B). [BACKUP:3910]
- **EntranceListData** identifier `Entr`; 2K22 file = 553 KB at `Root\Entrances\`; 2K25 schema is the one the writers target (9 vectors; section 8 = entrance vector). [BACKUP:3913-3914]
- **Victory registry elsewhere:** 2K20 pairs victory u32s in `Roster/CharProfilePro.jsfb` (Rock `[6100,6100]+[8701,8703]` @ wrestlerId 100); 2K20 has **no Vict table and no .adefs**. 2K22 has **no separate victory list** (Entrances = CAE_TemplateDataLists, EntranceListData, SuperStarTronSetup; no `Vict` identifier anywhere, including Roster CharMoveSet `Char` / CharProfile `Prof`). [2K20-DEAD:26-28; BACKUP:3912-3915]
- **Tribute row shapes (confirmed accepted by the game's tables):** Victory row = ID 14000 / name 4294957742 / type 1 / face 14000; Entrance row = sec8 ID 14000 / name 4294957742 / type 1; Cutscene = ID 14000 / name 4294957742. [STATE:162]

### Q8. How animation files are registered (Animation/Entrance/<id>.clips, .adefs, CaeAdvanced, CutsceneNoRegistry, motion tables)
- **Container pair per motion:** `Animation\Entrance\<id>.clips` + `<id>.adefs` (2K25: Entrance = 1,189 .adefs + 1,182 .clips; Victory = 1,029 .adefs + 1,028 .clips). [BACKUP:3513-3514]
- **Validated asset pair:** `14000.clips` = 555,592 B, 17 records, retains imported-motion hash `31A9A292...`; `14000.adefs` = 4,206 B, byte-identical to the stock structural companion. [STATE:283, 424]
- **CutsceneNoRegistry = the motion-registry gate.** Adding VictoryListData+SDB+clips+adefs **without** Cutscene registry produced picker absence ("missing motion-registry path"); adding a cloned Cutscene entry is required. v103a then proved registration files alone are still insufficient without pre-frontend serving. [STATE:435-447, 184-189]
- **CaeAdvanced:** appears in 2K23/2K25 animation trees (2K20/2K22 lack it); `build_2k25_entrance_partition_map.js` does "multi-phase animation pair analysis" (phase files). [BACKUP:3523, 2472]
- **Motion tables:** `entrance-motion-table.js` = bounded reader for the Entr FlatBuffer (2K24/2K25); `victory-list.js` = structural reader for Vict; `clips-layout.js` = 2K25/2K26 .clips structure; Group90 tool family (8-byte entry table, ULEB128 BigInt tokens, op0 scoring, lattice/descriptor correlation); `fnv-track-resolve.js` resolves .clips track names. [BACKUP:2374-2438]
- **File-format facts:** .clips carries the animation data; .adefs is only bone definitions (~28 names + hierarchy, ~4 KB — "never held motion"); .acts is fully self-contained (zero external refs). [BACKUP:3876-3885]

### Q9. Which tool/flow builds the CAK for a new entry (converters, orchestrators, bake)
- **Orchestrator:** `tools/bakeme-orchestrator.js` — config-driven full-BakeMe-tree orchestrator: copies source BakeMe → fresh output, applies allowlisted asset copies + active registry/string edits (SDB, Victory, Entrance, Cutscene) + 8 extended registration blocks (teams/charmapping/cammove/facetextures/charmoveset/charprofilepro/charprofiletable/hidemotion) with verify ops; writes `aurora-bakeme-proof.json` with per-file hash/size changes. [STATE:35, 86]
- **Baker:** Aurora-CAK-Foundry CLI `scripts/bake-v93-cli.js` using bundled self-contained **FTribTool.exe** + Oodle; FDIR 9.3 + encrypted header (`--encrypt-header`); success = `verified=true`, `payloadVerified=true`, fileCount/sourceFileCount, folderCount. (Self-contained backend works; DLL-backed invocation needs local .NET 9.) [STATE:22, 141, 179, 232]
- **Product rename:** archive backend renamed to **FTribTool** (assembly metadata, console banner, Foundry integration paths, CLI help); `.sdb` added to v9.3 raw-storage extension set; runner rejects logged fatal output even with exit code 0. [STATE:237-241]
- **CAK version limits:** our baker packs **v9.3 only** — v6.8 fails (`WriteString: String encryption (<V8) not yet implemented`), v8.3 fails (`NullReferenceException`); 2K22 baking must use external CakeTools v098a (which is blind to animation files — see Dead Ends). [BACKUP:3780-3795, 3892-3897]
- **Loader:** Secure-DataCtrlLink orchestrator (`dinput8.dll`) + separate addon `AuroraForge.CAKModLoader.ftrib`; validates v9.3 CAK structure, decodes FDIR v9.3 virtual paths, rejects exact mod-to-mod virtual-path collisions before mounting, honors `mods/manifest.json`; loader only loads addons whose exact filename+SHA-256 are in its compiled registry. [CAK25:9-26; SDCL26:23]
- **CAK naming rule:** keys are derived from the CAK filename — **never rename a completed CAK; rebuild under the new final name.** [SDCL26:130]
- **Converters feeding the bake:** `convert-yanm19-to-yanm20.js` (2K19→2K20, genuine IR-based), `convert-yanm20-to-tbuf22.js` + `-v2.js` (2K20→2K22; v2 = positional mapping, first output that differs from reference), `convert-acts22-to-anims23.js` (safety gate: only copies byte-identical TBUF payloads), `staged-pipeline.js` (19→20→22→23→25 orchestrator; only verified writers execute). [BACKUP:2394-2402, 3736-3742]

### Q10. Intended end-to-end user flow (import 2K19 animation → convert → create entry → edit fields → CAK → game)
1. **Import 2K19:** extract PAC via `tools/extract_2k19_pac.py` + `tools/extract_2k19_archive_entries.js` / `inspect_2k19_archive.js`; decode SHDC motion body (source: `analysis\victory-6100\decoded-shdc\...bin`). [STATE:13, 322-328]
2. **Convert 2K19→2K20:** `convert-yanm19-to-yanm20.js` → YANM20 IR → `yanm20-ir-writer.js`; package with `build-2k19-to-2k20-victory-package.js` (or batch `batch-2k19-to-2k20-victory-packages.js`). [BACKUP:2394-2398]
3. **Convert up the chain:** 20→22 via `convert-yanm20-to-tbuf22-v2.js` with a same-id (or structurally matching) 2K22 template; 22→23 rewrap AMYM→MINA carrying TBUF bytes (~96% untouched); 2K25→2K26 ≈ identity for carried assets. [BACKUP:3558-3561, 3736-3742]
4. **Create new entry:** rename assets to the new ID (e.g. 14000) → run append writers (Victory, Entrance, CutsceneNoRegistry, SDB, + extended tables) driven by `bakeme-orchestrator.js`; ID must not collide with stock; SDB name minted from next free high-range ID. [STATE:13, 28-37, 278]
5. **Edit fields:** via `pipeline-editor-suite.js` (active/coming map) + per-table editors; "Extended registration tables" is the active/write artifact. [STATE:35]
6. **CAK:** bake the full BakeMe tree via Foundry CLI/FTribTool (`verified=true` + `payloadVerified=true` required), **never rename after bake**. [STATE:22, 141; SDCL26:130]
7. **Game:** stage **exactly one registry CAK** in `mods\` (House Rule 2), launch, verify picker + preview. [STATE:12, 26, 182-189]
- **Current end-state of this flow:** all offline steps exist; the open gate is the user-run **TEST 14000 picker/preview verdict** (loader timing solved 2026-09-22: "boot-thread mount injection is verified on WWE 2K25 v1.23 and SNME"). [STATE:9-10, 37]

---

## VERIFIED FACTS (hashes / paths / counts)

- **Game folders:** 2K25 install `C:\WWE 2K25 Saturday Nights Main Event\`; 2K20 `D:\Program Files (x86)\Steam\steamapps\common\WWE2K20` (NO space — fuzzy-list game dir names, never exact-match); 2K19/2K22 have spaces. [STATE:12, 148; BACKUP:3964-3970]
- **Canonical read-only source roots:** 2K20 `D:\WWE26-mods\extracts\2k20\Root`; 2K22 `D:\AuroraForge-Aug26\Extracted Files\2k22\Root`; 2K23 `...\2k23\Root`; 2K25 `C:\Games\2k25-extracts\Root`; **2K26 `D:\WWE26-mods\extracts\Root`**; 2K24 ignored. Copy to `_work\` before any use. [BACKUP:3543]
- **2K25 counts:** Victory 1,029 .adefs + 1,028 .clips; Entrance 1,189 .adefs + 1,182 .clips; 2K20 Victory 695 .acts + 695 .evd; 2K22 Victory 760 .acts + 743 .adefs; 2K23 Victory 810 .anims + 810 .adefs. [BACKUP:3513-3514]
- **v103a bake:** `aurora-14000-compat-v103a.cak` 56,080,748 B SHA-256 `E57757C7...0578C`; verified=true payloadVerified=true fileCount=131 sourceFileCount=130 folderCount=84; 93/93 non-texture files byte-identical; 37 .dds baker-normalized. [STATE:179-181]
- **14000 package v102g:** SHA-256 `4D32869D...2E86`, 5,053,772 B, 5 files, verified=true payloadVerified=true. [STATE:283]
- **6185 registry-inclusive CAK:** `22D210A1...E9455`, 5,053,756 B; registry grew 97,032→97,068 B; name ID 4,294,957,742. [STATE:445-453]
- **Untouched Tribute 26 v1.6.0 control bake:** 62 files, 10,120,488 B, SHA-256 `AE2AAD53...39E7`; unpack 62/62 byte-identical; **crashes 2K25 ~2s post-mount** (control verdict). [STATE:141-156]
- **v102k full aggregate:** 10,365,112 B, SHA-256 `C1DE8125...4ACA`; accepted then crash at 15:43:20→dump 15:43:22 (70,592,896 B). [STATE:223-226]
- **thisistest2 bake (Tribute 25 v1.20 source):** 128 files / 82,140,812 B source; output 129 files / 55,837,764 B, SHA-256 `191E49AE...206B`; SDB IDs 4294957742..44 = `BOB ENTRANCE A/B/C`; Victory rows 14000..14002 reuse those name IDs. [STATE:16-27]
- **Bone-hash crack:** CRC32C(lowercase) — `J_Hips`→`5e550b1a` (child[1] of entry 10), `J_Spine1`→`a5ab7d29` (child[2]); 44/67 rig hits; rig = `Root\Havok\CharHavokNS\new_rig_proto.hkt` (74,784 B, 67 J_* bones, copied to `_work\rig-proto.hkt`). [BACKUP:3618-3646]
- **TBUF corpus:** 743 2K22 Victory .acts, 5,687 TBUF blocks, 5,687/5,687 relocation-parse passes; 4,641 blocks = 3 entries width 1; 1,046 blocks = 6 entries width 2; candidate fields at48[4]/at60[2] listed in **0/1046** six-relocation blocks. [BACKUP:1706-1707]
- **Body-layout corpus:** 711 simple / 19 descriptorExpanded / 12 offsetExpanded (742 files); simple = at60[1] matches prefix AND gap=20. [BACKUP:13-17, 2237-2239]
- **2K25 clips stock hash:** `Animation\Victory\6100.clips` SHA-256 `5C60C424A90C9C2199EF5F3A30B1F790E05FB0979C03BAE5C8E8CEACE89AFDB6`. [BACKUP:3520]
- **2K26 carryover:** 2K25 vs 2K26 Animation trees = 16,091 files each, zero filename differences; 6100/6101/6200 .clips and .adefs spot hashes identical; 6118.clips `FD90D3BF…` identical. [BACKUP:3537-3539, 3554]
- **Loader hashes (2K25 installed pair, 2026-09-19):** dinput8 `4962599F...C480` (native mount observer build), ftrib `DFB9BFA9...E70B`; earlier gated build addon `a808a933...f8e4` / core `1560642598...4f76`; pre-window crash pair core `02D6BFF6...E91C` / addon `447B878E...3C33` (both crashed). [STATE:42-66]
- **2K26 SDCL supported exe hashes:** original `dfb08c59f547ccd9c2a5820dd7520af064ca93d8642959b9f005e0c6f2958466`, v1.14 `7f558607bd6881c4547d752ea107fb03282a2980e47ef19ade597e096de4a0e9`, v1.16 `5f82c813e905ceb96053280cf3488f7f54bc35258c1a0eb027355d45f6c56da7`. [SDCL26:59-63]
- **Config bounds (SDCL 2K26):** MaxFileBytes 1-64 MiB, MaxCustomPackages 1-16, MaxCakArchives 1-32, ReadyTimeoutMs 5000-300000, CakPostPrimeDelayMs 0-10000; invalid file → ignored, safe defaults. `mods/manifest.json` is an allowlist (omitted files not loaded; invalid fails closed). [SDCL26:106-115, 92-102]
- **2K25 loader capability:** v9.3 CAK validation, exact mod-to-mod collision rejection, one verified changed-content visual replacement (v1.23), boot-thread mount injection verified on SNME profile. [CAK25:9-20]
- **Standalone tool hashes (1.6.0m handoff):** main app `37DF7FA8...064D`, DDS converter `0DCC5999...95E1`, extractor `17AAF7E3...F48B`. [HANDOFF-1.6:34-52]

---

## HOUSE RULES (binding per these docs)

- **Read-only source roots:** never write into extracted roots; copy to `_work\` first. [BACKUP:3472, 3486-3487]
- **Stage exactly one registry CAK per test** (House Rule 2); `C:\WWE 2K25 Saturday Nights Main Event\mods` was caught holding two (`cakeviewtest.cak` + `thisistest2.cak`). [STATE:12]
- **Additive-only** conversion: create new imported-animation IDs, preserve stock files; never claim conversion/in-game validity without direct evidence. [STATE:292]
- **Do not claim in-game validity** unless user-tested; mount count ≠ content override proof. [SDCL26:84; CAK25:19]
- **Never rename a completed CAK** (keys derived from filename). [SDCL26:130]
- **Reject duplicate stock IDs before serialization** (6185 lesson). [STATE:269-277]
- **Push discipline (GitHub):** verify `gh api repos/davegranlet/<repo> --jq .private` before every push; active dev on private `working` branches; main only on explicit ready-merge; working pushed within 30 min of local commits; all 23 repos flipped PRIVATE 2026-09-17. [GITHUB:244-262]
- **Machine-verify hashes** (63-char typo lesson); clean builds only; content-verify installs. [2K20-DEAD:66-68]
- **Do not touch** `D:\zips` (user-private) and `D:\zips`-adjacent personal folders; do not redistribute Clips Editor v2.21. [STATE:130; BACKUP:3484]
- **Do not re-create canonical tools** — extraction = `tools/extract_2k19_pac.py` + `extract_2k19_archive_entries.js`/`inspect_2k19_archive.js`; 2K25 list = `parse_2k25_victory_list.js` + `find-2k25-entrance-entry.js`; batch = `batch-2k19-to-2k20-victory-packages.js`; registration = `append_2k25_*` writers via `bakeme-orchestrator.js`; 14000 reuse = `copy-working-14000-registration.js`. [STATE:13]
- **Deliberate skips (never commit):** `app/dist` + `app/node_modules` (generated), CAK-Foundry `app/tools/` (138 MB binaries) + `package-tests/` (2.4 GB fixtures), runtime `pac-request.json`, `_work/` scratch. [GITHUB:206-215]

---

## REGISTRATION / TOOL INVENTORY (script paths + purpose)

2K25 append writers (all function+CLI dual API, all with node:test suites; 38/38 tests green after wiring):
- `tools/jsfb-append-lib.js` — negative-soff-aware splice primitives + ref-repair prover [STATE:31]
- `tools/append-2k25-teams-entry.js`, `append-2k25-character-mapping-entry.js`, `append-2k25-cammove-entry.js`, `append-2k25-face-textures-entry.js`, `append-2k25-charmoveset-slot.js`, `append-2k25-charprofilepro-entry.js`, `append-2k25-charprofiletable-entry.js`, `append-hide-ctrl-entry.js` [STATE:31]
- `tools/append_2k25_victory_entry.js` — clones VictoryListData entry + overrides [BACKUP:2444, 3910]
- `tools/append_2k25_entrance_entry.js` / `_template_entry.js` / `_preserving_graph.js` / `_clone_graph.js` [BACKUP:2445-2448]
- `tools/append_2k25_sdb_string.js` — rolling-XOR string pool appender [BACKUP:2449]
- `tools/patch_2k25_victory_list.js`, `patch_2k25_victory_name_type.js`, `parse_2k25_victory_list.js`, `prepare-6104-editor-import.js` [BACKUP:2450-2453]
- `tools/bakeme-orchestrator.js` + `.test.js`; `tools/pipeline-editor-suite.js`; `scripts/stage-public-tools.js` (fail-closed allowlist, 57 files staged) [STATE:35, 86]
- Format libs: `tbuf-v1.js`, `amym-container.js`, `amym-tbuf-report.js`, `yanm-keyframes.js`, `yanm20-reader/encoder/ir-writer/normalized-ir.js`, `adefs-container.js`, `clips-layout.js`, `victory-list.js`, `entrance-motion-table.js`, `fnv-track-resolve.js`, `group90-*.js` [BACKUP:2358-2388]
- Research: `tbuf-v1-relocations.js` (+report), `tbuf-v1-body-candidate-record.js`, `tbuf-v1-body-prefix-corpus.js`, `tbuf-v1-body-offset-hypotheses.js`, `descriptor-full-analysis.js`, `clips-native-inspect.js`, `scan-clips-corpus.js` [BACKUP:2404-2438]
- Ghidra (read-only): `DecompileFunctions.java`, `DecompileEntrypoints.java`, `DumpInstructions.java`, `DumpMemoryWords.java`, `FindEditorStringReferences.java`, `FindSymbols.java`, `ReferencesToRange.java` [BACKUP:2481-2493]
- Loader-side: `tools/check-datactrlink-log.js` (grades DataCtrlLink.log sessions: expected CAK, pre-window acceptance, fallback-only, race warnings) [STATE:63, 70, 81]

---

## FILE-FORMAT FINDINGS

- **FDIR CAK versions:** 2K20 v6.8 (88-byte header, flags `01 C0`), 2K22 v8.3 (92-byte: 8 prefix + 84 encrypted catalog), 2K23 v8.3, 2K25 v9.3 (prefix `46 44 49 52 09 03 00 81`), 2K26 v9.9. Prefix always `46 44 49 52` ("FDIR"). 2K22 v8.3 prefix `46 44 49 52 08 03 01 C0`. [BACKUP:2641, 2724-2725, 3185, 3315, 3799, 3819-3820]
- **Cipher evolution (from CakeTool C# `CakeCryptor.cs`):** v6.7 FNV1a-64→XOR-CRC; v6.8 MetroHash128crc_1→XOR-CRC; v8.2 ChaCha20+MetroHash→byte-rotation; **v8.3 ChaCha20+MetroHash→RotateCrypt** (`RotateRight(data[i], (i-1)^5)` then `RotateLeft(rotated ^ (i + keyBytes[(i+1)%4] - 1), i+1)`); file-data variant uses `(i-1)%8 ^ 0xD`; v8.7/v9.1 XOR-CRC; v9.2 ChaCha20+SFMT+MetroHash; v9.3 ChaCha20+SFMT+UnkHash. v8.3 keygen = name seed `"{filename.toLowerCase()}0803"` → zigzag table → ChaCha20(first 0x3F, ConstantKeyV8/IVV8) → MetroHashUnkCustomV9_1 → XOR mixing → second MetroHash → XOR 4 uint32s. [BACKUP:2977-3015]
- **AMYM container:** 2K20 and 2K22 share structure (15 entries, ids 24,23,22,21,20,19,18,17,16,15,14,13,12,10,0); only entry 0 differs (YANM vs TBUF/ANIM v10); group count at offset 4. [BACKUP:2584-2603]
- **YANM (2K20):** record = type(2)+headerLen(2)+hash32(4)+flags1(4)+count1(4)+zero(4)+3 BE floats+extras; types 0x8004 compact, 0xa000 extended, plus 0x0204/0x0304/0x2200/0x2300/0x4300/0x5300; count1≈19 keyframes; stream = 4-byte records (uint16BE delta + int16BE value). Entry 0 of 6118 contains a **second YANM block** (9 records at offset 256320, first hash `c5879e5`) carried 1:1 as a second TBUF block. [BACKUP:50-58, 107-113, 3572-3614]
- **TBUF/ANIM v10:** 16-byte TBUF header (magic, version, declaredBufferBytes@+8, **relocationCount@+12** — "channelCount" is a legacy misnomer) + 8-byte ANIM header (magic + version); relocation table at `TBUF+16+declaredNativeDataBytes`; entries 1/2/4 bytes; self-relative 64-bit pointers resolved by `ADD RCX,RDX / MOV [RDX],RCX` (VA 1405c1645-48). Supported: TBUF v1/v2, ANIM v10 (2K22/23), v11 (2K24), v16 (2K25/26). [BACKUP:1704, 2119, 2852-2856]
- **TBUF body descriptor model:** descriptor word = highByte (scale/level: 16 base, 32/48/64/80/96 expanded; multiples of 16), midByte (variant 1,2,3,4,6), low16 (unique id, 116 values). `at60[1]` differing from prefix ⇒ descriptorExpanded (19/19 reliable); matching prefix + gap=20 ⇒ simple; matching prefix + gap>20 ⇒ offsetExpanded (12). Pre-computed by the content pipeline, not by the game; no runtime function computes it; SHDC source holds 17 matching highByte/midByte descriptors. [BACKUP:13-17, 2220-2262]
- **SDB:** string pool with rolling-XOR + offset-dependent seed; 2K22 `Root\Sdb\` = 6 language files, ENG.sdb 4,783,572 B; header version 256 across generations. [BACKUP:2449, 3932-3935; STATE:215-216]
- **Victory/Entrance tables:** see Q7. CutsceneNoRegistry counts: 2,160 stock (2K25), 2,342 (Tribute 26 v1.6.0), 2,127 (Tribute 25 family); tables mix 28/32/36/40-byte; Tribute-25 family uses 22-byte tables. [STATE:276, 141, 157, 163]
- **.mprms (2K20-only):** 66 `.acts`+`.mprms` pairs under `Animation\Acts\Basic`; header magic `MPRM`@0, size u32LE@4, inner magic `MPRMc3`@8, `deadbeef` sentinel. 2K20-only `Animation\MotionParameter\*.jsfb` (DiveMotionGroup, MotionParameterGroup, OverTheTopRopeAnimation). Hypothesis: 2K20 stores motion parameters externally; 2K22+ embeds them (`Animation\Data\GameAnimData.jsfb`). [BACKUP:3515, 3545-3548]
- **MINA `.anims`:** 2K23 Victory (810 .anims+adefs); transition began 2K22 (`Acts\Basic` 392 MINA .anims). 2K25/2K26 `Acts\Basic` = `MotionArea_*.clips`. [BACKUP:3513-3521, 3540]
- **.evd:** 34-byte header, 32-byte name; 2K20 6100 internal name `6100_VIC_SINGLE_The_Rock_M_Face`. [BACKUP:2370, 336]
- **.adefs:** `_rev` v6 zlib container; 6118.adefs decodes to ~30 interaction-bone names (`AttackPart_/Hit_/Sell_/TargetPart_/Cover_/Prev_Cover_/Car_*`). [BACKUP:3628]
- **AnimSystem:** 2K22 `ratanim.adefs` 13,788,314 B → 113,093,752 B payload; 2K20 `ratanim.bin` + `filters\`. [BACKUP:3925, 3981]
- **2K20 loose-dir fact:** no `Animation\` dir on disk; loose-dir test staged `Animation\Victory\6100.acts`+`.evd` directly (delete-2-files rollback). [BACKUP:3977-3985]

---

## DEAD ENDS / DO-NOT-REPEAT

- **2K20 mod slots are stock-first:** slots 06-99 mount but never shadow stock bytes; `mods/` means nothing to the game; no further mount experiments recommended. Every override verdict in history is consistent with this single rule. [2K20-DEAD:1-11]
- **Duplicate-ID approach (6185) is wrong:** 6185 = stock "THE USOS 1"; successful mount + serialization did NOT yield picker visibility; writer now rejects duplicates. [STATE:265-277]
- **v1 value-search converter is a no-op by construction** (searches reference for source float bytes then writes same values back) — both 6100→6100 and 6204→6118 runs byte-identical to reference. Do NOT re-run expecting different bytes. [BACKUP:3450-3469]
- **Field-relative address hypothesis refuted** (A = at48[4]+u48+16 produced out-of-bounds 3882562146 for a 223,216-byte payload; the 487-file match was coincidence). Descriptor words are semantic selectors. [BACKUP:1957-1961, 2009-2015]
- **Stride-32 does not universally apply** to TBUF body tables (entry-0 tables mix record kinds; stride is per-block). [BACKUP:3670-3673]
- **Standard hash functions do not decode YANM hashes** (40 combos, 0 matches); positional mapping is the YANM-side key. [BACKUP:3569-3570]
- **San847/v6.8 C0-flavor CAKs:** our reader rejects (dir-section checksum mismatch, third v6.8 flavor with payload-protect bit); section cipher unknown — game-oracle only. [2K20-DEAD:23-25; GITHUB:219]
- **Tribute 26 v1.6.0 aggregate is 2K26-native and crashes 2K25** (control-verified, with and without our additions); its SDB payloads don't decode under rolling-XOR. Do not use the v1.6.0 base for 2K25 again. [STATE:152-156, 173-175, 215-216]
- **Too-early pre-window mount + DXGI Present overlay crashed 2K25 v1.23** (two crash dumps 19:26/19:27); do not ship that build; gates default off (`RuntimePreWindowMount`, `EarlyPreWindowMount`, `DxgiOverlayNotice`). [STATE:57-66, 49-55]
- **CakeTools v098a is blind to animation files:** strings scan shows `.acts`×0 `.adefs`×0 `.clips`×0; four deterministic empty 171 KB bakes with the correct folder selected ("wrong folder" theory dead). v098a emits v8.2 headers vs stock v8.3 (watch-item). [BACKUP:3866-3872, 3892-3897, 3819-3858]
- **Our CakeTool backend cannot pack v6.8 or v8.3** (NotImplementedException / NullReferenceException); 2K22 packing needs external tooling or a future v8.3 writer RE'd from the game exe (mount fn ~VA 0x26b390 on 2K22). [BACKUP:3780-3789, 3904]
- **2K22 has no separate victory list** and its `Entr` schema differs from 2K25 (navigation lands count=0 at EOF). SDB strings (RUBY RIOT/THE ROCK) are dialogue/UI lines, not a registry. [BACKUP:3907-3918, 3886-3891]
- **AnimSystem likely does not own victory selection** (6100 binding is Victory-specific, not global) — but ratanim's 113 MB payload was never scanned for victory IDs. [BACKUP:3919-3931]
- **No converted animation has ever been verified in-game in project history**; the only prior in-game proof is a 2K25 texture override. 2K20 loose-file test was staged but verdict not recorded in this batch. [BACKUP:3955-3985]
- **Don't build on index-level pseudo-patterns** in stream A ([0, 0x140001, 0x900X01dc, small-int] repeats) until stride is proven; compare u32LE-to-u32LE, never eyeball hex. [BACKUP:3655-3666]

---

## TIMELINE OF TEST VERDICTS (2K25 new-entry effort)

| Date | Artifact | Result |
|---|---|---|
| 09-19 | v102f (6185, duplicate ID) | accepted; picker absent (TERRY FUNK→THE BAD GIRL) [STATE:265-271] |
| 09-19 | v102g/v102k, Tribute 26 v1.6.0 aggregate | accepted; crash ~2s post-mount [STATE:223-226] |
| 09-19 | untouched v1.6.0 control | accepted; identical crash → base incompatible [STATE:141-156] |
| 09-19 | v103a (compatible Tribute-25 base + 14000 bindings) | clean load, crash-free; **picker still absent** → serving-order diagnosis [STATE:177-189] |
| 09-19 | loader pre-window experiments | DXGI/runtime-prewindow build crashed; gated off [STATE:49-66] |
| 09-21 | six registration writers built + thisistest2 exact Tribute bake staged | 38/38 tests green; awaiting picker verdict [STATE:16-37] |
| 09-22 | reconciliation | writers DONE; **boot-thread mount injection verified on 2K25 v1.23 + SNME**; next gate = TEST 14000 picker + preview evidence [STATE:5-14] |

---

## BATCH-6 FILE INVENTORY (all 12 read completely)

1. `_archive\legacy-workspaces\Aurora-Forge-1.6.0m-Complete-Dual-Platform\Documentation\AURORA_FORGE_HANDOFF.md` (69 lines) — Aug-2026 handoff; source archive SHA-256s; tools stay standalone.
2. `.tools\ghidra_12.1.3_PUBLIC\docs\GhidraClass\BSim\BSimTutorial_Basic_Queries.md` (157) — BSim query tutorial; no project content.
3. `.tools\ghidra_12.1.3_PUBLIC\docs\GhidraClass\Debugger\A4-MachineState.md` (400) — Ghidra debugger tutorial; no project content.
4. `.tools\ghidra_12.1.3_PUBLIC\GPL\DemanglerGnu\README.md` (1) — title only.
5. `.tools\ghidra_12.1.3_PUBLIC\GPL\DMG\README.md` (1) — title only.
6. `.tools\ghidra_12.1.3_PUBLIC\server\svrREADME.md` (865) — Ghidra server admin; no project content.
7. `Aurora Forge Sept 20\Secure-DataCtrlLink-WWE2K26\README.md` (174) — fail-closed loader, approved addons, exe hashes, config bounds, CAK replacement/rename rule.
8. `AuroraForge_WWE_PC-Game_Modding_Tool\Aurora-Forge-CAK-Mod-Loader-WWE2K25\README.md` (34) — v9.3 validation, collision rejection, verified visual replacement, SNME profile.
9. `...\WWE2K19-to-2K26-Entrance-Prototype\AURORA_FORGE_ACTIVE_STATE.md` (469) — current authoritative ledger: writers, loader, bakes, crashes, next gate.
10. `...\notes\ACTIVE-LOG-BACKUP-20260917.md` (3,985) — full pre-split research history: YANM→TBUF, TBUF relocation/descriptor model, CRC32C crack, CAK ciphers, script catalog, dead ends.
11. `...\notes\HANDOFF-2026-09-18-2K20-SLOTS-DEAD.md` (79) — 2K20 stock-first resolver verdict; Tribute 2K25 method cracked; tool/repo inventory.
12. `...\notes\LOG-GITHUB.md` (262) — repo sync history, version-lock audit, visibility/push rules, external surveys.

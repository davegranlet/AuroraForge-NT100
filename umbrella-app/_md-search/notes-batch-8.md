# Notes — batch-8 (73 files, read 2026-09-24)

Sources: the 73 paths listed in `_md-search\batch-8.txt`. Every fact below cites its source file (short name after `—`).
Short names used: `DEEPSEEK` = `WWE2K19-to-2K26-Entrance-Prototype\DEEPSEEK_V4_1_HANDOFF_2026-09-19.md`; `BOBNOBOB` = `...\notes\HANDOFF-2026-09-20-BOBNOBOB-TEST-CAK.md`; `SRCMAP` = `...\notes\2026-09-12-animation-converter-source-map.md`; `CHKPT911` = `...\notes\2026-09-11-extraction-checkpoint.md`; `LOG2022` = `...\notes\LOG-2K20-2K22-CONVERTER.md`; `LOGSOURCES` = `...\notes\LOG-SOURCES.md`; `CRASHHANDOFF` = `...\notes\HANDOFF-2026-09-19-BETA100A-LOADER-CRASH.md`; `KF` = `_untracked-repo\KNOWLEDGE-FINDINGS.md`; `SEPT18` = `Sept18th-2026\*.md`; `AUDIT919` = `Sept18th-2026\AUDIT-2026-09-19-WORKSPACE-CODE.md`; `CLAUDE831` = `_archive\handoffs\packages\CLAUDE_AI_HANDOFF_2026-08-31.md`; `MASTER` = `AURORA-FORGE-CONSOLIDATED-MASTER-HANDOFF.md`; `ALLWORK` = `allfiles-02-work.md`.

---

## ANSWERS TO THE 10 QUESTIONS

### Q1. Which row to clone as template for new entries in each registration file

- **EntranceListData.jsfb** (`Entrances\EntranceListData.jsfb`, 2K25 FlatBuffer 358,752 B): new rows live in **section 8** of the 9 entrance sections (0–8). In the bobnobob test the three new rows are section 8, **indices 673–675**, ids 14000–14002, `type=1`, `hideId=null`, `field9=30001` (BOBNOBOB; SRCMAP "Editor write target; FlatBuffer, 358,752 bytes"). Clone an existing section-8 row and bump index. Tooling exists: `copy-working-14000-registration.js` (Vict+Entr table clone by id), `jsfb-struct-appender.js` (clone struct, change one u32, insert, re-fix all uoffsets) (KF).
- **VictoryListData.jsfb** (`Entrances\VictoryListData.jsfb`, 2K25 FlatBuffer 33,208 B): new rows in the bobnobob test are **indices 654–655**, wrestlerId 14003/14004 (BOBNOBOB). 2K25 baseline was 713 rows → 714 with ID 14000 in the DEEPSEEK candidate (DEEPSEEK). Clone an existing row (e.g. the row at index 653, wrestlerId ≈ previous max) and renumber.
- **CutsceneNoRegistry.jsfb** (`Cutscene\CutsceneNoRegistry.jsfb`): new ID entry appended; finder/appender follows FlatBuffer pointers and supports both observed root layouts; appender rejects duplicate motion IDs before serialization (DEEPSEEK). 2,342 → 2,343 entries for one new ID (DEEPSEEK).
- **ENG.sdb**: append one new record for the display string (DEEPSEEK; BOBNOBOB).
- Do NOT clone rows from historical TRIBUTE catalog files — they lack current template IDs 1382, 1391, 1393, 1397, 1398, 1399, 1402 (SRCMAP).

### Q2. Which files MUST be written for a new entry to appear and play (tested file sets)

Three levels of evidence exist; the working answer is the bobnobob correction (under-registration was the real blocker):

1. **Minimal set that was loader-accepted but crashed post-mount (v102k)** — 64-file aggregate = 62 originals (59 byte-identical) + 2 new + exactly 3 intentionally changed:
   - changed: Cutscene registry (`CutsceneNoRegistry.jsfb`), Victory list (`VictoryListData.jsfb`), SDB (`Sdb\ENG.sdb`)
   - new: `Animation/Victory/14000.clips` + `Animation/Victory/14000.adefs`
   (DEEPSEEK; KF)
2. **The 9-file registration/dependency context** in the preserved successful modded-CAK oracle `D:\AuroraForge-Aug26\25 bake folders\extracted-modded-cak`:
   1 `Entrances\EntranceListData.jsfb`, 2 `Entrances\VictoryListData.jsfb`, 3 `MoveData\CAMMoveData.jsfb`, 4 `Roster\CharMoveSetDataTable.jsfb`, 5 `Roster\CharProfilePro.jsfb`, 6 `Roster\CharProfileTable.jsfb`, 7 `Roster\FaceTextures.jsfb`, 8 `Sdb\ENG.sdb`, 9 `Hide\HideCtrlData.hidelink.jsfb` (SRCMAP).
3. **CORRECTED full spread from the user's working CakeView bake** (`this-is-the-test.cak`) — a new menu item touches MANY files, not just Victory/Cutscene/SDB:
   `Entrances\EntranceListData.jsfb`, `Entrances\VictoryListData.jsfb`, `Hide\HideCtrlData.hidelink.jsfb` (MISSED by converter), `Roster\CharMoveSetDataTable.jsfb` (MISSED), `Roster\FaceTextures.jsfb` (MISSED), `Cutscene\CutsceneNoRegistry.jsfb`, `Roster\CharProfilePro.jsfb`, `Roster\CharProfileTable.jsfb`, `Characters\CharacterMapping.jsfb`, `MoveData\CAMMoveData.jsfb`, `Stable\TeamsTable.jsfb`, several `CreateShow\*.jsfb`, plus `Sdb\ENG.sdb` (BOBNOBOB; proofs in `analysis\tribute-bake-test-sept19-cak\common-diffs.json` (32 differing files) and `reference-scan-working-vs-ours.json` (name id 4294957742 present in working `HideCtrlData.hidelink.jsfb`, absent in ours)).
   - Conclusion: **the converter under-registers**; it must write the name id into ALL of the above tables for a new slot to appear (BOBNOBOB; KF). This is "the real blocker, independent of loader timing" (BOBNOBOB).
   - 2K20 analogue: no VictoryListData exists in 2K20; 2K20 victory registration = CharProfilePro pairs + EntranceListData motion records (LOGSOURCES).

### Q3. Name/string id scheme (SDB ids, negative ids, hashes)

- Visible label = the JSFB row's `nameString` = the numeric **SDB record key**; the text is XOR-decoded from the SDB payload, never stored plaintext (BOBNOBOB).
- Observed new-name ids: `4294957742` (signed `-9554`) = "bobnobob 1"/"TEST 14000"; `4294957743` (−9553) = bobnobob 2; `4294957744` (−9552) = 3; `4294957745` (−9551) = 4; `4294957746` (−9550) = 5 (BOBNOBOB; DEEPSEEK). Hex: 4294957742 = 0xFFFFDAAE.
- **SDB key formula: `(offset & 0xff) ^ 0xcd`** (KF, citing `REPO-CONTENTS-AUDIT-2026-09-20.md`). SDB writer must preserve valid aliased/shared payload offsets and re-key unique payloads safely after table growth (DEEPSEEK).
- ENG.sdb grew 113,779 → 113,780 records for the one new string (DEEPSEEK).
- Every table references the numeric id; the label only exists as the decoded SDB payload for that id (BOBNOBOB).
- TBUF child hashes are **CRC32C(lowercase bone name)** — proven (e.g. `j_hips`→0x5e550b1a, `j_spine1`→0xa5ab7d29, `root`→also in dictionary); 45 hits from 631 rig strings, all plain-lowercase (LOG2022).
- YANM record hashes are opaque/custom — 40 standard-hash combos all missed; do not retry standard hashes (LOG2022).

### Q4. CAMMoveData (MoveData/CAMMoveData.jsfb) — role and values for a new motion entry

- `MoveData\CAMMoveData.jsfb` is one of the **9 known entrance/victory dependency files** in the working oracle (SRCMAP). It is also one of the files the converter **MISSED** (name id present in working bake, absent in ours) (BOBNOBOB).
- Sizes on record: 2K20 = 1,589,028 B; 2K24 = 5,554,312 B (SRCMAP). 2K25 size not given in this batch.
- No field-level values for CAMMoveData were recovered in this batch; it is a required carrier of the name id for a new entry, not an animation payload (BOBNOBOB).
- Related: `Roster\CharMoveSetDataTable.jsfb` (2K25 5,498,944 B, `Char` ident) = character move assignments; also MISSED (SRCMAP; BOBNOBOB). `Gameplay\MotionParameter\MotionParameterGroup.jsfb` (2K25 1,201,280 B, 11 root fields) is motion parameters (SRCMAP).
- Do not treat CAMMoveData as optional: the bobnobob correction explicitly lists it among the required registration spread (BOBNOBOB).

### Q5. New-entry id numbering rules

- **Additive IDs only; new test ID starts at 14000** (DEEPSEEK; KF). Never reuse stock **6185** (occupied, = THE USOS 1) (DEEPSEEK; KF).
- Test mapping used: Entrance 14000/14001/14002, Victory 14003/14004 (BOBNOBOB). The user later corrected that the intended numbers were messed up; scan by label (`bobnobob <n>`), not by assumed ID (BOBNOBOB).
- 6104 is unused in `Root/Root/Animation/Victory` (no `6104.clips`/`.adefs`) — first safe probe target was a new 6104 Victory asset (CHKPT911).
- 2K19→2K25 candidate pool: 2K19 pac/evt = 4,391 files → 540 scoped IDs; 74 missing from 2K25 (56 bridge-named, 18 unknown: 6104, 7001, 7009, 7012, 7013, 7100, 7101, 7105, 7150, 7153, 7180, 7181, 7600, 7602, 7604, 8050, 8400, 8755) (KF). 6185/6204 resolve to Uso18/Ruby Riot bridge names (KF).
- 36 2K20-only Victory IDs (new-entry pool for 2K20 bridge): 6204, 6208, 6209, 6220, 6288, 6443, 6503, 6586, 6634, 6635, 6637, 6638, 6641, 6642, 6650, 6651, 6652, 6654, 6655, 6656, 6660, 6725, 6740, 6764, 6805, 6812, 6901, 7202, 8710, 9122, 9218, 9274, 9317, 9511, 9514, 9515 (LOG2022).
- Victory ids use 6000–9999; entrance ids use 1–5999 (GAME-INSTALL-LOCATIONS).

### Q6. EntranceListData row field values for new entries

Full parsed entrance rows from the working CAK (BOBNOBOB):

```json
[
  {"section":8,"index":673,"id":14000,"nameString":4294957742,"type":1,"hideId":null,"field4":247,"field5":502,"field6":1152,"field7":26008,"field8":504,"field9":30001},
  {"section":8,"index":674,"id":14001,"nameString":4294957743,"type":1,"hideId":null,"field4":390,"field5":502,"field6":1152,"field7":26008,"field8":638,"field9":30001},
  {"section":8,"index":675,"id":14002,"nameString":4294957744,"type":1,"hideId":null,"field4":529,"field5":504,"field6":1160,"field7":26007,"field8":640,"field9":30001}
]
```

- Field pattern: `field4` increments per entry; `field5`/`field6` are near-constant (502/1152 or 504/1160); `field7` = 26008/26008/26007; `field8` varies; `field9` = 30001 always. Interpretation of field4–field9 is not yet decoded (BOBNOBOB).
- Entrance catalog sections: 9 vectors (0–8) located by `locate-entrance-vectors.js` (KF).

### Q7. VictoryListData vs EntranceListData (separate tables, row shapes)

- Separate files/tables: `Entrances\EntranceListData.jsfb` (2K25 358,752 B) vs `Entrances\VictoryListData.jsfb` (2K25 33,208 B) (SRCMAP).
- Entrance row shape: `section, index, id, nameString, type, hideId, field4..field9` (BOBNOBOB).
- Victory row shape: `index, wrestlerId, nameString, type1, hideId, someId, victoryFace, victoryHeel, titleVictoryFace, titleVictoryHeel, doubleTitleVictoryFace, doubleTitleVictoryHeel` (BOBNOBOB). DEEPSEEK's 14000 row: `nameString=4294957742, type=1, someId=14000, victoryFace=14000`, all 713 original rows semantically unchanged.
- bobnobob victory rows (indices 654/655): hideId `"7871869299616959835"` (string!), someId/victoryFace 6229 or 6439, victoryHeel 8701, titleVictoryFace 8703, titleVictoryHeel 8712, doubleTitleVictoryFace 504/638, doubleTitleVictoryHeel null (BOBNOBOB).
- 2K20 has **no VictoryListData** (`Vict` ident absent); 2K20 registration = CharProfilePro u32 pairs + EntranceListData motion records (LOGSOURCES).
- 2K25 counts: Victory 1029 `.adefs` + 1028 `.clips`; Entrance 1189 `.adefs` + 1182 `.clips` (LOG2022).

### Q8. How animation files are registered

- New animation files live under `Animation/Victory/<id>.clips` + `<id>.adefs` (Victory) or `Animation/Entrance/<id>.clips` + `.adefs` (Entrance) (DEEPSEEK; CHKPT911).
- `.adefs` = bone definitions only (~4 KB: 4219/3894 B observed; 4206 B for new 14000.adefs); it never held motion; modern `.adefs` wrapper uses ZLIB (`_rev` v6 zlib container; 2K22 decode via `adefs-container.js` yielding ~28–30 interaction-bone names) (LOG2022; DEEPSEEK).
- `.clips` = modern motion payload. Stock 2K25 6100.clips = 448,304 B; new 14000.clips = 555,592 B / 17 records (SRCMAP "25 bake folders"; DEEPSEEK).
- Registration tables:
  - `Cutscene\CutsceneNoRegistry.jsfb` = cutscene registry (DEEPSEEK).
  - `Cutscene\ListData\EntranceMotionTableData.jsfb` (1,204 B, 2K24↔2K25 byte-identical, SHA-256 `2C7AF323AD54B00CB6294E9A7C472A0952D4B32AD0EEB5B862797362CAAF6955`) = entrance-to-motion mapping / "stable registration anchor only" (SRCMAP).
  - `Animation\Data\GameAnimData.jsfb` (`Game`), `Animation\Data\MotionAreaData.jsfb` (`Moti`) (SRCMAP).
  - CaeAdvanced phase files exist from 2K23+; probe asset `CaeAdvanced\1000100.adefs`+`.clips` (LOGSOURCES; ALLWORK).
- No external file references inside `.acts` — the format is fully self-contained; a new ID lacks only registration, not motion bytes (LOG2022).
- `EntranceMotionTableData` and the 9-file dependency set are the "registration/dependency packaging" proof; the oracle has no `.clips`/`.adefs` payload, so it cannot reveal modern semantic motion encoding (SRCMAP).

### Q9. Which tool/flow builds the CAK for a new entry

- **Aurora CAK Foundry + FTribTool** is the archive backend. FTribTool stores `.sdb` raw when Oodle would expand the transformed database and rejects false-success fatal backend output (DEEPSEEK).
- `build-2k19-to-2k25-replace-clips.js` / `-cak.js` bake via Foundry `bake-v93-cli.js`; the replace path creates NO registry entries and never modifies stock in place (KF).
- v103 rebake recipe: **CakeTool pack v9.3 + `oo2core_9_win64.dll`** (KF).
- `bakeme-orchestrator.js` = copied-tree + per-file SHA proof orchestrator; it **refuses overwrite and is NOT a baker** (KF).
- The user's own working bakes are made with **Tribute/CakeView** (bakes a whole BakeMe folder) (BOBNOBOB).
- CAK format: protected FDIR; 2K25 = **v9.3** (`46 44 49 52 09 09 ...`), 2K22/2K23 = v8.3 (`46 44 49 52 08 03`), 2K26 = v9.9 (`0x99`) (LOG2022; CLAUDE831; AUDIT919).
- **Never rename a completed CAK**: the key/protection is derived from the final filename; rebuild under the new name (SEPT18 README; CLAUDE831). CakeView derives it from the lowercase name/path + major/minor nibbles (`FUN_14009f9c0` → `FUN_1400c8f40`; for `0x99` args are `9,9`); all known-good keys start with hex `F` (CLAUDE831).
- Foundry verification: reopen output, recover every stored payload byte-for-byte, `verified=true`, `payloadVerified=true` (DEEPSEEK; MASTER).
- Foundry v1.7.9.a removed the stock-catalog allow-list: additive mod files are accepted alongside replacements; "Packaging does not make an asset selectable by itself: new animations still need the game's corresponding registry/reference data" (1.7.9.a notes).

### Q10. Intended end-to-end user flow (2K19 animation → new 2K25 entry → CAK → game)

Active surface in the Beta1.0.0a portable app (CRASHHANDOFF): 2K19 source intake readers; 2K19→2K20 proven bridge tooling; 2K25 `.clips` inspect/build path; VictoryListData editor; EntranceListData finder/diff/editor; CutsceneNoRegistry finder/inspector/editor; SDB reader/summary/writer; BakeMe full-tree copy/edit/proof orchestrator; CAK catalog inspection; DataCtrlLink log checker.

Beta1.0.0c controlled replace flow (TESTING_Beta1.0.0c.md):
1. Back up loader files/`mods`/manifest; use 2K25 v1.23 or SNME profile; install matched `dinput8.dll` + `plugins/AuroraForge.CAKModLoader.ftrib`; keep rollback.
2. Have a decoded 2K19 motion + extracted stock 2K25 `6100.clips` template.
3. In the preview exe: select decoded 2K19 motion → select stock `6100.clips` template in "2K25 Replace / Mod CAK" → set virtual path `Animation/Victory/6100.clips` → record index `15` → choose new output paths → build; confirm reopen/validation.
4. Put only the new CAK in `<WWE 2K25>/mods`; disable any other CAK containing `Animation/Victory/6100.clips`.
5. Launch; pass evidence = loader accepts/registers with no collision, game reaches menu, the Victory 6100 path is exercised, the motion is visibly the imported 2K19 motion, no regressions. A successful mount alone is not a conversion pass.
6. Record CAK filename + SHA-256, profile, loader hashes, log lines, observed motion, rollback result. Roll back by removing the CAK and restoring manifest/loader.

New-entry (additive) flow, as evidenced: import 2K19 motion → decode to IR/`.yanm20.bin` → convert (2K19→2K20 bridge → 2K20→2K22 YANM→TBUF → 2K23/2K25 stage) → build `.clips`+`.adefs` under new ID → clone/write all registration tables with the new name id + SDB string → BakeMe full tree → Foundry/FTribTool bake to protected FCAK under final name → mount one CAK → verify TEST 14000 appears in the Create-an-Entrance picker and previews the motion (DEEPSEEK; BOBNOBOB; CRASHHANDOFF; SRCMAP).

---

## 1. Verified hashes / artifact ledger (all from this batch)

| Artifact | Facts | Source |
|---|---|---|
| `14000.clips` | 555,592 B, 17 records, SHA-256 `31A9A292B86E8474C91F3B49BCD967DD34A70C9910A474611F19518FDF1578B7` | DEEPSEEK |
| `14000.adefs` | 4,206 B, SHA-256 `01FD0B9BBD74088AC3ADD2BE6D7EFF3FCFD530B761413E80A25468F4A45E5EC3` | DEEPSEEK |
| v102k aggregate | 62 files/19,841,251 B → 64 files/20,416,328 B pre-bake; 59 originals byte-identical; 3 changed; 2 new; archive 10,365,112 B; SHA-256 `C1DE81250FE0CAA33246EED9FDB156835764EBA9D496CF6D6ACC5831996D4ACA` | DEEPSEEK |
| v102k crash | loader accepted 15:43:20 (accepted=1 rejected=0 failed=0); CrashReporter minidump 70,592,896 B 15:43:22 | DEEPSEEK |
| `this-is-the-test.cak` | 33,445,345 B, SHA-256 `D11ADFC5BE741213EF25455F06065B0C8A21BBFDAAB3706CCD6BAA6663E69BAF`; 129 files / 82 folders; source `D:\wwe 2k25 mods\TRibute-1.20\TRIBUTE 25 v1.20\TRIBUTE 25\BakeMe` | BOBNOBOB |
| `tribute-bake-test-sept19.cak` | SHA-256 `CA5E5F6C229F268CCFB12D2E612E433FF19121946AFA79372585DFD48279100F`; loader ACCEPTED 02:03:40, accepted=1 rejected=0 failed=0 | BOBNOBOB |
| installed loader pair | `dinput8.dll` 1,605,120 B SHA `02D6BFF68BDEB169F613D19F7820F02513541D7B151069171DE31B282DE3E91C`; `AuroraForge.CAKModLoader.ftrib` 1,642,496 B SHA `447B878E5973BAADC75A2379508BC82B8191A9F6137CA321F81F72FF444C3C33` | CRASHHANDOFF |
| proven runtime pair (09-12) | core `92C26247BCF9EC1F…`, addon `B8C8A7A9ABD4F07E…` — ran every successful session; RESTORED to game 09-19 | AUDIT919 |
| Foundry bundle pair | core `FC0771822612DC5F…`, addon `84089A2CE223E08F…` (ftrib hash = SDCL regression expectation) | AUDIT919 |
| safe baseline pair | core `0BE398DA…`, addon `2AA4C21D…` | KF |
| non-crashing default pair | `a808a933…`/`15606425…` (all INI gates default 0) | KF |
| crash pair backup | `_work/loader-crash-build-backup-2026-09-19/` (`…ftrib` 1.60 MB + `dinput8.dll` 1.57 MB) | ALLWORK; KF |
| Beta1.0.0a preview exe | 76,031,009 B, SHA-256 `F556E4C34CF2A08020966611828CE58DA8CC335D6AA0EF92837CD3540C8A00FE` | CRASHHANDOFF |
| crash dumps 09-19 | `WWE2K25_x64.exe.2240.dmp` 475,854,567 B SHA `6086A9C41FDF747334C1DF701C0CE0E150CC261EDA0DD5B2995A7D9A23FAFCCF`; `.15308.dmp` 475,842,970 B SHA `5409143DB7BB9760DFBE214394103D2BB86B79689003A6C14AB640F210B1E9B9`; no cdb/windbg/dumpchk on PATH | CRASHHANDOFF |
| v103a CAK | 56,080,748 B; crash-free but TEST 14000 absent from picker; log checker `wrong_cak_or_no_mount` 19:27:18 | CRASHHANDOFF; KF |
| `6100.clips` stock | SHA-256 `5C60C424A90C9C2199EF5F3A30B1F790E05FB0979C03BAE5C8E8CEACE89AFDB6` (identical in `C:\Games\2k25-extracts\Root` and `D:\WWE26-mods\extracts\Root`) | LOG2022 |
| `6118.clips` | 2K25 vs 2K26 identical SHA `FD90D3BF…` (pure carryover); 2K22 `.acts` 173,976 B; 2K23 `.anims` 174,480 B; 2K25 `.clips` 135,392 B | LOG2022 |
| EntranceMotionTableData | SHA-256 `2C7AF323AD54B00CB6294E9A7C472A0952D4B32AD0EEB5B862797362CAAF6955` (2K24 = 2K25) | SRCMAP |
| 2K25 exe hashes | v1.23 `B608E7ED18BFB6291CA195532ACCF40081CBF1A1F4850E63943906D155B9AC98`; SNME `C6BC0459D4D29667C9E8F1DCACA013AE4691D615E4C79D069AD272F70E2CEE01` | SDCL 2K25 README; CHANGED-CONTENT-OVERRIDE-TEST |
| 2K26 exe hashes | original `dfb08c59f547ccd9c2a5820dd7520af064ca93d8642959b9f005e0c6f2958466`; v1.14 `7f558607bd6881c4547d752ea107fb03282a2980e47ef19ade597e096de4a0e9`; v1.16 `5f82c813e905ceb96053280cf3488f7f54bc35258c1a0eb027355d45f6c56da7`; tested Steam build 24193653 | forge2 READMEs |
| 2K19 decoded motions | victory 6100 = 647,584 B; 9100 = 873,504 B; entrance 100 = 1,588,160 B; 101 = 1,074,144 B | GAME-INSTALL-LOCATIONS |
| 6100 source event | `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19\pac\evt\06100.pac` → `00_0CE8FE35827FD8DE.unpacked.0fop` 20,620 B; stripping 0x20-byte 0FOP prefix aligns 96.20% with target EVD; 158×32-bit + 42×16-bit byte-order reversals | SRCMAP |
| 2K20 6100.acts | SHA-256 `1E9C2EF712503BAEB2C8CE3A72D5ACFCEB7D21A43C570C6A5CE91D223053D429` (decoded reference); paired 6100.evd 20,546 B | SRCMAP |
| 2K20 6204.acts | SHA-256 `DA6AEDB680BFD3BC135384D903FB16967224491CCE94A6E9759454425C1509E2` (both roots identical) | LOG2022 |
| v2 converter output 6204 | SHA `0008FE31…` ≠ reference `2D637D91…` — first non-identical output; 22 pairs / 51 slots / 192 diff bytes | LOG2022 |
| staged v1 fullbody19 CAK | `aurora-6100-fullbody19.cak` SHA `3B08700D51A8252AFD12EACF86F48F8E9FA594BBE65194410D4C3C225CCAB8C7` (= Testv1.01a); 541,320 B clips; reparse leftover 47; 53 groups re-encoded, 0 clamps | SEPT18 |
| CAK Foundry coverage | 2K25 v1.23: 386,873 files / 93,738 folders / 0 failures; 2K26 v1.16: 412,095 payloads + 279 metadata refs; original release 386,052/386,052 names resolved | v1.7.7 FIX REPORT; v1.7.6c notes |
| failed-key archive example | CakeView MyGM `1A39A7179671B4E29B1952AF3BEABFD69CB79647CC1286B5110AADC97F7136F5` key `0xFC8A9491` vs Aurora `D6141847FF1B4971110323D2CE67929A864D03784ABD9C93551705F807C195D9` key `0xC4654CFC` | CLAUDE831 |

---

## 2. Registration mechanics (the core new-entry work)

- **Name id is the join key.** The SDB string id (e.g. 4294957742) must be written into every registration table; the visible text is only the XOR-decoded SDB payload for that id (BOBNOBOB).
- Tools that exist for this:
  - `jsfb-struct-appender.js` — reusable engine: clone a struct, change one u32, insert, re-fix all uoffsets (KF).
  - `copy-working-14000-registration.js` — clones Victory + Entrance table rows by id (KF).
  - `find-jsfb-struct-vector.js`, `jsfb-registration-diff.js`, `map-jsfb-path.js`, `trace-jsfb-record-vector.js`, `parse-2k25-jsfb.js` — generic FlatBuffer walk/dump/trace kit (KF).
  - `sdb-read.js` — key formula + aliased payload handling, table order; `append_2k25_sdb_string.js` (KF).
  - `clips-codec/inspect-cutscene-registry.js`, `clips-codec/locate-cutscene-vector.js` — pointer-based, both observed root layouts (KF).
- Writers status (KF, `REPO-CONTENTS-AUDIT-2026-09-20.md`): 4 writers exist (Victory/Entrance/Cutscene/SDB) vs **6 missing** (Char / Prof / Play / Data / CMov / mapping+teams). Writer pattern file named in that audit.
- JSFB/ SDB code exists ONLY in the prototype `tools/` (KF).
- The user's working test CAK (`this-is-the-test.cak`) matches its pre-bake folder for the relevant structured files — **CakeView did not drop rows** (BOBNOBOB).
- "The complete registration (name id spread across structured files) observed in the working bake" — see Q2 list (BOBNOBOB).

---

## 3. CAK / loader facts

- **Loader lineage table** (AUDIT919): Foundry bundle (09-11) is canonical product pair; 09-12 pair is the proven runtime; source in git drifted AFTER the shipped binaries (signature gate + boot-burst refactors 09-15…09-18) — **current repo HEAD does not reproduce the shipped pair**. Rule: loader binaries are the reference; do not rebuild the loader unless the task is explicitly loader work. "Loading of modded CAKs (2K25 + 2K26) counts as SOLVED" (AUDIT919).
- v1.23 verified workflow (WWE2K25-V123-OVERRIDE-TEST-CHECKPOINT): mount call uses custom archive mode and slot `(2, 1)` on the game-owned window thread after signature checks; `plugins/addons.txt` = allowlist + init order; `mods/manifest.json` = bounded allowlist, invalid fails closed; verified `VISIBLE_CHANGED_ASSET`, accepted=1 rejected=0 failed=0. Do not repeat equivalent tests; only untested asset classes and broader precedence claims remain Experimental.
- SNME build (2K25 Saturday Night's Main Event): boot-thread CAK mount injection verified; override probe should be re-run on it to re-confirm the visual replacement case (CHANGED-CONTENT-OVERRIDE-TEST).
- Pre-window mount worker **always crashes** (6+ proofs, dumps ~476–480 MB); window fallback mount works but is too late for menu/picker registration; the `MessageBoxW` visual-notice build stole focus and was rejected — do not reintroduce the popup; the core/addon hash mismatch is the documented mechanical bug (KF).
- Loader pins (KF): live archive-boot RVA `0x2E00A0` vs stored `0x2E03F0` (crash) / `0x2E05A0` (MinHook 8); addon hash `88BC53C1…FF3D` in one build.
- PWM reference dinput8: `D9D398B7…`, 75,264 B, PLGN `50 4C 47 4E`, manually mapped (KF).
- CAK structural validation checks: FDIR magic/version, bounded counts, consistent table sizes, contiguous table offsets, archive bounds; limits: CAKs ≤ 8 GiB, Wwise ≤ 64 MiB; MaxCakArchives=32; MaxCustomPackages=16 (forge2 SECURITY.md).
- CAK filename-key: WWE 2K26 v9.9 keys derived from the CAK filename; do not rename a completed CAK; rebuild under the new final name (multiple READMEs; CLAUDE831).
- Foundry: "a newly baked CAK is structurally and byte-for-byte verified; the final mount and visible result still require an in-game test" (1.7.5 notes). New paths are reported during source checking; packaging alone does not make an asset selectable (1.7.9.a notes).
- 2K20 mod-load path still unestablished; our CakeTool backend CANNOT pack v6.8 (NotImplemented) — do not attempt (LOGSOURCES).
- v8.3 cipher (2K22): all crypto primitives verified correct (ChaCha20, MetroHash, CRC32C, rotateCrypt); header decryption still produces garbage; key gen `generateCryptoKeyV83('bakedfile07.cak')` → `0x23d59836`; two different rotation ops (header vs file data); **not blocking** (extracted files + user bake tool bypass it) (LOG2022).

---

## 4. Animation formats & codec findings

**Format matrix (verified on disk, LOG2022):**

| Version | Victory | Entrance | Container |
|---|---|---|---|
| 2K20 | 695 `.acts` + 695 `.evd` | 819 `.acts` + 819 `.evd` | AMYM (YANM payload) |
| 2K22 | 760 `.acts` + 743 `.adefs` | 811 `.acts` + 809 `.adefs` | AMYM (TBUF/ANIM v10) |
| 2K23 | 810 `.anims` + 810 `.adefs` | 943 `.anims` + 943 `.adefs` | MINA |
| 2K25 | 1029 `.adefs` + 1028 `.clips` | 1189 `.adefs` + 1182 `.clips` | `.clips` |
| 2K26 | identical filenames to 2K25; Animation tree carried over (16,091 files, 0 filename diffs) | — | `.clips` |

- 2K20 extras: `Acts\Basic` 66 `.acts` + 66 `.mprms` (new ext, motion-parameter sidecar); `Acts\Parts` 8 numbered `00.acts`–`07.acts`; `Animation\MotionParameter\` 3 `.jsfb` (DiveMotionGroup, MotionParameterGroup, OverTheTopRopeAnimation); `CAM\MoveData.jsfb` 68,604 B; `Characters\Characters19Mapping.jsfb` 14,680 B (LOG2022; LOGSOURCES).
- MINA migration began in 2K22 for `Acts\Basic` (`MotionArea_*.anims`), Victory/Entrance followed in 2K23 (LOG2022).
- 2K20/2K22 AMYM container: identical entry id set `24,23,22,21,20,19,18,17,16,15,14,13,12,10,0`; only entry 0 differs (YANM vs TBUF); 2K20 6100 entry 0 = 706,464 B vs 2K22 358,560 B (LOGSOURCES).
- YANM structure: `type(2)+headerLen(2)+hash32(4)+flags1(4)+count1(4)+zero(4)+float1..3(4, BE)+extras`; types 0x8004, 0xa000, 0x0204/0x0304/0x2200/0x2300/0x4300/0x5300; keyframe stream = 4-byte records `uint16BE delta + int16BE value`; count = records excluding sentinel; deltas 0 (static) or 244 (frame markers) (LOG2022).
- TBUF/ANIM v10: TBUF header 16 B (`TBUF`+version(1)+declaredBufferBytes(4)+relocationCount(4)); ANIM header 8 B (`ANIM`+version(10)); payload `headerSize(4)+pad(20)+rootHash(4)+rootFlags(4)+rootU64(8)+children[]` (32 B each); root flags low byte = child count; child = `hash(4)+flags(4)+dataOffset(4)+marker1(4)+marker2(4)+extra(12)`; chunk byte 4 = 0x59 marker (LOG2022).
- YANM record[i] ↔ TBUF child[i] positional mapping, 1:1; same bone → same TBUF hash across entries; YANM count + 1 = TBUF count (extra = sentinel/root) for normal entries (LOG2022).
- Entry 0 special: 63+9 YANM records → 64+9 TBUF children (two streams); 192 B header vs 160 B for other entries; YANM block #2 at 256,320 preceded by 16 zero bytes, 9 records, first hash `c5879e5`; 63→64 +1 lives in stream A; stream B carried 1:1; entry 0 holds ~96% of file bytes (LOG2022).
- Stream A mixes bone records with metadata records (flags `0x140001`, `0x900X01dc`, `0x01012000`, data offsets) — "63 bones vs 64 children" framing retired; stride is per-block, not global (LOG2022).
- **Converter bug history (dead ends):** v1 `convert-yanm20-to-tbuf22.js` value-search is a **no-op by construction** (targets are defined as locations already holding the value; output byte-identical to reference in every run). v2 `convert-yanm20-to-tbuf22-v2.js` uses positional mapping and produces the first differing output (22 pairs, 6204→6118 template). For 2K20-only animations, using another ID's reference grafts the wrong TBUF structure. Value transform for ~67.6% non-verbatim floats remains unsolved (LOG2022).
- Descriptor model: `at60[1]` is a semantic selector pre-computed by the content pipeline, NOT computed at runtime; highByte 16/32/48/64/80/96 = scale/level, midByte 1/2/3/4/6 = variant, low16 = per-body-block unique id (116 unique across 742 files); corpus 711 simple / 19 descriptorExpanded / 12 offsetExpanded; SHDC source contains 17 matching highByte/midByte descriptor values; exact derivation unknown without original 2K19 tools (LOGSOURCES).
- 2K19 SHDC→2K22 descriptor values do NOT match directly (different low16) but pattern preserved (LOGSOURCES).
- `.mprms` container (2K20): magic `MPRM` @0, size u32LE @4, inner magic `MPRMc3` @8, `deadbeef` sentinel; parser is future work (LOGSOURCES).
- EVD: 2K20 `.evd` = 34-byte envelope (LE uint16 motion id + 32-byte printable internal name) + opaque payload; `tools/evd-reader.js` reads it (fixture 6100 reads `6100_VIC_SINGLE_The_Rock_M_Face`); no complete EVD event parser/writer exists (SRCMAP).
- 2K19 PAC intake chain: `pac\evt\<id>.pac` → `tools/extract_2k19_pac.py` (Yukes BPE) → `.unpacked.shdc` → `AuroraPac19Helper.exe` (ZLIB/OODL bodies) → `entry_0` motion body; each 2K19 event PAC = one `.0fop` + one `.shdc` (GAME-INSTALL-LOCATIONS; ALLWORK).
- Blender add-on `aurora_2k19_fbx_export.py` + `aurora_entrance_lab` exist in the prototype repo (REPOSITORY-VERSIONING-AUDIT).
- 5 Rock entrance target pairs byte-identical between 2K25 and 2K26 roots; 2K25 monolithic `Entrance\100.clips` contains the same 35 payloads with a verified five-phase partition (WWE2K19-PROJECT).
- 6100 (2K25): 62 source body channels preserve target track order, 2 target-only appended tracks, 7/7 resolved joint-name agreements (WWE2K19-PROJECT).

---

## 5. Tool inventory (paths + purpose)

Prototype repo `WWE2K19-to-2K26-Entrance-Prototype` (KF + AUDIT919 + REPOSITORY-VERSIONING-AUDIT):

- **2K19 intake:** `extract-2k19-animations.js`, `extract_2k19_pac.py`, `inspect_2k19_archive.js`, `inspect_2k19_shdc.py`, `extract_2k19_archive_entries.js`, `AuroraPac19Helper.exe`.
- **Bridge/conversion:** `convert-yanm19-to-yanm20.js`, `convert-yanm20-to-tbuf22.js` (v1 no-op), `convert-yanm20-to-tbuf22-v2.js`, `amym-container.js`, `tbuf-v1.js`, `tbuf-v1-body-candidate-record.js`, `tbuf-v1-track-probe.js`, `amym-tbuf-report.js`, `patch-acts20-yanm.js`, `fop19-evd20-body-model.js`, `evd-reader.js`, `staged-pipeline.js` (19→20→22, `stopAfter`), `batch-2k19-to-2k20-victory-packages.js`, `build-2k19-to-2k20-victory-package.js`, `yanm-keyframes.js`, `yanm20-bridge-inspect.js`, `compare-motion-metadata.js`, `export-yanm-ir.js`, `yanm20-normalization-score.js` (last two stay in prototype, not converter repo).
- **Modern clips:** `clips-layout.js`, `group90-encoder.js`, `group90-entries.js`, `group90-uleb.js`, `score-group90-op0.js`, `package-exported-clips.js`, `build-6185.js`, `append_2k25_victory_entry.js`, `add-cutscene-entry.js`.
- **Replace/bake:** `build-2k19-to-2k25-replace-clips.js`, `build-2k19-to-2k25-replace-cak.js` (bakes via Foundry `bake-v93-cli.js`; no registry entries).
- **Registration:** `copy-working-14000-registration.js`, `jsfb-struct-appender.js`, `find-jsfb-struct-vector.js`, `jsfb-registration-diff.js`, `map-jsfb-path.js`, `trace-jsfb-record-vector.js`, `parse-2k25-jsfb.js`, `locate-entrance-vectors.js` (9 sections 0–8), `find-2k25-entrance-entry.js`, `diff-2k25-entrance-entries.js`, `sdb-read.js`, `append_2k25_sdb_string.js`, `clips-codec/inspect-cutscene-registry.js`, `clips-codec/locate-cutscene-vector.js`.
- **Orchestration/scan:** `bakeme-orchestrator.js` (copied-tree + per-file SHA proof, refuses overwrite, NOT a baker), `pipeline-editor-suite.js` (active/coming × write/read/inspect capability manifest), `stage-known-good-cak.js` (hash-pinned single-CAK staging, fail-closed; added during a "confused phase" — do not use unless asked), `export-supported-game-models.js`, `cak-catalog-summary.js`, `scan-cak-entry-graph.js`, `check-datactrlink-log.js`, `stage-public-tools.js` (edit flagged unrelated — review before commit).
- **File-per-function split plan (AUDIT919, user-ordered 2026-09-19):** every function in its own file named after the function; `verb-noun[-qualifier].js`, kebab-case, single `module.exports`, camelCase function, colocated `<same-name>.test.js` run by `node --test`. Split targets listed for `clips_bitcodec.js`, `clips_encode.js`, `build-6185.js`, `add-cutscene-entry.js` (see AUDIT919 §3 for the full name lists), plus prototype multi-function files `clips-layout.js`, `yanm-keyframes.js`, `score-group90-op0.js`, `append_2k25_victory_entry.js`, `append_2k25_sdb_string.js`. Regenerate `REPO-FUNCTION-INVENTORY.md` + `LOG-TOOL-CATALOG.md` after each split.
- **Scratch tools (Temp, queued for promotion):** `clips_bitcodec.js` (bit parser + dense/entropy evaluator + quat path), `clips_encode.js` (BitWriter, dense encoder, verbatim rebuild V1 gate), `fullbody.js` (transfer builder: map, gains, CR+Gaussian, swap, isolation), `transplant.js` (V2/V3 gates), `rosetta6100.js`, `target_curves.js`, `hips_dump.js` (SEPT18).
- **One-off probes kept:** `bracket-insert.js`, `dict-expand.js`, `fbmap.js`/`fbmap2.js`, `gen-inventory.js`, `harvest-names.js`, `harvest-rosetta.js`, `inspect-conflicts.js`, `locate-insert.js`, `name-bones.js`, `probe-entrlist.js`, `probe-plusone.js`, `scan-2k20-profile.js`, `scan-shdc-descriptors.js`, `split-log.js`, `typefp.js`, `validate-crc.js`, `vandalize.js` (ALLWORK).
- **Third-party black box:** `Clips Editor v2.21` (Qt exe, no CLI/API; do not redistribute or depend on it) — the modern `.clips`/`.adefs` reference; Ghidra analysis under `_work/ghidra-clips-editor/` (LOGSOURCES; ALLWORK).
- **Test suites:** prototype focused suite `38/38` passing (CRASHHANDOFF); converter repo tests 43/54 passing (LOGSOURCES); prototype repo test suite 64/64 at 09-11 (CHKPT911); full 122/122 (KF).
- `_work` analysis scripts are one-off Node probes used to locate/derive insertion offsets and hashes inside `.jsfb`/`.clips`/`.sdb` (ALLWORK).

---

## 6. Paths / environment (owner machine)

- 2K25 canonical read-only root: `C:\Games\2k25-extracts\Root` (LOGSOURCES). Game install: `C:\WWE 2K25 Saturday Nights Main Event` (CRASHHANDOFF). Also `D:\WWE 2K25-1.23\WWE 2K25` (MASTER).
- 2K26 read-only root: `D:\WWE26-mods\extracts\Root` (correction: it IS the 2K26 source, not a 2K25 duplicate) (LOGSOURCES).
- 2K20 complete root: `C:\Games\2k20extracts\Root` (284,260/284,260 files, zero missing) supersedes `D:\WWE26-mods\extracts\2k20\Root`; older `D:\AuroraForge-Aug26\Extracted Files\2k20\Root` is superseded (LOGSOURCES).
- 2K22 root: `D:\AuroraForge-Aug26\Extracted Files\2k22\Root`; 2K23 root: `D:\AuroraForge-Aug26\Extracted Files\2k23\Root`; 2K24 read-only subset: `D:\converter-files-usefull\drive-download-20260913T210407Z-1-001` (742 complete Victory `.adefs`+`.anims` packages) (SRCMAP; LOGSOURCES).
- 2K19: `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19` (has `oo2core_6_win64.dll`; 4,391 PACs in `pac\evt`; 22,661 PACs total) (GAME-INSTALL-LOCATIONS; WWE2K19-PROJECT). 2K20 install: `D:\Program Files (x86)\Steam\steamapps\common\WWE2K20` (no space; Oodle 7) (LOGSOURCES).
- Oracle CAK: `D:\AuroraForge-Aug26\25 bake folders\extracted-modded-cak` (9-file dependency set) (SRCMAP).
- Test CAK analysis: `WWE2K19-to-2K26-Entrance-Prototype\analysis\this-is-the-test-cak\` (`extracted-root`, `catalog.json`, `full-14000-14005-scan.json`) (BOBNOBOB).
- `_work\14000-*` test series: `14000-compat-v103`, `14000-new-v102g`, `14000-tribute-v102h`, `14000-tribute26-v160-v102j` (control experiments), `14000-user-bakeme-v102i` (ALLWORK).
- Game folders in `_work`: `clips25\Animation\Victory\` stock 2K25 clips/adefs (6100, 8102, 8054, 6185, 7000, 8403, 8410) (SEPT18).
- Ghidra: `D:\AuroraForge-Aug26\.tools\ghidra_12.1.3_PUBLIC` (v12.1.3, Aug 2026 build) (CLAUDE831; ChangeHistory.md). Headless invocation example in VERIFICATION-AND-COMMANDS.md.

---

## 7. House rules / hard constraints

- Additive IDs only; new test ID starts at 14000; preserve stock files and all original full-tree files; never reuse stock 6185 (DEEPSEEK).
- Never call a reference clone, unchanged target file, mockup, generic preview, or repackager a conversion; never call the package in-game valid without crash-free load + visible TEST 14000 + preview evidence; keep exactly one registry-bearing CAK enabled during tests (DEEPSEEK).
- Existing user work is valuable: never reset/clean/overwrite broadly; do not clean or reset dirty worktrees; do not assume untracked files are disposable (DEEPSEEK; CRASHHANDOFF; MASTER; LOG2022).
- Source roots are READ-ONLY; copy to `_work\` before use; never write into them (LOGSOURCES).
- The user stopped loader/addon/core work 2026-09-20: do not rebuild loader/addon/core, reinstall dinput8.dll, re-enable diagnostic launch work, create a CAK unless asked, run broad test suites, or launch the game unless asked (BOBNOBOB; KF).
- Do not repeat the obsolete 6185 path (DEEPSEEK). Do not narrow to only Victory/SDB without checking the whole archive when asking about missing registrations (BOBNOBOB).
- Evidence rules: never invent IDs/hashes/field meanings/offsets; readable strings do not prove writable binary semantics; a UI control is not proof of its full save/bake/registration workflow; preserve unresolved gaps (2026-08-25 START-HERE).
- Test naming: Testv1.01a, Testv1.02a, … increasing; **keys derive from filename — never rename a CAK** (SEPT18 README).
- 2K20→2K22 must remain one continuation step inside the overall 2K19→2K25 project; tooling must coexist with app scripts, package builder, Patreon gate (LOG2022).
- "Assume cheapest-option carryover year-to-year; prove change per-asset by hash/block-compare before theorizing new encodings" (LOG2022).
- File-per-function convention (AUDIT919 §3).
- Readability note required on public-facing first-party material only; not internal notes; never on legal/third-party text (Knowledgebase README).
- No WWE game files, Oodle DLLs, extracted assets, captured data, decompiler projects, third-party binaries, personal paths, or rollback copies in commits/releases (MASTER; all provenance docs).
- Do not publish/upload without explicit authorization (MASTER).
- Version rule: main `vMAJOR.MINOR.PATCH`; small updates `MAJOR.MINOR.PATCHa` (no dot); keep strict semver in package metadata, letter suffix in labels/tags/artifacts (REPOSITORY-VERSIONING-AUDIT).

---

## 8. Gotchas / dead ends (do NOT repeat)

1. **Stock 6185 is occupied** (= THE USOS 1) — reject (DEEPSEEK; KF).
2. **Tribute 26 v1.6.0 BakeMe is a 2K26-line aggregate** — mounting it into 2K25 is the leading (unproven) hypothesis for the v102k post-mount crash; the Tribute 26 v1.6.0 base is "DEAD for 2K25 — reference only" (DEEPSEEK; KF). The untouched-control launch was the required next isolation step.
3. Do not replace full current catalog files with historical TRIBUTE versions (missing template IDs 1382/1391/1393/1397/1398/1399/1402) (SRCMAP).
4. `convert-yanm20-to-tbuf22.js` v1 is a no-op by construction — do not re-run expecting different bytes (LOG2022).
5. Do not clone `6100.evd` from the 2K20 reference and call it converted; event-record layouts on both sides are undecoded (SRCMAP).
6. Do not treat source-file presence as conversion; do not use the target file's bytes as replacement data (tables need modeling) (SRCMAP).
7. Do not eyeball hex — always compare u32LE-to-u32LE (`1a 0b 55 5e` LE = `0x5e550b1a`) (LOG2022).
8. Do not retry standard hash functions for YANM (40 combos failed); TBUF hash is CRC32C(lowercase) (LOG2022).
9. Do not build on the index-level pseudo-pattern ([0, 0x140001, 0x900X01dc, small-int]) until stride is proven; stride is per-block (LOG2022).
10. Tiny-float LE "hits" are byte-collision noise, not transfer evidence (LOG2022).
11. The Rosetta table (`_work\yanm-tbuf-rosetta.json`) has 147 cross-animation conflicts — animation-local, superseded by the CRC dictionary approach (LOG2022).
12. Do not reintroduce the `MessageBoxW` popup loader build (steals focus, rejected UX) (CRASHHANDOFF).
13. Do not ship the DXGI/runtime-prewindow loader build; worker mounts always crash (CRASHHANDOFF; KF).
14. Do not use `stage-known-good-cak.js` unless explicitly asked; do not commit the `stage-public-tools.js` edit without review (BOBNOBOB; KF).
15. No debugger on PATH (no cdb/windbg/dumpchk) — minidump stack analysis needs tooling installed first (CRASHHANDOFF).
16. `D:\zips` and PWM reference tree are hands-off; `aurora-disabled-tests/` is hash-preserved parking — never delete (KF).
17. 2K20 mod-load path unestablished; our CakeTool backend cannot pack v6.8 — do not attempt (LOGSOURCES).
18. Do not generalize results across game versions; label historical evidence by exact version (MASTER; 2026-08-25 START-HERE).
19. TblD / other tables ruled out for 6100-class motion (WinningCast 38 has 8701/8703 but not 6100); SDB is dialogue/UI strings only, not a registry (LOGSOURCES).
20. Registration spread matters: writing only Victory/Cutscene/SDB under-registers — the working bake touches 9+ files (BOBNOBOB).
21. CakeView bakes whole BakeMe trees; a "baked CAK and pre-bake folder match for relevant structured files" — verify per-file, don't assume CakeView dropped rows (BOBNOBOB).
22. `EntranceListData` field4–field9 semantics are undecoded — do not invent meanings (BOBNOBOB).
23. YANM header floats are only ~32.4% verbatim in TBUF (6118 all-entries probe); the rest are transformed/quantized (LOG2022).

---

## 9. Working registration/row evidence appendix (raw)

- DEEPSEEK 14000 victory row: `nameString=4294957742, type=1, someId=14000, victoryFace=14000`; all 713 original rows semantically unchanged; Victory 713→714 (DEEPSEEK).
- Cutscene registry: 2,342 → 2,343 entries; exactly one ID 14000 entry with name ID 4294957742; all 2,343 tables validate (DEEPSEEK).
- ENG.sdb: 113,779 → 113,780 records; new ID 4294957742 / signed −9554 decodes to `TEST 14000` (DEEPSEEK).
- Foundry/FTribTool result for v102k: `verified=true`, `payloadVerified=true`, `fileCount=64`, `sourceFileCount=64`, `folderCount=41`, archive 10,365,112 B (DEEPSEEK).
- 14000-series probe boundary (CHKPT911): new 6104 Victory asset staged at `Root/Animation/Victory/6104.adefs`+`6104.clips`, baked as `aurora-6104-probe.cak`, explicitly added to 2K25 `mods/manifest.json`; loader log `ACCEPTED CAK aurora-6104-probe.cak`, `accepted=3 rejected=0 failed=0`; game reached main menu and exited normally — proves separate mod-CAK mount only, not registration/visibility.
- bobnobob string table: `4294957742/-9554 = bobnobob 1` … `4294957746/-9550 = bobnobob 5` (BOBNOBOB).
- Comparison result: 32 files differ between working (CakeView) and ours; name id 4294957742 present in working `HideCtrlData.hidelink.jsfb`, absent in ours (BOBNOBOB).
- "bobnobob" test mapping: Entrance 14000/14001/14002, Victory 14003/14004 (BOBNOBOB).
- 2K25 FlatBuffer targets: `Entrances\EntranceListData.jsfb` 358,752 B; `Entrances\VictoryListData.jsfb` 33,208 B; `Cutscene\ListData\EntranceMotionTableData.jsfb` 1,204 B; `Animation\Data\GameAnimData.jsfb`; `Animation\Data\MotionAreaData.jsfb`; `Roster\CharMoveSetDataTable.jsfb` 5,498,944 B; `Gameplay\MotionParameter\MotionParameterGroup.jsfb` 1,201,280 B (SRCMAP).
- 2K22 TBUF complex-body corpus: 742 files → 711 simple / 19 descriptorExpanded / 12 offsetExpanded; complex rows 26 → 23 expandedRange / 3 descriptorOnly (LOGSOURCES).
- 2K22 AnimSystem: `ratanim.adefs` 13,788,314 B (→ 113,093,752 B payload), global animation registry; 54,371 JSON defs in the 2K25 export with no exact `6100_*` registration (6100 binding is Victory-specific, not global) (LOGSOURCES; CHKPT911).
- `.adefs` payload names ~30 interaction bones (`AttackPart_/Hit_/Sell_/TargetPart_/Cover_/Prev_Cover_/Car_*`); skeleton `J_*` names come from `Root\Havok\CharHavokNS\new_rig_proto.hkt` (2K22, 74,784 B, 67 J_* bones) (LOG2022).
- CRC dictionary: 44/67 union hits on 2K22 Victory TBUF children; 45 hits including `root`; all plain lowercase (LOG2022).
- 2K19 victory registry location in 2K20 data: `CharProfilePro` 208 B-stride u32 pairs `[6100,6100]` + `[8701,8703]` 16 B before wrestlerId (e.g. 100 = Characters/100_The_Rock_2017); triple consecutive rows = attire variants; stride-walk drifts after 3 rows (nested tables) (LOGSOURCES).
- `2k19-minus-2k25-victory-inventory.json`: 2K19 pac/evt 4,391 files → 540 scoped IDs (set hash `28A84E…93A4D79`); 2K20 Victory EVD bridge 695 names; 2K25 bakedfile60 930 Victory clips (set hash `1C1715…E43BA2E`); 74 missing from 2K25 (56 bridge-named, 18 unknown) (KF).
- 2K20 BakeMe template: `D:\AuroraForge-Aug26\2K20-BakeMe\BakeMe` (97 carrier files + 41,317-dir skeleton, zero mod content); mapped from Tribute 2K25 BakeMe (128 files, 54 jsfb carriers) by FlatBuffer identifier; rule: every 2K20 mod bake starts FROM this template; nothing outside it required; nothing inside may be skipped (LOGSOURCES).

---

## 10. Loader / app / release context (supporting facts)

- Beta1.0.0a portable app: `app\dist\Aurora-Forge-Beta1.0.0a-Preview.exe`, 76,031,009 B, build `npm run package` from `app\`; 30 allowlisted public tools; packaged resources include `check-datactrlink-log.js` + `pipeline-editor-suite.js`; smoke check passed (launched hidden 6 s) (CRASHHANDOFF).
- Prototype focused suite (38/38): `node --test tools\check-datactrlink-log.test.js tools\pipeline-editor-suite.test.js tools\bakeme-orchestrator.test.js tools\patreon-access.test.js tools\clips-codec\cutscene-registry.test.js tools\sdb-read.test.js tools\find-2k25-entrance-entry.test.js` (CRASHHANDOFF).
- Addon tests: `status_message_tests.exe`, `mod_manifest_tests.exe`, `runtime_config_tests.exe`, `cak_collision_tests.exe`; core tests: `addon_registry_tests.exe`, `status_message_tests.exe`, `runtime_config_tests.exe` (CRASHHANDOFF).
- Patreon entitlement flow: Patreon tier → Discord VIP role → hosted Aurora verifier checks guild membership/VIP via server-side bot token; app unlocks on direct active Patreon tier proof OR `entitlementMethod: "discord_guild_role"` with guildId, discordUserId, role overlap, fresh timestamps; secrets stay on verifier; portable app knows only the verifier URL (CRASHHANDOFF). Verifier endpoints: `GET /api/oauth/start`, `POST /api/oauth/verify`, `POST /api/verify` (disabled → `oauth_required`) (patreon-verifier README).
- Loader security model (all DataCtrlLink releases): exact host + SHA-256 allowlist; absolute System32 DirectInput forwarding; no `.dlp`/`.asi`/arbitrary DLL/arbitrary `.ftrib`; CAK structural validation; ≤32 CAKs, ≤16 packages, ≤64 MiB Wwise, ≤8 GiB CAK; optional bounded `DataCtrlLink.ini` (MaxFileBytes/MaxCustomPackages/MaxCakArchives/ReadyTimeoutMs/CakPostPrimeDelayMs — unknown/duplicate/out-of-range ⇒ whole file ignored, safe defaults); `mods/manifest.json` allowlist; fail-closed (forge2 SECURITY.md; SDCL READMEs).
- `DataCtrlLink.ini` defaults: `MaxFileBytes=67108864`, `MaxCustomPackages=16`, `MaxCakArchives=32`, `ReadyTimeoutMs=120000`, `CakPostPrimeDelayMs=2500` (READMEs).
- CAK replacement semantics: exact virtual path match below game `/root`; wrong address (even one folder) may mount but change nothing; mount acceptance ≠ override proof (ELI5 docs; READMEs).
- Foundry release history in this batch: v1.7.5 (first standalone; v9.9 key from filename; `_textures.tdb` preservation), v1.7.6c (path recovery fixes; 412,095/412,095 names), v1.7.7 (FDIR 9.3 backend; 386,873/386,873; bookkeeping exclusion; raw `_textures.tdb` preservation; ACF-177-001…012), v1.7.8 (verified protected extraction/rebuild; used by override test), v1.7.9 (2K26 Sept 2026 archives; external payload companion recovery; zero-offset refs blocked), v1.7.9.a (stock-catalog allow-list removed for additive files).
- Integration notice: Foundry's WWE 2K25 FDIR 9.3 layer includes MIT CakeTool source from Nenkai's Bakery, upstream commit `f704d37`; Aurora adds a machine-readable catalog command; Oodle never bundled — uses the user's game library at runtime (AURORA-INTEGRATION-NOTICE.md).
- Repo scope: animation repo owns the 2K19 exporter/2K25 importer; 2K26 secondary; DDS stays texture-only; CAK infrastructure sufficiently verified (REPOSITORY-SCOPE-AUDIT).
- New repos created post-audit: `Aurora-Forge-2K19-to-2K20-Converter` (1.0.0a), `Aurora-Forge-2K19-PAC-Tools` (v1.0.0), `Aurora-Forge-Blender-Animation-Tools` (v0.1.0), `Aurora-Forge-Clips-Tools` (v0.1.0), `Aurora-Forge-Converter-App` (1.0.0a), `Aurora-Forge-Patreon-Verifier` (v1.0.0) (REPOSITORY-VERSIONING-AUDIT).
- Master handoff labels: PAC browsing Ready; limited PAC rebuilding Experimental; 2K19→2K25/2K26 conversion Research; "The actual 2K19 animation-to-valid 2K26 writer has not been proven in-game. Never advertise conversion as complete" (MASTER).
- v102k candidate must not be called usable; in-game validity unproven; next meaningful result was the untouched Tribute 26 full-aggregate control launch or a crash-dump stack (DEEPSEEK).
- `HANDOFF-2026-09-20-CURRENT.md` (per KF): Beta1.0.0a exe SHA `F556E4…A00FE`, 38/38 focused + 122/122 full tests, 30 staged tools; loader pins live archive-boot RVA `0x2E00A0` vs stored `0x2E03F0` (crash) / `0x2E05A0` (MinHook 8); 10-step diagnostic runbook; recovery = disable flags, restore safe fallback pair.
- `HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md` (per KF): PWM reference dinput8 `D9D398B7…` (75,264 B, PLGN magic); 6 findings — window mount too late; worker mounts always crash; table opens never observed (mmap suspected); detour never fired due to core/addon hash mismatch; arbitrary-name mapping 80+ excl. 00–05/100; catalog `fuckingbots.csv` = 356,918 entries; v103 rebake recipe CakeTool pack v9.3 + `oo2core_9_win64.dll`.
- `HANDOFF-2026-09-19-CHATGPT-CODEX.md` (per KF): Tribute 26 = 2K26-line proof (SDB decode 1,333/113,783 vs 81,209/96,290 on 2K25 family); v103a crash-free but TEST 14000 absent (video `2026-09-19_17-26-01.mp4`); promotion queue (`cut-append-shared.js` → clips-codec, sdb-read/scan, entry-diff family).

---

## 11. Misc / low-relevance files read (for completeness)

- `_archive\...\chatgpt-backups\...\cua_node\...\bin\README.md` = stock Node.js README (ChatGPT/Codex runtime backup) — no modding content.
- Ghidra `.tools\ghidra_12.1.3_PUBLIC` docs: `ChangeHistory.md` = Ghidra 12.1.3/12.1.2/12.1.1/12.1/12.0.x release notes (August 2026 build); `VersionTracking`, `VersionTrackingBSim`, `WildcardAssembler`, `tricore`, `V850`, `x86`, `Xtensa`, `Z80` READMEs are one-line stubs; `Framework\Utility\README.md` = module description. Only modding-relevant fact: the Ghidra install path/version used for CAK/loader reverse-engineering.
- `allfiles-02-work.md` / `allfiles-07-archive.md` = file-study ledgers of `_work\` (1,307 files / 2,507 MB / 72 top-level entries) and `_archive\` (6,985 files); both marked "part of the master ledger. Loader problem SOLVED"; they index every test folder and analysis script.
- `_archive\workspace-consolidation-2026-09-20\FLAGSHIP-CONSOLIDATION.md`: 2026-09-20 consolidation moved 7 repos under the flagship with nested `.git` preserved; `git worktree repair` run for the three `_worktrees` links; 146 basename collisions — 137 flagship-own wins, 9 nested wins (4 real: prototype `app/index.html`, `app/package.json`, `app/preload.js`, Clips-Tools `package.json`); `runtime_config.cpp/.hpp` byte-identical between SDCL-WWE2K25 and CAK-Mod-Loader-WWE2K25.
- `_untracked-repo\README.md`: 43 untracked files were parked then RESTORED 2026-09-20 (0 missing); folder now holds manifests/findings only.
- DataCtrlLink static RE (`reverse-analysis\FIRST_RUN_REPORT.md` + `reconstructed\*`): original v2.4 `dinput8.dll` 77,312 B SHA `a1104f95…` and `WEngine.DataCtrl.Link.dlp` 1,296,384 B SHA `a79e35de…`; `.dlp` = ordinary unsigned PE; loader enumerates `.dlp`/`.asi` with no signature check; plugin resolves game exports by ordinal 73/129/137/327/351; Wwise bank mutation for `music.pck` (object `0x8FD5129D`), `ra.pck` (8 transforms), `game_mode.pck` (`0x8BD6CED5`, ~200 `Play_VOICEOVER_*` events), `streaming_install.pck` (`0x54BF3665`); retry on submission return `0x45`; event-name hash = case-insensitive FNV-1a (`0x811C9DC5`, `*0x01000193`); Steam interfaces `STEAMAPPS_INTERFACE_VERSION008`/`SteamFriends017`/`SteamUser023`. Security findings P1/P2/P3 (no RE barrier, unauthenticated plugin exec, DllMain work, no integrity, metadata leakage, brittle ordinal coupling, no CFG, detached threads, duplicate failure logging). Use as historical behavioral reference only.
- wwiser/wwiser-utils/bnkextr third-party reference docs in `DataCtrlLink-MusicOnly\third_party_reference\`: Wwise `.bnk` parsing methodology (parser→names→viewer→generator; `wstrings` string-scraper), licenses (bnkextr public-domain/MIT; MinHook 2-clause BSD is the only vendored source dep). Relevant only if custom-music work resumes.

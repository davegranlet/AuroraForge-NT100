# notes-batch-5 — Aurora Forge entrance/victory registration + 2K19→2K25 conversion

Batch: `_md-search/batch-5.txt` (77 files, all read completely).
Date of notes: 2026-09-24. Source tags below = short names for full paths cited in "Source legend".

---

## ANSWERS TO THE 10 QUESTIONS

### Q1 — Which row to clone as template for new entries
- **EntranceListData: clone ANY default row; use section-8 row id 1 = "DIRE INTENTIONS" as the working template.** Owner-confirmed: "clone any default row ... new id, point it at the converted animation files". [CONT21 §LATEST 2026-09-24 02:15; §02:00]
- Byte-preserving clone tool: `tools\append_2k25_entrance_clone_graph.js --clone-id 1` (DIRE INTENTIONS, preserves 11-field shape). [CONT21 test10 block, 2026-09-23]
- Section 8 = CAE template list (Tribute's template list). Names match Tribute video exactly (DIRE INTENTIONS, KING OF THE CRUISERS 1, …); 697 rows, 657 named. [CONT21 2026-09-23 editor suite]
- Oracle/mirror rows from the owner's Tribute test bake: EntranceListData sec8 idx 673–675 = ids 14000/14001/14002 (nameStrings 4294957742/43/44, f4=247/390/529); VictoryListData idx 654–655 = 14003/14004. [CONT21 test10 block citing `notes\HANDOFF-2026-09-20-BOBNOBOB-TEST-CAK.md`]
- 14000 base row is also a valid clone template (someId=victoryFace=14000; entrance f4=852, f5=852, f6=1161, f7=26008, f8=2236, f9=10226). [CONT21 2026-09-23 video review]
- 8 extended tables each need their own template id (see Q2); verified against stock SNME: charmapping tmpl 120 · cammove tmpl motion 41525 (vsize 116, osize 80) · facetextures tmpl 100 · charmoveset wrestler 1 + tmpl sdb 0xffffdabc · charprofilepro tmpl char 65533 · hidemotion sec 0 idx 0 · teams tmpl 100 · charprofiletable: **no valid stock template found yet (101 not found, probe in progress)**. [CONT21 §02:00 status; §01:40 test12 plan]

### Q2 — Files that MUST be written for a new entry to appear + play (tested file sets)
- **PROVEN minimal 3-file set (stock-motion entries):** Tribute 25 v1.5 whole-tree diff = exactly 3 files: `Entrances/EntranceListData.jsfb` (+1 sec8 row) + `Entrances/VictoryListData.jsfb` (+1 row) + `Sdb/ENG.sdb` (+1 record, +22 B). Zero new assets; Cutscene untouched. [CONT21 §02:15 #2]
- **For genuinely-new imported motion:** "requires the Cutscene+assets path v103a already ships" → add `Cutscene/CutsceneNoRegistry.jsfb` entry + `Animation/Entrance/<id>.clips|.adefs` assets (and the 8 extended tables). [CONT21 §02:15 #2, #8]
- **Under-registration is the proven real blocker (test10 in-game FAIL):** the converter wrote only 4 files (EntranceListData, VictoryListData, CutsceneNoRegistry, ENG.sdb) and entry 16086 did NOT appear. Working CakeView bake had 32 differing files; the missed 8 registry tables are:
  1. `Hide\HideCtrlData.hidelink.jsfb`
  2. `Roster\CharMoveSetDataTable.jsfb`
  3. `Roster\FaceTextures.jsfb`
  4. `Roster\CharProfilePro.jsfb`
  5. `Roster\CharProfileTable.jsfb`
  6. `Characters\CharacterMapping.jsfb`
  7. `MoveData\CAMMoveData.jsfb`
  8. `Stable\TeamsTable.jsfb`
  (+ several `CreateShow\*.jsfb` + Audio/MusicList, Movies/MovieDataTable etc. in the 32-file diff.) Handoff verbatim: "It must write the name id into ALL the above tables (not just VictoryListData/CutsceneNoRegistry/ENG.sdb) for a new slot to appear. This is the real blocker, independent of loader timing." [CONT21 test10 block citing `notes\HANDOFF-2026-09-20-BOBNOBOB-TEST-CAK.md` + `analysis\tribute-bake-test-sept19-cak\common-diffs.json`]
- test6.cak (2026-09-23) shipped: `Entrances/EntranceListData.jsfb`, `Sdb/ENG.sdb`, `Animation/Entrance/16186.clips` + `.adefs`, `Animation/CaeAdvanced/1x016186.clips` + adefs (5 phase files), + victory entries from test5b. [CONT21 test6 block]
- test10.cak (7,460,860 B, SHA `9ec6efeb14153eb472b50d177ceed67fd41d036cdfc6d583021be1e677ff2ada`) = minimal CAK, only touched/new files, 13 files. [CONT21 test10 block]
- Entry-visibility evidence: `4294957742` was found in `Hide\HideCtrlData.hidelink.jsfb` in the WORKING bake but NOT in ours. [CONT21 test10 block]
- **Correction to an older claim:** `AURORA_FORGE_ACTIVE_STATE.md:33` — HideCtrl has NO name-id registration (the 0xFFFFDAAE hit was a soff header collision); genuine HideCtrl pattern is motion rows (s0/s17 field-0 low-u16). [CONT21 §02:15 "Also corrected in-repo"]

### Q3 — Name/string id scheme (SDB ids, negative ids, hashes)
- **Rule: next sequential after SDB last id.** SNME stock ENG.sdb ends signed `-9555` → new = `4294957742` (`-9554`). One name shared across the entry's rows; ENG.sdb only. [CONT21 §02:15 #3]
- Label mechanism: the label is the numeric SDB id (e.g. 4294957742 = signed -9554) stored in each table's `nameString`; the text only exists as XOR-decoded ENG.sdb payload. [CONT21 test10 block]
- Tool: `tools/sdb-name.js --text "AURORA 16086"` → find-or-append (reuses exact-text record or appends next id in negative space) via `append_2k25_sdb_string.js`; returns `{ id (u32), signedId, created }` for use as row `nameString`; verified idempotent. [CONT21 2026-09-23 editor suite]
- **SDB ids are NOT common hashes** — crc32/fnv/djb2/sdbm/jenkins all miss "CHRIS SABIN" → 393211540 etc. They are game-internal ids. Sequential append already displays correctly; hash generator not required yet. [CONT21 2026-09-23 editor suite]
- Prior test used SDB id 50000 ("AURORA 16186", id=-9537) — superseded by the sequential-negative-space scheme. [CONT21 test6 block]
- bobnobob oracle: SDB strings `bobnobob 1-5` = ids 4294957742–46 (signed -9554..-9550). [CONT21 test10 block]

### Q4 — CAMMoveData (MoveData/CAMMoveData.jsfb) role + values
- **Role: it is the animation's camera/motion registration entry.** Clone a same-shape stock entrance-class record (oracle template motion **41525**, **vsize 116, osize 80**), patch the motion id → new id. [CONT21 §02:15 #4]
- Tool: `tools/append-2k25-cammove-entry.js --template-motion-id --new-id --vsize --osize`. Verified against stock SNME (41525/116/80). [CONT21 §02:00 status; §01:40 writer list]
- Included in the 8 extended writers; missing from our output in test10 (was in the working bake). [CONT21 test10 block]

### Q5 — New-entry id numbering rules
- **Owner rule (SNME): EntranceListData sec8 max + 3000 = 16086.** "same id across tables". [CONT21 §02:15 #5]
- House 14000-base rule is superseded by the above, but earlier owner statement: default start 14000, "higher is better" if taken; run 16181+ was correct then. [CONT21 2026-09-23 ~01:30 owner priority; §02:00 #5]
- Reason 16181 was chosen: converter `firstId = max(14000, maxExisting+1)`; EntranceListData section 7 placeholder slots occupy 16000..16180, sec8 already had Tribute test rows 14000/14001/14003 (14002 free). **Collision check is across ALL sections**; sequence is +1 per motion. [CONT21 §02:00 #5]
- House rule 1 (verbatim): "New dances get big numbers only. New animation IDs start at 14000. Never reuse old numbers. Number 6185 is taken (it belongs to THE USOS) — using it broke a whole week once." [CONT21 §3]
- Same id used across tables; for the victory side: `wrestlerId=own id`, `nameString=name id`. [CONT21 §02:15 #7]

### Q6 — EntranceListData row field values for new entries
- **f4 = f5 = new motion id (16086); f6/f7/f8/f9 cloned from the template row (Dire Intentions: 1152 / 26008 / 504 / 30001).** [CONT21 §02:15 #6]
- Field map (evidence-backed): `f4`=MOTION (locked), `f5`=TITLE MOTION, `f6`=MITB MOTION, `f7`=DOUBLE TITLE MOTION, `f8`=ENTRANCE MUSIC (CONFIRMED: MusicList.jsfb record adjacent to "Chris Sabin" carries 2236 = our row's f8), `f9`=TITANTRON/BANNER movie id (30001 = default, 10226 = MCMG). [CONT21 2026-09-23 editor plan; §03:15]
- Tribute editor field map (video-confirmed): Template ID=id · Name SDB=nameString · Type=type · Entrance ID=f4 · Title Entrance=f5 · MITB=f6 · Double Title=f7 · Music ID=f8 · GFX Template ID=f9 (30001=default). [CONT21 2026-09-23 editor suite]
- **Row shape gotcha: stock rows have an 11th field slot (vtable 26); our writer drops it (writes vtable 24).** Must preserve by in-place row edit, not full rebuild. [CONT21 2026-09-23 editor plan; §03:15]
- Stock SNME EntranceListData section shapes: sec8 = {11 fields: 619 rows, 12: 29, 13: 49}; sections 1–3 = 7 fields (1706 rows); sec7 = 11 fields (304 rows). test10 shape check identical + 1 row (s8 {11:620,12:29,13:49}). [CONT21 test9/test10 blocks]
- Editors: `tools/edit-2k25-entrance-entry.js` (list mode `--list [--section N] [--json]`; edit mode `<in> <out> --id N [setters]`; setters `--name-string --type --hide-id --field4..9` + aliases `--motion (=f4) --title-motion (=f5) --mitb-motion (=f6) --double-title (=f7) --music (=f8) --gfx (=f9)`; refuses missing-field; re-reads output for verification; changed exactly 4 bytes of a 453,564 B file). [CONT21 2026-09-23 editor suite]
- Section-8 discovery: id 100 = THE ROCK, nameString 1906255046; sections 1–3 = 1706 special rows (nameString=0); motion 852 rows exist only in sections 1–3 (nameString=0). [CONT21 2026-09-23 editor suite]

### Q7 — VictoryListData vs EntranceListData (separate tables, row shapes)
- **Separate tables (Entrance animations vs Victory animations); the test CAK had both (entrance 14000+ and victory 14000+ entries, videos examined).** [CONT21 §02:00 #7]
- Victory row: `wrestlerId=own id`, `nameString=name id`, `type 1`, `someId`/`victoryFace` cloned or own id. [CONT21 §02:15 #7]
- Victory editor: `tools/edit-2k25-victory-entry.js` ("Vict") setters: `--wrestler-id --name-string --type --hide-id --some-id --victory-face --victory-heel --title-face --title-heel --double-title-face --double-title-heel`; changed exactly 2 bytes of a 34,184 B file. [CONT21 2026-09-23 editor suite]
- Tribute Victory field map: Template ID=wrestlerId · Name SDB=nameString · Type=type · Victory Face/Heel=f5/f6 · Title Face/Heel=f7/f8 · Double Title=f9/f10. [CONT21 2026-09-23 editor suite]
- Stock roster rows carry their own motion id (`wrestlerId 100 → someId=6100, victoryFace=6100`; `101 → 6101`; base 14000 row has `someId=victoryFace=14000`). Every new row must get `--some-id <id> --face <id>` (the "all entries preview the same motion" root cause was clone-verbatim 14000). [CONT21 §02:00 root cause]
- Per-entry `.adefs` is mandatory on the victory side: convention `victoryFace N → Animation/Victory/N.clips (+N.adefs)`; **adefs payload has NO id refs → byte-clone safe**; proven recipe (LOG-2K19-2K25-TRANSFER.md Testv1.02a): entry 14004 + victoryFace=14100 + cloned 14100.adefs → in-game preview played the NEW motion. [CONT21 §02:00 #2; LOG2K19-2K20 line 379 cited therein]
- Victory `.clips` shape: stock `Animation/Victory/6100.clips` = 17 records / record15 = 64 tracks / adefs 4,206 B. [CONT21 crash finding 2026-09-23]
- Data Editor 2K19 victory list: `06100` = The Rock (Modern), `09100` = Champion: The Rock; 2K25 `VictoryListData.jsfb` wrestler slot 100 references normal face victory 6100 + alternate/title 9100/8712. [ENTRANCE_EXPORTER_FINDINGS §WWE 2K25 victory bridge]

### Q8 — How animation files are registered
- Registration = clips/adefs assets + `CutsceneNoRegistry` entry + `CAMMoveData` entry (+ loader serving order already fixed: boot-thread mount verified). [CONT21 §02:15 #8]
- **Entrance mono file:** `Animation/Entrance/<id>.clips` (test10: 834,576 B, mono) + `.adefs` (cloned 852; 6,563 B). **CaeAdvanced phase files:** `Animation/CaeAdvanced/1x0<id4>.clips` + adefs (5 phase files; body record replaced from mono). [CONT21 test10 block]
- CaeAdvanced pair-id pattern: `<1><phase 0-4><0><entranceId padded to 4>` → 852 → `1000852`…`1400852`; Rock 100 → `1000100`…`1400100`. Each phase file has its own `.adefs` (852: 4,061–4,672 B). [CONT21 solved-map 2026-09-23]
- Entrance template structure (stock `Animation/Entrance/852.clips`, 29 records): per phase = trk73 body record + trk10 secondary + trk28 + trk3 + trk27 records. Record→phase map (sha-verified): intro `1000852` body mono22 + secondary mono23; stage `1100852` body 24 + sec 17; ramp `1200852` body 10 + sec 25; ringside `1300852` body 26 + sec 15; ring `1400852` body 27 + sec 28. [CONT21 solved-map]
- 2K19 source side: entrance decode = 10 sections = 5 phases × 2 parts — section 2i = phase body (62 tracks), section 2i+1 = phase secondary (7 tracks). Phase frame counts for 100.bin: 242/1166/672/2214/2366. `export-yanm-ir.js <bin> [section]` exports one section. [CONT21 solved-map]
- Victory registration: `someId`/`victoryFace`=own id + `Animation/Victory/<id>.clips` + `<id>.adefs` (clone of 14000.adefs; 4,206 B). [CONT21 §02:00 #1/#2]
- Cutscene: `Cutscene/CutsceneNoRegistry.jsfb` entry required for genuinely-new imported motion (was already written by our converter). [CONT21 §02:15 #2; test10 block]
- `Cutscene/ListData/EntranceMotionTableData.jsfb` exists in 2K25 — 1,204 B, 40 records × 5 fields, values 29xxx/293xx (NOT the 1,205-motion list; special-motion registrations). Reader `tools/entrance-motion-table.js`. [CONT21 full-extraction block]
- Loader: `mods/manifest.json` mounts only listed CAKs; boot-thread mount verified for both 2K25 v1.23 and SNME. [CONT21 2026-09-24 build-identity; 2026-09-22 §4.1/§4.2 DONE]

### Q9 — Tool/flow that builds the CAK for a new entry
- **Driver: `tools\bakeme-orchestrator.js` config** — copies a source BakeMe tree → applies writers → emits `aurora-bakeme-proof.json`. Config blocks: `sdb, victory, entrance, cutscene, teams, charmapping, cammove, facetextures, charmoveset, charprofilepro, charprofiletable, hidemotion`. Config format example in `tools\bakeme-orchestrator.test.js` (`teams: { relativePath, templateTeamId: 100, newTeamId: 14000 }`). [CONT21 test10 block; §02:15 #9]
- **Bake: Foundry/FTribTool `--encrypt-header`** (`Aurora-CAK-Foundry\app\tools\cak-v93\FTribTool.exe`). [CONT21 §02:15 #9; full-extraction block]
- FTribTool commands: `catalog-json -i <cak>` · `unpack-cak -i <cak> -o <dir> --no-convert-dds` · `unpack-file -i <cak> -f <rel> -o <dir>`; bake closure = `scripts/bake-v93-cli.js` + `electron/cak-v93-backend.js` + `app/tools/cak-v93/**`. [CONT21 full-extraction block; Beta2 snapshot]
- 8 extended writers (built 2026-09-21, 38/38 tests): `append-2k25-charmoveset-slot.js` (--wrestler-id --template-sdb-id --new-sdb-id) · `append-2k25-charprofilepro-entry.js` (--template-char-id --new-char-id) · `append-2k25-charprofiletable-entry.js` (same) · `append-2k25-face-textures-entry.js` (--template-id --new-id) · `append-hide-ctrl-entry.js motion` (--section --template-index --new-motion-id) · `append-2k25-cammove-entry.js` (--template-motion-id --new-id --vsize --osize) · `append-2k25-character-mapping-entry.js` (--template-id --new-id) · `append-2k25-teams-entry.js` (--template-team-id --new-team-id). [CONT21 test10 block]
- **"The converter under-registers because it never calls these."** Wiring them in (or an orchestrator config) = the fix path. [CONT21 test10 block]
- App-level pipeline: `tools/convert-2k19-library-to-2k25-entries.js` (per-motion try/catch → `skipped[]`; deletes partial workRoot/CAK on failure) → Foundry bake → CAK; conversion ~2–4 s/entry (3 registration-writer subprocess spawns per motion ≈ 0.5–1.5 s each). [CONT21 Beta2 blocks]
- 5-entry test recipe (works): `extract-2k19-animations.js --game <2K19> --out <tmp> --ids 6100,6101,6102,6103,6104 --helper <flagship>\app\tools\pac19-helper\AuroraPac19Helper.exe` then `convert-2k19-library-to-2k25-entries.js --skeleton "C:\AuroraForge-Aug26\_work\14000-compat-v103\BakeMe" --victory <tmp>\victory --entrance <tmp>\entrance --out-cak <out.cak> --foundry "<flagship>\Aurora-CAK-Foundry"`. [CONT21 Beta2 blocks]
- Loader pair for SNME + v1.23: `dinput8.dll` `E600D04F2E1A9AF3C23A358462E8B5C25064D6C08411819377E278581EF0ED2F` + `AuroraForge.CAKModLoader.ftrib` `8DF85F88EF117CAE07D9BA3788AB255C5986E3E460F905EDAB7C5972918E3E33`. [CONT21 2026-09-24 build identity]
- **Manifest must be BOM-free** (`[System.IO.File]::WriteAllText` with `UTF8Encoding($false)`); PowerShell `Set-Content -Encoding UTF8` writes a BOM → loader `ERROR: [ModLoader] mod manifest invalid: expected JSON object` → nothing mounts. [CONT21 BOM bug block]

### Q10 — Intended end-to-end user flow
Owner acceptance test (verbatim intent, [CONT21 §02:00 #10]):
1. User selects a 2K19 animation (entrance OR victory) → **Import into WWE 2K25**.
2. Pipeline converts the 2K19 animation into a usable NEW animation entry.
3. App copies entry #1 **"Dire Intentions"** (first template row) and sets the copy to the new id (e.g. 14006); user enters the name (for 2K19 animations use the converted animation's name field).
4. Entrance or Victory creator tool opens (per selection) → **every field editable** (music id etc.); defaults filled from the 2K19 animation where possible; user saves as a NEW entry.
5. App makes a CAK with just this mod (or a full BakeMe folder); testing uses **5 copied test entries** in the test CAK.
6. User copies CAK to game `mods\` + updates manifest (not automated yet) → loads SNME → Create an Entrance → templates show the 5 names → scrolling to any test animation **plays the new converted animation** (not the default) → cursor up/down plays the next animation (new or default).
- App implementation status: Beta2 = strict 4-step 1-click wizard (authorize → pick 2K19 folder → select task → Convert + live status monitor). Tasks: (A) convert all 2K19 Victory+Entrance animations to new 2K25 entries (default), (B) extract all 2K19 event files. [CONT21 Beta2 snapshot; §04:00]
- Editor design (owner-approved): converted animation id is LOCKED as the entry's MOTION; everything else user-selectable (TITLE/MITB/DOUBLE TITLE motion, music, titantron/banner, light show/screen FX); dropdowns fed from game defaults; requires option-list tool + field-preserving row editor + convert/bake split (`--no-bake`, bake-only) + app "Customize Entries" step. [CONT21 2026-09-23 editor plan]
- In-game Create an Entrance edits save to the user's save file, not the CAK; our editor bakes choices for everyone. [CONT21 owner proposal block]
- Option-list tool: `tools/list-2k25-options.js --music <MusicList.jsfb>` (700 records; f0=musicId u32, f2=star string, f3=title string, f4=type u8, f5=cue f32) · `--motions <Animation/Entrance dir>` (1,205 ids) · `--motion-names <EntranceListData.jsfb> <ENG.sdb>` (697 rows, 657 named). [CONT21 2026-09-23 editor suite]

---

## VERIFIED FACTS (hashes / sizes / paths / RVAs)

### Game builds
- **SNME (WWE 2K25 Saturday Night's Main Event):** `WWE2K25_x64.exe` 529,611,216 B, SHA-256 `C6BC0459D4D29667C9E8F1DCACA013AE4691D615E4C79D069AD272F70E2CEE01`; profile RVAs mount=`0x2E03F0`, signature=`0x2E04FD`, phase=`0x2E05A0`. [CONT21 2026-09-24 build identity]
- **WWE 2K25 v1.23:** exe 391,159,760 B, SHA-256 `B608E7ED18BFB6291CA195532ACCF40081CBF1A1F4850E63943906D155B9AC98`; RVAs mount `0x2DFDA0`, validation `0x2DFEAD`, stock-loader sync `0x2DFF50` (range 0x2DFF50–0x2E023F). Rejected bad candidate `0x2DFD42` — keep as regression guard. Oodle SHA-256 `01301592C8E51660BFDD8785ED1AD762FD103033C85414C925FC3DD4B8B6E999`. [CONT21 build identity; KBHANDOFF; OVERNIGHT]
- SNME loader/core hashes: core `dinput8.dll` `E600D04F…`, CAK addon `8DF85F88…`, CustomMusicLoader addon `A72791892994B90D407B449C2DB13D743CA6803173F10375B5D0FD6CA2D96B47`. [CONT21 2026-09-24 repo updates]
- SNME exe copy for v1.23 (older): 2K25 v1.23 changed-content override test pins 2K25 v1.23 SHA above + Foundry v1.7.8 + DataCtrlLink v1.0.02 + CAK Mod Loader v1.0.02. [CHANGED-CONTENT-OVERRIDE-TEST]
- WWE 2K26 v1.16: 412,095 of 412,095 payloads named across 15 archives, 0 unresolved; 279 zero-payload metadata refs. [ACF v1.7.7 bug report ACF-177-005/006]

### Release artifacts
- Aurora CAK Foundry v1.7.8 ZIP: SHA-256 `888253B4D4B195FDCFB6B9C8E406174DA1018FF3A9D89E1BB5729689F51E495A`, 215,272,582 B. [KBHANDOFF]
- Secure DataCtrlLink WWE 2K25 v1.0.02 ZIP: `84B1809D712D6CE00239FCF0F4109AEEACF7C5F5438A195208CC5ED65A2908B5`, 538,526 B; DLL `E86EA1B956D0F3CAF155341A3B51F98BD18BB1B5588A40DE848DBB6AFF1AAC6A`. [KBHANDOFF]
- CAK Mod Loader v1.0.02 ZIP: `A80B96B329E3B5B7FD3ECE0749A082BD6389E5DDF23F485C64FBB24CF1B78A50`, 532,932 B; addon DLL `8A1F305B3940576270407B1A0579F63D2DC604C789ACE0A0EA28AB30351AEC16`. [KBHANDOFF]
- CAK Mod Loader v1.0.01-RC1 installs as `plugins/AuroraForge.CAKModLoader.ftrib`; requires Secure DataCtrlLink v1.7.7. [RELEASE-NOTES-1.0.01-RC1]
- Foundry v1.7.7 (older): 386,873 of 386,873 catalog entries named, 93,738 folders, 0 rejected; `bakedfile100.cak` 54,481 named files. [CAK_FOUNDRY_RELEASE_NOTES_1.7.7]
- Foundry v1.7.7 verify: changed-content override test verified for one protected FDIR v9.3 visual asset on 2K25 v1.23 → `accepted=1 rejected=0 failed=0`. [CHANGED-CONTENT-OVERRIDE-TEST]
- Foundry app CLI: `catalog-json`, `unpack-cak --no-convert-dds`, `unpack-file`. [CONT21 full-extraction block]
- CakeView build verification (MyGM $50M example): CakeView 1.14.1.0, CAK 3,098 B SHA `1A39A7179671B4E29B1952AF3BEABFD69CB79647CC1286B5110AADC97F7136F5`; payload byte-identical to guarded source. [CAKEVIEW_BUILD_VERIFICATION]

### Test CAKs (built artifacts)
- `test10.cak` 7,460,860 B SHA `9ec6efeb14153eb472b50d177ceed67fd41d036cdfc6d583021be1e677ff2ada` (minimal, 13 files). [CONT21 test10]
- `test6.cak` 47,550,328 B SHA `7907f4b16acd25e8936453446403e1b8ea0049a67fb9f57236c0ee2f2b061569` (34 files). [CONT21 test6]
- `test5b.cak` 57,223,248 B, fileCount 142, Foundry `verified=true`; `test5c.cak` 58,413,920 B, 152 files; `aurora-beta2-library.cak` 752,479,896 B (1958 new entries). [CONT21 §02:00, §03:15, Beta2]
- test5b mods copy SHA verified = work output `82C3DED6C82EBAE6F2C4E248B3B273498BBDF366CA7C250F7E6F5ED4F7D32E35`. [CONT21 staging block]
- First proven new-entry CAK in 2K25: `test5.cak` (57,201,872 B) → entry AURORA 16181 visible + motion plays (0:56 Sabin clip). [CONT21 Beta2]
- 2K20 milestone output: victory-6100 2K20 package: motion 174,976 B / 62 tracks / sentinel=true; ACTS 429,196 B (AMYM, replaced 489,264 → 174,976); EVD 20,610 B / 24 event bodies; EVD internal name `6100_VIC_SINGLE_The_Rock_M_Face`. [LOG2K19-2K20]
- Owner build artifacts: `Aurora-Forge-Beta2-Owner.exe` 120,753,934 B (build6, 2026-09-22 23:59). [CONT21 Beta2 snapshot]

### Paths / data roots
- 2K25 full extraction: `C:\Games\2k25-extraction\` (268.2 GB, 12 CAKs, ~18 min; `bakedfile00`/`bakedfile50` external-reference-only). [CONT21 full-extraction]
- Desktop canonical asset list: `C:\Users\dgran\Desktop\fuuuuuuuuuck.csv` (22,003,792 B, 356,919 rows, columns `Asset/Directory GUID,Full Path`) — **use first for any file/path lookup; do not re-run catalog scans**. [CONT21 full-extraction]
- JSFB inventory: 19,975 files / 871.5 MB; Entrances 3 (`EntranceListData.jsfb` Entr, `VictoryListData.jsfb` Vict, `SuperStarTronSetup.jsfb`); Roster 14; Characters 12; MoveData 6; Hide 1 (`HideCtrlData.hidelink.jsfb` 4.4 MB); Sdb 1; Stable 2. [CONT21 full-extraction]
- Animation folders (2K25): `Animation/Entrance` 1,205 `.clips`+`.adefs` pairs (1.08 GB) · `Animation/Victory` 2,084 files (~1,042 pairs, 359 MB) · `Animation/CaeAdvanced` 9,004 files (749 MB) · `Animation/Acts` 395. [CONT21 full-extraction]
- 2K19 source: `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19`; `pac\evt` has 4,391 pacs (older note) vs ENTRANCE_EXPORTER_FINDINGS says current `pac\evt` = 5,992 pacs, older 4,391 stale. In-scope: 2,032 (540 victory 6000-9999, 1,490 entrance 1-5999). [CONT21 Beta2; ENTRANCE_EXPORTER_FINDINGS]
- 2K20 extract: `C:\Games\2k20extracts\Root` (`.acts`/`.evd`; `Entrances/CAE_TemplateDataLists.jsfb` exists in 2K20 only). [CONT21 rules correction]
- Tribute 1.20 BakeMe: `D:\wwe 2k25 mods\TRibute-1.20\TRIBUTE 25 v1.20\TRIBUTE 25\BakeMe`; full Tribute bake: `C:\Games\Tribute25-Designs-BakeMe-20260909-200828`. [CONT21 rules correction]
- Skeleton: `C:\AuroraForge-Aug26\_work\14000-compat-v103\BakeMe`. [CONT21 Beta2]

---

## HOUSE RULES (all sources: CONT21 §3 unless noted)

1. **New dances get big numbers only.** New animation IDs start at 14000; never reuse; **6185 is taken (THE USOS)** — using it broke a week.
2. **One suitcase at a time.** Only ONE registry-changing CAK active in the game `mods\` folder per test. (Reinforced: test6 block "house rule"; do not list test5c/aurora-beta2-library together with another registry CAK.)
3. **Copy, don't drag.** Stage test files by copy; verify SHA-256 on both sides.
4. **Say only what you proved.** "Loader accepted" ≠ "works in game". Claim in-game valid only after: game loads no crash + name visible in picker + dance visibly plays.
5. **Hands off:** `forge2/` (TraeCode), `D:\zips` (private), PWM CakeHook reference folder (look, don't touch), `aurora-disabled-tests/`.
6. **Newest code wins.** If two copies of a script differ, the newer is the boss (flagship copies won 137 races; `_archive/.../FLAGSHIP-RACES.tsv`). Nothing deleted over it.
7. **One repo per toy (ADR-001).** Each box keeps its own `.git`.
8. **Commit nothing without the owner's yes.**
9. **LOG LAW:** before any response/command/action review the continuation doc + log; record last run command + why + full conversation log at the top before proceeding; if context <50% stop feature work and update the file first; log everything as it happens. [CONT21 LOG LAW block]
10. **Do not redo tests/scans.** Check canonical lists first (Desktop CSV; `analysis/*`; `notes/*`; `_work/*` BakeMes). [CONT21 rules correction]
11. **Never rebuild stock JSFBs.** Add rows with the byte-preserving `append_2k25_entrance_clone_graph.js` + edit fields in place with `edit-2k25-entrance-entry.js`. [CONT21 test9 block]
12. **Manifests must be BOM-free.** [CONT21 BOM bug]
13. **Never rename a finished mod CAK; rebuild it under the desired name** (filename-derived key rule). [INSTALLATION_AND_ROLLBACK; FUTURE_IDEAS]
14. **House edit boundaries:** don't edit `latest\`, `Aurora Forge Sept 20\`, `_worktrees\` (snapshots/worktrees/historical). [CONT21 2026-09-24 repo updates]
15. Never modify stock game files or immutable extracts; preserve dirty worktrees. [COMPLETE-CONTINUATION-PROMPT]

---

## GOTCHAS / DEAD ENDS (do NOT repeat)

- **test9 broke the Create-an-Entrance list (all names blank).** Root cause: the OLD rebuild writer `append_2k25_entrance_entry.js` rewrites EVERY row with a 10-field vtable; stock SNME has 11/12/13-field rows → shapes destroyed. test5b/test6 "worked" only because they used the Tribute-1.20 skeleton (uniform 10-field rows). [CONT21 test9 block]
- **test5c crashed the entrance editor.** Cause: stock entrance motions are 29-record phase files (`852.clips`, adefs 6,563 B) while our "entrance" copies were 17-record victory format. The full-library CAK `aurora-beta2-library.cak` contains 1,456 victory-format Entrance files → **do not use it in game**. [CONT21 crash finding]
- **test10 entry 16086 absent from list = under-registration** (only 4 files written; 8 tables missing). Pressing A/SELECT went to the wrong id entry (row→data mismatch). [CONT21 test10 block]
- **All new entries previewing the same animation:** registration rows cloned base motion id (someId=victoryFace=14000) and per-entry `.adefs` missing. `.clips` record 15 sha differed per entry, so data was fine — bug was registration-only. [CONT21 §02:00]
- **Menu rows ↔ previews mismatched on the full library CAK** (Edge previews Abyss; scrolling past AURORA entries shows motions not belonging to the row) → appended rows break list→animation mapping (positional/index lookup, ordering key, or name-string pairing). [CONT21 §02:00 owner clarification]
- **`?????` + lock rows = stock locked DLC — IGNORE. 2:00 candle preview = Aleister Black stock entrance — IGNORE (not our code).** [CONT21 test10 block]
- **Odd `%d'%d"` row in the picker** — likely a pre-existing/format-string SDB row; verify it is not ours. [CONT21 Beta2]
- **BOM bug:** UTF-8 BOM in `manifest.json` → `mod manifest invalid: expected JSON object` → addon FAILED → nothing mounted. v1.23's loader build tolerated the BOM; SNME's does not. [CONT21 BOM bug]
- **Oldest entrance writer miss:** the library used `append_2k25_entrance_entry.js` (9/12 14:20); newest = `append_2k25_entrance_clone_graph.js` (9/12 14:51, byte-preserving, preserves 11th field); `append_2k25_entrance_template_entry.js` = byte-preserving asset-ref variant. Use the newest. [CONT21 codebase map]
- **Wrong id-selection root cause (Beta2):** `extract-2k19-animations.js` computed `onlyIds` from `String('').split(',')` → `['']` → `Number('')` → `[0]` → filtered everything → "counted: 0". Fixed with `.filter(Boolean)`. [CONT21 Beta2]
- **Packaging root cause (1.0.0c/1.0.0d hero button never worked):** stage allowlist missed 2 entry tools + 7 clips-codec closure files (`bit-reader.js`, `bit-writer.js`, `width-table.js`, `parse-timing-group.js`, `read-bits-at.js`, `entropy-pair.js`, `resample-keys-catmull-rom.js`); packaged EXE shipped 59 files → `require()` died. Fixed: 68 files staged + extraResources `pac19-helper` + Foundry bake closure. [CONT21 §root cause]
- **Second record-layout suspect (open):** library template `14000.clips` may have a different record layout than the earlier successful single-entry tests, so `recordIndex 15` may no longer address the motion record. Earlier tests that played correct distinct animations were REPLACEMENT conversions; the NEW-ENTRY/library path was the broken one. [CONT21 §hash evidence / owner differential]
- **Old Python BPE prototype produced repeating garbage** (dictionary control-run bug) — must not be used as validation evidence. New C# decoder matches an independent C reference byte-for-byte. [ENTRANCE_EXPORTER_FINDINGS BPE correction]
- **Do not rebuild stock JSFBs / do not full-rebuild entrance lists** (repeated above, kept separate as dead-end). [CONT21]
- **`git diff --check`/EOL:** when patching `main.js` use EOL-agnostic regex (`\s*`), not literal `\n` (CRLF repo). [CONT21 hard rules]
- **Do NOT delete the one-click again** (deleted once in cleanup, recovered from an EXE). [CONT21 hard rules]
- **Never re-create an existing script** — canonical homes listed (§Log-DoNotRepeat: 2K19 extraction `tools/extract_2k19_pac.py` + `extract_2k19_archive_entries.js`/`inspect_2k19_archive.js`; 2K25 lists `tools/parse_2k25_victory_list.js` + `find-2k25-entrance-entry.js`; batch `tools/batch-2k19-to-2k20-victory-packages.js`; registration `append_2k25_*` + `bakeme-orchestrator.js`; 14000 reuse `tools/copy-working-14000-registration.js`). [CONT21 §Log-DoNotRepeat]
- **Skeleton-vs-stock EntranceListData/SDB comparison analysis was owner-judged "all wrong" — do not pursue that path.** [CONT21 owner corrections]
- **Reproducible builds:** Windows linker timestamps made identical addon builds hash differently → fixed with LLVM-MinGW reproducible PE timestamp; two consecutive builds produced identical SHA-256. [BUGS-AND-FIXES-1.7.7 SDCL-177-003]
- **Do not weaken Secure DataCtrlLink:** no generic `.asi`/`.dlp`/DLL loading; no hash-only game-update. [SECURITY.md; FUTURE_IDEAS "remain rejected"]
- **Loader pre-window mount dead end:** worker-thread early delivery always crashes (proven 6+ times); boot-thread mount is the verified path. [CONT21 §4.2 DONE; §4 fix-it item 2]
- **Do not claim 2K22 conversion support** — TBUF descriptor/range research is metadata only, not a writer. [LOG2K19-2K20 2K22 entries]
- **`test_anim.clips` fixture has no sibling `.adefs`** → native Clips Editor showed bind/T-pose `0 / 0` frames. [COMPLETE-CONTINUATION-PROMPT]
- **0xFFFFDAAE / raw u16-u32 scan counts are misleading** (soff header collision; HideCtrl has no name-id registration). [CONT21 §02:15 corrected]
- **Missing debugger:** no WinDbg/cdb on PATH → crash dumps unreadable. [CONT21 §4 item 7]

---

## TOOL INVENTORY (script path → purpose)

Registration / rows:
- `tools/append_2k25_entrance_clone_graph.js` — byte-preserving entrance row append (clones full record shape incl. 11th field; `--clone-id`). [CONT21]
- `tools/append_2k25_entrance_template_entry.js` — byte-preserving asset-ref variant. [CONT21]
- `tools/append_2k25_entrance_entry.js` — OLD rebuild writer (10-field vtable; DESTROYS stock shapes — avoid). [CONT21]
- `tools/append_2k25_victory_entry.js`, `append_2k25_sdb_string.js`, `append_2k25_entrance_preserving_graph.js` — list/SDB writers. [CONT21; CURRENT-STATUS]
- `tools/edit-2k25-entrance-entry.js`, `tools/edit-2k25-victory-entry.js` — field-preserving in-place row editors (list + edit modes). [CONT21]
- `tools/sdb-name.js` — find-or-append SDB name id. [CONT21]
- `tools/list-2k25-options.js` — dropdown option lists (music/motions/motion-names). [CONT21]
- 8 extended writers: `append-2k25-charmoveset-slot.js`, `append-2k25-charprofilepro-entry.js`, `append-2k25-charprofiletable-entry.js`, `append-2k25-face-textures-entry.js`, `append-hide-ctrl-entry.js`, `append-2k25-cammove-entry.js`, `append-2k25-character-mapping-entry.js`, `append-2k25-teams-entry.js`. [CONT21]
- `tools/bakeme-orchestrator.js` — config-driven applier across all registration blocks + proof JSON. [CONT21]
- `tools/copy-working-14000-registration.js` — reuse the proven 14000 registration. [CONT21]

Conversion / codec:
- `tools/extract-2k19-animations.js` — one-click 2K19 PAC decode (--ids, --game, --out, --helper; progress on stderr `[aurora-progress]`). [CONT21]
- `tools/convert-2k19-library-to-2k25-entries.js` — library converter (per-entry try/catch, skipped[], deletes partial output on failure). [CONT21]
- `tools/build-2k19-to-2k25-replace-clips.js` — replacement writer (`--section-index` pass-through; `recordIndex 15`). [CONT21]
- `tools/clips-codec/build-imported-clips.js` — YANM IR → clips record writer (64-bone/record-15 specific; needs entrance branch: 73-track body/10-track secondary; `:41` hardcodes `ir.sections[0]`, `:61` loops 64 bones, `:66` `useSource = bone <= 60`). [CONT21 codec touch points]
- `tools/export-yanm-ir.js` — export one 2K19 section IR (`<bin> [section]`). [CONT21]
- `tools/clips-layout.js` — modern `.clips` framing reader/rebuilder (record table). [CURRENT-STATUS; CONT21]
- `tools/entrance-motion-table.js` — reader for `Cutscene/ListData/EntranceMotionTableData.jsfb`. [CONT21]
- `tools/parse-2k25-jsfb.js`, `tools/parse_2k25_victory_list.js`, `tools/find-2k25-entrance-entry.js` — JSFB/list readers. [CONT21; CURRENT-STATUS]
- `tools/adefs-tool.js` (read-only ADEF CLI), `tools/adefs-container.js`, `tools/decode_adefs_wrapper.js` — ADEF envelope/definitions. [COMPLETE-CONTINUATION-PROMPT; CURRENT-STATUS]
- `tools/clips-tool.js` (safe modern CLI: compare etc.), `tools/clip-control-pair.js`, `tools/clips-controlled-diff.js`. [COMPLETE-CONTINUATION-PROMPT; CURRENT-STATUS]
- 2K19→2K20 chain: `tools/convert-yanm19-to-yanm20.js`, `yanm20-reader.js`, `yanm20-encoder.js`, `yanm20-ir-writer.js`, `yanm20-normalized-ir.js`, `patch-acts20-yanm.js`, `amym-container.js`, `fop19-evd20-body-model.js`, `build-2k19-to-2k20-victory-package.js`, `batch-2k19-to-2k20-victory-packages.js`, `staged-pipeline.js`. [CURRENT-STATUS; LOG2K19-2K20; 2K19-2K20-CONVERTER README]
- 2K22 analysis: `tools/tbuf-v1-body-candidate-record.js` (+ prefix corpus, track probe), `tbuf-v1.js`, `amym-tbuf-report.js`. [LOG2K19-2K20]
- Probes (Animation-Probes repo): `probe-plusone.js` (YANM→TBUF positional pairs; entry-0 stream census), `harvest-rosetta.js`, `inspect-conflicts.js`, `name-bones.js`, `dict-expand.js`, `bracket-insert.js`, `locate-insert.js`, `validate-crc.js` (CRC32C lowercase vs rig bones), `probe-hashwords.js`, `harvest-names.js` (.adefs string harvest), `probe-entrlist.js` (FlatBuffer walk), `scan-2k20-profile.js` (PE/LEA/xref → 2K20 loader profile), `gen-inventory.js`, `split-log.js`; tables `yanm-tbuf-rosetta.json` (73 pairs), `crc-dictionary.json` (45 bones). [ANIM-PROBES]

Bake / CAK / loader:
- `Aurora-CAK-Foundry\app\tools\cak-v93\FTribTool.exe` — `catalog-json`, `unpack-cak`, `unpack-file`; bake via `scripts\bake-v93-cli.js` (`--encrypt-header`). [CONT21]
- `Secure-DataCtrlLink` core + `AuroraForge.CAKModLoader.ftrib` addon + `mods/manifest.json`. [SECURITY; README]
- Loader config files: `plugins/addons.txt` (enable/order), `mods/manifest.json` (CAK/package allowlist+order), `DataCtrlLink.ini` (5 numeric tunables), `DataCtrlLink.log`, `DataCtrlLink-status.json` (future). [ARCHITECTURE; FUTURE_IDEAS]
- `scripts\Prepare-ChangedContentOverrideTest.ps1 -Action Prepare|Restore -GameDirectory -ModCakPath` — fail-closed override test runner (SNME pins: exe 529611216 / SNME hash / core E600D04F / addon 8DF85F88). [CHANGED-CONTENT-OVERRIDE-TEST; CONT21]
- `scripts/stage-public-tools.js` — stages 68 public tool files into the app. [CONT21]
- PAC helper: `app\tools\pac19-helper\AuroraPac19Helper.exe` (63.7 MB). [CONT21; ENTRANCE_EXPORTER_FINDINGS]
- Read-only research: `tools\inspect_2k19_archive.js`, `tools\extract_2k19_pac.py`, `tools\inspect_2k19_shdc.py`, `tools\decode_2k19_menu_payloads.js`, `tools\analyze_2k19_menu_templates.js`. [2K19-PAC-Tools README; ENTRANCE_EXPORTER_FINDINGS]
- App: `app/main.js` (IPC), `app/preload.js`, `app/app.js` (wizard), `app/index.html`; owner build marker `app/owner-build.json` + `tools/owner-build.js`. [CONT21]

Third-party/reference tools (read-only, license-respecting):
- WrestleMINUS (Yukes containers: HSPC/EPK8/EPAC, SHDC/PACH, BPE/ZLIB/OODL, YANMPack, YOBJ). [WRESTLEMINUS]
- Clips Editor v2.21 / AnimationEditor_26_V2.2 (closed; controlled export experiments only, no CLI), Discovery Meta (`EntranceMotions.dat`, `VictoryMotions.dat` per game), CakeView 1.14.1, CakeTools2021_v0977a, Blender addon v2.10.3, TRIBUTE 26 v1.5.1. [CURRENT-STATUS external audit]
- bnkextr (Wwise BNK → WEM extractor; /swap /nodir /obj), wwiser + wwiser-utils (BNK dump, name reversing via `words.py`/`fnv.exe`, wwnames lists), ww2ogg. [BNKEXTR; WWISER-UTILS; WORDS; EDITOR]
- Ghidra 12.1.3 (Java 21 + Python 3.9–3.14; headless via `support/analyzeHeadlessREADME.html`; PyGhidra; native build via `support/gradle/buildNatives`). [GHIDRA GettingStarted]

---

## FILE-FORMAT FINDINGS

- **Modern `.clips` container:** header contains the same little-endian clip count twice; record table begins at offset `0x18`; each record 16 bytes = 8-byte identifier + LE payload length + LE payload offset; payloads 8-byte aligned, non-overlapping, reach exact EOF. (2K26 `Animation/CaeAdvanced/1006185` specimen.) [ENTRANCE_EXPORTER_FINDINGS]
- **`.adefs` wrapper:** starts `_rev`, version 6, then `czis` and `uzis` size fields; 2K26 payload decompresses with game Oodle to exactly `uzis`; decoded body begins `epyt` version 1, tagged definition data + asset names + bone refs + crowd-audio events. Victory/2K25 adefs wrapper contains a ZLIB stream `78 DA` (route through ZLIB, not Oodle). [ENTRANCE_EXPORTER_FINDINGS]
- **Clip payload byte-length equation (all 35 Rock entrance clips + 85 more = 120 clips, exact):** `0xA0 + (count20×8) + (count38×4) + (count60×8) + (count78×8) + (count90×8)`. `count20` = track-id count (64-bit entries start at 0xA0); `count78` = 6×count20 for non-facial clips (six transform descriptors per track); facial clips populate `count38` (4-byte entries); `count60` optional; `count90` = large variable trailing region. **group90 is a packed/compressed stream — do not write as {frame,float} arrays.** [ENTRANCE_EXPORTER_FINDINGS]
- **Track identity bridge:** 2K19 32-bit YANM joint hashes map into 2K25 64-bit track identifiers via FNV-1a 64-bit of the joint name (12 named joints verified); 2K25 clip identifiers equal FNV-1a-64 of ADefs asset names (body `100_a_00_m`, facial `100_a_00_m_facial`, camera `100_00_c0`, object o5009, ring-mat o2755). [ENTRANCE_EXPORTER_FINDINGS]
- **5-segment entrance partition (Rock 100):** 2K25 files `1000100`…`1400100`; record partitions 5/5/5/9/11; candidate frame counts 243/843/647/2191/2351 vs 2K19 phase counts 242/1166/672/2214/2366 (243 vs 242 = inclusive-frame boundary candidate; later choreography changed). `Animation/Entrance/100.clips` (2K25) = 35 records; identifier set equals combined advanced pairs; every matched payload sha-identical; different record order. [ENTRANCE_EXPORTER_FINDINGS]
- **2K19 source role hypotheses (Research):** entry 0 = 5×62-record body + 5×7-record facial/secondary; entry 1 = 5×26-record (prop/object candidate); entry 2 = 2×1-record per phase (camera candidate); entry 3 = 5×27-record (ring-mat candidate); entries 4–13 = final two long phases (`_rNN` ring-auxiliary). [ENTRANCE_EXPORTER_FINDINGS]
- **Victory 6100 crosswalk:** 2K25/2K26 `.adefs` + `.clips` byte-identical; target 17 clips (body, camera, ring-mat, 12 ring auxiliaries, 2 facial); 2K19 source 16 YANM motions; 62-record body aligns with first 62 tracks of target 64-track body clip; target appends 2 tracks; aux counts agree at 12; timing/facial representation changed. [ENTRANCE_EXPORTER_FINDINGS]
- **2K19 CreateEntranceInformation menu record (WrestleMINUS layout):** payload begins 2 LE u16 counts; records from `0x04`, `0x28` bytes each: 0x00 Event ID u32 · 0x04-0x0C PAC numbers 1-5 (u16 each) · 0x0E default-PAC flag (0/0xFFFF) · 0x10/0x12 promo u16 · 0x14/0x15 promo u8 · 0x16 reserved · 0x18 string ref u32 · 0x1C/0x1E unknown u16 · 0x20 PAC-lock · 0x22 excluded-PAC · 0x24 DLC u32. `pac/menu/cae_item.pac` entry 0/0 = 217 records; record 0 maps event 10000 → PAC 100 → string 3100. [ENTRANCE_EXPORTER_FINDINGS]
- **2K19 PAC facts:** `pac\evt\00100.pac` = HSPC with two BPE entries → decoded outputs begin `0FOP` and `SHDC`; decoded SHAs `890547F4702E57F0590ECF2B1F5ABDD79C116A51D50EE5EB29B06094ACF0CF4D` / `469FF0918276731838A772D33ABDD6B243DC94E04B5BD1A1A17680CAFFD7348D`. BPE decode Ready; BPE recompression unavailable (Research). [ENTRANCE_EXPORTER_FINDINGS]
- **CAK/archive formats:** 2K25 = FDIR v9.3; 2K26 = FDIR v9.9 (`FDIR 09 09 00 81` prefix for 9.9); 2K25 rebuild = Experimental until in-game observed. [ARCHITECTURE; FOUNDRY NOTES]
- **JSFB row shapes:** EntranceListData stock SNME sections have mixed vtable widths (7/8/11/12/13 fields) — always preserve. [CONT21 test9/test10]
- **SDB:** text XOR-encoded in `Sdb/ENG.sdb`; ids are game-internal (not crc32/fnv/djb2/sdbm/jenkins); negative signed space used for appended names (e.g. -9554 = 4294957742). [CONT21]
- **2K20 YANM20 body:** 62 tracks, 63 records; each track has 2 streams (streamA+streamB); sentinel preserved from reference; `0x2100` per-track size; EVD internal name format `<id>_VIC_SINGLE_<Wrestler>_<M/F>_<Face>`. [LOG2K19-2K20]
- **2K20 EVD body models:** event body indices 0 (setup-table), 19 (circular pose), 20/21/22 (wrapped single/dual/triple-pose), 23 (chained tail: prefix pad 0x10 + subrecords @0x10/0x324/0x638 + terminal marker @0x94c; source markers @0x000/0x314/0x62c). [LOG2K19-2K20]
- **2K22 TBUF body:** 743 `.acts` in Victory corpus; 510 single-body (last TBUF block); stable prefix anchors u0=24, u32=8, u40=3614061049, u44=2097409, u60=u48+20; prefix shapes u48=232/u60=252 (345 files), 296/316 (164), 264/284 (1); 26 complex cases (offset-only largest bucket = 7). Simple class = fixed 20-byte `at48[4]→at60[2]` bridge. [LOG2K19-2K20]
- **Group90:** ULEB tokens; known ULEB Group90 streams rebuild byte-identically; nonzero-Group90 record: `_work\controlled-modern-cli\record1_original.clip` ID `0xE9EB9C7CBB3BDAC0`, 9,920 B, 60 fps, 73 tracks, 438 Group78 descriptors, 709 Group90 entries, SHA `7D2C215C36A57A8A8FB62C89DD57F4ABE455AE9E393DADCFB16F2A678D5B49D7`. No editor-generated nonzero-Group90 counterpart exists locally. [COMPLETE-CONTINUATION-PROMPT]
- **2K25 SDB in 2K26 extract is encrypted** (different layout: `Animation/CaeAdvanced` + `Animation/Acts`, no `Animation/Entrance|Victory`). [CONT21 rules correction]
- **Wwise (for custom music):** AKPK package tables; bank rebuild in memory with fixed normal/looping event records; limits: CAKs ≤8 GiB, Wwise inputs ≤64 MiB, ≤32 CAKs, ≤16 packages. [ARCHITECTURE; SECURITY]
- **DirectInput proxy:** 6 exports via `exports.def`; real DLL from System32 absolute path; no loader work in `DllMain`. [ARCHITECTURE]

---

## STATE SNAPSHOTS (as of end of this batch's sources)

- Writers verified vs stock SNME: 7/8 PASS (charmapping, cammove, facetextures, charmoveset, charprofilepro, hidemotion, teams); charprofiletable pending valid template id. [CONT21 §02:00]
- test12 plan: stock SNME tree + test10's EntranceListData (row 16086, f4=f5=16086) + test10's ENG.sdb ("AURORA 16086" @4294957742) + all 8 extended writers (newId=16086) → bake (FTribTool 9.3 `--encrypt-header`) → stage BOM-free manifest → owner tests. [CONT21 §01:40]
- SNME `mods\manifest.json` was `cakOrder: []` at the 01:40 snapshot (no mod active; re-stage when next test CAK ready); test10.cak present but unlisted. v1.23 restored to `test5b.cak`. [CONT21]
- 2K20 milestone: real 2K19→2K20 conversion + read-back verified; 120/120 source-tool tests (2026-09-14); 2K20 bridge re-verified genuine 2026-09-17 (not a silent copy; emits bounded 62-track subset of the 706,272 B reference section). [COMPLETE-CONTINUATION-PROMPT; LOG2K19-2K20]
- 2K25/2K26 `.clips` semantic writer still missing; no verified in-game converted motion from the codec path; new-entry registration path partially proven (entries appear + play with correct registration). [COMPLETE-CONTINUATION-PROMPT; CONT21]
- v1.23-era test facts (invalid for SNME, keep for reference): test6 entry 16186 showed CHRIS SABIN; test7 replaced stock 852.clips → still CHRIS SABIN; test8 1-byte broken 852.clips → no crash. [CONT21]
- Registration-only vs assets: working Tribute bake ships NO Animation files (registry only); our converter must self-supply clips+adefs. [CONT21 §02:00 #6]
- Loader status: one protected FDIR v9.3 changed-content visual replacement verified (accepted=1 rejected=0 failed=0); exact mod-to-mod virtual-path collision → both rejected; broader precedence Experimental. [CHANGED-CONTENT-OVERRIDE-TEST; LATEST-README]

---

## SOURCE LEGEND (full paths)

- **CONT21** = `C:\AuroraForge-Aug26\AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md`
- **COMPLETE-CONTINUATION-PROMPT** = `C:\AuroraForge-Aug26\AURORA-FORGE-COMPLETE-CONTINUATION-PROMPT-2026-09-13.md`
- **KBHANDOFF** = `...\AuroraForge_WWE_PC-Game_Modding_Tool\Aurora-Forge-Knowledgebase\handoffs\CHATGPT-WEB-AURORA-FORGE-HANDOFF-2026-09-07.md` (identical copy at `_worktrees\knowledgebase-override-status\handoffs\...`)
- **ENTRANCE_EXPORTER_FINDINGS** = `...\WWE2K19-to-2K26-Entrance-Prototype\ENTRANCE_EXPORTER_FINDINGS.md`
- **LOG2K19-2K20** = `...\WWE2K19-to-2K26-Entrance-Prototype\notes\LOG-2K19-2K20-BRIDGE.md`
- **CURRENT-STATUS** = `...\WWE2K19-to-2K26-Entrance-Prototype\CURRENT-STATUS-AND-REPOSITORY-CAPABILITIES.md`
- **PIPELINE_ARCHITECTURE** = `...\WWE2K19-to-2K26-Entrance-Prototype\PIPELINE_ARCHITECTURE.md`
- **ANIM-PROBES** = `C:\AuroraForge-Aug26\Aurora Forge Sept 20\Aurora-Forge-Animation-Probes\README.md`
- **2K19-2K20-CONVERTER README** = `C:\AuroraForge-Aug26\Aurora Forge Sept 20\Aurora-Forge-2K19-to-2K20-Converter\README.md` (+ `docs\BATCH-2K19-TO-2K20-VICTORY-PACKAGES.md`)
- **CHANGED-CONTENT-OVERRIDE-TEST** = `C:\AuroraForge-Aug26\_worktrees\cak-mod-loader-override\docs\CHANGED-CONTENT-OVERRIDE-TEST.md`
- **RELEASE-NOTES-1.0.01-RC1** = `C:\AuroraForge-Aug26\_worktrees\cak-mod-loader-override\docs\RELEASE-NOTES-1.0.01-RC1.md`
- **ARCHITECTURE** = `C:\AuroraForge-Aug26\Aurora Forge Sept 20\Secure-DataCtrlLink-WWE2K26\docs\ARCHITECTURE.md`; **SECURITY** = `...\Secure-DataCtrlLink-WWE2K26\SECURITY.md`
- **BUGS-AND-FIXES-1.7.7** = `...\DataCtrlLink-MusicOnly\docs\BUGS-AND-FIXES-1.7.7.md`; **EXPLAIN-LIKE-IM-FIVE** = `...\docs\EXPLAIN-LIKE-IM-FIVE.md`
- **CAK_FOUNDRY_RELEASE_NOTES_1.7.7** = `...\Aurora-CAK-Foundry\package-tests\resolved-folder-final-20260906-2320\asar-audit\CAK_FOUNDRY_RELEASE_NOTES_1.7.7.md`; **INSTALLATION_AND_ROLLBACK** = same dir
- **ACF v1.7.7 bug report** = `...\Aurora-CAK-Foundry\build\clean-package-test-v1.7.7-redesign\AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md`
- **FUTURE_IDEAS** = `C:\AuroraForge-Aug26\_archive\handoffs\Secure-DataCtrlLink-Handoff-2026-08-31\FUTURE_IDEAS.md`
- **OVERNIGHT** = `C:\AuroraForge-Aug26\AURORA-FORGE-OVERNIGHT-PROGRESS-2026-09-06.md`
- **LATEST-README** = `C:\AuroraForge-Aug26\latest\Aurora-Forge-CAK-Mod-Loader-WWE2K25\README.md`
- **CAKEVIEW_BUILD_VERIFICATION** = `C:\AuroraForge-Aug26\examples\MyGM-StartingCash-50M\analysis\CAKEVIEW_BUILD_VERIFICATION.md`
- **WRESTLEMINUS** = `C:\AuroraForge-Aug26\_work\external-sources\WrestleMINUS\README.md`
- **2K19-PAC-Tools README** = `C:\AuroraForge-Aug26\_archive\workspace-consolidation-2026-09-20\duplicate-repo-copies\standalone-repos\Aurora-Forge-2K19-PAC-Tools\README.md`
- **BNKEXTR** = `...\DataCtrlLink-MusicOnly\third_party_reference\bnkextr\README.md`; **WWISER-UTILS**/**WORDS** = `...\wwiser-utils\README.md`, `...\wwiser-utils\words\README.md`; **EDITOR** = `...\wwiser\doc\EDITOR.md`
- **GHIDRA GettingStarted** = `C:\AuroraForge-Aug26\.tools\ghidra_12.1.3_PUBLIC\docs\GettingStarted.md`
- **WORKSPACE-CLEANUP-REPORT** = `C:\AuroraForge-Aug26\WORKSPACE-CLEANUP-REPORT.md`
- **VERSIONING-AUDIT** = `...\WWE2K19-to-2K26-Entrance-Prototype\docs\VERSIONING-AUDIT-2026-09-14.md`

### Batch-5 files with no project-relevant content (read, nothing extracted)
Ghidra 12.1.3 docs/readmes (16 one-liners + GettingStarted + Debugger B5 + GhidraDev + PyGhidra + SwiftDemangler + TaintAnalysis), `ghidra-nativeaot\LICENSE.md`, `Aurora-Forge-1.6.0-prompt-workspace\FAQ.md` (prompt-builder FAQ), `Aurora-Forge-Converter-App` README + PATREON_ACCESS, `Aurora-Forge-Patreon-Verifier\README.md`, `Aurora-Forge-Knowledgebase\...` duplicate handoff (identical to KBHANDOFF), duplicate ACF v1.7.7 bug report + v1.7.5 release notes in `local-release-archive`, duplicate Secure-DataCtrlLink FAQ/security copies (provenance-only), `SOURCE-SEPARATION-BUGS-AND-FIXES.md` (ACF-SEP-001/002 build-script fixes), `EVIDENCE-AND-RESEARCH-STATE.md` (knowledgebase coverage metadata: 18 subjects/34 sources/33 facts/6 unknowns; Clips Editor "not confirmed end to end"; permanent unknown boundaries).

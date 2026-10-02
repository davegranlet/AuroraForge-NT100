# Batch 3 Notes — Animation/Entry/CAK/Loader Evidence
Source: 77 files listed in `_md-search\batch-3.txt`, read in full. All citations are file paths; facts not evidenced in this batch are marked NOT-EVIDENCED-HERE.

---

# ANSWERS TO THE 10 QUESTIONS

## Q1 — Which row to clone as template for new entries
- No batch file states a definitive "clone row X in file Y" rule. Nearest evidence:
  - Cloning a Rock template row alone does NOT register: v7 test "full visible Rock-template clone loaded; `Draven` absent" (`AuroraForge_WWE_PC-Game_Modding_Tool\kb.md` §Completed tests; same list in Sept18 log).
  - Tribute working recipe (Sept 18, disassembly/log note): "Tribute VictoryListData recipe: 657 vs 661 rows (added 14000-14003 full rows, removed 7, rehashed strings, motions untouched)" (`AuroraForge_WWE_PC-Game_Modding_Tool\Sept18th-2026\RESEARCH-LOG.md`).
  - Additive 9790 test patched `Roster\CharProfilePro.jsfb` Rock 3 rows (6x u32 `6100`→`9790`, owner-guarded `id=100` + B-pair `8701/8703`; the second 6100 group (9100-pair, other owner) left untouched) (`Sept18th-2026\RESEARCH-LOG.md`).
  - v8 test: "current record-ID-1 `test4` patch, including protected CakeView rebuild, loaded but left `DIRE INTENTIONS` unchanged" (`kb.md` §Completed tests).
  - 2026-09-22 update: new entrance/victory registry rows DO appear in-game once mounted on the boot thread (CAE template list showed new `BOB ENTRANCE A/B/C`, verified on 2K25 v1.23 + SNME) (`kb.md` LATEST). So earlier row-clone failures were mount-timing, not row shape; row cloning must be re-validated after the loader fix.
- NOT-EVIDENCED-HERE: exact `EntranceListData` row to clone; exact `VictoryListData` row chosen by Tribute beyond "record-ID-1".

## Q2 — Files that MUST be written for a new entry to appear + play
- Working oracle `moddedbake.cak` (719,349,803 bytes, SHA-256 `5CCA6AFB6BC1948910C608CA2F7A9037CD6F0092EEB6571E71086CD0D9CCB53B`) contains all nine known entrance/victory dependency files: `Entrances\EntranceListData.jsfb`, `Entrances\VictoryListData.jsfb`, `MoveData\CAMMoveData.jsfb`, `Roster\CharMoveSetDataTable.jsfb`, `Roster\CharProfilePro.jsfb`, `Roster\CharProfileTable.jsfb`, `Roster\FaceTextures.jsfb`, `Sdb\ENG.sdb`, `Hide\HideCtrlData.hidelink.jsfb`; it contains NO `Animation/*.clips` or `.adefs`. Authoritative registration/dependency base (`kb.md`).
- Registration JSFBs are read by the game **at boot**: `Entrances/EntranceListData`, `Entrances/VictoryListData`, `Cutscene/CutsceneNoRegistry`, `Sdb/ENG.sdb`; replacements (`.dds`/`.clips`) are read on demand (`kb.md` LATEST).
- Minimal tested new-entry set (5 files): `aurora-14000-testv102g.cak` = "14000.clips/adefs + the 3 tables" (`WWE2K19-to-2K26-Entrance-Prototype\notes\HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`). Names of the 3 tables not spelled out there; the tribute-bake it mirrors contains `Entrances/VictoryListData.jsfb`, `Cutscene/CutsceneNoRegistry.jsfb`, `Sdb/ENG.sdb`.
- Picker-proven archive via Cakehook 2.7.1: `mods\tribute-bake-test-sept19.cak` 33,442,675 bytes SHA-256 `CA5E5F6C229F268CCFB12D2E612E433FF19121946AFA79372585DFD48279100F` (129 files per CakeTool catalog; contains `Entrances/VictoryListData.jsfb`, `Cutscene/CutsceneNoRegistry.jsfb`, `Sdb/ENG.sdb`, plus `Animation` entries); user saw `Testing 2`/`Testing1` in the T section of the motion/template picker (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- Editor save delta is NOT the runtime dependency set: a Victory-only TRIBUTE save changes only `VictoryListData.jsfb` + `ENG.sdb`; an Entrance-only save changes only `EntranceListData.jsfb` + `ENG.sdb` (`kb.md`). The exact 2-file TRIBUTE oracle (v9) loaded but showed none of `test4/test5/test6` → two changed files alone are insufficient (`kb.md`).
- For playback the new animation must exist as new virtual assets: `Animation/<Type>/<id>.clips` + `<id>.adefs` (6104 probe; `TRAE_CONTINUATION_HANDOFF.md`; `AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).

## Q3 — Name/string id scheme (SDB ids, negative ids, hashes)
- CAK catalog identity hash = **lowercase FNV-1a 64 over the full virtual path**: stock 2K20 `Animation/Victory/6100.acts` hash `ba178c342231f94f` == our mod file's hash; texture `head_color.tex` hash `687e20fd45549500` == stock exact (`Sept18th-2026\RESEARCH-LOG.md`).
- Modern `.clips` track identifiers are FNV-1a 64-bit hashes (`TRAE_CONTINUATION_HANDOFF.md`).
- Target-only 2K25 6100 track ids: `0x11558A1746547CA2` and `0x1F4DA262FC146772` (indices 62/63); first 62 target track ids correspond in order to the 62 source pair indices (`kb.md` mapping update).
- Animation id is the FILENAME, not file content: `6100.acts` carries zero internal id refs; 2K20 `.evd` id lives at `u16@0` only (`Sept18th-2026\RESEARCH-LOG.md`).
- CAK archive key is derived from the CAK filename (FDIR 9.9 and 9.3) → never rename a finished CAK; rebuild under the final name (`DataCtrlLink-MusicOnly\release\Secure-DataCtrlLink-WWE2K26-1.0.0-provenance-check\README.md`, `Aurora-CAK-Foundry\docs\AURORA_CAK_FOUNDRY_v1.7.7_FIX_REPORT.md`).
- String table = `Sdb\ENG.sdb`; Tribute recipe "rehashed strings"; the v9 oracle used exact TRIBUTE `ENG.sdb` 6,778,544 bytes SHA-256 `79493C67DDCE7895F07194F260138724607134A412090AF26A769216BCE44BB2` (`kb.md`).
- Wwise event/variable name→number is FNV-based and reversible with `wwnames.txt`/`fnv.exe`/`words.py` (`DataCtrlLink-MusicOnly\third_party_reference\wwiser-utils\doc\NAMES.md`).
- NOT-EVIDENCED-HERE: negative SDB ids; exact SDB record layout for new entries.

## Q4 — CAMMoveData (`MoveData/CAMMoveData.jsfb`) role/values
- Role: one of the nine registration/dependency files; TRIBUTE BakeMe `MoveData\CAMMoveData.jsfb` is byte-identical to `CAMDataRestore.dat` in TRIBUTE v1.8 BakeMe and to the historical package baseline (`kb.md` provenance confirmation).
- Hashes: stock `5DFDB55FB5166F44A98E9120245F6F4298CD661DDD4C60A0DC66FF3769D5FCC7`; shared TRIBUTE `61530A958F40E50C185320B02FB8D36C21CD6F0586A8A167A0E6D748A454F4B0` (`kb.md` nine-file table).
- Field-level values for a new motion entry: NOT-EVIDENCED-HERE. Treat any row-field plan as unverified.

## Q5 — New-entry id numbering rules
- Verified free 2K25 Victory slots: `6104` (unused; chosen for bounded new-asset test; "must be a NEW virtual asset pair, not a replacement for stock 6100") (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`; `LOCAL-ONLY-CHATGPT-WEB-PATHS-2026-09-07.md`); `9790` (no acts/evd/timeline anywhere) (`Sept18th-2026\RESEARCH-LOG.md`).
- New VictoryListData rows used by Tribute: `14000–14003` (`Sept18th-2026\RESEARCH-LOG.md`); "additive `TEST 14000` registration and picker preview" is listed as Not Yet Proven in converter Beta1.0.0c (`Aurora-Forge-Converter-Releases\RELEASE_NOTES_Beta1.0.0c.md`).
- Never copy slot numbers across games: 2K22 stock = 00–08 (next 09); 2K20 stock = 00–05 (next 06) (`Sept18th-2026\RESEARCH-LOG.md`).
- A NEW id requires victory/entrance list registration to load; an unregistered new ID risks a silent nothing-observable test (`Sept18th-2026\RESEARCH-LOG.md`).
- CAK slot mapping (loader-internal): arbitrary `mods\*.cak` filename mapped to internal `bakedfileNN.cak`, index search from 80 upward skipping used; index gate 6–99; 100 is stock and excluded (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- 2K25 SNME current game Victory templates include newer IDs absent from older TRIBUTE: `1382, 1391, 1393, 1397, 1398, 1399, 1402` (`kb.md`).

## Q6 — EntranceListData row field values for new entries
- NOT-EVIDENCED-HERE at field level. Evidenced around it:
  - Entrance-only TRIBUTE save changes only `Entrances\EntranceListData.jsfb` + `Sdb\ENG.sdb` (`kb.md`).
  - Stock SHA-256 `6C9F40FC4A1D2329659746D44FE9445EFBCFE3F104F3B388575472870F6FADE0`; shared TRIBUTE SHA-256 `001AF09D9E69AA4234EEDF43B21C83AF63BBC3846E64177211B462F149A74F68` (`kb.md`).
  - Rock entrance `100` source phases structurally correspond to target advanced pairs `1000100`, `1100100`, `1200100`, `1300100`, `1400100`; WWE 2K25 `Animation\Entrance\100.clips` contains exactly the same 35 clip payloads, reordered/partitioned 5/5/5/9/11 (`TRAE_CONTINUATION_HANDOFF.md`).
  - New `BOB ENTRANCE A/B/C` rows appeared in the Create-An-Entrance template list after the 2026-09-22 boot-thread mount fix (`kb.md`).
  - Partial-section rebuild (v5) "loaded but lost metadata"; graph-preserving control (v6) left `Draven` absent (`kb.md` §Completed tests).

## Q7 — VictoryListData vs EntranceListData
- They are separate tables in `Entrances\`, with separate editor save deltas (Q2/Q6) (`kb.md`).
- Tribute `VictoryListData.jsfb`: 33,024 bytes SHA-256 `1CCE4093A8E8D9DC9551299E229EBFCA6CBF3CADAF40B2A21B523FD85EFE074C` (v9 oracle) (`kb.md`); recipe = 657→661 rows, added 14000–14003, removed 7, strings rehashed, motions untouched (`Sept18th-2026\RESEARCH-LOG.md`).
- Stock vs TRIBUTE `VictoryListData` hashes: stock `032CC27F5905BFAEC3A1A59BF7EFE884DDDEE23C4EF4DA92124F1E86752331D7`; TRIBUTE `1B430C41B050E5027D3D9BB790F745388DEC3F8A71C4E5FD35BC775409991EE8` (`kb.md`).
- `VictoryListData` has "record-ID-1" patch semantics (v8 `test4` patch loaded but `DIRE INTENTIONS` unchanged) (`kb.md`).
- Current-game templates include newer IDs absent from old TRIBUTE (list in Q5) → never replace current lists with a whole historical TRIBUTE list (`kb.md`).
- 2K20 note: no victory list/.adefs found in 2K20; victory pairs live in `CharProfilePro.jsfb` (Rock `[6100,6100]` + `[8701,8703]` @ `id=100`); 2K22 VictoryListData location still open at the time (`Sept18th-2026\RESEARCH-LOG.md`).

## Q8 — How animation files are registered
- New virtual asset pair per id: `Animation\<Type>\<id>.clips` + `<id>.adefs` (Victory 6104 example; probe at `C:\Games\2k25-extracts\probe-6104` holds 19 exported definitions + 16 exported clip payloads from Animation Editor / Clips Editor) (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`; `LOCAL-ONLY-CHATGPT-WEB-PATHS-2026-09-07.md`).
- `.clips` format: 0x18-byte file header; 16-byte table entries {identifier, payload length, payload offset}; clip payload = fixed 0xA0-byte header + five bounded sections; track identifiers begin at payload offset `0xA0`; size equation validated on 120 clips (all 35 Rock entrance + 85 target clips); large `group90` tail is a packed keyframe stream, NOT `{frame,float}` (`TRAE_CONTINUATION_HANDOFF.md`).
- `.adefs` wrapper for 2K25 Victory 6100 is ZLIB (`78 DA`), not Oodle (`TRAE_CONTINUATION_HANDOFF.md`).
- CaeAdvanced phase ids for Rock entrance 100: `1000100`–`1400100` (five `.adefs/.clips` pairs, byte-identical between 2K25 and 2K26 extracts); `Animation\Entrance\100.clips` merges those 35 payloads (`TRAE_CONTINUATION_HANDOFF.md`).
- `Cutscene/CutsceneNoRegistry.jsfb` is a boot-read registration JSFB (must ship in the mod CAK) (`kb.md`; `HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- Motion/roster tables: `MoveData/CAMMoveData.jsfb`, `Roster/CharMoveSetDataTable.jsfb`, `Roster/CharProfilePro.jsfb`, `Roster/CharProfileTable.jsfb`, `Roster/FaceTextures.jsfb`, `Hide/HideCtrlData.hidelink.jsfb` (nine-file set, Q2). `HideCtrlData.hidelink.jsfb` is an addon-character **unlock** table, single-winner (newest mounted copy applies); NOT the cause of missing entrance/victory rows (`kb.md` LATEST).
- 2K20 mechanics (for reference): loose `Animation\Victory\6100.acts/.evd` on disk are IGNORED (no disk-first loading); global registry is `AnimSystem\ratanim.bin` + `filters\` (.bin, not .adefs) (`Sept18th-2026\RESEARCH-LOG.md`).
- 2K22: `Animation\Victory\6100.acts` = 393,244-byte AMYM with 16 TBUF/ANIM v10 blocks (15×3-channel + 1×6-channel); 2K23 `.anims` block 15 only byte-identical (`WWE2K19-to-2K26-Entrance-Prototype\notes\2026-09-12-direct-codec-paused-handoff.md`).

## Q9 — Which tool/flow builds the CAK for a new entry
- Foundry v1.7.9.b CLI: `npm run bake:v93 -- --source <folder> --output <file>` (headless FDIR 9.3 bake; same Bakery backend + byte-for-byte verification as desktop; optional `--tool`, `--oodle`) (`Aurora-CAK-Foundry\docs\CAK_FOUNDRY_RELEASE_NOTES_1.7.9.b.md`).
- Direct CakeTool command used in practice: `CakeTool.exe pack -i <dir> -v 9.3 -o <out> --encrypt-header` (requires `oo2core_9_win64.dll` beside exe; binary from Foundry's `resources\app.asar.unpacked\app\tools\cak-v93\`) (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- Foundry GUI: extract → stage only modified files preserving paths below `/root` → pick WWE 2K25/2K26 profile → build new output CAK → Foundry reopens + byte-verifies (`Aurora-CAK-Foundry\build\standalone-cak\INSTALLATION_AND_ROLLBACK.md`).
- Converter Beta1.0.0c ships "Loader-ready replacement CAK output through Aurora CAK Foundry", "WWE 2K25 Test Deployment and CAK Manager" (installs verified Aurora loader pair, isolates one test CAK, enable/disable/order, restores recorded baseline), headless `npm run test-manager` CLI (`Aurora-Forge-Converter-Releases\RELEASE_NOTES_Beta1.0.0c.md`).
- 2K20: our v6.8 packer produced game-mountable `bakedfile06.cak` (450,136B) — loader work for 2K20 declared COMPLETE (`Sept18th-2026\RESEARCH-LOG.md`). 2K22 v8.3 baking is delegated to external `CakeTools v098a` (`Sept18th-2026\RESEARCH-LOG.md`).
- 2K25 v9.3 rules: protected catalog tied to final filename; protected header + declared sections + scrambled strings + plaintext CRCs (`Aurora-CAK-Foundry\docs\AURORA_CAK_FOUNDRY_v1.7.7_FIX_REPORT.md`, `_worktrees\foundry-v93-verify\build\standalone-cak\AURORA_CAK_FOUNDRY_v1.7.8_FIX_REPORT.md`).

## Q10 — Intended end-to-end user flow (import 2K19 → convert → entry → CAK → game)
1. **Import/extract 2K19**: `pac\evt\<id>.pac` (e.g. `06100.pac` Rock Victory; `00100.pac` Rock entrance). Decode container; use decoded body `*_entry_0_(ZLIB).bin` (camera = `*_entry_1_(ZLIB).bin`) (`WWE2K19-to-2K26-Entrance-Prototype\docs\DISCORD-2K19-TO-2K20-CONVERTER-MULTIPOST.md`; `AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).
2. **Convert**: current proven stage is the bounded 2K19→2K20 bridge `convert-yanm19-to-yanm20.js` (defaults: source section `0`, 2K20 YANM offset `37212`; verified 6100 output 174,976 bytes / 63 records / 62 tracks, all with two streams) (`DISCORD-2K19-TO-2K20-CONVERTER-MULTIPOST.md`; `notes\2026-09-12-direct-codec-paused-handoff.md`). Modern 2K25 `.clips` semantic keyframe writer is the remaining blocker (`kb.md`; `TRAE_CONTINUATION_HANDOFF.md`).
3. **Create entry**: new id under a new namespace (e.g. Victory `6104` or `14000`), produce `<id>.clips` + `<id>.adefs` and the registration JSFB set; use Animation Editor / Clips Editor exports for bounded probe (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).
4. **Edit fields**: registration lists (VictoryListData/EntranceListData), SDB strings, CharProfilePro pairs, CAMMoveData etc. (`kb.md`).
5. **CAK**: bake with Foundry v9.3 (or converter's Foundry path) under the intended final filename (`CAK_FOUNDRY_RELEASE_NOTES_1.7.9.b.md`; `INSTALLATION_AND_ROLLBACK.md`).
6. **Game**: copy CAK to `<game>\mods\`, ensure `mods\manifest.json` `cakOrder` names it, loader = Secure DataCtrlLink `dinput8.dll` + `AuroraForge.CAKModLoader.ftrib`; launch; verify row appears in Create-An-Entrance/motion picker and plays (`kb.md`; `HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`). Converter Beta1.0.0c additionally provides a test-manager that installs the verified loader pair + isolates one test CAK and can restore baseline (`RELEASE_NOTES_Beta1.0.0c.md`).
- **Loader requirement (2026-09-22, solved)**: hook the game's mount function and inject the mod CAK from inside the game's own boot archive sequence on the boot thread, right after the low `bakedfileNN` mounts; do NOT wait for the window; do NOT hook `phase_rva` (`kb.md` LATEST).

---

# LOADER (2K25) — SOLVED 2026-09-22
- Mount ABI (verified live v1.23 + CakeHook Frida capture): `bool(const CakPathView* path, void*, uint32 origin, uint32 index)` with `CakPathView = { const char* data; size_t length; }`. Mods: `(absPath, nullptr, 2, 1)`. Stock boot: `(relative "bakedfileNN.cak", nullptr, 0, index)`. ResourceSync: `(…, 1, -2)` (`kb.md`).
- Verified solved loader pair: core `E600D04F2E1A9AF3C23A358462E8B5C25064D6C08411819377E278581EF0ED2F`; addon `8DF85F88EF117CAE07D9BA3788AB255C5986E3E460F905EDAB7C5972918E3E33` ("boot mount-injection") (`kb.md`).
- Profiles: v1.23 `mount 0x2DFDA0 / sig 0x2DFEAD / phase 0x2DFF50`; SNME `mount 0x2E03F0 / sig 0x2E04FD / phase 0x2E05A0`. Mount signature `40 46 74 3e 72 ff 48 85 c0 48 0f 44`; correct v1.23 phase prologue `48 89 5c 24 08 48 89 6c 24 10 48 89 74 24 18 57` (the `…10…18…56 57 41 55 41 56` variant is wrong) (`kb.md`).
- SNME exe SHA-256 `c6bc0459d4d29667c9e8f1dcaca013ae4691d615e4c79d069ad272f70e2cee01` (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- Root cause of prior failures: mod mounted too late (window thread ~+8s); game reads registration JSFBs at boot. CakeHook changelog names the same bug: "mods loaded too late in startup which resulted in character, arena, etc. JSFB's not registering." (`kb.md`).
- Corrections to prior notes: "worker-thread mounts crash" and "window mount is too late" were symptoms of wrong call/timing, not fundamentals (`kb.md` LATEST).
- Prior working baseline pair (pre-fix, texture override proven): core `92C26247BCF9EC1F799D489BF1027C2314730AE2E2928C61962050410F44DD15` + addon `B8C8A7A9ABD4F07EC7915279074C0B33A3C6059D42479AA83A09E4A9D8FF3F19`; restored to game 09-19; do not rebuild loader unless task is loader work (`WWE2K19-to-2K26-Entrance-Prototype\notes\AUDIT-2026-09-19-WORKSPACE-CODE.md`).
- Foundry-bundled v1.23 pair: `FC0771822612DC5F05A446BBE27DBB24A7ADF6D9072802C9D9F181D4088B1D82` + `84089A2CE223E08F9FDBB4D9F4742D2A4829A9615501347968B25F279E5661DB` (canonical product pair; SDCL regression test expects this ftrib hash) (`AUDIT-2026-09-19-WORKSPACE-CODE.md`; `kb.md`).
- SAFE-FALLBACK pair staged 09-19 pre-fix: core `0BE398DA94F2913F05DAA3082DACE0803DB0CEE1BB25EC91D194E088D57BC563`; addon `2AA4C21D8CDFD814136D12298D0BDAB86541E1F2DCF1047BD988A087EACFF3F7` (window-thread fallback mount only; early/runtime pre-window gates default 0) (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- PWM CakeHook 2.7.1 reference: `dinput8.dll` 75,264 bytes SHA-256 `D9D398B76C6745052FEDF6617C0B12E4469442BD38A33B5ABBEEBAD2E7F20469`; `.dlp` plugins are PLGN container (`50 4C 47 4E`), manually mapped, not PE (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`; `kb.md`).
- Loader process rule: after ANY addon rebuild → (a) compute SHA-256, (b) prepend `{product, "AuroraForge.CAKModLoader.ftrib", "<hash>"}` to `kApprovedAddons` + bump array size, (c) update `tests\addon_registry_tests.cpp` first-entry pin, (d) rebuild core, (e) run core tests, (f) stage BOTH files, (g) verify staged hashes == build hashes (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- `plugins\addons.txt` semantics: absent → core tries EVERY registry entry against the one ftrib file, logs REJECTED for non-matching (noise normal), first matching entry wins; present → only listed addons load, malformed/unknown/duplicate/>64 lines ⇒ all addon loading stops (`DataCtrlLink-MusicOnly\docs\ADDON-MANAGEMENT.md`).
- Mount-detour alternative (if ever needed): music-loader pattern waits on a game global via ordinal resolver vtable[4] AddPackage; sound ordinals 351/129/137/327/73 (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).

# CAK FORMAT / FOUNDRY
- FDIR versions: 2K25 = 9.3; 2K26 = 9.9; 2K20 stock prefix `46 44 49 52 06 08 01 C0` (v6.8, flags `01 C0`); 2K22 = v8.3 header `46 44 49 52 08 03 01 C0` (`Sept18th-2026\RESEARCH-LOG.md`; `kb.md`; `Aurora-CAK-Foundry\...\AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md`).
- v9.3 protected writer: protected header + declared catalog sections + scrambled catalog strings + filename-derived key + encrypted-header flag + plaintext section CRCs; alignment padding excluded from checksum (`Aurora-CAK-Foundry\docs\AURORA_CAK_FOUNDRY_v1.7.7_FIX_REPORT.md`; `_worktrees\foundry-v93-verify\build\standalone-cak\AURORA_CAK_FOUNDRY_v1.7.8_BUG_REPORT.md`).
- v9.9 key derived from final `.cak` filename; do not rename (`DataCtrlLink-MusicOnly\release\Secure-DataCtrlLink-WWE2K26-1.0.0-provenance-check\README.md`).
- Foundry v1.7.8 verification: full 2,004-file `bakedfile80` rebuild reopened byte-for-byte (2,004 files / 1,137 folders); protected test CAK 2,214,802,300 bytes SHA-256 `DA50A25904803B002864B69BCF0033A76974CEA5F91CE95E4E344441C63B0818`; WWE 2K25 v1.23 mount returned `true` (`Aurora-CAK-Foundry\docs\AURORA_CAK_FOUNDRY_v1.7.7_FIX_REPORT.md`; `_worktrees\foundry-v93-verify\build\standalone-cak\AURORA_CAK_FOUNDRY_v1.7.8_FIX_REPORT.md`).
- Foundry status v1.7.9.b: Ready for 2K25 (SNME + v1.23) catalog/name recovery, extraction, protected rebuild, mount acceptance, one protected changed-content visual replacement; 2K26 local extraction + protected baking (`Aurora-CAK-Foundry\README.md`, `latest\Aurora-CAK-Foundry\README.md`).
- 2K26 September update: `bakedfile03.cak` 1,687 and `bakedfile100.cak` 173 named catalog payloads outside physical archive byte ranges; recover only from exact-size companion extraction; zero-offset refs/short placeholders rejected (`AURORA-FORGE-PROJECT-STATUS.md`; `CAK_FOUNDRY_RELEASE_NOTES_1.7.8.md`).
- 2K26 name coverage v1.16: 412,095/412,095 payloads named, 279 metadata references (`Aurora-CAK-Foundry\docs\AURORA_CAK_FOUNDRY_v1.7.7_FIX_REPORT.md`).
- 2K26 Movies recovered paths incl. `Movies/Arena/WRESTLEMANIA_42_N1`, `_N2`, `Movies/SS/CAEV_JEFFHARDY1_2026`; FNV-1a 64 hash verification (`_worktrees\foundry-v93-verify\docs\AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md`).
- Foundry bookkeeping files (`.aurora-cak-manifest.json`, `Aurora_Forge_Extraction_Report.txt`, `.aurora-cak-external-references.json`) must be excluded from rebuilds (`AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md`).
- Foundry/2K25 uses Nenkai Bakery (MIT) pinned commit `f704d37` as isolated compatibility backend; ADR-0001 keeps it isolated pending clean-room writer (`Aurora-CAK-Foundry\app\tools\cak-v93\AURORA-INTEGRATION-NOTICE.md`; `Aurora-CAK-Foundry\docs\ADR-0001-FDIR93-writer-provenance.md`).
- 2K20 FDIR v8.x key = FNV1a-64 name-based + XOR deobfuscation (different from v9.x stateful block cipher); v8.3 cipher port remains broken/passthrough (`Sept18th-2026\RESEARCH-LOG.md`).

# ANIMATION CONVERSION — STATE
- 2K19 source (Rock Victory): `pac\evt\06100.pac`; decoded body `0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`; 16 YANM motions; source body = 62 channels; align in order with first 62 of 64 target tracks; 7/7 resolved joint names agree; target appends 2 tracks (`TRAE_CONTINUATION_HANDOFF.md`; `AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).
- 2K19 Rock entrance: `pac\evt\00100.pac`; five phases → target pairs `1000100`–`1400100`; partition tool `tools\build_2k25_entrance_partition_map.js`; report `analysis\2k25-entrance-100-partition-map.json`; crosswalk `analysis\rock-five-segments\100-to-1000100-crosswalk.json` (`TRAE_CONTINUATION_HANDOFF.md`).
- 2K25 Victory 6100: `.adefs/.clips` byte-identical between 2K25 and 2K26 extracts; `.adefs` wrapper ZLIB (`78 DA`); target `6100.clips` 17 records; 12 auxiliary clips vs 12 source; target facial = 2 records vs 1 source (`TRAE_CONTINUATION_HANDOFF.md`).
- Champion Rock `09100.pac`: 17 YANMs (2 body/facial phases + 16-record prop/prelude w/ 12-byte preamble); target `9100.clips` 16 clips; embedded defs `250009100_A00_def`, `250069100_A06_def`, `250079100_A07_def`, `250109100_A10_def`, `250129100_A12_def`; `scripts\analyze-2k19-motion.js` supports 12-byte-preamble YANM (all 15 child files pass) (`TRAE_CONTINUATION_HANDOFF.md`).
- Group90 (2K25 6100): body record `0xA57FCBAB77BC9BD5` 122,808/122,808 bytes; camera `0xC2E6DE4A51C9AEDD` 41,072/41,072 bytes; rebuilt `6100.clips` SHA-256 `5C60C424A90C9C2199EF5F3A30B1F790E05FB0979C03BAE5C8E8CEACE89AFDB6` identical to source; valid ULEB128 tokens 20/20/84/22 bytes; bounded limit 5,000 iterations; "second non-ULEB codec" claim false (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).
- Group90 encoder milestone: `tools\group90-encoder.js` (BigInt ULEB128 + token stream encode/decode) and `tools\group90-entries.js` (fixed 64-bit entry read/write); entry-preserving rewrite of stock `Animation\Victory\6100.clips` reproduced the original 448,304-byte file byte-for-byte; record 15 has 6 descriptor slots/track and 15,351 fixed Group90 entries (`kb.md`).
- 2K19→2K20 bridge verified: output 174,976 bytes, 63 records, 62 motion tracks (all 0x2100 tracks two streams); sentinel true; defaults `--from 19 --to 20`, source section 0, YANM20 offset 37212 (`DISCORD-2K19-TO-2K20-CONVERTER-MULTIPOST.md`; `notes\2026-09-12-direct-codec-paused-handoff.md`).
- 2K20 package builder: `D:\AuroraForge-Aug26\_work\2k20-package-6100` (Root\Animation\Victory\6100.acts 429,196B + 6100.evd 20,610B); blocked by design until EVD event body indices 0,19,20,21,22,23 modeled; 33 focused event/package tests pass (`kb.md` 2026-09-14).
- Batch package builder: `tools\batch-2k19-to-2k20-victory-packages.js` (folder mode + manifest mode; outputs `Root\Animation\Victory\<id>.acts/.evd` + `_intermediate\<id>.yanm20.bin`; EVD event-body conversion proven only for Victory 6100 shape) (`WWE2K19-to-2K26-Entrance-Prototype\docs\BATCH-2K19-TO-2K20-VICTORY-PACKAGES.md`).
- Immediate blocker (per handoffs): payload quantization + valid 2K19 Opcode 0 boundaries + timing field 2420→1755; J_Hips `0xF91A7A26` big-endian floats extraction experiment; "nine tracks × seven bits" and "bits 7–13 = J_Hips" are UNVERIFIED (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`; `kb.md`).
- Controlled-pair blocker: `record1_original.clip` 9,920 bytes SHA-256 `7D2C215C36A57A8A8FB62C89DD57F4ABE455AE9E393DADCFB16F2A678D5B49D7` exists; no editor-generated nonzero-Group90 counterpart → cannot measure modern Group90 change semantics (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`; `kb.md`).
- 2K22→2K23 boundary: `tools\convert-acts22-to-anims23.js` is only an equal-size TBUF copier, NOT a converter; 2K22/2K23 ADEF payloads differ 45,208 vs 51,239 bytes; 49 printable identifiers overlap (`notes\2026-09-12-direct-codec-paused-handoff.md`).
- Codec suite state 09-12: 64 tests passed 0 failed; batch-1 `tools/clips-codec/` split modules + integration/registry tests V1+V2 pass; builder return-value fix commit `66fccdd` (`kb.md`; `AUDIT-2026-09-19-WORKSPACE-CODE.md`).
- Converter Beta1.0.0c: focused `.clips`/Group90/registry/pipeline suite 49 passed 0 failed; converter exe SHA-256 `5002D149091041DB791E1AC34BFBD78A3450FC570CD6367203F0EBC67EDDE470`; Not Yet Proven: additive `TEST 14000` registration/picker preview, universal compatibility/fidelity, root/pose/alignment correction, facial conversion (`Aurora-Forge-Converter-Releases\RELEASE_NOTES_Beta1.0.0c.md`).

# REGISTRATION / LIST DATA
- The 9 dependency files + stock/TRIBUTE hashes table (`kb.md`):
  - EntranceListData: stock `6C9F40FC…` / TRIB `001AF09D…`
  - VictoryListData: stock `032CC27F…` / TRIB `1B430C41…`
  - CAMMoveData: stock `5DFDB55F…` / TRIB `61530A95…`
  - CharMoveSetDataTable: stock `CA487B71…` / TRIB `FD501516…`
  - CharProfilePro: stock `F7D3FEB9…` / TRIB `373EFBA5…`
  - CharProfileTable: stock `B697B3ED…` / TRIB `909F3789…`
  - FaceTextures: stock `EA35A907…` / TRIB `CC5C8B05…`
  - ENG.sdb: stock `FDC3063E…` / TRIB `C752E8BD…`
  - HideCtrlData.hidelink.jsfb: stock `94B7CAB6…` / TRIB `0110CFF3…`
- TRIBUTE v1.8 BakeMe is byte-identical to preserved working Designs/Filtered trees for all nine; `CAMDataRestore.dat` == `BakeMe\MoveData\CAMMoveData.jsfb` (`kb.md`).
- Tribute v2.0 ships 322-byte opaque `entVicConfig.dat` next to `TRIBUTE 25.exe` (leading u32=179, high entropy; references `EntVicProfile`, `DefaultEntVic`, `EntranceTemplateEditor`, `VictoryTemplateEditor`); likely persisted editor config, not a CakeView input (`kb.md`).
- Tribute `VictoryListData` recipe (from Sept 18 work): 657→661 rows; added 14000–14003 full rows; removed 7; rehashed strings; motions untouched (`Sept18th-2026\RESEARCH-LOG.md`).
- 2K20 victory registration: `CharProfilePro.jsfb` Rock rows `[6100,6100]` + `[8701,8703]` @ `id=100`; no Vict table/.adefs in 2K20; `.evd` header carries motionId + internal name only, no acts-path refs (`Sept18th-2026\RESEARCH-LOG.md`).
- `Entrances/VictoryListData.jsfb` etc. do NOT appear as separate rows in the stock CSV catalog (`C:\Users\dgran\Desktop\fuckingbots.csv`, 356,918 entries) — they live inside stock CAKs; mod CAKs replacing them are OVERRIDES; `Animation/Victory/14000.clips` is a NEW entry (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).

# TOOL INVENTORY (script paths + purpose)
- `WWE2K19-to-2K26-Entrance-Prototype\tools\convert-yanm19-to-yanm20.js` — 2K19→2K20 bridge writer (62-track bounded).
- `...\tools\group90-encoder.js` — BigInt ULEB128 + token stream encode/decode.
- `...\tools\group90-entries.js` — fixed 64-bit Group90 entry read/write + record replacement.
- `...\tools\clips-codec\` — batch-1 file-per-function modules (`read-bits-at.js`, `decode-uleb128.js`, `width-table.js`, `parse-timing-group.js`, `eval-dense-group.js`, `eval-entropy-group.js`, `entropy-pair.js`, `rot-to-quat.js`, `parse-clips-record.js`, `find-record-table.js`, `bit-writer.js`, `encode-uleb128-token.js`, `encode-dense-group.js`, `copy-bits.js`, `concat-writers.js`) + integration/registry tests (`AUDIT-2026-09-19-WORKSPACE-CODE.md`).
- `...\tools\build-6185.js` (split targets: `resample-keys-catmull-rom.js`, `smooth-column-gaussian.js`, `map-into-band.js`, `fit-descriptor.js`, `encode-track-group.js`, `patch-descriptor.js`, `build-imported-clips.js`), `add-cutscene-entry.js` (`find-cutscene-entry.js`, `append-cutscene-entry.js`) (`AUDIT-2026-09-19-WORKSPACE-CODE.md`).
- `...\tools\yanm20-reader.js` (`decodeSection`), `...\tools\clips-tool` (`compare`), `clip-control-pair` (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).
- `...\tools\build_2k25_entrance_partition_map.js`; `...\tools\build_2k19_2k25_victory_crosswalk.js`; `...\tools\decode_adefs_wrapper.js`; `...\tools\parse_2k25_victory_list.js`; `...\tools\inspect_jsfb_vector.js` (`TRAE_CONTINUATION_HANDOFF.md`).
- `...\tools\batch-2k19-to-2k20-victory-packages.js` — batch package builder (`BATCH-2K19-TO-2K20-VICTORY-PACKAGES.md`).
- `AuroraForge_WWE_PC-Game_Modding_Tool\scripts\analyze-2k19-motion.js` (guarded 12-byte-preamble YANM); `scripts\analyze-2k26-animation-pair.js`; `scripts\extract-2k26-animation-pair.js` (`TRAE_CONTINUATION_HANDOFF.md`).
- Foundry: `npm run bake:v93 -- --source <folder> --output <file>` (`CAK_FOUNDRY_RELEASE_NOTES_1.7.9.b.md`); `CakeTool.exe pack -i <dir> -v 9.3 -o <out> --encrypt-header` (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- Converter Beta1.0.0c: `npm run test-manager` (status/prepare/reset/enable/disable) (`RELEASE_NOTES_Beta1.0.0c.md`).
- External tools: `AnimationEditor.exe`, `adefs_decompressor.exe`, CakeView 1.6.9/1.14, Clips Editor v2.21, CakeTools v098a (2K22 baker), CakeHook 2.7.1 (`TRAE_CONTINUATION_HANDOFF.md`; `LOCAL-ONLY-CHATGPT-WEB-PATHS-2026-09-07.md`).
- 2K19 PAC tools: `app/pac19-explorer.html`, `app/assets/js/pac19-explorer.js`, `tools/AuroraPac19Helper/`, `scripts/build-pac19-helper.js`, `scripts/verify-pac19-helper.js` (uses game's `oo2core_6_win64.dll`) (`REFERENCE-BASE-KNOWLEDGE.md`; `tools\AuroraPac19Helper\THIRD-PARTY-NOTICES.md`).
- 2K20: `electron/cak20-reader.js`, `app/cak20-explorer.html`, `scripts/analyze-cak20-format.js`, `scripts/verify-cak20-reader.js` (FDIR CAK, 284,260 entries across 6 archives) (`REFERENCE-BASE-KNOWLEDGE.md`).
- 2K22 research: `scripts/analyze-2k22-format.js`, `scripts/probe-2k22-header.js`, `app/data/wwe2k22-modding-facts.json` (`WORKTREE-INVENTORY.md`).
- Knowledge/status sources: `AuroraForge_WWE_PC-Game_Modding_Tool\kb.md` (canonical fact base, wins over prototype `knowledge.md` after evidence resolution); `allfiles.md` "CURRENT STATUS LEDGER" + "Track B — SOLVED" (`kb.md`).

# HOUSE RULES
- Never overwrite stock game files or stock CAKs; modded CAKs belong only in `C:\WWE 2K25 Saturday Nights Main Event\mods` (`kb.md`).
- Before every launch verify intended CAK is in `mods` and the manifest names it (`kb.md`).
- Never rename a finished CAK; rebuild under the final name (v9.3 + v9.9 keys are filename-derived) (`AURORA_CAK_FOUNDRY_v1.7.7_FIX_REPORT.md`; `Secure-DataCtrlLink-WWE2K26 README`).
- 2K20 binding slot rule: NEVER modify/replace/rebuild/redirect `bakedfile00–07`; all mod work in `bakedfile08–12` only, sourced from `mods/` only (`Sept18th-2026\RESEARCH-LOG.md`).
- Never replace stock `6100` files; new work = new virtual asset pair under a new id (e.g. `6104`) (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).
- One in-game action/test at a time; name the game explicitly in every test instruction (`kb.md`; `Sept18th-2026\RESEARCH-LOG.md`).
- Loader binaries are the reference; do not rebuild the loader unless the task is explicitly loader work (`AUDIT-2026-09-19-WORKSPACE-CODE.md`).
- Do not reopen Cakehook, loader, CakeView, TRIBUTE-baseline, or texture-control work unless a new specific regression is observed (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`; `kb.md`).
- Do not repeat completed tests (v2–v9 packages, Group90 correlation, bridge re-runs, loader/list/unchanged-reference checks) (`kb.md`).
- Game-derived bytes never pushed to GitHub (converted .acts, extracts, catalog JSON, BakeMe stagings stay local-only) (`Sept18th-2026\RESEARCH-LOG.md`; `LOCAL-ONLY-CHATGPT-WEB-PATHS-2026-09-07.md`).
- Clean builds before release; content-verify installs (hash equality lies across reproducible builds; stale `.o`/dotnet publish reuse bit 3×) (`Sept18th-2026\RESEARCH-LOG.md`).
- Readability note required for public-facing first-party docs; not for internal engineering docs or license text (`Aurora-Forge-Knowledgebase\README.md`).
- TRIBUTE used only as behavioral oracle; never copy its code (`kb.md`).
- Preserve unrelated/untracked files; never `git reset --hard`/`git clean` (`WORKTREE-INVENTORY.md`).
- `6104` probe lives outside the game at `C:/Games/2k25-extracts/probe-6104` — working copy only (`AURORA-FORGE-PROJECT-STATUS.md`).

# GOTCHAS
- Registration JSFBs are boot-read; `.dds`/`.clips` are on-demand. Late mounting explains textures/clips serving but rows never registering (`kb.md`).
- `Hide/HideCtrlData.hidelink.jsfb` is an addon-character unlock table (single-winner, newest mounted copy) — NOT the missing-row cause (`kb.md`).
- Two-file list/SDB packages are insufficient; full nine-file context is the working TRIBUTE baseline (`kb.md`).
- Foundry v9.3 payload-protection was NOT the cause of registration invisibility (`kb.md`).
- `mods/` subdirectory means nothing to the 2K20 game itself; root mod slots are THE channel (`Sept18th-2026\RESEARCH-LOG.md`).
- 2K20 has no disk-first/loose-file loading; staged loose `Animation\Victory\6100.*` were ignored (stock verdict) (`Sept18th-2026\RESEARCH-LOG.md`).
- 2K20 stock vs community container flags: stock/community `01 C0`; our v6.8 packs emitted `01 40` (bit15 clear) — flavor gap led (`Sept18th-2026\RESEARCH-LOG.md`).
- 2K22 CakeTools v098a bakes FDIR v8.2 headers (stock is v8.3) and produced deterministic 171,283-byte empty bakes 4×; it is animation-blind (`Sept18th-2026\RESEARCH-LOG.md`).
- 2K20 `.acts` has two on-disk forms: old-root 429,196B compressed vs new-root 743,484B RAW AMYM (`Sept18th-2026\RESEARCH-LOG.md`).
- `.evd` carries only motionId + internal name; not the acts-path decider (`Sept18th-2026\RESEARCH-LOG.md`).
- Multi-CAK mounts can crash (2K20 06+07 two-mount sequence crash; 07 solo booted fine) (`Sept18th-2026\RESEARCH-LOG.md`).
- Duplicate FDIR records with zero payload exist (279 metadata refs in 2K26 v1.16); they are not failed files (`AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md`).
- PowerShell `Compress-Archive -LiteralPath` wildcard silently creates no ZIP while reporting success (`AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md`).
- Em-dash (U+2014) in addon strings produced mojibake in logs; removed at source (`Sept18th-2026\RESEARCH-LOG.md`).
- Window mount "works but too late"; worker-thread timed mounts at every delay crashed (pre-09-22); do not retry them (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- Strict signature check on the mount detour failed until the one-byte transcription error (`0x4C` vs `0x48`) was found; probe design (log actual bytes) vindicated (`Sept18th-2026\RESEARCH-LOG.md`).
- A single CAK content-bake at ~400KB+ is expected; 171KB output = baked nothing (`Sept18th-2026\RESEARCH-LOG.md`).

# DEAD ENDS (do NOT repeat)
- Worker-thread timed mounts (immediate/800ms/3500ms/10000ms/after first `bakedfile` open) — all crash (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- Hooking `phase_rva` for mounting — wrong function (`kb.md`).
- Window-thread-only mount — too late for registration (`kb.md`).
- v2–v9 list/SDB registration packages; exact 2-file TRIBUTE Victory/SDB oracle (`kb.md` §Completed tests).
- Cakehook swap controls — invalid experiment; do not characterize Cakehook as incompatible (`kb.md`).
- 2K20 loose-file staging; root/native 2K20 bakes; slot-range theories (09 stock verdict eliminated slot range) (`Sept18th-2026\RESEARCH-LOG.md`).
- Claim "Victory uses a second non-ULEB codec" — false (invalid 10/20-byte token limits) (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).
- "Nine tracks × seven bits" and "bits 7–13 = J_Hips" — unverified (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).
- Public 2K22 AMYM/TBUF/ANIM encoder search — already negative; do not re-search (`notes\2026-09-12-direct-codec-paused-handoff.md`).
- Modern `.clips` repackager / ADEF wrapper are NOT motion converters (`notes\2026-09-12-direct-codec-paused-handoff.md`).
- Broad audits of `D:\WWE26-mods\compiled releases for review` / `D:\wwe 2k25 mods` without a new recorded inventory method (`notes\2026-09-12-direct-codec-paused-handoff.md`).
- MyGM starting-agent-points task — cancelled, do not resume (`AURORA-FORGE-ANIMATION-CONVERTER-HANDOFF.md`).
- Repacking a full extracted root; modifying either installed game; presenting hypotheses as support (`TRAE_CONTINUATION_HANDOFF.md`).
- DDS scanner PR is not animation progress (`Aurora-Forge-Knowledgebase\status\PROJECT-STATUS.md`).
- Do not touch `D:\zips`; do not delete `aurora-disabled-tests\` (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).

# VERIFIED PATHS
- Game (2K25 SNME): `C:\WWE 2K25 Saturday Nights Main Event\`; log `DataCtrlLink.log`; crash dumps `C:\Users\dgran\AppData\Local\CrashDumps\` (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- 2K25 v1.23 install: `D:\WWE 2K25-1.23\WWE 2K25` (exe SHA `B608E7ED18BFB6291CA195532ACCF40081CBF1A1F4850E63943906D155B9AC98`, size 391,159,760; Oodle SHA `01301592C8E51660BFDD8785ED1AD762FD103033C85414C925FC3DD4B8B6E999`; mount RVA `0x2DFDA0–0x2DFF4C`; sync `0x2DFF50–0x2E023F`) (`LOCAL-ONLY-CHATGPT-WEB-PATHS-2026-09-07.md`).
- 2K25 extracted root: `D:\wwe 2k25 mods\extracts\Root`; `C:\Games\2k25-extracts\Root` (`TRAE_CONTINUATION_HANDOFF.md`; `AURORA-FORGE-PROJECT-STATUS.md`).
- 2K19: `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19`; 2K20: `...\WWE2K20`; 2K26: `D:\games\WWE 2K26` (`REFERENCE-BASE-KNOWLEDGE.md`; `TRAE_CONTINUATION_HANDOFF.md`).
- 2K20 profile: exe `WWE2K20_x64.exe` SHA-256 `21e3b0fdce01be21ca107d349a591a5d80c8d56ed08f0ce355c416ec5013e208`; mount `0x1d0420`, sig `0x1d0485` (12B), phase `0x1d0600` (16B sig) (`Sept18th-2026\RESEARCH-LOG.md`).
- Modded oracle extraction: `D:\AuroraForge-Aug26\25 bake folders\extracted-modded-cak` (294 files / 145 dirs / 955,723,504 bytes; 159 differ vs stock; no Animation payloads) (`kb.md`).
- TRIBUTE BakeMe: `D:\wwe 2k25 mods\TRibute-1.20\TRIBUTE 25 v1.20\TRIBUTE 25\BakeMe`; v1.8: `D:\TRIBUTE 25 v1.8 (DEC_09)\TRIBUTE 25\BakeMe` (`kb.md`).
- 6104 probe: `C:\Games\2k25-extracts\probe-6104` (+ `cak-source`, `build\aurora-6104-probe.cak`) (`LOCAL-ONLY-CHATGPT-WEB-PATHS-2026-09-07.md`).
- 2K20 package: `D:\AuroraForge-Aug26\_work\2k20-package-6100`; 2K22 override staging `_work\2k22-bakeme-6100override`; `_work\bakedfile06.cak` (`kb.md`; `Sept18th-2026\RESEARCH-LOG.md`).
- Foundry portable v1.7.9.a: `D:\Aurora-CAK-Foundry-v1.7.9.a-Windows-x64\resources\app.asar.unpacked\app\tools\cak-v93\CakeTool.exe` (`HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`).
- Foundry v1.7.8 ZIP SHA-256 `888253B4D4B195FDCFB6B9C8E406174DA1018FF3A9D89E1BB5729689F51E495A`; SDCL 2K25 v1.0.02 ZIP `84B1809D…`; CAK Mod Loader v1.0.02 ZIP `A80B96B3…`, addon DLL `8A1F305B…` (`LOCAL-ONLY-CHATGPT-WEB-PATHS-2026-09-07.md`; `AURORA-FORGE-PROJECT-STATUS.md`).
- 2K25 v9.3 rebuild reference: `aurora-bakedfile80-roundtrip-v177.cak` 2,214,802,300 bytes SHA `AE1AA0D6F864AA15CB56326BD662789A31BEAA66E61731F0EC97EBE76A0C2437` (game returned false pre-protection fix) (`AURORA-FORGE-PROJECT-STATUS.md`).

# FILE-FORMAT FINDINGS (non-animation)
- TEX! v9 container: stock header fmt `7fd9cd97`, sRGB=1, 11 mips, dim=2; size@36; CRN payload; `BC1:UNORM` 9-byte footer; Unity-fork `crunch_x64.exe` required (stock BinomialLLC build garbles in-game) (`Sept18th-2026\RESEARCH-LOG.md`).
- Wwise: AKPK package validation; HIRC reconstruction; events/variables FNV hashnames; `wwnames.txt` reversing flow (`DataCtrlLink-MusicOnly\...\NAMES.md`; `_forge2-merged...\docs\ARCHITECTURE.md`).
- Bink `.bk2` sets in `Movies/SS/...` and `Movies/Arena/...` (`AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md`).
- CAK v9.9 validator checks `FDIR 09 09 00 81` prefix, encrypted header, bounded counts, contiguous offsets (`_forge2-merged-20260924\Secure-DataCtrlLink-WWE2K26\docs\ARCHITECTURE.md`).
- DataCtrlLink runtime limits: MaxFileBytes 64 MiB, MaxCustomPackages 16, MaxCakArchives 32, ReadyTimeoutMs 120000, CakPostPrimeDelayMs 2500 (`Secure-DataCtrlLink-WWE2K26 README`).
- Foundry extraction merges all root `bakedfile<number>.cak` into one virtual `/root` in numeric order; later archive wins same-path collision (`INSTALLATION_AND_ROLLBACK.md`).

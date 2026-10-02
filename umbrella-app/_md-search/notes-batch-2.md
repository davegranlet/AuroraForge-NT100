# Notes — batch-2 (122 files read)

All source paths are relative to `C:\AuroraForge-Aug26\` unless written in full.
Batch list: `AuroraForge_WWE_PC-Game_Modding_Tool\_md-search\batch-2.txt`.

---

## ANSWERS TO THE 10 QUESTIONS

### Q1 — Which row to clone as template for new entries

- **Victory:** `append_2k25_victory_entry.js` "parses the current-game `Vict` list, **copies a complete selected record**, applies explicit values, and writes a new FlatBuffer containing the current entries plus the new one"; first validation 661 → 662 records, new ID 14000, **zero scalar differences** in the 661 rewritten records; optional fields stay omitted when omitted in source.
  → `AuroraForge_WWE_PC-Game_Modding_Tool\WWE2K19-to-2K26-Entrance-Prototype\analysis\2k25-tribute-entry-14000-findings.md`
- **Victory template row that TRIBUTE 25 v1.20 itself produced** (observed sample, good shape reference), appended at index 654 of a 655-record file: entry/wrestler ID `14000`; nameString `4294957742`; type `1`; hide ID `7871869299616959835`; base victory `6107`; face `6107`; heel `8701`; title face `8703`; title heel `8712`; double-title face `1942`. (Same file.)
- **Entrance (newest wins, per `AURORA-FORGE-TOOL-MAP.md` §2):**
  1. `append_2k25_entrance_entry.js` (oldest; rebuilds all 9 vectors — used by the library today)
  2. `append_2k25_entrance_template_entry.js` (preserves original bytes except section 8 — use for asset refs)
  3. `append_2k25_entrance_preserving_graph.js`
  4. `append_2k25_entrance_clone_graph.js` (NEWEST, 2026-09-12 14:51) — byte-preserving shift, clones full record shape incl. the 11th field slot; header says "for visibility controls, not asset import" → use for structure.
- **Victory motion template record** = `recordIndex 15` inside the 17-record `.clips` file (64 tracks); stock victory format verified identical to ours. **Entrance template is different: 29 records (phase layout); our victory-format copies crash the entrance editor.**
  → `AURORA-FORGE-TOOL-MAP.md` §1.4
- Known-good registration skeleton on disk: `_work\14000-compat-v103\BakeMe` = "known-good 14000 registration + victory template" (→ `AURORA-FORGE-TOOL-MAP.md` §4).

### Q2 — Which files MUST be written for a new entry to appear in-game and play

- **TRIBUTE 25's own working recipe (user experiment, whole-tree diff): VictoryListData + EntranceListData + SDB only (3 files), stock-motion clones, NO Cutscene write, no new assets.**
  → `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`
- **TRIBUTE 25 v1.20 local entry creation wrote exactly three files:** `BakeMe/Entrances/EntranceListData.jsfb`, `BakeMe/Entrances/VictoryListData.jsfb`, `Sdb/ENG.sdb`. **`CharMoveSetDataTable.jsfb` was NOT modified** — separates (1) list entries + localized name (created together) from (2) assigning a victory to a wrestler (a different operation).
  → `...\analysis\2k25-tribute-entry-14000-findings.md`
- **Genuinely NEW imported motion needs the extra path:** "Our converter goal (genuinely NEW imported motion) needs the Cutscene+assets path v103a already ships" (`.clips`/`.adefs` payloads + `CutsceneNoRegistry` entry).
  → `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`
- **Six missing registration writers identified as "the actual blocker to making a NEW victory/entrance menu slot appear":** Char, Prof, Play, Data, CMov, CharacterMapping/TeamsTable (→ `allfiles-05-flagship.md` quoting `notes/REPO-CONTENTS-AUDIT-2026-09-20.md`). Writers now exist for all six and were validated 38/38 offline (→ `allfiles-05-flagship.md` cross-cutting conclusion #5).
- **Tested file sets, with outcomes:**
  - 6104 `.adefs`+`.clips` pair in one mod CAK → loader `accepted=3 rejected=0 failed=0`, game reached menu, exited normally (→ `...\WWE2K19-to-2K26-Entrance-Prototype\README.md`, Sept-11 checkpoint).
  - VictoryList 661→662 with 14000 appended, baked as one-payload CAK → `ACCEPTED CAK aurora-victory-entry-14000-listonly.cak`, `accepted=2 rejected=0 failed=0`; **visibility/runtime selection unproven** (→ `...\analysis\2k25-tribute-entry-14000-findings.md`).
  - v103a = Tribute-25-family base + validated 14000 clips/adefs + missing Cutscene 14000 entry via shared-vtable splice → crash-free, loader-accepted, 93/93 non-texture payloads byte-identical on unpack, **but TEST 14000 absent from the in-game MOTION: FACE T section** (→ `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`).
- **Root cause of picker invisibility:** frontend reads its tables (`EntranceListData`, `VictoryListData`, `CutsceneNoRegistry`, `ENG.sdb`) while booting archives, **before** the window-thread mount lands; `.clips` are read on demand and DO serve. Evidence: renamed stock entries and an appended Test 14000 row never appeared, while `.clips` overrides serve.
  → `allfiles-05-flagship.md` (quoting `notes/HANDOFF-2026-09-19-2K25-DIRECT.md`; `...\notes\HANDOFF-2026-09-20-CURRENT.md`)

### Q3 — Name/string id scheme (SDB ids, negative ids, hashes)

- **Name string key in the new victory row = `4294957742` (unsigned) = signed `-9554`.** In the generated English SDB it is the final record; the current-game English SDB ends at signed ID `-9555`, so `-9554` is a valid **one-record append**, not a replacement. Same value is stored by both new template entries (`nameString`).
  → `...\analysis\2k25-tribute-entry-14000-findings.md`
- **SDB structure:** `u32` version (`256`); `u32` record count; sorted 12-byte records = (data offset, byte length, string ID); encoded null-terminated UTF-8 payloads. (Same file.)
- **SDB string encoding = rolling XOR, offset-derived key:** initial key = `(offset & 0xff) ^ 0xcd`; subsequent bytes use the preceding **encoded** byte. `Draven` at offset `0x676dfc` → key `0x31`, bytes `75 07 66 10 75 1b`. (Same file.)
- **SDB writer:** `tools/append_2k25_sdb_string.js` — rolling-XOR aware; decodes each existing string with its old offset and re-encodes with its new offset. Validation: all **96,477** current English strings remain byte-for-byte identical + new `Draven` round-trips. (Same file; `AURORA-FORGE-TOOL-MAP.md` §2.)
- **Cutscene motion-name registry** `Cutscene/CutsceneNoRegistry.jsfb`: FlatBuffer root→table→vector of **2,160 uoffset entry tables**; entry table 32 B shared vtable; `f0@+8` = motion id, `f1@+12` = nameString, `f7@+24` per-entry hash, `f8@+20` = `-1`. Entry id `6100` → nameString `0x17717C81` resolves in ENG.sdb to `THE ROCK`.
  → `allfiles-05-flagship.md` (quoting `notes/LOG-2K19-2K25-TRANSFER.md`)
- **Clip record id = FNV-1a64 of the clip name** (`clipNameId()` = lowercase-UTF8 FNV-1a64) (→ `allfiles-05-flagship.md` quoting `tools/clips-layout.js`).
- **Bone/track IDs = FNV-1a64(proper-case `J_` bone name)**; 60/64 resolved in the canonical skeleton order (Hips@1); unknowns = track0 + tracks 61–63 (structural slots).
  → `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md` (2026-09-18); `...\Sept18th-2026\SESSION-SUMMARY.md`
- **CAK keys are filename-derived** (2K26 FDIR v9.9 key from final `.cak` filename; v9.3 archive keys also derive from the CAK filename — "renaming fullbody19→testv101a post-bake → key mismatch → game refused").
  → `_archive\workspace-consolidation-2026-09-20\broken-worktrees\datactrl-cak-collision\README.md`; `allfiles-05-flagship.md` (quoting `notes/LOG-2K19-2K25-TRANSFER.md`)
- SDB generation difference to watch: Tribute 26 v1.6.0 SDB is **2K26-generation encoding** (1,333/113,783 records decode vs 81,209/96,290 on the 2K25 family) (→ `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`).

### Q4 — CAMMoveData (MoveData/CAMMoveData.jsfb) — role and values

- Batch evidence is thin. What exists:
  - `append-2k25-cammove-entry.js` **documents the CMov schema: 116-byte vtables, 56 field slots, motion id = low u16 of the 8-byte f3 payload.**
    → `allfiles-05-flagship.md` (quoting `tools/` inventory)
  - CMov is one of the six registration tables that must be written for a new menu slot to appear (→ `allfiles-05-flagship.md` quoting `notes/REPO-CONTENTS-AUDIT-2026-09-20.md`).
  - 2K20-side index census (for scale/comparison): `Prof 531 / CharPro 493 / CharMoveSet 522 / CAtt 20845 / CMov 12940`; **no `Vict` table in 2K20** (→ `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`).
  - 2K20 roster registry: `Roster/CharProfilePro.jsfb` rows carry **paired victory u32s** (`[6100,6100]+[8701,8703]` at Rock id 100) (→ same file).
- **Not evidenced in this batch:** a field-by-field CAMMoveData.jsfb role/value map for a *new 2K25* motion entry. Treat as open; the writer script is the authority.

### Q5 — New-entry id numbering rules

- **"New animation ids start at 14000; never reuse; 6185 is taken."** → `AURORA-FORGE-TOOL-MAP.md` §6 (house rules).
- **"Additive IDs only (new motion IDs from 14000); preserve stock files/IDs; never reuse stock 6185 (occupied: THE USOS 1)."** → `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md` (hard constraints).
- TRIBUTE added `14000-14003` and removed 7 rows, rehashing strings (→ `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`).
- Precedent for using an unused asset namespace: `6104` chosen as new Victory asset namespace (no stock 6100 replacement) (→ `...\WWE2K19-to-2K26-Entrance-Prototype\README.md`).
- **Additive-only is a binding user directive:** overwriting stock (e.g. Victory 6100) is forbidden as a project path; converted 2K19 animations become NEW entries, only for animations that do not exist in the target (→ `...\notes\LOG-CONVERSATIONS.md`).

### Q6 — EntranceListData row field values for new entries

- **No field-by-field EntranceListData row dump exists in this batch.** What is evidenced:
  - TRIBUTE writes `EntranceListData.jsfb` as one of the 3 files on new-entry creation (→ `...\analysis\2k25-tribute-entry-14000-findings.md`).
  - Entrance records are a **29-record phase layout**, structurally different from the 17-record victory file; copying victory-format data crashes the entrance editor (→ `AURORA-FORGE-TOOL-MAP.md` §1.4).
  - Entrance appenders: all-9-vectors rebuild (`append_2k25_entrance_entry.js`), section-8-preserving (`..._template_entry.js`), graph-preserving, and full-shape clone incl. 11th field slot (`..._clone_graph.js`, newest) (→ `AURORA-FORGE-TOOL-MAP.md` §2).
  - Related entrance-side table: `Cutscene\ListData\EntranceMotionTableData.jsfb` — **40 records** (`entrance-motion-table.js`) (→ `AURORA-FORGE-TOOL-MAP.md` §2).
  - Beta1.0.0a ships a "2K25 EntranceListData finder/diff/editor" and "CutsceneNoRegistry finder/inspector/editor" (→ `...\notes\BETA1.0.0a-PATREON-PREVIEW-2026-09-19.md`).
- For Victory row field *names*, use `append_2k25_victory_entry.js` args: entry-id, clone-id, name-string, some-id, face, heel, title-face, title-heel, double-title-face (→ `AURORA-FORGE-TOOL-MAP.md` §2).

### Q7 — VictoryListData vs EntranceListData (separate tables, row shapes)

- **Separate tables, both must be written** for new entry creation (plus SDB) (→ `...\analysis\2k25-tribute-entry-14000-findings.md`).
- `VictoryListData.jsfb` identifier `Vict`; **10-field records**; the observed appended row is "a complete ten-field FlatBuffer record" — "the two-scalar experiment against an existing wrestler" is NOT the full registration mechanism.
  → `...\analysis\2k25-tribute-entry-14000-findings.md`; `allfiles-05-flagship.md` (quoting `notes/LOG-REGISTRY.md`)
- **Baseline mismatch gotcha:** TRIBUTE's supplied `VictoryListData.jsfb` = 655 records (older baseline) while current extracted 2K25 = **661 records**; must NOT package the TRIBUTE file wholesale (discards six current records) — append an equivalent record to the *current* list (→ `...\analysis\2k25-tribute-entry-14000-findings.md`).
- Another Tribute-family baseline: 657 vs 661 rows (added 14000-14003, removed 7, rehashed strings) (→ `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`).
- Entrance rows live in `EntranceListData.jsfb`; victory rows in `VictoryListData.jsfb`; entrance phase/motion structure is in `CaeAdvanced/*` and `EntranceMotionTableData.jsfb` (→ `AURORA-FORGE-TOOL-MAP.md` §4).

### Q8 — How animation files are registered

- **On-disk 2K25 layout (verified extract, `C:\Games\2k25-extraction\`, 19,975 JSFBs / 871 MB):** `Animation/Entrance` **1,205 pairs**; `Animation/Victory` **~1,042 pairs**; `Animation/CaeAdvanced` **9,004 phase files**; plus `Animation/Acts`, `LightShow`, `Cutscene`, `Entrances`, `Audio/MusicList.jsfb`, `Movies/MovieDataTable.jsfb`, `Sdb/`.
  → `AURORA-FORGE-TOOL-MAP.md` §4
- **`.clips` container (cracked, reimplemented):** count duplicated at `0x10`/`0x14`; table at `0x18`; 16-byte records (8-byte id + u32 length + u32 offset); payload fixed header `0xA0`; section counts at `0x20/0x38/0x60/0x78/0x90`; frame value `0x44`, fps `0x0C`; `build()` enforces `0xA0 + trackCount*8 + group38Count*4 + group60Count*8 + descriptorCount*8 + group90Count*8`. Record id = FNV-1a64(clip name).
  → `allfiles-05-flagship.md` (quoting `tools/clips-layout.js`)
- **Group90 codec:** LSB-first bit stream; descriptor = `[i8 scale][u8 width][u16 0][f32 rest]`; value = `bits × 2^scale + rest`. Framing consumes 210458/210496 bits (8102 rec0); remainder u64 zero-pad. Stock decode→re-encode is bit-identical; ULEB-token model REFUTED (later log re-describes tokens as ULEB128 for value streams — see Corrections).
  → `...\Sept18th-2026\SESSION-SUMMARY.md`; `allfiles-05-flagship.md` (quoting `LOG-2K19-2K25-TRANSFER.md`)
- **Descriptor (later model):** `[u16 tokenStart][u16 flags][f32 rest] × 6` per track; rest values do NOT match YANM triples; motion lives in token streams, not headers. Fixed token budget ≈ 247–256 tokens/moving track (not key-proportional); active-starts 0:1, 1:16, 2:11, 3:33, 4:3 (most tracks 3 channels = xyz triplets; hips has 4).
  → `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md` (2026-09-18)
- **Record/section map:** 2K19 sec0 (62 tracks) ↔ clips rec0 (64 body); 2K19 sec1 (7 facial) ↔ clips rec5 (8 face); +2/+1 structural slots (root/terminator analogues); rec1–4 = event/prop/SFX records (keep target). Rock 6100 exists in 2K25 (`bakedfile60/100`; rec15 64-track body + rec16 8-track face; 1755 frames); `VictoryList wrestlerId 100 -> victoryFace 6100`. (Same source.)
- **`.adefs` = per-animation event graph** (bone names + AttackPart/Hit/Sell tags + `<id>_*`-style refs; 12.7 KB diff 8102 vs 8054); needs per-target rebuild (Stage 2). (Same source.)
- **CaeAdvanced phase files** are the entrance-side paired assets: `1000100.clips` + `1000100.adefs` (probe pair); a `.clips` with **no sibling `.adefs`** opens as bind/T-pose with `0 / 0` timeline = negative playback evidence. `test_anim.clips` fixture = record 1, 60 fps, frame value 111, 73 tracks, 438 Group78 descriptors, 709 Group90 entries.
  → `...\AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-14-CURRENT.md`
- **CutsceneNoRegistry** = motion-name registry (see Q3). Cutscene appender: `clips-codec\append-cutscene-entry.js`; v103a added the missing 14000 Cutscene entry via shared-vtable splice (count+1, all tables vtableBytes=22/in-bounds, entry at last slot, clone words).
  → `AURORA-FORGE-TOOL-MAP.md` §2; `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`
- **Track mapping rules:** `SWAP_BONES = {7:8, 8:7, 30:31, 31:30}`; `BAND_BONES = [7,8,30,31]`; default gains `--gain-pos 4.4e-4`, `--gain-rot 5.3e-6`; native bone walk order: slots 0–2 then 3–5, chunked in 3s.
  → `allfiles-05-flagship.md` (quoting `clips-codec/build-imported-clips.js`, `parse-clips-record.js`)

### Q9 — Which tool/flow builds the CAK for a new entry

- **Conversion chain (all under `WWE2K19-to-2K26-Entrance-Prototype\tools\`):**
  1. `extract-2k19-animations.js` (uses `app\tools\pac19-helper\AuroraPac19Helper.exe`; emits decoded `.bin` motions)
  2. `export-yanm-ir.js` (2K19 YANM → IR)
  3. optional bridge `convert-yanm19-to-yanm20.js` (+ `yanm-keyframes.js`, `yanm20-encoder.js`, `yanm20-ir-writer.js`, `yanm20-reader.js`, `patch-acts20-yanm.js`; newer `convert-yanm20-to-tbuf22.js`)
  4. **`build-2k19-to-2k25-replace-clips.js`** → `clips-codec\build-imported-clips.js` (the modern `.clips` builder)
  5. **`build-2k19-to-2k25-replace-cak.js`** (package a replace CAK)
  6. **`convert-2k19-library-to-2k25-entries.js`** (current Beta2 path; per motion: build clips + clone adefs + registration rows + cutscene + SDB, **then Foundry bake**)
  → `AURORA-FORGE-TOOL-MAP.md` §1
- **Bake (CAK creation):** `Aurora-CAK-Foundry\scripts\bake-v93-cli.js`; native backend `Aurora-CAK-Foundry\app\tools\cak-v93\FTribTool.exe` (`catalog-json`, `unpack-cak`, `unpack-file`, `pack -i <dir> -v 9.3 -o <cak>`). External/legacy: `CakeTool.exe pack -i <dir> -v 9.3 -o <out> --encrypt-header`.
  → `AURORA-FORGE-TOOL-MAP.md` §3; `allfiles-05-flagship.md` (quoting `HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`)
- **Foundry v1.7.8 produced the protected v9.3 archive that mounted `true`**; mount args must be custom-archive mode + slot `(path, null, 2, 1)` (not `(path, null, 0, 101)`).
  → `AuroraForge_WWE_PC-Game_Modding_Tool\Aurora-Forge-CAK-Mod-Loader-WWE2K25\docs\BUGS-AND-FIXES.md` (AFCML-CAK-004/006)
- **BakeMe orchestrator** (full-tree copy/edit/proof) ships in Beta1.0.0a (→ `...\notes\BETA1.0.0a-PATREON-PREVIEW-2026-09-19.md`).
- **Loader side:** `mods/manifest.json` = `{version:1, cakOrder:[...], packageOrder:[]}` (allowlist; omitted files not loaded); log `DataCtrlLink.log` shows `ACCEPTED CAK`; addon `AuroraForge.CAKModLoader.ftrib` mounted via `g_cak_mount(&path_view, nullptr, 2, 1)` from the game's own archive-boot call (SNME RVA `0x2e00a0`).
  → `AURORA-FORGE-TOOL-MAP.md` §3; `allfiles-05-flagship.md` (quoting `mod_loader.cpp`)

### Q10 — Intended end-to-end user flow

- Canonical goal string: `WWE 2K19 animation -> WWE 2K20 -> WWE 2K22/23/24 -> usable WWE 2K25 entrance/victory animation output`. **Do not call complete until a genuinely converted motion is written, independently read back, and visibly plays in the intended game format** — no reference copies, structural-only mutation, FBX preview, package repack, or GUI screenshot.
  → `...\AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-14-CURRENT.md`
- Staged pipeline architecture: `2K19 PAC/YANM → 2K20 AMYM/YANM20 → 2K22 AMYM/TBUF v1+ANIM v10 → 2K23 MINA → 2K24 TBUF v2/ANIM v11 → 2K25/26 .clips + .adefs`.
  → `allfiles-05-flagship.md` (quoting `PIPELINE_ARCHITECTURE.md`)
- 2026-09-18 goal redirect: export 2K19 → import 2K25 **directly** (2K20 slots mount but never serve; 2K25 serving is proven; registration solved; delivery solved; single transcode hop = higher fidelity).
  → `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`
- Product flow as shipped in Beta1.0.0a (offline): 2K19 source intake → 2K19→2K20 test package builder → 2K25 `.clips` build/inspect → VictoryListData editor → EntranceListData finder/diff/editor → CutsceneNoRegistry editor → SDB reader/writer → BakeMe orchestrator → CAK catalog inspection → DataCtrlLink log checker.
  → `...\notes\BETA1.0.0a-PATREON-PREVIEW-2026-09-19.md`
- **Actual current end-state:** portable converter/editor preview usable offline; in-game picker visibility of new entries is the remaining blocker (pre-frontend mount timing). Do not claim converted content is proven in 2K25, that TEST 14000/6185 appears, or that the diagnostic loader pair is shippable.
  → `...\notes\HANDOFF-2026-09-20-CURRENT.md`

---

## Verified facts (hashes / paths / numbers)

### Game builds
| Item | Value | Source |
|---|---|---|
| WWE 2K25 v1.23 exe SHA-256 | `b608e7ed18bfb6291ca195532accf40081cbf1a1f4850e63943906d155b9ac98` | `_archive\...\datactrl-cak-collision\README.md`; `AURORA-FORGE-QUICK-HANDOFF-2026-09-06.md` |
| SNME exe SHA-256 | `c6bc0459…cee01` (full prefix in `profiles.cpp`); archive-boot RVA `0x2e00a0` | `allfiles-05-flagship.md` |
| 2K25 v1.23 RVAs | mount `0x2DFDA0`, sig `0x2DFEAD`, phase `0x2DFF50` | `allfiles-05-flagship.md` |
| SNME RVAs | mount `0x2E03F0`, sig `0x2E04FD`, phase `0x2E05A0` | same |
| 2K22 RVAs | `0x26b390 / 0x26b49d / 0x26b560` | same |
| 2K20 RVAs | `0x1d0420 / 0x1d0485 / 0x1d0600` | same |
| 2K26 executable hashes (3 distinct installs) | v1.14 `7f558607…e4a0e9`; ORIG `DFB08C59…`; v1.16 `5F82C813…` | `_archive\handoffs\packages\(1) Prepare Aurora Forge....md` |
| 2K26 v1.14 hash allowlisted by SDCL v1.7.5 | `7f558607bd6881c4547d752ea107fb03282a2980e47ef19ade597e096de4a0e9` | same; `local-release-archive\...\INSTALLATION_AND_ROLLBACK.md` |
| 2K25 CAK loader pin | core `FC0771822612DC5F05A446BBE27DBB24A7ADF6D9072802C9D9F181D4088B1D82`; addon `84089A2CE223E08F9FDBB4D9F4742D2A4829A9615501347968B25F279E5661DB`; observedBuilds: v1.23 "supported", SNME "needs-native-profile" | `allfiles-05-flagship.md` |

### Artifacts / test evidence
| Item | Value | Source |
|---|---|---|
| Foundry v1.7.7 protected `bakedfile80` rebuild SHA-256 | `DA50A25904803B002864B69BCF0033A76974CEA5F91CE95E4E344441C63B0818` (2,004 payloads, 1,137 folders) | `_worktrees\foundry-v93-verify\docs\AURORA_CAK_FOUNDRY_v1.7.7_FIX_REPORT.md` |
| 2K25 v1.23 archive census | 15 CAKs; 386,873 files; 93,738 folders; 0 failures; `bakedfile100.cak` 54,481 named files | `_worktrees\...\v1.7.7_FIX_REPORT.md`; `local-release-archive\...\CAK_FOUNDRY_RELEASE_NOTES_1.7.7.md` |
| 2K26 v1.16 census | 412,095 payloads + 279 zero-payload metadata references; 15 archives; 412,095/412,095 named | `...\Aurora-CAK-Foundry\package-tests\...\AURORA_CAK_FOUNDRY_v1.7.7_BUG_REPORT.md` |
| 2K26 all-releases CAK sweep | 45 CAKs across ORIG + v1.14 + v1.16 all parsed incl. three `bakedfile100.cak` variants | `_archive\handoffs\packages\(1) Prepare Aurora Forge....md` |
| 2K19→2K20 6100 output | motion 174,976 B / 63 records / 62 tracks; ACTS 429,196 B; EVD 20,610 B / 24 bodies; YANM at offset 37212 | `_archive\...\Aurora-Forge-2K19-to-2K20-Converter\README.md`; `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md` |
| 2K22 AMYM roundtrips | 6100 = 393,244 B; 6101 = 599,316 B; 6102 = 248,208 B | `...\notes\2026-09-14-2k22-update-checkpoint.md` |
| 2K22/2K23 6100 compare | 16 blocks; blocks 0–13 & 15 byte-identical; block 14 grows 135,104 → 138,048 B | `...\notes\2026-09-13-active-codec-blockers.md` |
| Victory inventory | 540 scoped 2K19 IDs (6000–9999) vs 930 2K25 Victory `.clips` IDs in bakedfile60; 74 missing; 56 named; 18 unknown | `...\Sept18th-2026\SESSION-SUMMARY.md` |
| Tribute 26 v1.6.0 BakeMe | 62 files, 19,841,251 B; SDB 2K26-generation (1,333/113,783 decode) | `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md` |
| v103a CAK | `aurora-14000-compat-v103a.cak` 56,080,748 B, SHA `E57757C7C9B141EF8D5A24B67E9B552AD02E6A07A679544913B7783478B0578C`; 93/93 non-texture payloads byte-identical | same |
| Beta1.0.0a exe | 76,031,009 B, SHA `F556E4C34CF2A08020966611828CE58DA8CC335D6AA0EF92837CD3540C8A00FE` | `...\notes\BETA1.0.0a-PATREON-PREVIEW-2026-09-19.md` |
| 14000 template victory row | id 14000; nameString 4294957742; type 1; hideID 7871869299616959835; base 6107; face 6107; heel 8701; titleFace 8703; titleHeel 8712; doubleTitleFace 1942 | `...\analysis\2k25-tribute-entry-14000-findings.md` |
| 2K20 full extract | 284,260/284,260 files, 0 miss | `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md` |
| 2K25 full extract | 19,975 JSFBs / 871 MB; Entrance 1,205 pairs; Victory ~1,042 pairs; CaeAdvanced 9,004 phase files | `AURORA-FORGE-TOOL-MAP.md` §4 |
| 6100 `record1_original.clip` | 9,920 B, SHA `7D2C215C36A57A8A8FB62C89DD57F4ABE455AE9E393DADCFB16F2A678D5B49D7` | `AURORA-FORGE-PROJECT-PRIORITIES.md`; `PROJECT-REPOSITORY-MAP.md` |
| Group90 framing (8102 rec0) | consumes 210458/210496 bits | `...\Sept18th-2026\SESSION-SUMMARY.md` |
| 6100→2K22 float patch | 5,100 float replacements validated (2K20→2K22, id 6100) | `...\Aurora Forge Sept 20\Sanitized-Research\STATUS-SUMMARY.md` |
| Loader addon (Beta preview) | `AuroraForge.CAKModLoader.ftrib` SHA `a808a933545e94e1b2400858c478b969cf80f4aea69b0c9fa61a0ffb0641f8e4` 1,644,544 B; core `dinput8.dll` SHA `1560642598000d0862c4082b327d27deba21384053ccfd78984e7953d5874f76` 1,607,168 B | `...\notes\BETA1.0.0a-PATREON-PREVIEW-2026-09-19.md` |
| Observer build (gated, log-only) | addon SHA `88BC53C161708038223F2BFA7B9BFCD32D27827CB1724642EA10670482EBFF3D`; target RVA `0x2E00A0` | `...\notes\HANDOFF-2026-09-20-CURRENT.md` |

### Key paths
- Games: 2K19 `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19`; 2K25 v1.23 `D:\WWE 2K25-1.23\WWE 2K25`; SNME `C:\WWE 2K25 Saturday Nights Main Event\`; 2K26 `D:\games\WWE 2K26` (ORIG `C:\SteamLibrary\steamapps\common\WWE 2K26-ORIG`). → `_archive\handoffs\...\PROJECT_PATHS.md`; `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`
- 2K25 extraction `C:\Games\2k25-extraction\`; canonical asset list `C:\Users\dgran\Desktop\fuuuuuuuuuck.csv` (356,919 rows) → `AURORA-FORGE-TOOL-MAP.md` §4
- Tribute references: `D:\wwe 2k25 mods\TRibute-1.20\TRIBUTE 25 v1.20\TRIBUTE 25\BakeMe`; `C:\Games\Tribute25-Designs-BakeMe-20260909-200828` → same
- Known-good 14000 registration skeleton: `_work\14000-compat-v103\BakeMe` → same
- Compatible 2K25 base: `_work\14000-user-bakeme-v102i\BakeMe` (130 files); transplant tree `_work\14000-compat-v103\BakeMe` → `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`
- Tribute 25 live install: `D:\TRIBUTE 25 v1.5 Merged With Latest UPDATE Files\TRIBUTE 25`; baselines `_work\trib25-v15merged-baseline.tsv` (237 files), `_work\trib25-v108-baseline.tsv` (172) → same
- **NEVER ENTER `forge2\`** (TraeCode's area) → `AURORA-FORGE-TOOL-MAP.md` §0
- Never touch `D:\zips`; no unscoped D: scans (6 TB near-full) → `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`

---

## House rules (binding)

1. **Additive-only.** Never overwrite stock content; converted animations become NEW entries; only for IDs missing in target. New IDs start at 14000; never reuse; **6185 is taken** (THE USOS 1).
   → `AURORA-FORGE-TOOL-MAP.md` §6; `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`; `...\notes\LOG-CONVERSATIONS.md`
2. **One registry-changing CAK active per in-game test** (manifest `cakOrder`); fresh-install mod files per test (copy, never move-and-hope; verify SHA-256 both sides).
   → `AURORA-FORGE-TOOL-MAP.md` §6; `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`
3. **"Loader accepted" ≠ works in game.** Only claim in-game after name visible + motion plays. → same
4. **Never rename a finished mod CAK** — keys derive from filename; rebuild under the desired name. → `_archive\...\datactrl-cak-collision\README.md`; `local-release-archive\...\INSTALLATION_AND_ROLLBACK.md`
5. **Never weaken exact-build checks**; never restore generic plugin loading; never edit only an exe hash (requires full RVA/signature/ABI profile). → `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\docs\ARCHITECTURE.md`; `docs\ADR-002-...md`
6. **Never commit/package** game files, Oodle DLLs, extracted assets, captured data, third-party binaries, decompiler projects, rollback copies, personal paths. → `_archive\README.md`; `AURORA-FORGE-QUICK-HANDOFF-2026-09-06.md`
7. **Preserve dirty worktrees**; never reset/clean broadly; commit only with explicit owner approval; newest code wins, never re-create a script. → `AURORA-FORGE-TOOL-MAP.md`; `PROMPT-FINISH-READING.md`
8. **Hotfix lettering:** any post-release correction = lettered hotfix (`…a`, `…b`) with full bug report + changelog + verification; no silent replacement of published releases. → `_archive\handoffs\packages\(1) Prepare Aurora Forge....md`
9. **Evidence discipline:** reference clones, unchanged target files, mockups, generic previews, repackagers are never "conversion"; offline/loader-only results must be labeled exactly that. → `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`
10. Readability note prefix required on every first-party doc; legal text untouched. → `_archive\handoffs\packages\(1) Prepare Aurora Forge....md`

---

## Gotchas

- **Pre-frontend read order is the picker blocker:** `EntranceListData` / `VictoryListData` / `CutsceneNoRegistry` / `ENG.sdb` are read while archives boot; window-thread mounts land too late; `.clips` are lazy-read and DO serve. → `allfiles-05-flagship.md` (quoting `HANDOFF-2026-09-19-2K25-DIRECT.md`)
- **Worker-thread native mount crashes** (access violation `0xc0000005`); native mount needs the game's own calling context (thread/TLS/lock state), not just elapsed time. → `Aurora-Forge-CAK-Mod-Loader-WWE2K25\docs\BUGS-AND-FIXES.md` AFCML-CAK-002; `allfiles-05-flagship.md`
- **Mount args matter:** `(path, null, 0, 101)` returned `false`; correct = custom-archive mode + slot `(path, null, 2, 1)`. → `BUGS-AND-FIXES.md` AFCML-CAK-006
- **SDB rolling XOR key is offset-derived**; treating it as a fixed key corrupts the first char of every moved string (`ATTENTION`→`STTENTION`). → `...\analysis\2k25-tribute-entry-14000-findings.md`
- **Baseline mixing:** never package TRIBUTE's 655-record `VictoryListData` over the current 661-record file; never use Tribute 26 v1.6.0 base for 2K25 (crashes, 2K26-generation SDB). → same; `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`
- **Victory vs entrance record shapes differ** (17-record victory / 29-record entrance phase layout); victory-format copies crash the entrance editor. → `AURORA-FORGE-TOOL-MAP.md` §1.4
- **Token budget is fixed per track** (clips resample to ~250 tokens/moving track); not key-proportional. → `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`
- **Stale build trap:** incremental `dotnet publish` ignored source edits; clean `bin/obj` + `dotnet restore -r win-x64` before build; verify behavior/hash, never mtime. → `...\notes\LOG-CAK.md`
- **PowerShell `Compress-Archive -LiteralPath` with a wildcard returns success but creates no ZIP** — builder must require nonzero ZIP. → `...\Aurora-CAK-Foundry\package-tests\...\v1.7.7_BUG_REPORT.md` ACF-177-009
- **Foundry bookkeeping files must be excluded from bake** (`.aurora-cak-manifest.json`, `Aurora_Forge_Extraction_Report.txt`). → same ACF-177-003
- **CAK key seed bug class:** hex conversion can drop a leading zero from a 64-bit seed lane for some filenames (`requires a 32-byte seed table`). → `_worktrees\foundry-v93-verify\docs\AURORA_CAK_FOUNDRY_v1.7.6c_BUG_REPORT.md` AFCAK-004
- **Collision guard:** two enabled CAKs with the same virtual path → game closes before launch; texture-DB metadata excluded from collision comparison. → `Aurora-Forge-Knowledgebase\handoffs\AURORA-FORGE-COMPLETE-GAME-VERIFICATION-HANDOFF-2026-09-09.md`
- **`moddedbake.cak` (719 MB) contains no 6100 path** — no competing override exists. → `...\Sept18th-2026\SESSION-SUMMARY.md`
- **Entry 0 is special in TBUF** (62 YANM → 64 TBUF children, flags `0x51435573` vs `0x200101`). → `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`
- **No sibling `.adefs` = T-pose/`0 / 0` timeline** in the native viewer (negative playback evidence, not success). → `...\AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-14-CURRENT.md`
- **File-name keyed CAK crypto:** renaming after bake breaks the key. → `allfiles-05-flagship.md` (quoting `LOG-2K19-2K25-TRANSFER.md`)
- **Third-party tools can be blind to animation files:** `CakeTools.exe` v098a strings scan shows 0 hits for `.acts/.adefs/.evd/.jsfb/.tbuf/.yanm/.clip/.anims`; empty bakes are explained by this. → `...\notes\LOG-CAK.md`

---

## Dead ends — do NOT repeat

- **Timed worker-thread mounts** (crash), **hardware debug-register trigger** (crashed before callback; removed), **stored mount RVA `0x2E03F0` as observer** (crash before detour), **phase RVA `0x2E05A0`** (MinHook status 8, would not install). → `BUGS-AND-FIXES.md` AFCML-CAK-002/003; `...\notes\HANDOFF-2026-09-20-CURRENT.md`
- **2K20 serving:** slots mount but never serve (proven across methods/timings/flavors) — old 19→20 goal retired as active work (bridge stays green as reference). → `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`
- **Plain-catalog v9.3 rebuilds** (mount `false`); v1.7.8+ protected writer is the path. → `AURORA-FORGE-QUICK-HANDOFF-2026-09-06.md`
- **Do not overwrite stock** (6100 era over); do not copy reference payloads and call them converted; do not use historical Move Pack registration tables as replacements for current stock tables; do not treat `.clips` parser/rebuilder or FBX preview as motion conversion; do not generalize a formula from one 0FOP/EVD fixture family. → `...\notes\2026-09-13-active-codec-blockers.md`; `...\notes\LOG-CONVERSATIONS.md`
- **Do not redo public-source searches** for a modern `.clips`/Group90 encoder — none found; only structural/older references (WrestleMINUS). → `...\AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-14-CURRENT.md`
- **Do not use CakeTool for v8.3/v6.8 packing** (v8.3 NullReference; v6.8 was later solved in-house; v9.3 only in the shipped wrapper). → `...\notes\LOG-CAK.md`
- **Do not treat the two-scalar patch as full victory registration** — a complete 10-field record is required. → `...\analysis\2k25-tribute-entry-14000-findings.md`
- **Do not reopen** loader/Cakehook/CakeView/TRIBUTE-baseline/texture-control work without a newly observed regression. → `...\WWE2K19-to-2K26-Entrance-Prototype\README.md`; `AURORA-FORGE-PROJECT-PRIORITIES.md`
- **Do not run unscoped filesystem scans** (prior incident; `forge2` never enter). → `PROMPT-FINISH-READING.md`; `AURORA-FORGE-TOOL-MAP.md`
- **No "PKM" mod format exists** — only PopcornFX `pkma/pkmm` particle material paths. → `allfiles-05-flagship.md` cross-cutting #4

---

## Tool inventory (script paths + purpose)

### Animation conversion (all `WWE2K19-to-2K26-Entrance-Prototype\tools\`)
- `extract-2k19-animations.js` — extract 2K19 PACs → decoded `.bin` motions
- `export-yanm-ir.js` — 2K19 YANM → neutral IR
- `yanm-keyframes.js` — structural keyframe reader (section len @+4, track count @+10, offsets from root+8; layouts `0204/0304/2200/2300/4300/5300`)
- `convert-yanm19-to-yanm20.js`, `yanm20-encoder.js`, `yanm20-ir-writer.js`, `yanm20-reader.js`, `yanm20-locate-body-table.js`, `yanm20-normalized-ir.js`, `patch-acts20-yanm.js`, `amym-container.js`, `fop19-evd20-body-model.js`, `fop19-reader.js`, `evd-reader.js`, `build-2k19-to-2k20-victory-package.js`, `batch-2k19-to-2k20-victory-packages.js`, `bake-2k20-textures.js`
- `convert-yanm20-to-tbuf22.js` / `-v2.js`, `tbuf-v1.js`, `tbuf-v1-relocations.js`, `tbuf-v1-body-candidate-record.js`, `tbuf-v1-body-offset-hypotheses.js` (diagnostic only)
- `clips-layout.js` — lossless `.clips` container parse/rebuild
- `clips-tool.js` — list/validate/extract/inject/rebuild/compare + raw `patch-group90`
- `clips-native-inspect.js` — read-only native decoder mirror
- `adefs-tool.js` — read-only ADEF v6 envelope inspector
- `build-2k19-to-2k25-replace-clips.js`, `build-2k19-to-2k25-replace-cak.js`, `convert-2k19-library-to-2k25-entries.js` (Beta2 orchestrator)
- `clips-codec\`: `build-imported-clips.js` (orchestrator; `SWAP_BONES`, `BAND_BONES`, gains), `parse-clips-record.js`, `bit-reader/writer`, `parse-timing-group`, `eval-group`, `eval-dense-group`, `encode-dense-group`, `copy-bits`, `concat-writers`, `resample-series`, `resample-keys-catmull-rom`, `smooth-column-gaussian`, `map-into-band`, `map-min-anchored`, `fit-descriptor`, `rot-to-quat`, `width-table`, `append-cutscene-entry.js`, `rename-cutscene-entry.js`, `find-cutscene-entry.js`, `locate-cutscene-vector.js`, `inspect-cutscene-registry.js`
- Registration writers: `append_2k25_victory_entry.js`, `append_2k25_entrance_entry.js` (+ `_template`/`_preserving_graph`/`_clone_graph`), `append_2k25_sdb_string.js`, `append-2k25-teams-entry.js`, `append-2k25-character-mapping-entry.js`, `append-2k25-cammove-entry.js` (CMov schema), `append-2k25-charprofilepro-entry.js`, `append-2k25-charprofiletable-entry.js`, `append-2k25-charmoveset-slot.js`, `append-2k25-face-textures-entry.js`, `append-hide-ctrl-entry.js`, `jsfb-append-lib.js` (clean-room FlatBuffer splice), `jsfb-struct-appender.js`, `jsfb-registration-diff.js`, `inspect_jsfb_vector.js`, `parse-2k25-jsfb.js`, `victory-list.js`, `entrance-motion-table.js`, `patch_2k25_victory_list.js`, `patch_2k25_victory_name_type.js`, `find-2k25-entrance-entry.js`, `locate-entrance-vectors.js`, `diff-2k25-entrance-entries.js`
- App: `tools\pipeline-editor-suite.js`, `bakeme-orchestrator.js`, `check-datactrlink-log.js`, `patreon-access.js`, `owner-build.js`, `stage-public-tools.js`
- → `AURORA-FORGE-TOOL-MAP.md` §1–3, §5

### CAK / Foundry
- `Aurora-CAK-Foundry\scripts\bake-v93-cli.js`, `verify-cak-extraction.js`, `verify-repackager.js`, `verify-raw-hash-roundtrip.js`, `verify-cak-catalog-coverage.js`, `verify-cak-v93.js`, `verify-cak-v93-protected-writer.js`
- `Aurora-CAK-Foundry\app\tools\cak-v93\FTribTool.exe` — `catalog-json`, `unpack-cak`, `unpack-file`, `pack -v 9.3`
- `electron\`: `cak-reader.js`, `cak-v99-key.js`, `cak-v93-backend.js`, `cak-v83-crypto.js`, `cak20-reader.js`, `archive-repackager.js`, `bakeme-validator.js`; services incl. `cak-collision-service.js`, `wwe2k25-loader-manager.js`, `operation-journal.js`, `entitlement-token.js`
- Entitlements: Cloudflare Worker `worker.mjs`/`shared.mjs`/`schema.sql`; Ed25519 tokens; `POST /v1/activate`; client pins public JWK, offline grace; never deletes data/terminates process on license failure
- → `AURORA-FORGE-TOOL-MAP.md` §3; `Aurora-CAK-Foundry\entitlements\README.md`

### Loader
- `Aurora-Forge-CAK-Mod-Loader-WWE2K25\src\plugins\mod_loader\mod_loader.cpp` — archive-boot mount design, SNME RVA `0x2e00a0`, `g_cak_mount(&path_view, nullptr, 2, 1)`
- `Secure-DataCtrlLink-WWE2K25\src\plugins\mod_loader\mod_loader.cpp` — native boot-burst mount, format `"%s%02d.cak"`, prefix `bakedfile`, index gate `6 <= NN <= 99`
- `src\core\profiles.{cpp,hpp}` — 4 profiles (2K25 v1.23 / SNME / 2K22 / 2K20)
- `src\shared\cak_validator.cpp`, `bank_builder.cpp`, `runtime_config.hpp`, `addon_registry.hpp`
- → `allfiles-05-flagship.md`

### Verification/QA
- Flagship `scripts\verify-package.js` (28.8 KB), `verify-final-portable.js`, `verify-mod-workshop-services.js`, `build-standalone-windows.js`, `build-true-portable-windows.js`, `create-final-portable-zip.ps1`, `recover-cak-paths-from-2k26.js`, `build-wwe2k26-catalog-from-registry.js`, `audit-extracted-layouts.js`
- Prototype tests: `node --test $tests` over `tools -g '*.test.js'` (120 passing at 2026-09-14 handoff; later 122/122 full suite, 38/38 focused) → `...\AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-14-CURRENT.md`; `...\notes\HANDOFF-2026-09-20-CURRENT.md`

---

## File-format findings

- **CAK FDIR version matrix:** 2K20 v6.8 / 2K22 v8.3 / 2K23 v8.7 / 2K25 v9.3 / 2K26 v9.9; FDIR prefix example `46 44 49 52 09 03 00 81` (FDIR v9.3). Header sizes: v6.8 = 88 B (8 prefix + 80 encrypted); v8.3 = 92 B (8 + 84). Flags stock/community `01 C0`; our v6.8 output `01 40`. → `...\notes\LOG-CAK.md`
- **Cipher evolution (CakeTool source):** v6.7 FNV1a-64→XOR-CRC; v6.8 MetroHash128crc_1→XOR-CRC; v8.1 same as 6.8; v8.2 ChaCha20+MetroHash→XOR w/ byte rotation; v8.3 ChaCha20+MetroHash→RotateCrypt; v8.7 ChaCha20+MetroHash+CRC→XOR-CRC; v9.1 same structure as 8.7; v9.2 ChaCha20+SFMT+MetroHash→XOR-CRC; v9.3 ChaCha20+SFMT+UnkHash→XOR-CRC. v8.3 header cipher = `RotateCrypt`; per-file data crypt differs. → same
- **SDB:** version u32 `256`; record count u32; sorted 12-byte records (offset, length, string id); rolling-XOR null-terminated UTF-8. → `...\analysis\2k25-tribute-entry-14000-findings.md`
- **`.clips`:** header `0xA0`; count @`0x10`/`0x14`; table @`0x18`; 16-byte records; sections @`0x20/0x38/0x60/0x78/0x90`; frame @`0x44`; fps @`0x0C`; record id = FNV-1a64(name). → `allfiles-05-flagship.md`
- **Group90:** LSB-first bitstream; descriptor `[i8 scale][u8 width][u16 0][f32 rest]`, `value = bits × 2^scale + rest`; native scalar expansion `float(highUint32Bits) + packedValue * ((signedLowByte + 0x7F) * 0x800000)`; later audit: exponent shifted into uint32 + MULSS = IEEE float bit reinterpretation. Token streams described both as ULEB128 varlen (54% 1-byte) and as fixed-width bit windows (10-bit @19/23/26) — see Corrections. → `...\Sept18th-2026\SESSION-SUMMARY.md`; `...\AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-14-CURRENT.md`; `...\notes\2026-09-14-2k22-update-checkpoint.md`; `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`
- **AMYM:** word at offset 4 = **group count** (not version; confirmed natively `FUN_141f00dd0`); directory begins at `16 + groupCount*16`, then entry sizes (u32), IDs (u16), padding to even ID count, consecutive payloads. AMYM byte-identical 2K20↔2K22; only entry-0 payload changes (YANM→TBUF). → `...\notes\2026-09-14-2k22-update-checkpoint.md`; `...\Aurora Forge Sept 20\Sanitized-Research\STATUS-SUMMARY.md`
- **YANM (2K20):** record = type(2) + headerLen(2) + hash32(4) + flags1(4) + count1(4) + zero(4) + float1/2/3(4 each, BE) + extras; types `0x8004` compact, `0xa000` extended, plus `0x0204/0x0304/0x2200/0x2300/0x4300/0x5300`; stream after headers; 4-byte keyframes (uint16BE delta + int16BE value). → `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`
- **TBUF/ANIM:** TBUF header 16 B = magic + version(1) + declaredBufferBytes(4) + **relocationCount @+12** (formerly misnamed channelCount); ANIM header 8 B = magic + version; relocation table at `TBUF+16+declaredBytes`; 64-bit **self-relative** pointers (value += own field address); ANIM versions v10 (2K22/23), v11 (2K24), v16 (2K25/26); TBUF v1/v2. → `...\notes\LOG-CAK.md`; `...\Aurora Forge Sept 20\Sanitized-Research\STATUS-SUMMARY.md`
- **Descriptor-selector model (2K22 TBUF bodies):** three layout types — simple (711 files: at60[1] matches prefix AND gap=20), descriptorExpanded (19: differs), offsetExpanded (12: matches but gap>20); descriptor = highByte scale level, midByte variant, low16 identifier; pre-computed by content pipeline, not runtime. Field-relative hypothesis REFUTED (words at payload+48/60/64/68 are descriptors, not offsets). → `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`
- **CutsceneNoRegistry:** 2,160 uoffset entry tables; 32 B shared vtable; f0@+8 motion id, f1@+12 nameString, f7@+24 hash, f8@+20 = -1. → `allfiles-05-flagship.md` (quoting `LOG-2K19-2K25-TRANSFER.md`)
- **`_textures.tdb`** must be preserved for raw v9.3 rebuilds; Foundry bookkeeping sidecar `.aurora-cak-external-references.json` is metadata-only and never packed. → `_worktrees\foundry-v93-verify\docs\AURORA_CAK_FOUNDRY_v1.7.7_FIX_REPORT.md`
- **Wwise/AKPK:** strict AKPK package-table validation; HIRC hierarchy reconstruction for custom music; `sound/Custom*.pck`, ≤16 packages, ≤64 MiB. → `Aurora Forge Sept 20\DataCtrlLink-MusicOnly\docs\ARCHITECTURE.md`; `Secure-DataCtrlLink-WWE2K25\SECURITY.md`

---

## Corrections / evidence conflicts observed in this batch

1. **"All 2K26 versions share one exe hash" was wrong.** v1.14, ORIG, and v1.16 have three distinct hashes; only v1.14 was SDCL-allowlisted in v1.7.5. → `_archive\handoffs\packages\(1) Prepare Aurora Forge....md`
2. **`bakedfile100.cak` "OOB record"** was a mixed snapshot during a live game update, not a new format; all 45 CAKs parse. → same
3. **Group90 numeric scale interpretation disproved:** native code shifts exponent into a uint32 and uses MULSS (IEEE float bit reinterpretation), so the old scalar helper + tests are not semantic validation. → `...\notes\2026-09-14-2k22-update-checkpoint.md`
4. **ULEB model refuted** (Sept 18) then re-used as "ULEB varlen" for token value streams (later Sept 18 entries). Treat "framing/token" terminology as unsettled; verify against stock-byte round-trip before trusting either. → `...\Sept18th-2026\SESSION-SUMMARY.md` vs `...\notes\ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md`
5. **"Group90 = opaque fixed 8-byte entries" (Sept 13)** superseded by the Sept-18 bitstream/descriptor crack. → `...\notes\2026-09-13-active-codec-blockers.md` vs `...\Sept18th-2026\SESSION-SUMMARY.md`
6. **Handoff staleness is a known hazard:** the 2026-09-14 transfer handoff was stale vs Git heads (`66fccdd` prototype, `5ed4e43` loader); always verify live state (`mods/`, `DataCtrlLink.log` tail, `git status`) before acting. → `...\notes\LOG-CONVERSATIONS.md`; `...\notes\HANDOFF-2026-09-19-CHATGPT-CODEX.md`
7. **Beta1.0.0a preview claim boundary:** portable converter/editor + entitlement preview only; loader timing/overlay = "coming"; TEST 14000/6185 picker visibility unproven. → `...\notes\HANDOFF-2026-09-20-CURRENT.md`

---

## Batch-2 files with zero task relevance (read, nothing to extract)

Ghidra 12.1.3 boilerplate (`.tools\ghidra_12.1.3_PUBLIC\...`): `docs\GhidraClass\BSim\BSimTutorial_Filters.md`, `BSimTutorial_Intro.md`, `docs\GhidraClass\Debugger\{README,A5-Navigation}.md`, `Extensions\Ghidra\Skeleton\README.md`, `Ghidra\Debug\AnnotationValidator\README.md`, `Debugger-agent-{dbgeng,drgn,gdb,lldb,x64dbg}\{README.md,pypkg\README.md}`, `Debugger-{api,importers,isf,jpda,rmi-trace}\README.md`, `Debugger-rmi-trace\pypkg\README.md`, `Debugger\README.md`, `Framework-TraceModeling\README.md`, `Ghidra\Features\*` (19 one-line READMEs), `Ghidra\Framework\{DB,Docking,Emulation,FileSystem,Generic,Gui,Help}\README.md`, `Ghidra\Processors\*` (15 one-line READMEs). Only substantive: `Features\PyGhidra\pypkg\README.md` (PyGhidra API for headless Ghidra scripting — potentially useful for future RE automation). Also empty/minimal: `_research\bakery-2.0.1\...\NuGetLicenses.md` (license table), `Aurora Forge Sept 20\Sanitized-Research\README.md`, `...\wwecrap\README.md`, `...\third_party\CakeTools-AlphaPreview\README.md`.

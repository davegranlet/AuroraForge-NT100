# HANDOFF 2026-09-19 — 2K19→2K25 animation converter (fork point)

Read first: this file, then `notes/LOG-2K19-2K25-TRANSFER.md` (active section log),
`notes/LOG-LOADER-GAMEDIR.md`, `notes/AUDIT-2026-09-19-WORKSPACE-CODE.md`, and the
canonical prompt at `D:\bot-crap\promptfordumbbots\AURORA_FORGE_CANONICAL_CONTINUATION_PROMPT.md`
(tail sections = current). Handoffs live in notes/, never in chat.

## Goal (fixed)
Build and validate a usable WWE 2K19 → WWE 2K25 entrance/victory animation converter
with runnable modern .clips/.adefs output and concrete verification evidence.
Additive-only; new IDs only; never overwrite stock game files; user launches games,
we read logs; no unscoped D: scans; all repos private, work on working branches.

## DONE / PROVEN (do not redo)
1. LOADER IS SOLVED FOR 2K25 + 2K26 — DO NOT REBUILD IT.
   - Working runtime pair restored to the game and content-verified:
     dinput8 `92C26247BCF9EC1F…`, ftrib `B8C8A7A9ABD4F07E…`
     (backup: `_work/game-cleanup-20260919/`).
   - Canonical product pair (Foundry bundle
     `Aurora-CAK-Foundry/app/data/loader-releases/wwe2k25-v123/`):
     dinput8 `FC0771822612DC5F…`, ftrib `84089A2CE223E08F…` — `84089A2C` is exactly
     the hash pinned by `Secure-DataCtrlLink-WWE2K25/tests/addon_registry_tests.cpp`.
   - Loader sources drifted AFTER the shipped binaries (signature gate blocks the
     2K25 SNME build; boot-burst hook never fires). 09-19 experiments
     (early-mount worker, CreateFileW trigger, signature bypass) are PARKED commits,
     not needed. Never "fix" the loader unless the task is explicitly loader work.
2. CLIPS CODEC CRACKED — group90 is an LSB-first bit stream; descriptor per channel
   = [i8 scale][u8 width][u16 0][f32 rest]; value = bits × 2^scale + rest.
   Stock decode→re-encode is bit-identical. Now shipped as one-function-per-file
   modules in `tools/clips-codec/` (26 files, 5/5 tests). Orchestrator
   `build-imported-clips.js` rebuilds the 6185 import byte-identical (`31A9A292…`).
3. REGISTRY FOUND — `Cutscene/CutsceneNoRegistry.jsfb` ("Cuts") feeds the victory
   motion-name picker: FlatBuffer vector of entry tables, id@+8, nameString@+12
   (verified: 6100 → "THE ROCK"). Modules: `find/rename/append-cutscene-entry.js`,
   tested (append = 0 invalid tables).
4. TRIBUTE RECIPE MEASURED (whole-folder hash diff, twice): a victory entry writes
   ONLY `Entrances/VictoryListData.jsfb` (new row) + `Sdb/ENG.sdb` (name). Nothing
   else changes anywhere. Their CakeView bake = the entire 129-file workspace,
   mounts fine under the proven loader.
5. ID TRUTH: union of Animation/Victory clips across all 15 archives = 1042 ids.
   TRUE 2K19-only ids = 19: 6104,6901,7001,7009,7012,7013,7100,7101,7105,7150,7153,
   7180,7181,7600,7602,7604,8050,8400,8755. 6185 is STOCK ("THE USOS 1").
6. Audit of the workspace (current/outdated/misplaced + refactor plan):
   `notes/AUDIT-2026-09-19-WORKSPACE-CODE.md`.

## OPEN (the actual remaining problem)
- Registry/UI table overrides do NOT surface in-game. Evidence: renamed stock
  entries (ZOMBIE→TEST 585858585, 6185→TEST 6185) and the appended Test 14000 row
  never appeared, while .clips overrides DO serve. Interpretation: the frontend
  reads its tables before/independently of our mount (mounts land at window-time);
  clips are read on demand so they serve. Unresolved: when exactly the game reads
  VictoryListData/CutsceneNoRegistry, and whether a pre-frontend mount is possible.
- Current staged test: `mods/tribute-bake-test-sept19.cak` (user's CakeView bake:
  654-row VictoryListData with row 14000 nameString −9543 "Test 14000"
  victoryFace 146, plus ENG.sdb and the whole workspace). Staged without manifest
  (scan mode). Verdict pending: does "TEST 14000" appear in the victory customizer
  template list (T section)?

## NEXT EXACT STEP
1. Launch with the staged CakeView bake and check for `TEST 14000` in the victory
   customizer (template list T section). If absent (expected), do NOT re-tune the
   loader: instead instrument WHEN the game reads the registry (e.g., log file opens
   of VictoryListData/CutsceneNoRegistry through the already-hooked paths, or
   compare the in-game list against the mounted file) and design the mount to precede
   that read.
2. Continue the file-per-function refactor batches: split `tools/clips-layout.js`,
   `tools/yanm-keyframes.js`, `tools/score-group90-op0.js`, `tools/append_2k25_*.js`
   the same way; then mirror in Aurora-Forge-Clips-Tools; regenerate
   `REPO-FUNCTION-INVENTORY.md` + `LOG-TOOL-CATALOG.md`.
3. Keep using user-created Tribute rows as the registration oracle; our own tools
   (append_2k25_victory_entry.js + append_2k25_sdb_string.js) already reproduce that
   delta byte-level.

## Key paths
- Game: `C:\WWE 2K25 Saturday Nights Main Event\` (mods/, plugins/, DataCtrlLink.log)
- Sources: `C:\Games\2k20extracts\Root`, 2K19 install `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19`
- Repos: workspace `D:\AuroraForge-Aug26\` (audit lists all), active:
  `WWE2K19-to-2K26-Entrance-Prototype` (notes/tools), `Aurora-CAK-Foundry`,
  `Secure-DataCtrlLink-WWE2K25/WWE2K26`, `Aurora-Forge-CAK-Mod-Loader-WWE2K25`
- Scratch: `_work/` (never committed), Temp `C:\Users\dgran\AppData\Local\Temp\opencode\`

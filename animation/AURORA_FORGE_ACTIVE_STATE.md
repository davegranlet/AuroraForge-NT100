# Aurora Forge Active State

Last updated: 2026-09-22, continuation prompt reconciled (its fix-it list is superseded)

## Continuation prompt reconciled; fix-it list superseded — 2026-09-22

- Trigger: user asked to review `AURORA-FORGE-CONTINUATION-PROMPT-2026-09-21.md` and report. That prompt's §4 fix-it list is a 2026-09-21 snapshot and is now **stale**. Treat this ledger and the live code as authoritative over that prompt.
- Superseded item §4.1 "6 missing registration writers (the REAL blocker)" -> **DONE 2026-09-21** (see the entry below): writers exist for teams, character-mapping, cammove, face-textures, charmoveset, charprofilepro, charprofiletable, hide-ctrl, plus `jsfb-append-lib.js` and `parse-2k25-jsfb.js`; wired into `bakeme-orchestrator.js` (8 config blocks) and `pipeline-editor-suite.js`; 38/38 tests green.
- Superseded item §4.2 "Loader pre-window timing unsolved" -> **DONE**: boot-thread mount injection is verified on WWE 2K25 v1.23 and SNME. The suite states: "The next gate is generated TEST 14000 picker and preview evidence, not loader timing."
- True open item (unchanged from the 2026-09-21 writers entry): run one orchestrated BakeMe adding 14000 rows across all tables -> bake via Foundry/FTribTool -> verify reopen/payload -> **user-run** stage-and-launch for the TEST 14000 picker/preview verdict. Open semantic question: roster-side id choice for Pro/Table/Face (they mint the caller-supplied character id).
- Housekeeping still pending: §4.4 tidy commits, §4.5 `app/dist` gitignore/untrack, §4.3 guard-hash discipline on every addon rebuild.
- Game-folder note (House Rule 2 violation to clear before the next test): `C:\WWE 2K25 Saturday Nights Main Event\mods` was holding two CAKs (`cakeviewtest.cak` + `thisistest2.cak`). Stage exactly one registry CAK per test.
- Do-not-repeat (canonical homes; do NOT re-create): extraction = `tools/extract_2k19_pac.py` + `tools/extract_2k19_archive_entries.js`/`inspect_2k19_archive.js`; 2K25 list = `tools/parse_2k25_victory_list.js` + `tools/find-2k25-entrance-entry.js`; batch pattern = `tools/batch-2k19-to-2k20-victory-packages.js`; registration = the `append_2k25_*` writers driven by `tools/bakeme-orchestrator.js`; 14000 reuse = `tools/copy-working-14000-registration.js`.
- Session cleanup owed: this session added redundant wrappers (`extract-2k19-animations.js`, `build-2k25-animation-inventory.js`, `convert-2k19-library-to-2k25-entries.js`, `convert-2k19-to-2k25-new-entry.js`, `2k25-animation-inventory.json`) plus a 2K25 Test Manager, `owner-build.js`, `game-process-check.js`, and a bundled embeddable Python. Nothing committed. Being reverted unless the owner keeps them.

## thisistest2 exact Tribute bake staged - 2026-09-21

## thisistest2 exact Tribute bake staged - 2026-09-21

- User supplied exact source: `D:\wwe 2k25 mods\TRibute-1.20\TRIBUTE 25 v1.20\TRIBUTE 25\BakeMe`. No registration writer or other mutation was applied; the directory was baked exactly as supplied.
- Preflight/source inventory: 128 files, 82,140,812 bytes. Source validation found `BOB ENTRANCE A/B/C` as SDB IDs `4294957742..4294957744`; Victory rows `14000..14002` exist but reuse those three name IDs. `BOB VICTORY A/B/C` are not separate records, confirming the user's observation that Tribute saved the victory changes as templates rather than separately named strings.
- Foundry CLI: `scripts/bake-v93-cli.js` with the bundled self-contained `FTribTool.exe`, Oodle, FDIR 9.3 and encrypted header. The first DLL-backed invocation safely refused because the checkout's configured .NET 9 host was absent and created no output; the self-contained backend succeeded.
- Verification: `verified=true`, `payloadVerified=true`, 129 archive files (128 sources plus generated texture metadata), 37 converted textures, 82 folders. Output is 55,837,764 bytes, SHA-256 `191E49AECCB9A520D729FEEBA39F797177E8E9C7F113EA8718ABBECC8DAC206B`.
- Source artifact: `D:\wwe 2k25 mods\TRibute-1.20\TRIBUTE 25 v1.20\TRIBUTE 25\thisistest2.cak`.
- Clean stage: moved the prior complete `mods` tree to `C:\WWE 2K25 Saturday Nights Main Event\aurora-disabled-tests\mods-before-thisistest2-20260921-024705` (it preserves `backups\this-is-the-test.cak`), created a new `mods` directory, and staged only `mods\thisistest2.cak`. Staged hash exactly matches source. No `addons` directory exists; `plugins`, loader binaries and configuration were untouched. WWE 2K25 was not running and was not launched.
- Next action: user launches WWE 2K25 and reports mount/menu behavior plus how the three entrance and three victory templates appear.

## Six missing registration writers built — 2026-09-21

- Exact action: executed continuation-prompt fix-it #1 offline (no loader rebuild, no staging, no game launch, nothing committed). Four parallel layout specs + direct verification against the bobnobob oracle (`analysis/this-is-the-test-cak/extracted-root`).
- New tools (all function+CLI dual API, all with node:test suites): `tools/jsfb-append-lib.js` (negative-soff-aware splice primitives + ref-repair prover), `append-2k25-teams-entry.js`, `append-2k25-character-mapping-entry.js`, `append-2k25-cammove-entry.js`, `append-2k25-face-textures-entry.js`, `append-2k25-charmoveset-slot.js`, `append-2k25-charprofilepro-entry.js`, `append-2k25-charprofiletable-entry.js`, `append-hide-ctrl-entry.js` (motion op only).
- Pattern per file: clone a same-shape stock record, patch ID/name words only, splice one vector slot, repair every crossing reference, validate count+1 + new row + every old row identical (+ full ref-repair proof for nested/multi-section files).
- CORRECTION to the BOBNOBOB handoff: HideCtrl has NO name-id registration. The sole candidate word (s14 rec69 table+188 = 0xFFFFDAAE) is the soff header of interleaved slot67 (table @861456 -> vtable @871010, soff -9554 colliding with SDB id 4294957742), verified by probe. The genuine HideCtrl pattern is motion rows (s0/s17 field-0 low-u16; oracle 14004). No name writer built; building one would corrupt live tables.
- Same soff-collision caution applies to raw u16/u32 scan counts generally (CharMoveSet motion hits are SDB-low-half noise; FaceTextures/CharMapping hits are slot/hash interiors). Only field-resolved references were used.
- Wired: `bakeme-orchestrator.js` accepts 8 new config blocks (teams/charmapping/cammove/facetextures/charmoveset/charprofilepro/charprofiletable/hidemotion) with verify ops; `pipeline-editor-suite.js` gains the `Extended registration tables` active/write artifact; `scripts/stage-public-tools.js` allowlist +9 (57 staged, audit passes). Victory/Entrance suite items renamed to match the suite's own test contract and flipped to active (writers exist; gaps still note in-game proof pending) — this also fixes the one pre-existing suite failure.
- Validation: 38/38 green (26 new writer tests + orchestrator/pipeline/sdb/cutscene suites). Oracle files read-only throughout; game folder untouched (`mods` still holds only `this-is-the-test.cak`).
- Next concrete action: run one orchestrated BakeMe adding 14000-rows across all tables, bake via Foundry/FTribTool, verify reopen/payload, then user-run stage-and-launch for the picker verdict. Roster-side id choice (Pro/Table/Face mint the caller-supplied char id; oracle never shows the motion id there) is the open semantic question for that test.

## Native mount observer safe diagnostic pair installed — 2026-09-19

- Trigger: read and acted on `D:\worker-communication.md`, including `notes\HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`.
- Finding: the mount-detour implementation described in the handoff was present in `Secure-DataCtrlLink-WWE2K25\src\plugins\mod_loader\mod_loader.cpp`, but the actual `.ftrib` build path is the separate `Aurora-Forge-CAK-Mod-Loader-WWE2K25` repo. The installed game pair before action was the stable fallback pair: core `0BE398DA94F2913F05DAA3082DACE0803DB0CEE1BB25EC91D194E088D57BC563`, addon `2AA4C21D8CDFD814136D12298D0BDAB86541E1F2DCF1047BD988A087EACFF3F7`, mod `tribute-bake-test-sept19.cak`.
- Exact action: ported a diagnostic-only native mount observer into `D:\AuroraForge-Aug26\Aurora-Forge-CAK-Mod-Loader-WWE2K25\src\plugins\mod_loader\mod_loader.cpp`. It hooks the mount RVA, logs only the first game-origin native call thread/index/raw pointer values, then falls through. To preserve fallback behavior after the hook, the existing fallback mount pointer is redirected to the MinHook trampoline. The old worker-thread early mount is now gated behind `EarlyPreWindowMount=1` and is off by default.
- Addon build: `D:\AuroraForge-Aug26\Aurora-Forge-CAK-Mod-Loader-WWE2K25\build\AuroraForge.CAKModLoader.ftrib`, SHA-256 `DFB9BFA98F582C5751548953334CA2E86332B8385BB1360C3F1399682652E70B`, size 1,636,864 bytes. Addon tests passed: status message, manifest, runtime config, collision.
- Core registry/build: prepended the exact addon hash as `Aurora Forge CAK Mod Loader - WWE 2K25 native mount observer safe diagnostic build`; rebuilt `D:\AuroraForge-Aug26\Secure-DataCtrlLink-WWE2K25\build\dinput8.dll`, SHA-256 `4962599F25E6E1D75B520A4FFDF0B9DABCC5AB74706DC6D1FD0320F5AEBDC480`, size 1,609,728 bytes. Core tests passed: addon registry, runtime config, status message.
- Installed into `C:\WWE 2K25 Saturday Nights Main Event\`: `dinput8.dll` hash `4962599F25E6E1D75B520A4FFDF0B9DABCC5AB74706DC6D1FD0320F5AEBDC480`; `plugins\AuroraForge.CAKModLoader.ftrib` hash `DFB9BFA98F582C5751548953334CA2E86332B8385BB1360C3F1399682652E70B`. No WWE process was running during install.
- Next user-run evidence needed: launch once with default config. Expected useful line if the RVA is in the native boot burst: `Native mount detour first call: thread=... index=...`. If no such line appears but fallback still mounts, re-derive the native mount RVA rather than retrying timed worker-thread mounts.

## Loader pre-window gates added; non-crashing baseline staged — 2026-09-19

- Exact action: gated the experimental pre-window mount path behind opt-in `DataCtrlLink.ini` keys and returned the installed loader to the known non-crashing window-thread fallback. `Aurora-Forge-CAK-Mod-Loader-WWE2K25` now parses `RuntimePreWindowMount`, `EarlyPreWindowMount`, and `DxgiOverlayNotice` (each `0`/`1`, default `0`); `PluginInit` starts the runtime-ready worker and the stock-archive early worker only when their gate is set, and the DXGI Present hook installs as a diagnostic no-op that never draws unless `DxgiOverlayNotice=1`. The same `runtime_config` change was mirrored into `Secure-DataCtrlLink-WWE2K25` so the shared copies stay byte-identical.
- Builds: addon `AuroraForge.CAKModLoader.ftrib` SHA-256 `a808a933545e94e1b2400858c478b969cf80f4aea69b0c9fa61a0ffb0641f8e4`, 1,644,544 bytes. Core `dinput8.dll` SHA-256 `1560642598000d0862c4082b327d27deba21384053ccfd78984e7953d5874f76`, 1,607,168 bytes. Registered the new addon as `Aurora Forge CAK Mod Loader - WWE 2K25 gated pre-window diagnostic build` (10th approved entry) and re-pinned `addon_registry_tests`.
- Validation: addon tests pass (status message, manifest, runtime config, collision); core tests pass (addon registry, addon selection, status message, runtime config). Built binaries contain the new gate strings. Backed up the prior crashing pair to `_work\loader-crash-build-backup-2026-09-19\` (hashes `02d6bff6...` / `447b878e...`), then staged the new pair into `C:\WWE 2K25 Saturday Nights Main Event\`; installed hashes match the builds. `mods\` still holds only `aurora-14000-compat-v103a.cak` (56,080,748 bytes).
- What it proves: the installed loader now defaults to the window-thread mount path that previously loaded v103a without crashing, and both too-early pre-window workers are disabled unless explicitly enabled. It does not prove any pre-window timing fix.
- Next concrete action (user-run): launch WWE 2K25 once and confirm it reaches the menu with no new crash dump and a window-thread `ACCEPTED CAK aurora-14000-compat-v103a.cak`. Then re-enable one gate at a time (`EarlyPreWindowMount=1` first) via `DataCtrlLink.ini` to binary-search a safe pre-frontend mount.

## DXGI overlay/runtime-prewindow loader test failed in live game — 2026-09-19

- Exact action: built and installed a new CAK Mod Loader addon with a DXGI `Present` hook for an in-frame mod-status notice plus a runtime-ready pre-window CAK mount worker. Rebuilt Secure DataCtrlLink with the exact addon hash approved. Installed into `C:\WWE 2K25 Saturday Nights Main Event\`.
- Installed core: `dinput8.dll`, SHA-256 `02D6BFF68BDEB169F613D19F7820F02513541D7B151069171DE31B282DE3E91C`, size 1,605,120 bytes.
- Installed addon: `plugins\AuroraForge.CAKModLoader.ftrib`, SHA-256 `447B878E5973BAADC75A2379508BC82B8191A9F6137CA321F81F72FF444C3C33`, size 1,642,496 bytes.
- User launched twice. Latest launch block starts `2026-09-19 19:27:18`. Log proves the new core/addon loaded, file-open observers installed, `Installed in-game DXGI Present overlay hook for mod-status notice`, and `Runtime transition observed; beginning immediate pre-window mod mounts`.
- Failure: the log never mentions `aurora-14000-compat-v103a.cak` in the latest session and records no `PRE-WINDOW ACCEPTED`, no fallback accept, no mount failure line, and no overlay queued line. `tools/check-datactrlink-log.js` reports `status: wrong_cak_or_no_mount`.
- Crash evidence: no game process remained after launch. Fresh local dumps were written: `C:\Users\dgran\AppData\Local\CrashDumps\WWE2K25_x64.exe.2240.dmp` (475,854,567 bytes, SHA-256 `6086A9C41FDF747334C1DF701C0CE0E150CC261EDA0DD5B2995A7D9A23FAFCCF`, 19:26:11) and `C:\Users\dgran\AppData\Local\CrashDumps\WWE2K25_x64.exe.15308.dmp` (475,842,970 bytes, SHA-256 `5409143DB7BB9760DFBE214394103D2BB86B79689003A6C14AB640F210B1E9B9`, 19:27:22).
- Analysis boundary: the runtime-ready pre-window mount is too early for WWE 2K25 v1.23 and likely crashes in or immediately around the native mount routine before per-archive success/failure logging. The DXGI hook install alone did not crash, but the in-game rendered notice was not verified before process death. No local CDB/WinDbg/dumpchk was found; only LLVM obj tools are available.
- Do not ship this loader build as the Beta game-serving path. Next safe loader action: disable or gate the runtime-ready mount worker and return to a non-crashing launch baseline, then pursue a safer pre-frontend trigger. The portable app can still ship as a preview of the editor/orchestrator/entitlement tooling if the loader timing is clearly marked coming.

## Beta1.0.0a portable preview rebuilt with current manifest — 2026-09-19

- Exact action: updated `tools/check-datactrlink-log.js` to recognize runtime-ready and DXGI overlay evidence, updated `tools/pipeline-editor-suite.js` so the log checker is active while loader timing and in-game overlay remain coming/unverified, ran focused tests, staged the public allowlist, and rebuilt the portable app.
- Artifact: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\Aurora-Forge-Beta1.0.0a-Preview.exe`, 76,031,009 bytes, SHA-256 `F556E4C34CF2A08020966611828CE58DA8CC335D6AA0EF92837CD3540C8A00FE`.
- Public staging: `30` allowlisted tool files in packaged resources; `check-datactrlink-log.js` and `pipeline-editor-suite.js` are present. Research/future pipeline scripts remain excluded by fail-closed allowlist.
- Validation: focused suite passes `38/38`; addon tests pass (status message, manifest, runtime config, collision); core tests pass (addon registry, status message, runtime config). The unpacked app launched hidden and stayed alive for 6 seconds before the smoke test closed it.

## Loader timing build installed with visual status notice — 2026-09-19

- Exact action: in `Aurora-Forge-CAK-Mod-Loader-WWE2K25`, tightened early mount timing from a 2s post-stock-open delay to an immediate 100ms pre-window attempt with 250ms retries, added race logging if Victory/Cutscene/SDB table reads happen before the first pre-window mount, and added a 10-second topmost visual notice: `mods: loaded` when at least one CAK mounted cleanly, otherwise `mods: unloaded`. Fixed the first-stock-open path log to use UTF-8 conversion instead of narrowing wide characters directly.
- Build: rebuilt `AuroraForge.CAKModLoader.ftrib`, SHA-256 `F6BC859A3390EE636360DDD155C98CB036514FA7C3F50A8BA4F9757DBF65681A`, size 1,634,816 bytes. Local addon tests run: status message, manifest, runtime config, collision = pass.
- Secure DataCtrlLink: registered the new addon hash as `Aurora Forge CAK Mod Loader - WWE 2K25 immediate pre-window visual-status development build`; rebuilt core `dinput8.dll`, SHA-256 `D2D58580161FCD8A2E8AC10FC1BF30BA923DC6B1C5E62BCE0C5B883FF151D745`, size 1,605,120 bytes. Core tests run: addon registry, status message, runtime config = pass.
- Game install: verified no WWE2K25 process was running, then copied the rebuilt `dinput8.dll` and `plugins\AuroraForge.CAKModLoader.ftrib` into `C:\WWE 2K25 Saturday Nights Main Event\`. Installed hashes match build hashes exactly. `mods\` still contains only `aurora-14000-compat-v103a.cak` (56,080,748 bytes) from the prior verified state.
- Added `tools/check-datactrlink-log.js` plus tests to grade the latest `DataCtrlLink.log` session for expected CAK, pre-window acceptance, fallback-only mounts, table-read timings, and race warnings. Baseline run against the current log correctly reports the old 17:25 session as `fallback_only` with no file-open observer/timing evidence; no new game launch has occurred since installing the new loader pair.
- Next concrete action (user-run): launch WWE 2K25 once. Expected evidence: `DataCtrlLink.log` should show `Game file-open observers installed`, first stock archive open timing, `PRE-WINDOW ACCEPTED CAK aurora-14000-compat-v103a.cak`, any table-read timing lines, and a visual notice around 10 seconds later saying `mods: loaded` if mount succeeded. Then check whether `TEST 14000` appears in the motion picker and preview it.

## Beta1.0.0a portable preview rebuilt with BakeMe orchestration — 2026-09-19

- Exact action: added `tools/bakeme-orchestrator.js`, a config-driven full BakeMe tree orchestrator. It copies a source BakeMe directory to a fresh output directory, applies allowlisted asset copies and active registry/string edits (SDB, Victory, Entrance, Cutscene), then writes `aurora-bakeme-proof.json` with operations and per-file hash/size changes. Added `tools/bakeme-orchestrator.test.js`, updated `pipeline-editor-suite.js` so `BakeMe tree` is now `active`/`write`, and shipped the orchestrator in the public tool allowlist.
- Artifact: rebuilt `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\Aurora-Forge-Beta1.0.0a-Preview.exe`, 76,031,648 bytes, SHA-256 `8E8F3914115FD7A410F699E5C76A966412DE8AB7A6329C70178F4C04509B095B`.
- Validation: focused suite passes 34/34 including the new BakeMe orchestrator test. `npm run prestage` stages 29 public files. Packaged resources show 10 active items and 1 coming item (`DataCtrlLink loader timing`). Rebuilt unpacked app launched hidden and stayed alive for 6 seconds before the smoke test closed it.
- Remaining before claiming in-game converter success: DataCtrlLink pre-frontend mount timing and the user-run TEST 14000 in-game picker/preview proof.

## Beta1.0.0a portable preview built — 2026-09-19

- Exact action: continued the Beta1.0.0a Patreon preview goal. Hardened the entitlement contract so the app refuses weak verifier responses and accepts two strong proof paths only: active Patreon tier proof or Discord VIP role proof (`entitlementMethod: "discord_guild_role"` with guild/user/role match). Added tests for Discord VIP allow/deny/missing-identity cases and session expiry. Updated `app/PATREON_ACCESS.md` with the recommended Patreon→Discord VIP role verifier setup and required environment variables.
- App/package changes: `app/package.json` now emits `Aurora-Forge-Beta1.0.0a-Preview.exe`; app UI labels the build as Beta1.0.0a, shows active/coming converter scope, and loads `pipeline-editor-suite.js` from packaged resources. `scripts/stage-public-tools.js` now ships 28 allowlisted public files: the proven 2K19→2K20 runtime closure, entitlement gate, Beta manifest, and active 2K25 registry/SDB editor tools; tests and broad research scripts remain excluded.
- Artifact: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\Aurora-Forge-Beta1.0.0a-Preview.exe`, 76,028,440 bytes, SHA-256 `3F368A5FA4E8041ACB40BFD14370AF9E97056B7D6993B55529D43A3D1A0D5D87`.
- Validation: focused suite passes 33/33 (`patreon-access`, pipeline editor suite, Cutscene registry, SDB reader, Entrance finder/diff). `npm run package` completed successfully. Packaged `resources\aurora-tools\tools` contains 28 expected allowlisted files, including active editor modules. Rebuilt unpacked app launched hidden and stayed alive for 6 seconds before the smoke test closed it.
- Release note: wrote `notes/BETA1.0.0a-PATREON-PREVIEW-2026-09-19.md` with artifact path, hash, Discord verifier setup, active/coming scope, and verification commands.
- Remaining before calling the overall converter goal complete: the Beta portable exists, but the full 2K19→2K25 in-game converter remains incomplete until the coming BakeMe orchestrator and DataCtrlLink pre-frontend mount timing are implemented and TEST 14000 is visible/previewable in WWE 2K25.

## Editor suite promotion: active/coming map — 2026-09-19

- Exact action: resumed from `notes/HANDOFF-2026-09-19-CHATGPT-CODEX.md`; verified live game state still matched the handoff (`mods` contains only `aurora-14000-compat-v103a.cak`; `DataCtrlLink.log` still ends at 17:25:53 with `accepted=1 rejected=0 failed=0`). Promoted the named Temp one-offs into repo-owned tools/tests instead of leaving them in `C:\Users\dgran\AppData\Local\Temp\opencode`.
- Result: added `tools/pipeline-editor-suite.js` as the current active/coming capability map for the 2K19→2K25 pipeline. Active now covers source intake readers, `.clips` build/inspect, VictoryListData write, EntranceListData write/diff/find, CutsceneNoRegistry write/find/inspect, SDB read/summary/write, and CAK catalog inspection. Coming remains BakeMe full-tree orchestration and DataCtrlLink pre-frontend/game-serving timing. Added `tools/clips-codec/inspect-cutscene-registry.js`, `tools/diff-2k25-entrance-entries.js`, `tools/cak-catalog-summary.js`; strengthened `append-cutscene-entry.js` with strict post-append validation; extended `sdb-read.js` with printable/decodable summary.
- Validation: focused suite passes 17/17 with `node --test tools\clips-codec\cutscene-registry.test.js tools\sdb-read.test.js tools\find-2k25-entrance-entry.test.js tools\pipeline-editor-suite.test.js`.
- Cleanup: deleted only the handoff-named Temp files after promotion: `cut-append-shared.js`, `sdb-read.js`, `sdb-scan.js`, `entry-diff.js`, `ent-diff.js`, `ent-find.js`, `cut-sizes.js`, `cut-dump.js`, `cut-vdist.js`, `cat-sum.js`.
- Next concrete action: build the coming BakeMe orchestration layer that applies the active registry/string/asset editors to a copied full BakeMe tree and emits per-file proof, then continue to flagship app section wiring. Loader reinstall + PRE-WINDOW launch test remains queued behind cleanup.

## ChatGPT/Codex handoff prepared — 2026-09-19

- Exact action: at user's request (working from ChatGPT/Codex only), wrote self-contained `notes/HANDOFF-2026-09-19-CHATGPT-CODEX.md`: open order, corrected one-app mission, verified live snapshot (hashes, log line, staged/disabled sets), compressed converter story with no-redo markers, ordered queue (Temp promotions → flagship extension → loader reinstall + PRE-WINDOW test), hard constraints, key paths. Verified Temp script inventory + disabled set + baselines before writing.
- Result: handoff is complete and current as of ~17:30 Eastern state. Nothing staged, installed, or committed while writing it.
- Next concrete action: resume in whichever chat the user opens next, starting from the handoff's queued work §1 (Temp promotions).

## Model-switch review: drift caught, one-app course set — 2026-09-19

- Exact action: new model instance re-read `AURORA_FORGE_ACTIVE_STATE.md` (352 lines), `AURORA_FORGE_CONVERSATION_LEDGER_2026-09-19.md`, and verified live state before acting. Verified: `mods/` stages only v103a (56,080,748 bytes), loader log at 552 lines ending 17:25:53 `accepted=1 rejected=0 failed=0`; Clips-Tools tree holds 33 dirty entries (31 deletions + README/package.json pointer stubs, uncommitted); SDCL working branch holds 2 modified files (A1ED registry entry + test pin); Mod-Loader main holds 1 modified file (file-open observer); new loader binaries still only in repo build dirs, never installed. Zero mismatches.
- Full-conversation review (for the class record — how drift happens): the session began as pure converter crash-isolation (v102k post-mount crash → untouched control proves Tribute 26 v1.6.0 base itself crashes 2K25 → web confirms Tribute 26 is the 2K26 line → v103a transplant on the 2K25 family loads clean but TEST 14000 never surfaces in the picker → diagnosis converges on mount timing, not package content). Each step was evidence-driven and correct in isolation — yet the whole thread had silently narrowed "Aurora Forge" to "the converter plus its loader."
- Drift checkpoint: user asked why none of the existing repo tools were being reused, then corrected scope explicitly — Aurora Forge is a consolidated modding tool that does EVERYTHING; the converter is one small section. Three-agent audit of all 27 repos confirmed the flagship shell already exists (`AuroraForge_WWE_PC-Game_Modding_Tool` v1.7.5 Electron) with every tool mapped to a section. Lesson worth showing: no single decision was wrong, but without re-reading the actual project goal, competent execution walked away from it. The continuity guard (read the log first, compare with workspace, record mismatch) is what caught it — process, not brilliance.
- Cleanup status: Clips-Tools retired as code home (31 files deleted, pointer stubs left, uncommitted); canonical clips home `Prototype/tools/clips-codec/`, suite 8/8 green. Temp one-offs (shared-vtable Cutscene append, SDB scanner, entry diffs) still await promotion into repo tools with tests. Nothing committed anywhere; app/dist tracked outputs flagged for user decision.
- Next concrete action (authorized "yes"): continue hygiene — promote Temp one-offs into repo tools with tests — then extend the flagship app per section map. Loader reinstall + PRE-WINDOW launch test stays queued behind this work.

## Continuity reopen verification — 2026-09-19

- Exact action: read `AURORA_FORGE_ACTIVE_STATE.md`, `AURORA_FORGE_CONVERSATION_LEDGER_2026-09-19.md`, `DEEPSEEK_V4_1_HANDOFF_2026-09-19.md`, and the ledger final task prompt in order; compared with live `C:\WWE 2K25 Saturday Nights Main Event\mods`, `aurora-disabled-tests`, `DataCtrlLink.log` (525 lines), CrashReporter/crashpad, local CrashDumps, and `D:\AuroraForge-Aug26\_work\14000-tribute26-v160-v102j`.
- Matches: exactly one CAK enabled (`aurora-14000-tribute-v160-v102k.cak`, 10,365,112 bytes, SHA-256 `C1DE81250FE0CAA33246EED9FDB156835764EBA9D496CF6D6ACC5831996D4ACA`, identical in mods and _work); disabled area holds `aurora-14000-testv102g.cak`, `aurora-6185-testv102f.cak`, `tribute-bake-test-sept19.cak`; loader log ends at 15:43:20 with `ACCEPTED CAK aurora-14000-tribute-v160-v102k.cak` and `accepted=1 rejected=0 failed=0`; no later launch lines exist.
- Mismatch 1: the recorded 70,592,896-byte 15:43:22 minidump was not found in live `CrashReporter/Crashes` (only 2026-09-12 46,620,912-byte report), local `CrashDumps` (no WWE2K25 entry), or game-root recent writes; `DataCtrlLink.log` contains no CrashReporter/dump line. Crash occurrence still stands on user report plus mount-then-silence log evidence, but the dump file path is unverified and must be re-supplied before stack analysis.
- Mismatch 2: two undocumented control archives predate v102k in `_work\14000-tribute26-v160-v102j` — `control-original-tribute-v160.cak` (4,398,236 bytes, 15:13:14) and `control-original-unencrypted.cak` (4,398,236 bytes, 15:13:38) — plus `aurora-14000-tribute-v160-v102j.cak` (4,643,346 bytes, 15:11:33). None are described in the Active Log or ledger. They must be inspected for source/flags before being treated as the required untouched full-aggregate control; the control task is not yet proven done.
- Result: crash-isolation boundary holds; v102k remains staged alone and must be preserved. No package was replaced, staged, or launched during verification.
- Next concrete action: inspect the two existing control CAKs (source tree, FTribTool flags, payload verification) against the untouched Tribute 26 v1.6.0 BakeMe; build the missing correct untouched full-aggregate control only if neither qualifies; then stop at the stage-and-launch boundary for the user-run control test.
- Boundary: `D:\zips` is the user's private folder and must not be touched (user directive 2026-09-19).

## Control-isolation offline progress — 2026-09-19

- Exact action: unpacked staged v102k with FTribTool DLL to temp; compared all five 14000 key files against the `_work` BakeMe source; probed the three pre-existing archives (`control-original-tribute-v160.cak`, `control-original-unencrypted.cak`, `aurora-14000-tribute-v160-v102j.cak`) via catalog/unpack; checked local debugger availability.
- Result: v102k unpack yields 64 files; all five key payloads are byte-identical to source (`14000.clips` `31A9A292...`, `14000.adefs` `01FD0B9B...`, Victory/Cutscene/SDB match). All three pre-existing archives are corrupt partials (`Num Files: 1653179904`, `Parameter 'length'` / index-bounds failures) and must never be staged. No CDB/WinDbg on PATH and no SDK Debuggers folder, so dump-stack analysis is blocked locally.
- What it proves: v102k offline payload recovery is independently confirmed; the required untouched full-aggregate control does not yet exist in valid form. Reversing the DB patches with our own writer is unsafe for a control (our Victory writer uses a fixed fresh layout, so the result would not be byte-identical to the untouched base and could confound the crash signal).
- Next concrete action: obtain the pristine Tribute 26 v1.6.0 BakeMe source path and the 70MB 15:43:22 dump file location from the user; then bake the untouched control with FTribTool, verify reopen, and stop at the stage-and-launch boundary.

## Untouched control baked and verified, staging boundary — 2026-09-19

- Exact action: user supplied the pristine source `D:\WWE26-mods\compiled releases for review\TRIBUTE 26 v1.6.0\TRIBUTE 26\BakeMe` and dump `C:\Users\dgran\AppData\Local\WWE 2K25\CrashReporter\Crashes\reports\2edea632-b9d0-4286-8aa1-ba60c14f44e2.dmp`; verified source (62 files, 19,841,251 bytes, Victory 713 rows / 0x14000, Cutscene 2,342 entries / null-14000, SDB 7,252,991 bytes / no TEST 14000, no 14000 assets) and dump (70,592,896 bytes, 15:43:22) before use. Copied the tree to `_work\control-untouched-v160\BakeMe` (62 checked, 0 bad, 0 extra) and baked with the headless Foundry CLI (`bake-v93-cli.js`, FTribTool DLL, `--encrypt-header`) under its final filename `control-untouched-tribute-v160.cak`. Also confirmed the old canonical ledger `D:\promptfordumbbots\AURORA_FORGE_CANONICAL_CONTINUATION_PROMPT.md` is absent (continuity failure stands until restored).
- Result: Foundry reports `verified=true`, `payloadVerified=true`, `fileCount=62`, `sourceFileCount=62`, `folderCount=39`, 10,120,488 bytes, SHA-256 `AE2AAD53D5A61A5EBF9742CED6A87FB9CF827E64FD264768CEB597B1367739E7`. Independent FTribTool unpack yields 62 files, all byte-identical to source (62 checked, 0 bad); unpacked Victory has 713 rows and no 14000 asset exists. No reverse-patching was done.
- What it proves: a runnable, independently verified untouched full-aggregate control exists offline. It proves nothing in-game yet.
- Next concrete action (user-run): reversibly move `mods\aurora-14000-tribute-v160-v102k.cak` to `aurora-disabled-tests` (preserving hash), stage only `control-untouched-tribute-v160.cak`, launch WWE 2K25 once, and report launch vs identical post-mount crash. Control was NOT staged; v102k remains the only enabled CAK.

## Control staged as fresh test — 2026-09-19

- Exact action (user granted full PC access): moved `mods\aurora-14000-tribute-v160-v102k.cak` to `aurora-disabled-tests` with SHA-256 preserved (`C1DE81...4ACA` both sides); staged a fresh copy of `control-untouched-tribute-v160.cak` as the only file in `mods` (staged SHA-256 `AE2AAD53D5A61A5EBF9742CED6A87FB9CF827E64FD264768CEB597B1367739E7`, matches source). Root holds stock bakedfiles only; loader pair untouched (dinput8 `92C26247...`, the known-good runtime). `DataCtrlLink.log` baseline is 525 lines; no game process is running.
- What it proves: the game folder is 100% ready for the control launch; exactly one registry-bearing CAK is enabled. Nothing about in-game behavior is proven yet.
- Next concrete action (user-run): launch WWE 2K25 once and report whether it reaches the menu or crashes ~2s after mount.

## Control verdict: base aggregate incompatible — 2026-09-19

- Exact action: user launched with only `control-untouched-tribute-v160.cak` staged. Loader log (lines 526-543) shows two sessions (16:27:01, 16:29:07), both `ACCEPTED CAK control-untouched-tribute-v160.cak` with `accepted=1 rejected=0 failed=0`. New dump `e1e579de-2439-4bbc-a519-4716146c3ed4.dmp` (61,161,280 bytes) written 16:29:09, ~2s after the second mount. User confirms crash on load.
- Result: the untouched Tribute 26 v1.6.0 full aggregate crashes identically to v102k. The crash is NOT caused by any of the five 14000 additions. The 2K26-aggregate-vs-2K25 incompatibility hypothesis is now proven to the control-test level. Animation payload work on this base stops here.
- What it proves: no 14000 package on the v1.6.0 base can be in-game valid. A 2K25-compatible full aggregate base is required.
- Compatible-base lead (offline): user's CakeView `tribute-bake-test-sept19.cak` (129 files, v9.3, accepted 02:43:18 with no crash dump from that session) unpacks to the same tree as `_work\14000-user-bakeme-v102i\BakeMe` (130 files) minus `_textures.tdb`, plus the two validated 14000 assets. Its Victory list already carries the user's own 14000 row (654 rows); its Cutscene registry (2,127 entries) and SDB have no 14000 binding and it ships no 14000 assets.
- Next concrete action: transplant only the missing 14000 bindings/assets onto the v102i base (verify existing Victory 14000 row fields, append Cutscene 14000 entry, add SDB name, keep validated clips/adefs), bake the full aggregate with FTribTool, verify reopen/payload, and stop at the next stage-and-launch boundary.

## Tribute recipe captured live — 2026-09-19 (pre-reboot pause)

- Exact action: user created one victory + one entrance entry in live `D:\WWE26-mods\compiled releases for review\TRIBUTE 26 v1.6.0\TRIBUTE 26\BakeMe`; diffed live tree against verified pristine backup `_work\control-untouched-v160\BakeMe`. Result: 62 files, +194 bytes, exactly 4 changed / 0 new: VictoryListData (+1 row 14000/name 4294957742/type 1/face 14000), EntranceListData (+1 sec8 row 14000/name 4294957742/type 1), CutsceneNoRegistry (+1 entry 14000/name 4294957742, 102,936 to 102,976 bytes), SDB (+2 records 4294957742/4294957743, 7,252,991 to 7,253,033 bytes).
- Format discovery: this family's Cutscene tables are 22 bytes (stock share one vtable; Tribute's new table carries a fresh vtable; +40 bytes total). Our 32-byte appender would refuse this family; a 22-byte variant is required for the transplant. Tribute's new SDB payload encoding does not decode under our rolling-XOR model; typed names still needed from user.
- Transplant status: on the compatible v102i base only the Cutscene 14000 entry is missing; everything else is in place. Bake paused pending user's redo + video.
- Pause state: user rebooting for Windows update, will then redo the Tribute edits and record a video. Game folder still stages crashed control (`AE2A...`, single CAK); loader log at 543 lines. WARNING for resume: live folder currently contains the 14000 entries — a blind redo may collide on duplicate IDs; pristine restore is available from `_work\control-untouched-v160\BakeMe` (62 files, hash-verified) if a clean re-run is wanted.

## Loader rebuilds done, NOT installed — STOPPED for talk — 2026-09-19

- Exact action: built Mod-Loader HEAD (dirty tree holds the file-open observer work) clean → ftrib `A1EDB725...` (differs from installed `B8C8A7A9...`, proving installed predates instrumentation); loader unit tests pass (collision/manifest/runtime/status; validator probe accepts v103a 131 files). Registered A1ED as 7th approved addon in SDCL working branch (+ test pin), rebuilt dinput8 clean → `17FA5CBC...`, addon_registry_tests pass.
- Result: NOTHING installed — game folder untouched (v103a staged solo, old loader pair, log at 552 lines). New binaries sit only in repo build dirs. Stopped per user before install/stage/launch.
- Next concrete action: talk first; when resumed, fresh-install dinput8+ftrib pair with content verification, then user launch to check PRE-WINDOW mount lines.

- Exact action: web search for Tribute 2K25 latest and Tribute 26 on 2K25 at user's direction. Findings: TRIBUTE 26 (announced 2026-04, v1.6.0 era) is the WWE 2K26 tool ("modding is fully working for 26"); the WWE 2K25 line is Tribute 25 (v1.16+ era, CakeView/CakeHook 2.6/2.7 generation). No source claims Tribute 26 targets 2K25.
- Result: user's hypothesis is confirmed to product-line level and matches all local evidence: v1.6.0 aggregates (SDB 7.25MB/113k, Victory 713, Cutscene 2,342) crash 2K25 post-mount with or without our additions, while the Tribute-25-family full bake (SDB 6.78MB/96k, Victory 654, Cutscene 2,127) mounts with no crash. The v1.6.0 base must not be used for 2K25 again.
- Redo evidence (video `D:\videos\sept-19-2026\2026-09-19_17-14-02.mp4`, 27MB): user added victory 14001 (nameString 4294957744, someId/face 6309) + entrance 14001 sec8 (name 4294957745) + cutscene 14001 (name 4294957745, 22/32 table like Tribute's 14000); SDB grew to 113,783 records (last IDs 4294957744/45); both entries named "Testing 2" per user. Victory and entrance entries correctly share one motion ID each (14000 set and 14001 set). Recipe stands: Victory + Entrance + Cutscene + SDB, zero new asset files.

## v103a transplant baked, verified, staged — 2026-09-19

- Exact action: copied v102i base to `_work\14000-compat-v103\BakeMe` (130 files, 0 bad, 0 extra); appended Cutscene 14000 (template 6100, name 4294957753) via shared-vtable splice with strict validation (2128 tables in-bounds, entry found at last slot, clone 5/5 words); corrected two validator errors made en route (misread vtable size as table size; assumed single shared vtable — families mix 28/32/36/40-byte tables). Baked full aggregate `aurora-14000-compat-v103a.cak` with Foundry CLI: `verified=true payloadVerified=true fileCount=131 sourceFileCount=130 folderCount=84` 56,080,748 bytes SHA-256 `E57757C7...0578C` (+1 file is baker-generated `_textures.tdb`, same as CakeView pattern).
- Independent verification: unpack yields all 130 source payloads; 93/93 non-texture files byte-identical including Victory (654 rows, 14000 present), Cutscene (14000 entry, shared vtable), SDB (Test 14000), clips (`31A9A292...`) and adefs (`01FD0B9B...`); 37 .dds are baker-normalized texture conversions (expected, same as CakeView behavior).
- Staging (full PC access): control moved to disabled-tests hash-preserved (`AE2A...` both sides); fresh v103a copy staged solo (hash `E577...` matches source); log baseline 543 lines; game not running.
- Next concrete action (user-run): launch WWE 2K25 once; report menu vs crash, then TEST 14000 picker visibility and preview if it launches.

## v103a verdict: clean load, picker registration failed — 2026-09-19

- Exact action: user launched with only v103a staged. Loader log (lines 544-552): orchestrator 17:25:28, window-thread mount 17:25:53 `ACCEPTED CAK aurora-14000-compat-v103a.cak`, `accepted=1 rejected=0 failed=0`. Game loaded to menu with no crash (first crash-free full-aggregate mount with our additions). Inspected user's video `2026-09-19_17-26-01.mp4` (93s) frame-by-frame through the MOTION: FACE T section.
- Result: the TE sub-range shows TECH CHAIRWOMAN, TERRY FUNK directly followed by "THE BAD GIRL", THEA HAIL — no TEST 14000. Identical failure signature to v102f. The motion list was genuinely browsed; the entry is absent, not skipped.
- What it proves: compatible base + complete offline bindings + loader acceptance + crash-free load are still insufficient for picker visibility. The remaining variable is serving order: the frontend reads Victory/Cutscene tables before our window-thread mount lands (clips serve on demand, tables do not). Package/name iteration must stop; work moves to mount timing.
- Next concrete action: inspect the current loader's mount-timing design (early-mount worker, archive-open observer, window dispatch) in the Secure-DataCtrlLink repo; instrument WHEN the game first opens VictoryListData/CutsceneNoRegistry; design a mount that precedes that read. No new package, no launch needed until the timing path exists.

## Tribute 25 v1.08 experiment staged — 2026-09-19 (loader work parked)

- Exact action: at user's direction, paused loader-timing investigation (installed pair is dinput8 `92C26247...` + ftrib `B8C8A7A9...`; repo HEAD has early-mount worker + CreateFileW observer that never fired in the 17:25 run — no PRE-WINDOW lines — so installed ftrib likely predates that source; rebuild/reinstall deferred). Snapshotted entire `D:\bot-crap\TRIBUTE 25 v1.08\TRIBUTE 25` (172 files, 84,858,330 bytes; BakeMe 48 files, 18,698,779 bytes) to `_work\trib25-v108-baseline.tsv` before user's edits.
- Next concrete action (user-run): add entrance 14000 + victory 14000 in Tribute 25 v1.08, report typed names, then I diff the whole folder tree.

## Tribute 25 v1.5-merged recipe: 3 files, no Cutscene — 2026-09-19

- Exact action: user added victory 14000 + entrance 14000 ("Testing 6") in `D:\TRIBUTE 25 v1.5 Merged With Latest UPDATE Files\TRIBUTE 25`; whole-tree diff vs 237-file baseline: 234 same, 0 new, 0 missing, exactly 3 changed — VictoryListData (+1 row 14000/name 4294957742/type 1/someId-face 6229), EntranceListData (+1 sec8 row 14000/name 4294957742/type 1/f4-f5 stock refs), SDB (+1 record 4294957742, +22 bytes). CutsceneNoRegistry byte-identical (14000 absent); zero new asset files.
- Result: Tribute 25 template entries clone STOCK motions (6229/247/502-class refs) and share ONE SDB name across both rows; unlike v1.6.0, no Cutscene entry is written. Correction: an earlier note claimed the v102i SDB lacked the name on case-sensitive search — wrong; v102i SDB record 4294957753 decodes to "Test 14000". Separate pre-existing condition found: v102i entrance row 14000 points to name 4294957742 which decodes to "Draven", so that template renders as Draven, not TEST 14000. Nothing of the user's data was altered.
- What it proves: Tribute's own entries never import new motions — they re-slot stock motion IDs under new template names. Our converter goal (a genuinely NEW imported motion playable in game) requires the Cutscene+assets path v103a already ships; the sole open variable remains serving order (pre-frontend mount).
- Next concrete action: resume loader-timing work (installed ftrib `B8C8A7A9...` predates the early-mount source that never fired on 17:25) — no package changes, no launch until a pre-read mount path exists.

## One-app audit complete: flagship shell + section map — 2026-09-19
- Exact action: three parallel research agents audited all 27 git repos under `D:\AuroraForge-Aug26` (purpose, languages, entry points, key files, tests; files actually read).
- Result: flagship shell EXISTS — `AuroraForge_WWE_PC-Game_Modding_Tool` (aurora-forge@1.7.5 Electron; Home/Projects/Prompt Builders/Tools/Tutorials/Setup + Modding Hub + Mod Workshop; CAK Foundry + DDS Converter already embedded as pages). No new shell needed.
- Section map (every tool has a home): Conversion Lab = Converter-App UI + Prototype converters (2K19→2K20 Victory single/batch, YANM/TBUF/clips codec chain, Blender FBX preview, 2K19 PAC tools, Animation Probes); CAK Foundry = keep embedded page (Foundry backends); DDS Converter = keep page (dedupe standalone repo); Mod Workshop = SDCL 2K25/2K26 + Mod-Loader addons + manifests/collision/journal (wire 2K25 fully); Music = custom-music addons (2K26 ready, 2K25 experimental); gate = Patreon-Verifier (already integrated); docs = Knowledgebase link (no section); Clips-Tools = dedupe into Prototype clips-codec (single home); research/capsule/release repos = no app surface.
- Next concrete action: confirm shell = extend flagship app (objections welcome), then dedupe + wire sections per map.

## Cleanup 1: Clips-Tools retired — 2026-09-19

- Exact action: merge-map agent compared all 31 Clips-Tools files against Prototype tree — 29 logic-identical (line-ending drift only), 2 superseded (SOURCE tbuf-v1 strictly better), zero unique, and the split could not run standalone (6 files require SOURCE-only modules). Deleted `Aurora-Forge-Clips-Tools/tools/` (31 files), left README pointer stub + pointer test script. Nothing committed.
- Result: canonical clips home is `Prototype/tools/clips-codec/`; focused suite passes 8/8 (clips-codec + SDB appender).
- Next concrete action: continue hygiene (Temp one-offs into repo tools with tests; app/dist tracked outputs flagged for user decision), then flagship extension.

- Exact action: at user's prompt, scanned stock-cipher decodability across all three live SDBs plus targeted new records. Results: v102i base 81,209/96,290 printable; v25-merged "Testing 6" record decodes exactly; v160 base 1,333/113,783 printable and its "Testing 2" records do not decode under any single-byte seed. All headers report version 256, so the split is payload-cipher generation, not header version.
- What it proves: Tribute 26 writes 2K26-generation SDB payloads; Tribute 25 and our clean-room appender write stock-cipher payloads that 2K25 reads (Draven, Test 14000, Testing 6 all decode). v103a's SDB is the correct generation for its target. This is independent confirmation that the v1.6.0 aggregate is 2K26-native down to string encoding.

- Exact action: user corrected the folder to `D:\TRIBUTE 25 v1.5 Merged With Latest UPDATE Files\TRIBUTE 25` (live install, not the v1.08 copy). Snapshotted all 237 files (107,610,406 bytes; BakeMe 127 files, 43,666,840 bytes) to `_work\trib25-v15merged-baseline.tsv` before edits. The v1.08 snapshot stands as a spare baseline only.
- Next concrete action (user-run): add entrance 14000 + victory 14000 in this Tribute 25 install, report typed names, then I diff the entire folder tree.

## v102k post-mount crash and DeepSeek v4.1 handoff — 2026-09-19

- Exact action: correlated the user's crash report with the current DataCtrlLink log and preserved the crash evidence. The loader accepted `aurora-14000-tribute-v160-v102k.cak` at 15:43:20 with accepted=1, rejected=0, failed=0; CrashReporter created a 70,592,896-byte minidump at 15:43:22. Wrote the self-contained `DEEPSEEK_V4_1_HANDOFF_2026-09-19.md` with proven facts, constraints, and the control-isolation sequence.
- Result: the full aggregate is accepted by the loader but WWE 2K25 crashes approximately two seconds after mount, before picker visibility or preview can be tested. This is a material in-game failure. The crash dump and archive remain preserved; no package replacement or second game launch was performed.
- What it proves: v102k is not in-game valid. The failure is post-mount and is not explained by CAK collision rejection. The leading 2K26-aggregate-versus-2K25 compatibility hypothesis remains unproven.
- Next concrete action: build and test one untouched Tribute 26 v1.6.0 full-aggregate control with FTribTool. If it crashes identically, the aggregate base is incompatible; if it launches, isolate the 14000 additions. Use dump stack evidence if a debugger is available.
- Continuity requirement: the next chat must read `AURORA_FORGE_ACTIVE_STATE.md`, `AURORA_FORGE_CONVERSATION_LEDGER_2026-09-19.md`, `DEEPSEEK_V4_1_HANDOFF_2026-09-19.md`, and the ledger's preserved final task prompt before any Aurora Forge action, then continue from this crash-isolation boundary.

## Full Tribute aggregate v102k baked and staged — 2026-09-19

- Exact action: ran the complete copied 64-file Tribute 26 v1.6.0 BakeMe through FTribTool DLL mode after adding adaptive raw storage for the high-entropy SDB and hard-failure detection for false-success backend output; reopened and byte-verified the result; moved the prior enabled 14000 candidate to the reversible disabled-test area; staged the new archive alone.
- Result: FTribTool completed in 8.2 seconds. Foundry reports `verified=true`, `payloadVerified=true`, `fileCount=64`, `sourceFileCount=64`, `folderCount=41`, and 10,365,112 bytes. The staged archive is 10,365,112 bytes with source/staged SHA-256 `C1DE81250FE0CAA33246EED9FDB156835764EBA9D496CF6D6ACC5831996D4ACA`. Exactly one CAK is enabled. The prior candidate was moved with its SHA-256 preserved as `4D32869DD9F9CD65CE2A0066B8F1F73D6CF48EAE443419422BD8791CAB752E86`.
- What it proves: the full BakeMe folder, including every original file and relative directory plus the new 14000 assets and registry/database bindings, now has a runnable, independently verified modern archive path. It proves offline archive integrity and loader-ready composition; it does not prove picker visibility or in-game playback.
- Next concrete action: launch WWE 2K25 with only the staged v102k archive, find `TEST 14000` in the victory motion picker, preview it, and report whether the entry appears and whether the motion visibly plays as the imported animation. Do not restore the prior candidate during this test.
- Cleanup result: removed the five unused legacy-named backend binaries from the active Foundry tool directory into a recoverable build archive. The active integration directory now exposes FTribTool only; this cleanup does not alter the staged CAK.

## FTribTool backend correction and product rename — 2026-09-19

- Exact action: renamed the Aurora archive backend product to FTribTool in its assembly metadata, console banner, Foundry integration paths, and user-facing CLI help; added `.sdb` to the v9.3 raw-storage extension set because the Tribute 26 ENG.sdb is already transformed and Oodle expands it; changed the backend runner to invoke the managed FTribTool DLL through the local .NET 9 runtime and to reject logged fatal output even when the legacy process returns exit code 0.
- Result: FTribTool compiles and its help/version surface identifies Aurora Forge; the self-contained publish completed, while its native launcher was not used because it did not return in the local shell. The managed DLL path is functional. The original and modified full BakeMe inputs are preserved; no archive has been staged.
- What it proves: the previous full-bake failure was isolated to an inherited compression assumption and false-success wrapper behavior, not to the 14000 data or the full folder composition. The tool boundary is now our FTribTool name and the bake path can report a real failure instead of treating a partial archive as valid.
- Next concrete action: run the 64-file aggregate through FTribTool DLL mode, require catalog reopen and byte-for-byte payload verification, then stage only if that complete evidence passes.

## Tribute 26 v1.6.0 full aggregate bake verification failure — 2026-09-19

- Exact action: after repairing the SDB writer for deduplicated/shared payload offsets and passing the focused 8/8 suite, generated all four ID 14000 bindings in isolated outputs; independently validated 713/713 existing Victory rows as semantically unchanged, exactly one new Victory row, all 2,343 Cutscene tables valid with one ID 14000 entry, and one new SDB record decoding to `TEST 14000`. Applied those three validated database outputs plus `14000.clips/.adefs` to the copied full BakeMe and audited the complete source-to-final tree. Started a Foundry v9.3 bake of all 64 files under a fresh final filename.
- Result: all 62 original files remain present; 59 are byte-identical, exactly three originals are intentionally changed (Cutscene registry, Victory list, SDB), and exactly two animation assets are new. The final input has 64 files and 20,416,328 bytes. The bake process reached archive reopen/verification but failed with `Specified argument was out of the range of valid values. (Parameter 'length')` from the FDIR v9.3 backend. The artifact has not been staged or called valid.
- What it proves: the full-folder composition and every offline ID linkage are now concretely validated, including the newer SDB aliasing layout. It does not yet prove that Foundry emitted a structurally valid full aggregate archive; the verification failure must be isolated before any game test.
- Next concrete action: inspect the generated archive and Foundry report state without restarting; determine whether the failure is malformed output, a specific source entry, or a verifier limitation. Repair the smallest proven cause, rerun the complete 64-file bake once, independently verify exact payload recovery, and only then stage it alone.

## Tribute 26 v1.6.0 full-tree intake and SDB gate — 2026-09-19

- Exact action: located the user-designated fresh BakeMe in Tribute 26 v1.6.0, copied the complete tree to a new isolated work area, and compared every source/copy file by relative path, byte count, and SHA-256 before attempting any patch. Inspected ID 14000 across VictoryListData, CutsceneNoRegistry, and ENG.sdb, then attempted the existing guarded SDB append into a separate patch-output area.
- Result: the authoritative source contains 62 files and 19,841,251 bytes; the isolated copy has the same 62 files and byte total with zero missing files, zero extras, and zero hash mismatches. ID 14000 is absent from the 713-row Victory list and 2,342-entry Cutscene registry; `TEST 14000` is absent from the 113,779-record SDB, whose next available ID is 4,294,957,742. The existing 2K25 SDB appender refused the v1.6.0 SDB at record 36 because this newer file has a non-contiguous payload layout. No copied BakeMe file was changed and no bake was started.
- What it proves: the full-tree preservation requirement is satisfied at intake and all four new-ID additions are genuinely absent and available. It also proves the older contiguous-payload SDB writer cannot safely be applied unchanged to this newer aggregate; bypassing that guard would be unsafe.
- Next concrete action: measure the v1.6.0 SDB gap/trailing-region rules, extend the writer with preservation and semantic round-trip checks for that measured layout, add a regression test, then generate and validate the SDB, Victory, Cutscene, and animation additions before changing the isolated BakeMe copy.

## Dynamic Cutscene registry layout repair — 2026-09-19

- Exact action: replaced the fixed CutsceneNoRegistry root/vector offsets in the registry finder and appender with FlatBuffer pointer traversal; added an alternate-layout regression gate using the supplied older Tribute BakeMe registry; reran the focused codec/registry suite. Also confirmed that the user-supplied Tribute v1.20 BakeMe is explicitly an older version and has not been baked or staged.
- Result: the focused suite passes 7/7. The new gate resolves the older Tribute registry's full vector (more than 2,000 entries), appends exactly one new ID 14000 entry, preserves a valid table for every vector slot, and reads the appended name binding back correctly. The duplicate stock-ID 6185 rejection remains passing. No CAK was produced from the older Tribute folder.
- What it proves: registry lookup and append no longer depend on the stock file's fixed byte offsets and now support both measured Cutscene root layouts offline. It does not prove that the current Tribute BakeMe has the same layout, that a full aggregate bake has been made, or that WWE 2K25 exposes or plays ID 14000.
- Next concrete action: obtain or identify the user's current Tribute BakeMe, copy the complete tree, verify the copy file-for-file, inspect every required ID 14000 binding, apply only the missing/new-ID changes, prove the whole-tree diff is limited to those bindings plus the two imported animation assets, then bake and stage exactly one full aggregate CAK for the required in-game test.

## Current authoritative correction: v102f picker failure

- Exact action: inspected the new recording `2026-09-19_14-40-44.mp4`, sampled its sequence and examined the motion picker at 00:37; compared the current loader log and the existing detailed transfer ledger correction.
- Result: at 14:40:19 v102f was accepted with accepted=1 rejected=0 failed=0. At video 00:37 the Motion: Face / All picker shows TERRY FUNK directly followed by THE BAD GIRL, with no TEST 6185 between them. The custom entry was not selected or previewed in the inspected sequence. Collision recovery succeeded, but picker registration failed this test.
- Material canonical mismatch: the transfer ledger already documents that stock 6185 exists as THE USOS 1 and that a duplicate append had failed before. The previous Active Log and assistant incorrectly called 6185 a new/additive ID and overstated missing-registry causation. v102f repeats that duplicate-ID approach. Its successful archive and codec checks do not establish the new-ID invariant, registry consumption by the game, or source-motion fidelity.
- What it proves: archive acceptance and entry serialization are insufficient evidence of usable registration; the user has supplied the requested test, so waiting for this same verdict is obsolete. The recording does not establish whether duplicate-ID handling, mount timing, or another registry constraint caused the absence.
- Next concrete action: reconcile the existing archive-union and registry evidence to select a genuinely unused target ID, enforce collision rejection before packaging, and establish whether the registry override is consumed. Preserve stock IDs and do not request another identical 6185 test. Playback remains unverified.

## New-ID invariant repair — 2026-09-19

- Exact action: reconciled the original user directive and source handoff; checked stock Cutscene registry, stock VictoryListData, and stock SDB bases; changed the Cutscene appender and its tests so an existing motion ID is rejected before serialization.
- Result: ID 14000 is absent from the 2,160-entry stock Cutscene registry and absent from the 680-row stock VictoryListData. The stock SDB has 96,992 records and leaves the next reserved test string ID available. The codec/registry suite now passes 6/6, including a successful new-ID 14000 append and a required rejection of stock ID 6185.
- What it proves: the prior duplicate-ID path is now mechanically rejected at the registry writer. It establishes 14000 as free in the authoritative stock registry/list inputs, but no corrected CAK has yet been built or tested in game.
- Next concrete action: emit `14000.clips/.adefs`, append entry/motion ID 14000 consistently to VictoryListData and CutsceneNoRegistry, add `TEST 14000` to SDB, verify every linkage, bake under a fresh final filename, and stage it alone.

## Corrected 14000-only candidate — 2026-09-19

- Exact action: built a fresh package from authoritative stock Cutscene, VictoryListData, and SDB bases; renamed the imported motion assets to 14000; appended new registry/list entries with ID 14000; added `TEST 14000`; baked under the final filename `aurora-14000-testv102g.cak`; independently verified the CAK; disabled the invalid 6185 candidate and staged only the corrected package.
- Result: the bake contains exactly five files. `14000.clips` is 555,592 bytes, parses as 17 records, and retains the imported-motion hash `31A9A292...`; `14000.adefs` is 4,206 bytes. Cutscene registry count is 2,161 with exactly one appended entry ID 14000/name ID 4,294,957,742. VictoryListData has 681 rows with exactly one row ID 14000, type 1, `someId=14000`, `victoryFace=14000`, and the measured new-entry hide ID. SDB has 96,993 records and decodes the name record to `TEST 14000`. Foundry verification reports `verified=true`, `payloadVerified=true`, `fileCount=5`, and 5,053,772 bytes. Source/staged SHA-256 is `4D32869DD9F9CD65CE2A0066B8F1F73D6CF48EAE443419422BD8791CAB752E86`; the enabled mods tree contains only this CAK.
- What it proves: the corrected artifact satisfies the user's new-entry invariant offline and the writer now rejects duplicate stock motion IDs. It proves Foundry still bakes and recovers the payload correctly. It does not prove that the restored late-mount loader exposes the new registry row or that WWE 2K25 plays the imported motion.
- Correction: an interim statement that Foundry was broken was inaccurate. The external bake completed after the first wrapper observation ended; direct independent verification passed. The unresolved product issue remains UI registry load timing, already documented before the 6185 detour.
- Next concrete action: launch once with the corrected package to establish whether `TEST 14000` appears. If it remains absent, stop package/name iteration and work only on serving the already-correct registry before the frontend reads it; the converter payload itself must not be called in-game valid until it can be selected and previewed.

## Current user goal

Build and validate a usable WWE 2K19 to WWE 2K25 entrance/victory animation converter, including a runnable modern .clips/.adefs output path and concrete verification evidence.

Current user directive: this 2K19→2K25 converter objective is fixed for this chat. Work is additive-only: create new imported-animation IDs, preserve stock files, and do not claim conversion, in-game validity, or end-user readiness without direct evidence.

## Read order for future turns

1. Read this file first.
2. Read `D:\promptfordumbbots\AURORA_FORGE_CANONICAL_CONTINUATION_PROMPT.md` only if this file is missing, stale, or insufficient.
3. Read `AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-14-CURRENT.md` only when exact historical evidence is needed.
4. Use repo-local tools first. If a needed capability is absent, search targeted local PC paths, then targeted public/open-source sources.

## Primary repo

`D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype`

Current dirty state is intentional. Preserve it. Do not reset or clean broadly.

Known dirty/untracked areas at the time this capsule was created:

- Modified: `AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-13-CURRENT.md`
- Modified: `tools/clips-tool.js`, `tools/clips-tool.test.js`
- Modified: `tools/group90-descriptor-ranges.js`, `tools/group90-descriptor-ranges.test.js`
- Modified: `tools/yanm20-normalization-sweep.js`, `tools/yanm20-normalization-sweep.test.js`
- Untracked: `AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-14-CURRENT.md`
- Untracked: `app/node_modules/`
- Untracked: `tools/clips-native-inspect.js`, `tools/clips-native-inspect.test.js`
- Untracked: `tools/ghidra/`

## Historical 2K19 to 2K20 conversion evidence

The bounded Victory 6100 2K19 to 2K20 bridge is already proven.

Source decoded 2K19 motion:

`analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`

2K20 reference:

`D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.acts`

Verified output:

`D:\AuroraForge-Aug26\_work\app-milestone\victory-6100-2k20.yanm20.bin`

Evidence:

- 174,976 bytes
- 63 records
- 62 motion tracks
- both streams present on every track
- independent `tools/yanm20-reader.js` read-back succeeded

Freshly rebuilt desktop app:

`app\dist\aurora-forge-converter 0.9.0.exe`

Fresh build evidence:

- Portable EXE: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\aurora-forge-converter 0.9.0.exe`
- Portable EXE size: 76,070,663 bytes
- Portable EXE write time: 2026-09-13 22:16:44 Eastern
- Unpacked runtime EXE: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\win-unpacked\aurora-forge-converter.exe`
- Unpacked runtime EXE size: 201,233,920 bytes
- Unpacked runtime write time: 2026-09-13 22:15:07 Eastern

Fresh packaged-runtime conversion proof:

- Command path used the packaged Electron runtime with `ELECTRON_RUN_AS_NODE=1`
- Source: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`
- Reference: `D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.acts`
- Output: `D:\AuroraForge-Aug26\_work\tonight-2k19-to-2k20\fresh-packaged-runtime-converted.yanm20.bin`
- Output size: 174,976 bytes
- SHA-256: `544CC0CE567F346E859F2897167A69828F76147D757A8CB41B4CB062BB025462`
- Independent read-back: 63 records, 62 motion tracks, all tracks have both streams

Fresh app/test proof:

- Focused 2K19 to 2K20 bridge suite passed 11/11.
- Full source-tool suite passed 122/122.
- The portable app launched normally and stayed running after five seconds before being closed.

## Historical 2K20 install and extracted sources

Installed game:

`D:\Program Files (x86)\Steam\steamapps\common\WWE2K20`

Authoritative 2K20 extraction:

`D:\AuroraForge-Aug26\Extracted Files\2k20\Root`

Important assets:

- `Animation\Victory\6100.acts`
- `Animation\Victory\6100.evd`

Do not overwrite installed game files or extracted references. Write generated files under `D:\AuroraForge-Aug26\_work\...` or a fresh explicit output directory.

## Existing app/tool surface

Important files:

- `tools/convert-yanm19-to-yanm20.js`
- `tools/aurora-converter.js`
- `tools/yanm20-reader.js`
- `tools/yanm20-encoder.js`
- `tools/yanm20-ir-writer.js`
- `app/`

Current useful next actions:

1. Validate additive 2K19→2K25 `.clips/.adefs` and registry/bake inputs using only new evidence.
2. Stop at the first point requiring the user to launch WWE 2K25 and provide an in-game verdict; do not claim in-game validity before that verdict.

## Boundaries

Do not claim:

- in-game WWE 2K25 validity unless the user tests it in game or an independent game-load path proves it
- end-user readiness before additive registry, bake, and game-serving evidence exists
- event conversion from copied target files

Do claim only what the evidence proves.

## Canonical status correction — 2026-09-19

- Exact action: reconciled this Active Log with the current 2K19→2K25 transfer ledger and workspace state after detecting that this capsule still described the superseded 2K19→2K20 objective.
- Result: the fixed 2K19→2K25 goal is now authoritative here; the codec is cracked and V1/V2 bit-identity gates pass; the split codec batch is committed; the importer smoke build produces a parseable modern `.clips` container; additive 6185 work and registry visibility remain test work, not end-user proof.
- What it proves: the prior 2K19→2K20 capsule no longer governs this chat, and the current implementation has concrete offline conversion evidence without overstating in-game readiness.
- Next concrete action: maintain this goal and log as the first source before each Aurora Forge test, search, or edit; perform only new-evidence checks, then advance additive `.clips/.adefs` serving and in-game verification.

## Additive 6185 package validation — 2026-09-19

- Exact action: checked the recorded 6185 additive package using only the known package workspace; validated the modern `.clips` container, `.adefs`, victory registry, SDB string, and codec test suite.
- Result: the package contains a 555,592-byte 6185 `.clips`, a 4,206-byte `.adefs` byte-identical to the stock structural companion, a 681-row VictoryListData with exactly one row for template ID 14000 and `someId/victoryFace=6185`, and an SDB record decoding to `TEST 6185` at the recorded name ID. All five codec/registry tests pass.
- What it proves: the 2K19-derived 6185 motion has a concrete additive modern `.clips/.adefs` package and matching offline registry/name inputs. It does not prove that WWE 2K25 mounts the package, exposes `TEST 6185` in the picker, or plays the imported motion correctly.
- Next concrete action: user must run the staged package in WWE 2K25 and report whether `TEST 6185` appears and whether its preview plays a visibly new motion. Until that result, in-game validity remains unproven.

## Additive 6185 mount acceptance — 2026-09-19

- Exact action: read the latest authoritative DataCtrlLink runtime log after the offline package validation.
- Result: `aurora-6185-testv102b.cak` was accepted twice; both completed mount sequences report `accepted=1 rejected=0 failed=0`.
- What it proves: the final-name baked CAK is accepted by the restored WWE 2K25 loader. This is stronger than offline package validation, but it does not prove picker visibility or motion playback.
- Next concrete action: obtain the user's direct picker/preview verdict for `TEST 6185`; if absent or stock, inspect the corresponding UI/registry path using that new evidence.

## 6185 picker absence and registry diagnosis — 2026-09-19

- Exact action: inspected the two recorded WWE 2K25 picker sessions associated with the accepted 6185 mounts, including the visible T-section motion list; then compared those results with the staged package contents.
- Result: the captured picker sequence visibly transitions from `TERRY FUNK` to `THE BAD GIRL` without showing `TEST 6185`. The mounted package contained VictoryListData, SDB, `.clips`, and `.adefs`, but no Cutscene motion-registry override.
- What it proves: CAK acceptance and VictoryListData registration are not sufficient for picker visibility; the current failure is a missing motion-registry path, not proof that the converted clip itself is invalid.
- Next concrete action: create a fresh additive package that preserves the validated 6185 assets and adds a new Cutscene registry entry cloned from the known stock template, bake it under a new final filename, and revalidate offline before requesting the next picker test.

## 6185 registry-inclusive bake — 2026-09-19

- Exact action: cloned the validated additive 6185 package into a fresh bake input, appended one Cutscene registry entry using the known stock template, and baked it under a new final filename.
- Result: the registry grew from 97,032 to 97,068 bytes; the new entry has ID 6185 and SDB name ID 4,294,957,742; the baker reported `verified=true`, `payloadVerified=true`, five source files, and 5,053,756 output bytes. Offline package checks found the 555,592-byte `.clips`, 4,206-byte `.adefs`, 49,076-byte VictoryListData, 6,826,851-byte SDB, and registry entry. The five codec/registry tests remain 5/5 passing.
- What it proves: there is now a registry-inclusive, structurally verified modern `.clips/.adefs` CAK candidate for the additive 6185 ID; it preserves the prior package assets and adds the missing picker registry path. It still does not prove game picker visibility or playback.
- Next concrete action: stage this new additive CAK for the user’s WWE 2K25 test, then inspect the picker for `TEST 6185` and preview it. Record the direct in-game verdict before making any validity claim.

## 6185 registry-inclusive package staged — 2026-09-19

- Exact action: copied the new verified CAK into the active WWE 2K25 `mods` directory under its new final filename, refusing overwrite because no destination file existed, then compared source and staged SHA-256 values.
- Result: staging completed; both hashes are `22D210A156B6996F01A38B0167BCA1280D5616CB9F9D632BF758C5CEA43E9455`, and the staged archive is 5,053,756 bytes.
- What it proves: the exact offline-verified registry-inclusive candidate is now available to the game loader without replacing stock archives or the prior test artifact.
- Next concrete action: user must launch WWE 2K25, open the entrance/victory motion picker, search the T section for `TEST 6185`, and preview it. Report whether it appears and whether the motion visibly differs from the stock template; this direct result is required for the next engineering decision.

## Heartbeat

## User launch exposed archive collision — 2026-09-19 14:38 Eastern

- Exact action: read the user's collision screenshot and current loader log, then inspected enabled archives and the game process.
- Result: the user did launch the game. The loader rejected both v102f and the Tribute September 19 test because both supply the Cutscene registry; accepted=0 rejected=2 failed=0. No game process was found. Earlier statements that missing log activity proves no launch were too strong.
- What it proves: this attempt stopped at archive collision detection before animation loading. Neither picker visibility nor playback was tested. Staging had omitted a check for conflicting enabled packages.
- Next concrete action: reversibly move the conflicting Tribute test outside the loader's mods tree, retain its original filename and verify its hash, then request a fresh launch with only v102f enabled.
- Recovery completed: moved only the Tribute September 19 test archive to `aurora-disabled-tests` beside `mods`, preserving its filename. SHA-256 before/after matched `CA5E5F6C229F268CCFB12D2E612E433FF19121946AFA79372585DFD48279100F`. A recursive enabled-CAK check now contains only v102f (5,053,756 bytes). The reported two-package collision has been removed from the enabled set; successful game launch, mount, picker and playback still require a new run. Restore the Tribute archive only after disabling v102f or resolving their shared registry override.


Active heartbeat: `Aurora Forge continuity guard`

Purpose: keep this thread oriented on the fixed 2K19→2K25 converter objective. Each run reads this capsule first, compares it with the canonical transfer ledger and workspace state, records any material mismatch before further Aurora Forge work, and stays quiet unless there is completion, failure, a material change, or required user action.

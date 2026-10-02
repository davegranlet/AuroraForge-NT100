# GITHUB (split from ACTIVE log 2026-09-17)

## 2026-09-15 public repository ability overhaul, heartbeat instruction update and commit request

User request:
- Commit and push the pending work.
- Update this active log before handoff.
- Overhaul the public repository ability statements because Aurora Forge and CAK Foundry documentation had drifted behind the actual multi-version tool work.
- Add a bottom-of-log section that stores current functions and is updated whenever a tool/script/code capability changes.
- Add instructions so another chat can auto-add or reactivate the continuity heartbeat.

Commands/results in this pass so far:
- `git -C D:/AuroraForge-Aug26/WWE2K19-to-2K26-Entrance-Prototype status --short --branch && git -C ... remote -v && git -C ... branch --show-current`
  Result: main tracks origin/main; tracked research files were dirty; multiple untracked generated app/dist, node_modules and notes/tool research files were present; remote is `https://github.com/davegranlet/Aurora-Forge-WWE2K19-Animation-Research.git`.
- `rg --files D:/AuroraForge-Aug26/WWE2K19-to-2K26-Entrance-Prototype | rg -i "(readme|package\\.json|active-2k20|public|repo|foundry|cak|forge|docs|notes|\\.md$)"`
  Result: found repo docs and many app/dist/node_modules matches; output truncated because generated dependency/build trees are large.
- `Get-ChildItem -LiteralPath D:/AuroraForge-Aug26 -Directory`
  Result: identified public repo directories including Aurora-CAK-Foundry, CAK loaders, Custom Music loaders, DDS Converter, Knowledgebase, Research, public animation archive, Secure DataCtrlLink repos, AuroraForge_WWE_PC-Game_Modding_Tool and this active animation repo.
- Public repo inventory with `git remote`, `git branch --show-current`, and status checks:
  Result: davegranlet-owned public repos are separate Git repositories. Some already had local uncommitted work before this pass; those changes were preserved and not reverted.
- Read README/status files for CAK Foundry, CAK loaders, Custom Music loaders, DDS Converter, Knowledgebase, Research, public animation archive, AuroraForge_WWE_PC-Game_Modding_Tool, DataCtrlLink-MusicOnly, Secure-DataCtrlLink-WWE2K25, and this animation repo.
  Result: several public-facing descriptions lagged the actual verified capability set, especially the umbrella Aurora Forge README presenting CAK Foundry as 2K26-focused.
- `rg -n "only supports|supports only|WWE 2K26|2K26 CAK|2K25|2K20|2K19|2K22|2K23|2K24|v9\\.3|v9\\.9" ...`
  Result: found stale 2K26-only language in the umbrella Aurora Forge app docs/manifest/readme and verified CAK Foundry already had 2K25/2K26 README language. Output was truncated by large package-test audit trees.
- `automation_update(mode=view,id=aurora-forge-continuity-guard)`
  Result: automation card rendered in the app.
- `Get-Content C:/Users/dgran/.codex/automations/aurora-forge-continuity-guard/automation.toml`
  Result: heartbeat was ACTIVE, hourly, attached to other thread `01a098fa-8e04-7b70-80e4-52c52f45e30c`.
- `automation_update(mode=update,id=aurora-forge-continuity-guard,...)`
  Result: heartbeat remains ACTIVE. Prompt now explicitly requires reading and updating the bottom section named `Current functions and public repository abilities` whenever a tool/script/repo capability changes.
- `apply_patch`
  Result: updated public README capability maps in:
  `Aurora-CAK-Foundry/README.md`,
  `AuroraForge_WWE_PC-Game_Modding_Tool/README.md`,
  `Aurora-Forge-CAK-Mod-Loader/README.md`,
  `Aurora-Forge-CAK-Mod-Loader-WWE2K25/README.md`,
  `Aurora-Forge-Custom-Music-Loader/README.md`,
  `Aurora-Forge-Custom-Music-Loader-WWE2K25/README.md`,
  `Aurora-Forge-DDS-Converter/README.md`,
  `Aurora-Forge-WWE2K19-Animation-Research-Public/README.md`,
  `Aurora-Forge-Research/README.md`,
  `DataCtrlLink-MusicOnly/README.md`,
  `Secure-DataCtrlLink-WWE2K25/README.md`,
  `Aurora-Forge-Knowledgebase/README.md`,
  and this repo's `README.md`.
- `node --test tools/tbuf-v1-relocations.test.js tools/tbuf-v1-body-offset-hypotheses.test.js tools/tbuf-v1-body-candidate-record.test.js tools/tbuf-v1-body-prefix-corpus.test.js tools/tbuf-v1-track-probe.test.js tools/amym-tbuf-report.test.js tools/tbuf-v1.test.js`
  Result: 29 tests passed, 0 failed.
- `git diff --check -- README.md` for the public README edits across all touched repos.
  Result: passed in every repo; Git printed LF/CRLF normalization warnings only.
- Public README commits:
  `Aurora-CAK-Foundry` -> `9a827ca Document current Aurora Forge capabilities`.
  `Aurora-Forge-CAK-Mod-Loader` -> `26256c8 Document current Aurora Forge capabilities`.
  `Aurora-Forge-CAK-Mod-Loader-WWE2K25` -> `86cefc2 Document current Aurora Forge capabilities`.
  `Aurora-Forge-Custom-Music-Loader` -> `5ad35ea Document current Aurora Forge capabilities`.
  `Aurora-Forge-Custom-Music-Loader-WWE2K25` -> `0788ff3 Document current Aurora Forge capabilities`.
  `Aurora-Forge-DDS-Converter` -> `6e62a06 Document current Aurora Forge capabilities`.
  `Aurora-Forge-Knowledgebase` -> `9175608 Document current Aurora Forge capabilities`.
  `Aurora-Forge-Research` -> `abd8374 Document current Aurora Forge capabilities`.
  `Aurora-Forge-WWE2K19-Animation-Research-Public` -> `1181453 Document current Aurora Forge capabilities`.
  `AuroraForge_WWE_PC-Game_Modding_Tool` -> `6827233 Document current Aurora Forge capabilities`.
  `DataCtrlLink-MusicOnly` -> `02aa407 Document current Aurora Forge capabilities`.
  `Secure-DataCtrlLink-WWE2K25` -> `d68440c Document current Aurora Forge capabilities`.
- Active animation research commit first created locally as `396137d Record 2K22 TBUF relocation research and capability log`; it is being amended with this push-result log entry before push.
- Active animation research commit was amended to `fada18f Record 2K22 TBUF relocation research and capability log` and pushed `2de285b..fada18f` to `main`.
- Final status sweep after that push confirmed `WWE2K19-to-2K26-Entrance-Prototype` had `main...origin/main` at `fada18f`; only generated `app/dist/win-unpacked/resources/aurora-tools/tools/*` copies and `app/node_modules/` remained untracked.
- Public README pushes:
  `Aurora-CAK-Foundry` pushed `4a33186..9a827ca` to `main`.
  `Aurora-Forge-CAK-Mod-Loader` pushed `185fe1f..26256c8` to `main`.
  `Aurora-Forge-CAK-Mod-Loader-WWE2K25` pushed `48ae4b4..86cefc2` to `main`.
  `Aurora-Forge-Custom-Music-Loader` pushed `0cfa918..5ad35ea` to `main`.
  `Aurora-Forge-Custom-Music-Loader-WWE2K25` pushed `d00f516..0788ff3` to `main`.
  `Aurora-Forge-DDS-Converter` pushed `17bdd51..6e62a06` to `feature/wwe2k19-motion-export-import`.
  `Aurora-Forge-Knowledgebase` pushed `08d2678..9175608` to `main`.
  `Aurora-Forge-Research` pushed `bf71a04..abd8374` to `main`.
  `Aurora-Forge-WWE2K19-Animation-Research-Public` pushed `d2f78f0..1181453` to `main`.
  `AuroraForge_WWE_PC-Game_Modding_Tool` pushed `af681ae..6827233` to `agent/rc1-tutorial-automation`; GitHub printed protected-ref / PR / verified-signature rule warnings but reported the branch update as successful.
  `DataCtrlLink-MusicOnly` pushed `5555813..02aa407` to `main` on `davegranlet/Secure-DataCtrlLink-WWE2K26.git`.
  `Secure-DataCtrlLink-WWE2K25` pushed `1d479e9..d68440c` to `main`.

Important handling:
- Generated `app/dist` and `app/node_modules` trees are intentionally not being staged as part of this documentation/research commit.
- Existing unrelated local edits in several repos are preserved. Only capability/readme/log/research files belonging to this request should be staged unless a repo already requires its own existing release commit.

## 2026-09-16 Tool Inventory — Version Lock Audit

Audited every tool across every repo for hardcoded version locks. Here is what needs updating for full cross-version support (2K19→2K20→2K22→2K23→2K24→2K25):

### Critical: `tbuf-v1.js` line 20
- Hardcoded: `animVersion !== 10` — rejects ANIM v16 (2K24/2K25)
- Fix: accept v10 AND v16, adjust header size accordingly

### Critical: CAK Foundry `cak-v93-backend.js`
- Hardcoded: FDIR v9.3 only (`header[4] === 9 && header[5] === 3`)
- Line 30: `'This archive is not FDIR 9.3.'` error
- Fix: version-routing — detect FDIR version and dispatch to correct reader

### Critical: CAK Foundry `main.js`
- Hardcoded game detection: only WWE2K25_x64.exe and WWE2K26_x64.exe
- Missing: WWE2K22_x64.exe, WWE2K23_x64.exe, WWE2K24_x64.exe
- Mod manager service only has `wwe2k25-mod-manager.js` — needs 2K22 variant
- Loader manager only has `wwe2k25-loader-manager.js` — needs 2K22 variant

### Critical: CAK Foundry `archive-repackager.js` line 241
- Generates FDIR v9.9 headers only
- Needs v8.3 header generation for 2K22/2K23

### Moderate: CAK Foundry `cak20-reader.js`
- Hardcoded for 2K20 FDIR v3 only (FNV1a-64 name-based key)
- Works for 2K20; doesn't apply to 2K22+ (different cipher)

### Moderate: CAK Foundry `cak-reader.js`
- Uses brute-force key recovery (tries up to 2M counts)
- Should work across versions IF the cipher is the same
- Needs testing with 2K22 CAKs to confirm

### Moderate: mod_loader.cpp log messages
- Hardcoded "WWE 2K25" in ~10 log/error strings
- Fix: use profile name from the detected game

### Already OK (no changes needed)
- `amym-container.js` — generic, works across all versions
- `yanm-keyframes.js` — generic
- `yanm20-reader.js` / `yanm20-encoder.js` — 2K20-specific by design
- `fop19-reader.js` — 2K19-specific by design
- `adefs-container.js` — 2K24/2K25 specific by design
- `clips-layout.js` — 2K25/2K26 specific by design
- `victory-list.js`, `entrance-motion-table.js` — 2K24/2K25 specific by design
- `proxy.cpp` — already scans all profiles
- `profiles.cpp` — already has 2K22 + 2K25 entries
- `cak_validator.cpp` — already has v8.3 passthrough

### Conversion pipeline (intentionally version-specific)
- `convert-yanm19-to-yanm20.js` — 2K19→2K20 (by design)
- `convert-yanm20-to-tbuf22.js` — 2K20→2K22 (by design)
- `convert-acts22-to-anims23.js` — 2K22→2K23 (by design)
- `batch-2k19-to-2k20-victory-packages.js` — 2K19→2K20 batch (by design)

### Priority fix order
1. `tbuf-v1.js` — add ANIM v16 support (unblocks 2K24/2K25 reading) ✅ DONE
2. `cak-v93-backend.js` → make version-routing (unblocks 2K22 CAK reading) ✅ DONE
3. `cak-reader.js` — test with 2K22 CAKs, confirm brute-force works ⏳ PENDING
4. `archive-repackager.js` — add v8.3 header generation ⏳ PENDING (requires v8.3 cipher)
5. `main.js` — add 2K22 game detection and mod/loader managers ⏳ PENDING
6. `mod_loader.cpp` — fix hardcoded "WWE 2K25" strings ⏳ PENDING

## 2026-09-17 - Full GitHub sync: 21 repos (user-directed)

### Pre-state
- 21 local repos (15 root + 6 standalone-repos). Zero open PRs anywhere (gh verified). Two feature branches: DDS-Converter `feature/wwe2k19-motion-export-import` (2 commits), Modding_Tool `agent/rc1-tutorial-automation` (112-file commit pending).

### Pushed to main (6 repos)
- DataCtrlLink-MusicOnly: 1.7.7 release notes (44e5835).
- CAK-Mod-Loader + Custom-Music-Loader: package script + 1.0.01 notes (cfaa9ee, d23447a).
- CAK-Mod-Loader-WWE2K25: 2K22 profile + per-game mount signatures, 4 src files (a4cda60).
- Aurora-CAK-Foundry: v8.3 cipher port + v9.3 backend + protected-writer (c2f689f). SKIPPED: `app/tools/` (138MB built CakeTool binaries), `package-tests/` (2.4GB fixtures).
- Entrance-Prototype: bridge research incl. CRC32C bone-hash crack + converter/TBUF updates (42c123d). SKIPPED: `app/dist/*` packaged copies + `app/node_modules/` (generated artifacts, stay untracked per repo convention).

### Feature branches → main
- DDS-Converter: pushed branch, merged clean into main, pushed (3c1a126). DONE.
- Modding_Tool agent branch: committed 112 files (c3c1742, includes 60MB tracked helper exe — LFS warning only), pushed to origin. Local main was 13 commits behind origin/main (another session pushed meanwhile); fast-forwarded, merge ATTEMPTED then ABORTED: ~30 conflicting files (both sides evolved same docs/app/electron/scripts) + binary exe conflicts + main-branch protection (PR-required). NOTHING merged locally; both branches intact and pushed. Created PR #8 (agent/rc1-tutorial-automation → main) for UI-side resolution: https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool/pull/8

### Post-state (verified per repo: dirty/unpushed/behind)
- All 21 repos: unpushed=0, behind=0. GitHub matches local for all TRACKED content. Remaining local-only (intentionally uncommitted): CAK-Foundry app/tools + package-tests, Entrance-Prototype app/dist + node_modules, Modding_Tool pac-request.json (runtime artifact).
- 6 standalone-repos + Knowledgebase/Research/Public/Sanitized/tmp-wrestleminus: were already clean and in sync, untouched.
- tmp-wrestleminus-public tracks `master` (not main) — in sync as-is.## 2026-09-17 - Full log read + 100% repo inventory delivered (user-directed, nothing-else-until-done)

### Log verification
- Read ACTIVE log end-to-end (lines 1–3985 across 4 reads). Currency CONFIRMED: last entry = 19→20 loose-file staging, matching the last command run. No gaps found.
- Full log now SPLIT per user order: 9 section logs (BRIDGE 39, TBUF 14, CONVERTER 21, CAK 8, LOADER 13, SOURCES 12, GITHUB 3, REGISTRY 2, TOOLCAT 1 = 113 blocks, verified complete) + main (handoff + update rule + index + ledger) + LOG-CONVERSATIONS.md + ACTIVE-LOG-BACKUP-20260917.md. UTF-16 append corruption found and repaired (byte-verified, 0 NULs remain).

### Inventory generated
- `_work\gen-inventory.js` → `notes\REPO-FUNCTION-INVENTORY.md` (1,237 lines, 117KB): every tracked file of all 20 git repos with per-file functions (1,140 files). Full text read and verified by assistant.
- Local==GitHub state as of 9/17 sync (0 unpushed/behind everywhere); inventory reflects HEAD.

### Discrepancies found during inventory (open, not resolved)
1. `Secure-DataCtrlLink-WWE2K25\` has NO `.git` (yet 9/15 log records pushes from it) — source tree present (build/docs/release/scripts/src/tests/third_party/tools), version control absent. Needs re-clone or .git restore.
2. Untracked session work NOT in inventory (tracked-only by design): `tools/convert-yanm20-to-tbuf22-v2.js`, `_work\` probe scripts (probe-plusone/harvest-rosetta/inspect-conflicts/name-bones/dict-expand/bracket-insert/locate-insert/validate-crc/probe-hashwords/harvest-names/harvest-rosetta/probe-entrlist/probe-plusone), `_work\*.json` artifacts, `rig-proto.hkt`/`mprms-probe` copies.
3. Prototype repo tracks `app/dist/` packaged copies (~170 files duplicating tools/) — inflates count 369; generated duplicates, do not edit directly.
4. Integration test hardcodes `D:/games/...` absolute paths (brittle off-machine).
5. PR #8 closed UNMERGED by user; agent branch work lives only on origin branch.
6. DataCtrlLink-MusicOnly remote is `Secure-DataCtrlLink-WWE2K26.git` (name mismatch, pre-existing).
7. tmp-wrestleminus-public tracks `master` on third-party `pozzum/WrestleMINUS` (not ours).
## 2026-09-17 - Untracked session work inventory (user-directed)

### Prototype repo (only repo with session-tracked-adjacent untracked work)
- UNTRACKED new: `notes/LOG-*.md` ×10 (section split), `notes/REPO-FUNCTION-INVENTORY.md`, `notes/ACTIVE-LOG-BACKUP-20260917.md`, `tools/convert-yanm20-to-tbuf22-v2.js`.
- MODIFIED uncommitted: `notes/ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md` (session appends since push 3a7aa3a).
- Excluded by convention (generated): `app/dist/*` copies, `app/node_modules/`.
- CAK-Foundry untracked: `app/tools/` (138MB built binaries), `package-tests/` (2.4GB fixtures) — deliberately uncommitted, unchanged.
- Modding-Tool untracked: `tools/AuroraPac19Helper/pac-request.json` (runtime artifact). DDS-Converter: clean.

### `_work\` root files (session vs pre-existing)
- SESSION probes: bracket-insert, dict-expand, gen-inventory, harvest-names, harvest-rosetta, inspect-conflicts, locate-insert, name-bones, probe-entrlist, probe-plusone, scan-shdc-descriptors, split-log, validate-crc (.js) + split-manifest.txt.
- SESSION artifacts: yanm-tbuf-rosetta.json, crc-dictionary.json, cak07-catalog.json (24.5MB v8.3 catalog!), rig-proto.hkt + mprms-probe-00.mprms (read-only copies).
- SESSION outputs: 2k20-to-2k22-{6100,6204,6204-newroot,6204on6100,6204v2}\ + rerun-check\ + verify19to20\ + 2k22-bakeme-{6100-test,6100override,6204v2}\ + 2k22-2k23\ + 2k22-tbuf-probe\.
- PRE-SESSION (left alone): 6100-bridge/exported/package/clips/yanm20/fbx/ir files, test-6100/6204-2k20-to-2k22.acts, tutorial-check, source-6100 7MB IR, 2k19-victory-610x-event\, 2k20-batch-test\, 2k20-package-6100\, tonight-2k19-to-2k20\, wwe2k20-victory-6100-reference\, ghidra-*, clones, release-only-repo, etc.
- NOTE: converted-6100.ir.json is 0 bytes (empty artifact, pre-existing) — do not trust it.

## 2026-09-17 - Commit-all (no push): local ahead confirmed (user-directed)

- Committed in prototype repo as e28b35f (+5441/-3510 across 13 files: 10 section logs, REPO-FUNCTION-INVENTORY.md, ACTIVE log, v2 converter). Verified: local main ahead=1 vs origin — user expectation CONFIRMED for this repo; CAK-Foundry/Modding-Tool/DDS ahead=0 (nothing pending).
- Deliberate skips (stated, reversible): ACTIVE-LOG-BACKUP (260KB restore point, content preserved in split), app/tools/ 138MB binaries, package-tests/ 2.4GB fixtures, app/dist+node_modules, pac-request.json runtime file, _work/ scratch (not a repo).
- NOT pushed — awaiting explicit push order.

## Deliberate skips — reference for later (2026-09-17)

These stay uncommitted until the stated condition changes. Revisit before any release packaging.

- notes/ACTIVE-LOG-BACKUP-20260917.md (260KB pre-split restore point): skip while split is trusted; DELETE only after 30 days of clean section-log use. Condition to commit: never (restore point, not history).
- Aurora-CAK-Foundry app/tools/ (138MB built CakeTool binaries): rebuildable via scripts/build-cak-v93-backend.js + local dotnet9. Commit only if releases must be source-frozen.
- Aurora-CAK-Foundry package-tests/ (2.4GB fixtures): exceeds sane push size; re-generate via verify scripts. Never commit bulk.
- Prototype app/dist/* + app/node_modules/: generated/packaged output + deps. Never commit (repo convention, stated in log since 9/14).
- Modding-Tool tools/AuroraPac19Helper/pac-request.json: runtime artifact, regenerates on helper runs. Commit only if it becomes a checked-in fixture with a test.
- _work/ tree (probes, JSONs, copies, staged outputs): local scratch, not a repo. Promote individual files into tracked tools/ only with a test + log entry each.

## 2026-09-17 - External WWE-modding GitHub survey (user-directed, congrats: #1 spotlight noted)
- 2KLive/Genesis: 2K19-only suite, no CAK/FDIR/loader tech. IRRELEVANT (JSON-export + GFX-preview concepts only).
- San847/CakeTools-AlphaPreview: NOT a fork — re-upload of nothanley v0.9.a + bakedfile06-09.cak samples, no source. Samples pulled locally (Temp, NOT staged): all FDIR v6.8 flags `01 C0`, same size 41,527B, distinct hashes (per-index filename-derived keys — independent confirmation of key design). OUR reader rejects all four (dir-section checksum mismatch): third v6.8 flavor with payload-protect bit set that our XORCRC mirror doesn't cover. Game-oracle pending (needs user yes to stage foreign bytes).
- wwemods hub, Battlegrounds SDK/tools, CactusBack PS1/PS2 move editors (ADJACENT: preserve-size/padding + unknown-bytes-on-save pattern for future .jsfb/index edits), SVR music (empty), trainer-mods (SEO spam, duplicate). All IRRELEVANT, no borrows except the CactusBack save-discipline pattern.
- Ours (AuroraForge_WWE_PC-Game_Modding_Tool): README-claims only, in-repo follow-ups BUILDING.md/FAQ.md.

## 2026-09-17 - External survey batch 2 (user-supplied list)
- RELEVANT (model side, not current anim/texture path): Pokeytroll195/Yukes-WWE-2k19-YOBJ-JBOY-Blender-Plugin (Blender 4.2+ .yobj import/export, byte-exact roundtrip, morphs-as-shape-keys, POF0 regen — alignment/offset rules transfer to .mdl work); l1145a1/YOBJ-Mesh-Object-Editor-PSP (YOBJ multi-mesh rebuild + DAE bone-weight flow + 8-bones-per-mesh limit logic).
- ADJACENT: MonsieurHidan/WWE-2K-Sender (mod organizer/deployer, no mount/archive logic); TomD554/SvR-2009-Importing-Tool (DAT rebuild workflow, no spec); l1145a1/String-Editor-for-WWE-PSP (offset-recalc + rebuild pattern for future SDB/.jsfb string work).
- IRRELEVANT (verified): Keshire/WWE2K15-Tools (stub), LLBuildsAI UI rebrand (content mod, no tooling), HeroPuck/wwe-2k23-mods (empty), gorilla mod-manager (repo gone/404).
- DELIBERATELY NOT FETCHED: 10× trainer/tracker/unlocker utilities (memory cheats + web trackers — no archive/format tooling by definition); 8× adult texture-pack repos (content, no tooling); raw search URLs (no action).
- Net: nothing changes the current animation/texture critical path. YOBJ leads filed for the future model-work phase.

## 2026-09-17 - Upstream repo cloned, EVERY file checked (user: "check every damn file")
- Clone: `_work\upstream-caketools\` (nothanley/CakeTools-AlphaPreview = HanleysFramer, same person renamed). NO loader, NO source, NO tools in repo — verified complete inventory:
  1. README.md (58B, 2 lines, "CakeTools for WWE 2K20").
  2-5. bakedfile06-09.cak: 41,527B each, FDIR v6.8 flags `01 C0`, 06vs07 = 747 diff bytes starting at offset 8 (identical template, per-index filename-derived keys). Our reader rejects all four (C0 payload-protect flavor). San847 copies hash-identical (one source, not two).
  6-7. DELETED 3DSMAX scripts recovered from git history: `_WWE20_MDLRig.ms` (11KB, "VisCon MDL 2019" importer) + `_WWE20_MDLExport.ms` (16KB, exporter). Filed for model phase.
- Releases (not cloned): v0.977a = latest (55MB: GUI + SDBEditor + Model Merger + MTLsEditor). MediaFire Spider-Man→Reigns bakedfile06 sample = known-good working-mod oracle, NOT yet pulled.
- "Working loader" correction: upstream has NO loader — mount path remains ours alone (SDCL). Their chain = GUI bake + (unknown community load method: replacement/patched-exe — worth asking thread).

## 2026-09-17 - Sanitized release pipeline (user: Releases repo = compiled releases ONLY)
- Leak confirmed: 9/14 public EXE embedded full tools/ (143 JS incl. converters/research). Zero commits/pushes from this session; exposure predates me.
- Fix BUILT: scripts/stage-public-tools.js (fail-closed 14-file allowlist = 19-20 runtime closure + patreon gate) + app/package.json now ships ./public-tools instead of ../tools (resource path unchanged, main.js untouched). app/public-tools/ gitignored (generated).
- Fresh portable built 20:49 (76MB): bundled aurora-tools/tools/ = EXACTLY 14 files, zero tbuf/clips/adefs/victory-list/probe/test/research matches.
- PENDING: publish to Aurora-Forge-Converter-Releases (new 1.0.0b vs replace leaky 1.0.0a asset - user call) + commit of script/package.json/.gitignore (uncommitted, awaiting direction).

## 2026-09-17 - Visibility audit + push rule (user: stop exposing active work)
- FACTS (gh api, all repos): PRIVATE = Foundry, SDCL-2K25, CAK-Mod-Loader-2K25, Knowledgebase, Research, Animation-Research, Animation-Probes. PUBLIC = CAK-Mod-Loader, Modding-Tool, Custom-Music x2, DDS-Converter, Converter-Releases, Sanitized-Research, Animation-Research-Public. MusicOnly remote 404s (renamed upstream).
- All session pushes (2791bd2, 07da109, 724e62a prototype; d40baa3, ec8b74f Foundry) went to PRIVATE repos. ZERO pushes to public repos from this session. No live leak - but visibility was never checked before pushing (luck, not process).
- RULE (binding): verify `gh api repos/davegranlet/<repo> --jq .private` BEFORE every push. Active dev stays on private mirrors; public repos receive only curated releases/sanitized snapshots on explicit direction. No exceptions.

## 2026-09-17 - Branch convention: main + working everywhere (user-ordered)
- 15/15 own repos: `working` branched from main HEAD, pushed with tracking. tmp-wrestleminus-public skipped (third-party fork).
- Active repos (prototype, Foundry, SDCL) checked out to `working` locally. All code changes land on working; main only on explicit ready-merge. Skew rule: working pushed within 30 min of local commits.
- Pre-existing dirt carried, untouched: prototype dist churn, Secure build.yml deletion.

## 2026-09-17 - Full 23-repo reconciliation (user: 21 -> corrected 23)
- gh list = 23 repos. 8 were missing locally; all cloned: SDCL-2K26, Patreon-Verifier, Converter-App, 2K19-PAC-Tools, 2K19-to-2K20-Converter, Clips-Tools, Blender-Animation-Tools, wwecrap.
- All 23 now carry `working` (pushed + tracking). NOTE: SDCL-2K26 HEAD 44e5835 == local DataCtrlLink-MusicOnly HEAD (renamed clone - reconcile histories before merging either).
- Visibility map held separately above. Push rule + 30-min skew rule apply to all 23.

## 2026-09-17 - ALL 23 repos PRIVATE (user-ordered, verified via gh list)
- Flipped 10: Sanitized-Research, SDCL-2K26, Modding-Tool, Animation-Research-Public, DDS-Converter, Custom-Music x2, CAK-Mod-Loader, Converter-Releases, wwecrap.
- Note: public downloads (Releases EXE) and #1 spotlight now dark until user re-opens. Reversible per-repo with --visibility public.
- Rule stands: active dev on private working branches; 30-min skew; visibility check before every push.

# SESSION CONVERSATIONS (split from ACTIVE log 2026-09-17)

Dialogue directives, corrections, disputes and decisions. Commands/results live in their topic logs.

## 2026-09-17 - Session conversation record (user-directed: "log conversations as well")

### User directives given this session (in order, condensed)
- Set AuroraDev role + 2K20→2K22 converter as exclusive active goal; autonomous execution, log every response with Active Session Log.
- "Continue if you have next steps, or stop and ask for clarification if unsure."
- Ordered work 1-2-3 with (3) log-updates mandatory every session; new v8.3 round + side task to combine test methods.
- Pointed to `D:\WWE26-mods\CakeView v1.10.0`, tribute dirs, `Cakehook 60` for keys (checked; no keys found).
- Will bake 2K22 folders with another tool meanwhile; asked about oodle DLL contents/encryption.
- "Read the active log"; demanded audit of `C:\Games\` extracts + 2K23/2K25 installs with every path logged.
- Pressed on v8.3 ("you cracked later versions, why so hard") — drove primitives verification + mod-loader focus.
- Corrected: extracted sources are full `Root` trees (not Animation\Victory); read-only rule, copy-before-use.
- Replaced 2K20 source with `D:\WWE26-mods\extracts\2k20\Root`; confirmed 2K26 root identity (corrected my duplicate claim).
- "Coders took cheapest option — step back and recompare yearly" (adopted as method; paid off twice).
- "Hash decoded the ANIM — look for word codes" (led to CRC32C bone-hash crack).
- Ordered full GitHub sync: all PRs to main, 100% local==remote (done; PR #8 opened, later closed unmerged by user).
- Corrected in-game test design (IDs not UI-visible); supplied Custom Victory screenshot thread.
- Questioned baker vs 2K20 (answered empirically: v9.3-only); pinned external baker `D:\bot-crap\CakeToolsv098a\release`; corrected CakeTools 2K22 folder flow; challenged bakedfile08 (non-stock verdict stood); reported stock-Rock verdict; asked what .acts/.adefs hold (measured); SDB editor ownership asserted (scoped to strings by me); demanded v8.3 packer stopgap ban (own-tools-only) then reversed to hands-on help which I gave (_mods staging).
- Demanded 19→20 re-verification (passed genuine), asserted zero in-game animation tests (confirmed), corrected 2K20-installed (I was wrong), demanded own-tools-only working 19→20 test NOW (loose-file staged).
- STOP order (obeyed, work frozen), "you are being stupid" (friction noted, no technical content), full-log read + 100% inventory demand (this entry), "log conversations as well" (this entry).

### Assistant errors owned this session
- Exact-match dir checks failed twice (WWE 2K20 spacing; C:\Games vs D:\) — fuzzy-list rule adopted after second offense.
- Mislabeled 2K26 root as 2K25 duplicate (retracted same turn on user correction).
- Hex-endianness misread twice (same trap, both directions) — u32LE-only comparison rule.
- Stats pair-vs-slot confusion on v2 audit (resolved: pairs≠slots, 5 identical pairs).
- Tmp-file leftovers in notes/ required a user nudge to clean — cleanup now part of every log-append step.
- Over-theorized before measuring (user's cheapest-option correction); asked user for GUI-side info twice that logs already held.

### Standing user-provided facts (single reference)
- BakeMe folders = directory structure only. External 2K22 baker = `D:\bot-crap\CakeToolsv098a\release` (config points at 2K22 exe). 2K20 root = `D:\WWE26-mods\extracts\2k20\Root`. 2K26 root = `D:\WWE26-mods\extracts\Root`. 2K20+2K19 installed (Steam common, spaceless 2K20 name). Solved 25/26 .jsfb writers exist in repo tools. Clips Editor = black-box reference only.
- `D:\promptfordumbbots` is GONE (user-confirmed 2026-09-17). Canonical-continuation-prompt heartbeat spec referencing it is VOID. Resume source = active log files + GitHub state. No replacement canonical path named yet.

## 2026-09-17 - Course correction: ADDITIVE-ONLY, forest-not-trees (user-directed, binding)

### Directives (override all prior overwrite-framed plans)
- Overwriting stock content (e.g. Victory 6100) is lazy and FORBIDDEN as a project path. All 19→20 conversion work is ADDITIVE: converted 2K19 animations become NEW entries, only for animations that do not exist in 2K20.
- Stop narrowing to 6100. Work the FULL animation set across both games: compare ALL animations game-vs-game (all entrance/victory categories in one diff), find what is missing, convert that.
- Texture test BEFORE animation test: prove the mount→visible path with a 2K20 Rock texture via the proven v6.8 pack + loader route first. Pass = override path works, animation work proceeds. Fail = shadow path broken, debug that before animation content.
- Victory-list/index question (user-asked, OPEN): new animations may need index registration; 2K20 equivalent of VictoryListData.jsfb unlocated; confirm whether any tool writes it for 2K20 (answer so far: no — writers exist only for 2K25/2K26 `Vict` files).
- NO unscoped filesystem searches. D: is ~6TB near-full; never run recursive/unbounded scans. Named-folder listings of already-inventoried paths only; ask first if a new root is needed.

### Phase plan approved by user (2026-09-17, build mode)
- Phase 0: reconcile git state (Prototype e28b35f confirmed pushed ancestor of 8115b1e, local==remote 0/0 — earlier "ahead=1" log line STALE; Secure build.yml deletion pre-existing intentional, left untouched; untracked skips confirmed intentional).
- Phase 1: full 19-vs-20 entrance/victory animation-set diff, all categories in one pass.
- Phase 2: Rock texture test via v6.8 + loader.
- Phase 3: additive bridge (generalize past 6100) → 20→22 → 2K25 .clips/.adefs writer, every stage gated on in-game evidence.

## 2026-09-19 - Continuity-guard reconciliation (read-only)

- Trigger: `aurora-forge-continuity-guard` heartbeat. Fixed goal remains a usable WWE 2K19 -> WWE 2K25 entrance/victory converter with runnable modern `.clips`/`.adefs` output and evidence; no completion claim changed.
- Commands run after first reading `ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md` as required:
  1. `Get-Content ...ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md -Tail 180` — exit 0. Confirmed the 2026-09-18 direct-2K25 token-value encoder task is the logged technical next step.
  2. `git status --short` and `git log -1` in Prototype, Clips-Tools, CAK-Foundry, and 2K25 CAK loader — exit 0. The workspace is newer than the handoff's prior checkpoint: Prototype HEAD is `66fccdd` (2026-09-19, `Fix imported clips builder return value`); 2K25 CAK Loader HEAD is `5ed4e43` (2026-09-19, `Early-mount worker...`). Prototype has pre-existing generated-package churn plus modified `AURORA_FORGE_ACTIVE_STATE.md`, `notes/AUDIT-2026-09-19-WORKSPACE-CODE.md`, and `notes/LOG-LOADER-GAMEDIR.md`; CAK-Foundry has untracked `app/tools/` and `package-tests/`; 2K25 CAK Loader has a modified `src/plugins/mod_loader/mod_loader.cpp`.
  3. `Get-Content ...LOG-CONVERSATIONS.md -Tail 100` — exit 0. Confirmed the main Active Log remains a split index/ledger, so this reconciliation is recorded here rather than appending chronological detail to the main file.
- Result and proof: the handoff's top level is stale with respect to current Git heads and dirty-tree inventory. This entry restores a concrete cross-chat checkpoint without repeating any animation scan, extraction, or codec test.
- Safety boundary: no source, package artifact, loader, or animation code was edited; no test was rerun. Do not interpret the 2026-09-19 commit names as proof of valid converted motion or in-game playback.
- Exact next technical action remains unchanged: build a stock-byte-identical ULEB token value encoder for the 2K25 8102 `rec0` hips track from decoded `(frame, value)` pairs, then and only then resample 2K19 6100 hips into a copied 2K25 6100 body record for validation, bake/mount, and a separately recorded in-game verdict. Before any edit, reconcile whether another chat owns the current dirty files above.

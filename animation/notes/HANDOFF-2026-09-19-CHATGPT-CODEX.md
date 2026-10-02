# Handoff — Aurora Forge one-app cleanup + converter mount timing — 2026-09-19 (for ChatGPT/Codex)

## How to open (do this first, in order)

1. `WWE2K19-to-2K26-Entrance-Prototype/AURORA_FORGE_ACTIVE_STATE.md` (top entry = newest; full session record)
2. `WWE2K19-to-2K26-Entrance-Prototype/AURORA_FORGE_CONVERSATION_LEDGER_2026-09-19.md` (governing requirements + final task prompt)
3. This file (current work queue)
4. Verify live state before acting: `mods/` contents + hashes, `DataCtrlLink.log` tail, `git status --short` in the repos you will touch. If anything differs from §2, log it in the Active Log first.

All paths below are Windows. Repo root: `D:\AuroraForge-Aug26\`. Game: `C:\WWE 2K25 Saturday Nights Main Event\`. Temp scratch: `C:\Users\dgran\AppData\Local\Temp\opencode\`. Never touch `D:\zips` (user's private folder). No unscoped filesystem scans (D: is ~6TB near-full); named-folder listings only.

## Mission (corrected scope — read carefully)

Aurora Forge is a **consolidated modding tool that does everything**; the WWE 2K19→2K25 animation converter is **one small section** of it. A prior thread drifted into converter-only tunnel vision; the user corrected this. Current program, in order:

1. **Clean up** the 27 repos (dedupe, retire dead splits, promote proven scripts into repo tools with tests; commit nothing without user approval — all current changes are uncommitted working-tree changes).
2. **Extend the flagship app** `AuroraForge_WWE_PC-Game_Modding_Tool` (aurora-forge@1.7.5 Electron — Home/Projects/Prompt Builders/Tools/Tutorials/Setup + Modding Hub + Mod Workshop; CAK Foundry + DDS Converter already embedded pages) so every tool has its own section.
3. **Converter mount timing** (queued behind cleanup): solve pre-frontend mount so TEST 14000 surfaces in-game.

## Live state snapshot (verified 2026-09-19, ~17:30 Eastern)

- Game `mods/` stages ONLY `aurora-14000-compat-v103a.cak` (56,080,748 bytes, SHA-256 `E57757C7C9B141EF8D5A24B67E9B552AD02E6A07A679544913B7783478B0578C`, hash-verified = source).
- `aurora-disabled-tests/` holds: `aurora-14000-tribute-v160-v102k.cak` (`C1DE81…4ACA`, 10,365,112), `control-untouched-tribute-v160.cak` (`AE2AAD…7739E`, 10,120,488), `aurora-14000-testv102g.cak`, `aurora-6185-testv102f.cak`, `tribute-bake-test-sept19.cak`.
- `DataCtrlLink.log`: 552 lines, ends 17:25:53 `ACCEPTED CAK aurora-14000-compat-v103a.cak`, `accepted=1 rejected=0 failed=0`. Installed loader pair is the OLD known-good build (dinput8 `92C26247…`, ftrib `B8C8A7A9…`).
- New loader binaries are built but **NOT installed** (game folder untouched by design): ftrib `A1EDB725C56C57841D16234C34E1BEBF70B761B60C8E63717D0C8F8650A4845D` in `Aurora-Forge-CAK-Mod-Loader-WWE2K25\build\`; dinput8 `17FA5CBCE26673C2722EE10F8516622D001BF4475A4840FCB22D5428EE6AA304` in `Secure-DataCtrlLink-WWE2K25\build\`. SDCL `working` branch: 2 modified files (A1ED registry entry + test pin). Mod-Loader `main`: 1 modified file (file-open observer). Clips-Tools: 31 deletions + README/package.json pointer stubs (uncommitted).

## Converter story (compressed — do not redo any of this)

- v102k (full Tribute 26 v1.6.0 aggregate + 14000 additions): loader-accepted 15:43:20, game crashed ~2s after mount (70MB dump preserved at `C:\Users\dgran\AppData\Local\WWE 2K25\CrashReporter\Crashes\reports\2edea632-….dmp`).
- Untouched v1.6.0 control (`control-untouched-tribute-v160.cak`, 62/62 files verified): crashed identically (new 61MB dump 16:29:09). **Crash is NOT from our additions.**
- Web + local proof: **Tribute 26 is the WWE 2K26 line** (April 2026); the 2K25 line is Tribute 25. v1.6.0 SDB is 2K26-generation encoding (1,333/113,783 records decode vs 81,209/96,290 on 2K25 family). The v1.6.0 base must never be used for 2K25 again.
- v103a (Tribute-25-family base + validated 14000 clips/adefs + missing Cutscene 14000 entry via shared-vtable splice): **loads crash-free, loader-accepted**, but user video proves TEST 14000 absent from the MOTION: FACE T section (TERRY FUNK → "THE BAD GIRL" with no gap). Offline bindings complete and verified (93/93 non-texture payloads byte-identical on unpack).
- Remaining variable is **serving order**: frontend reads Victory/Cutscene tables before the window-thread mount lands. Package iteration is STOPPED. Fix = pre-frontend mount.
- Tribute 25's own recipe (user experiment, whole-tree diff): Victory + Entrance + SDB only (3 files), stock-motion clones, NO Cutscene write, no new assets. Our converter goal (genuinely NEW imported motion) needs the Cutscene+assets path v103a already ships.

## Queued work (in order)

1. **Promote Temp one-offs → repo tools with tests** (only these from this session; Temp holds ~100 older research scripts — out of scope):
   - `cut-append-shared.js` → `WWE2K19-to-2K26-Entrance-Prototype/tools/clips-codec/` as shared-vtable Cutscene appender + `.test.js` (strict validation: count+1, all tables vtableBytes=22/in-bounds, entry at last slot, clone words). Do NOT promote `cut-append22-trial.js` (superseded broken approach).
   - `sdb-read.js`, `sdb-scan.js` → SDB inspection tool(s) + test on the "Testing 6"/"Test 14000" vectors.
   - `entry-diff.js`, `ent-diff.js`, `ent-find.js`, `cut-sizes.js`, `cut-dump.js`, `cut-vdist.js`, `cat-sum.js` → fold into existing parse/inspect tools or one diff helper; delete Temp originals after.
2. **Flagship extension** per section map in Active Log ("One-app audit complete" entry): Conversion Lab, keep Foundry/DDS pages (dedupe standalone DDS repo), wire 2K25 fully into Mod Workshop, Music section, Patreon gate stays, Knowledgebase stays a link.
3. **Loader reinstall + PRE-WINDOW launch test**: fresh-install dinput8 `17FA…` + ftrib `A1ED…` with byte-level content verification (never hash-equality across reproducible builds; clean before release builds), stage v103a fresh as sole CAK, user launches once, check log for `PRE-WINDOW ACCEPTED` / `Observed VictoryListData open` lines with timestamps.

## Hard constraints

- Additive IDs only (new motion IDs from 14000); preserve stock files/IDs; never reuse stock 6185 (occupied: THE USOS 1).
- Exactly one registry-bearing CAK enabled per test. Fresh-install mod files for each test (copy, never move-and-hope; verify SHA-256 both sides).
- Never claim in-game validity without crash-free load + visible TEST 14000 + preview evidence. Label offline/loader-only results exactly that way.
- Reuse repo code first: no new script until every local repo has been searched for the capability. Nothing lives in Temp permanently.
- Reference clones, unchanged target files, mockups, generic previews, or repackagers are never "conversion."

## Key paths

- Pristine v1.6.0 source (DEAD for 2K25, reference only): `D:\WWE26-mods\compiled releases for review\TRIBUTE 26 v1.6.0\TRIBUTE 26\BakeMe` (62 files, 19,841,251). Verified copy: `D:\AuroraForge-Aug26\_work\control-untouched-v160\BakeMe`.
- Compatible 2K25 base: `D:\AuroraForge-Aug26\_work\14000-user-bakeme-v102i\BakeMe` (130 files). Transplant tree: `D:\AuroraForge-Aug26\_work\14000-compat-v103\BakeMe` + baked `aurora-14000-compat-v103a.cak`.
- Tribute 25 live install: `D:\TRIBUTE 25 v1.5 Merged With Latest UPDATE Files\TRIBUTE 25`. Baselines: `_work\trib25-v15merged-baseline.tsv` (237 files), `_work\trib25-v108-baseline.tsv` (172 files, spare).
- Videos: `D:\videos\sept-19-2026\` (`2026-09-19_17-26-01.mp4` = v103a picker verdict).

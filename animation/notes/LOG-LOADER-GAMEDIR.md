# LOADER-GAMEDIR (split from ACTIVE log 2026-09-17)

## 2026-09-16 SDCL 2K22 mod loader — built, installed, verified working

### SDCL build

- Built from `D:\AuroraForge-Aug26\Secure-DataCtrlLink-WWE2K25` using LLVM-MinGW
- `build.ps1` succeeded: `build/dinput8.dll` (1,598,464 bytes)
- Copied to `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22\dinput8.dll`

### Code changes to SDCL

1. `src/core/profiles.hpp` — Added `exe_name` field to `GameProfile`, added `#include <span>`, added `all_profiles()` declaration
2. `src/core/profiles.cpp` — Added `exe_name` to each profile entry ("WWE2K22_x64.exe" for 2K22, "WWE2K25_x64.exe" for 2K25), implemented `all_profiles()`
3. `src/proxy.cpp` — Changed hardcoded `WWE2K25_x64.exe` to scan all profiles for the exe that exists in the game directory

### In-game verification

- Launched 2K22 with `dinput8.dll` in game directory
- Game loaded to main menu cleanly (no crashes, no error dialogs)
- Log output:
  ```
  [2026-09-16 03:08:58] Secure DataCtrlLink Orchestrator started
  [2026-09-16 03:09:50] Identified game version: WWE 2K22
  ```
- SHA-256 verification passed against the 2K22 profile
- VirtualProtect hook installed (no addons to mount, so mount phase not triggered)

### Remaining blocker for addon testing

- `cak_validator.cpp` line 149: expects FDIR v9.3 header `46 44 49 52 09 09 00 81`
- 2K22 uses FDIR v8.3 header `46 44 49 52 08 03 01 C0`
- V8.3 encryption scheme differs from v9.3 — brute-force key search over 2M counts found no match
- CAK Foundry has a `cak20-reader.js` that handles v8.x with FNV1a-64 name-based key derivation and simple XOR deobfuscation — different from the v9.x stateful block cipher
- Any CAK placed in `mods/` will be rejected by the validator until v8.3 support is added

### Next step

- Adapt `cak_validator.cpp` to support FDIR v8.3 (either integrate the v8.x decryption from CAK Foundry or add a passthrough mode for testing)
- Then create a test CAK addon and verify mount injection in 2K22

## 2026-09-16 SDCL architecture fix — exe scanning, v8.3 passthrough, plugin system

### Problem: DLL looked for wrong exe name

- proxy.cpp hardcoded `WWE2K25_x64.exe` — 2K22 uses `WWE2K22_x64.exe`
- First launch showed: `ERROR: Game executable not found at ...\WWE2K25_x64.exe`

### Fix: per-game exe scanning

- Added `exe_name` field to `GameProfile` struct in `profiles.hpp`
- Added `exe_name` to each profile entry ("WWE2K22_x64.exe" for 2K22, "WWE2K25_x64.exe" for 2K25)
- Updated `proxy.cpp` to scan all profiles for the exe that exists in the game directory
- Added `all_profiles()` function to profiles API
- Rebuilt and reinstalled — second launch successfully identified WWE 2K22

### v8.3 CAK validator fix

- `cak_validator.cpp` in Secure-DataCtrlLink repo: rewrote to support both v8.3 and v9.3
- v9.3: existing stateful block-cipher with brute-force key search
- v8.3: added FNV1a-64 name-based key derivation from CAK Foundry `cak20-reader.js`
- Discovered v8.3 decryption produces garbage — the cipher is different from what CAK Foundry's 2K20 reader uses
- Added v8.3 passthrough mode: accepts FDIR v8.3 headers with basic structural check, full cipher not yet ported
- Same passthrough added to `Aurora-Forge-CAK-Mod-Loader-WWE2K25` repo's `cak_validator.cpp`

### Plugin architecture discovery

- SDCL dinput8.dll is just the **orchestrator** — it loads approved addons from `plugins/*.ftrib`
- The CAK mod_loader is a separate DLL built from `Aurora-Forge-CAK-Mod-Loader-WWE2K25`
- Mod_loader reads profiles independently (has its own copies of profiles.hpp/cpp)
- Updated mod_loader's profiles.hpp/cpp to match orchestrator (added exe_name, signatures, 2K22 profile)
- Built `AuroraForge.CAKModLoader.ftrib` (1.6MB)
- Added to approved addon registry with SHA-256 `c9e20c9e040b6c15adadd24b83d07f541a834fd342a55ce7f3b159f4ad7578da`

### Save data corruption investigation

- User reported "save data corrupted" message on first DLL launch
- Removed DLL — message persisted
- Root cause: pre-existing cloud save sync issue with WWE 2K22, not caused by our DLL
- User resolved by overwriting corrupted save with new save

### Current install state

- `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22\dinput8.dll` — orchestrator
- `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22\plugins\AuroraForge.CAKModLoader.ftrib` — CAK mod_loader
- `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22\mods\` — empty, ready for test CAKs

### Next step

- Launch 2K22 with full plugin stack, check log for mod_loader initialization
- Test mount hook by placing a CAK in `mods/`
- Port v8.3 cipher (or accept passthrough for now)

## 2026-09-17 - In-game test design: IDs are not UI-visible; override test staged (user-directed)

### Identities (from 2K20 .evd name strings)
- 6204 = `6204_VIC_Ruby_Riot_F_Face` (2K20-only; absent from 2K22). 6118 = `6118_VIC_Chris_Jericho_M_Face`.
- In-game UI shows superstar names, never numeric IDs — user cannot "look for 6204".

### Visibility problem + resolution
- NEW IDs (6204-as-6204) need victory-list registration to load; 2K22 list location still open (not in Entrances/EntranceListData.jsfb — no victory strings/IDs there; not Sdb/ languages; 2K25 path Entrances/VictoryListData.jsfb has no 2K22 counterpart found yet). An unregistered new ID risks a silent nothing-observable test.
- OVERRIDE test instead: v2-converted 6204 motion baked UNDER 6100 (The Rock, selectable superstar, stock 6100.acts exists in 2K22). Triggering Rock's victory plays the file unconditionally — no registration needed. Ruby Riot's motion on The Rock's body = unmistakable transfer signal.

### Override run: 6204 (new root) → 6100 template → `_work\2k20-to-2k22-6204on6100\6100.acts`
- 15 pair-writes (+38 odd/+31 structural/+21 short/+2 nofloats; trailingKept=2 = TWO N→N+1 block pairings, second one unexamined — noted). Output `93DE16...` ≠ stock `2000CB9A...`, 393244B, container-valid.
- Only 4 of 6100's 15 entries paired (13,12,10,0 — source-limited); other 11 keep template. Main-body entry 0 converted; face/finger/prop entries partially stock = smaller blast radius, fine for signal test.
- Staged: `_work\2k22-bakeme-6100override\BakeMe\Animation\Victory\` = `6100.acts` (v2) + stock `6100.adefs`.

### In-game instructions for user
1. Bake `_work\2k22-bakeme-6100override\BakeMe` with their tool, install mod CAK, launch 2K22.
2. Play as The Rock, win a match (any mode showing his Face victory).
3. WATCH: Ruby Riot-style female victory motion on The Rock = TRANSFER PROVEN (film it). Stock Rock victory = slots wrong (report back → next slot rule). Crash/freeze = note where (menu/win/victory) → blast-radius bug, report back.
## 2026-09-17 - Canonical EXTERNAL 2K22 baker/extractor pinned (user-directed)

- **Path:** `D:\bot-crap\CakeToolsv098a\release` — this is THE current (NOT ours) WWE 2K22 baker/extractor. All 2K22 BakeMe→CAK baking and 2K22 CAK extraction goes through here unless stated otherwise.
- **Contents verified:** `CakeTools.exe` (13.6MB Qt GUI baker/extractor) + companions `MTLs_Edit.exe`, `SDB_Editor.exe`, `MTLs_Shaders.ini`, `mtlsView.bin`, full Qt5 runtime (Core/Gui/Widgets/Network/OpenGL/3D/Gamepad/Svg) + software GL (`opengl32sw.dll`, `libEGL/GLESv2`, `D3Dcompiler_47.dll`). No version metadata in binary (0.0.0.0) — version identity = folder name v098a.
- **Division of labor (restored):** OUR baker (`Aurora-CAK-Foundry`, CakeTool backend) = v9.3 pack only (verified; v6.8 NotImplemented, v8.3 broken). EXTERNAL baker (this path) = 2K22 (v8.3) BakeMe baking + extraction. Staged BakeMe folders (`_work\2k22-bakeme-6204v2\`, `_work\2k22-bakeme-6100override\`) are inputs FOR this tool.
- Rule: do not "fix" 2K22 baking inside our toolchain while this external path is canonical; our v8.3 cipher work stays background research.
## 2026-09-17 - CakeTools 2K22 bake flow corrected via local+web research (user-directed)

### Local findings (`D:\bot-crap\`)
- v098a `release\config.ini` = single line: `WWE_Path=D:/Program Files (x86)/Steam/steamapps/common/WWE 2K22/WWE2K22_x64.exe`. The external baker resolves version/keys FROM THE EXE — our staged BakeMe + this config = coherent 2K22 pipeline. No other docs in folder (only MTLs_Shaders.ini besides binaries).
- Sibling `CakeTools2021_v0977a` (2K20-era) ships `_3DSMAX20_Scripts` (`_WWE20_MDLExport_v101.ms`, `_props_v101.ms`, `_WWE20_MDLRig_v101.ms`) — model/rig side, noted for future rig work, not animation now.

### Web findings (prowrestlingmods.io 2K22 wiki, Installing Your First Mod)
- 2K22 bake flow DIFFERS from our v9.3 CLI: input must be a **`_mods` folder inside the game dir** (create it; merge mod files in preserving virtual paths), then CakeTools **File > Bake a Folder** → select `_mods` → choose CAK **index number (default 8)** → writes `bakedfile08.cak` into the game dir. Re-bake on every mod change. Prereqs per wiki: patched exe for custom CAKs + CakeTools fonts.
- CORRECTION to my earlier instruction: do NOT point the baker at `_work\...\BakeMe` directly — merge BakeMe CONTENTS into `<game>\_mods\`, then bake `_mods` at index 8.

### Live game-dir state (verified)
- `<game>\_mods` does NOT exist yet → create it.
- `bakedfile08.cak` ALREADY EXISTS (171,283B — small, almost certainly a previous mod bake). Baking index 8 OVERWRITES it → BACK IT UP FIRST (rename to bakedfile08-backup.cak or move out).
- Stock CAKs 00–07 present (~5GB each). Our Aurora dinput8.dll + mods/ + plugins/ coexist in the same dir — no action, just noted.

### Corrected Job-1 bake steps for user
1. Back up existing `bakedfile08.cak`.
2. Create `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22\_mods\`, copy CONTENTS of `D:\AuroraForge-Aug26\_work\2k22-bakeme-6100override\BakeMe\` into it (gives `_mods\Animation\Victory\6100.acts` + `6100.adefs`).
3. Open `D:\bot-crap\CakeToolsv098a\release\CakeTools.exe` → File > Bake a Folder → select `_mods` → index 8 → OK.
4. Launch, play as The Rock, win → watch victory. Ruby-motion = proven; stock = slots wrong; crash = report where.
## 2026-09-17 - bakedfile08 verdict: NON-STOCK; bake at 09; mods/ holds 4.5GB dead copy (user-directed)

### Evidence (all verified, not assumed)
- Stock CAKs 00–07: all dated 8/26/2026 6:02 PM (install), ~5GB each, FDIR v8.3 (`0803` seen on 07).
- `bakedfile08.cak`: dated 9/16/2026 10:19:50 PM (3 weeks post-install), 171,283B, FDIR **v8.2** (`0802`). Non-stock by date + version + size. Likely an earlier community bake (or updater artifact — unknowable); verdict: UNKNOWN, DO NOT TOUCH, do not overwrite.
- `mods\` contains a 4.5GB copy of stock `bakedfile07.cak` (install-date timestamp = copied, not baked). Our 2K22 loader log (DataCtrlLink.log in game dir) shows the full story: run 1 "No mod CAKs prepared"; run 2 tried mounting that stock-07 copy as a mod → "FAILED CAK bakedfile07.cak: game mount routine returned false" (expected: stock archives reject custom-slot mounts). Loader itself works (identifies WWE 2K22, ftrib loads, mount attempted).
- `plugins\AuroraForge.CAKModLoader.ftrib` present (9/16). No `mods\manifest.json`.

### Decisions
- Bake index for Job 1 (and Job 2): **09** (next available; 00–08 all occupied). CakeTools bake dialog → enter 9 → `bakedfile09.cak`. 08 stays untouched.
- Recommend deleting `mods\bakedfile07.cak` (4.5GB dead weight, proven unmountable, stock copy exists in game root). Command for user: remove `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22\mods\bakedfile07.cak`. Left for user to run (game-install deletion).
- Load caveat (honest): wiki documents slot 08 as the mod slot; 09-loading under patched exe is UNVERIFIED. If 09 doesn't load: fallback A = back up 08 out of the folder, rebake at 8; fallback B = route through our Aurora loader explicit mount (bypasses index scan entirely). Report-back decides.

### Corrected Job-1 steps (supersedes _mods-merge note only in index)
1. (User) delete `mods\bakedfile07.cak`. 2. Create `<game>\_mods\`, merge `_work\2k22-bakeme-6100override\BakeMe\` contents. 3. CakeTools → Bake a Folder → `_mods` → index 9. 4. Launch, Rock, win, watch victory.
## 2026-09-17 - Verdict on "stock Rock": mod never loaded, nothing falsified (user-directed)

### User report
- In-game Custom Victory preview of THE ROCK shows stock Rock motion, not Ruby Riot. (Screenshot: MOTION:FACE picker + X PREVIEW UI — fastest test loop, no match needed.)

### Forensics: why stock is EXPECTED, not a falsification
- `bakedfile09.cak` (171,283B, 9/16 10:29 PM) header: FDIR **v8.2** (`0802`), same version+size as the vanished `bakedfile08.cak` (171,283B, 9/16 10:19 PM). 09 = renamed-08 OR second empty bake; EITHER WAY it cannot contain our content: no `_mods` folder ever existed (still absent), and our files were never staged into one. Two same-evening 171KB v8.2 files = user bake attempts with empty/missing source, not our mod.
- `mods\` dir deleted entirely (user cleanup — good: removes the dead 4.5GB stock-07 copy; loader log run 3 already showed "No mod CAKs prepared").
- Loader log latest (22:29:57): orchestrator started, identified 2K22, prepared nothing, ftrib loaded. No mod mounted in any session yet.
- Lesson (mine): capture full 92B header + SHA-256 on FIRST sight of unknown files (08's catalog bytes/hash were never recorded; identity of 09-vs-08 now circumstantial).

### Standing hypotheses, unchanged
- v1 slot rule (+36/+40/+44 even children): UNTESTED (not falsified). 22-pair v2 output staged and valid.
- Watch-item (new): baked files read v8.2 while stock catalog is v8.3. If a properly-staged bake at 09 also fails to load, version mismatch is suspect #1; fallback = our Aurora loader explicit mount (bypasses index scan) or backup-08-and-use-8.

### Corrected Job-1 steps (final)
1. Back up `bakedfile09.cak` OUT of the game dir (it may be the only copy of whatever the evening's bakes produced). 2. Create `<game>\_mods\`, merge `_work\2k22-bakeme-6100override\BakeMe\` CONTENTS. 3. CakeTools → Bake a Folder → `_mods` → index 9 (overwrites 09 fresh). 4. Launch → Custom Victory → THE ROCK → X PREVIEW.
## 2026-09-17 - Staged _mods in game dir for user (user-directed, hands-on help)

- User stuck on merge step; did it for them: created `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22\_mods\Animation\Victory\` and copied v2 `6100.acts` (393,244B) + stock `6100.adefs` (4,219B) from `_work\2k22-bakeme-6100override\BakeMe\`. Verified on disk.
- "400KB what" answered: a successful bake's `bakedfile09.cak` should total ~400KB+ (397KB content + catalog); 171KB again = baked nothing.
- Remaining user-side GUI steps only: CakeTools → File > Bake a Folder → select `_mods` → index 9 (backs up old 09 first) → launch → THE ROCK → X PREVIEW.
## 2026-09-17 - Bake wrote identical bytes = baked air, not content (user-directed)

### Evidence
- Post-bake `bakedfile09.cak`: 171,283B, hash `EFE71F97…` — IDENTICAL to pre-bake file. Timestamp fresh (10:38 PM) but bytes unchanged.
- Conclusion: CakeTools baked EMPTY content again (3rd identical 171KB file: ex-08 22:19, ex-09 22:29, now 22:38). Empty bakes are deterministic. Our `_mods` content (397KB) was NOT picked up → almost certainly wrong folder selected in the Bake dialog (or equivalent miss), not a converter/slot issue. v1 slot rule still UNTESTED.
- Watch-item added: v098a is launch-era ("for 2K22 v1.02-11, before the Cak file updates" per authors) while the game install is current (stock v8.3; bakes emit v8.2 headers). If a content-carrying bake (~400KB+) still fails to load, version mismatch becomes suspect #1.

### User retry steps issued
- In Bake dialog, select exactly `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22\_mods` (created 10:35 PM, holds Animation\Victory\2 files), index 9. Success = ~400KB+ 09 with changed hash (verified by me after).
## 2026-09-17 - Bake dialog verified correct via screenshot (user-directed)

- Screenshot of CakeTools 2022 v0.9786a "Select Bake Folder": breadcrumb ends at `WWE 2K22\_mods`, main pane shows our `Animation` folder (10:35 PM), left tree highlights `_mods`, Folder field = `_mods`. Selection is CORRECT (previous empty bakes = wrong folder picked, now fixed).
- Pending: user clicks Select Folder → index 9 → bake. Success = ~400KB+ 09 with new hash (verified by me after). NOTE: background shows a second AI session tab open with relayed text from this thread — keep advice consistent across sessions; single source of truth remains this log.
## 2026-09-17 - 4th identical empty bake WITH correct folder selected (user-directed)

### Evidence
- Post-bake `bakedfile09.cak`: 171,283B, hash `EFE71F97…` UNCHANGED (fresh 10:46 PM timestamp, identical bytes). Fourth deterministic empty output — now with `_mods` visibly correct in dialog (contains Animation\Victory\2 files, 397KB).
- "Wrong folder" theory DEAD. Live hypotheses: (a) tool silently skips files it can't parse (our converted .acts? any .acts?); (b) v098a's Bake-a-Folder flow doesn't take animation files (wiki guide was texture-mod oriented); (c) bake reads a different source than the dialog folder.
- Discriminator asked of user first (zero-cost): what file count did the bake window report? 0 files = tool sees nothing (input/structure issue); 2 files = tool saw them but emitted identical bytes anyway (deeper bug).
- Control test queued if count was 2-or-ambiguous: stage STOCK 6118.acts+.adefs copies (not converted) in _mods, rebake — output grows = tool accepts acts format (problem = OUR converted file specifically, i.e. parser rejects v2 output → format error lead); still 171KB = tool ignores acts entirely (need different bake function/tool).

### Standing state
- v1 slot rule still UNTESTED (no content bake yet). v2 output validity (container-decodes, 5/5 TBUF blocks) stands as static evidence only.
## 2026-09-17 - Confirmed: zero animation in-game tests in project history (user-directed)

### Record check
- User is CORRECT: no converted animation (19→20 or otherwise) has ever been verified visibly in-game. All animation verification to date is structural (byte diffs, decode round-trips, suites). The sole in-game proof in project history is a TEXTURE override (moddedbake.cak baseline, 2K25).
- Reason 19→20 never got one: WWE 2K20 is NOT installed (verified absent) — only extracts. In-game testing is impossible without the game, not an oversight of method.
- The built 19→20 test package EXISTS and is ready: `_work\2k20-package-6100\Root\Animation\Victory\6100.acts` + `6100.evd` (both present). It waits only on a 2K20 install.

### Consequence
- The upcoming 2K22 Rock-preview test is the project's FIRST animation in-game test, period. That is why every link gets verified before trusting its verdict (bake content by hash → load → motion), and why a negative there stays ambiguous until load is proven. No process change; stated for the record.
## 2026-09-17 - 19→20 loose-file test staged with OUR package output (user-directed, our-tools-only)

### Rationale
- User forbade external tools and demanded a working 19→20 test NOW. Fastest our-tools path: 2K20 install has LOOSE dirs (AnimSystem/ratanim.bin+filters, pac, etc.) with NO Animation\ dir — staged one mirroring the CAK virtual path to test disk-first loading. Zero-risk (delete 2 files if nothing), zero new code, uses OUR package builder output.
- 2K20 `AnimSystem\` = `ratanim.bin` + `filters\` (2K20 global registry is .bin, not .adefs — noted for registry work).

### Staged (verified on disk)
- `D:\Program Files (x86)\Steam\steamapps\common\WWE2K20\Animation\Victory\6100.acts` (429,196B) + `6100.evd` (20,610B), copied from `_work\2k20-package-6100\Root\Animation\Victory\` (OUR 2K19→2K20 converted package, tests green).
- Test: launch 2K20 → The Rock victory (custom-victory preview if present, else win as Rock). Changed = 19→20 TRANSFER PROVEN IN-GAME (project first). Stock = loose ignored → proceed to our-loader 2K20 port + v6.8 WriteString implementation (queued). Crash = delete the 2 files, report where.

## 2026-09-17 - 19→20 test readiness re-verified (user-directed)

- Staged loose files re-verified in 2K20 install: Animation\Victory\6100.acts (429,196B) + 6100.evd (20,610B), SHA-256 CB170D4A… matches package output exactly. Nothing staged, moved, or deleted since.
- Status: 100% ready on tooling side. ONLY remaining step is user launches 2K20 → The Rock victory. Verdicts: changed motion = historic first animation proof; stock = loose ignored → loader/packer port; crash = delete the 2 files, report where.
## 2026-09-17 - Explicit: 19→20 test needs NO baking (user-directed, teaching aid)

### User question
"So i need to bake this as bakefile9.cak then?" — Answer: NO. Do not bake anything for the 2K20 test.

### Why (teaching aid: two load paths)
1. LOOSE-FILE path (this test): game checks disk (`<game>\Animation\Victory\6100.acts/.evd`, staged) before/fallback-to CAK catalog. Costs nothing, reversible (delete 2 files). Currently staged and awaiting launch.
2. CAK path (not now): would need a v6.8 packer. Neither baker qualifies — ours throws NotImplemented on <v8 (proven), external v098a is animation-blind (binary-proven). Building one = the queued loader/packer-port work, triggered ONLY if loose files are ignored.
3. Slot numbering is per-game: 2K22 stock = 00–08 (next = 09); 2K20 stock = 00–05 (next would be 06, NOT 09). Never copy slot numbers across games.

### Exact user steps (nothing else)
1. Launch WWE 2K20. 2. The Rock's victory (custom-victory preview if present, else win as Rock). 3. Report one of: changed motion / stock motion / crash-with-location.
## 2026-09-17 - What the loader loads: mod CAKs, never stock (user-directed, teaching aid)

### User question
"If the loader for 2K20 doesn't load a modded CAK, wtf does it load then?"

### Answer
It loads ONLY mod CAKs — small archives holding replacement files + a valid catalog for that game's FDIR version — by calling the game's own MountCakFn with the mod path (slot mode 2 = custom archive). It must NEVER load stock CAKs: the game already mounts those itself at boot; handing one back as a "mod" fails validation (proven: stock 07 → "game mount routine returned false"). The 07 failure proved the LOADER works (it called the mount); the PAYLOAD was wrong.
- Working example (2K25): moddedbake.cak (our v9.3 packer output) → ACCEPTED → texture override visible. Full chain: version-correct packer + explicit-mount loader + native game parse.
- 2K20 needs the same trio: converted files (HAVE) + v6.8 packer (MISSING — the actual gap) + loader port with 2K20 profile (queued mechanical work). The loader concept is proven; only version-specific pieces are missing per game.
## 2026-09-17 - 2K20 loader profile mapped (2K22 method ported, autonomous)

### Method (same as 2K22, `_work\scan-2k20-profile.js` kept)
- PE: 8 sections, .text VA 0x1000, .rdata VA 0x22a4000. (First attempt failed: NumberOfSections read at wrong COFF offset; fixed to e_lfanew+6. Loose ±128 xref tolerance replaced with exact-match.)
- CAK strings: "bakedfile" @0x24c7588, "%s%02d.cak" @0x24c75c0 (56B apart, same adjacency signature as 2K22).
- Exact LEA pair: .text+0x1cf485 → bakedfile, +0x1cf48c → %s%02d.cak (7B apart — mirrors 2K22's mount-area signature).

### 2K20 profile (for profiles.cpp)
- exe: WWE2K20_x64.exe | sha256 21e3b0fdce01be21ca107d349a591a5d80c8d56ed08f0ce355c416ec5013e208
- mount_rva 0x1d0420 (fn 0x1d0420–0x1d05ff, big-frame open; starts with index bound-check `cmp edx,100`)
- signature_rva 0x1d0485, mount_signature (12B): 48 8d 05 fc 70 2f 02 48 8d 15 2d 71
- phase_rva 0x1d0600 (adjacent fn, classic prologue), phase_signature (16B): 48 8b c4 57 41 56 41 57 48 83 ec 70 48 c7 40 b8 (DIFFERS from 2K25/2K22's shared prologue — older codegen, expected)
- profiles.hpp already carries mount_signature (12B) from 2K22 work — no struct change needed.

### Caveat (honest, blocks nothing yet)
- 2K20 mount function opens with an index bound-check; MountCakFn ABI may differ from the 2K25/2K22 path-based typedef in mod_loader.cpp. RVAs necessary but possibly insufficient — verify/adapt at hook time. Next: profiles.cpp entry + rebuild + install + manifest, then observe.

## 2026-09-17 - 2K20 loader built+installed (user-directed GO)

- Added 2K20 profile (mount 0x1d0420, sig 0x1d0485, phase 0x1d0600 + 12/16B sigs, sha 21e3b0fd…) to BOTH profile copies: Secure-DataCtrlLink-WWE2K25 and Aurora-Forge-CAK-Mod-Loader-WWE2K25 (no struct change needed).
- Built: dinput8.dll (1,600,000B) + AuroraForge.CAKModLoader.ftrib (1,621,504B), both fresh. Installed to WWE2K20 root + plugins\. No mods/ yet (identify-only first launch, 2K22 procedure).
- UNCOMMITTED: SDCL repo has no .git (edits live on disk only — fragility noted before); loader-repo edit dirty, awaiting push order. ABI caveat stands (index-flavored mount may need hook adaptation — first launch log decides).
- Expected first launch: log line Identified game version: WWE 2K20, SHA verify pass, no crash. Then: mods prep + bakedfile06 mount test.

## 2026-09-17 - 2K20 FIRST LAUNCH: identified, plugin hash-rejected, fixed, full backup (user-directed GO)

### First-launch evidence (game left running per user)
- 02:11:10 orchestrator started → 02:11:12 Identified game version: WWE 2K20. 2K20 profile (mount 0x1d0420, sigs, sha 21e3b0fd…) WORKS on first try.
- REJECTED addon ftrib: SHA-256 mismatch vs approved 2K22/2K25 build hash. EXPECTED mechanics (fresh build ≠ allowlisted hash), not a defect. Fix: registered fresh hash c097a869… in addon_registry.hpp (array 1→2), rebuilt dinput8 (1,600,512B).

### Full backup sweep (user: everything to github, new private repos for homeless code)
- SDCL had NO .git (yet 9/15 log shows pushes from it). Resolved: cloned origin (HEAD d68440c intact), copied in 2 known edits, status proved exactly 2 files differ, committed 425ebc9 (also preserving uncommitted 2K22-era work: profiles.hpp/proxy/cak_validator — verified against log history), pushed. Moved .git into real dir (now a proper repo). Pre-existing D-workflow deletion + line-ending phantoms left untouched, flagged.
- Commits+pushes: foundry d40baa3 (v6.8 C# work), loader 8ae5451 (2K20 profile), prototype 7300308 (logs), SDCL 425ebc9. New PRIVATE repo Aurora-Forge-Animation-Probes (2e9a7cf, 16 files: 13 probes + README + 2 JSON tables + manifest; NO game bytes, absolute-path caveat in README). All 5 verified ahead=0.
- Skips upheld: game-derived bytes never pushed (converted .acts, hkt/mprms copies, catalog JSON, BakeMe stagings stay local-only).
## 2026-09-17 - REBOOT CHECKPOINT (user rebooting, stuck process)

### Exact state at freeze
- Game (WWE2K20) was RUNNING with OLD dinput8 (pre-allowlist). First-launch evidence captured: identified 2K20 ✓, ftrib hash-rejected (expected), rebuilt dinput8 (1,600,512B, allowlist fix compiled in) sitting UNINSTALLED at `D:\AuroraForge-Aug26\Secure-DataCtrlLink-WWE2K25\build\dinput8.dll`.
- `bakedfile06.cak` (439.59 KiB, v6.8 mod CAK, OUR converted 6100.acts+.evd, roundtrip byte-exact) at `D:\AuroraForge-Aug26\_work\bakedfile06.cak`. NOT yet in game dir (kept out deliberately until loader accepts plugin).
- Loose test files still staged: `...\WWE2K20\Animation\Victory\6100.acts/.evd` (untouched, hashes verified CB170D4A…).
- Git: SDCL 425ebc9, foundry d40baa3, loader 8ae5451, prototype 7300308 pushed; probes repo 2e9a7cf pushed — all ahead=0 EXCEPT this checkpoint entry (commit+push below).

### After reboot, in order (no re-research needed)
1. Install rebuilt dinput8: copy `Secure-DataCtrlLink-WWE2K25\build\dinput8.dll` → `...\WWE2K20\dinput8.dll` (overwrite).
2. Launch 2K20 → expect log: identified 2K20 + plugin ACCEPTED (no REJECTED line). If REJECTED persists, hash in log tells what to register.
3. Stage mod: copy `_work\bakedfile06.cak` → game dir (exact name; key derives from filename) + prepare mods entry per loader flow.
4. Relaunch → mount verdict → Rock victory check (changed = historic first; stock = diagnose; crash = note where).
5. Do NOT rebuild anything (binaries current), do NOT re-run scans, do NOT re-verify hashes (all recorded above).

## 2026-09-17 - Post-reboot DLL install (checkpoint step 1)

- Installed rebuilt dinput8.dll (1,600,512B, SHA-256 A42E3CF4…) to WWE2K20 root (hash-verified identical post-copy). Old pre-allowlist DLL replaced.
- Next: launch 2K20, expect orchestrator identifies 2K20 + ftrib ACCEPTED (no REJECTED line). Then stage bakedfile06.cak.

## 2026-09-17 - Plugin ACCEPTED; mod staged, relaunch pending (user-directed)

- Relaunch log 02:37:01: identified 2K20 + Loaded approved addon (new 2K20/2K22/2K25 product string). Stray REJECTED lines precede (noisy per-entry check); final state = ACCEPTED. (Earlier 02:33 run also rejected-only; superseded.)
- Staged 2K25-style: WWE2K20\mods\bakedfile06.cak (450,136B, SHA 0F199742… matches build) + manifest.json cakOrder [bakedfile06.cak].
- Next: relaunch → expect ACCEPTED CAK bakedfile06.cak mount → Rock victory check (changed = historic first; stock = diagnose; crash = note where).

## 2026-09-17 - Mojibake cleanup: em-dash to hyphen across log-facing strings (user-directed)

- The �? in logs/shell output = U+2014 em-dash in addon product/registry strings, misdecoded between game log bytes and PowerShell display. Cosmetic only; removed at source so all future logs read clean.
- Replaced in: addon_registry.hpp product strings x3, mod_loader.cpp MessageBox title x1 (GUI-only, changed for uniformity). Verified zero em-dashes remain in both files.
- Rebuild cascade (string change = new binaries = new hashes): ftrib 7F3624D3 (v6.8 passthrough build) -> registered in allowlist (replacing EAAD869A) -> dinput8 rebuilt 152649EC. Install both after game close, then relaunch expects ACCEPTED plugin + ACCEPTED bakedfile06 mount.

## 2026-09-17 - Fresh pair installed (user-directed next step)

- Installed dinput8 152649EC + ftrib 7F3624D3 to WWE2K20 (hash-verified, no file locks = game was closed). mods/bakedfile06.cak + manifest already staged.
- Next: relaunch → expect ACCEPTED plugin (hyphen strings, no mojibake) + ACCEPTED bakedfile06 mount → Rock victory check.

## 2026-09-17 - Root cause: hardcoded phase signature blocked ALL 2K20 mounts (user-directed)

- exact_runtime_signatures_ready() compared phase bytes against HARDCODED 2K25/2K22 prologue (kPhaseSignature), ignoring profile->phase_signature. 2K20 bytes differ → ready never set → worker waited forever → zero mounts in every session. Explains empty tail after plugin load in all runs.
- Fix: both memcmp sites now use profile phase_signature; kPhaseSignature deleted. Rebuilt ftrib AA2637FE, re-registered, rebuilt dinput8, installed both clean (game closed). mods/bakedfile06 + manifest already staged.
- Next: relaunch → expect Armed dispatch + Beginning mounts + ACCEPTED bakedfile06 → Rock victory check (first TRUE motion verdict).

## 2026-09-17 - Timeout proof: signatures never verify; mismatch probe built (user-directed)

- 03:01 run: plugin accepted, CAKs prepared, then 120s silence → ERROR transition not observed. Worker + deadline proven working; the signature check itself fails every VirtualProtect call for 2 minutes. Mount-half vs phase-half unknown → added one-shot probe logging (mount_half/phase_half match/MISMATCH) into exact_runtime_signatures_ready.
- Rebuilt ftrib B6A2F7C5, re-registered (replacing AA2637FE), rebuilt dinput8. Install both after close; next launch names the bad half directly.
- Slot rule still untested (no mount has ever occurred on 2K20).

## 2026-09-17 - Probe pair installed (user-directed)

- Installed dinput8 (registry incl. B6A2F7C5) + ftrib B6A2F7C5 (hash-verified match) to WWE2K20. Relaunch → expect probe line naming mount_half/phase_half, then (if match) Armed dispatch + ACCEPTED bakedfile06.

## 2026-09-17 - Probe narrows it: mount_half MISMATCH, phase_half match (user-directed)

- 03:06 run: mount_half=MISMATCH + phase_half=match. Phase RVA/bytes (0x1d0600 prologue) VERIFIED good at runtime. Fault isolated to the mount half: 12B at base+0x1d0485 differ from recorded 4c8d05fc702f02488d152d71 (runtime-modified code? wrong RVA? self-modifying page?).
- C70B hex-dump build + registry + dinput8 built and installed clean (game was closed). NOT YET RUN — next launch prints mount_actual bytes; correction follows from evidence, no more guessing.
- Slot rule still untested (no mount has ever dispatched on 2K20).

## 2026-09-17 - One-byte transcription error found by probe, fixed (user-directed)

- mount_actual first 11 bytes IDENTICAL to recorded signature; byte 0 differs: runtime 0x4C (LEA R8) vs recorded 0x48 (LEA RAX). Eyeball slip during static transcription (neighbor instruction starts 0x48). Probe design vindicated.
- Fixed mount_signature[0] in BOTH profiles.cpp copies. Rebuilt ftrib 87C90611, re-registered (replacing C70B), rebuilt dinput8. Install both after close; expect match+dispatch+ACCEPTED bakedfile06 on next launch.

## 2026-09-17 - One-byte-fix pair installed (user-directed)

- Installed fresh dinput8 + ftrib 87C90611 (hash-verified) to WWE2K20, game closed, no locks. mods/bakedfile06.cak + manifest staged and untouched.
- Next: relaunch → expect Armed dispatch + Beginning mounts + ACCEPTED bakedfile06 → Rock victory check (first TRUE motion verdict).

## 2026-09-17 - MOUNT ACCEPTED on 2K20; 2K25 strings cosmetic; no-change reframed (user-directed)

### Why it says 2K25 (user question)
- Hardcoded log labels in mod_loader.cpp (~10 strings: observer/dispatch/mount/collision messages). Known since 9/16 version-lock audit (TODO #6, cosmetic). Behavior is 100% profile-driven: game identified as 2K20, 2K20 RVAs/signatures used, 2K20 manifest scanned. Will parameterize with profile name in a bundled future edit, not a solo cycle.

### Mount verdict: ACCEPTED bakedfile06.cak, accepted=1 rejected=0 failed=0
- Full chain green on 2K20: identify -> validate (v6.8 passthrough) -> dispatch -> game MountCakFn returned true. Our v6.8 packer output is game-mountable. Loader work for 2K20 COMPLETE.

### No-change verdict reinterpreted
- Mount works, so stock motion does NOT falsify loading. v1 moved header/rest floats only (15 pairs on the override, streams untouched template) — stock-looking output is CONSISTENT with correct loading + header-level transfer. True motion verdict requires keyframe-stream transfer (open research) or a vandalism control (zero entry-0 data -> broken motion proves override path, stock play impugns it).

## 2026-09-17 - Vandalism control staged to split H1/H2 (user-directed)

- Built vandal 6100.acts: stock NEW-root RAW AMYM (743,484B — variant discovery: new root holds RAW .acts, old root held 429,196B compressed form; same game, two on-disk forms) with entry-0 keyframe streams zeroed, headers/container intact (size preserved exactly). _work\vandalize.js kept.
- Packed v6.8 -> vandal-staging\bakedfile06.cak (746.45 KiB, catalog-validated 2 files) -> staged over mods\bakedfile06.cak (v2 build preserved at _work\bakedfile06.cak). Manifest unchanged.
- Test: relaunch -> Rock victory. Frozen/garbage/crash = OVERRIDE PROVEN (game reads our file; back to slot research with confidence). Stock play = OVERRIDE BROKEN (resolution-order investigation). Crash is benign (restart); warn user.
## 2026-09-17 - Paths EXONERATED (stock-identical hash); override failure is timing-or-semantics (user-directed)

### Proof (no game needed)
- Stock 2K20 bakedfile00.cak catalog (33,643 files): `Animation/Victory/6100.acts` hash = `ba178c342231f94f` — IDENTICAL to our mod file's hash. Our pack's naming (full virtual path) + hashing (lowercase FNV64) matches stock convention exactly. Lookup-by-path/hash CANNOT miss on our bytes.
- evd header carries motionId + internal name only, no acts-path refs — evd is not the decider either.

### User theory verdict (asked twice, answered finally)
- Byte level (WRONG, with numbers): 75% stream bytes, 351KB vs ~1KB a playlist would need, zero external refs, verified rest-pose values, named bones. These files ARE motion, not playlists.
- System level (RIGHT, credited): something else DOES decide — mounted mod + stock play with correct paths leaves only (a) boot-preload beats menu-mount [LEAD], or (b) mod slot can't shadow stock paths. Their instinct fired at the correct layer with the wrong mechanism.

### Next (needs one user fact)
- Does WWE 2K20 have an on-demand victory preview picker like 2K22's MOTION screen? YES → preview loads lazily → timing theory weakens → slot-semantics leads. NO/UNKNOWN → timing leads; consider earlier-mount experiment (hook post-stock-mount instead of window thread) or stock-preload eviction probe.

## 2026-09-17 - Test-to-game map (user-directed clarification)

- 19→20 loose test (staged 6100.acts/.evd) runs in WWE 2K20. 2K20 launches were CORRECT for it.
- 20→22 Rock-override preview (Custom Victory MOTION picker) runs in WWE 2K22 ONLY. Its content bake never succeeded (empty 171KB bakes), so no 2K22 launch could have shown anything yet — nothing was missed, nothing to re-test there until a content bake lands.
- 2K20 loader/mount/DataCtrlLink work runs in WWE 2K20 (correct game throughout).
- Rule going forward: every test instruction names its game explicitly.

## 2026-09-17 - Preview verdict scoped to 2K22 (user-directed)

- Screenshot MOTION picker shows RICK BOOGS (post-2K20 debut) → this is WWE 2K22, not 2K20. THE ROCK previewed stock.
- Verdict weight: ZERO for all hypotheses. 2K22 has no mod content behind it (four empty bakes, nothing staged since _mods holds only the 2 files never successfully baked). Stock was the only possible outcome; the 2K22 override test was never live.
- Unaffected: 2K20 loose-file test (staged, intact) still awaits its verdict. The two tests were conflated; test-to-game map re-confirmed.

## 2026-09-17 - Loose-file verdict: STOCK (user-directed, game closed)

- 2K20 relaunch with staged loose Animation\Victory\6100 files: victory plays STOCK. Loose files IGNORED by 2K20 — disk-first loading does not exist here. Long-shot closed out as predicted fallback.
- Consequence: the ONLY remaining 19→20 route is loader + v6.8 mod CAK (both now exist: bakedfile06.cak packed+verified, loader installed, plugin accepted, mount proven on stock path). Next: mount bakedfile06 with converted content and re-test (true motion verdict).

## 2026-09-17 - Texture-vandal staged: shadow-path split test (additive course-correction, user-directed)

### Why a texture, why vandalized (design)
- Double-stock verdicts (v2 14:37 + vandal 15:21+, both user-confirmed STOCK) prove mount ACCEPTED is not enough: either boot-preload beats menu-mount (a) or mod slot can't shadow stock paths (b). A magenta-face test would conflate content-encoding risk with path risk, so it was shelved.
- Vandal logic ported to texture: stock `head_color.tex` bytes (extracted from bakedfile00 via unpack-file, 206,484B) with payload zeroed past offset 256, TEX! header intact. ANY non-stock face (black/broken/glitch) = OUR BYTES REACH THE GAME (shadowing works, debug content next). Stock face = SHADOW PATH BROKEN (debug timing/slots, no content work matters).
- Catalog hash of mod entry = `687e20fd45549500` = stock hash EXACT (FNV-1a64 over lowercased full virtual path, verified by recomputation). Roundtrip unpack SHA-256 identical (`1CB7A4FF…`). Staged as NEW slot `mods/bakedfile07.cak` (FF8A0D23…, hash-verified post-copy); 06 vandal left staged; manifest cakOrder [06, 07]. Game was closed, no locks.

### Launch instruction (2K20, one run gives both verdicts)
- Launch 2K20 → expect ACCEPTED 06 + ACCEPTED 07 (accepted=2). Then: (1) look at The Rock's FACE anywhere (menu render counts) — stock vs broken; (2) Rock victory — stock vs broken (06 retest).
- Predicted read-out: broken face + stock victory = texture shadows but anim preload wins (timing theory for anims only). Stock face + stock victory = no shadowing at all (slot/timing systemic). Broken + broken = full override proven, content work unblocked.

## 2026-09-17 - CRASH on load with 06+07 staged; 07 never reaches verdict (user-reported, log-confirmed)

### Log facts (DataCtrlLink.log, three runs 17:17 / 17:23 / 17:26-17:27)
- Every run: `ACCEPTED CAK bakedfile06.cak`, then NOTHING for 07 — no ACCEPTED/REJECTED/failed line, no `Completed ordered mounts` summary. 17:17 run adds `window-thread diagnostic dispatch timed out` 40s later. Crash run's log ends 8s after 06-ACCEPTED.
- 07 passed prepare-time validation (no `REJECTED CAK bakedfile07` line) and mods/07 verified intact on disk (206,936B, correct build — not the 392B empty bake).
- 06-alone history (15:21–15:48) booted fine repeatedly. Delta = 07's presence.

### Interpretation (single unknown, still clean)
- Crash window = between 06-ACCEPTED and 07-verdict: 07's game-side MountCakFn call or its immediate aftermath. If the game dies ingesting our zeroed CRN payload, that PROVES mod bytes reach game code (shadow path alive at mount level) — the opposite of a silent ignore.
- Consequence for (a)/(b): ingestion-alive + anim-stock-verdicts now favors (a) boot-preload timing for animations specifically (victory 6100 preloaded before menu-time mount), NOT systemic slot failure. Texture ingestion appears eager (menu/boot), animation lazy-or-preloaded — per-asset-type timing, not one rule.

### Isolation plan (2 user launches, 06 untouched on disk)
1. Manifest [07] ONLY (temporarily move 06 out of mods/, keep file safe): crash repeats = 07 content kills at mount (ingestion proven, pivot to valid-CRN authoring or timing shift). Boots + broken face = FULL shadow proof, playable.
2. Restore manifest [06, 07] or [06] per result. Recovery is trivial (remove 07 from cakOrder) — 06-only boots proven.

### Staging 07-solo isolation (assistant-staged, user-authorized 2026-09-17)
- `mods/bakedfile06.cak` moved to `_work\mod-hold\bakedfile06.cak` (SHA 5DE1828C… = vandal build, intact). mods/ now = bakedfile07.cak (206,936B) + manifest cakOrder [07]. Game was closed.
- Awaiting user launch verdict: crash-repeat vs boot+face.

## 2026-09-17 - CLI texture path BUILT: magenta-face 09 staged solo (user: "make a cli version")

### Chain (all our tools + 2 pinned third-party exes, no GUI)
1. texconv May2026 (SHA-verified): stock `head_color.dds` (1024² DXT1 11-mip) → PNG → solid-magenta fill → BC1 11-mip DDS, byte-identical size 699,192B.
2. Unity-fork `crunch_x64.exe` (from Unity-Technologies/crunch `unity` branch bin/, NOT the stock BinomialLLC build in thirdparty/ — code comments warn stock garbles in-game): magenta DDS → 13,840B DXT1 CRN.
3. TEX! v9 container hand-assembled per `TextureMeta.Read` mapping: stock header (fmt 7fd9cd97, sRGB=1, 11 mips, dim=2) + size@36 updated + CRN payload + `BC1:UNORM` 9B footer (footer tag discovered in stock tail).
4. Our v6.8 backend packed `_work\texture-test-rock\bakedfile09.cak` (14.01 KiB): catalog hash = stock `687e20fd45549500` EXACT, unpack roundtrip SHA identical (`17DB1065…`).

### Staging (07-solo verdict never arrived; user pivoted to own bake — 09 supersedes, single variable)
- `mods/07` → `_work\mod-hold\` (with 06). `mods/` = bakedfile09.cak (14,348B, SHA D64D07BC… verified post-copy) + manifest [09]. Game closed.
- Awaiting user launch: ACCEPTED 09? boot vs crash? Rock face = stock / magenta / broken?

## 2026-09-17 - User GUI bake v8.2 (WRONG version for 2K20); re-containerized to v6.8 as 08 (assistant-built)
- User's `20 bake folder\bakedfile08.cak` (19.5MB, 39 files): bake CORRECT (DDS→TEX converted, head_color hash = stock exact) but container FDIR **v8.2** — 2K20 cannot mount it. NOT staged as-is. (v098a bakes v8.2; San847 samples are v6.8 C0-flavor — tool family spans versions.)
- Re-container: catalog-read v8.2 fine; single-variable rule → took ONLY user's painted `head_color.dds` (only DIFF vs stock) through our CLI chain (Unity crunch → TEX! v9 + BC1:UNORM footer) → packed v6.8 `bakedfile08.cak` (154.83 KiB): catalog hash stock-exact, roundtrip SHA `8B0BDEE4…` identical.
- Staging: 09 → hold (with 06/07). mods/ = bakedfile08.cak (158,548B, SHA 78ED4480… verified) + manifest [08]. Game closed.
- Awaiting user launch: ACCEPTED 08? boot vs crash? Rock face = stock / user-paint / broken?
- Gorilla mod manager: repo 404s (deleted/renamed/private, `git ls-remote` fatal). NOTHING TO STORE. Need correct URL or local copy from user.

## 2026-09-17 - 07-solo verdict: STOCK (user-run, game closed after)
- Zeroed-texture 07 mounted solo: boots clean, Rock face STOCK. Combined with 08-valid-demon → stock: our bytes mount but never serve, at 06/07 slots.
- Crash reinterpretation: BOTH crashed runs staged TWO CAKs (06+07). 07-solo boots fine → zeroed payload does NOT crash at ingest. The crash factor is the two-mount sequence (or 06+07 interaction), NOT 07's content. Ingestion-proof via crash: WITHDRAWN.
- Slot-range hypothesis (user intel: no tool bakes 06, community = 08-12): all our tests ran at 06/07 — possibly outside the game's resolution set. 09 (slot 09, valid magenta, our container) never launched: THE test.
- Cleanup (user-ordered): mods/ emptied (07→hold), manifest removed, loose Animation/ tree removed (6100 pair backed to hold), game folder stock except loader (dinput8+plugins stay). Then staged 09-solo: mods/bakedfile09.cak (14,348B, SHA D64D07BC… verified) + manifest [09].
- Awaiting user launch: ACCEPTED 09? boot/crash? face = stock / magenta / broken? Magenta = slot range was the entire blocker.

## 2026-09-17 - 09 verdict: STOCK at slot 09 (user-run). Slot range ELIMINATED. Stock prefix exposes flavor gap.
- 09 (slot 09, valid magenta, our container): ACCEPTED 18:49, completed 1/0/0, boots, Rock face STOCK.
- Stock `bakedfile00.cak` prefix: `46 44 49 52 06 08 01 C0` — flags **01 C0** (payload-protect bit SET). Our packs emit `01 40` (bit15 clear). San847 community bakes: `01 C0`. OUR container is the odd one out vs stock AND community.
- New lead hypothesis: game boot-mounts root bakedfile08-12 NATIVELY (community has no loader; Spider-Man mod ships as bakedfile06). Our menu-time loader mount may be redundant AND late.
- Native-slot test staged: OUR magenta bytes re-packed as `bakedfile08.cak` name (key derives from filename; catalog hash stock-exact) → game ROOT (hash 251C58FB… verified). mods/ emptied (09→hold), manifest [] (loader mounts nothing). No loader involvement.
- Awaiting user launch: boot? magenta face? Magenta = timing was everything (keep native-slot flow). Stock = our 01-40 flavor unreadable game-side → close C0 gap next.

## 2026-09-17 - Native-slot verdict: STOCK (user-run). Flavor gap now leads; extraction first (user-ordered)
- Game-root bakedfile08.cak (our magenta, native boot mount, no loader): boots, Rock face STOCK.
- Scoreboard: loader-mount ours → stock; native-mount ours → stock; community C0 bakes → work in-game (Spider-Man proof). Only remaining systematic difference = container flavor (01 40 vs stock/community 01 C0).
- 05 extraction: first pass 24,889/30,818 .tex fails (`Libraries/crn2` native DLL missing from app runtime — publish tree HAS it). Fix mirrors oodle convention: copied `build\cak-v93-publish\Libraries\crn2.dll` → `app\tools\cak-v93\Libraries\` (SHA-verified). Single-file proof (BC3 particle Smoke→DDS clean), full 05 re-run: 0 fails.
- Per user: finish FULL stock extraction (00-04 next) before further game tests. C0 write-side attack queues behind complete reference tree.

## 2026-09-17 - ADDITIVE test built+staged: new victory ID 9790 (zero more overwrites)
- 9790 free (no acts/evd/timeline anywhere). Set: 9790.acts (stock 6100 clone, entry-0 streams zeroed via vandalize.js, 743484B preserved) + 9790.evd (clone, u16@0 6100->9790 + ASCII prefix patched, 20546B) + CharProfilePro.jsfb (Rock 3 rows: 6x u32 6100->9790, owner-guarded id=100 + B-pair 8701/8703; second 6100-group (9100-pair, other owner) untouched).
- 6100.acts carries ZERO internal id refs (filename is the id). evd id lives at u16@0 only.
- Packed C0 slot bakedfile10.cak (861.77 KiB, 3 files encrypted, catalog+roundtrip verified). Staged game-root (prefix C0 + SHA E30E6682 verified post-copy); old root-08 to hold. mods/ empty.
- Read-out pre-registered: Rock victory BROKEN = additive path serves (files + index patch apply). STOCK 6100 motion = new-path/index ignored.

## 2026-09-17 - LOADER NO-OP FOUND + FIXED (disassembly-proven, native-mount build)
- ROOT CAUSE of every stock verdict: MountCakFn builds "bakedfile%02d" from (prefix,index) itself (WWE2K20 0x1d0420: cmpl idx<100, snprintf, worker call). Our path arg was SCRATCH. All ACCEPTEDs re-mounted stock bakedfile00. Native boot loop mounts idx 0..99 ascending (loop at 0x1d05c8 proven).
- FIX (SDCL working): native-convention calls (scratch + "%s%02d.cak" + "bakedfile" + NN), mods staged to game root first (game resolves relative to root), bakedfileNN names enforced (reject <6, >99, non-conforming), profile-driven signatures (mount check was hardcoded 2K25 - also fixed), per-mount ACCEPTED/FAILED + summary logs with profile name.
- Also: new ftrib hash registered (native-mount build), dinput8 rebuilt, both installed. Stage: root stock-only, mods/08 magenta C0 + manifest. Discriminating launch pends: magenta = last-wins + loader works; stock = first-wins or parse gap.

## 2026-09-18 - Launch VOID: validator rejected v6.8, nothing mounted (log-proven)
- New native-mount ftrib LOADED fine, then "REJECTED CAK bakedfile08.cak: unsupported FDIR version: 6.8" (our validator only knew 9.3+/8.3) -> "No mod CAKs prepared" -> early return, zero mounts. Game ran stock + native 00-05 only. Prior verdicts stand; this run tested nothing.
- Fix: v6.8 trust-passthrough in cak_validator (same policy as v8.3; game verifies at mount). Rebuilt ftrib (5A84CC41), re-registered, rebuilt dinput8, reinstalled. mods/08 staged, manifest set. A REAL mount should occur next launch (staging + ACCEPTED lines expected).

## 2026-09-18 - Stale-object strike 3: dinput8 without new hash (log-proven) + install-verify gap
- 00:31 run rejected even the new ftrib hash: installed dinput8 predated the registry edit (build.ps1 has no clean step; stale .o reused). Previous game-vs-build hash comparison DIVERGED silently (DC2A vs 2952BD) and I failed to act on it.
- Fix: wiped build/*.o, clean rebuild (5A84 present, 1E30 absent IN BINARY), reinstalled, verified BY CONTENT (not hash) in both copies. Rule: content-verify installs; never trust hash-equality across reproducible builds; clean before release builds.
- mods/08 + manifest staged and waiting. Next launch is the first REAL native-convention mount attempt.

## 2026-09-18 - Stale-binary ghost + self-fingerprint fix (void runs keep coming)
- 00:38 run rejected even the just-registered hash while on-disk bytes verified correct: the RUNNING binary was stale (game had it locked/loaded before install, or equivalent). Hash-equality across reproducible builds proved nothing; content checks passed while behavior lagged.
- Fix: orchestrator now logs "Loader self SHA-256=<own dinput8 hash>" at every startup. Next run is cryptographically identified: if the self-hash is not 9D22CB8A..., the verdict is void before reading further. Rebuilt clean, installed byte-identical (game==build verified in-process).

## 2026-09-18 - KNOWLEDGE DUMP (user-ordered) + open paradox status
### Proven by disassembly (WWE2K20_x64.exe)
- MountCakFn (0x1d0420) builds "bakedfile%02d" from (prefix,index) itself; caller path arg is scratch. ALL pre-fix loader ACCEPTEDs were stock re-mounts (no-op mounts). Fixed to native convention + root staging + slot-name enforcement + profile signatures + per-mount logs (SDCL working 10c123b/3615c24/e9cfb72).
- Native boot loop mounts idx 0..99 ascending (incl edi / cmpl 0x64 / jl @0x1d0470). Root mod slots are THE channel; mods/ subdir means nothing to the game.
### Proven by experiment + logs
- v6.8 validator gap (own tool rejected own packs) -> passthrough added. Stale-object builds bit 3x (dotnet publish w/o clean; SDCL .o reuse; hash-equality lies on reproducible builds) -> clean-build + content-verify rules.
- Tribute VictoryListData recipe: 657 vs 661 rows (added 14000-14003 full rows, removed 7, rehashed strings, motions untouched). Reader oodle-fallback fix verified byte-identical.
- Registry: CharProfilePro victory pairs located (Rock [6100,6100]+[8701,8703] @id100). No Vict table / .adefs in 2K20. Full 284260-file audit + 12892-.jsfb census complete.
- C0 write path: flags 01 C0 match stock, roundtrips byte-exact. San847 C0 flavor still undecodable (section cipher unknown; TOC parses, section data resists keys�ciphers tried).
### OPEN PARADOX (00:43 run)
- New loader (self-hash 9ABD) saw ftrib 5A84 and rejected it against a registry PROVEN to contain 5A84 (bytes verified in running file). File stable across reads (no ghost writer; CakeView red herring retracted - case-confusion on hashes, equality holds).
- Next: saw-hash logging is live; following run shows the actual seen hash. If match-then-reject repeats, instrument the compare path itself.
### Repo state
- 23/23 private, 23/23 carry working (pushed). Active work on working only. Sanitized 14-file release pipeline built, publish pending user call (1.0.0a vs 1.0.0b).

## 2026-09-18 - Trigger replaced: phase-hook (never proven to fire) -> window-gated worker
- Silence after every load proved nothing downstream of PluginInit ever ran: no hook-fire, no worker, no timeout line. The phase address executes nowhere observable in a menu session (sole-xref caller analysis inconclusive; Wwise-virtual suspected).
- New trigger: worker polls for a large visible game window (<=180s) + 20s settle, then mounts. Calling MountCakFn from a worker thread is proven safe by dozens of prior in-game calls, zero crashes. MinHook path removed; signature gates kept. Build E88F, registered, installed byte-identical. Staging unchanged (mods/08).

## 2026-09-18 - Validator gap closed in BOTH copies + offline proof (no launch asked)
- The v6.8 passthrough went only into dinput8s copy of cak_validator; the ftrib carries its own copy and still rejected everything pre-thread (silence explained, finally). Rebuilt ftrib 92B3 with the fix.
- PROVEN OFFLINE (no game needed): current validator source ACCEPTS mods/bakedfile08.cak; offline approval harness ACCEPTS 92B3 against the fixed registry. Installed byte-identical, 92B3 present in game dll.
- Staged and proven to the game boundary. No launch requested. Awaiting user direction.

## 2026-09-18 - Full-set final attempt staged (user terms: visible change or handoff)
- mods/bakedfile08.cak = users COMPLETE 39-file Rock set (30 CRN TEX + 9 raw), v6.8 C0, catalog-verified (head_color path-hash exact), roundtrip byte-exact. Root stock-only. Manifest [08]. Fixed window-gated loader installed.
- If stock: slots cannot shadow, period. Next = stock-replacement method or stop 2K20 work. No more mount experiments.

## 2026-09-18 - BINDING SLOT RULE (user-ordered, twice): 00-07 are untouchable
- NEVER modify/replace/rebuild/redirect bakedfile00-07 (disk or stream). Stock game files are read-only reference via extracts; all mod work in bakedfile08-12 ONLY, sourced from mods/ ONLY.
- merge00 rebuild killed mid-run + cleaned. Root 08 (native-test leftover) moved to hold. Root now stock 00-05 only; mods/08 (full set) + manifest stand.
- Open serving work continues ONLY through 08-12 semantics: San847 section-cipher match + registration appenders + mount timing.

## 2026-09-19 - EARLY-MOUNT loader (fixes registry override timing) + clean install
- Game folder cleaned: old dinput8 (92C26247), ftrib (B8C8A7A9), mods/aurora-testv102e.cak
  and manifest moved to D:\AuroraForge-Aug26\_work\game-cleanup-20260919 (nothing deleted).
- Addon source (Aurora-Forge-CAK-Mod-Loader-WWE2K25\src\plugins\mod_loader\mod_loader.cpp):
  new early_mount_worker mounts all prepared CAKs immediately after the runtime
  transition (backoff 100ms..8s, stops on full accept), before the game window and
  before the frontend reads its tables; window-thread dispatch kept as fallback and
  now skips when the early mount already landed. Rationale: mount order is
  stock-first/mods-last so the last-mounted archive overrides; UI/registry tables
  are read BEFORE the old window+20s dispatch, which is why registry edits never
  showed while clips (on-demand reads) did.
- ftrib rebuilt clean -> SHA256 D788C2ABDE7426C8FD2018B227ABF9D886A1087D7B6F9A09B20AE002A865DF28.
- SDCL registry (addon_registry.hpp) now 6 approved hashes (new early-mount first,
  collision-guard kept, previous dev builds kept); addon_registry_tests pin updated;
  clean rebuild -> dinput8.dll AD5B656C0CB321E2B3275B3CCADD6342FED3D672B127B58D6850C6E986AB1B70.
  Tests: addon registry PASS, manifest PASS, addon selection PASS.
- Installed content-verified (build hash == game hash for both files).
- mods/ left EMPTY awaiting the next mod (user CakeView bake or re-staged test CAK).
- Next: stage a CAK, launch, read log for "EARLY ACCEPTED CAK" then check the
  victory customizer for the renamed entry.

## 2026-09-19 - Loader crash fix: mount after the game opens its own archives
- Session 02:36 (ftrib FDDE8A81 + dinput8 9F52A61E): game CRASHED before first screen.
  Log ends after addon load with no mount-attempt lines => died INSIDE the first
  native mount call at ~2s (too early). User confirmed the same CakeView CAK loads
  fine under CakeHook, so the crash was our loader, not the mod file.
- Fix (addon repo): CreateFileW detour detects the first `bakedfile*.cak` open
  (the game has begun mounting its own archives = proven-ready point). Early worker
  then waits 2s and mounts on a 1s cadence until the window dispatch takes over.
  Signature gate stays advisory-only. REJECTED-spam from multi-entry registry is
  cosmetic and still present.
- New pair installed content-verified:
  ftrib  7428DEDC9C6281D8334EF566B0DBDA7BE5F68EC7D28B87E3CB39CA7155C17529
  dinput8 B11C9A4C6FACC920CC36BBE78EBE5AA43B50AB8F286FF2DCD996D13702A1BE58
  (registry first-entry + test pin updated; addon registry/selection tests pass)
- Next: relaunch with mods/tribute-bake-test-sept19.cak; log should show
  "Game began opening its archives" then PRE-WINDOW ACCEPTED CAK lines.

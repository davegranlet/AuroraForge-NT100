# HANDOFF 2026-09-18 — 2K20 mod slots mount but never serve (stock-first resolver)

## Verdict (log-proven 02:29:00 run)
- Loader (F6C4) + plugin (92B3) approved, window-gated worker, staged
  `mods/bakedfile08.cak` (user's COMPLETE 39-file Rock set, v6.8 C0) to game
  root, `ACCEPTED CAK bakedfile08.cak (index 8)`, `accepted=1 rejected=0
  failed=0`, native calling convention. Rock's face: STOCK.
- Conclusion: on WWE 2K20, mod-slot archives mount but never shadow stock
  bytes. Same-path overrides cannot work via slots 06-99. Every override
  verdict in history (anims, textures, evd, profile) is consistent with this
  single rule. No further mount experiments recommended.

## What was proven (evidence, not claims)
1. MountCakFn (2K20 RVA 0x1d0420) builds `bakedfile%02d` from (prefix,index);
   caller path arg is scratch. All pre-fix ACCEPTEDs were stock re-mounts.
2. Native boot loop mounts idx 0..99 ascending (`incl %edi / cmpl $0x64 /
   jl` @0x1d05c8). Root slots are the only channel; `mods/` means nothing
   to the game (our loader stages to root itself now).
3. Our v6.8 packs: flags 01 C0 match stock, catalog hash == stock path hash
   (FNV-1a64 lowercase), unpack roundtrips byte-exact, payload XORCRC crypto
   verified both directions. Container is stock-faithful to everything we
   can verify statically.
4. Community San847 C0 bakes use an unknown section-data cipher (section TOC
   parses with stock keys, section payloads resist all keys x ciphers tried).
   Their flavor may be what the game requires - UNPROVEN, needs game oracle.
5. Victory registry located: Roster/CharProfilePro.jsfb paired victory u32s
   (Rock [6100,6100]+[8701,8703] @ wrestlerId 100). EntranceListData holds
   1452 motion records (209 victory-range). No Vict table / .adefs in 2K20.
6. Tribute 2K25 method cracked from tributebake.cak: rebuilt VictoryListData
   (657 vs 661 rows; added 14000-14003, removed 7, rehashed strings); full
   patched-index set staged per mod (Victory/Entrance/MoveSet/Profile/Face/
   SDBx6/Music/Movies). Reader oodle-fallback fix verified byte-identical.

## Viable paths forward (ranked)
1. **Stock-archive replacement (MY hypothesis, NOT user-directed, needs
   explicit approval)**: rebake bakedfile00 with mod content inside. Why
   00 and who said so: nobody - I derived it. 00 is simply the stock
   archive that holds the files we want changed (head_color.tex,
   6100.acts). If the resolver is stock-first, stock-slot bytes are the
   only bytes it will ever serve, so this tests that rule directly. It
   contradicts the no-stock-touch stance, which is why it is option 1 WITH
   backup+restore, not a directive. (Catalogs in
   `C:\Users\dgran\AppData\Local\Temp\opencode\cak0*.json`; backups in
   `D:\AuroraForge-Aug26\_work\mod-hold\`.)
2. **San847-flavor replication**: crack their section cipher, rebake ours to
   match byte-conventions exactly, retest via slots.
3. **Resolver RE**: find the file-open overlay walk order in WWE2K20_x64.exe
   (mount neighborhood 0x1d0420-0x1d0800 mapped; xref scripts in Temp).
   Determines first-wins vs parse-reject without launches.
4. **2K22+ instead**: 2K22/25/26 have explicit mod-slot serving (different
   engine generation); the entire bridge/converter program is unaffected.

## Key state (hashes/paths, 2026-09-18)
- Game: `D:\Program Files (x86)\Steam\steamapps\common\WWE2K20\` (note NO
  space; 2K19/2K22 use spaces). Root holds stock 00-05 + staged
  `mods/bakedfile08.cak` (full Rock set, CEC5EAB7...). manifest [08].
  Loader dinput8 + ftrib 92B3 installed + verified.
- Sources: `C:\Games\2k20extracts\Root` COMPLETE (284260/284260 audited).
  2K20 `D:\WWE26-mods\extracts\2k20\Root` secondary. 2K22
  `D:\AuroraForge-Aug26\Extracted Files\2k22\Root`. 2K25
  `D:\WWE 2K25-1.23\WWE 2K25\`. Tribute bake: same dir `\mods\tributebake.cak`.
- Repos (23/23 PRIVATE, main+working pushed): prototype (research home,
  notes/ = shared log), Aurora-CAK-Foundry (packer; C0 write + oodle
  fallback on working), Secure-DataCtrlLink-WWE2K25 (loader; native-mount +
  window-gate on working), standalone 2K19-to-2K20-Converter (product),
  Clips-Tools, PAC-Tools, Blender-Animation-Tools, Patreon-Verifier,
  Converter-App. Rules: visibility check before push; clean builds only;
  content-verify installs; machine-verify hashes (63-char typo lesson).
- Logs: game `DataCtrlLink.log` (mount/approval record); research
  `WWE2K19-to-2K26-Entrance-Prototype/notes/LOG-*.md` (update rule in
  ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md); `_work/` = scratch (mod-hold,
  texture-test-rock, newid-9790, tribute25, upstream-caketools).
- Tools: `tools/bake-2k20-textures.js` (DDS->CRN->TEX->v6.8 CLI, byte-exact),
  `tools/stage-public-tools.js` (sanitized 14-file release pipeline),
  Unity crunch fork = `D:\bot-crap\CakeToolsv098a\release\thirdparty\crunch_x64.exe`
  (== Unity repo binary, NOT stock BinomialLLC), texconv May2026 pinned.
- Open user-side items: sanitized EXE publish (1.0.0a vs 1.0.0b); v0977a
  re-bake (moot if slots can't shadow); 9790 additive set (needs registry
  appenders + serving to exist).

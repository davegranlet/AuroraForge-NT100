# AuroraForge NT100 â€” Version History

> This file records shipped/versioned product changes. The â€œNextâ€ section is a dated release backlog, not the active project task list; use `AGENTS.md` and `docs/private/AURORA-FORGE-CURRENT-REFERENCE-2026-10-21.md` for current scope and status.

## Scheme (locked)

- The current release line starts at **2.0**.
- Every future update/release gets the next letter: **2.0.a â†’ 2.0.b â†’ 2.0.c â†’ ...** (then 2.1, 2.1.a, ...)
- One letter per shipped build. The version appears in the app (About / build chip / manifest), in every download filename, and in this file.
- This file is the map: find the version on your download, find it here, see exactly what that build contains.

## 2.1.8 — 2026-10-30

Patch release for the 2.1.a / Beta 4 line.

- **Two-dropdown converter:** explicit From and To selectors list every game generation.
- **Only 2K19 to 2K26 is enabled:** all other source/target pairs are marked not implemented and disabled.
- **Wrong-target rejection:** the service rejects unsupported pairs and any target folder that is not WWE 2K26.
- **Error label fixed:** the old stale 2K25 failure label now reports the actual requested game.
- **Oodle fallback retained:** failed per-file compression stores raw and continues with a warning.
- **Messaging corrected across app, website, and source pages.**

Artifacts for 2.1.8:

```
AuroraForge-NT100-Setup-2.1.8-x64.exe
AuroraForge-NT100-2.1.8-Linux-x64.tar.gz
```

The GitHub Release carries the Windows updater files. Public app and source downloads are hosted on auroraforge.live.

## 2.1.7 — 2026-10-30

Patch release for the 2.1.a / Beta 4 line.

- **Oodle compression fallback:** when the helper fails on an individual payload, the CAK repackager stores that payload without compression and continues, reporting a warning instead of failing the whole library build.
- **Foundry EPERM, menu encoding, universe profile startup, installer, and updater fixes retained.**
- **Install guide:** updated for 2.1.7.

Artifacts for 2.1.7:

```
AuroraForge-NT100-Setup-2.1.7-x64.exe
AuroraForge-NT100-2.1.7-Linux-x64.tar.gz
```

The GitHub Release carries the Windows updater files. Public app and source downloads are hosted on auroraforge.live.

## 2.1.6 — 2026-10-30

Patch release for the 2.1.a / Beta 4 line.

- **Animation Converter foundry EPERM fixed:** each build now uses a fresh unique `foundry-*` shim directory instead of deleting and recreating the old `foundry` directory containing a Windows junction.
- **Menu encoding repair retained:** the 2.1.5 UTF-8 navigation icon and punctuation fix remains.
- **Installed-app startup fix retained:** the packaged universe profile module fix from 2.1.4 remains.
- **Installer and updater retained:** the Windows installer packages the refreshed runtime staging tree and writes GitHub updater metadata.
- **Source downloads:** public source archives are regenerated for 2.1.6.

Artifacts for 2.1.6:

```
AuroraForge-NT100-Setup-2.1.6-x64.exe
AuroraForge-NT100-2.1.6-Linux-x64.tar.gz
```

The GitHub Release carries the Windows updater files. Public app and source downloads are hosted on auroraforge.live.

## 2.1.5 — 2026-10-30

Patch release for the 2.1.a / Beta 4 line.

- **UTF-8 menu repair:** restored the navigation icons, arrows, punctuation, and separators in the app pages that were re-encoded as Windows text in the 2.1.4 build.
- **Installed-app startup fix retained:** the packaged universe profile module fix from 2.1.4 remains.
- **Installer and updater retained:** the Windows installer packages the refreshed runtime staging tree and writes GitHub updater metadata.
- **Source downloads:** public source archives are regenerated for 2.1.5.

Artifacts for 2.1.5:

```
AuroraForge-NT100-Setup-2.1.5-x64.exe
AuroraForge-NT100-2.1.5-Linux-x64.tar.gz
```

The GitHub Release carries the Windows updater files. Public app and source downloads are hosted on auroraforge.live.

## 2.1.4 — 2026-10-30

Patch release for the 2.1.a / Beta 4 line.

- **Installed-app startup fixed:** the packaged app now resolves the universe profile module from the staged `entry-studio/tools/aurora-formats` runtime path instead of a repository-relative path that does not exist in the installed app.
- **Installer runtime refreshed:** the installer now packages the current runtime staging tree, including the entry-studio tools, and writes GitHub updater metadata.
- **New Universe Profile editor:** preload bridge, IPC handlers, validation, merge preview, and save-as-copy support.
- **New format and analysis tools:** ADefs, DDS metadata, JSFB, MTLS, profile text, SDB, TCAW, TDB, and YCL readers/inspectors; decompilation function inspection, coverage, evidence audit, Ghidra export helpers, Tribute corpus audits, Entry Studio roster actions, and Blender smoke tooling.
- **Installer work:** loader bundle preparation, game-folder detection, transactional loader install, checksum verification, uninstall rollback, and owner-file preservation.
- **Source downloads:** public source archives are regenerated for 2.1.4. Game data, binaries, private research, generated decompilation output, and website source remain excluded.

Artifacts for 2.1.4:

```
AuroraForge-NT100-Setup-2.1.4-x64.exe
AuroraForge-NT100-2.1.4-Linux-x64.tar.gz
```

The GitHub Release carries the Windows updater files. Public app and source downloads are hosted on auroraforge.live.

## 2.1.3 — 2026-10-30

Maintenance release for the 2.1.a / Beta 4 line.

- **Animation source update:** new and revised 2K26 victory/entrance tooling, ADefs file and payload helpers, pair-asset builders, source body and camera clip builders, facial layout and dictionary readers, FOP19 readers/models, SDB 2K26 index handling, victory registration and fidelity checks, YAMM19 reading, and additional PE/Ghidra analysis utilities. Modified clips layout, conversion, cutscene F7, skeleton refresh, and SDB tools are included. The 2K26 victory framing issue remains an open research item; this release does not claim it is fixed.
- **New and updated tool source:** WWE 2K19 PAC Tools, Custom Music Loader (2K25 and 2K26), DDS Converter, Entry Studio public/server split, and the latest CAK Foundry source.
- **Loaders:** Secure DataCtrlLink 2K25, the Aurora CAK Mod Loader and its 2K25 variant, and additional Secure DataCtrlLink 2K26 tests/scripts.
- **Licensing and protection:** CAK Foundry is now GPL-3.0-or-later, matching the main application. The BakeMe validator rejects protected HideCtrlData entitlement payloads.
- **Packaging:** Windows NSIS installer via electron-builder with the existing GitHub auto-update path; Linux x64 tar.gz via the native packager fallback.
- **Source downloads:** public source archives are regenerated for 2.1.3. Game data, binaries, private research, generated decompilation output, and website source remain excluded.

Artifacts for 2.1.3:

```
AuroraForge-NT100-2.1.3-Windows-x64-Setup.exe
AuroraForge-NT100-2.1.3-Linux-x64.tar.gz
```

Hashes are published in `SHA256SUMS.txt` alongside the downloads.

## 2.0 â€” 2026-10-01

First build on the 2.0 line. Contains the entire Oct 1 work day:

- **Verifier completely rewritten and hardened** (rev `2026-10-01-secure3`): af3 signed tokens with nonce + expiry, single-use results (replay refused), release-challenge binding carried through the whole sign-in flow, redirect allowlist, constant-time signature checks, ban checks at every stage, sanitized errors, `/health` diagnostics.
- **Crystal design** across the app: black/red/silver theme, faceted glass panels, cut-corner panels, metallic silver headings, red energy accents, no blue anywhere, no glow hints, no default blue links, text-presentation icons.
- **2K26 everywhere**: converter/entry copy announces 2K25/2K26; version registry across 2K19/2K20/2K25/2K26.
- **Converter pipeline hardening**: byte-preserving registration writers (Victory/Entrance/Cutscene originals kept exactly as shipped), anchor template never shipped in the CAK, refreshed 2K26 skeleton bundled, FDIR 9.9 bake path.
- **Website**: Beta 3 long-form page, self-hosted downloads, free-subscription links on every $3 mention, locked public claims (100% Not TRIBUTE section, no competitor links).
- **Linux**: GPU-less startup by default (VPS-friendly); Windows + Linux x64 builds.

Artifacts for 2.0:

```
AuroraForge-NT100-2.0-Windows-x64.zip
AuroraForge-NT100-2.0-Linux-x64.tar.gz
Aurora-Forge-2.0-Preview.exe
Aurora-Forge-2.0-Preview.tar.gz
```

Hashes are published in `SHA256SUMS.txt` alongside the downloads.

## 2.1.a — 2026-10-29

First post-2.1 release, free for everyone. Contains the full October toolchain, loader source, and workflow trees accumulated since the 2.1 freeze (last commit `86652a2`, Oct 14).

- **Secure DataCtrlLink loader source now in the repo** (`loaders/Secure-DataCtrlLink-WWE2K26/`): the full dinput8 proxy + CAK Mod Loader + Custom Music Loader + diagnostic plugin source tree with build pipeline (`build.ps1`, clang/LLVM-MinGW), the version-independent profile system with per-exe SHA-256 hooks (`profiles.cpp` — Steam 2026-10-28 profile added for exe `7F9C2461...`), the addon registry/approval system (`addon_registry.hpp/cpp`), the CAK mount hook, the four-argument native trampoline, the ResourceSync observation loop, and the forensic probe system. Includes the round-2 eight-lane diagnostic plugin (`victory_capture/victory_capture.cpp`) and the unit test suite (runtime_config, addon_selection, addon_registry, mod_manifest, status_message, cak_validator, proxy_smoke, bank_builder).
- **New loader capabilities**: version-independent CAK mounting with per-build profile lookup, early-boot injection + post-ResourceSync registry pass, forensic probe event system, addon approval by SHA-256, the `plugins/addons.txt` selection file, the approved addon registry with multi-hash support, the ordered CAK mount pipeline with rollback, and the diagnostic capture plugin system.
- **Animation toolchain expanded by ~100 tools**: the full Victory/Entrance conversion pipeline for 2K19 to 2K26 (body/facial clips codec, pair-table from-source builder, cutscene assembly builder, SDB 2K26 cipher, ADefs parser/export, CsaDatabase/CdefDatabase appenders, VictoryListData/EntranceListData writers, CutsceneNoRegistry registration, pair JSFB builders, camera coordinate matching, root-origin transforms, companion curve verification, rope/corner companion builders, 2K20 IR bridge, group90 encoder/decoder, skeleton crosswalk, track fidelity verification, CAK compare/extract tools, retarget/renumber tools, the Victory motion-table scanner, and the full Ghidra headless script library (14 scripts).
- **Workflow trees committed**: `victory-6100-2k19/` (the complete Victory 6100 conversion: 30+ candidate dirs, the runtime-analysis Ghidra project, the full CONTINUATION ledger with every finding/hypothesis/elimination from the Oct 22-29 investigation), `entrance-2k19-to-2k26-20261023/` (the working three-entrance pipeline), and `dolph-ziggler-1-2k19/`.
- **CAK Foundry updates**: bake-v93-cli with `--store-raw` mode for raw SDB payload storage, FDIR v9.9 key derivation (`cak-v99-key.js`), the v8.3 cipher port (`cak-v83-crypto.js`), the `cak-reader.js`/`cak20-reader.js` readers with negative-soff support, `jsfb-append-lib.js` (the FlatBuffer splice primitives), the `archive-repackager.js` with TDB v6 stub emission, and the `AuroraCakHelper` extraction/compression C# tool source.
- **100-not-tribute tools added**: PAC-Tools (2K19 PAC archive reader/writer), Converter App (standalone with its own Electron shell), Custom Music Loader (2K25+2K26), DDS Converter, and the Entry Studio public/server split.
- **Umbrella app 2.1 changes**: GPL-3.0 license switch, Patreon/Discord/OAuth verification gate removed, tool library browser (`tool-library.html` + `tool-library-service.js`), the current-workbench page with source downloads, the `sl/` short-path library for Windows MAX_PATH, the animation converter service improvements, Entry Studio public split, the 2.1 website (beta4), and the 2.0 download artifacts removed from the website (superseded).
- **Known issues**: the Victory motion placement/framing defect in 2K26 remains open (see the full handoff at `animation/workflows/victory-6100-2k19/HANDOFF-20261029-FULL.md` — the static dispatch chain is confirmed not to fire at runtime; the stock-6100 retarget route is the leading candidate but is not yet validated in-game). The `_textures.tdb` TDB v6 stub masking in the last-mounted CAK is a known cosmetic issue for headerless DDS payloads.

Artifacts for 2.1.a:

`AuroraForge-NT100-2.1.a-Windows-x64.zip`
AuroraForge-NT100-2.1.a-Linux-x64.tar.gz

Hashes are published in SHA256SUMS.txt alongside the downloads.

## 2.1 - 2026-10-27 - Beta 4 (First free release)

First full beta on the 2.1 line and the first fully free release.

- **License switch:** Aurora Forge source is now GPL-3.0-or-later; third-party components keep their own licenses.
- **All verification removed**: the Patreon/Discord access gate, OAuth callback listener, release challenge, owner-build bypass, and every in-app verifier requirement are gone. The app opens directly into the workspace with no sign-in.
- **Rebuilt on the 2.0 design**: the app starts on `index.html` (Forge Home, full sidebar, `forge-workspace.css` + `aurora-crystal.css`) instead of the 3.0 preview `current-workbench.html`, so the familiar workspace, navigation, and Crystal look are restored.
- **Complete current tool set shipped**: in-app Animation Converter + staged converter Foundry, Entry Studio, Audio Studio, CAK Foundry and FDIR 9.3 backend, 2K19 PAC tools, DDS/texconv, Mod Suite, Projects, Prompt Builders, tutorials/handbook, and the full source/tool library (1,211 tools).
- **Full converter matrix surfaced**: app and website listings now show WWE 2K19 â†’ 2K20 / 2K22 / 2K23 / 2K24 / 2K25 / 2K26 and cross-generation combinations; the converter target selector lists every target instead of only 2K25/2K26.
- **Latest animation toolchain included**: pair-table from-source builder, from-scratch cutscene assembly builder, 2K26 SDB cipher/append, ADefs typed parser/export, and the current converter/validation scripts.
- **Windows MAX_PATH fix**: the tool library is generated with short directory names and shipped once as `resources/sl` instead of a deeply nested asar folder. The longest packaged path dropped from 303 to about 196 characters, so Windows extract/copy no longer hits "path too long".
- **Retired standalone converter preview excluded**: that old executable carries its own Patreon gate; the in-app converter is the canonical path.
- Windows x64 ZIP and Linux x64 tar.gz artifacts. No per-release verification challenge.

Artifacts for 2.1:

```
AuroraForge-NT100-2.1-Windows-x64.zip
AuroraForge-NT100-2.1-Linux-x64.tar.gz
```

Hashes are published in SHA256SUMS.txt alongside the downloads.

## 2.0.m â€” 2026-10-04

Fourteenth published build on the 2.0 line.

- **Animation Converter now runs inside the main app** (owner directive: "instead of loading the standalone app separately make it load in the main app"). New `app/animation-converter.html` page + renderer and a new in-process `electron/services/animation-converter-service.js`: choose the 2K19 folder and the target 2K25/2K26 folder, then convert the full library to new entries and bake one CAK â€” no separate download or app window. The page reuses the same verified toolchain (skeleton refresh from the user's own game CAKs, 2K19 extraction, clone-graph library conversion, Foundry bake), streams the live progress log, version-checks the target folder, and persists folder choices in app data. The tools hub and the retired project-catalog page link to the in-app page; the old launcher stays only as a rollback path.
- **Packaged builds stage a minimal converter Foundry** (game-version registry + bake CLI staged at build time) so the in-app flow bakes with the bundled CAK v9.3 tools instead of requiring the standalone converter.
- **Extract-only task**: the same page can decode the 2K19 animation library to a folder without baking, for inspection or reuse.
- Known issue carried forward: the full-library CAK produced by the earlier converter flow still crashes WWE 2K26 at the known rebuilt-registration-table signature (RVA `0xA51A27`); the crash dump is analyzed and the byte-preserving staging investigation continues (see the loader session log).
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.m:

```
AuroraForge-NT100-2.0.m-Windows-x64.zip
AuroraForge-NT100-2.0.m-Linux-x64.tar.gz
```

## 2.0.l â€” 2026-10-04

Thirteenth published build on the 2.0 line.

- **Converter verification inheritance fixed (owner report: owner build's converter locked; user build had to re-verify).** Root cause: the pipeline-dropdown edit accidentally dropped the `const outputBtn = $('output-btn')` line, so `wireUi()` threw `ReferenceError: outputBtn is not defined` and the whole renderer init (including the access check) never ran - the converter always showed locked. Fixed and verified end-to-end: with a main-app session the renderer now calls the access handler and receives `main_app_session` (converter shows verified, no re-verification).
- Bundled converter refreshed (`Aurora-Forge-2.0.k-Preview.exe`, new SHA-256).
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.l:

```
AuroraForge-NT100-2.0.l-Windows-x64.zip
AuroraForge-NT100-2.0.l-Linux-x64.tar.gz
```

## 2.0.k â€” 2026-10-04

Twelfth published build on the 2.0 line.

- **Converter copy no longer says 2K25-only.** The task, button, summary, and completion text now say 2K25/2K26 (the pipeline always targeted whichever game you select; only the wording lagged).
- **Source/Target game pipeline dropdown.** New selectors in the converter wizard: Source game (WWE 2K19 active; 2K26, 2K25, 2K24, 2K23, 2K22, 2K20 listed as coming soon) and Target game (WWE 2K25 and WWE 2K26 active; older games coming soon). Labels, task text, and the summary follow the selected target, and the chosen game folder is version-checked against it (a mismatch shows a clear heads-up instead of failing later). Reverse and cross-game pipelines (for example 2K26 to 2K20) will slot into this selector as they are finished.
- **Bundled converter refreshed** to `Aurora-Forge-2.0.k-Preview.exe` (copy fix + pipeline dropdown).
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.k:

```
AuroraForge-NT100-2.0.k-Windows-x64.zip
AuroraForge-NT100-2.0.k-Linux-x64.tar.gz
```

## 2.0.j â€” 2026-10-03

Eleventh published build on the 2.0 line.

- **Custom music works end-to-end in-game.** Verified by the owner: custom tracks appear and play correctly in the entrance and victory editors and during matches, with commentary and match rating intact.
- **Audio Studio builds the working package shape:** exactly one WEM per registered custom row - never bulk silent placeholders (the 2,500-entry placeholder package broke the game's streamed audio: no commentary, no in-match entrance music, match rating disabled).
- **Only entries with actual music are registered:** the MusicList writer can prune rows (new `removeMusicRows`, in-place vector rewrite with rebased offsets), and the build drops any custom row that has no WEM instead of listing dead entries.
- **Fixed `CustomMusic.cak` with cumulative edits:** every build writes/overwrites `mods/CustomMusic.cak`, reads its existing MusicList back out of the CAK as the base, and appends - so adding or editing music never loses earlier tracks.
- **Pickers refresh from the CAK:** the Audio Studio list and the Entry Studio entrance-music dropdown read the current `CustomMusic.cak`.
- **Music loader addon auto-enabled on build** (timestamped backup first), stale `*CustomMusic*.cak` files renamed `.stale-bak`, manifest `cakOrder` sanitized and the music CAK kept first.
- Loader stack rebuilt with the current reproducible registry (music addon `4a21575fâ€¦`, MyGM example `50cdabf7â€¦`); the verified mount configuration stays `CakInjectIndex=90, CakInjectExact=1` (later mounts win).
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.j:

```
AuroraForge-NT100-2.0.j-Windows-x64.zip
AuroraForge-NT100-2.0.j-Linux-x64.tar.gz
```

## 2.0.i â€” 2026-10-03

Tenth published build on the 2.0 line.

- **Pickers refresh from CustomMusic.cak (owner report: "picker needs to pick up the changes and refresh after making").** The Audio Studio music list now reads the current `mods/CustomMusic.cak` (the in-game truth) instead of the base file, so after Build & Stage the row table immediately shows the new custom rows (proven: 759 rows, 2 custom, `fromCak: true`). The Entry Studio entrance-music dropdown reads the same CAK first, so newly added music is selectable there too (proven: ids 3000/3001 appear).
- The ffmpeg status dot now reflects whether ffmpeg actually resolves (configured path or PATH), not just whether a path was chosen.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.i:

```
AuroraForge-NT100-2.0.i-Windows-x64.zip
AuroraForge-NT100-2.0.i-Linux-x64.tar.gz
```

## 2.0.h â€” 2026-10-03

Ninth published build on the 2.0 line.

- **Audio Studio layout fixed (owner report: "so crowded you can't see what the information is").** The custom-track editor was crushing six fields into one row; it is now a labeled two-column grid (ID/Title, Star/Cue, Type/Remove) with full-width inputs and readable labels. Panels are wider (min 520px / 440px, stacking under 1280px), the music table has taller rows and no text wrapping, and the startup log explains the bundled base + `CustomMusic.cak` flow.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.h:

```
AuroraForge-NT100-2.0.h-Windows-x64.zip
AuroraForge-NT100-2.0.h-Linux-x64.tar.gz
```

## 2.0.g â€” 2026-10-03

Eighth published build on the 2.0 line.

- **Custom music bakes into a fixed `CustomMusic.cak`.** Audio Studio no longer generates per-build CAK names: every build writes/overwrites `mods/CustomMusic.cak` (stable name keeps the FDIR key stable and makes the file easy to track).
- **Edits accumulate.** When `CustomMusic.cak` already exists, the editor reads its `MusicList.jsfb` back out of the CAK as the base, appends the new rows, and rebuilds the same CAK - so adding or editing music never loses earlier tracks. Proven by a two-build E2E: build 1 = 758 rows, build 2 read the CAK back and produced 759 rows with both custom tracks and all stock rows intact.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.g:

```
AuroraForge-NT100-2.0.g-Windows-x64.zip
AuroraForge-NT100-2.0.g-Linux-x64.tar.gz
```

## 2.0.f â€” 2026-10-03

Seventh published build on the 2.0 line.

- **Editors bundle their required .jsfb files.** Audio Studio now ships the base `MusicList.jsfb` (757 stock rows) inside the app (`app/data/audio/MusicList.jsfb`) and uses it by default, so custom music works out of the box - no extraction step. Choosing your own extracted copy remains available as an override. Entry Studio already packs the full staged registration tree (EntranceListData, VictoryListData, Sdb, and every edited table) into its CAK output.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.f:

```
AuroraForge-NT100-2.0.f-Windows-x64.zip
AuroraForge-NT100-2.0.f-Linux-x64.tar.gz
```

## 2.0.e â€” 2026-10-03

Sixth published build on the 2.0 line.

- **Audio Studio â€” add and edit custom music.** New in-app tool (Tools hub): choose your own WWE 2K26 game folder, mods folder, and a `MusicList.jsfb` source extracted from your game; import MP3/WAV/FLAC/OGG/M4A; each track is assigned to the next free custom slot (musicId 3000+, the slots the verified CustomMusicLoader rebuilds); edit title/star/cue per track; one Build button encodes Wwise Opus WEMs, builds the `sound/Custom_Music.pck` AKPK package, appends the MusicList rows, bakes the MusicList CAK, and merges `mods/manifest.json` (`cakOrder` + `packageOrder`).
- **New audio pipeline tools** (staged into packaged builds): `build-wem.js` (Wwise Opus WEM muxer; `seek` chunk proven as one u16 per Opus packet), `build-music-pck.js` (AKPK builder matching the captured Custom_Music.pck layout), `edit-2k25-music-list.js` (byte-preserving MusicList writer; stock rows verified unchanged).
- End-to-end sandbox test passed: WAV -> WEM -> AKPK (validated) -> MusicList (758 rows, stock byte-identical) -> CAK (verified) -> manifest.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.e:

```
AuroraForge-NT100-2.0.e-Windows-x64.zip
AuroraForge-NT100-2.0.e-Linux-x64.tar.gz
```

## 2.0.d â€” 2026-10-02

Fifth published build on the 2.0 line. Supersedes 2.0.c (do not use 2.0.c builds).

- **Converter is zero-config now.** The Advanced section no longer shows a registration-skeleton path or a "change skeleton folder" button â€” nothing about the skeleton is manual. The wizard asks only for your own WWE 2K19 install and your own WWE 2K25/2K26 install; the registration skeleton is rebuilt from your own game files on your PC. (The path that used to show was the bundled template extracted by the portable build, not a developer path, but exposing it made the flow look manual. It is gone, and the packaged UI is verified to contain no skeleton path or button.)
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.d:

```
AuroraForge-NT100-2.0.d-Windows-x64.zip
AuroraForge-NT100-2.0.d-Linux-x64.tar.gz
```

## 2.0.c â€” 2026-10-02

Fourth published build on the 2.0 line.

- **About and FAQ rewritten.** Both pages now answer what the project is, why it exists (the anti-consumer gate story, no competitor names), and where it is going, plus "The man behind the forge" builder story. The outdated converter button was removed from About; the FAQ covers the in-app Entry Studio, the own-game-files converter flow, and multi-version CAK support.
- **Standalone converter downloads retired (owner rule).** From this release onward only the main app ships (Windows x64 zip + Linux x64 tar.gz); the converter remains bundled inside the app, launched from Tools after access verification, so users stay on the supported pipeline. No converter-only artifacts are staged or published.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.c:

```
AuroraForge-NT100-2.0.c-Windows-x64.zip
AuroraForge-NT100-2.0.c-Linux-x64.tar.gz
```

## 2.0.b â€” 2026-10-02

Third published build on the 2.0 line. Ships all queued 2.0.b fixes together.

- **Navigation consistency (owner-approved workspace look).** The workspace sidebar (Forge Home / Projects / Prompt Builders / Inspect & Convert / Package & Test / Rebuilding / Setup / About) is now the single canonical menu on all 38 app pages; package/test pages highlight their own "Package & Test" item.
- **Entry Studio runs as an in-app tool â€” no local server.** The legacy standalone Node server (127.0.0.1:7878 + browser) is retired inside the app: new `app/entry-studio.html` page + renderer, new in-process `electron/services/entry-studio-service.js`, IPC + preload bridge, folder settings persisted to app data, converter toolchain staged into packaged builds, converter core honors `AURORA_FTRIB`/`AURORA_GAME_ROOT`. The tools-hub card links to the page.
- **Converter wizard uses only the user's own folders.** Dev-machine defaults removed; the wizard auto-detects both installs (2K19 + 2K25/2K26, picker for each), suggests output under `Documents\AuroraForge NT100 Exports`, and the registration skeleton is rebuilt from the user's own game files via `refresh-2k26-skeleton.js` (bundled base template). Library build fails closed with an actionable message instead of running against a missing skeleton path.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.b:

```
AuroraForge-NT100-2.0.b-Windows-x64.zip
AuroraForge-NT100-2.0.b-Linux-x64.tar.gz
Aurora-Forge-2.0.b-Preview.exe
Aurora-Forge-2.0.b-Preview.tar.gz
```

## 2.0.a â€” 2026-10-01

Second build on the 2.0 line (source-level version; artifacts publish with the next build run).

- **CAK Foundry: multi-version archive support.** New game-version dropdown in the extractor (WWE 2K20 through 2K26, auto-detect by default) with header-based routing: FDIR 9.3 (2K25) opens through the bundled native FTribTool backend, FDIR 9.9 (2K26) and 8.3 (2K22/2K23) through the built-in readers, 2K19 points at the PAC Explorer. Browse, search, and extraction all route per archive; the bundled 9.3 backend round-trip is verified (pack -> detect -> catalog -> extract).
- **Verifier rev `2026-10-01-secure4`:** `/health` now includes a live Discord probe (`discord: { bot, guild }`) and failures distinguish server-side bot problems from real account problems.
- Converter copy now reads **"WWE 2K19 -> 2K26 Entry Forge"** (2K25/2K26 targets supported); per-build labels no longer say BETA2/BETA3 anywhere.
- Restored the bundled 2K26 registration skeleton (`umbrella-app/app/skeletons/14000-base/BakeMe`).
- Full umbrella repository import completed (app, 100% Not TRIBUTE, CAK Foundry, Animation, Loaders, Research, Tutorials).

## Next

- **2.0.n** â€” queued work: the replace/full-library registration crash (RVA `0xA51A27`) fix so converted libraries load in 2K26; multi-game conversion pipelines (reverse clips pipeline + older registration writers behind the coming-soon dropdown options); bundle an LGPL ffmpeg (or keep Setup-selected) so public builds encode without a system install; import the existing WEM library into the Audio Studio work folder; in-game entry validation (2 test runs budgeted; nothing staged); creator acceptance (Route 2) for converted entries in Create-an-Entrance; verifier KV binding so sessions survive verifier redeploys; Entry Studio live click-through (scan â†’ convert â†’ edit â†’ bake â†’ stage); the next editor from the 2K26 JSFB inventory.

### Rule reminder

An internal-only fix does not trigger a rebuild, rehash, or reupload. When a build
is next published for any reason, all queued fixes ship together under the next
letter and get an entry in this file. Standalone converter downloads are retired
(2.0.c onward); the converter is bundled in the app only.

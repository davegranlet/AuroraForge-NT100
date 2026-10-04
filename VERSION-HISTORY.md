# AuroraForge NT100 — Version History

## Scheme (locked)

- The current release line starts at **2.0**.
- Every future update/release gets the next letter: **2.0.a → 2.0.b → 2.0.c → ...** (then 2.1, 2.1.a, ...)
- One letter per shipped build. The version appears in the app (About / build chip / manifest), in every download filename, and in this file.
- This file is the map: find the version on your download, find it here, see exactly what that build contains.

## 2.0 — 2026-10-01

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

## 2.0.l — 2026-10-04

Thirteenth published build on the 2.0 line.

- **Converter verification inheritance fixed (owner report: owner build's converter locked; user build had to re-verify).** Root cause: the pipeline-dropdown edit accidentally dropped the `const outputBtn = $('output-btn')` line, so `wireUi()` threw `ReferenceError: outputBtn is not defined` and the whole renderer init (including the access check) never ran - the converter always showed locked. Fixed and verified end-to-end: with a main-app session the renderer now calls the access handler and receives `main_app_session` (converter shows verified, no re-verification).
- Bundled converter refreshed (`Aurora-Forge-2.0.k-Preview.exe`, new SHA-256).
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.l:

```
AuroraForge-NT100-2.0.l-Windows-x64.zip
AuroraForge-NT100-2.0.l-Linux-x64.tar.gz
```

## 2.0.k — 2026-10-04

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

## 2.0.j — 2026-10-03

Eleventh published build on the 2.0 line.

- **Custom music works end-to-end in-game.** Verified by the owner: custom tracks appear and play correctly in the entrance and victory editors and during matches, with commentary and match rating intact.
- **Audio Studio builds the working package shape:** exactly one WEM per registered custom row - never bulk silent placeholders (the 2,500-entry placeholder package broke the game's streamed audio: no commentary, no in-match entrance music, match rating disabled).
- **Only entries with actual music are registered:** the MusicList writer can prune rows (new `removeMusicRows`, in-place vector rewrite with rebased offsets), and the build drops any custom row that has no WEM instead of listing dead entries.
- **Fixed `CustomMusic.cak` with cumulative edits:** every build writes/overwrites `mods/CustomMusic.cak`, reads its existing MusicList back out of the CAK as the base, and appends - so adding or editing music never loses earlier tracks.
- **Pickers refresh from the CAK:** the Audio Studio list and the Entry Studio entrance-music dropdown read the current `CustomMusic.cak`.
- **Music loader addon auto-enabled on build** (timestamped backup first), stale `*CustomMusic*.cak` files renamed `.stale-bak`, manifest `cakOrder` sanitized and the music CAK kept first.
- Loader stack rebuilt with the current reproducible registry (music addon `4a21575f…`, MyGM example `50cdabf7…`); the verified mount configuration stays `CakInjectIndex=90, CakInjectExact=1` (later mounts win).
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.j:

```
AuroraForge-NT100-2.0.j-Windows-x64.zip
AuroraForge-NT100-2.0.j-Linux-x64.tar.gz
```

## 2.0.i — 2026-10-03

Tenth published build on the 2.0 line.

- **Pickers refresh from CustomMusic.cak (owner report: "picker needs to pick up the changes and refresh after making").** The Audio Studio music list now reads the current `mods/CustomMusic.cak` (the in-game truth) instead of the base file, so after Build & Stage the row table immediately shows the new custom rows (proven: 759 rows, 2 custom, `fromCak: true`). The Entry Studio entrance-music dropdown reads the same CAK first, so newly added music is selectable there too (proven: ids 3000/3001 appear).
- The ffmpeg status dot now reflects whether ffmpeg actually resolves (configured path or PATH), not just whether a path was chosen.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.i:

```
AuroraForge-NT100-2.0.i-Windows-x64.zip
AuroraForge-NT100-2.0.i-Linux-x64.tar.gz
```

## 2.0.h — 2026-10-03

Ninth published build on the 2.0 line.

- **Audio Studio layout fixed (owner report: "so crowded you can't see what the information is").** The custom-track editor was crushing six fields into one row; it is now a labeled two-column grid (ID/Title, Star/Cue, Type/Remove) with full-width inputs and readable labels. Panels are wider (min 520px / 440px, stacking under 1280px), the music table has taller rows and no text wrapping, and the startup log explains the bundled base + `CustomMusic.cak` flow.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.h:

```
AuroraForge-NT100-2.0.h-Windows-x64.zip
AuroraForge-NT100-2.0.h-Linux-x64.tar.gz
```

## 2.0.g — 2026-10-03

Eighth published build on the 2.0 line.

- **Custom music bakes into a fixed `CustomMusic.cak`.** Audio Studio no longer generates per-build CAK names: every build writes/overwrites `mods/CustomMusic.cak` (stable name keeps the FDIR key stable and makes the file easy to track).
- **Edits accumulate.** When `CustomMusic.cak` already exists, the editor reads its `MusicList.jsfb` back out of the CAK as the base, appends the new rows, and rebuilds the same CAK - so adding or editing music never loses earlier tracks. Proven by a two-build E2E: build 1 = 758 rows, build 2 read the CAK back and produced 759 rows with both custom tracks and all stock rows intact.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.g:

```
AuroraForge-NT100-2.0.g-Windows-x64.zip
AuroraForge-NT100-2.0.g-Linux-x64.tar.gz
```

## 2.0.f — 2026-10-03

Seventh published build on the 2.0 line.

- **Editors bundle their required .jsfb files.** Audio Studio now ships the base `MusicList.jsfb` (757 stock rows) inside the app (`app/data/audio/MusicList.jsfb`) and uses it by default, so custom music works out of the box - no extraction step. Choosing your own extracted copy remains available as an override. Entry Studio already packs the full staged registration tree (EntranceListData, VictoryListData, Sdb, and every edited table) into its CAK output.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.f:

```
AuroraForge-NT100-2.0.f-Windows-x64.zip
AuroraForge-NT100-2.0.f-Linux-x64.tar.gz
```

## 2.0.e — 2026-10-03

Sixth published build on the 2.0 line.

- **Audio Studio — add and edit custom music.** New in-app tool (Tools hub): choose your own WWE 2K26 game folder, mods folder, and a `MusicList.jsfb` source extracted from your game; import MP3/WAV/FLAC/OGG/M4A; each track is assigned to the next free custom slot (musicId 3000+, the slots the verified CustomMusicLoader rebuilds); edit title/star/cue per track; one Build button encodes Wwise Opus WEMs, builds the `sound/Custom_Music.pck` AKPK package, appends the MusicList rows, bakes the MusicList CAK, and merges `mods/manifest.json` (`cakOrder` + `packageOrder`).
- **New audio pipeline tools** (staged into packaged builds): `build-wem.js` (Wwise Opus WEM muxer; `seek` chunk proven as one u16 per Opus packet), `build-music-pck.js` (AKPK builder matching the captured Custom_Music.pck layout), `edit-2k25-music-list.js` (byte-preserving MusicList writer; stock rows verified unchanged).
- End-to-end sandbox test passed: WAV -> WEM -> AKPK (validated) -> MusicList (758 rows, stock byte-identical) -> CAK (verified) -> manifest.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.e:

```
AuroraForge-NT100-2.0.e-Windows-x64.zip
AuroraForge-NT100-2.0.e-Linux-x64.tar.gz
```

## 2.0.d — 2026-10-02

Fifth published build on the 2.0 line. Supersedes 2.0.c (do not use 2.0.c builds).

- **Converter is zero-config now.** The Advanced section no longer shows a registration-skeleton path or a "change skeleton folder" button — nothing about the skeleton is manual. The wizard asks only for your own WWE 2K19 install and your own WWE 2K25/2K26 install; the registration skeleton is rebuilt from your own game files on your PC. (The path that used to show was the bundled template extracted by the portable build, not a developer path, but exposing it made the flow look manual. It is gone, and the packaged UI is verified to contain no skeleton path or button.)
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.d:

```
AuroraForge-NT100-2.0.d-Windows-x64.zip
AuroraForge-NT100-2.0.d-Linux-x64.tar.gz
```

## 2.0.c — 2026-10-02

Fourth published build on the 2.0 line.

- **About and FAQ rewritten.** Both pages now answer what the project is, why it exists (the anti-consumer gate story, no competitor names), and where it is going, plus "The man behind the forge" builder story. The outdated converter button was removed from About; the FAQ covers the in-app Entry Studio, the own-game-files converter flow, and multi-version CAK support.
- **Standalone converter downloads retired (owner rule).** From this release onward only the main app ships (Windows x64 zip + Linux x64 tar.gz); the converter remains bundled inside the app, launched from Tools after access verification, so users stay on the supported pipeline. No converter-only artifacts are staged or published.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.c:

```
AuroraForge-NT100-2.0.c-Windows-x64.zip
AuroraForge-NT100-2.0.c-Linux-x64.tar.gz
```

## 2.0.b — 2026-10-02

Third published build on the 2.0 line. Ships all queued 2.0.b fixes together.

- **Navigation consistency (owner-approved workspace look).** The workspace sidebar (Forge Home / Projects / Prompt Builders / Inspect & Convert / Package & Test / Rebuilding / Setup / About) is now the single canonical menu on all 38 app pages; package/test pages highlight their own "Package & Test" item.
- **Entry Studio runs as an in-app tool — no local server.** The legacy standalone Node server (127.0.0.1:7878 + browser) is retired inside the app: new `app/entry-studio.html` page + renderer, new in-process `electron/services/entry-studio-service.js`, IPC + preload bridge, folder settings persisted to app data, converter toolchain staged into packaged builds, converter core honors `AURORA_FTRIB`/`AURORA_GAME_ROOT`. The tools-hub card links to the page.
- **Converter wizard uses only the user's own folders.** Dev-machine defaults removed; the wizard auto-detects both installs (2K19 + 2K25/2K26, picker for each), suggests output under `Documents\AuroraForge NT100 Exports`, and the registration skeleton is rebuilt from the user's own game files via `refresh-2k26-skeleton.js` (bundled base template). Library build fails closed with an actionable message instead of running against a missing skeleton path.
- New per-release verification challenge (sessions from earlier releases do not unlock this build).

Artifacts for 2.0.b:

```
AuroraForge-NT100-2.0.b-Windows-x64.zip
AuroraForge-NT100-2.0.b-Linux-x64.tar.gz
Aurora-Forge-2.0.b-Preview.exe
Aurora-Forge-2.0.b-Preview.tar.gz
```

## 2.0.a — 2026-10-01

Second build on the 2.0 line (source-level version; artifacts publish with the next build run).

- **CAK Foundry: multi-version archive support.** New game-version dropdown in the extractor (WWE 2K20 through 2K26, auto-detect by default) with header-based routing: FDIR 9.3 (2K25) opens through the bundled native FTribTool backend, FDIR 9.9 (2K26) and 8.3 (2K22/2K23) through the built-in readers, 2K19 points at the PAC Explorer. Browse, search, and extraction all route per archive; the bundled 9.3 backend round-trip is verified (pack -> detect -> catalog -> extract).
- **Verifier rev `2026-10-01-secure4`:** `/health` now includes a live Discord probe (`discord: { bot, guild }`) and failures distinguish server-side bot problems from real account problems.
- Converter copy now reads **"WWE 2K19 -> 2K26 Entry Forge"** (2K25/2K26 targets supported); per-build labels no longer say BETA2/BETA3 anywhere.
- Restored the bundled 2K26 registration skeleton (`umbrella-app/app/skeletons/14000-base/BakeMe`).
- Full umbrella repository import completed (app, 100% Not TRIBUTE, CAK Foundry, Animation, Loaders, Research, Tutorials).

## Next

- **2.0.m** — **Animation Converter runs inside the main app** (owner directive: "instead of loading the standalone app separately make it load in the main app"): port the wizard (folders, Source/Target pipeline, task, convert, results) into an in-app page backed by an umbrella service over the same toolchain, like Entry Studio and Audio Studio. Then the next editor work, in-game entry validation results, creator acceptance, verifier KV binding, user-reported fixes.
  - Queued: **multi-game conversion pipelines** (reverse clips pipeline + older registration writers behind the coming-soon dropdown options).
  - Queued: **bundle an LGPL ffmpeg** (or keep Setup-selected) so public builds encode without a system install.
  - Queued: **import the existing WEM library** into the Audio Studio work folder.
  - Queued: **in-game entry validation** - fresh runs of the converted entries in WWE 2K25/2K26 (2 test runs budgeted; nothing staged).
  - Queued: **creator acceptance (Route 2)** - confirm the owner's own accounts can accept the converted entries in Create-an-Entrance.
  - Queued: **verifier KV binding** - move the replay store from memory to KV so sessions survive verifier redeploys.
  - Queued: **Entry Studio live click-through** - owner-run pass over the new in-app page (scan → convert → edit → bake → stage).

### Rule reminder

An internal-only fix does not trigger a rebuild, rehash, or reupload. When a build
is next published for any reason, all queued fixes ship together under the next
letter and get an entry in this file. Standalone converter downloads are retired
(2.0.c onward); the converter is bundled in the app only.

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

## 2.0.a — 2026-10-01

Second build on the 2.0 line (source-level version; artifacts publish with the next build run).

- **CAK Foundry: multi-version archive support.** New game-version dropdown in the extractor (WWE 2K20 through 2K26, auto-detect by default) with header-based routing: FDIR 9.3 (2K25) opens through the bundled native FTribTool backend, FDIR 9.9 (2K26) and 8.3 (2K22/2K23) through the built-in readers, 2K19 points at the PAC Explorer. Browse, search, and extraction all route per archive; the bundled 9.3 backend round-trip is verified (pack -> detect -> catalog -> extract).
- **Verifier rev `2026-10-01-secure4`:** `/health` now includes a live Discord probe (`discord: { bot, guild }`) and failures distinguish server-side bot problems from real account problems.
- Converter copy now reads **"WWE 2K19 -> 2K26 Entry Forge"** (2K25/2K26 targets supported); per-build labels no longer say BETA2/BETA3 anywhere.
- Restored the bundled 2K26 registration skeleton (`umbrella-app/app/skeletons/14000-base/BakeMe`).
- Full umbrella repository import completed (app, 100% Not TRIBUTE, CAK Foundry, Animation, Loaders, Research, Tutorials).

## Next

- **2.0.b** — in-game entry validation results, creator acceptance for the owner's own accounts, verifier KV binding, any user-reported fixes.
  - Queued: **navigation consistency fix** - the owner-approved workspace sidebar (Forge Home / Projects / Prompt Builders / Inspect & Convert / Package & Test / Rebuilding / Setup / About) is now the single canonical menu on all 38 app pages; the package/test pages (mod-suite, mod-workshop, mod-file-inspector) highlight their own "Package & Test" item; `verify-package` navigation checks updated and passing.
  - Queued: **Entry Studio runs as an in-app tool** - the legacy standalone Node server (127.0.0.1:7878 + browser) is retired inside the app: new `app/entry-studio.html` page + renderer, new in-process `electron/services/entry-studio-service.js`, IPC + preload bridge, folder settings persisted to user data, converter toolchain staged into packaged builds, converter core honors `AURORA_FTRIB`/`AURORA_GAME_ROOT`. The tools-hub card links to the page; `verify-package` checks updated and passing. (Owner's live click-through still to be done.)

### Rule reminder

An internal-only fix does not trigger a rebuild, rehash, or reupload. When a build
is next published for any reason, all queued fixes ship together under the next
letter and get an entry in this file.

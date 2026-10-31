# AuroraForge NT100 — Version History

## 2.1.9 — 2026-10-31

- Added the runtime-validated native-layout Victory reconstruction tool.
- Converted choreography remains bit-exact; native 2K26 tracking and rig channels are restored in native order.
- Added strict structural and decoded readback validation.

## Scheme (locked)

- The current release line starts at **2.0**.
- Every future update/release gets the next letter: **2.0.a → 2.0.b → 2.0.c → ...** (then 2.1, 2.1.a, ...)
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

## Next

- The next **published** build takes the next letter: **2.0.a**. Already queued for it (committed in source, deliberately not republished - internal-only):
  - Converter window copy fixes: the per-build labels no longer say "BETA2"/"BETA3" anywhere - the status banner and page titles now read 2.0.
  - Standing work: in-game entry validation results, creator acceptance for the owner's own accounts, verifier KV binding.

### Rule reminder

An internal-only fix does not trigger a rebuild, rehash, or reupload. When a build
is next published for any reason, all queued fixes ship together under the next
letter and get an entry in this file.

## 2.1.2 - 2026-10-30

Patch build for the 2.1.a / Beta 4 line.

- Fixed the Animation Converter packaged-app skeleton refresh failing because the bundled skeleton lives inside app.asar; the service now materializes it to the writable user-data folder before spawning refresh-2k26-skeleton.js.
- Switched packaging to electron-builder (Windows NSIS installer, Linux AppImage) and added electron-updater with GitHub Releases as the update source.
- Added Help > Check for Updates... and automatic startup checks in packaged builds.
- Added the focused source patch at umbrella-app/patches/animation-converter-asar-skeleton-fix.patch.


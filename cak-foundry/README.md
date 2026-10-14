**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry

Aurora CAK Foundry is the standalone multi-version `.cak` extractor, rebuilder, baker, and validator from Aurora Forge. It currently covers the verified WWE 2K25 FDIR v9.3 path and the WWE 2K26 FDIR v9.9 path, with each capability stated by evidence level instead of by guesswork.

## Release identity

- Public release: **v1.7.9.b**
- Runtime version: **1.7.9**
- Status: **Ready** for WWE 2K25 (Saturday Night's Main Event and v1.23) catalog/name recovery, extraction, identity-preserving protected rebuild, verified archive mount acceptance, and one protected v9.3 changed-content visual replacement. WWE 2K26 v9.9 supports local payload extraction and protected baking; its September 2026 `bakedfile03/100` external payload records require an exact-size file from the user's separately extracted companion folder. Other asset classes, multi-archive collisions, and existing WWE 2K26 labels remain unchanged or **Experimental**.

## Current ability map

| Game/version family | What Foundry can do today | Boundary |
|---|---|---|
| WWE 2K25 FDIR v9.3 | Open protected archives, recover known names, extract payloads, rebuild protected CAKs, reopen and byte-check payloads, and support the reviewed Saturday Night's Main Event / v1.23 loader workflow | Broader asset-class behavior still needs specific in-game proof |
| WWE 2K26 FDIR v9.9 | Open archives, recover known names, extract local payloads, protected-bake output CAKs, and verify rebuilt payload bytes | September 2026 external payload records need an exact-size companion extraction selected by the user |
| Shared CAK workflow | Keep source archives unchanged, write separate outputs, preserve third-party notices, and record unresolved names honestly | Does not include game files, Oodle, extracted assets, or packaged third-party binaries |
| Earlier WWE generations | Used as research context in the wider Aurora Forge workspace | This repository is not the 2K19/2K20 animation bridge or PAC workbench |

Each public artifact keeps its own name, version, checksum, notes, bug report, and fix report. An older package is never silently replaced by a newer build.

## What it does

- Opens WWE 2K25 FDIR v9.3 and WWE 2K26 FDIR v9.9 CAK archives read-only.
- Extracts selected files or all game CAKs into one merged folder representing game `/root`.
- Uses the included catalog to recover known paths and filenames.
- Records unresolved identities honestly instead of inventing names.
- Rebuilds an extracted mod folder into a protected game-ready CAK.
- Safely recovers 2K26 catalog payloads stored outside `bakedfile03.cak` or `bakedfile100.cak` from a user-selected companion extraction only when the virtual path and exact expected size agree; zero-offset references and short placeholder files stay blocked.
- Reopens and byte-checks rebuilt payloads.

No WWE archives, Oodle DLLs, extracted game assets, or personal paths are included. The program uses the Oodle library from the user's own game installation when required.

See [v1.7.9.b release notes](docs/CAK_FOUNDRY_RELEASE_NOTES_1.7.9.b.md), [v1.7.9.a release notes](docs/CAK_FOUNDRY_RELEASE_NOTES_1.7.9.a.md), [v1.7.9 notes](docs/CAK_FOUNDRY_RELEASE_NOTES_1.7.9.md), [v1.7.8 notes](docs/CAK_FOUNDRY_RELEASE_NOTES_1.7.8.md), [bug report](docs/AURORA_CAK_FOUNDRY_v1.7.8_BUG_REPORT.md), and [fix report](docs/AURORA_CAK_FOUNDRY_v1.7.8_FIX_REPORT.md).

The WWE 2K25 FDIR 9.3 compatibility layer uses Nenkai's MIT-licensed Bakery/CakeTool source with its copyright, license, upstream README, and integration notice preserved. Aurora does not present that third-party work as original Aurora code.

## Source layout note

This repository begins from the exact runtime source used by the completed standalone release. Some shared Aurora Forge Electron services remain present because the released entrypoint imports the shared runtime. Removing that coupling is tracked cleanup work; it is not being hidden behind an unverified rewrite.

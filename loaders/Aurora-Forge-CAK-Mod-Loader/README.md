**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge CAK Mod Loader

Aurora Forge CAK Mod Loader is the separate Secure DataCtrlLink addon that validates and mounts WWE 2K26 `.cak` mods.

## Current status

**Ready — verified with Secure DataCtrlLink v1.7.7.**

The compiled addon is named `AuroraForge.CAKModLoader.ftrib`. It is intentionally separate from the shared DataCtrlLink loader and from the Custom Music Loader.

## Current ability map

| Area | Current capability | Boundary |
|---|---|---|
| Target game | WWE 2K26 through the reviewed Secure DataCtrlLink profile | Exact supported build checks still gate activation |
| CAK loading | Validates CAK structure and bounds, honors `mods/manifest.json`, mounts ordered archives, and logs rejection reasons | In-game content still requires user verification by asset |
| Security posture | Loads only when the addon filename and SHA-256 match the compiled Secure DataCtrlLink registry | Does not load arbitrary `.asi`, `.dlp`, DLL, or `.ftrib` files |

The separated addon was verified in-game on September 5, 2026: the game loaded successfully and test CAK content appeared in-game.

It validates CAK structure and bounds before mounting, supports `mods/manifest.json` for explicit archive enable/disable and order, checks the exact supported game profile and code signatures, and logs individual rejection reasons.

The addon is executable native code. Secure DataCtrlLink loads it only when its exact filename and SHA-256 match the registry compiled into that loader release.

No WWE archives, Oodle libraries, extracted assets, captured data, or personal paths are included.

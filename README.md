# Aurora Forge NT100

Free WWE 2K19-2K26 modding workspace. Made in Canada. Built for Modders.

## Download

All compiled builds, hashes, and downloadable source archives are on the website:

**https://auroraforge.live/beta4.html**

- Windows x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1-Windows-x64.zip
- Linux x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1-Linux-x64.tar.gz
- Source downloads: https://auroraforge.live/source.html
- SHA-256: https://auroraforge.live/downloads/SHA256SUMS.txt

This GitHub repository is the public source mirror. Release binaries and packaged source archives are hosted on the website, not in this repository.

## What is Aurora Forge NT100?

A free desktop workspace for WWE PC modding. It brings CAK tools, 2K19 PAC tools, texture conversion, mod loaders, animation conversion, Entry Studio, Audio Studio, projects, and prompt builders into one app.

- Animation conversion: WWE 2K19 into 2K20, 2K22, 2K23, 2K24, 2K25, or 2K26, plus cross-generation combinations.
- CAK and archive tools: WWE 2K20 through 2K26, with 2K19 PAC support.
- Loaders: Secure DataCtrlLink for WWE 2K25 and 2K26, plus Aurora CAK Mod Loader builds.
- Textures: DDS and PNG conversion with original-format, size, and mipmap matching.
- Tools are compatible with Tribute BakeMe folders.
- Plugin coverage and support for PWM/Tribute plugins is in progress.
- Tutorials are in progress; the app is designed to be easy to use.

## Free release and support

Aurora Forge NT100 2.1 Beta 4 is 100% free. There is no Patreon requirement, Discord role check, access gate, or in-app verifier.

Optional Patreon support funds the reverse engineering, tooling, and testing that keeps development moving:
https://www.patreon.com/c/dgranletmwo

Major releases are free. Patch updates and fixes after a major release are Patreon-only until the next major release.

## Build

See `BUILD-CURRENT.md`, `umbrella-app/BUILDING.md`, and the individual source folders. Native helper binaries such as the CAK and PAC helpers are built from source; prebuilt helper binaries are distributed with the website build, not stored in this repository.

## Source layout

- `umbrella-app/` - main Electron app, pages, services, assets, and build scripts
- `cak-foundry/` - CAK Foundry source and archive tooling
- `animation/` - animation readers, writers, converters, validators, and workflow sources
- `loaders/` - Secure DataCtrlLink and CAK Mod Loader source
- `100-not-tribute/` - Entry Studio, DDS, PAC, music, and legacy tool sources
- `scripts/`, `examples/`, `tutorials/`, `research/` - supporting source and examples

Private research notes, game data, prebuilt binaries, the private verifier, and website source are intentionally excluded.

## License

MIT. See `LICENSE`. Third-party licenses and notices are included with the relevant source folders.

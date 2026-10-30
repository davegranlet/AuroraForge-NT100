# Aurora Forge NT100 2.1.3

Maintenance release for the 2.1.a / Beta 4 line.

## What changed

- **Animation tooling:** added and revised 2K26 victory/entrance tooling, ADefs file and payload helpers, pair-asset builders, source body and camera clip builders, facial layout and dictionary readers, FOP19 readers/models, SDB 2K26 index handling, victory registration and fidelity checks, YAMM19 reading, and additional PE/Ghidra analysis utilities. Updated clips layout, conversion, cutscene F7, skeleton refresh, and SDB tools.
- **Tool source:** added WWE 2K19 PAC Tools, Custom Music Loader for 2K25 and 2K26, DDS Converter, and the Entry Studio public/server split.
- **Loaders:** added Secure DataCtrlLink 2K25, the Aurora CAK Mod Loader and its 2K25 variant, and additional Secure DataCtrlLink 2K26 tests and scripts.
- **Licensing:** CAK Foundry is now GPL-3.0-or-later, matching the main application.
- **Protection:** the BakeMe validator rejects protected HideCtrlData entitlement payloads.
- **Source downloads:** public source archives are regenerated for 2.1.3. Game data, binaries, private research, generated decompilation output, and website source remain excluded.

The 2K26 victory framing issue remains an open research item. This release does not claim it is fixed. Test replacement output in game and keep a rollback before treating a candidate as proven.

## Downloads

All public downloads are hosted on the website:

- Release page: https://auroraforge.live/#downloads
- Windows x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1.3-Windows-x64-Setup.exe
- Linux x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1.3-Linux-x64.tar.gz
- Source ZIPs: https://auroraforge.live/source.html

SHA-256 hashes are published alongside the website downloads.

## Notes

- No sign-in, Patreon gate, Discord role check, or in-app verifier.
- Windows binaries are not code-signed; SmartScreen may warn on first run.
- This GitHub Release carries the Windows updater files only: installer, `.blockmap`, and `latest.yml`. The website hosts the public Windows installer, Linux archive, source ZIPs, and checksums.
- Aurora Forge source is GPL-3.0-or-later. Third-party components keep their own licenses.

Optional support: https://www.patreon.com/c/dgranletmwo

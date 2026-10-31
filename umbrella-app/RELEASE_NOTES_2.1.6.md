# Aurora Forge NT100 2.1.6

Patch release for the 2.1.a / Beta 4 line.

## Fixes

- **Animation Converter foundry EPERM fixed:** the converter now creates a fresh unique `foundry-*` shim directory for each build instead of deleting and recreating `animation-converter\foundry`. This avoids the Windows `EPERM: lstat` failure caused by the old shim's junction.
- **Menu encoding retained:** the 2.1.5 UTF-8 navigation icon and punctuation repair remains in this build.
- **Installed-app startup retained:** the packaged universe profile module fix from 2.1.4 remains in place.
- **Installer retained:** the Windows installer packages the refreshed runtime staging tree and writes GitHub updater metadata.
- **Source archives retained:** public source ZIPs are regenerated for 2.1.6.

## Downloads

All public downloads are hosted on the website:

- Release page: https://auroraforge.live/#downloads
- Windows x64: https://auroraforge.live/downloads/AuroraForge-NT100-Setup-2.1.6-x64.exe
- Linux x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1.6-Linux-x64.tar.gz
- Source ZIPs: https://auroraforge.live/source.html

The GitHub Release carries the Windows updater files: installer, `.blockmap`, and `latest.yml`. The auto-updater remains on GitHub Releases.

## Notes

- Windows binaries are not code-signed; SmartScreen may warn on first run.
- No sign-in, Patreon gate, Discord role check, or in-app verifier.
- Aurora Forge source is GPL-3.0-or-later. Third-party components keep their own licenses.

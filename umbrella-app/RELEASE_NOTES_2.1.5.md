# Aurora Forge NT100 2.1.5

Patch release for the 2.1.a / Beta 4 line.

## Fixes

- **Menu and page encoding repaired:** restored the UTF-8 navigation icons, arrows, punctuation, and separators in the app pages. The 2.1.4 build had these characters re-encoded as Windows text, which showed up as broken sidebar symbols.
- **Installed-app startup retained:** the packaged universe profile module fix from 2.1.4 remains in place.
- **Installer retained:** the Windows installer still packages the refreshed runtime staging tree and writes GitHub updater metadata.
- **Source archives retained:** public source ZIPs are regenerated for 2.1.5.

## Downloads

All public downloads are hosted on the website:

- Release page: https://auroraforge.live/#downloads
- Windows x64: https://auroraforge.live/downloads/AuroraForge-NT100-Setup-2.1.5-x64.exe
- Linux x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1.5-Linux-x64.tar.gz
- Source ZIPs: https://auroraforge.live/source.html

The GitHub Release carries the Windows updater files: installer, `.blockmap`, and `latest.yml`. The auto-updater remains on GitHub Releases.

## Notes

- Windows binaries are not code-signed; SmartScreen may warn on first run.
- No sign-in, Patreon gate, Discord role check, or in-app verifier.
- Aurora Forge source is GPL-3.0-or-later. Third-party components keep their own licenses.

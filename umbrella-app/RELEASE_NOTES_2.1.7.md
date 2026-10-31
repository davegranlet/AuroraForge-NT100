# Aurora Forge NT100 2.1.7

Patch release for the 2.1.a / Beta 4 line.

## Fixes

- **Oodle bake fallback:** if the Oodle compression helper fails for an individual payload, the CAK repackager now stores that payload without compression and continues. The build reports a warning instead of failing the entire library conversion. This unblocks the conversion that stopped at `Animation/Victory/17212.clips`.
- **Foundry EPERM fix retained:** each converter build uses a fresh unique `foundry-*` shim directory.
- **Menu encoding fix retained:** navigation icons, arrows, and punctuation remain repaired.
- **Installed-app startup fix retained:** the packaged universe profile module fix remains.
- **Installer and updater retained:** the Windows installer packages the refreshed runtime staging tree and writes GitHub updater metadata.
- **Install guide:** the illustrated guide now points at 2.1.7.

## Downloads

All public downloads are hosted on the website:

- Release page: https://auroraforge.live/#downloads
- Windows x64: https://auroraforge.live/downloads/AuroraForge-NT100-Setup-2.1.7-x64.exe
- Linux x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1.7-Linux-x64.tar.gz
- Source ZIPs: https://auroraforge.live/source.html
- Install guide: https://auroraforge.live/install.html

The GitHub Release carries the Windows updater files: installer, `.blockmap`, and `latest.yml`. The auto-updater remains on GitHub Releases.

## Notes

- Stored (uncompressed) payloads are larger but valid for the affected 2K26-style CAK path.
- Windows binaries are not code-signed; SmartScreen may warn on first run.
- No sign-in, Patreon gate, Discord role check, or in-app verifier.
- Aurora Forge source is GPL-3.0-or-later. Third-party components keep their own licenses.

# Aurora Forge NT100 2.1.2

Patch release for the 2.1.a / Beta 4 line.

## Fixes

- **Animation Converter packaged-app crash:** the bundled 2K26 skeleton is stored inside `app.asar`, but the converter's spawned Node process cannot read asar paths. The converter now materializes the skeleton into the writable user-data folder before running the skeleton refresh. This fixes:
  `2K26 skeleton refresh failed: ENOENT: app\skeletons\14000-base\BakeMe not found in ...\resources\app.asar`.

## Updates

- Packaging switched from `electron-packager` portable ZIPs to **electron-builder**:
  - Windows: NSIS installer (`AuroraForge-NT100-2.1.2-Windows-x64-Setup.exe`)
  - Linux: AppImage (`AuroraForge-NT100-2.1.2-Linux-x64.AppImage`)
- Added **electron-updater** with GitHub Releases as the update source.
  - Checks for updates shortly after launch.
  - Downloads only after user confirmation.
  - Installs on restart.
  - Manual check: **Help → Check for Updates...**
- Existing portable ZIP build scripts remain available as a fallback, but the installer/AppImage are the recommended update path.

## Source users

A focused source patch is included at:

`umbrella-app/patches/animation-converter-asar-skeleton-fix.patch`

It applies to the 2.1.a source tree and contains the converter fix plus its regression check. The full auto-update switch is in the main source tree.

## Notes

- No game files, CAKs, or loader files are changed by this release.
- Windows binaries are not code-signed; SmartScreen may warn on first run.
- Linux AppImage updates use electron-updater's GitHub provider.

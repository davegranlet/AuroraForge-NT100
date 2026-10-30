# AuroraForge NT100 Windows installer

`npm run dist:win` builds the assisted Windows installer at
`dist/installer/AuroraForge-NT100-Setup-<version>-x64.exe`.

The installer:

- installs the self-contained AuroraForge NT100 Electron application;
- creates Start Menu and optional desktop shortcuts;
- detects the normal Steam installation and lets the user browse to any folder
  containing `WWE2K26_x64.exe`;
- installs the exact hash-locked Secure DataCtrlLink, CAK Mod Loader, and Custom
  Music Loader artifacts built from this repository;
- creates `mods` and `sound` only when absent;
- never changes `mods/manifest.json`, existing CAKs, sound packages, or
  `plugins/addons.txt`;
- refuses loader changes while WWE 2K26 is running;
- backs up and checksum-verifies every replaced loader file;
- restores the exact previous files during uninstall when the Aurora-installed
  files are still unchanged; user-modified files are preserved.

The main application includes Electron and its Node runtime. End users do not
need to install Node.js, npm, or the .NET SDK to run AuroraForge NT100. Operations
that depend on third-party creative programs or game-owned libraries still
require those programs/files and remain explicitly identified in the app.

## Build and verify

```powershell
Set-Location C:\nt100-codebasemain\umbrella-app
npm run prepare:runtime
npm run prepare:installer
npm run verify:installer
npm run dist:win
```

`verify:installer` uses a synthetic game folder under `build` and verifies the
bundle hashes, transactional installation, exact rollback, preservation of an
owner manifest, and preservation of a loader file modified after installation.

The Windows executable is currently unsigned. Windows SmartScreen may therefore
show an unknown-publisher warning until a code-signing certificate is configured.

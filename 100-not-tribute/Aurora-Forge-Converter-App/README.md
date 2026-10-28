# Aurora Forge Converter App

Standalone source for the Aurora Forge desktop converter app shell.

Version: `1.0.0a`

## What This App Does

The app provides the Windows desktop UI around the current 2K19 to 2K20 package-builder workflow.

It supports:

- Patreon tier verification before conversion tools unlock.
- Selecting a decoded 2K19 motion body.
- Selecting the matching 2K19 event `0FOP` file.
- Selecting known-good 2K20 reference `ACTS` and `EVD` files.
- Writing a 2K20 package folder under `Root\Animation\Victory`.
- Displaying package validation metrics after the build.

## Run Locally

```powershell
cd app
npm install
npm start
```

## Package

```powershell
cd app
npm run package
```

The packaged executable is produced under `app/dist`.

## Source Split

The converter/package-builder CLI source lives in:

[Aurora-Forge-2K19-to-2K20-Converter](https://github.com/davegranlet/Aurora-Forge-2K19-to-2K20-Converter)

This app repo keeps the Electron shell separate from the converter engine.

## Boundaries

No WWE game files, extracted assets, proprietary binaries, or local workspace paths are included.

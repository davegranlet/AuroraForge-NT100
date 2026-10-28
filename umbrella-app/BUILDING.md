**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate AuroraForge NT100, DataCtrlLink, their functionality, or the underlying development work.

# Building AuroraForge NT100

AuroraForge NT100 builds on Windows and Linux from the same source tree.

## Requirements

- Node.js 24 LTS or newer
- npm 11 or newer
- Git
- About 2 GB of free disk space for dependencies and both packaged apps

## Get the source

```text
git clone https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool.git
cd AuroraForge_WWE_PC-Game_Modding_Tool
```

## Install and verify

```text
npm ci
npm run verify
npm run verify:dds
npm run verify:cak
npm run verify:repack
npm run audit
```

All five commands should finish successfully before packaging a release.

## Build on Windows

```text
npm run build:portable
```

The completed portable ZIP is written beneath `dist/`. Extract it to any writable folder and run `AuroraForge NT100.exe`.

## Build natively on Linux

Run this command on a Linux x64 computer:

```text
npm run build:linux
```

The completed Linux archive is written beneath `dist/`. Extract it, allow the `aurora-forge` launcher to run, and start it from a terminal or desktop shortcut.

## Development run

```text
npx electron .
```

The CAK catalog browser and CAK baker are implemented in JavaScript and are available on Windows and Linux. Extracting compressed files from existing WWE 2K26 archives remains Windows-only because that operation uses the decompressor supplied with the user's Windows game installation.

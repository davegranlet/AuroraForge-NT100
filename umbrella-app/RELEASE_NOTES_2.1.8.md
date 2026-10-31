# Aurora Forge NT100 2.1.8

Patch release for the 2.1.a / Beta 4 line.

## Converter clarity and safety

- **Two dropdowns:** the Animation Converter now has explicit **From** and **To** selectors listing every supported game generation.
- **2K26 only:** only **WWE 2K19 &rarr; WWE 2K26** is enabled. Every other source/target combination is visible but marked **not implemented** and disabled.
- **No silent wrong target:** the converter service now rejects any pair other than 2K19 to 2K26, and rejects a target folder that is not WWE 2K26.
- **Misleading label fixed:** the old `2K25 library build failed` text was a stale hardcoded label; it now reports the actual requested game.
- **Oodle fallback retained:** failed per-file Oodle compression stores that payload uncompressed and continues with a warning.

## Messaging

- App About, FAQ, Tools, manifest, converter sidebar, website, and source page now state plainly that one-click conversion is **2K19 to 2K26 only**.
- Other version conversions are the next major task, not a hidden feature.

## Downloads

- Release page: https://auroraforge.live/#downloads
- Windows x64: https://auroraforge.live/downloads/AuroraForge-NT100-Setup-2.1.8-x64.exe
- Linux x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1.8-Linux-x64.tar.gz
- Source ZIPs: https://auroraforge.live/source.html
- Install guide: https://auroraforge.live/install.html

The GitHub Release carries the Windows updater files.

## Notes

- Windows binaries are not code-signed; SmartScreen may warn on first run.
- No sign-in, Patreon gate, Discord role check, or in-app verifier.
- Aurora Forge source is GPL-3.0-or-later. Third-party components keep their own licenses.

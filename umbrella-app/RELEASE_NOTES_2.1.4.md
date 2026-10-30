# Aurora Forge NT100 2.1.4

Patch release for the 2.1.a / Beta 4 line.

## Fixes

- **Packaged universe profile startup fixed:** the app now loads `universe-profile.js` from the staged `entry-studio/tools/aurora-formats` runtime path instead of a repository-relative path that does not exist in the installed app.
- **Installer runtime refreshed:** the installer now packages the current `build/runtime-staging` tree, including the entry-studio tool modules, instead of a stale staging copy.
- **Updater metadata restored:** the installer build writes `latest.yml` and `app-update.yml` with the GitHub provider so installed builds can check for updates.
- **Source verification unblocked:** removed a false dependency warning from the package verification script that prevented runtime staging from refreshing.
- **Fixture test:** the Tribute integration test now skips when its private corpus environment variable is absent instead of failing the normal test run.

## Added and updated

- Universe Profile editor page, preload bridge, IPC handlers, validation, merge preview, and save-as-copy support.
- New `animation/tools/aurora-formats` readers and inspectors for ADefs, DDS metadata, JSFB, MTLS, profile text, SDB, TCAW, TDB, and YCL.
- Decompilation function inspection, coverage, evidence-audit utilities, and Ghidra function export helper.
- Tribute corpus audits and Entry Studio roster actions.
- Blender smoke tooling and crosswalk fixture.
- Installer loader bundle preparation and transactional loader install/uninstall verification.

## Downloads

All public downloads are hosted on the website:

- Release page: https://auroraforge.live/#downloads
- Windows x64: https://auroraforge.live/downloads/AuroraForge-NT100-Setup-2.1.4-x64.exe
- Linux x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1.4-Linux-x64.tar.gz
- Source ZIPs: https://auroraforge.live/source.html

The GitHub Release carries the Windows updater files: installer, `.blockmap`, and `latest.yml`. The auto-updater remains on GitHub Releases.

## Notes

- 2.1.4 is a patch build for the Beta 4 line. Test replacement output in game and keep a rollback before treating a candidate as proven.
- The 2K26 victory framing issue remains an open research item.
- No sign-in, Patreon gate, Discord role check, or in-app verifier.
- Windows binaries are not code-signed; SmartScreen may warn on first run.
- Aurora Forge source is GPL-3.0-or-later. Third-party components keep their own licenses.

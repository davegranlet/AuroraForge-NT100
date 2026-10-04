AuroraForge NT100 2.0 Animation Converter

Preferred bundled portable converter:
  Aurora-Forge-2.0.k-Preview.exe

SHA-256:
  76D7D4ABFE6D44E5D3941AFDC86E2F64E62CB488A90AC84304B7095A685CE764

Rollback builds (kept on disk, NOT shipped in the package):
  ..\..\..\rollback\converters\Aurora-Forge-Beta3-Preview.exe
  ..\..\..\rollback\converters\Aurora-Forge-Beta2-Preview.exe
  ..\..\..\rollback\converters\Aurora-Forge-Beta1.0.0c-Preview.exe

Version scheme: major releases are plain (1.8.0, 2.0, ...); every fix/update gets
the next letter (2.0.b, 2.0.c, ...). See VERSION-HISTORY.md at the repo root.

Current verified scope:
- Reads decoded WWE 2K19 motion.
- Convert Library to New 2K25/2K26 entries: point it at a 2K19 victory folder
  and/or entrance folder and it turns every motion into its own new selectable
  entry (Victory + Entrance list, Cutscene picker row, SDB name), then bakes one
  loader-ready CAK. New ids are assigned after the highest existing id.
- Byte-preserving registration writers: existing Victory/Entrance/Cutscene rows
  and all original objects are kept exactly as shipped; only the new rows are
  appended. The anchor motion template is never shipped in the CAK.
- Bundled refreshed WWE 2K26 registration skeleton (no _work folder needed);
  the skeleton scan is cached per game-file timestamps.
- Bake targets route through the version registry: 2K26 = FDIR 9.9 (JS
  repackager), 2K25 = FDIR 9.3 (native).
- Per-release verification challenge (see app/config/release-challenge.json).
- Re-encodes selected motion groups into a .clips template.
- Builds and reopens a loader-ready CAK through Aurora CAK Foundry.
- Uses the verified boot-mount loader pair bundled separately with the umbrella app.

Input folders may hold one file per animation, or one subfolder per animation
(the largest file in each subfolder is used as the motion body).

Proof (2026 build): a 3-motion library (2 victory + 1 entrance) produced ids
16181-16183, kept all 719 Victory / 754 Entrance / 2353 Cutscene rows
byte-identical, and reopened as a payloadVerified CAK with 136 files.

Beta boundary:
- Library CAK output is ready for controlled testing.
- In-game picker visibility of new entries is under validation; entry mounts
  that shipped 2K25-shaped rebuilt tables crashed the 2K26 boot, which is why
  the current builders preserve the live tables byte-for-byte.
- Skeleton/root alignment (motion flying or folding) is the next beta.
- Facial conversion and general animation alignment are not release-complete.

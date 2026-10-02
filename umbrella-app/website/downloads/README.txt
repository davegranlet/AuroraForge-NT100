AuroraForge NT100 2.0.b - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.b-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.b-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)
  Aurora-Forge-2.0.b-Preview.exe             170 MB  converter only, Windows
  Aurora-Forge-2.0.b-Preview.tar.gz          243 MB  converter only, Linux

Upload these four files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

CLEANUP on the server: delete the previous 2.0.a-named files:
  AuroraForge-NT100-2.0.a-Windows-x64.zip
  AuroraForge-NT100-2.0.a-Linux-x64.tar.gz
  Aurora-Forge-2.0.a-Preview.exe
  Aurora-Forge-2.0.a-Preview.tar.gz
(If any 2.0-named files are still on the server, delete those too.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  89BC450A2BD473C708392F9BBE30A24257ADBB90A124B64B2C6ACE049D08C336  AuroraForge-NT100-2.0.b-Windows-x64.zip
  8D59B2B0AF457885C9BE2F50AB4753783BFD2B5E4950E1A263510897FF708AD5  AuroraForge-NT100-2.0.b-Linux-x64.tar.gz
  7D5DC5B9F1AF68F3F4E90857F1FE327D59A1ED813093AAF2D9CE02FC43070529  Aurora-Forge-2.0.b-Preview.exe
  E510FFEDDABD30F030D1A64CA6982E43EF9AE0B684FC30AA5B70926596EAC  Aurora-Forge-2.0.b-Preview.tar.gz

What changed in 2.0.b: the workspace sidebar is now consistent on every page,
Entry Studio runs inside the app (no local server / no browser), and the
converter wizard no longer uses anyone's local paths - you point it at your own
WWE 2K19 folder and your own WWE 2K25/2K26 folder, and the registration skeleton
is rebuilt from your own game files on your PC. See VERSION-HISTORY.md for the
full list.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a, 2.0.b, ...). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

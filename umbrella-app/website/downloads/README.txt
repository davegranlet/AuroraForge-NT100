AuroraForge NT100 2.0.c - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.c-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.c-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)

Upload these two files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

The standalone converter is retired: it ships inside the app only (launched from
Tools after access verification). Do not stage or upload converter-only builds.

CLEANUP on the server: delete the previous 2.0.b-named files and any converter
downloads still present:
  AuroraForge-NT100-2.0.b-Windows-x64.zip
  AuroraForge-NT100-2.0.b-Linux-x64.tar.gz
  Aurora-Forge-2.0.b-Preview.exe
  Aurora-Forge-2.0.b-Preview.tar.gz
(Plus any 2.0.a-named files still on the server.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  B5AB8697F348BC1063BB103B94BE41FC04091115F7113DC39E76C714D65778BA  AuroraForge-NT100-2.0.c-Windows-x64.zip
  50200C607EBFF7957D1A5DB8703C09417B013078F4D2825BCB5E6316B358B55C  AuroraForge-NT100-2.0.c-Linux-x64.tar.gz

What changed in 2.0.c: the About and FAQ pages were rewritten (what the project
is, why it exists, where it is going, and the story behind it), and the
standalone converter download is retired - the converter now ships inside the
app only. See VERSION-HISTORY.md for the full list.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a, 2.0.b, 2.0.c, ...). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

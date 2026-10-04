AuroraForge NT100 2.0.m - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.m-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.m-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)

Upload these two files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

2.0.m supersedes 2.0.l: use 2.0.m. If 2.0.l was already uploaded, delete it.

CLEANUP on the server: delete the previous 2.0.l-named files:
  AuroraForge-NT100-2.0.l-Windows-x64.zip
  AuroraForge-NT100-2.0.l-Linux-x64.tar.gz
(Plus any older 2.0/2.0.a-2.0.k files and converter downloads still present.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  C15F3CE2EB12F68710A487C260E77CB30287BDB9351AEBE1D00F1AD6C2DB6BFB  AuroraForge-NT100-2.0.m-Windows-x64.zip
  7B154E5D61F9560393D105937450F5A7AE671BE011D1191D10CDC759AE20FE10  AuroraForge-NT100-2.0.m-Linux-x64.tar.gz

What changed in 2.0.m: the Animation Converter now runs inside the main app -
choose your 2K19 folder and target game, convert the library, bake the CAK, no
separate download. See VERSION-HISTORY.md.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a ... 2.0.m). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.
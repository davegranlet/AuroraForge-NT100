AuroraForge NT100 2.0.d - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.d-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.d-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)

Upload these two files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

2.0.d supersedes 2.0.c: use 2.0.d. If 2.0.c was already uploaded, delete it.
The standalone converter stays retired - it ships inside the app only (launched
from Tools after access verification).

CLEANUP on the server: delete the previous 2.0.c-named files and any converter
downloads still present:
  AuroraForge-NT100-2.0.c-Windows-x64.zip
  AuroraForge-NT100-2.0.c-Linux-x64.tar.gz
  Aurora-Forge-2.0.b-Preview.exe
  Aurora-Forge-2.0.b-Preview.tar.gz
(Plus any 2.0.a/2.0.b-named files still on the server.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  66B1D79F27F1EEF961126D0B9DA88CC6871B21335352DF2D4A148E41D8C1E91D  AuroraForge-NT100-2.0.d-Windows-x64.zip
  C9EE10B7F39B1091B96E0B7FE4DBC6FC2FCEE061AE5A5776CD4AC2B49FFF00E3  AuroraForge-NT100-2.0.d-Linux-x64.tar.gz

What changed in 2.0.d: the converter is zero-config - it only asks for your own
WWE 2K19 and WWE 2K25/2K26 game folders and rebuilds the registration skeleton
from your own game files on your PC. The skeleton path and its "change folder"
button are gone from the interface. See VERSION-HISTORY.md for the full list.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a, 2.0.b, 2.0.c, 2.0.d, ...). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

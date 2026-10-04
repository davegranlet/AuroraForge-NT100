AuroraForge NT100 2.0.k - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.k-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.k-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)

Upload these two files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

2.0.k supersedes 2.0.e: use 2.0.k. If 2.0.e was already uploaded, delete it.

CLEANUP on the server: delete the previous 2.0.e-named files:
  AuroraForge-NT100-2.0.e-Windows-x64.zip
  AuroraForge-NT100-2.0.e-Linux-x64.tar.gz
(Plus any older 2.0/2.0.a-2.0.d files and converter downloads still present.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  E677B1A0B9B7E4D66326B00C76CA326FF0BBE2F0817A4801039DAFE1AB044AA1  AuroraForge-NT100-2.0.k-Windows-x64.zip
  931B7C03FABD68F09EFA3C6FC288D187A9414FDB2840207C91FA32830EBDF922  AuroraForge-NT100-2.0.k-Linux-x64.tar.gz

What changed in 2.0.k: custom music bakes into a fixed CustomMusic.cak that accumulates added and\nedited tracks across builds. See VERSION-HISTORY.md.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a ... 2.0.k). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

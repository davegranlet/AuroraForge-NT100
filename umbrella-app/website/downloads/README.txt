AuroraForge NT100 2.0.i - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.i-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.i-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)

Upload these two files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

2.0.i supersedes 2.0.e: use 2.0.i. If 2.0.e was already uploaded, delete it.

CLEANUP on the server: delete the previous 2.0.e-named files:
  AuroraForge-NT100-2.0.e-Windows-x64.zip
  AuroraForge-NT100-2.0.e-Linux-x64.tar.gz
(Plus any older 2.0/2.0.a-2.0.d files and converter downloads still present.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  2F0C0E0B93ED051086C99D9EFF09DE9B753B39AB51A5D71E8C5BDB53ECA32167  AuroraForge-NT100-2.0.i-Windows-x64.zip
  25AA7B01D487606DC3E171385EA6307DC18B2BB1C4F161422775B6E45747A76B  AuroraForge-NT100-2.0.i-Linux-x64.tar.gz

What changed in 2.0.i: custom music bakes into a fixed CustomMusic.cak that accumulates added and\nedited tracks across builds. See VERSION-HISTORY.md.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a ... 2.0.i). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

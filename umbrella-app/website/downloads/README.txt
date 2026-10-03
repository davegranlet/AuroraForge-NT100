AuroraForge NT100 2.0.g - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.g-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.g-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)

Upload these two files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

2.0.g supersedes 2.0.e: use 2.0.g. If 2.0.e was already uploaded, delete it.

CLEANUP on the server: delete the previous 2.0.e-named files:
  AuroraForge-NT100-2.0.e-Windows-x64.zip
  AuroraForge-NT100-2.0.e-Linux-x64.tar.gz
(Plus any older 2.0/2.0.a-2.0.d files and converter downloads still present.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  7FEBCFC45C47694B0BCDDCDCC2FD245CFADE9427956DCA220F1B653D3BF3C211  AuroraForge-NT100-2.0.g-Windows-x64.zip
  F1634BECE1C4AEAB65966D3A47BB13B43271F6CBA7C141C13B66906124ED678C  AuroraForge-NT100-2.0.g-Linux-x64.tar.gz

What changed in 2.0.g: custom music bakes into a fixed CustomMusic.cak that accumulates added and\nedited tracks across builds. See VERSION-HISTORY.md.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a ... 2.0.g). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

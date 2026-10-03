AuroraForge NT100 2.0.h - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.h-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.h-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)

Upload these two files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

2.0.h supersedes 2.0.e: use 2.0.h. If 2.0.e was already uploaded, delete it.

CLEANUP on the server: delete the previous 2.0.e-named files:
  AuroraForge-NT100-2.0.e-Windows-x64.zip
  AuroraForge-NT100-2.0.e-Linux-x64.tar.gz
(Plus any older 2.0/2.0.a-2.0.d files and converter downloads still present.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  C7E4161E3595B4986B746666B0DEE2F8EC14BF35E00CED5C2890DD74D51B07D9  AuroraForge-NT100-2.0.h-Windows-x64.zip
  B4B93E7DDF8E9EB9A00C7B604ED4B03117E9CE53B76E24BC7F0091FD69E0CDED  AuroraForge-NT100-2.0.h-Linux-x64.tar.gz

What changed in 2.0.h: custom music bakes into a fixed CustomMusic.cak that accumulates added and\nedited tracks across builds. See VERSION-HISTORY.md.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a ... 2.0.h). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

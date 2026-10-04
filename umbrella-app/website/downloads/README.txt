AuroraForge NT100 2.0.j - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.j-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.j-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)

Upload these two files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

2.0.j supersedes 2.0.e: use 2.0.j. If 2.0.e was already uploaded, delete it.

CLEANUP on the server: delete the previous 2.0.e-named files:
  AuroraForge-NT100-2.0.e-Windows-x64.zip
  AuroraForge-NT100-2.0.e-Linux-x64.tar.gz
(Plus any older 2.0/2.0.a-2.0.d files and converter downloads still present.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  C8898C28161DB112A7EBEB7A10050A9D3CFFE91C20CD1417E01CC3000BA8E8BE  AuroraForge-NT100-2.0.j-Windows-x64.zip
  FCD481FE4430BF3B41CC46267B186F0D8CD8A72CF5BC079A3F3E4419C0E1DFCC  AuroraForge-NT100-2.0.j-Linux-x64.tar.gz

What changed in 2.0.j: custom music bakes into a fixed CustomMusic.cak that accumulates added and\nedited tracks across builds. See VERSION-HISTORY.md.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a ... 2.0.j). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

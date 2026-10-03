AuroraForge NT100 2.0.e - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0.e-Windows-x64.zip    507 MB  main app, Windows x64
  AuroraForge-NT100-2.0.e-Linux-x64.tar.gz   486 MB  main app, Linux x64 (GPU-less OK)

Upload these two files to cPanel public_html/downloads/ (keep the same names -
the site links must point at these URLs), then upload SHA256SUMS.txt alongside.

2.0.e supersedes 2.0.d: use 2.0.e. If 2.0.d was already uploaded, delete it.

CLEANUP on the server: delete the previous 2.0.d-named files:
  AuroraForge-NT100-2.0.d-Windows-x64.zip
  AuroraForge-NT100-2.0.d-Linux-x64.tar.gz
(Plus any older 2.0/2.0.a/2.0.b/2.0.c files and converter downloads still present.)

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  7BE2F6528538F288C511127938E24DF26FD1D5DF3131D5D27790A482E942B310  AuroraForge-NT100-2.0.e-Windows-x64.zip
  E7829BC165C0B6DF1E6C3E94635084E270B64B607F1E8D6789C730B31EA1E341  AuroraForge-NT100-2.0.e-Linux-x64.tar.gz

What changed in 2.0.e: Audio Studio - add and edit custom music. Import MP3/WAV
audio, assign it to a custom slot, edit the title and star shown in the game
picker, and build the custom music package, the MusicList CAK, and the mods
manifest for the verified loader. See VERSION-HISTORY.md for the full list.

Version scheme: majors are plain (2.0, 2.1, ...); every fix/update gets the next
letter (2.0.a ... 2.0.e). Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

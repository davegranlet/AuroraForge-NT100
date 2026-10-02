AuroraForge NT100 2.0 - downloads folder

Live once uploaded at https://auroraforge.live/downloads/<name>:

  AuroraForge-NT100-2.0-Windows-x64.zip     448 MB  main app, Windows x64
  AuroraForge-NT100-2.0-Linux-x64.tar.gz    428 MB  main app, Linux x64 (GPU-less OK)
  Aurora-Forge-2.0-Preview.exe              198 MB  converter only, Windows
  Aurora-Forge-2.0-Preview.tar.gz           289 MB  converter only, Linux

Upload these four files to cPanel public_html/downloads/ (keep the same names -
the site's download buttons point at these URLs), then upload SHA256SUMS.txt
alongside them.

CLEANUP on the server: delete the previous Beta 3-named files:
  AuroraForge-NT100-Beta3-Windows-x64.zip
  AuroraForge-NT100-Beta3-Linux-x64.tar.gz
  Aurora-Forge-Beta3-Preview.exe
  Aurora-Forge-Beta3-Preview.tar.gz

Verify the uploads against these hashes (also in SHA256SUMS.txt):

  48BEB714968F365DFE124E0420C0616E0FB246D9C8E0C9B36040B4B9E9463D56  AuroraForge-NT100-2.0-Windows-x64.zip
  A8E2C9870688ED74C7C2ACAC90475731ECBCBA17ADFD26CC2BF52C109BEAC354  AuroraForge-NT100-2.0-Linux-x64.tar.gz
  E2CC5A3F0B5FBCCC614C487E179C3D7D798968578FA5886B8941E7F9A37B1FC1  Aurora-Forge-2.0-Preview.exe
  318B4187359B3FE2CB2150F2AB0C6D073A41BB25CAB1E80F8FB8A212EC30C3AA  Aurora-Forge-2.0-Preview.tar.gz

Version scheme (locked): major releases are plain (1.8.0, 2.0, ...); every
fix/update gets the next letter (2.0.a, 2.0.b, ...). Each download filename
carries its version, and VERSION-HISTORY.md in the repo maps every version to
that build's changes. Old builds are kept under rollback/ and are never shipped.

Protection: every build verifies access in-app before tools unlock - active
Patreon tier plus a linked Discord VIP role (two-tier check through the hardened
hosted verifier, rev 2026-10-01-secure3). Each release embeds a fresh random
verification challenge; the verifier binds it through the whole sign-in flow.
Free subscription links: https://www.patreon.com/dgranletmwo/redeem/0C242

The GitHub release at https://github.com/davegranlet/AuroraForge-NT100/releases
is the public mirror with the same published SHA-256 hashes.

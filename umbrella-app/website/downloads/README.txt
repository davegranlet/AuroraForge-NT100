AuroraForge NT100 2.1.3 (Beta 4) - downloads folder

Upload the website contents to cPanel public_html. All links are relative:

  downloads/AuroraForge-NT100-2.1.3-Windows-x64-Setup.exe    287 MB  Windows x64 installer
  downloads/AuroraForge-NT100-2.1.3-Linux-x64.tar.gz         339 MB  Linux x64 (GPU-less OK)

Source downloads:

  downloads/source/README.md                            source index + descriptions
  downloads/source/SHA256SUMS.txt                       source hashes
  downloads/source/core/                                main app source
  downloads/source/tools/                               CAK Foundry, Entry Studio, Audio Studio,
                                                        PAC19, CAK20, DDS, Character Viewer,
                                                        Mod Suite, Animation Converter,
                                                        Animation Toolchain
  downloads/source/loaders/                             Secure DataCtrlLink 2K25/2K26,
                                                        CAK Mod Loader, CAK Mod Loader 2K25
  downloads/source/other/                               one-off scripts and single-function tools
  downloads/source/all/                                 complete public source bundle

No website source is included in any source archive.

2.1.3 supersedes 2.1 and 2.1.a. Delete older app files from the server when uploading.

Verify the app uploads against these hashes (also in SHA256SUMS.txt):

  1AF933FC24924B8725D960941C48484BD643AEC6FC0D5B3026331E097DA4F1AE  AuroraForge-NT100-2.1.3-Windows-x64-Setup.exe
  9A95CC11FEF2F85717A961C7057A8EE90BF3FB72C4DC27C378DD5E368ED0429B  AuroraForge-NT100-2.1.3-Linux-x64.tar.gz

What changed in 2.1.3:
- Updated animation tooling, ADefs helpers, pair-asset builders, FOP19 readers,
  SDB 2K26 index handling, victory registration checks, and PE/Ghidra analysis tools.
- Added PAC Tools, Custom Music Loaders for 2K25 and 2K26, DDS Converter, and the
  Entry Studio public/server split.
- Added Secure DataCtrlLink 2K25 and the Aurora CAK Mod Loaders.
- CAK Foundry is now GPL-3.0-or-later; the BakeMe validator rejects protected
  HideCtrlData entitlement payloads.
- Windows installer and Linux x64 archive rebuilt for 2.1.3.

Source stays on GitHub. The Windows auto-updater uses GitHub Releases. Public app
and source downloads are hosted on auroraforge.live.

Made in Canada. Built for Modders.

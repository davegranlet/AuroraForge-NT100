AuroraForge NT100 2.1.6 (Beta 4) - downloads folder

Upload the website contents to cPanel public_html. All links are relative:

  downloads/AuroraForge-NT100-Setup-2.1.6-x64.exe    287 MB  Windows x64 installer
  downloads/AuroraForge-NT100-2.1.6-Linux-x64.tar.gz 339 MB  Linux x64 (GPU-less OK)

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

2.1.6 supersedes 2.1, 2.1.a, and 2.1.3. Delete older app files from the server when uploading.

Verify the app uploads against these hashes (also in SHA256SUMS.txt):

  68474302EB099AB56F69C90E3DB7E9CE378D7822410C2C8768FAD12CE3FF92AE  AuroraForge-NT100-Setup-2.1.6-x64.exe
  544C6C22EFE4CB58E415D77FF8C7C9D0935BA7B0E188E2DFCC3969314F3471CD  AuroraForge-NT100-2.1.6-Linux-x64.tar.gz

What changed in 2.1.6:
- Fixed the installed app failing to load the universe profile module from the
  packaged runtime.
- The installer now packages the refreshed runtime staging tree, including the
  entry-studio tools, and writes GitHub updater metadata.
- Added the Universe Profile editor, format inspectors, decompilation inspection
  utilities, Tribute audits, Entry Studio roster actions, and Blender smoke tools.
- Added transactional loader installation with checksum verification, rollback,
  and owner-file preservation in the Windows installer.
- Windows installer and Linux x64 archive rebuilt for 2.1.6.

Source stays on GitHub. The Windows auto-updater uses GitHub Releases. Public app
and source downloads are hosted on auroraforge.live.

Made in Canada. Built for Modders.

AuroraForge NT100 2.1.a (Beta 4) - downloads folder

Upload the website contents to cPanel public_html. All links are relative:

  downloads/AuroraForge-NT100-2.1.a-Windows-x64.zip      367 MB  main app, Windows x64
  downloads/AuroraForge-NT100-2.1.a-Linux-x64.tar.gz     344 MB  main app, Linux x64 (GPU-less OK)

Source downloads:

  downloads/source/README.md                            source index + descriptions
  downloads/source/SHA256SUMS.txt                       source hashes
  downloads/source/core/                                 main app source
  downloads/source/tools/                                CAK Foundry, Entry Studio, Audio Studio,
                                                         PAC19, CAK20, DDS, Character Viewer,
                                                         Mod Suite, Animation Converter,
                                                         Animation Toolchain
  downloads/source/loaders/                              Secure DataCtrlLink 2K25/2K26,
                                                         CAK Mod Loader, CAK Mod Loader 2K25
  downloads/source/other/                                one-off scripts and single-function tools
  downloads/source/all/                                  complete public source bundle

No website source is included in any source archive.

2.1.a supersedes 2.0.m. If 2.0 or 2.0.a-2.0.n files are still on the server, delete them.

Verify the app uploads against these hashes (also in SHA256SUMS.txt):

  A46A0AC28EB6E45FB18303EE5C095F917747B449A4DB22326901E0FC11EB9A69  AuroraForge-NT100-2.1.a-Windows-x64.zip
  672C4B9E88E919E0ECF08052227F5A59D386B24B3DB0DBCD575F173C5CBC4F98  AuroraForge-NT100-2.1.a-Linux-x64.tar.gz

What changed in 2.1.a / Beta 4:
- First free release: no Patreon requirement, Discord role check, access gate, OAuth
  callback, release challenge, or in-app verifier. Optional Patreon support is available at
  https://www.patreon.com/c/dgranletmwo. Major releases are free; patch updates and fixes
  after a major release are Patreon-only until the next major release.
- Rebuilt on the 2.0 workspace shell with the complete current tool set.
- Public source archives for the main app, each major tool, each loader, and the one-offs.
- Windows short-path fix: the tool library ships once at resources/sl with short directory
  names, so extract/copy no longer hits the Windows path limit.
- The retired standalone converter preview is excluded because it contains its own gate.

Version scheme: 2.1.a, then 2.1.a.a, 2.1.a.b, ... for updates.
Made in Canada. Built for Modders.

# Aurora Forge 2.1 - Beta 4

## First Free Release

This build removes the verification system entirely.

### Access

- No Patreon requirement, Discord role check, or in-app verifier.
- Optional Patreon support at https://www.patreon.com/c/dgranletmwo funds development. Major releases are free; patch updates and fixes after a major release are Patreon-only until the next major release.
- No OAuth callback listener, release challenge, or owner-build bypass.
- The app opens directly to Forge Home.

### Included

- **License:** Aurora Forge source is now GPL-3.0-or-later. Third-party components keep their own licenses.
- Rebuilt on the proven 2.0 workspace shell (Forge Home, full sidebar, Crystal design).
- Complete current tool set: in-app Animation Converter + staged converter Foundry, Entry Studio, Audio Studio, CAK Foundry and FDIR 9.3 backend, 2K19 PAC tools, DDS/texconv, Mod Suite, Projects, Prompt Builders, tutorials/handbook, and the full source/tool library (1,212 tools).
- Latest animation toolchain: pair-table from-source builder, from-scratch cutscene assembly builder, 2K26 SDB cipher/append, and ADefs typed parser/export.
- Windows short-path fix: the tool library ships once at `resources/sl`; the longest packaged path is about 196 characters, so extract/copy no longer hits the Windows path limit.
- Windows x64 and Linux x64 builds.

### Not shipped

The retired standalone converter preview is excluded because it contains its own Patreon gate. Use the in-app Animation Converter.

Aurora Forge is independent modding software and is not affiliated with or endorsed by WWE, 2K, Visual Concepts, or related rights holders.

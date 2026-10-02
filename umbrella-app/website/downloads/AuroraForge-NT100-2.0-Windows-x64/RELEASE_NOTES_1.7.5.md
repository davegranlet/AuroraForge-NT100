**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge v1.7.5 release notes

## What is new

- Publicly named the integrated and standalone WWE 2K26 archive tool **Aurora CAK Foundry**.
- Expanded the WWE 2K26 Modding Hub, keeping working operations separate from Coming Soon editor concepts.
- Added the Secure DataCtrlLink Workshop with fail-closed executable/DLL checksum checks, verified install staging, backup journaling, rollback, bounded log diagnostics, and redacted diagnostic reports.
- Added experimental manifest-based enable/disable and load ordering for direct-child mod CAKs and `Custom*.pck` packages. This requires a compatible manifest-aware Secure DataCtrlLink build.
- Added experimental, read-only CAK collision reporting. It distinguishes confirmed virtual-path collisions from unresolved hash overlaps and labels the last-mounted-wins result as an inference requiring in-game confirmation.
- Added the WWE 2K19 PAC Explorer and Rebuilder for supported HSPC/SHDC replacement workflows, with separate-output safety rules.
- Added the WWE 2K20 CAK Workbench for decoded catalog browsing and verified extraction. Rebuilding, HKT payloads, and unknown first-word formats remain unavailable.
- Added WWE 2K22 evidence and repeatable analysis scripts. General 2K22 extraction remains Research, not Ready.
- Added a dedicated in-app tutorial for rigging a completely new character model to a WWE 2K26 reference skeleton.
- Expanded evidence tracking, setup detection, journal/status language, and verification coverage.

## Aurora CAK Foundry

Aurora CAK Foundry opens one WWE 2K26 CAK or attempts every CAK in the configured game folder, reports any safely rejected archive, extracts from accepted archives to a separate folder, builds a new protected FDIR v9 CAK from a selected `BakeMe` folder, and reopens the output to recover every stored payload byte-for-byte.

It never edits an original game CAK. Final mount priority, collisions, and visible results still require an in-game test.

## Supported game evidence

- **WWE 2K26:** primary verified CAK workflow. Oodle extraction requires the user’s own Windows game installation. Secure DataCtrlLink setup supports only the exact reviewed metadata profile and fails closed on other hashes.
- **WWE 2K20:** decoded catalog browsing and verified extraction; rebuilding unavailable.
- **WWE 2K19:** supported PAC reading/extraction and limited HSPC/SHDC replacement.
- **WWE 2K22:** research evidence only; general extraction is not Ready.

## Known limitations

- Secure DataCtrlLink compatibility is not universal across WWE 2K26 releases in v1.7.5.
- Manifest ordering requires a compatible manifest-aware loader.
- Collision “expected winner” is an inference until confirmed in game.
- Aurora CAK Foundry writes stored protected payloads but does not Oodle-compress new archives.
- New texture hashes require a suitable populated `_textures.tdb`.
- WWE 2K20 rebuilding, general WWE 2K22 extraction, and most Tribute-style binary editors remain Experimental, Research, or Coming Soon.

No WWE executables, CAKs, Oodle DLLs, extracted assets, captured data, decompiler databases, rollback copies, or research dumps are included.

The canonical provenance statement is [FAQ.md](FAQ.md).

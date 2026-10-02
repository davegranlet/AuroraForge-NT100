**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.5 public posts

Copy-ready drafts. Only the GitHub release is authorized for automatic publication.

## Patreon

**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

### Aurora CAK Foundry v1.7.5 — standalone WWE 2K26 CAK extractor and baker

Aurora CAK Foundry v1.7.5 is ready. This is the standalone version of Aurora Forge’s WWE 2K26 `.cak` browser, extractor, rebuilder, baker, and verifier. You do not need the full Aurora Forge application to run it.

The first standalone release proved the basic workflow: browse game archives, extract stored and compressed files, preserve unresolved hash entries, and build an early CAK from a `BakeMe` folder.

The current release goes much further. The baker now derives the correct filename-dependent FDIR v9.9 key, writes protected payloads and game-style catalog metadata, handles `_textures.tdb`, and reopens the finished CAK to recover and compare every stored payload byte-for-byte. If one archive is malformed, the Foundry reports it clearly while continuing with archives that pass the safety checks.

Testing covered all 15 CAKs from both the original WWE 2K26 release and v1.14—including the substantially different `bakedfile100.cak` in each version. Real stored and Oodle-compressed extraction passed on both tested installations.

The tool never edits an original game CAK. Extract elsewhere, build a separate mod archive, verify it, and test the new archive in game. The user’s own WWE 2K26 installation supplies Oodle; no WWE files or Oodle DLL are included.

Download and complete notes:
https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool/releases/tag/v1.7.5

SHA-256:
`9616EFF638E195763CE6260DA5416F6902BC58684C7F3A0D789381F2B65F3748`

Support development:
https://www.patreon.com/c/dgranletmwo/shop

Aurora CAK Foundry is an independent community project and is not affiliated with or endorsed by WWE, 2K, or Visual Concepts.

## Reddit

### Title

Aurora CAK Foundry v1.7.5 — standalone WWE 2K26 CAK extraction and game-ready rebuilding

### Body

**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

**TL;DR:** Aurora CAK Foundry is the newly named, substantially upgraded standalone version of Aurora Forge’s WWE 2K26 CAK extractor/rebuilder. It opens and extracts the game’s CAKs, creates a separate protected FDIR v9.9 mod CAK from a `BakeMe` folder, and recovers every stored payload for byte-for-byte verification.

The first standalone release was called **Aurora Forge CAK Extractor/Repackager 1.7 Major RC1**. It established the basic read-only browser, stored and Oodle-compressed extraction, unresolved-hash export, multi-archive browsing, and an early CAK baker.

The v1.7.5 Foundry keeps that foundation and improves the part that matters most: the archive it produces.

- The final filename now determines the correct FDIR v9.9 archive key. Do not rename the CAK afterward; rebuild it with the new name.
- Payloads are protected using the derived per-file keys.
- Catalog strings, hash tables, checksums, file-family identifiers, and root metadata follow the verified WWE 2K26 layout.
- A supplied `_textures.tdb` is preserved. For replacement-only texture workflows, the Foundry can add a safe empty version-6 database; entirely new texture hashes still need a suitable populated database.
- The completed CAK is reopened and every protected stored payload is recovered and compared byte-for-byte with the input.
- Archives that fail structural checks are identified without hiding the archives that opened safely.

Verification covered all 15 CAKs from both the original WWE 2K26 release and v1.14: 386,294 and 408,094 catalog entries respectively. Both versions of `bakedfile100.cak` opened, and real extraction from stored and Oodle-compressed archives passed on both tested installations.

The Foundry never modifies an original CAK. It writes a separate archive and does not include WWE game files, Oodle, or extracted assets. Structural verification is not a substitute for the final in-game test.

Download and release notes:
https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool/releases/tag/v1.7.5

Project:
https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool

SHA-256: `9616EFF638E195763CE6260DA5416F6902BC58684C7F3A0D789381F2B65F3748`

Support:
https://www.patreon.com/c/dgranletmwo/shop

Independent community project; not affiliated with or endorsed by WWE, 2K, or Visual Concepts.

## Discord

### Message 1 of 3

**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

**Aurora CAK Foundry v1.7.5 is ready.**

**TL;DR:** This is the newly named and substantially upgraded standalone Aurora Forge tool for browsing, extracting, rebuilding, baking, and verifying WWE 2K26 `.cak` archives. The full Aurora Forge app is not required.

The first standalone release provided read-only browsing, stored/Oodle extraction, unresolved-hash export, multi-archive browsing, and an early `BakeMe` → CAK workflow.

### Message 2 of 3

**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

**What is different now?**

The v1.7.5 baker derives the correct filename-dependent FDIR v9.9 key, protects each payload, writes verified catalog metadata/checksums, handles `_textures.tdb`, and reopens the finished archive to recover and compare every stored payload byte-for-byte.

It also reports a rejected/malformed archive clearly while continuing with CAKs that pass the safety checks.

Testing opened all 15 CAKs in both the original WWE 2K26 release and v1.14—including both substantially different `bakedfile100.cak` archives. Real stored and compressed extraction passed on both tested versions.

### Message 3 of 3

**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

**Download:**
https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool/releases/tag/v1.7.5

**SHA-256:**
`9616EFF638E195763CE6260DA5416F6902BC58684C7F3A0D789381F2B65F3748`

The Foundry never edits original game CAKs. It contains no WWE files, Oodle DLL, or extracted assets. Build a separate mod archive, verify it, and perform the final test in game.

Support:
https://www.patreon.com/c/dgranletmwo/shop

Independent community project; not affiliated with or endorsed by WWE, 2K, or Visual Concepts.

## cs.rin.ru WWE thread

[b]Aurora CAK Foundry v1.7.5 — standalone WWE 2K26 CAK extractor, rebuilder, baker, and verifier[/b]

[b]Readability note:[/b] I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

[b]TL;DR[/b]

Aurora CAK Foundry is the standalone edition of Aurora Forge’s WWE 2K26 archive tool. It browses and extracts `.cak` archives, creates a separate protected FDIR v9.9 mod CAK from a selected `BakeMe` folder, and reopens the result to recover and compare every stored payload byte-for-byte. The complete Aurora Forge application is not required.

[b]Download[/b]

[url=https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool/releases/tag/v1.7.5]Aurora CAK Foundry v1.7.5 Windows x64[/url]

[b]SHA-256[/b]

[code]9616EFF638E195763CE6260DA5416F6902BC58684C7F3A0D789381F2B65F3748[/code]

[b]How this differs from the first release[/b]

The first standalone release was named [b]Aurora Forge CAK Extractor/Repackager 1.7 Major RC1[/b]. It established read-only catalog browsing, extraction of stored and Oodle-compressed files, unresolved-hash export, combined multi-archive browsing, and an early CAK baker.

Version 1.7.5 retains that foundation and substantially upgrades the archive-building implementation:

[list]
[*]Uses the clear public name [b]Aurora CAK Foundry[/b].
[*]Derives the FDIR v9.9 archive key from the final `.cak` filename.
[*]Protects stored payloads with derived per-file keys.
[*]Writes encoded strings, sorted path-hash tables, catalog checksums, verified file-family identifiers, and game-style root metadata.
[*]Preserves a supplied `_textures.tdb`, or adds a safe empty version-6 database for replacement-only texture work. New texture hashes still require a suitable populated database.
[*]Can retain smaller Oodle-compressed payloads when the user’s own game library is available and the compression round trip verifies.
[*]Reopens the result, recovers every protected stored payload, and compares it byte-for-byte with the build input.
[*]Reports an archive rejected by structural checks while continuing with accepted archives.
[*]Ships as a clean standalone Windows package with its own runtime, helper, license, compatibility metadata, and guide.
[/list]

[b]Verified archive coverage[/b]

[list]
[*]Original WWE 2K26 release: all 15 CAKs opened, totaling 386,294 catalog entries.
[*]WWE 2K26 v1.14: all 15 CAKs opened, totaling 408,094 catalog entries.
[*]Both substantially different `bakedfile100.cak` versions opened successfully.
[*]Real stored and Oodle-compressed extraction passed on both tested installations, including a `bakedfile100.cak` sample.
[*]A synthetic protected rebuild reopened and recovered every stored payload byte-for-byte.
[/list]

These are the game versions and archive layouts verified for this release. Unknown or malformed layouts fail safely. This is not a promise that an untested future patch is automatically compatible.

[b]Basic use[/b]

[list=1]
[*]Extract the complete ZIP to a normal writable folder.
[*]Run `Aurora CAK Foundry.exe`.
[*]Select your WWE 2K26 installation so compressed extraction can use the game’s own `oo2core_9_win64.dll`.
[*]Open one `.cak`, or choose [b]Open All Game CAKs[/b].
[*]Extract selected files—or all safely named files—to a separate folder.
[*]Edit files while preserving their required relative paths.
[*]Choose the prepared `BakeMe` folder and select [b]Build Game-Ready CAK[/b].
[*]Choose the final filename and run [b]Verify Every Payload[/b]. Do not rename the built CAK; rebuild it under the new name instead.
[*]Keep the original archives untouched. Test only the new mod CAK in game; remove it to roll back.
[/list]

[b]Known limitations[/b]

[list]
[*]Windows x64 only.
[*]No WWE game files, CAKs, Oodle DLL, extracted assets, or prior addon binaries are included.
[*]A CAK can be structurally and byte-for-byte verified before mounting, but the final visible result still requires an in-game test.
[*]Entirely new texture hashes require a suitable populated `_textures.tdb`.
[*]The Foundry does not replace Secure DataCtrlLink or prove the game’s final conflict behavior.
[/list]

[b]Independent project notice[/b]

Aurora CAK Foundry and Aurora Forge are independent community projects. They are not affiliated with or endorsed by WWE, 2K, or Visual Concepts.

[b]Project and support[/b]

https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool

https://www.patreon.com/c/dgranletmwo/shop

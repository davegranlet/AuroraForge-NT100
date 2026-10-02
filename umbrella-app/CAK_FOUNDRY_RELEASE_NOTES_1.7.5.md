**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.5

Aurora CAK Foundry is the standalone Windows version of Aurora Forge’s WWE 2K26 `.cak` browser, extractor, rebuilder, baker, and verifier. The complete Aurora Forge application is not required.

## What changed since the first standalone release

The first release, published as **Aurora Forge CAK Extractor/Repackager 1.7 Major RC1**, established the read-only archive browser, stored and Oodle-compressed extraction, unresolved-hash export, multi-archive browsing, and an early CAK baker.

Version 1.7.5 keeps those workflows and substantially strengthens the archive it creates:

- Uses the public name **Aurora CAK Foundry**.
- Derives the WWE 2K26 FDIR v9.9 archive key from the final `.cak` filename. Do not rename a baked archive; rebuild it with the new name instead.
- Writes encoded string tables, sorted path-hash tables, catalog checksums, uppercase file-family identifiers, and protected payloads.
- Preserves a supplied `_textures.tdb`, or adds a safe empty version-6 database for replacement-only texture workflows. Entirely new texture hashes still need a suitable populated database.
- Optionally keeps smaller Oodle-compressed output when the user’s own WWE 2K26 Oodle library is available and the helper verifies the compression round trip.
- Reopens every completed archive, recovers every protected stored payload, and compares it byte-for-byte with the build input.
- Reports individual archives rejected by structural safety checks while continuing to open accepted archives.
- Ships as an independently launchable portable Windows package with the required runtime, helper, compatibility metadata, first-party license, and this guide.

## Verified WWE 2K26 evidence

- All 15 CAKs from the original WWE 2K26 release opened successfully: 386,294 catalog entries in total.
- All 15 CAKs from WWE 2K26 v1.14 opened successfully: 408,094 catalog entries in total.
- Both substantially different `bakedfile100.cak` versions opened successfully.
- Real extraction passed from stored and Oodle-compressed archives, including a file from `bakedfile100.cak` in both tested game versions.
- A synthetic protected CAK rebuild reopened successfully and recovered every payload byte-for-byte.

These results verify the tested archive layouts. They do not claim that every future game update is automatically supported. Unknown or malformed structures fail safely rather than being forced open.

## Quick start

1. Extract the complete ZIP to a normal writable folder.
2. Run `Aurora CAK Foundry.exe`.
3. Select your WWE 2K26 installation. The tool uses the game’s own `oo2core_9_win64.dll` for compressed extraction; it is not included.
4. Open one `.cak`, or choose **Open All Game CAKs**.
5. Extract selected files—or all safely named files—to a separate working folder.
6. Edit files without changing their required relative paths.
7. Select the prepared `BakeMe` folder and choose **Build Game-Ready CAK**.
8. Choose the final `.cak` filename, then run **Verify Every Payload**.
9. Keep the original game archives untouched. Test only the newly created mod archive in game and remove it to roll back.

## Important limitations

- Windows x64 only.
- The Foundry does not include WWE files, CAKs, Oodle, extracted assets, or prior addon binaries.
- A newly baked CAK is structurally and byte-for-byte verified; the final mount and visible result still require an in-game test.
- New texture hashes require a suitable populated `_textures.tdb`.
- The tool does not replace Secure DataCtrlLink or control the game’s final conflict behavior.

Aurora CAK Foundry is an independent community project and is not affiliated with or endorsed by WWE, 2K, or Visual Concepts.

Project: https://github.com/davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool

Support: https://www.patreon.com/c/dgranletmwo/shop

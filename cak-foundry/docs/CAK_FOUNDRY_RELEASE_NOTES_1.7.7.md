**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.7

v1.7.7 adds WWE 2K25 PC support without changing the existing WWE 2K26 FDIR 9.9 path.

The file-browser Select All checkbox now selects every extractable file matching the active CAK/search across all result pages. External references without stored payloads are excluded automatically.

Non-extractable catalog references are no longer displayed as files. They remain tracked in an extraction-side structured reference report for future cross-archive relationship research.

## Added

- Detects WWE 2K25 FDIR 9.3 archives separately from WWE 2K26 FDIR 9.9 archives.
- Reads encrypted WWE 2K25 catalogs and returns the genuine stored folder paths, filenames, extensions, hashes, offsets, sizes, and chunk metadata.
- Extracts raw logical files with their real names and bytes using the Oodle library from the user's own WWE 2K25 installation.
- Builds WWE 2K25 FDIR 9.3 archives and automatically reopens, re-extracts, and byte-compares every payload.
- Preserves a supplied `_textures.tdb` for raw 2K25 rebuilds.
- Includes and clearly attributes Nenkai's MIT-licensed Bakery/CakeTool FDIR 9.3 implementation. Its license and upstream notice ship with the backend.

## Verified evidence

- WWE 2K25 PC v1.23: all 15 installed CAKs opened.
- 386,873 of 386,873 catalog entries had genuine native names; 0 unresolved.
- 93,738 folders parsed; 0 archives rejected.
- `bakedfile100.cak`: 54,481 named files parsed.
- Representative encrypted/chunked extraction: 53 of 53 files succeeded.
- Rebuild smoke test: source, reopened archive, and re-extracted payload SHA-256 matched exactly.

## Honest status

- WWE 2K25 catalog/name recovery: **Ready** for the verified v1.23 installation.
- WWE 2K25 extraction: **Ready** for the tested raw-file workflow.
- WWE 2K25 rebuilding: **Experimental** until a rebuilt CAK is accepted and its content is observed in-game.
- The missing stock FDIR 9.3 catalog-protection layer is now implemented and passes a full 2,004-file offline rebuild/reopen/SHA verification. Live game acceptance remains the final Experimental gate.
- Other WWE 2K25 patches: **Research** until their archives are supplied and checked.

No WWE files or Oodle binaries are included.

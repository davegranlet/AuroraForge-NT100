**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.7 fix and verification report

## WWE 2K25 protected FDIR writer

The v9.3 writer now applies the filename-derived stock catalog protection instead of emitting plain metadata. It protects the declared bytes of every table, preserves the plaintext CRC expected by the reader, scrambles catalog strings, protects the section header, and sets the encrypted-header flag.

Verification: a disposable protected fixture passed encrypted-flag, non-plain-catalog, reopen, checksum, extraction, and payload checks. A full `bakedfile80` development rebuild then reopened and reproduced all 2,004 payloads and 1,137 folders. Its SHA-256 is `DA50A25904803B002864B69BCF0033A76974CEA5F91CE95E4E344441C63B0818`.

The feature remains **Experimental** until WWE 2K25 returns success from its mount routine and the intended replacement is observed in-game.

## ACF-177-001 fixed

Added an explicit FDIR 9.3 backend and game detection. The 9.9 reader remains separate and unchanged.

Verification: all 15 WWE 2K25 v1.23 archives opened; 386,873 files and 93,738 folders parsed; 0 archive failures.

## ACF-177-002 fixed

The 9.3 backend exports decoded native catalog names directly to Foundry. Extract All never substitutes invented filenames.

Verification: 386,873 of 386,873 entries resolved; `bakedfile02.cak` extracted 53 of 53 named files with 0 failures.

## ACF-177-003 fixed

The 9.3 builder explicitly excludes both Foundry bookkeeping files.

Verification: a source containing both bookkeeping files rebuilt with one intended payload; the catalog contained exactly one payload.

## ACF-177-004 fixed

The raw 9.3 build path now preserves a supplied `_textures.tdb`; automatic generation remains available for the DDS conversion workflow when no database was supplied.

## Rebuild verification

A representative named WWE 2K25 payload was built, reopened, extracted, and compared with SHA-256. Source and recovered hashes matched. In-game acceptance remains **Experimental** pending a user mount test.

## ACF-177-005 fixed

Coverage now separates extractable payloads from zero-payload metadata references. Current WWE 2K26 v1.16 reports 412,095 payloads and 279 metadata references without treating the references as failed files.

## ACF-177-006 fixed

Corrected the native WWE 2K26 string-table record cursor and terminator validation. The final 15 paths now decode directly from `bakedfile90.cak` as the two WrestleMania 42 arena sets and the CAEV Jeff Hardy set. All reconstructed paths match their stored FNV-1a 64-bit hashes.

Verification: all 15 current archives open and all 412,095 stored payloads have genuine paths; zero remain unresolved.

## ACF-177-007 fixed

The identity-preservation verifier now chooses genuine payload specimens by storage profile without requiring unresolved catalog entries.

Verification: compressed/protected single and multi, stored/protected single, stored/plain single, and stored/plain multi payloads all survive manifest-driven rebuild, reopen, and byte comparison.

## ACF-177-008 fixed

The release candidate is packaged from the dedicated Foundry repository. The WWE 2K25 backend source is byte-identical to the integrated copy, and the packaged binary comes from the dedicated copy that passed all 15 v1.23 archives, 386,873 files, and 93,738 folders with zero unresolved names.

## ACF-177-009 fixed

The portable builder now expands the packaged-folder wildcard correctly and refuses to report success unless a nonempty ZIP exists. The resulting ZIP extracts and launches from a newly created clean folder.

## ACF-177-010 fixed

Standalone staging now strips the full Aurora Forge sidebar and links to absent desktop pages, applies the standalone layout, and displays the exact v1.7.7 identity in the window title. Packaging stops if any full-app navigation remains.

## ACF-177-011 fixed

The WWE 2K25 adapter now supplies the decoded folder name expected by the shared file browser. Genuine full paths and the Folder column therefore report the same verified directory instead of an `Unresolved folder` placeholder.

The full virtual filename and Folder column are two views of the same path. The renderer now derives the latter from the former when necessary. Unknown paths are explicitly unavailable and non-extractable rather than being emitted as anonymous files.

## ACF-177-012 fixed

The results-header checkbox now requests and selects every extractable ID matching the active CAK browser filters, not merely the current 100-row page. Its checked and partial states represent the complete result set, and external references without stored payloads remain excluded.

Verification: a synthetic four-page catalog produced 357 results, 349 extractable payloads, 100 visible rows, and exactly 349 unique Select All IDs.

## ACF-177-013 fixed

The end-user browser now shows only genuine stored payload files. Non-extractable catalog references are hidden but preserved as structured metadata in `.aurora-cak-external-references.json`, including virtual path, hashes, referencing archive, expected size, and any matching payload-owning archives visible in the opened CAK set. The rebuilder never packs this sidecar.

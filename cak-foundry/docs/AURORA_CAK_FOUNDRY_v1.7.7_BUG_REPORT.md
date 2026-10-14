**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.7 bug report

## ACF-177-001 — WWE 2K25 knowledge existed but was not connected to Foundry

- Observed: the shared knowledge base identified WWE 2K25 as FDIR 9.3, but the standalone reader rejected everything except 9.9.
- Impact: users could not browse or extract WWE 2K25 archives.
- Cause: the standalone project was separated before the game-profile knowledge was synchronized.

## ACF-177-002 — Exact 2K25 names were unavailable through the application

- Observed: there was no 9.3 catalog bridge capable of returning native names to the interface.
- Impact: an unsafe fallback could have produced anonymous `.bin` files.
- Required behavior: fail closed unless genuine catalog names are available.

## ACF-177-003 — Rebuild could ingest Foundry bookkeeping files

- Observed: `.aurora-cak-manifest.json` and `Aurora_Forge_Extraction_Report.txt` were ordinary files to the 9.3 builder.
- Impact: tool metadata could be mounted as game content.

## ACF-177-004 — Raw `_textures.tdb` could be discarded

- Observed: the upstream build path skipped a supplied texture database because its normal workflow regenerates one from DDS inputs.
- Impact: a raw extract/rebuild workflow could lose original texture metadata.

## ACF-177-005 — Coverage report counted empty metadata as failed files

- Observed: the current WWE 2K26 archives contain 279 zero-payload metadata references. The coverage tool counted them as files whose names had to be recovered.
- Impact: the report claimed 214 unresolved files even though only 30 extractable payloads lacked names at discovery time.
- Cause: coverage was calculated over every FDIR reference instead of payload-bearing, extractable entries.
- Fix: coverage now reports payloads and metadata references separately.
- Verification: the corrected current-build report identifies 412,095 payloads and 279 metadata references. After the catalog additions below, 412,080 payloads are named and 15 remain unresolved.

## ACF-177-006 — Current-build catalog omitted three complete Bink sets

- Observed: WWE 2K26 v1.16 contained 30 extractable Bink 2 payloads in six folders that were absent from the bundled catalog.
- Impact: Extract All correctly failed closed rather than creating anonymous `.bin` output, but users could not complete a real-name extraction.
- Root cause: the native string-table decoder started each record two bytes late. It therefore interpreted encrypted name data as record lengths and silently fell back to the catalog.
- Fix: string records now start at their actual offset, use that offset as the reversible transform position, and require the expected terminating zero byte.
- Recovered paths: the first three sets remain `Movies/SS/843_CHARLOTTE_FLAIR_2025`, `Movies/SS/1128_VICTORIA_2026`, and `Movies/SS/838_MOLLY_HOLLY_2026`. Correct native decoding recovered the final sets as `Movies/Arena/WRESTLEMANIA_42_N1`, `Movies/Arena/WRESTLEMANIA_42_N2`, and `Movies/SS/CAEV_JEFFHARDY1_2026`; each contains Apron, Banner, Barricade, Stage, and Titantron `.bk2` files.
- Verification: all recovered folder and full-file paths reproduce their stored FNV-1a 64-bit hashes. Current WWE 2K26 v1.16 reports 412,095 of 412,095 payloads named across 15 archives, with zero unresolved payloads.

## ACF-177-007 — Raw-hash verification depended on unresolved catalog entries

- Observed: after native name recovery reached 100%, the verifier found no specimens because it filtered exclusively for unresolved payloads.
- Impact: a successful catalog repair incorrectly made the raw-hash preservation regression test fail before extraction.
- Cause: payload storage coverage and unresolved-name availability were coupled even though manifest-provided identity can be tested with any genuine payload.
- Fix: the verifier selects the smallest real payload for every required storage profile regardless of catalog resolution, then forces manifest-provided file/folder identity through rebuild and reopen.
- Verification: current WWE 2K26 passes five profiles: compressed/protected single and multi, stored/protected single, stored/plain single, and stored/plain multi; hashes and rebuilt payload bytes match.

## ACF-177-008 — Integrated package source contained a stale WWE 2K25 backend

- Observed: the dedicated repository's backend passed 386,873 entries, while the older integrated binary checksum differed and its verification stalled.
- Impact: packaging from the integrated tree could ship a backend different from the tested standalone source state.
- Fix: the v1.7.7 candidate is built from the dedicated Aurora CAK Foundry repository and its already-verified backend. All 33 relevant backend source files were confirmed byte-identical between repositories.
- Verification: the packaged helper checksum is audited against the verified dedicated-repository copy.

## ACF-177-009 — Portable builder could report success without a ZIP

- Observed: PowerShell `Compress-Archive -LiteralPath` received a wildcard, returned success, and created no archive; the builder still printed `Created`.
- Impact: a release run could falsely appear complete without a distributable file.
- Fix: use the expandable `-Path` input and require the destination ZIP to exist with nonzero length before reporting success.
- Verification: the corrected builder created an extractable ZIP which passed a clean-folder launch smoke test.

## ACF-177-010 — Standalone package retained dead desktop navigation

- Observed: the clean standalone window displayed Aurora Forge's full sidebar and links to pages that were intentionally absent from the standalone package. Its HTML title also omitted v1.7.7.
- Impact: users could click dead navigation and could not identify the exact release from the window title.
- Fix: standalone staging removes the desktop sidebar and full-app links, applies the standalone layout class, and sets `Aurora CAK Foundry v1.7.7` as the document title. The build fails if desktop navigation remains.

## ACF-177-011 — WWE 2K25 browser displayed resolved folders as unresolved

- Observed: WWE 2K25 files showed genuine full paths but the Folder column displayed `Unresolved folder <number>`.
- Impact: the interface contradicted its own verified filename result and made correct extraction look incomplete.
- Root cause: the FDIR 9.3 adapter did not copy the decoded folder name onto each normalized file record expected by the shared renderer.
- Fix: every WWE 2K25 file receives its decoded catalog folder name, with the verified file path's parent directory as a safe secondary source.
- Clarification: this was duplicate path representation in the application model. `file.name` already contained the complete genuine virtual path, while the Folder column separately requested `file.folderName`. The missing duplicate display field triggered the misleading label; it did not mean the archive filename was unknown.
- Regression hardening: the shared renderer now derives the Folder column from the genuine full path whenever the separate display field is absent. It no longer displays `Unresolved folder`. A genuinely unknown path is labeled `Catalog path unavailable`, cannot be selected, and extraction fails closed.

## ACF-177-012 — Select All selected only the visible page

- Observed: the results-header checkbox selected only the current page of up to 100 files.
- Impact: users could not select every extractable file in a CAK without visiting every page manually.
- Root cause: the renderer kept only the current page in `state.items`, and the checkbox handler iterated that page-local array.
- Fix: the backend can now return all extractable IDs for the active archive/search in one request. The checkbox applies that complete set while leaving zero-payload external references unselected.
- Verification: a 357-entry, four-page result returned 349 unique extractable IDs in one request and only 100 display rows; all 349 IDs were available to Select All.

## ACF-177-013 — Non-extractable catalog references appeared as files

- Observed: zero-payload external catalog references appeared beside stored payloads with disabled checkboxes.
- Impact: users reasonably interpreted them as files the extractor had failed to make available.
- Fix: the public browser and file count now include stored payload files only. External references remain in the internal catalog model and are recorded in `.aurora-cak-external-references.json` after extraction for future cross-archive linkage research.
- Safety: the reference sidecar is excluded automatically when rebuilding a CAK.

## ACF-177-014 — WWE 2K25 rebuild omitted the stock catalog-protection layer

- Observed: a 2,004-file `bakedfile80` rebuild reopened in the development backend and reproduced every payload SHA-256, but WWE 2K25 v1.23 returned `false` when the exact-build loader attempted to mount it.
- Impact: WWE 2K25 extraction remains Ready, but WWE 2K25 rebuilding is not game-compatible and remains Experimental.
- Root cause: stock v1.23 FDIR 9.3 archives protect or obfuscate catalog bytes after the eight-byte prefix. The current writer emits the catalog in plain form, so its own reader can reopen it but the game rejects it.
- Fix: implemented the inverse >=8.7 catalog transform, filename-derived v9.3 keying, encrypted-header flag, per-string scrambling, plaintext section CRCs, and declared-length-only section protection. The first fixture exposed and corrected an alignment-padding checksum error.
- Offline verification: the automated protected-writer fixture passes, and the full 2,004-file `bakedfile80` rebuild reopens and reproduces every source payload hash. The protected test CAK is 2,214,802,300 bytes with SHA-256 `DA50A25904803B002864B69BCF0033A76974CEA5F91CE95E4E344441C63B0818`.
- Status: fix implemented and verified offline; live mount acceptance remains pending, so WWE 2K25 rebuilding is still Experimental.
- Verification required: all payload hashes must still match, the output catalog must have protected stock-compatible structure, the game mount routine must return `true`, and a replacement must be visible in-game.

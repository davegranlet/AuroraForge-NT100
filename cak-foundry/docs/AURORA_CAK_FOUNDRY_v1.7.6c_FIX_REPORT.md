**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.6c fix and verification report

## AFCAK-001 correction

- Full extraction now merges the verified bundled catalog with hash-verified names decoded directly from sibling game CAKs.
- Extract All fails before writing if any physically stored payload still lacks a genuine name.
- Output is one merged virtual `/root`; no generated `Unresolved` tree is created.
- A hidden Aurora manifest preserves original file and folder hashes for exact rebuilding, including user-facing `.dds` files whose native identity is `.tex`.

## AFCAK-002 correction

- Extraction work is split into bounded 500-file batches.
- The interface displays percentage, current archive, processed/total files, successes, and failures.

## AFCAK-003 correction

- The reader now reverses the CAK's native filename transform.
- Reconstructed paths are trusted only when lowercase FNV-1a 64-bit hashing exactly reproduces the stored archive hash.
- Cross-archive native names cover secondary CAKs that intentionally omit repeated name records.

## AFCAK-004 correction

- The inverted 64-bit filename-hash lane is padded to exactly 16 hexadecimal characters.
- Together with the two following 8-character lanes, the input to the v9.9 hash is always exactly 32 ASCII bytes.
- `mod23.cak` permanently reproduces the formerly failing leading-zero shape and now derives key `f755512d`.

## Verification results

- Source verification suite: **Passed**.
- Protected synthetic CAK build/reopen and byte comparison: **Passed**.
- Clean portable application launch: **Passed**.
- Packaged `mod23.cak` regression build/reopen: **Passed**.
- Packaged protected payload byte comparison: **Passed**.
- Package prohibited-file scan: **Passed**.
- Original-release stored-name coverage: **386,052/386,052**.
- v1.14 stored-name coverage: **407,815/407,815**.
- Current v1.16 stored-name coverage: **412,095/412,095**.
- Current v1.16 complete merged extraction: **412,095 succeeded; 0 failed**.

## Safety and scope

- Game archives are read-only.
- Extraction output must be outside the game installation.
- The package does not include proprietary WWE files, Oodle, extracted assets, decompiler projects, or third-party modding tools.
- Aurora CAK Foundry is an independent interoperability implementation.

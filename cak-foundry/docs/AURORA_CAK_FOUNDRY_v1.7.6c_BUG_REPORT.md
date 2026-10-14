**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry v1.7.6c bug report

## Summary

Four release-impacting defects were confirmed during full-game and packaged-runtime testing. All four are fixed in v1.7.6c.

## AFCAK-001 — Extract All emitted generated `.bin` filenames

- **Observed:** Full extraction could produce paths such as `Unresolved/.../file_000001_0585ad6956507252.bin`.
- **Expected:** Users receive the genuine virtual path and usable extension stored or proven by the game data.
- **Cause:** The batch extraction path opened archives with an empty filename dictionary.
- **Impact:** Payload bytes existed but the output was not a usable game file tree.

## AFCAK-002 — Long extraction lacked live progress

- **Observed:** Large jobs appeared frozen while a large native request ran.
- **Expected:** Percentage, current archive, processed files, successes, and failures remain visible.
- **Cause:** Archive-sized extraction requests had no bounded renderer progress events.
- **Impact:** Users could not distinguish a healthy long extraction from a stalled process.

## AFCAK-003 — Native CAK names were not decoded

- **Observed:** New or version-exclusive files could remain unresolved even when their names existed inside the CAK.
- **Expected:** Native file and folder names are recovered and accepted only after matching their stored hashes.
- **Cause:** The reader parsed string offsets but did not invert the native name-table transform.
- **Impact:** Filename coverage depended too heavily on the preexisting verified fallback catalog.

## AFCAK-004 — Some output names shortened the fixed key seed

- **Observed:** Rebuild stopped with `The WWE 2K26 key hash requires a 32-byte seed table.`
- **Expected:** Every valid output filename produces the fixed 32-byte WWE 2K26 v9.9 key seed.
- **Cause:** Hexadecimal conversion removed a leading zero from one 64-bit seed lane for some filenames.
- **Impact:** Rebuild failed solely because of the chosen CAK filename.

## Status

All listed defects are fixed and verified in Aurora CAK Foundry v1.7.6c. See `AURORA_CAK_FOUNDRY_v1.7.6c_FIX_REPORT.md` for the corrections and test evidence.

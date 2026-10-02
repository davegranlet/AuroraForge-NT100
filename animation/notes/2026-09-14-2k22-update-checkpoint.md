# Active release update: 2K20 to 2K22

The user explicitly redirected the active work on 2026-09-14: add WWE 2K20 to WWE 2K22 support to the existing Aurora Forge 2K19 to 2K20 converter release. Preserve the released stage and the user's app/worktree edits. This is an update to the same application. 2K25 Group90 work is paused.

## Current evidence

- Added `tools/amym-container.js`: bounded AMYM group/entry directory reader and size-aware envelope rebuilder. Five focused tests pass, including exact whole-file round trips for 2K22 Victory 6100 (393244 bytes), 6101 (599316), and 6102 (248208).
- AMYM word at offset 4 is a group count, not a version. Confirmed with native `FUN_141f00dd0` in the installed WWE2K22 executable and three fixture layouts. The directory begins at `16 + groupCount*16`, followed by entry sizes (uint32), IDs (uint16), padding to an even ID count, and consecutive entry payloads.
- Native analysis is isolated in `D:\AuroraForge-Aug26\_work\ghidra-2k22-animation`. Stock game files are untouched. The copied executable is an analysis oracle only and must not be packaged.
- The standalone input `D:\AuroraForge-Aug26\converted.yanm20.bin` reads as 174976 bytes with the existing YANM20 reader. That reader preserves packed triplets; it does not yet establish a complete source transform decoder.
- A renewed targeted search for WWE 2K22 TBUF, AMYM/ANIM source, and YANM20 decoders returned no usable public semantic codec. Do not repeat the same queries without a new lead.

## Remaining release gates

ANIM v10 transform/channel decoding and encoding, source YANM20 transform semantics, bone mapping, time mapping, and a real source-driven output with independent read-back remain unresolved. Envelope round trips are not motion conversion. Do not enable or advertise 2K22 conversion in the UI until those gates are met.

## 2026-09-14 2K19 to 2K20 package-builder pivot

The immediate release goal shifted back to closing the current 2K19 to 2K20 app limits:

- produce a real 2K20 package folder, not only a loose `YANM20` body;
- convert the event side instead of leaving `.evd` out;
- leave in-game 2K20 validation as the final proof step after packaging is complete.

Implemented `tools/build-2k19-to-2k20-victory-package.js`. For Victory `6100`, it now:

- converts the decoded 2K19 body source to `6100.yanm20.bin`;
- patches that YANM into the 2K20 `6100.acts` reference;
- stages the result at `Root\Animation\Victory\6100.acts`;
- attempts EVD conversion and refuses to report a finished package while unsupported event bodies remain.

Corrected `tools/patch-acts20-yanm.js`: the old raw splice changed the embedded YANM length without updating the AMYM directory. The patcher now detects `AMYM`, replaces the YANM inside the containing entry, and rebuilds the AMYM size table with `tools/amym-container.js`. Test `tools/patch-acts20-yanm.test.js` verifies the rebuilt 2K20 ACTS still parses and keeps the body YANM at offset `37212`.

Current package-builder output path:

`D:\AuroraForge-Aug26\_work\2k20-package-6100`

Current result is intentionally `ok: false` at stage `evd`: ACTS generation succeeds, but EVD conversion refuses six unmodeled Victory `6100` event bodies:

- index `0`, 788 source bytes;
- index `19`, 788 source bytes;
- index `20`, 788 source bytes;
- index `21`, 788 source bytes;
- index `22`, 788 source bytes;
- index `23`, 1628 source bytes.

The measured event model still passes for the known families: indices 1 through 12, direct vector index 13 for 6100, direct pose indices 14 through 16 for 6100, and implicit pose indices 17 through 18 for 6100. Broader focused verification passed:

`node --test tools/fop19-reader.test.js tools/evd-reader.test.js tools/fop19-evd20-table-model.test.js tools/fop19-evd20-body-model.test.js tools/patch-acts20-yanm.test.js tools/build-2k19-to-2k20-victory-package.test.js tools/amym-container.test.js`

Result: 33 tests passed.

## Preserved paused 2K25 finding

The instruction audit in `_work\ghidra-clips-editor\analysis-pose-numeric-audit.log` disproves the old numeric scale interpretation: the native code shifts the exponent into a uint32, stores the bits, and uses that memory with MULSS. It is an IEEE float bit reinterpretation, not a numeric integer-to-float scale. The existing scalar helper and its tests are therefore not semantic validation and require correction when that work resumes. Quaternion assembly uses a vector length followed by sin/cos; W is not recovered by a positive square root. No 2K25 codec implementation was applied during this turn.

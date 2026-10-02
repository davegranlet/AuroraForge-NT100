# Aurora Forge animation-converter transfer handoff — 2026-09-14

This is the current authoritative transfer snapshot for the next bot. It supplements the canonical continuation prompt at `D:\promptfordumbbots\AURORA_FORGE_CANONICAL_CONTINUATION_PROMPT.md`; the original goal is unchanged:

`WWE 2K19 animation -> WWE 2K20 -> WWE 2K22/23/24 -> usable WWE 2K25 entrance/victory animation output`

Do not call the project complete until a genuinely converted motion is written, independently read back, and visibly plays in the intended game format. Do not substitute a reference copy, structural-only mutation, FBX preview, package repack, or GUI screenshot for that proof.

## Current repository and dirty-state boundary

Primary repository:

`D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype`

HEAD at the last pushed baseline is `92c9c3835c40c4c35125d7529a0ac7169fae62ae`.

The current worktree intentionally contains uncommitted research/tool changes. Preserve them; do not reset or clean broadly. Current status at handoff:

```text
 M AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-13-CURRENT.md
 M tools/clips-tool.js
 M tools/clips-tool.test.js
 M tools/group90-descriptor-ranges.js
 M tools/group90-descriptor-ranges.test.js
 M tools/yanm20-normalization-sweep.js
 M tools/yanm20-normalization-sweep.test.js
?? app/node_modules/
?? tools/clips-native-inspect.js
?? tools/clips-native-inspect.test.js
?? tools/ghidra/
```

`app/node_modules/` is a local untracked runtime directory. Do not package it into research artifacts unless the app build explicitly requires it.

## Verified immediate milestone: real 2K19 -> 2K20

The bounded 2K19 -> 2K20 bridge is the only completed conversion stage:

- Source decoded Victory 6100 input: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`
- 2K20 reference: `D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.acts`
- Verified output: `D:\AuroraForge-Aug26\_work\app-milestone\victory-6100-2k20.yanm20.bin`
- Output evidence: 174,976 bytes, 63 records, 62 motion tracks, both streams present on every track, and successful independent `yanm20-reader.js` read-back.
- Packaged desktop build previously produced: `app\dist\aurora-forge-converter 0.9.0.exe` (76,049,705 bytes); runtime tools were present and the executable started.

This proves the stage-one bridge and app reporting path. It does not prove any modern `.clips` conversion.

## Modern format state

The repository has safe structural tools, not a complete modern semantic writer:

- `tools/clips-layout.js`: lossless modern `.clips` container parser/rebuilder.
- `tools/clips-tool.js`: safe list/validate/extract/inject/rebuild/compare CLI plus deliberately raw `patch-group90`; it refuses to claim semantic edits.
- `tools/adefs-tool.js`: read-only ADEF v6 envelope inspector.
- `tools/clips-native-inspect.js`: read-only native decoder mirror.
- `tools/clips-native-inspect.test.js`: focused decoder tests.
- `tools/ghidra/`: read-only Ghidra scripts used against the installed Clips Editor executable; do not package decompiler projects or third-party binaries.

The known modern structural fixture is:

`D:\wwe 2k25 mods\extracts\Animation\animbanks\ingame\general_purpose\test_anim.clips`

It has record 1 with 60 fps, frame value 111, 73 tracks, 438 Group78 descriptors, and 709 Group90 entries. It has no sibling `test_anim.adefs`; this explains why opening it in the native viewer produced a bind/T-pose with a `0 / 0` timeline. That screenshot is negative playback evidence, not a successful animation test.

## Native decoder findings

Read-only Ghidra analysis of `D:\WWE26-mods\compiled releases for review\Tools - Addons\Clips Editor v2.21\Clips Editor v2.21\Clips Editor.exe` is isolated at:

`D:\AuroraForge-Aug26\_work\ghidra-clips-editor\ClipsEditorAnalysis`

The important proven functions are:

- `FUN_1400023a0`: parses an AnimClip record.
- `FUN_140003530`: per-bone packed-channel decoder; produces translation and quaternion key records.
- `FUN_1400033d0`: iterates bones and calls the per-bone decoder.
- `FUN_140004600`: little-endian arbitrary-width Group90 bit reader.
- `FUN_140002e50`: timing/segment prelude builder.
- `FUN_1400040a0`: mode-dependent timing/value positioning.
- `FUN_140023fc0`: converts an AnimClip into per-frame AnimationData; native error string is `Failed to convert AnimClip to AnimationData for clip idx`.
- `FUN_14001d4c0`: serializes an already-populated AnimClip state in the order track IDs, Group38, Group60, Group78, Group90. It is not a pose encoder.
- `FUN_1400212a0`: viewer playback evaluator over already-decoded per-bone key records.

The on-disk table order is proven: track IDs, Group38, Group60, Group78 descriptors, then Group90 words. For a 73-bone record, 438 descriptors equals six descriptors per bone.

The repository’s read-only mirror currently proves:

1. LSB-first arbitrary-width Group90 reads across uint64 words.
2. Timing prelude parsing: the real `test_anim` record 1 starts with one non-stepped run of length 111, mode 0, next bit offset 10.
3. Descriptor fields: signed low byte, bits 8–15 bit width, and high uint32.
4. Native scalar expansion formula:

`float(highUint32Bits) + packedValue * ((signedLowByte + 0x7F) * 0x800000)`

This is still missing complete timing-cursor selection, quaternion assembly, inverse descriptor generation, and a semantic Group90 writer.

## Test evidence

Exact command, run from the primary repository:

```powershell
Set-Location D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype
$tests = @(rg --files tools -g '*.test.js')
node --test $tests
git diff --check
```

Latest result at handoff: **120 tests passed, 0 failed**. `git diff --check` reports only the repository’s existing LF/CRLF normalization warnings. The suite proves tested primitives and measured bounded models; it does not prove modern semantic encoding or in-game usability.

## Paired modern probe artifact

To provide a valid local/game probe, use the real paired source asset under `CaeAdvanced` rather than `test_anim`:

- Source `.clips`: `D:\wwe 2k25 mods\extracts\Animation\CaeAdvanced\1000100.clips`
- Source `.adefs`: `D:\wwe 2k25 mods\extracts\Animation\CaeAdvanced\1000100.adefs`
- Probe `.clips`: `D:\AuroraForge-Aug26\_work\game-probe\CaeAdvanced\1000100.clips`
- Probe `.adefs`: `D:\AuroraForge-Aug26\_work\game-probe\CaeAdvanced\1000100.adefs`

The probe was created with:

```powershell
node tools/clips-tool.js patch-group90 `
  'D:\wwe 2k25 mods\extracts\Animation\CaeAdvanced\1000100.clips' `
  4 0 1 `
  --out 'D:\AuroraForge-Aug26\_work\game-probe\CaeAdvanced\1000100.clips'
```

The one changed word is `0x00001EB0001801D3 -> 0x0000000000000001`. The output remains 23,464 bytes and parses as five records; record 4 remains 60 fps, frame value 243, 73 tracks, 438 Group78 descriptors, and 33 Group90 entries. This is a controlled modern payload probe only. It is not a 2K19 conversion and is not evidence of semantic correctness until a nonzero-frame animation visibly changes in the game.

## Public-source fallback already performed

Targeted searches were performed for public WWE `.clips`/Group90 encoders and 2K22 AMYM/TBUF writers. Results were limited to structural or older-format references (including WrestleMINUS); no usable modern semantic encoder was found. Do not repeat broad searches without a new query or new source evidence.

## Required next work

1. Use the repository’s own tools as the primary path. Do not make the Clips Editor a required player; it is only a reference oracle.
2. Extend `tools/clips-native-inspect.js` into an explicit headless frame/pose decoder, starting with the proven timing cursor and scalar formula. Keep unsupported paths explicit instead of silently emitting T-poses.
3. Add tests against the paired `CaeAdvanced/1000100` probe and the known `test_anim` fixture. A test must report frame count and decoded data presence, not merely container validity.
4. Recover quaternion assembly and full timing-channel positioning from the already captured Ghidra decompilations. Do not invent descriptor or Group90 inverse rules.
5. Only after a local decoder can show nonzero frame data, implement the corresponding semantic writer and generate a separately named `.clips/.adefs` output from the existing 2K19 Victory 6100 bridge.
6. Independently read back the generated modern files, then stage a new-name in-game test. Preserve stock files and use a separate mod/output directory.
7. Keep the 2K20 milestone intact and do not mark 2K22 or 2K25 complete based on the paired probe.

## Honest status at transfer

- 2K19 -> 2K20 bridge: **verified**.
- Desktop 2K19 -> 2K20 path: **implemented and packaged; latest clean packaged-app verification should be rerun before release claims**.
- Modern `.clips` structural parsing/rebuilding: **verified**.
- ADEF v6 envelope reading: **verified; no general writer claim**.
- Native decoder reverse engineering: **substantial, read-only scalar/timing checkpoints verified**.
- Own headless modern player/pose decoder: **not complete**.
- 2K19 -> 2K25 semantic conversion: **not complete**.
- In-game converted-motion playback: **not verified**.

Do not ask the user to resend the canonical prompt, source map, existing exports, or known fixtures. The user’s current offer is to test a real staged artifact when the repository produces one with the required paired `.adefs` and registration context.

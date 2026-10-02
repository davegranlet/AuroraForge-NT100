# Aurora Forge — account-transfer handoff (2026-09-13, current)

Copy this entire document into the other ChatGPT account to resume this project.

## Fixed objective

Build and validate a usable WWE 2K19 → WWE 2K25 entrance/victory animation converter, including a runnable modern `.clips/.adefs` output path and concrete verification evidence. Do not redefine completion as a bridge-only test, reference clone, structural checker, repackager, FBX preview, or unchanged target file.

## Mandatory continuation rules

Before every Aurora Forge test, file search, internet lookup, or code edit, read:

`D:\promptfordumbbots\AURORA_FORGE_CANONICAL_CONTINUATION_PROMPT.md`

Also read the extracted-game source map before searching extracted roots:

`D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\notes\2026-09-12-animation-converter-source-map.md`

Display `Working` while active work is underway. Do not repeat completed scans/searches/tests. Never call output working, converted, valid in-game, or ready for end users without evidence.

## Current repository and authoritative paths

Repository: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype`

Canonical ledger: `D:\promptfordumbbots\AURORA_FORGE_CANONICAL_CONTINUATION_PROMPT.md`

2K19 Victory 6100 decoded source: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`

2K20 bridge output: `D:\AuroraForge-Aug26\2K20-Victory-6100-Test\converted.yanm20.bin`

Modern corpus: `D:\wwe 2k25 mods\extracts\Animation`

Small modern fixture: `D:\wwe 2k25 mods\extracts\Animation\animbanks\ingame\general_purpose\test_anim.clips`

2K24 Victory 6100 ADEF: `D:\converter-files-usefull\drive-download-20260913T210407Z-1-001\Animation\Victory\6100.adefs`

2K25 Victory 6100 ADEF: `C:\Games\2k25-extracts\Root\Animation\Victory\6100.adefs`

## What is implemented and verified

The repository has a real bounded 2K19→2K20 bridge (`tools/convert-yanm19-to-yanm20.js`), YANM20 reader/writer, neutral IR tools, Electron app shell, and staged pipeline. The 2K19→2K20 Victory 6100 integration conversion has been run and read back: 174,976 bytes, 63 records, 62 motion tracks, both streams present on every track. This is stage-one evidence only; it is not a 2K19→2K25 result.

The 0FOP→EVD table/body experiment is measured across controlled Victory 6100, 6101, and 6102 pairs. The narrow body model reproduces all 33 modeled body conversions byte-for-byte (indices 1–11 across all three fixtures); unsupported layouts reject instead of guessing.

Modern `.clips` support includes:

- `tools/clips-layout.js`: parser/rebuilder and measured FNV-1a `clipNameId` helper.
- `tools/clips-tool.js`: safe CLI `list`, `validate`, `extract`, identity-matched `inject`, `rebuild`, and `compare` commands. It refuses overwrites, reparses outputs before writing, and intentionally has no unproven pose/Group78/Group90 writer.
- `tools/clip-control-pair.js`: structural analyzer for controlled editor pairs.
- `D:\AuroraForge-Aug26\_work\controlled-modern-cli\record1_original.clip`: extracted first nonzero-Group90 record; ID `0xE9EB9C7CBB3BDAC0`, 9,920 bytes, 60 fps, frame value 111, 73 tracks, 438 Group78 descriptors, 709 Group90 entries.
- Existing GUI pair: `D:\wwe 2k25 mods\extracts\Animation\animbanks\ingame\general_purpose\original.clip` and `slice_0_30.clip`. It is a zero-Group90 timing/control edit: frame 11001→31 and 159 Group78 descriptors change; it does not reveal pose-value encoding.

The new read-only ADEF CLI is `tools/adefs-tool.js` with tests in `tools/adefs-tool.test.js`. Commands:

```text
node tools/adefs-tool.js inspect <definition.adefs>
node tools/adefs-tool.js compare <left.adefs> <right.adefs>
node tools/adefs-tool.js inspect-json <definition.json>
node tools/adefs-tool.js inspect-json-dir <export-directory>
```

It decodes/report v6 zlib envelopes, hashes, expanded sizes, and bounded printable tokens. It deliberately does not write ADEF graphs.

Concrete ADEF result just measured:

- 2K24 6100: 4,154-byte envelope, expanded 31,043 bytes, payload SHA-256 `5D31B7AA91B5990CF50C1CD4BE71E3CA59B74AADFD32E7AAB8ED02979439BBC0`.
- 2K25 6100: 4,208-byte envelope, expanded 31,169 bytes, payload SHA-256 `829A8227193562EADF1501930EB455B6FA74400118FA582B015C211D95D40C55`.
- Direct comparison: payload lengths differ and 15,086 bytes differ, first difference at payload offset 12. Shared registration strings exist, but the payload is not safely copyable.

The native AnimationEditor executable has GUI strings proving `Inject Definition`, `Export Definition`, `DEF_FULL`, and RAT binary encoding, but no callable CLI surface is available through this chat. Do not claim exported JSON is writable by this repository.

## Tests

Run from the repository after rereading the canonical prompt:

```powershell
$tests = @(rg --files tools -g '*.test.js')
node --test $tests
```

Immediately before this handoff, the focused ADEF suite passed 5/5. The prior complete source-tool suite passed 110/110 before the ADEF CLI was added; rerun the complete command now and record the new total in the canonical ledger and in the final handoff update.

## Exact next action

1. Reread the canonical prompt.
2. Run the complete source-tool suite and `git diff --check`.
3. Update the canonical ledger with the ADEF CLI implementation, the passing count, and the concrete 2K24/2K25 inspection result above.
4. Keep the next technical target unchanged: obtain a genuine controlled nonzero-Group90 editor pair for `record1_original.clip`, then use `clips-tool compare` and the control-pair analyzer. Do not synthesize Group90 values from unrelated stock clips.
5. If the GUI remains inaccessible, perform the targeted public-source search required by the canonical prompt before reporting that encoder access is blocked. The current honest blocker is semantic modern motion payload encoding, not the v6 ADEF envelope.

## Git handoff

Remote: `https://github.com/davegranlet/Aurora-Forge-WWE2K19-Animation-Research.git` (`origin`). All current tracked and untracked project updates are intended to be committed together after tests pass. Preserve user source trees and never overwrite stock assets.

## Do not ask the user to repeat

Do not ask for the canonical prompt, source map, existing modern exports, or the already completed zero-Group90 editor pair. The user currently has no required action. Only request help when a specific GUI operation or missing external capability is reached and all safe local/public alternatives have been exhausted.

## 2026-09-13 priority and record synchronization

The complete cross-account continuation prompt is `D:\AuroraForge-Aug26\AURORA-FORGE-COMPLETE-CONTINUATION-PROMPT-2026-09-13.md`. The final objective remains usable WWE 2K19→2K25 output. The immediate proof milestone is real 2K19→2K20 conversion, followed by an evidence-based 2K22 investigation if justified. The user-listed project records under `D:\AuroraForge-Aug26` are required reading and must be updated after each meaningful find, implementation action, test, or blocker.

## 2026-09-13 Clips Editor CLI/playback audit

Exact local probes: `rg -a` and `llvm-strings` against the installed Clips Editor, followed by a hidden `Clips Editor.exe --help` launch. The binary contains `Open Clip Player`, `AnimatedMeshWidget`, and Play/Pause/frame handler symbols, but no usage text. The `--help` invocation remained running after three seconds and was terminated as a non-destructive probe rather than returning a command-line response. Targeted public searches for the exact implementation identifiers found no reusable source or headless renderer. Therefore the native player is a GUI-only playback oracle, not a current CLI component. The one-entry mutation remains accepted structurally by the native editor; its pose semantics remain unobserved.

## 2026-09-13 native Clips Editor read-only analysis

Installed the official Ghidra 12.1.3 release only at `D:\AuroraForge-Aug26\_tools\ghidra_12.1.3_PUBLIC` (569,445,154-byte release ZIP; SHA-256 `93A5D11A9AD510622ACAAF908C556A7B9B764D338E78A7567F3689BF5081FD54`) and imported the existing Clips Editor executable into the isolated project `D:\AuroraForge-Aug26\_work\ghidra-clips-editor\ClipsEditorAnalysis`. Added read-only headless scripts under `tools\ghidra`: `FindEditorStringReferences.java`, `ReferencesToRange.java`, and `DecompileFunctions.java`. Ghidra proved that the Clip Viewer is a Qt/OpenGL consumer of prepared animation-model data: the button-label function is `FUN_14003e760`; the viewer constructor is `FUN_140019910`; the `LoadAnim` button calls `FUN_140024ff0`, which only emits an actor-selection signal; and the timed playback routine is `FUN_140020950`. The first inspected receiver, `FUN_140037870`, is main-window model/view setup rather than `.clips` parsing. This advances the static reverse-engineering route and rules out the UI button as a hidden file decoder; it does not decode Group90, expose a headless pose export, or validate converted motion. Next: trace the actual main data-model file-load handler rather than the already-excluded viewer/UI paths.

## 2026-09-13 ADEF handoff proven in native loader

The real native `.clips` open handlers are `FUN_140039dc0` / `FUN_14003d4c0`; both store the chosen path and call `FUN_140037500`. Decompilation proves that function converts the path, derives a sibling `.adefs` path by extension replacement in `FUN_140038d30`, then constructs/uses `AdefReader` (`FUN_140033a50` / `FUN_140007560`) and parses the ADEF container in `FUN_140008d10`. Its chunk dispatch includes `adef`, `args`, `cmds`, `proj`, and `rmts`. Therefore the file-dialog route does not itself interpret modern Group90 words: it loads the paired ADEF definition graph first, then rebuilds the Qt model. This is evidence for the known `.clips`/`.adefs` dependency, not proof that `.adefs` alone contains pose samples or that a modern semantic encoder exists. Next: trace the model’s later ADEF-to-clip reference resolution rather than infer Group90 semantics from the dialog loader.

## 2026-09-13 decoded playback and ADEF-definition parser evidence

Read-only Ghidra analysis resolved the `CAnimDefinitions` virtual parser entry to `FUN_14000d7b0` (vtable at `0x140073508`). It reads a layered binary table: top-level and nested counts, 64-bit identifiers, flags, variable-length strings, and reference arrays. It calls helpers such as `FUN_14000d210`, `FUN_14000c770`, and `FUN_14000cbd0` while constructing the definition model. It does not read `.clips` Group90 words or pose samples, so it is not an ADEF-only motion decoder.

The actual viewer playback routine `FUN_1400212a0` is an animation evaluator. It selects frames, interpolates translation and quaternion values, and applies per-bone transforms across a `0x160`-byte bone record layout; its key records are `0x1c` bytes. Thus the native Clip Viewer is consuming already decoded per-bone pose data, not merely presenting metadata. The viewer creation path `FUN_14001f050` connects its selection signal back to the main model via the generated Qt metaobject (`DAT_140b637f8` / `FUN_140043430`). This is the remaining exact handoff boundary to trace: resolve the main model's Qt slot and then identify the function that fills the evaluator's pose-key arrays from the selected clip definition. No game files or stock assets were modified.

## 2026-09-13 native AnimClip-to-pose decoder reached

The previously unresolved Qt receiver is now concrete. Native `FUN_14001ecc0` computes the selected clip index and calls `FUN_140023fc0`; the executable's own failure message identifies that step as `Failed to convert AnimClip to AnimationData for clip idx`. `FUN_140023fc0` allocates one `0x1c`-byte key record per frame and delegates to `FUN_1400033d0`. That core routine iterates the native bone count and calls `FUN_140003530` per bone. `FUN_140003530` reads packed channel descriptors from the selected AnimClip state (including the six-word-per-bone block at `param_1 + 0x90`), expands packed values through `FUN_140004600`, produces translation values and normalized quaternions, and stores them in the `0x1c` records. `FUN_1400042b0` then applies root-motion-related adjustment for two measured hashed bones. This is direct native decoder evidence, not a semantic writer: the exact mapping between the parsed `.clips` Group78/Group90 table offsets and this in-memory AnimClip state still needs to be recovered before implementing any encoder.

The source-tool regression command was rerun at this point: `node --test @(rg --files tools -g '*.test.js')`; result: 115 passed, 0 failed. `git diff --check` passed (only the repository's existing CRLF normalization warning appeared). Added `tools/ghidra/DumpMemoryWords.java`, a read-only metadata inspection helper, alongside the existing Ghidra scripts.

## 2026-09-13 native `.clips` table-to-decoder mapping

The static trace now proves the existing on-disk section order rather than merely inferring it. `ClipsDataModel` calls `FUN_14000eb50` to load the container table, then `FUN_14000f3e0` resolves a selected record by its byte offset and calls the 200-byte AnimClip record parser `FUN_1400023a0`. Its five variable tables are exactly: `trackCount * 8` at record `+0xA0`, then `group38Count * 4`, then `group60Count * 8`, `group78 descriptorCount * 8`, and `group90Count * 8`. The parser loads those arrays respectively into AnimClip fields at `+0x20`, `+0x40`, `+0x70`, `+0x90`, and `+0xB0`. For the 73-bone fixture, `438 = 73 * 6`: the native per-bone decoder reads six consecutive Group78 descriptor words per bone from field `+0x90`.

Native `FUN_140004600` is the Group90 primitive: a little-endian arbitrary-width bit reader over the `+0xB0` table, maintaining a bit offset and returning 0 for a zero-width request. `FUN_140002e50` builds compact segment/timing state from that bitstream. `FUN_1400040a0` uses it with the descriptor-derived state to position frame reads. `FUN_140003530` expands the six descriptor channels into translations and a normalized quaternion. This is sufficient evidence to begin a strictly read-only mirror decoder and compare its values against the native data path; it does **not** yet establish a writer, descriptor encoder, or valid 2K25 output.

## 2026-09-13 native packed-bit inspector

Added the read-only `tools/clips-native-inspect.js` and its test `tools/clips-native-inspect.test.js`. It mirrors only native `FUN_140004600`'s least-significant-bit-first arbitrary-width Group90 reads and exposes the directly observed Group78 descriptor fields: signed low byte, bits 8–15 width, and high uint32. It has no writer and makes no pose-validity claim. Corrected an initial byte-order issue before using fixture values: the parser's raw hex is byte-order text and must be reconstructed using `readBigUInt64LE`. The focused suite passes 3/3. Real fixture check, record 1 bone 1 (`0x1F4DA262FC146772`): descriptor 2 is `0x80000000000007F9`, therefore low signed byte `-7`, width `7`, high uint32 `2147483648`; the Group90 table has 45,376 addressable bits. This is a reproducible concrete starting point for the next read-only native decoder mirror.

## 2026-09-13 native AnimClip serializer confirmed

## 2026-09-13 native timing-prelude mirror and regression result

Extended the read-only native inspector with `decodeTimingPrelude`, a direct mirror of the observed `FUN_140002e50` prelude: it reads the stepped/explicit-length run flags, consumes explicit 16-bit lengths when present, then reads the 8-bit mode and reports the next Group90 bit offset. The focused inspector suite passes 4/4. On the real `test_anim.clips` record 1 fixture, the first schedule is one non-stepped run of length 111, mode 0, with the next read at bit offset 10. This is a measured decoder checkpoint only; it does not encode or mutate motion.

Exact regression command: `node --test @(rg --files tools -g '*.test.js')`. Result: **119 passed, 0 failed**. This proves the new inspector and all existing source-tool regressions remain green together. Next concrete action is to recover the native mode-dependent value expansion and descriptor semantics from the already-isolated Clips Editor analysis, while preserving the honest boundary that no modern semantic writer or playable 2K25 output exists yet.

## 2026-09-13 native scalar expansion checkpoint and public-source fallback

The decompiled native `FUN_140003530` path now provides a directly testable scalar formula: for a descriptor, packed channel values are expanded as `float(highUint32Bits) + packed * ((signedLowByte + 0x7F) * 0x800000)`. Added the read-only `decodeQuantizedValue` helper and regression coverage; it deliberately does not claim timing-cursor selection, quaternion assembly, or writing. The focused inspector suite is 5/5 and the complete source-tool suite is now **120/120**.

Per the capability-gap rule, a targeted public-source search was also performed for WWE `.clips`/Group90 encoders and 2K22 AMYM/TBUF writers. It found only structural/reference material (WrestleMINUS and older animation tooling), not a usable modern semantic encoder. This confirms the next work remains native decoder mirroring and controlled-pair measurement, not adopting an external writer or fabricating one from unrelated clips.

## 2026-09-14 native Clip Viewer playback observation

The user supplied a screenshot of the installed native Clip Viewer after opening the test asset. The model is visible in a bind/T-pose, but the playback timeline reads `0 / 0`; no animation frames were loaded. This is negative semantic evidence: the viewer invocation did not receive a decoded animation sequence, so the controlled Group90 mutation has not been validated as motion. Do not describe the structural mutation as playable. The next trace target is the missing selected-clip/ADEF-to-AnimationData handoff, followed by a fresh playback observation with a nonzero frame count.

The static `write_value failed` search reached `FUN_14001d4c0`, which is the inverse of the parsed AnimClip record: it writes the fixed fields from a 200-byte AnimClip state, then emits five vectors in this exact order: 64-bit track IDs (`field +0x18` vector), 32-bit Group38 (`+0x38` vector), 64-bit Group60 (`+0x68` vector), 64-bit Group78 descriptors (`+0x88` vector), and 64-bit Group90 words (`+0xA8` vector). It is native writer-side evidence for the same layout already reached through `FUN_1400023a0`; no guessed record ordering remains. The function serializes an already-populated AnimClip object, however. It does not show how to derive Group78 descriptors and Group90 data from arbitrary pose frames, so it is not yet a usable motion encoder or evidence that the repository can create playable 2K25 clips.

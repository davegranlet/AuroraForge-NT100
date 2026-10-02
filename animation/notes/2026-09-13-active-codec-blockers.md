# Aurora Forge — active codec blockers and next evidence

## Status

The project has a runnable, packaged 2K19-to-2K20 **YANM** bridge, but it
does not yet have a complete 2K19 event-file conversion or a usable modern
`.clips`/`.adefs` encoder. Do not substitute a target reference file, a
container rebuild, or a preview for either missing conversion stage.

## Evidence-backed current boundary

The controlled Victory event fixtures are:

| Asset | 2K19 source | 2K20 target |
| --- | --- | --- |
| 6100 | `D:\AuroraForge-Aug26\_work\2k19-victory-6100-event\00_0CE8FE35827FD8DE.unpacked.0fop` | `D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6100.evd` |
| 6101 | `D:\AuroraForge-Aug26\_work\2k19-victory-6101-event\00_0232F66D779E61F2.unpacked.0fop` | `D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6101.evd` |
| 6102 | `D:\AuroraForge-Aug26\_work\2k19-victory-6102-event\00_80CEF2F0274B4343.unpacked.0fop` | `D:\AuroraForge-Aug26\Extracted Files\2k20\Root\Animation\Victory\6102.evd` |

All 24 6100 0FOP index slots are populated. `tools/fop19-evd20-body-model.js`
reproduces controlled bodies 1–12 across all three fixtures, 6100 body 13,
6100 bodies 14–16, and 6100 bodies 17–18. It deliberately rejects all other
shapes. In particular, 6100 indices 0 and 19–23 are still unmodeled. A
whole-file EVD writer would therefore either omit motion information or need
target-derived bytes; neither is acceptable.

Validate that boundary with:

```powershell
node --test tools/fop19-reader.test.js tools/evd-reader.test.js tools/fop19-evd20-table-model.test.js tools/fop19-evd20-body-model.test.js
```

Expected result at this handoff: 26 passing tests. The full source-tools
regression command is:

```powershell
$tests = @(rg --files tools -g '*.test.js'); node --test $tests
```

Expected result at this handoff: 99 passing tests.

## What is missing

### 1. 0FOP-to-EVD semantic bodies and whole-file writer

The remaining bodies are not a repetition of the proven rebased-slot family.
Index 19 contains three vector groups and omitted/intermediate scalar fields;
indices 20–23 show different target field placement. Index 0 is a populated
record with a different header-like target layout. No source-derived EVD
envelope/body writer currently exists.

Smallest useful evidence:

1. Obtain at least two controlled 2K19-to-2K20 event pairs that differ in one
   entrance/victory camera/event parameter while retaining the same asset
   layout.
2. Extract their 0FOP payloads and paired EVD files read-only.
3. Use the existing readers to compare each remaining index; only implement a
   field mapping that reproduces every controlled pair and rejects different
   shapes.
4. Add a whole-file writer only after every populated required index, table
   field, fixed name/ID field, and payload boundary is source-derived.

### 2. 2K22-to-2K23 TBUF/ANIM payload encoding

The completed 2K22/2K23 Victory 6100 comparison has 16 blocks. Blocks 0–13
and 15 have byte-identical declared payloads; block 14 differs and grows from
135,104 to 138,048 bytes. The current tool is intentionally an identity-only
safety gate and refuses this conversion. No local or publicly located usable
TBUF/ANIM v10 semantic encoder was found.

Smallest useful evidence:

1. Create a controlled same-skeleton edit pair in a legitimate editor: change
   one joint on one frame, save 2K22 and 2K23 versions.
2. Preserve original and edited files.
3. Compare only matching TBUF block 14 declared payload ranges to derive
   descriptor/keyframe semantics.

### 3. Modern `.clips`/`.adefs` semantic output

`tools/clips-layout.js` can parse and rebuild real `.clips` containers with
correct 16-byte payload alignment. This is framing only. Group90 is proven to
be a stream of opaque fixed 8-byte entries in the sampled modern fixture; its
descriptor/keyframe meaning remains unknown. The Move Pack's `wwe.adefs`
cannot be inflated with zlib, raw deflate, gzip, Brotli, or a simple offset
zlib probe. The installed closed editors were not targetable through the
available automation surface, and the prior targeted public-source search
found no usable decoder/encoder.

Smallest useful evidence:

1. In Clips Editor or AnimationEditor, open one known modern clip.
2. Change exactly one joint at exactly one frame and export both before/after
   individual `.clip` files (and any changed `.adefs` file).
3. Keep the unedited original alongside the changed copy and record clip ID,
   joint, frame, and value.
4. Compare the pair to map the affected descriptor and Group90 entries.

## Portable app evidence

`app\dist\aurora-forge-converter 0.9.0.exe` was rebuilt on 2026-09-13 and is
76,050,907 bytes. A hidden launch check kept it running for five seconds before
it was stopped. This proves startup, not a UI-driven conversion or in-game
validation. The app only exposes the supported YANM bridge; it must not expose
the experimental event mapping as a completed feature.

## Do not do

- Do not copy 2K20 EVD or 2K23/2K25 reference payloads into output and call
  them converted.
- Do not use the historical Move Pack registration tables as replacements for
  current stock tables.
- Do not treat a `.clips` parser/rebuilder or FBX preview as modern motion
  conversion.
- Do not make a general formula from any one bounded 0FOP/EVD fixture family.

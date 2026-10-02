# Aurora Forge — direct codec checkpoint (paused)

## Reason for this handoff

The direct `2K19 -> 2K20 -> 2K22 -> 2K23/24 -> 2K25` codec work is paused by the user while the Blender-plugin route is investigated. This is a pause, not completion and not abandonment of the primary goal.

## What is proven

The bounded 2K19-to-2K20 bridge has a reproducible structural result for Victory 6100:

- Source: `analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`
- Required 2K20 reference: `D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin`
- Generated output: `D:\AuroraForge-Aug26\_work\app-milestone\victory-6100-2k20.yanm20.bin`
- Read-back result: 174,976 bytes; 63 records; 62 motion tracks; every 0x2100 track has both streams.
- Regression: `tools\convert-yanm19-to-yanm20.integration.test.js` passed as part of the full suite (71 passed, 0 failed).
- Packaged shell: `app\dist\aurora-forge-converter 0.9.0.exe` (76,049,705 bytes) starts and bundles the runtime tools.

This proves structural conversion and read-back for the bounded 62-track case. It does **not** prove 2K20 in-game playback.

## Exact direct-codec boundary

`tools\convert-acts22-to-anims23.js` is only an equal-size TBUF copier. It is not a 2K22-to-2K23 converter and must not be described as one.

For Victory 6100:

- 2K22 input: `D:\AuroraForge-Aug26\2k22-extracts\Root\Animation\Victory\6100.acts`
- It is a 393,244-byte AMYM asset with 16 TBUF/ANIM v10 blocks: fifteen 3-channel blocks and one 6-channel block.
- 2K23 comparison input: `C:\Games\2k23-extracts\Animation\Victory\6100.anims`.
- Only block 15 (the 6-channel block) is byte-identical. Blocks 0–13 have equal declared sizes but differing payloads; block 14 changes declared size.
- 2K22 and 2K23 decoded ADEF payloads differ in layout (45,208 vs 51,239 bytes), while all 49 printable identifiers overlap.

The missing codec problem is semantic TBUF/ANIM payload encoding; do not solve it with a reference clone, reframing, or block copy.

## Do not repeat

- Do not repeat the broad audits of `D:\WWE26-mods\compiled releases for review` or `D:\wwe 2k25 mods` without a new, recorded inventory method.
- Do not re-search for a public WWE 2K22 AMYM/TBUF/ANIM encoder; that search was already negative.
- Do not treat the existing modern `.clips` repackager or ADEF wrapper as a motion converter.

## Resume path

When the direct codec route resumes, start from this document and the canonical prompt. The first new technical task is to infer a semantic model for the differing 2K22/2K23 TBUF payloads using controlled data, not another filesystem scan.

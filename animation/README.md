# Aurora Forge WWE 2K19 Animation Research

This repository contains the source-side research tools for the WWE 2K19 to WWE 2K25/2K26 entrance and victory animation project.

Status: Research. The new-asset CAK mount path is proven, but no in-game converted animation has been validated.

## Current ability map

| Area | Current capability | Boundary |
|---|---|---|
| 2K19 source decoding | PAC/HSPC/SHDC/BPE inspection plus decoded YANM evidence for bounded entrance/victory specimens | Does not include proprietary game files |
| 2K19 to 2K20 bridge | Reference-assisted 62-track YANM20 writer, ACTS/EVD package-folder builder, batch package builder, and desktop app flow for the verified Victory 6100 path | File-level package validation is proven; in-game 2K20 playback still needs separate packaging/runtime proof |
| 2K22 TBUF/ANIM research | Native relocation model, corpus relocation report, offset-hypothesis tools, and descriptor/body scanners over the real 2K22 Victory corpus | Outer TBUF relocations are proven; inner descriptor semantics and writer are still research |
| 2K25/2K26 modern path | CAK mount/new namespace path is proven and modern `.clips`/`.adefs` container tools exist | No validated modern semantic motion encoder or visible in-game converted motion yet |

## Latest checkpoint — September 11, 2026

The first bounded 2K25 deployment gate has passed:

- An unused Victory slot, `6104`, was selected as a new asset namespace; no stock `6100` file was replaced.
- A working pair at `Root/Animation/Victory/6104.adefs` and `Root/Animation/Victory/6104.clips` was baked into a separately named mod CAK.
- The exact-build WWE 2K25 loader accepted that CAK (`accepted=3 rejected=0 failed=0`), the game reached the main menu, and it exited normally.

This proves that a newly named animation asset can travel through the normal mod-CAK mount path. Separately, the user verified a real in-game texture override with Aurora Forge's own loader. Delivery and visual override are therefore closed gates; do not reopen loader/Cakehook/package-format testing without a newly observed regression. What remains is a genuine converted-motion payload and its definition binding under a new namespace.

## Scope

- Inspect WWE 2K19 PAC/HSPC/SHDC/BPE containers.
- Compare WWE 2K19 entrance and victory structures against WWE 2K25 and WWE 2K26 animation files.
- Build repeatable analysis helpers for future conversion work.
- Keep the PAC explorer/rebuilder research and entrance/victory conversion research together as one project area.

## What Is Included

- Read-only research scripts.
- Blender helper source, where applicable.
- Human-written status notes and reproducible analysis descriptions.

## What Is Not Included

- WWE game files.
- Extracted PAC, CAK, animation, texture, or model payloads.
- Oodle DLLs.
- Third-party tool binaries or source dumps.
- Local path inventories.
- Decompiler projects.
- Generated build outputs.

## Current Findings

- WWE 2K19 PAC/HSPC extraction is understood well enough for read-only inspection.
- BPE decoding has a verified reference path for the tested entrance specimens.
- Several WWE 2K25 and WWE 2K26 animation pairs have been compared as structure references.
- Victory `6100` and `9100` research supplied useful crosswalk evidence.
- The 2K19→2K20 bridge now has a reference-assisted 62-track YANM20 writer with transform-family normalization evidence.
- WWE 2K22, 2K23, and 2K24 establish the intervening TBUF/ANIM container continuity; 2K25 target tracks are resolved against the modern animation dictionary.
- The remaining hard problem is authoring valid changed 2K25 clip payloads and matching `6104_*` definition bindings, then observing visible runtime motion.

## Next Gate

### Current conversion and runtime checkpoint

`tools/yanm-keyframes.js` is a self-contained structural keyframe reader with no sibling-project dependencies. It reads section length at `+4`, track count at `+10`, and section-relative offsets from `root + 8`. It supports the six record layouts encountered in the two victory specimens: `0204`, `0304`, `2200`, `2300`, `4300`, and `5300`.

Local specimen checks covered 30 decoded files, 33 YANM sections, and 354 tracks across victory 6100 and 9100. Every decoded timeline matched its declared frame count. Compact four-byte records retain the high time-word flag separately from the 15-bit delta. Packed values and candidate quantization fields remain uninterpreted: this proves source layout/timing consistency, not transform reconstruction or completed conversion.

Run `node tools/yanm-keyframes.js <decoded-motion.bin>` for a summary and `node --test tools/yanm-keyframes.test.js` for the eight synthetic bounds/layout regression tests. Game data is not included.

`tools/yanm20-encoder.js` provides the first writable 2K20 primitives: it encodes
signed triplet streams, verified 40-byte `0x2100` records, and complete embedded
YANM20 sections with self-consistent relative stream offsets. Header stream counts
are row counts (each row is 8 bytes); transform normalization and resampling remain
caller responsibilities.

`tools/yanm20-ir-writer.js` maps compatible neutral-IR tracks into those records.
It intentionally requires an explicit stream-B provider and four quantization
constants when the source IR does not contain them; this is the loss-prevention
gate before emitting a full 62-track body.

`tools/yanm20-reader.js` reads the same section form back for serialization
round-trip checks, including both packed streams and cumulative frame deltas.

For conversion against an existing licensed 2K20 asset, the IR writer also
supports reference-assisted output: it matches tracks by hash, takes stream B
and quantization fields from the verified 2K20 reference, and replaces only
canonical stream A from the source IR.

The end-to-end command is:
`node tools/convert-yanm19-to-yanm20.js <source19.bin> <reference20.acts.decoded.bin> <output.yanm20.bin> [section] [yanm-offset]`.
It preserves the reference section header and compact sentinel while emitting
the converted 62-track body.

In PowerShell, replace the placeholders with quoted paths; do not type the
angle brackets literally. Example:
`node tools/convert-yanm19-to-yanm20.js "D:\path\source19.bin" "D:\path\6100.acts.decoded.bin" "D:\path\converted.yanm20.bin"`

Immediate next step: use the existing 2K19 → 2K20 bridge writer as the source-side conversion path, then derive the corresponding changed modern `.clips` payload/descriptor encoding from a bounded 6100 reference. Bind that single changed candidate under the `6104_*` namespace and package it through the already-proven normal mod-CAK path. Do not reopen Cakehook, loader, CakeView, or texture controls, and do not label an unchanged reference clone as converted motion.

Prove one bounded conversion candidate locally:

1. Produce one changed small entrance or victory phase under a new namespace.
2. Package it through the already-proven normal mod-CAK path.
3. Test its registration and motion in-game.
4. Record whether it is selectable, loads, crashes, silently falls back, or visibly changes the target animation.

Until that succeeds, this project must remain Research.
# WWE 2K19 → WWE 2K20 animation bridge

## Runnable converter

For a quick user-facing walkthrough, see
[`docs/2K19-TO-2K20-CONVERTER-TUTORIAL.md`](docs/2K19-TO-2K20-CONVERTER-TUTORIAL.md).

For folder/batch package builds, see
[`docs/BATCH-2K19-TO-2K20-VICTORY-PACKAGES.md`](docs/BATCH-2K19-TO-2K20-VICTORY-PACKAGES.md).

## Desktop app

End users can launch the Aurora Forge desktop app with
`app\\start-aurora-forge.cmd`. On first run it installs the packaged Electron
runtime; subsequent runs open the dark Aurora Forge conversion interface.
The current app flow builds a 2K20 package folder for the verified Victory
`6100` path. Choose the decoded WWE 2K19 motion body, the matching 2K19 event
`0FOP`, a known-good 2K20 reference `6100.acts`, a known-good 2K20 reference
`6100.evd`, and an output folder. Press **Build 2K20 Package**. The app writes
`Root\\Animation\\Victory\\6100.acts` and `Root\\Animation\\Victory\\6100.evd`,
then reads both files back and displays the package validation metrics.

This app output is a generated 2K20 ACTS/EVD package folder. It is still not a
complete installable 2K20 mod package by itself; in-game 2K20 playback needs
separate packaging and runtime testing.

The current usable converter is the 2K19-to-2K20 bridge. It consumes one
decoded 2K19 YANM section and a decoded 2K20 reference section, then writes a
valid YANM20 binary with the source motion streams and reference quantization,
secondary-stream, record-order, and sentinel metadata.

```powershell
node tools/convert-yanm19-to-yanm20.js `
  <source-2k19-decoded.bin> `
  <reference-2k20-acts.decoded.bin> `
  <output.yanm20.bin> `
  [source-section] [reference-yanm-offset]
```

Defaults are section `0` and reference YANM offset `37212`. The source and
reference must have the same number and order of motion tracks. The command
fails on a mismatch instead of silently generating a misaligned animation.

Example using the validated 6100 inputs:

```powershell
node tools/convert-yanm19-to-yanm20.js `
  '<your Aurora Forge folder>\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin' `
  '<your 2K20 extract folder>\Animation\Victory\6100.acts.decoded.bin' `
  '<your output folder>\converted-6100.yanm20.bin'
```

Validated result: 174,976 bytes, 62 tracks, sentinel preserved, and readable
by `tools/yanm20-reader.js`. This bridge is not a WWE 2K25 `.clips` exporter;
the modern Group90 semantic encoder remains a separate implementation task.


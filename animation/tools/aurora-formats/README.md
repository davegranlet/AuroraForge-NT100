# AuroraForge format core

AuroraForge-owned format entry points for the P0/P1 research backlog. The core
is a library plus CLI; it is not a copy of any supplied binary.

## Implemented modules

| Module | Formats | Status |
|---|---|---|
| `jsfb.js` | JSFB FlatBuffers | structural reader/validator |
| `sdb.js` | SDB legacy/2K26 | index, decode, lookup, transform |
| `clips.js` | CLIPS | container parse/build/list/extract/inject |
| `adefs.js` | ADEFS v6 | zlib read/write; Oodle path gated |
| `tcaw.js` | TCAW CAS pack | read/write, AES-256-GCM + zlib, member preservation |
| `tdb.js` | TDB v5/v6 | read/write/merge, FNV asset GUIDs |
| `dds-meta.js` | DDS | header/DXGI metadata, FNV texture GUIDs |
| `mtls.js` | MTLS v6 | header/global-table/name/TOC read |
| `audio.js` | AKPK/WEM | PCK validate/build, WEM parse/build |
| `universe-profile.js` | Universe JSON | inspect/validate/merge-preserving |
| `profile-text.js` | Props/Arena profiles | lossless read/write |
| `cak.js` | CAK | re-exports existing CAK Foundry reader/builder/repacker |
| `detect.js` | all | signature/extension detection |
| `inspect.js` | all | structural inspect/validate facade |

`index.js` exports all modules.

## CLI

```powershell
node animation\tools\aurora-formats\aurora-format-tool.js detect <file>
node animation\tools\aurora-formats\aurora-format-tool.js inspect <file>
node animation\tools\aurora-formats\aurora-format-tool.js validate <file>
node animation\tools\aurora-formats\aurora-format-tool.js roundtrip <file>
```

`roundtrip` is implemented for text profiles; it parses and re-encodes in memory
and reports byte identity.

## Tests

```powershell
node --test animation\tools\aurora-formats\*.test.js
```

Coverage includes JSFB structure, SDB decoding, CLIPS, ADEFS, TCAW round-trip and
tamper rejection, TDB v6 round-trip/merge, DDS metadata, MTLS header parsing,
AKPK/WEM build, Universe profile merge/validation, and text-profile round-trip.

## Behavior

- Text profiles preserve BOM, line endings, record order, field order, unknown
  values, and final-newline state.
- TCAW uses AES-256-GCM with the format's derived key and zlib-compressed inner
  members; authentication failures are rejected.
- TDB writes entries sorted by asset GUID and supports v5/v6 entry sizes.
- Unknown formats fail closed; the CLI does not label unknown data valid.
- Oodle-compressed ADEFS reports `needs-codec` and requires explicit work/Oodle
  paths.
- No archive member is read, no image metadata is parsed, and no supplied
  program is executed.

## Limits

- MTL/MTLS parsing is header/name/TOC only; material property semantics and
  write-back are not implemented.
- TDB was validated with synthetic v6 data; no extracted TDB sample exists in
  the supplied physical trees.
- TCAW was validated with synthetic round-trips; no extracted `.tcaw` sample
  exists in the supplied physical trees.
- CAK writer parity remains the existing CAK Foundry scope and needs oracle-CAK
  fixtures.
- YCL, full MCD/MTLS semantics, group90 pose authoring, and full editor UI parity
  are not in this core.

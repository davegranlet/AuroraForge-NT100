# Aurora Forge cross-generation motion pipeline

Status: Research — no end-to-end mod CAK or in-game validation yet, 2026-09-11

## Objective

Convert a legally obtained WWE 2K19 entrance or victory motion through a staged chain:

```text
2K19 PAC/YANM
  -> 2K20 AMYM/YANM20
  -> 2K22 AMYM/TBUF v1 + ANIM v10
  -> 2K23 MINA/TBUF v1 + ANIM v10
  -> 2K24 MINA/TBUF v2 + ANIM v11
  -> 2K25/26 .clips + .adefs
```

The converter must not make each generation understand every other generation. Each adapter reads one format into the neutral IR or writes one format from the IR.

Only the final 2K25/26 artifact is a game-facing mod. The 2K20, 2K22,
2K23, and 2K24 adapters are offline conversion bridges: they do not require
Secure DataCtrlLink, a game install test, stock-file replacement, or an
intermediate CAK. The final writer emits a uniquely named mod CAK directly in
the target game's `mods` folder, beside `mods/manifest.json`, for mounting
through Secure DataCtrlLink; it must never emit or replace `bakedfile*.cak`.
It contains new `.clips` and `.adefs` animation assets derived from the 2K19
source. Stock 2K25/26 animations are reference templates only and must not be
replaced by this conversion pipeline.

## Neutral motion IR

The IR is intentionally loss-aware and keeps source evidence separate from target serialization:

```text
MotionAsset
  identity: event id, phase, role (body/facial/camera/prop/ring/auxiliary)
  timing: source frame fields, fps, duration, resampling policy
  tracks[]
    semanticName, sourceHash32, targetHash64
    channels[]
      channel kind, quantization, keyframes(frame, values), interpolation
  events[]
  references[] (ADefs names, props, cameras, ring resources)
  provenance: source format, adapter, confidence, evidence ids
```

Unknown fields remain explicit `unknown` values. An adapter may reject an asset when it cannot preserve a required field; it must not silently invent defaults.

## Adapter boundaries

| Adapter | Current state | Gate before implementation advances |
|---|---|---|
| 2K19 reader | Structural decode Ready | All required motion roles represented in IR |
| 2K20 reader/writer | Structural reader/writer prototype; semantic mapping Research | Round-trip one 62-track body plus auxiliary roles |
| 2K22 reader/writer | TBUF v1 structure Verified | Decode/encode channel payloads without changing declared sizes |
| 2K23 reader/writer | MINA wrapper and continuity Verified | Reuse 2K22 body codec behind wrapper adapter |
| 2K24 reader/writer | TBUF v2/ANIM v11 structure Verified | Isolate v2 header/codec delta from v1 payload model |
| 2K25/26 writer | Track identity and section layout Verified | Decode and encode Group90 packed stream and descriptors |

## Validation gates

1. Parse gate: source file is accepted only when all declared ranges and wrappers validate.
2. Identity gate: track names/hashes and role/phase assignments agree with evidence.
3. IR gate: no required track or event is dropped without a recorded diagnostic.
4. Serialization gate: output sizes, counts, hashes, and wrapper fields are internally consistent.
5. Round-trip gate: read(write(IR)) preserves semantic track order, timing policy, and event references.
6. Runtime gate: the developer validates the generated asset in the licensed game installation.

## Proof gate: still pending

The project remains **Research** until one bounded phase completes this exact
path: source conversion, final serialization as new 2K25/26 `.clips` and
`.adefs` assets, a uniquely named mod CAK in the game's `mods` folder, Secure
DataCtrlLink mounting through the manifest, and an in-game observation recorded
as load, crash, fallback, or visible animation change. Current work has passed
only offline structural checks; it has not produced or mounted a final mod CAK.

## Immediate implementation order

1. Finish the 2K19 → 2K20 neutral IR reader and writer for the 62-track body, including explicit auxiliary-stream providers and source quantization metadata.
2. Add 2K20 auxiliary-role readers and preserve unknown metadata losslessly.
3. Implement the shared TBUF v1 payload adapter used by 2K22 and 2K23.
4. Add the TBUF v2/ANIM v11 version branch for 2K24.
5. Complete the 2K25/26 descriptor and Group90 writer, then connect the final adapter.

This ordering keeps the already verified target work intact while making 2K20 the first writable milestone.

# 2026-09-11 extraction checkpoint

## Result

- The completed 2K25 animation export contains 54,371 JSON definitions.
- The global `ratanim` export contains no exact `6100_*` registrations. Its only matching records are `56100_0_0_0` and `56100_0_1_0`.
- Therefore the 6100 binding is owned by the Victory-specific definition/container, not by a global `ratanim` registration.
- `6104` is currently unused in `Root/Root/Animation/Victory`: neither `6104.clips` nor `6104.adefs` exists.
- The repository test suite passes: 64/64.

## Probe boundary

The first safe runtime candidate is a new `6104` Victory asset. It must be staged under a separate CAK source root and packaged as a new named mod archive. No stock `6100`/`6104` file may be replaced.

The remaining required editor operation is to clone the bounded 6100 definition and selected clip payloads under the `6104_*` namespace. The separate new-asset CAK mount is now proven; a valid 2K25-native namespace and an in-game registration/visible-motion result are still required before any conversion claim.

## Mod-CAK mount checkpoint

The new-asset probe was staged under `Root/Animation/Victory/6104.adefs` and `Root/Animation/Victory/6104.clips`, baked as the separately named `aurora-6104-probe.cak`, explicitly added to the 2K25 `mods/manifest.json`, and launched on September 11, 2026.

The exact-build loader log recorded `ACCEPTED CAK aurora-6104-probe.cak` and `accepted=3 rejected=0 failed=0`; the game reached the main menu and exited normally. This proves the separate mod CAK mount path for a new animation-named asset. It does not yet prove that `6104` is registered/selectable or that converted motion is visible, so the converter remains Research.

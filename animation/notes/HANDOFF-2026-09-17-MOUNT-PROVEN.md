# HANDOFF 2026-09-17 — mod mount proven on 2K20, motion verdict next

## Goal (unchanged)
Aurora Forge bridge 2K19→2K20→2K22→2K23→2K24→2K25, bidirectional end-state. Today: finish 19→20. Read `notes/ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md` handoff + `notes/LOG-*.md` sections (update-rule note in main log).

## Proven this session (evidence, not claims)
- OUR v6.8 packer: packs + unpacks byte-exact (`bakedfile06.cak`, OUR converted 6100.acts/.evd). 7 walls cleared, all in LOG-CAK.md.
- OUR 2K20 loader: identifies game, plugin accepted, manifest scanned.
- **Mount ACCEPTED**: `bakedfile06.cak`, accepted=1/0/0, game-side MountCakFn returned true.
- Loose files IGNORED by 2K20 (stock play with staged loose pair) — CAK+loader is the only route.
- TBUF child hash = CRC32C(lowercase bone) — 45-bone dictionary in `_work/crc-dictionary.json`.
- v2 converter: positional, 22 pairs, blast radius audited exact. v1 was a proven no-op (do not use).

## Staged right now (hashes)
- 2K20 `mods/bakedfile06.cak` = v2-converted content (override test). Manifest lists it.
- 2K20 `Animation/Victory/6100.acts/.evd` = loose 19→20 package (ignored, leave or remove).
- `_work/bakedfile06.cak` (v2 build master), `_work/vandal-staging/bakedfile06.cak` (zeroed-stream control).

## Next steps in order
1. Rock victory check on the CURRENT mount (v2 content, mounted+accepted). Changed = transfer proven. Stock = slots wrong (widen to chunk-slots/odd children) or keyframe streams needed.
2. If stock: vandal control (staged build exists) to split override-vs-slots.
3. New-ID path needs victory-index registration (2K22 hunt in LOG-REGISTRY.md; 2K20 equivalent unlocated).
4. 2K22 preview test blocked on animation-capable bake (external tools blind, proven).

## Key paths
- Sources: 2K20 `D:\WWE26-mods\extracts\2k20\Root`, 2K22 `D:\AuroraForge-Aug26\Extracted Files\2k22\Root`, 2K23 same parent, 2K25 `C:\Games\2k25-extracts\Root`, 2K26 `D:\WWE26-mods\extracts\Root`. Read-only; copy first.
- Games: 2K19/2K20 (`WWE2K20` no space!)/2K22 under `D:\Program Files (x86)\Steam\steamapps\common\`; 2K23 `C:\Games\WWE 2K23 Bad News U Pack`; 2K25 `C:\WWE 2K25 Saturday Nights Main Event`.
- External 2K22 baker: `D:\bot-crap\CakeToolsv098a\release` (animation-blind, verified).

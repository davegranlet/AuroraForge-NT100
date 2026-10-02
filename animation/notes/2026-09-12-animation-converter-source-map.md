# Animation converter source map — use before further extraction research

## 2K25 catalog and registration data

Additional read-only 2K25 root: `D:\WWE26-mods\extracts\Root`. Its `FilesysDescription.json` declares the `//wwe25/staging` stream and build `jenkins-wwe25-staging-wwe2k-1131`; its key catalog sizes match the paths below.

The following assets are known useful and must not be dismissed or rediscovered by broad scans:

| Purpose | Current 2K25 source | Evidence |
|---|---|---|
| Entrance catalog | `C:\Games\2k25-extracts\Root\Entrances\EntranceListData.jsfb` | Editor write target; FlatBuffer, 358,752 bytes. |
| Victory catalog | `C:\Games\2k25-extracts\Root\Entrances\VictoryListData.jsfb` | Editor write target; FlatBuffer, 33,208 bytes. |
| Entrance-to-motion mapping | `C:\Games\2k25-extracts\Root\Cutscene\ListData\EntranceMotionTableData.jsfb` | Explicit table name; FlatBuffer, 1,204 bytes. |
| General animation metadata | `C:\Games\2k25-extracts\Root\Animation\Data\GameAnimData.jsfb` | `Game` FlatBuffer. |
| Motion-area metadata | `C:\Games\2k25-extracts\Root\Animation\Data\MotionAreaData.jsfb` | `Moti` FlatBuffer. |
| Character move assignments | `C:\Games\2k25-extracts\Root\Roster\CharMoveSetDataTable.jsfb` | `Char` FlatBuffer, 5,498,944 bytes. |
| Motion parameters | `C:\Games\2k25-extracts\Root\Gameplay\MotionParameter\MotionParameterGroup.jsfb` | `GAME` FlatBuffer, 1,201,280 bytes, eleven root fields. |

## Known full registration/dependency context

The preserved successful modded-CAK oracle is:

`D:\AuroraForge-Aug26\25 bake folders\extracted-modded-cak`

It contains all nine known entrance/victory dependency files together:

1. `Entrances\EntranceListData.jsfb`
2. `Entrances\VictoryListData.jsfb`
3. `MoveData\CAMMoveData.jsfb`
4. `Roster\CharMoveSetDataTable.jsfb`
5. `Roster\CharProfilePro.jsfb`
6. `Roster\CharProfileTable.jsfb`
7. `Roster\FaceTextures.jsfb`
8. `Sdb\ENG.sdb`
9. `Hide\HideCtrlData.hidelink.jsfb`

It is evidence for registration/dependency packaging and must remain untouched. It has no `Animation/*.clips` or `.adefs` payload, therefore it cannot reveal modern semantic motion encoding.

## Current boundaries

- Do not replace full current catalog files with the historical TRIBUTE versions: they lack current template IDs including 1382, 1391, 1393, 1397, 1398, 1399, and 1402.
- The generic FlatBuffer inspector confirms table headers and root layouts but does not decode nested fields. The next catalog task is schema discovery or safe reconstruction for `EntranceListData`, `VictoryListData`, and `EntranceMotionTableData`.
- Motion registration and motion payload conversion are separate. A usable converter requires both the nine-file registration context (or a verified minimal subset) and a genuinely converted `.clips/.adefs` payload.

## Cross-version extraction roots currently available

- 2K20: `D:\WWE26-mods\extracts\2k20\Root` and `D:\games\2k20-extracts\animation-bridge`
- 2K22: `D:\AuroraForge-Aug26\Extracted Files\2k22\Root` (complete; the earlier `D:\AuroraForge-Aug26\2k22-extracts\Root` Victory 6100 fixture is byte-identical)
- 2K23: `D:\AuroraForge-Aug26\Extracted Files\2k23\Root` (current full root); the earlier `C:\Games\2k23-extracts\Animation` path is absent in this workspace
- 2K24: `D:\converter-files-usefull\drive-download-20260913T210407Z-1-001` (user-supplied read-only extraction subset with `Animation`, `AnimSystem`, `Entrances`, `Cutscene`, `MoveData`, `Sdb`, and `Hide`)
- 2K25: `C:\Games\2k25-extracts\Root`
- 2K19: bounded decoded Victory 6100 material in `analysis\victory-6100` in this repository, plus the installed game at `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19`.

## Directly verified cross-version table counterparts

| Version | Existing source assets | Why this is useful |
|---|---|---|
| 2K20 | `Entrances\EntranceListData.jsfb` (560,624 bytes), `Cutscene\ListData\EntranceMotionTableData.jsfb` (1,204), `Roster\CharMoveSetDataTable.jsfb` (2,846,548), `MoveData\CAMMoveData.jsfb` (1,589,028), `Roster\CharProfilePro.jsfb` (117,980) | Supplies an older catalog/motion/character-assignment layer for the first bridge. |
| 2K22 | `Animation\Data\GameAnimData.jsfb` (36) | Confirms the animation-metadata asset exists in the extracted 2K22 root, though its minimal size needs format inspection. |
| 2K23 | `Animation\Data\GameAnimData.jsfb` (344), `Animation\Data\MotionAreaData.jsfb` (20,648) | Paired metadata source for the 2K22-to-2K23 bridge investigation. |
| 2K24 | `Animation\Data\GameAnimData.jsfb` (344), `Animation\Data\MotionAreaData.jsfb` (20,660), `Entrances\EntranceListData.jsfb` (526,716), `Entrances\VictoryListData.jsfb` (23,016), `Cutscene\ListData\EntranceMotionTableData.jsfb` (1,204), `MoveData\CAMMoveData.jsfb` (5,554,312) | Read-only modern-generation reference. Its Victory 6100/6101/6102 `.anims` retain counterpart block topology but use TBUF v2 / ANIM v11 rather than 2K23's v1/v10; do not reframe or copy payloads. The 1,204-byte `EntranceMotionTableData.jsfb` is byte-identical to 2K25 (SHA-256 `2C7AF323AD54B00CB6294E9A7C472A0952D4B32AD0EEB5B862797362CAAF6955`), making it a stable registration anchor only. |
| 2K25 | Full catalog/dependency set described above | Target catalog, registration, and metadata reference. |

## Complete 2K20 extraction correction (2026-09-13)

Authoritative root: `D:\AuroraForge-Aug26\Extracted Files\2k20\Root`.

- `Animation` contains 6,844 files: 2,885 `.acts` motion assets, 2,811 `.evd` event assets, 1,080 `.jsfb` tables, and 66 `.mprms` parameter assets.
- Victory 6100 has a paired `Animation\Victory\6100.acts` (743,484 bytes) and `Animation\Victory\6100.evd` (20,546 bytes). The `.acts` file SHA-256 is `1E9C2EF712503BAEB2C8CE3A72D5ACFCEB7D21A43C570C6A5CE91D223053D429`, exactly matching the decoded reference already used by the 2K19-to-2K20 bridge.
- `CAM\MoveData.jsfb` exists (68,604 bytes), together with `Characters\Characters19Mapping.jsfb` (14,680 bytes) and `Characters\CharacterMapping.jsfb` (28 bytes). These are high-priority mapping candidates.
- `tools/evd-reader.js` now reads the evidence-backed 34-byte 2K20 EVD envelope: a little-endian `uint16` motion ID followed by a fixed 32-byte printable internal-name field. It has a real-fixture test against `6100.evd`, which reads ID `6100` and `6100_VIC_SINGLE_The_Rock_M_Face`, and preserves the remaining 20,512 bytes as opaque payload. This is an inspector boundary, not an event parser or writer.
- The current project has no complete EVD event-payload parser or writer. Controlled 2K19 source events are now available as extracted 0FOP fixtures (including Victory 6100, 6101, and 6102); the proven 0FOP index and body-layout work is recorded in the canonical continuation ledger. Do not clone `6100.evd` from the 2K20 reference and call it converted. The remaining event translation stage is the unmodeled semantic body layouts and a whole-file writer.
- Correction (2026-09-13): the installed 2K19 game already provides the Victory 6100 source event as `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19\pac\evt\06100.pac`. Read-only extraction to `D:\AuroraForge-Aug26\_work\2k19-victory-6100-event` yielded `00_0CE8FE35827FD8DE.unpacked.0fop`, a 20,620-byte source event payload. The event-record layouts on both sides remain undecoded; do not treat source presence as event conversion.
- Controlled 6100 pair finding (2026-09-13): stripping the 0x20-byte 0FOP prefix aligns 96.20% of bytes with the target EVD. 158 observed 32-bit and 42 observed 16-bit values are byte-order reversals. The nonmatching table metadata includes names and shifted offsets, so a safe writer must model those tables rather than use target-file bytes as replacement data.

# Extracted animation catalog sources — discovered 2026-09-12

This record corrects the prior assumption that the 2K25 extraction only supplied raw motion containers. The 2K25 root contains structured catalog tables that are directly relevant to animation selection and mapping:

- `C:\Games\2k25-extracts\Root\Entrances\EntranceListData.jsfb` — 358,752-byte FlatBuffer with nine root fields.
- `C:\Games\2k25-extracts\Root\Entrances\VictoryListData.jsfb` — 33,208-byte FlatBuffer with a nested root-table field.
- `C:\Games\2k25-extracts\Root\Cutscene\ListData\EntranceMotionTableData.jsfb` — 1,204-byte FlatBuffer with a nested root-table field.
- `C:\Games\2k25-extracts\Root\Animation\Data\GameAnimData.jsfb` — 464-byte `Game` FlatBuffer.
- `C:\Games\2k25-extracts\Root\Animation\Data\MotionAreaData.jsfb` — 20,696-byte `Moti` FlatBuffer with two root fields.
- `C:\Games\2k25-extracts\Root\Roster\CharMoveSetDataTable.jsfb` — 5,498,944-byte `Char` FlatBuffer.
- `C:\Games\2k25-extracts\Root\Gameplay\MotionParameter\MotionParameterGroup.jsfb` — 1,201,280-byte `GAME` FlatBuffer with eleven root fields.

The generic local FlatBuffer inspector at `D:\AuroraForge-Aug26\examples\MyGM-StartingCash-50M\tools\inspect_flatbuffer.py` verifies the root layouts but does not decode nested fields without a schema. The next required step is to find or reconstruct the schemas for `EntranceListData`, `VictoryListData`, and `EntranceMotionTableData`; do not dismiss these assets as irrelevant or re-run broad file inventories first.

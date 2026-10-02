# REGISTRY (split from ACTIVE log 2026-09-17)

## 2026-09-17 - SDB strings vs victory registry: strings confirmed, mapping still open (user-directed)

### SDB Editor domain (user: "we already have that in the sdb editor")
- Accepted: SDB Editor covers string editing. Verified hits are DIALOGUE/UI strings, not a registry: `RUBY RIOT`@855178 sits among MyRise story lines (next to `RUBY RIOTT 1`, BRAWL BEFORE WRESTLEMANIA mandates); `THE ROCK`@921551 among GM-mode/MyRise strings (next to THE ROCK '98 attire ref, UMAGA). No numeric IDs adjacent; no table structure. Strings alone cannot register new ID 6204.
- Victory registry (which IDs exist + which superstar uses which) is a separate binary mapping, still unlocated in 2K22. Ruled out: SDB strings, `Entrances/EntranceListData.jsfb` (no victory strings/IDs), Sdb/ languages, `Characters/100_The_Rock_2017/` (models/textures/hair only: .mdl/.mtls/.hpl/.ctg + Textures/, no moveset linkage).
- Remaining candidates for the mapping: `MoveData/*.jsfb` (AttackData/CAMMoveData/DamageLevelPresets + Havok/), `Roster/`, entrance/moveset stores. New-ID path blocked on this hunt; OVERRIDE path (6100) unaffected — still the immediate test.
## 2026-09-17 - 2K22 victory-list hunt: no separate file; schemas differ (user-directed)

### Solved 25/26 reference (tools/append_2k25_victory_entry.js, read fully)
- Clean-room FlatBuffer reader/writer for `VictoryListData.jsfb` (identifier `Vict`): root→wrapper→vector of 10-field records (wrestlerId u16, nameString u32, type u8, hideId u64, someId u32, victoryFace/Heel, titleFace/Heel, doubleTitle u32s). CLI clones an entry + appends with overrides. THIS is the solved "input new strings" for 25/26. 2K25 file lives at `Root\Entrances\VictoryListData.jsfb` (33,208B).

### 2K22 findings (all negative, all logged so future hunts skip them)
- NO separate victory list: `Root\Entrances\` = {CAE_TemplateDataLists, EntranceListData (553KB), SuperStarTronSetup} only. No `Vict` identifier anywhere in EntranceListData (nor in Roster CharMoveSet/CharProfile tables: identifiers `Char`/`Prof`).
- 2K22 `EntranceListData.jsfb` uses a DIFFERENT `Entr` schema: 2K25-pattern navigation (root→field0→wrapper→field0→vector) lands on count=0 at EOF. Needs its own schema map; do NOT assume field parity with 2K25.
- SDB strings (RUBY RIOT/THE ROCK hits) are dialogue/UI lines, not a registry. Character folders are models/textures only. `Animation\Data\` = 36B stub.

### Standing hypothesis + next step
- 2K22 victory linkage is either numeric refs inside `Entr` records / `CharProfileTable.roster.jsfb` superstar rows (most natural home: per-superstar victoryFace/victoryHeel fields — probe first profile record's scalars for 6100-range values next), or pure filename convention. The deliverable the user asked for ("input new strings into the victorylist for 2K22") is BLOCKED on locating the 2K22-side registry; the 25/26 writer adapts mechanically once found (same FlatBuffer idioms).
## 2026-09-17 - CharProfilePro = 2K20 victory registry (location proven, fields need nested decode)
- Paired victory u32s [6100,6100]+[8701,8703] adjacent to wrestlerId 100 (Rock), 208B-stride triple rows (attire variants). No top-level u32 refs anywhere; no name strings in any table (pure numeric).
- Index census: Prof 531 / CharPro 493 / CharMoveSet 522 / Entr 6 / Supe 389 / Play(FaceTextures) 285 / Cost 102 / CAtt 20845 / CMov 12940. No Vict ident in 2K20.
- EDITORS PLAN (user): moveset/entrance/victory entry managers. Groundwork recorded: CharProfilePro (victory pairs), CharMoveSetDataTable (moveset map), EntranceListData/Entr (entrance list), FaceTextures/Play (face index), AttackData/CAMMoveData (move defs). Rule for editors: preserve sizes/padding/unknown bytes on save (CactusBack pattern), clone-row for new IDs, never overwrite stock rows.
- Next: nested-decode Rock row via inspect_jsfb_vector --record/--depth to name exact victory field IDs.

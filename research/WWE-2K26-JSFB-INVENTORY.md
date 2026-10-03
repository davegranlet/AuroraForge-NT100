# WWE 2K26 JSFB Inventory

Source extraction: `D:\forge-files\tmp-full-v116-extract-fast`
Scan date: 2026-10-02
Totals: **23,295 `.jsfb` files across 57 top-level folders**

Format note: most JSFB tables begin with a 4-byte little-endian field followed by a
4-character identifier (`Entr`, `Vict`, `CMov`, `Char`, `Team`, `Musi`, `Cuts`,
`Cont`, `StCr`, `Logo`, `Supe`, ...). Per-asset files (`Game...`, `Aren...`,
`Effe...`, `Scre...`) are object/reference containers, not editable registries.

Capability legend: **W** = we already read+write/append, **R** = we read only,
**-** = no tooling yet, **X** = do not touch (hard constraint).

---

## 1. Registration / gameplay tables (highest editor value)

| File | Id | Size | Purpose | Ours |
|---|---|---|---|---|
| `Entrances/EntranceListData.jsfb` | Entr | 414 KB | Entrance registry: per-entry rows (id, name string, motion fields, section rows) that drive the Create-an-Entrance picker | **W** (find/edit/clone graph, converter + Entry Studio) |
| `Entrances/VictoryListData.jsfb` | Vict | 36 KB | Victory registry: victory motion rows per entry | **W** (append + clone graph) |
| `Entrances/SuperStarTronSetup.jsfb` | Supe | 20 KB | Per-superstar titantron/entrance presentation setup | - |
| `Cutscene/CutsceneNoRegistry.jsfb` | Cuts | 103 KB | Cutscene registry rows (cutscene picker list) | **W** (append/rename/locate via clips-codec) |
| `Cutscene/CdefDatabase.jsfb` | Cont | 170 KB | Cutscene definition database (per-cutscene asset refs) | - |
| `Cutscene/CsaDatabase.jsfb` | Cont | 323 KB | Cutscene state/animation database | - |
| `MoveData/CAMMoveData.jsfb` | CMov | 3.76 MB | Create-a-Move / move-assignment table (the "new menu slot" registration file) | **W** (append CAMMove entry) |
| `Roster/CharMoveSetDataTable.jsfb` | Char | 6.15 MB | Per-character move sets (full moveset graph) | **W** (append moveset slot) |
| `Roster/CharProfileTable.jsfb` | Char | 759 KB | Character profile table (ids, presentation refs) | **W** (append profile row) |
| `Roster/CharProfilePro.jsfb` | - | - | 2K25-era profile table; **not present in this 2K26 extraction** (renamed/removed) | - |
| `Roster/FaceTextures.jsfb` | - | - | 2K25-era face texture registry; **not present in this 2K26 extraction** (only a UI screen matches) | - |
| `Characters/CharacterMapping.jsfb` | Char | 68 KB | Character -> model/asset mapping | **W** (append mapping entry) |
| `Stable/TeamsTable.jsfb` | Team | 17 KB | Teams/stables registry | **W** (append team entry) |
| `Stable/StableAnnounceStrings.jsfb` | Stab | 5.6 KB | Stable name announcement strings | - |
| `Hide/HideCtrlData.hidelink.jsfb` | encrypted | 7.4 MB | Entitlement/hide-control data (what content is owned/unlocked) | **X** never touch (hard constraint); an append writer exists but is restricted |
| `Roster/WeightClassData.jsfb` | Weig | 316 B | Weight classes | - |
| `Roster/TagFinisherData.jsfb` | TagF | 664 B | Tag finisher definitions | - |
| `Roster/RefereeSelect.jsfb` | Refe | 3.2 KB | Referee selectable list | - |
| `Roster/LocationsData.jsfb` | StLo | 26 KB | Location table (backstage/arena locations) | - |
| `Roster/LocationsInfoData.jsfb` | StLo | 9.2 KB | Location metadata | - |
| `Roster/MoveSetComboLinkersTable.jsfb` | Move | 5.3 KB | Combo linker table | - |
| `Roster/MoveSetPatch.jsfb` | Move | 576 B | Moveset patch data | - |
| `Roster/InvalidMovesetMoves.jsfb` | Inva | 56 B | Invalid move filter | - |
| `Roster/PlayerDefaultRoster.jsfb` | Play | 788 B | Default roster | - |
| `Roster/SilhouetteTextures.jsfb` | Face | 352 B | Silhouette texture refs | - |

## 2. Audio / music

| File | Id | Size | Purpose | Ours |
|---|---|---|---|---|
| `Audio/MusicList.jsfb` | Musi | 66 KB | Music tracks (musicId, title, star) used by the entrance music picker | **R** (reader in list-2k25-options) - prime editor candidate |
| `Audio/AudioMoveData.jsfb` | Move | 489 KB | Move -> audio mapping | - |
| `Audio/WwiseEvents.jsfb` | Even | 16 KB | Wwise event table | - |
| `Audio/RingAnnouncer.jsfb` / `GCOM/RingAnnouncerData.jsfb` | Ring | 1.8 KB | Ring announcer data | - |
| `Audio/RosterConverter.jsfb` | Audi | 22 KB | Roster -> audio binding | - |
| `Audio/CustomPlaylists.jsfb` | Play | 52 B | Custom playlist hooks | - |
| `Audio/PyroSFXData.jsfb` | Data | 12 KB | Pyro SFX mapping | - |
| `Audio/AudioCASSoundIds.jsfb` / `AudioCABSoundIds.jsfb` | CASS/CABS | 33 KB | CAW/CA sound ids | - |
| `Audio/Voltage/VoltageData.jsfb` | Volt | 14 KB | Voltage audio data | - |
| `MSC/Global/Soundtracks.jsfb` | Soun | 928 B | Soundtrack list (menu music) | - |

## 3. Character / CAS / creation data

| File | Id | Size | Purpose | Ours |
|---|---|---|---|---|
| `CAS/SuperstarDataTable.jsfb` | Supe | 8.2 KB | Superstar CAS definitions | - |
| `CAS/BodyTypeMatrixData.jsfb` | Body | 31 KB | Body morph matrix | - |
| `CAS/CASBodySetDefinitions.jsfb` | Body | 3.2 KB | Body set definitions | - |
| `CAS/CasMenuPoseList.jsfb` | yCCa | 42 KB | CAS menu pose list | - |
| `CAS/DefaultCASData.jsfb` | Defa | 1.2 KB | CAS defaults | - |
| `CAS/NGSS_Setting.jsfb` / `NGSS_Setting_FTC.jsfb` | Supe | 44 KB / 1.6 MB | Next-gen superstar settings (full) | - |
| `CAS/PartMaterialData.jsfb`, `SuperstarHairMaterialData.jsfb` | Part | 1.2 KB | Part material bindings | - |
| `CAS/LicensedItemTable.jsfb` | Lice | 632 B | Licensed item table | - |
| `CAS/SampleData.sample.jsfb` | Samp | 1.1 MB | Sample CAS data | - |
| `Characters/CostumesTable.jsfb` | Cost | 34 KB | Costume/attire table | - |
| `Characters/_Global/CharacterTextures.jsfb` | Char | 1.8 KB | Character texture registry | - |
| `Characters/_Global/CharacterHairSettings.jsfb` | Hair | 1.5 KB | Hair settings | - |
| `Characters/_Global/BloodGroups.jsfb`, `BloodDecalPlacements.jsfb` | Bloo | 5.6 KB | Blood decals | - |
| `Characters/_Global/WrinkleDefinitions.jsfb` | Wrin | 1.6 KB | Wrinkle defs | - |
| `CAC/*` (6 files) | Belt/Logo | up to 584 KB | CAW belt plates, logo placement | - |
| `CAA/*` (5 files) | CAAPP/Logo | up to 80 KB | Create-an-Arena free camera + parameters | - |
| `CAE/CAEFreeCamera.jsfb` | CAEF | 1 KB | CAE camera | - |
| `CAM/MoveData.jsfb`, `PreviewData.jsfb`, `Features/SwapMoveSlotData.jsfb` | Move/CAMP | 12-14 KB | Create-a-Move data | - |

## 4. Match / rules / modes

| File | Id | Size | Purpose | Ours |
|---|---|---|---|---|
| `MatchCreator/MatchCreatorTables.jsfb` + `DisabledSettings/**` (37 files) | Matc/Opti | 73 KB + small | Match creator option tables and per-rule enable/disable flags (Blood, DQ, Falls, Weapons, WinConditions...) | - |
| `Rules/GameTypeData.jsfb` | Game | 28 KB | Game type definitions | - |
| `Rules/TagRuleData.jsfb` | TagR | 56 KB | Tag match rules | - |
| `SharedGameplay/MatchTypeData.jsfb`, `BaseMatchTypeData.jsfb` | Matc/Base | 3.9 KB | Match type data | - |
| `SharedGameplay/GameScoring/**` (10 files) | Game/Para | 10 KB | Scoring/reward params | - |
| `SharedGameplay/ModificationsAndStipulations.jsfb` | Mods | 844 B | Stipulations | - |
| `SharedGameplay/PropSetIDs.jsfb` | Aren | 804 B | Prop set ids | - |
| `GMMode/**` (30 files) | GMMo | up to 368 KB | MyGM mode data (dramas, perks, power cards, brands, booking) | - |
| `MyFMode/**` (7 files) | MyFa | small | MyFaction mode data | - |
| `Universe/DataTables/UniverseData.jsfb` | Data | 265 KB | Universe mode data | - |
| `Orion/**` (246 files) | Chun/XPDe | mixed | Orion (MyRise-like) hub data | - |
| `BattlePass/**` (5 files) | Batt | small | Battle pass tables | - |
| `Features/**` (2315 files) | Dyna/SMSt | mixed | Mode feature data (RISE, dynamic stories) | - |
| `Promo/**` (4 files) | Prom | small | Promo mode data | - |
| `GhostWriter/**` (18 files) | Talk/Matc | mixed | Story/talk system data tables | - |
| `Subtitles/**` (8 files) | Subt | up to 330 KB | Subtitle tables per mode | - |

## 5. Presentation / show / arena

| File | Id | Size | Purpose | Ours |
|---|---|---|---|---|
| `CreateShow/**` (33 files) | StCr/AnimN | up to 22 KB | Create-an-Show data: nameplates, designs, music, replay, transitions, commentary, watermarks | - |
| `CreateShow/NameplateData.jsfb` | StCr | 11 KB | Nameplate definitions | - |
| `CreateShow/EtcDesignData.jsfb` | StCr | 2.4 KB | Design catalog | - |
| `Arena/ArenaData.jsfb` | Aren | 87 KB | Arena registry | - |
| `Arena/ArenaList_DefaultDisplayedArenas.jsfb` | Aren | 240 B | Arena list ordering | - |
| `Arena/CAA_AssetsTables.jsfb` | Data | 104 KB | Create-an-Arena asset tables | - |
| `Arena/PartsPerformanceInfo_*.jsfb` (7 files) | yStP | 1-4 KB | Arena part performance metadata | - |
| `Arena/SlopeData.jsfb`, `SpecialArenasData.jsfb` | Slop/Spec | 11 KB | Arena slope/special data | - |
| `Arena/**` (1966 files) | Aren/Game | per-arena | Arena geometry groups, lighting, parts (per-asset) | - |
| `Environment/ArenaDefinition_*.jsfb` (586 files) | Aren | 0.3-1 KB | Per-arena environment definitions | - |
| `LightShow/**` (1250 files) | Pres | 1.5-5 KB | Lighting presets (entrances, shows) | - |
| `Program/Parameter/Light/*`, `PostEffect*`, `TitanUVScroll` | Ligh/Post | 60 B - 38 KB | Global light/effect parameters | - |
| `Curves/*` (7 files) | CuRv | small | Animation curves for props | - |
| `Logo/**` (57 files) | Logo | up to 349 KB | Logo/design catalogs (arena logos, designs, letters, crowd signs) | - |
| `Movies/MovieRegistry.jsfb`, `MovieDataTable.jsfb` | Movi | 153 KB / 177 KB | Movie/titantron registry + data | - |
| `Movies/ArenaTronPackages.jsfb`, `SuperstarTronPackages.jsfb` | Aren/Supe | 5.3/19 KB | Titantron packages | - |
| `MSC/Global/Soundtracks.jsfb` | Soun | 928 B | Menu soundtracks | - |
| `MSC/Credits/CreditsTable.jsfb` | Cred | 145 KB | Credits | - |
| `MSC/Global/Loading/*` | Load | 2.8 KB | Load screens/tips | - |

## 6. UI / systems (bulk, low editor priority)

- `UI/**` (2421 files) - screen layouts, 2K19/2K23 project screens, palettes; `Scre` containers.
- `Cutscene/**` (12,335 files) - per-cutscene `Tabl` metadata + `lightObjects` (one per cutscene id). The registry itself is `CutsceneNoRegistry.jsfb`.
- `Features/**` (2315), `Particle/**` (1054, `Part`/`Effe` configs), `StateMachine/**` (77, `Mach` flows incl. `WWEMain.jsfb` 239 KB), `CommonUI/**`, `Pedestrians/**`, `Audience/**`, `Props/**` (263 `Conf` configs), `AnimSystem` skeletons (`Skel`), `Animation/Data` (`GameAnimData`, `MotionAreaData`), `AI/**` behavior trees (`BeTr`), `Havok/**`, `IK/SlopeIK.jsfb`, `Alembic/AlembicRegistry.jsfb`, `Camera/**` presets, `Network/**` (community creations, live settings, release notes), `Global/**` (root tables, device profiles), `Sdb/StringDatabases.jsfb` (`Stri` pointer table - the real `ENG.sdb` lives inside `bakedfile03.cak` and we read/append names via `sdb-read.js`/`sdb-name.js`).

---

## Editor priority (what we can actually edit now)

**P1 - we have proven writers; wrap with UI:**
1. `EntranceListData.jsfb` + `VictoryListData.jsfb` - full entry editor (fields, name, motion, clone). Already used by Entry Studio; a standalone registry editor is the natural next step.
2. `CutsceneNoRegistry.jsfb` - cutscene picker row editor (add/rename/remove rows).
3. `CAMMoveData.jsfb`, `CharMoveSetDataTable.jsfb`, `CharProfileTable.jsfb`, `CharacterMapping.jsfb`, `TeamsTable.jsfb` - the registration graph writers; expose as a "new slot" wizard (create entry -> register everywhere).
4. `MusicList.jsfb` - read-only today; add an editor (musicId/title/star) once we confirm re-encode safety.

**P2 - plain tables, no writer yet, high value:**
- `CreateShow/*` (nameplates, designs, music), `Movies/MovieRegistry` + `SuperstarTronPackages`, `Arena/ArenaData` + `CAA_AssetsTables`, `CAS/SuperstarDataTable` + `NGSS_Setting`, `Roster/WeightClassData`/`TagFinisherData`/`RefereeSelect`, `MatchCreator` rules flags, `MSC/Soundtracks`.

**P3 - bulk/per-asset:** UI screens, cutscene per-file metadata, light shows, particles, AI trees, arena geometry groups.

**Never:** `Hide/HideCtrlData.hidelink.jsfb` (entitlement data).

Notes:
- `CharProfilePro.jsfb` and `Roster/FaceTextures.jsfb` from the 2K25 pipeline are **not present** in this 2K26 extraction; confirm whether 2K26 renamed them before porting those writers.
- `Sdb/ENG.sdb` is not in the extract; it is pulled from `bakedfile03.cak` (mount-order winner) and we read/append name strings there.

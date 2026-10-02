# HANDOFF - 2026-09-20 - bobnobob test CAK / menu registration

## Read this first

The user explicitly stopped loader/addon/core work. Do not resume DataCtrlLink diagnostic builds, addon builds, broad test suites, or loader timing work unless the user explicitly asks for it again.

The stale Codex goal for "Build and stage the matched Aurora Forge WWE 2K25 diagnostic addon/core pair..." was marked `blocked` because it conflicts with the user's newer instructions.

## Current user task

Use the new test CAK and its pre-bake folder to understand how added menu entries are registered. The user made the test entries in Tribute/CakeView and wants the data registration understood, not another loader rebuild.

## Current active test CAK

Active game mods folder:

`C:\WWE 2K25 Saturday Nights Main Event\mods`

Only active CAK observed after user prepared the new test:

`C:\WWE 2K25 Saturday Nights Main Event\mods\this-is-the-test.cak`

Size:

`33,445,345 bytes`

SHA-256:

`D11ADFC5BE741213EF25455F06065B0C8A21BBFDAAB3706CCD6BAA6663E69BAF`

Source folder before CakeView bake:

`D:\wwe 2k25 mods\TRibute-1.20\TRIBUTE 25 v1.20\TRIBUTE 25\BakeMe`

The CAK was extracted successfully with Foundry/FTribTool for inspection only.

Extraction root:

`D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\this-is-the-test-cak\extracted-root`

Catalog:

`D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\this-is-the-test-cak\catalog.json`

Full raw scan:

`D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\this-is-the-test-cak\full-14000-14005-scan.json`

Extracted catalog result:

- 129 files
- 82 folders

## Important verified finding

The baked CAK and the pre-bake folder match for the relevant structured files. CakeView did not drop the rows.

The user's later correction was: ignore the intended ID numbers and just look for `bobnobob <number>`.

## bobnobob strings

In:

`Sdb\ENG.sdb`

The five strings exist:

| String ID | Signed ID | Text |
|---:|---:|---|
| `4294957742` | `-9554` | `bobnobob 1` |
| `4294957743` | `-9553` | `bobnobob 2` |
| `4294957744` | `-9552` | `bobnobob 3` |
| `4294957745` | `-9551` | `bobnobob 4` |
| `4294957746` | `-9550` | `bobnobob 5` |

These labels resolve only in `ENG.sdb`, via the SDB id-key plus XOR decode (text is not stored as plaintext in the archive).

## Structured row mapping

### EntranceListData.jsfb

Path:

`Entrances\EntranceListData.jsfb`

Rows that reference bobnobob string IDs:

| Text | Row ID | Section | Index | Name String |
|---|---:|---:|---:|---:|
| `bobnobob 1` | `14000` | `8` | `673` | `4294957742` |
| `bobnobob 2` | `14001` | `8` | `674` | `4294957743` |
| `bobnobob 3` | `14002` | `8` | `675` | `4294957744` |

Full parsed entrance rows from the CAK:

```json
[
  {
    "section": 8,
    "index": 673,
    "id": 14000,
    "nameString": 4294957742,
    "type": 1,
    "hideId": null,
    "field4": 247,
    "field5": 502,
    "field6": 1152,
    "field7": 26008,
    "field8": 504,
    "field9": 30001
  },
  {
    "section": 8,
    "index": 674,
    "id": 14001,
    "nameString": 4294957743,
    "type": 1,
    "hideId": null,
    "field4": 390,
    "field5": 502,
    "field6": 1152,
    "field7": 26008,
    "field8": 638,
    "field9": 30001
  },
  {
    "section": 8,
    "index": 675,
    "id": 14002,
    "nameString": 4294957744,
    "type": 1,
    "hideId": null,
    "field4": 529,
    "field5": 504,
    "field6": 1160,
    "field7": 26007,
    "field8": 640,
    "field9": 30001
  }
]
```

### VictoryListData.jsfb

Path:

`Entrances\VictoryListData.jsfb`

Rows that reference bobnobob string IDs:

| Text | Row ID | Index | Name String |
|---|---:|---:|---:|
| `bobnobob 4` | `14003` | `654` | `4294957745` |
| `bobnobob 5` | `14004` | `655` | `4294957746` |

Full parsed victory rows from the CAK:

```json
[
  {
    "index": 654,
    "wrestlerId": 14003,
    "nameString": 4294957745,
    "type1": 1,
    "hideId": "7871869299616959835",
    "someId": 6229,
    "victoryFace": 6229,
    "victoryHeel": 8701,
    "titleVictoryFace": 8703,
    "titleVictoryHeel": 8712,
    "doubleTitleVictoryFace": 504,
    "doubleTitleVictoryHeel": null
  },
  {
    "index": 655,
    "wrestlerId": 14004,
    "nameString": 4294957746,
    "type1": 1,
    "hideId": "7871869299616959835",
    "someId": 6439,
    "victoryFace": 6439,
    "victoryHeel": 8701,
    "titleVictoryFace": 8703,
    "titleVictoryHeel": 8712,
    "doubleTitleVictoryFace": 638,
    "doubleTitleVictoryHeel": null
  }
]
```

## Meaning of the test

Actual test CAK mapping is:

- `bobnobob 1` -> Entrance `14000`
- `bobnobob 2` -> Entrance `14001`
- `bobnobob 3` -> Entrance `14002`
- `bobnobob 4` -> Victory `14003`
- `bobnobob 5` -> Victory `14004`

This means the test CAK demonstrates the menu-name registration pattern:

- The visible menu label comes from the JSFB row's `nameString`.
- `nameString` is the numeric SDB record key; the visible text is the XOR-decoded payload for that key, not a human-readable string in the file.
- For this test, Entrance rows are in `Entrances\EntranceListData.jsfb`.
- Victory rows are in `Entrances\VictoryListData.jsfb`.

Do not over-index on the user's earlier intended IDs `14003`, `14004`, `14005`; the user corrected that they messed up and wants to look for `bobnobob` plus number.

## Tools added during this session

These were added in the repo:

`tools\scan-cak-entry-graph.js`

- Scans every file in an extracted CAK root for raw ID/name/text byte patterns.
- Was used to create:
  `analysis\this-is-the-test-cak\full-14000-14005-scan.json`

`tools\stage-known-good-cak.js`

- Makes a known-good CAK the only active CAK by hash.
- It was added earlier during the confused phase.
- Do not use it unless the user asks to stage a specific CAK again.

`scripts\stage-public-tools.js`

- Was edited to include the newly added public tool.
- This edit may be unrelated to the current task and should be reviewed before any commit/release.

## Current game folder state

Last directly observed mods folder after user prepared the new test:

`C:\WWE 2K25 Saturday Nights Main Event\mods`

contained:

`this-is-the-test.cak`

No current loader launch was performed for this CAK by the assistant after this test analysis. Do not launch the game unless the user asks.

## Earlier accepted reference CAK

Earlier exact CAK:

`C:\WWE 2K25 Saturday Nights Main Event\mods\tribute-bake-test-sept19.cak`

SHA-256:

`CA5E5F6C229F268CCFB12D2E612E433FF19121946AFA79372585DFD48279100F`

It was accepted by the loader when it was the only active CAK:

```text
[2026-09-20 02:03:40] ACCEPTED CAK tribute-bake-test-sept19.cak
[2026-09-20 02:03:40] Completed ordered WWE 2K25 CAK mounts: accepted=1 rejected=0 failed=0
```

Do not restore this over `this-is-the-test.cak` unless the user asks.

## Do not repeat

Do not:

- Rebuild loader/addon/core.
- Reinstall `dinput8.dll`.
- Re-enable old diagnostic launch work.
- Create a new CAK unless explicitly asked.
- Run broad test suites.
- Replace the user's current test CAK.
- Narrow to only Victory/SDB without checking the whole archive if the user is asking about missing registrations.

## Comparison result (completed 2026-09-20) — CORRECTED

The earlier conclusion here ("registration is complete, no gap") was WRONG. The user corrected it: a new menu item is not just a row in VictoryListData/CutsceneNoRegistry. The user's working Tribute/CakeView bake touches MANY files.

Existing proof in the repo:

- `analysis\tribute-bake-test-sept19-cak\common-diffs.json` — 32 files differ between "working" (user's CakeView bake) and "ours" (converter bake).
- `analysis\tribute-bake-test-sept19-cak\reference-scan-working-vs-ours.json` — the name id `4294957742` is referenced in `Hide/HideCtrlData.hidelink.jsfb` in "working" but NOT in "ours".

The complete registration (name id spread across structured files) observed in the working bake:

- `Entrances\EntranceListData.jsfb` (Entr)
- `Entrances\VictoryListData.jsfb` (Vict)
- `Hide\HideCtrlData.hidelink.jsfb` (Data) — MISSED by our converter
- `Roster\CharMoveSetDataTable.jsfb` (Char) — MISSED
- `Roster\FaceTextures.jsfb` (Play) — MISSED
- `Cutscene\CutsceneNoRegistry.jsfb` (Cuts)
- `Roster\CharProfilePro.jsfb`, `Roster\CharProfileTable.jsfb`, `Characters\CharacterMapping.jsfb`, `MoveData\CAMMoveData.jsfb`, `Stable\TeamsTable.jsfb`, several `CreateShow\*.jsfb`, plus `Sdb\ENG.sdb`

Names are NOT stored as human-readable text: the label is a numeric string-id (e.g. `4294957742`, signed `-9554`) that points into an XOR-encoded `ENG.sdb` record. The id is what every table references; the visible text only exists as the decoded SDB payload for that id.

Conclusion: the converter under-registers. It must write the name id into ALL the above tables (not just VictoryListData/CutsceneNoRegistry/ENG.sdb) for a new slot to appear. This is the real blocker, independent of loader timing.


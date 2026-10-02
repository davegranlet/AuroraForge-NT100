# AURORA FORGE — MD READ STATUS (overnight job)

**Status: COMPLETE** — updated 2026-09-24 ~03:45

## What was done
1. **Inventory**: 1,387 .md files found (excl. node_modules/.git). 527 unique by content; 860 byte-identical duplicates in snapshots.
2. **forge2 audit (done + deleted per owner)**:
   - 105 files (incl. .git): 58 identical to flagship, 19 differ (all OLDER 09-04 vs flagship 09-17), 28 unique (2K26 release artifacts, PAC extracts, scripts).
   - All 47 non-identical files preserved to `AuroraForge_WWE_PC-Game_Modding_Tool\_forge2-merged-20260924\` (paths kept).
   - Diffs recorded: proxy.cpp +55/-16 lines (flagship newer), README +22/-13, build.ps1 +16/-7, package-release.ps1 -21 (flagship newer/simpler), docs +4..16 lines each.
   - **`forge2\` folder DELETED** (verified gone).
3. **Full read**: all 527 unique docs read completely by 8 parallel readers → `notes-batch-1..8.md` (346 KB total, every fact cited to its source file).
4. **Master compilation**: `C:\AuroraForge-Aug26\AURORA-FORGE-MASTER-KNOWLEDGE.md` (354 KB, 2,015 lines) = consolidated ANSWERS TO THE 10 QUESTIONS + all 8 batch notes.
5. **CLI search app (for the assistant)**: `AuroraForge_WWE_PC-Game_Modding_Tool\_md-search\mdsearch.js`
   - `node mdsearch.js search <terms> [--in pathPart] [--limit N]` — ranked search + snippets
   - `node mdsearch.js grep <regex>` — line-level regex
   - `node mdsearch.js show <pathPart>` / `headings` / `list` / `build` (rebuild index)
   - Index: 536 docs / 4.8 MB text (`index.json`).

## Key answers found (summary — full text in the master md)
- **Mandatory files**: Tribute 25 proven = 3 files (EntranceListData + VictoryListData + ENG.sdb); new imported motion adds CutsceneNoRegistry + clips/adefs (+ phase files). Full spread = 12+ tables (8 extended writers exist).
- **Templates**: clone sec8 row 1 "Dire Intentions" (entrance), Rock ID 100 (victory), template 6100 (cutscene), same-shape stock rows (extended 8).
- **Name id**: last SDB id + 1 in negative space (SNME: 4294957742 = -9554).
- **CAMMoveData**: motion/camera registration; clone entrance-class record (template motion 41525, vsize 116, osize 80), patch motion id.
- **Id rule**: SNME sec8 max + 3000 = 16086.
- **Entrance row**: f4=f5=own motion id; f6-f9 cloned.
- **Driver**: bakeme-orchestrator → Foundry bake-v93-cli/FTribTool (never rename CAK; BOM-free manifest).

## Files produced
| File | Purpose |
|---|---|
| `AURORA-FORGE-MASTER-KNOWLEDGE.md` | the ONE compiled md (answers + evidence) |
| `_md-search\mdsearch.js` + `index.json` | CLI search engine over all md |
| `_md-search\notes-batch-1..8.md` | per-batch evidence notes |
| `_md-search\batch-1..8.txt` | the read batches |
| `_forge2-merged-20260924\` | preserved forge2 differences/uniques |

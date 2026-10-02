# Aurora Forge repository and converter status

Generated from the working trees on 2026-09-12. This document distinguishes committed GitHub state from local uncommitted work.

## Animation repository: local versus GitHub

Repository: `https://github.com/davegranlet/Aurora-Forge-WWE2K19-Animation-Research.git`

| State | Result |
|---|---|
| Local branch | `main` |
| Local HEAD | `398643d Correct current animation research handoffs` |
| GitHub `origin/main` | `398643d Correct current animation research handoffs` |
| Tracked-file difference | None |
| Local-only work | `app/`, `blender_addon/aurora_2k19_fbx_export.py`, `convert-19-to-20.cmd`, and the untracked tools listed below |
| Modified tracked file | `README.md` |
| Test result | 70 passed, 0 failed |

The local implementation is not on GitHub. No local files were deleted or overwritten to force a match.

## Animation repository files and capabilities

### Desktop application

| Path | Function | Current capability |
|---|---|---|
| `app/main.js` | Electron main process and IPC | Runs the stage-one bridge and Blender FBX preview; packages local tools as extra resources |
| `app/preload.js` | Safe renderer IPC bridge | Exposes file pickers, save dialogs, conversion, FBX export, and log streaming |
| `app/app.js` | Renderer behavior | Mockup-style UI for selecting a 2K19 source, 2K20 reference, output path, running stage one, and exporting FBX |
| `app/index.html` | UI markup | Aurora Forge conversion lab shell; later stages are visibly gated |
| `app/styles.css` | UI styling | Dark Aurora Forge visual design based on supplied mockups |
| `app/package.json` | Desktop build | Electron portable Windows package configuration |
| `app/dist/` | Built application output | Existing portable build; it is not a full 2K25 converter |

### Conversion and packaging tools

| Path | Function | Current capability |
|---|---|---|
| `tools/aurora-converter.js` | CLI entry point | Dispatches only 2K19 → 2K20 |
| `tools/convert-yanm19-to-yanm20.js` | Stage-one converter | Converts a decoded 2K19 YANM section into a reference-assisted 2K20 YANM section |
| `tools/export-yanm-ir.js` | Source decoder | Exports decoded 2K19 motion into neutral IR; packed transform semantics remain unresolved |
| `tools/yanm20-reader.js` | 2K20 reader | Reads YANM20 records and packed streams |
| `tools/yanm20-encoder.js` | 2K20 writer | Writes validated 2K20 records and streams |
| `tools/yanm20-ir-writer.js` | 2K20 IR writer | Maps neutral IR into a verified 2K20 reference layout |
| `tools/yanm20-normalized-ir.js` | Normalization | Applies measured 2K20 signed-16 normalization only |
| `tools/convert-acts22-to-anims23.js` | 2K22 → 2K23 utility | Replaces equal-sized validated TBUF blocks; not a general retargeting converter |
| `tools/staged-pipeline.js` | Pipeline boundary | Executes verified 2K19 → 2K20 and stops explicitly before unimplemented 2K20 → 2K22 |
| `tools/clips-layout.js` | Modern container layout | Reads and rebuilds the observed 2K25/2K26 `.clips` framing and fixed sections |
| `tools/package-exported-clips.js` | Export packager | Packages individual Clips Editor `.clip` exports into a structurally valid `.clips` container; does not convert motion semantics |
| `tools/adefs-container.js` | ADEF envelope | Reads/writes the version-6 zlib ADEF wrapper |
| `tools/adefs-json-export.js` | ADEF export | Reads exported ADEF definitions and bounded identifier data |
| `tools/clips-controlled-diff.js` | Evidence tool | Compares controlled `.clips` files and reports changed byte runs and TBUF metadata |

### Modern animation research and codec primitives

| Path/group | Function | Current capability |
|---|---|---|
| `tools/amym-tbuf-report.js`, `tbuf-v1.js` | TBUF/AMYM readers | Validates observed TBUF wrappers and blocks |
| `tools/group90-entries.js`, `group90-encoder.js` | Group90 fixed entries | Lossless fixed-entry parsing/encoding primitives |
| `tools/group90-uleb.js` | Group90 token primitive | ULEB token encode/decode and boundary validation |
| `tools/group90-descriptor-ranges.js`, `group90-token-index-map.js` | Descriptor analysis | Correlates descriptor references to Group90 token ranges |
| `tools/group90-segment-summary.js`, `score-group90-op0.js` | Codec research | Summaries and candidate scoring; not a verified semantic codec |
| `tools/yanm20-2k25-*.js` | Cross-generation analysis | Track, family, lattice, and Group90 correlations; no complete modern writer |
| `tools/tbuf-block-compare.js`, `tbuf-corpus-continuity-report.js` | Corpus comparison | Structural continuity and block comparison |

### 2K25 asset and binding tools

| Path | Function | Current capability |
|---|---|---|
| `tools/append_2k25_victory_entry.js` | Victory list writer | Appends a new FlatBuffer victory entry |
| `tools/append_2k25_entrance_entry.js` | Entrance list writer | Appends a new FlatBuffer entrance entry |
| `tools/append_2k25_entrance_clone_graph.js` | Entrance graph utility | Clones/extends an entrance graph |
| `tools/append_2k25_entrance_preserving_graph.js` | Graph-preserving utility | Appends while preserving existing graph data |
| `tools/append_2k25_sdb_string.js` | SDB writer | Appends a string record to the observed SDB format |
| `tools/prepare-6104-editor-import.js` | Editor preparation | Renames/copies exported definitions and clips into a new namespace; it does not encode motion |
| `tools/build_2k25_entrance_partition_map.js` | Partition analysis | Builds partition metadata |
| `tools/build_2k19_2k25_victory_crosswalk.js` | Crosswalk analysis | Correlates source and target victory identifiers |

### Inspection, extraction, and test support

The remaining tools are research/inspection utilities: `inspect_2k19_archive.js`, `inspect_2k19_shdc.py`, `extract_2k19_archive_entries.js`, `extract_2k19_pac.py`, `parse_2k19_cae_menu.py`, `parse_2k25_victory_list.js`, `decode_2k19_menu_payloads.js`, `decode_adefs_wrapper.js`, `inspect_jsfb_vector.js`, `fnv-track-resolve.js`, `yanm-keyframes.js`, `yanm20-bridge-inspect.js`, `yanm20-body-table-report.js`, `yanm20-locate-body-table.js`, `yanm20-stream-classify.js`, `yanm20-normalization-score.js`, `yanm20-normalization-sweep.js`, `summarize-track-descriptor-patterns.js`, `compare-motion-metadata.js`, `scan-clips-corpus.js`, `pretty-jhips-report.js`, and their associated tests.

These tools provide evidence and format validation. They do not constitute the missing 2K20 → 2K22, 2K23/24 → 2K25, or modern semantic payload encoder.

## Related repositories in `D:\AuroraForge-Aug26`

Collected with `git remote`, `git branch`, `git log`, and `git status` on 2026-09-12. `Dirty:True` means local modifications or untracked files exist.

After fetching each repository's `origin`, every listed local branch was exactly even with its corresponding `origin/<branch>`: `Ahead=0`, `Behind=0`. Differences are therefore working-tree changes, not unpushed local commits.

| Local repository | Branch | GitHub remote | HEAD | Dirty |
|---|---|---|---|---|
| `Aurora-CAK-Foundry` | `main` | `davegranlet/Aurora-CAK-Foundry` | `4a33186 Add headless WWE 2K25 baking CLI v1.7.9.b` | Yes |
| `Aurora-Forge-CAK-Mod-Loader` | `main` | `davegranlet/Aurora-Forge-CAK-Mod-Loader` | `185fe1f Prepare immutable v1.0.01 RC1 package` | Yes |
| `Aurora-Forge-CAK-Mod-Loader-WWE2K25` | `main` | `davegranlet/Aurora-Forge-CAK-Mod-Loader-WWE2K25` | `48ae4b4 Merge pull request #1 from davegranlet/test/changed-content-override-runner` | No |
| `Aurora-Forge-Custom-Music-Loader` | `main` | `davegranlet/Aurora-Forge-Custom-Music-Loader` | `0cfa918 Prepare immutable v1.0.01 RC1 package` | Yes |
| `Aurora-Forge-Custom-Music-Loader-WWE2K25` | `main` | `davegranlet/Aurora-Forge-Custom-Music-Loader-WWE2K25` | `d00f516 Prepare WWE 2K25 custom music research snapshot` | No |
| `Aurora-Forge-DDS-Converter` | `feature/wwe2k19-motion-export-import` | `davegranlet/Aurora-Forge-DDS-Converter` | `17bdd51 Add bounded ULEB128 motion token scanner` | No |
| `Aurora-Forge-Knowledgebase` | `main` | `davegranlet/Aurora-Forge-Knowledgebase` | `08d2678 Lead project records with verified complete-game support` | No |
| `Aurora-Forge-Research` | `main` | `davegranlet/Aurora-Forge-Research` | `bf71a04 Establish private research repository policy` | No |
| `Aurora-Forge-WWE2K19-Animation-Research-Public` | `main` | `davegranlet/Aurora-Forge-WWE2K19-Animation-Research-Public` | `d2f78f0 Define public historical research archive` | No |
| `AuroraForge_WWE_PC-Game_Modding_Tool` | `agent/rc1-tutorial-automation` | `davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool` | `af681ae Record desktop cleanup hygiene` | Yes |
| `DataCtrlLink-MusicOnly` | `main` | `davegranlet/Secure-DataCtrlLink-WWE2K26` | `5555813 Package the core loader without bundled addons` | Yes |
| `Secure-DataCtrlLink-WWE2K25` | `main` | `davegranlet/Secure-DataCtrlLink-WWE2K25` | `1d479e9 Merge pull request #2 from davegranlet/feature/exact-mod-cak-collision-guard` | No |
| `tmp-wrestleminus-public` | `master` | `pozzum/WrestleMINUS` | `905b2ca Views split out & Frosty Removed` | No |
| `WWE2K19-to-2K26-Entrance-Prototype` | `main` | `davegranlet/Aurora-Forge-WWE2K19-Animation-Research` | `398643d Correct current animation research handoffs` | Yes |

## Requirements audit for the requested converter

| Requirement | Evidence | Status |
|---|---|---|
| 2K19 → 2K20 conversion | `convert-yanm19-to-yanm20.js`; existing `converted.yanm20.bin`; 70-test suite | Implemented/tested for the bounded 62-track case |
| 2K20 → 2K22 conversion | No converter or verified writer found | Missing |
| 2K22 → 2K23/24 conversion | Only equal-size TBUF copier exists | Missing as a general converter |
| 2K23/24 → 2K25 conversion | No verified writer exists | Missing |
| Modern `.clips` output | `clips-layout.js`, `package-exported-clips.js` | Container packaging works; semantic conversion missing |
| Matching `.adefs` output | ADEF envelope and JSON readers exist | Binding/writer for converted motion missing |
| End-user desktop app | Electron app and portable build exist | UI exposes only stage one and preview FBX |
| Runtime in-game proof | New-asset CAK mount accepted | Converted motion selection/visible playback not proven |

## Bottom line

The current code is a research/partial-converter repository, not a complete staged converter. The local implementation and GitHub currently match at the last committed point, while the app and recent tools remain uncommitted local work. The missing deliverable is the verified cross-generation motion codec and its integration into the staged desktop pipeline.

### Stage-one app milestone update — 2026-09-12

The immediate 2K19→2K20 desktop path now has concrete end-to-end evidence: the authoritative Victory 6100 source converted to `D:\AuroraForge-Aug26\_work\app-milestone\victory-6100-2k20.yanm20.bin` (174,976 bytes, 62 tracks, 63 records); the output was successfully read back by `yanm20-reader.js` and every track had both streams. The Electron conversion IPC now performs that read-back validation and returns real output metrics to the renderer. A new integration test covers this conversion path, and the rebuilt portable executable started successfully with the required conversion tools bundled. This is structural/file-level validation, not in-game 2K20 playback validation.

The complete post-change primary test suite passed 71/71 on 2026-09-12.

### 2K22/2K23 bounded continuity update — 2026-09-12

The actual 2K22 Victory 6100 asset is a 393,244-byte AMYM file with 16 validated TBUF/ANIM v10 blocks. Against the matching 2K23 Victory 6100 MINA wrapper, only the six-channel block is byte-identical. Fourteen three-channel blocks have equal declared lengths but non-identical payloads, while another changes declared length from 135,104 to 138,048 bytes. Therefore the existing same-size block copier is only a structural experiment and cannot be represented as a 2K22→2K23 motion converter.

## External asset and tool audit for the immediate 2K19 → 2K20 → 2K22 target

Audited on 2026-09-12. Source trees were read-only during the audit.

### `D:\WWE26-mods\compiled releases for review`

Inventory: 3,875 files, approximately 14.43 GB.

| Path | Evidence | Usefulness |
|---|---|---|
| `Tools - Addons\AnimationEditor_26_V2.2\AnimationEditor\AnimEditor.exe` | Binary contains `.adefs`, `tbuf`, `Anim`, load/save/export strings | High for observing the modern ADEF/TBUF editor workflow; closed executable, no source or documented CLI found |
| `Tools - Addons\Clips Editor v2.21\Clips Editor v2.21\Clips Editor.exe` | Binary contains `.clips`, `.adefs`, TBUF, ANIM, Import, Export, Save, Load strings | High for controlled modern clip export/import experiments; playback viewer is not a semantic codec or command-line bridge |
| `Tools - Addons\Discovery Meta\Discovery Meta\data\WWE 2K22\` | `EntranceMotions.dat`, `VictoryMotions.dat`, `VictoryChampions...` | High for 2K22 motion ID/name crosswalks and selecting matching test assets; not itself a motion payload writer |
| `Tools - Addons\Discovery Meta\Discovery Meta\data\WWE 2K23` through `WWE 2K26` | Per-version entrance/victory motion data | Medium for later target crosswalks; not required for the immediate 2K22 bridge |
| `Tools - Addons\Blender Addon_v2.10.3\WWE2K_MDL` | Blender/Yukes PAC and model scripts | Low for the 2K20→2K22 binary bridge; useful only for skeleton/model visualization |
| `Tools - Addons\blender\Cakewview 1.14.1` | CakeView, CakeInstaller, MaterialEditor, SDBEditor, logs | Low for motion codec; primarily model/material/CAK tooling |
| `Tools - Addons\CakeTools2021_v0977a (1)` | CakeTools, Qt3D animation library, geometry loaders | Low for game motion payload conversion; useful for model inspection |
| `TRIBUTE 26 v1.5.1` | Mod/bake utility and help files | Medium for final packaging context, not the missing motion encoder |

Important negative result: the scanned CakeView/CakeTools/Blender packages did not expose a 2K20 YANM or 2K22 TBUF semantic animation writer. The AnimationEditor executable is the strongest lead in this tree, but it is closed-source and must be investigated through controlled file exports rather than assumed to be callable as a library.

### `D:\wwe 2k25 mods`

Inventory: 83,977 files, approximately 186.65 GB.

| Path | Evidence | Usefulness |
|---|---|---|
| `extracts\Animation\Acts\` | 392 `.clips` files, including `Basic\MotionArea_*.clips` | High modern corpus for container, record, descriptor, timing, and track comparisons |
| `extracts\Animation\animbanks\` | 78 `.clips` files, including `ingame\general_purpose\test_anim.clips` | High for small controlled modern samples and bank-level structure |
| `extracts\Animation\Entrance\` | Modern entrance animation hierarchy | High for identifying entrance-specific 2K25 bindings and test candidates |
| `extracts\Animation\Victory\` | Modern victory animation hierarchy | High for the immediate victory-6100/6104 probe |
| `extracts\Animation\Data\` | Animation metadata/data | Medium to high for ID and binding crosswalks |
| `adefs\` | 15,752 `.adefs` files in the complete tree | High for ADEF schema, descriptor, and binding corpus comparisons |
| `AnimationEditor\AnimationEditor.exe` | Same modern editor binary family as the compiled-release copy | High for controlled editor export/import; no source/CLI established |
| `usefull 2k stuff\CakeView_1.6.9_ModelFormat...` | CakeView model-format tool | Low for animation payload conversion |
| `usefull 2k stuff\WWE2K_ArenaFX_Blender_Addon` | Arena lighting/model Blender scripts | Low for binary animation bridge |

Important positive result: this tree contains enough modern `.clips`/`.adefs` corpus to support a bounded 2K22/modern comparison. It should be treated as the primary corpus for codec discovery, while the existing 2K19 and 2K20 extracted samples remain the source-side references.

### Installed/extracted game paths relevant to the bridge

| Path | Current evidence | Role |
|---|---|---|
| `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19` | Installed game with PAC content and movie references | Source game; decoded 2K19 SHDC/YANM working files are already in the Aurora Forge work area |
| `D:\Program Files (x86)\Steam\steamapps\common\WWE2K20` | Installed game; `AnimSystem\ratanim.bin` exists; victory/entrance movie references exist | Required runtime/reference installation for stage one and 2K20 asset correlation |
| `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22` | Configured path exists but targeted animation search returned no files | 2K22 runtime/content path needs separate verification before runtime testing; it cannot currently be treated as an available 2K22 loader path |
| `D:\AuroraForge-Aug26\2k22-extracts` | Extracted 2K22 Root tree exists | Primary 2K22 data source for format/crosswalk work |
| `D:\AuroraForge-Aug26\2K20-Victory-6100-Test` | Existing `converted.yanm20.bin` and BakeMe output | Verified stage-one test area; do not recreate |

## Prioritized next work from this audit

1. Use the small modern sample `extracts\Animation\animbanks\ingame\general_purpose\test_anim.clips` plus its matching ADEF data to establish a compact cross-version record/descriptor corpus.
2. Use Discovery Meta's WWE 2K22 entrance/victory data to select a specific 2K22 motion ID corresponding to the existing 6100 test family.
3. Locate the matching 2K22 extracted ACTS/ANIM payload under `D:\AuroraForge-Aug26\2k22-extracts` and compare its TBUF records against the 2K25 corpus.
4. Investigate AnimationEditor through controlled exports/imports only; do not assume its strings prove a reusable codec.
5. Implement the 2K20→2K22 writer only after the 2K22 payload structure is confirmed against an actual 2K22 sample. Then add it to `staged-pipeline.js` and the desktop app.

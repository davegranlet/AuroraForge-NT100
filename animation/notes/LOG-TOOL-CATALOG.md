# TOOL-CATALOG (split from ACTIVE log 2026-09-17)

## 2026-09-15 Complete Script Catalog

### Core Format Libraries (Binary Readers/Writers)

| File | Description | Tests |
|------|-------------|-------|
| `tbuf-v1.js` | TBUF v1/ANIM v10 block reader, encoder, and same-size payload replacer | Yes |
| `yanm-keyframes.js` | YANM keyframe decoder — preserves packed values, no semantic interpretation | Yes |
| `yanm20-reader.js` | YANM 2K20 section decoder — reads stream records from YANM blocks | Yes |
| `yanm20-encoder.js` | Low-level YANM 2K20 encoder primitives for normalized stream rows | Yes |
| `yanm20-ir-writer.js` | Converts YANM20 IR back to binary records using encoder/reader | Yes |
| `yanm20-normalized-ir.js` | Normalized YANM20 IR builder — extracts source rows from track triples | Yes |
| `amym-container.js` | 2K22 AMYM directory envelope reader/writer (group count at offset 4) | Yes |
| `amym-tbuf-report.js` | Scans AMYM buffers for TBUF block markers and reports wrapper metadata | Yes |
| `evd-reader.js` | EVD FlatBuffer binary reader (34-byte header, 32-byte name) | Yes |
| `fop19-reader.js` | 2K19 0FOP archive format reader — parses prefix, inner header, entry table | Yes |
| `fop19-evd20-table-model.js` | 0FOP→EVD table entry mapping model (measured against 6100/6101/6102) | Yes |
| `fop19-evd20-body-model.js` | 0FOP→EVD body layout converter (limited to 6100/6101/6102 body format) | Yes |
| `adefs-container.js` | 2K25 per-animation .adefs zlib envelope decoder | Yes |
| `clips-layout.js` | 2K25/2K26 .clips container structure reader | Yes |
| `clip-control-pair.js` | Reporter for two .clip records from controlled editor operation | Yes |
| `clips-native-inspect.js` | Read-only inspection helpers mirroring native Clips Editor reads | Yes |
| `group90-entries.js` | Group90 fixed 8-byte entry table reader/encoder | Yes |
| `group90-uleb.js` | ULEB128 BigInt decoder for Group90 token streams | Yes |
| `group90-encoder.js` | Generic lossless ULEB128 token encoder | Yes |
| `group90-descriptor-ranges.js` | Computes byte ranges for Group90 descriptor start fields | Yes |
| `group90-segment-summary.js` | Summarizes Group90 segment byte distributions | Yes |
| `group90-token-index-map.js` | Maps Group90 token references with surrounding context | Yes |
| `fnv-track-resolve.js` | FNV1a-64 hash-based track name resolver for .clips entries | Yes |
| `victory-list.js` | Structural reader for the Vict FlatBuffer catalog | Yes |
| `entrance-motion-table.js` | Bounded reader for the Entr FlatBuffer (2K24/2K25 entrance-motion) | Yes |
| `adefs-json-export.js` | Reads 64-bit identifiers from Animation Editor JSON exports | Yes |
| `adefs-symbol-compare.js` | Extracts ASCII identifier strings from .adefs buffers | Yes |

### Converter Pipeline

| File | Description | Tests |
|------|-------------|-------|
| `convert-yanm19-to-yanm20.js` | Main 2K19→2K20 YANM animation converter | Yes |
| `convert-acts22-to-anims23.js` | Safety gate for 2K22→2K23 — only copies byte-identical TBUF payloads | Yes |
| `patch-acts20-yanm.js` | Patches YANM section into decoded ACTS binary at a given offset | Yes |
| `build-2k19-to-2k20-victory-package.js` | Builds complete 2K19→2K20 victory package (ANIM + ACTS + EVD) | Yes |
| `batch-2k19-to-2k20-victory-packages.js` | Batch processor for multiple 2K19→2K20 victory packages | Yes |
| `aurora-converter.js` | CLI entry point for the Aurora Forge animation converter (19→20 only) | No |
| `staged-pipeline.js` | Multi-stage pipeline orchestrator (19→20→22→23→25); only verified writers execute | No |
| `export-yanm-ir.js` | Exports neutral source-only YANM intermediate representation | No |
| `package-exported-clips.js` | Packages individual .clip exports into a valid .clips container | No |

### TBUF v1 Research & Analysis

| File | Description | Tests |
|------|-------------|-------|
| `tbuf-v1-track-probe.js` | Probes TBUF v1 track structures with SHA-256 hashing and payload analysis | Yes |
| `tbuf-v1-relocations.js` | Read-only model of WWE2K22 FUN_1405c15c0 — resolves self-relative pointers | Yes |
| `tbuf-v1-relocation-report.js` | Generates relocation report across a directory of TBUF blocks | No |
| `tbuf-v1-body-prefix-corpus.js` | Collects 64-byte prefixes from TBUF body payloads for pattern analysis | Yes |
| `tbuf-v1-body-offset-hypotheses.js` | Tests competing address interpretations for TBUF body pointer fields | Yes |
| `tbuf-v1-body-candidate-record.js` | Builds candidate record models from TBUF body payloads with marker detection | Yes |
| `tbuf-corpus-continuity-report.js` | Reports structural continuity across a corpus of TBUF blocks | Yes |
| `tbuf-block-compare.js` | Compares individual TBUF blocks by SHA-256 hash and structural shape | Yes |
| `descriptor-full-analysis.js` | Full analysis of TBUF descriptors across a directory of .acts files | No |

### 2K25 Analysis & Research

| File | Description | Tests |
|------|-------------|-------|
| `yanm20-body-table-report.js` | Detailed report of YANM20 body/record tables with offsets and counts | Yes |
| `yanm20-locate-body-table.js` | Scans decoded binaries for YANM markers and locates body table positions | Yes |
| `yanm20-stream-classify.js` | Classifies YANM20 stream types by combining body-table and bridge-inspect reports | Yes |
| `yanm20-bridge-inspect.js` | Detailed inspection of YANM20 bridge/transition bytes | No |
| `yanm20-normalization-score.js` | Scores YANM20 normalization permutations for best-fit stream alignment | Yes |
| `yanm20-normalization-sweep.js` | Sweeps all normalization scoring permutations across a corpus | Yes |
| `yanm20-2k25-group90-lattice-report.js` | Reports Group90 lattice structure in 2K25 clips relative to YANM20 descriptors | Yes |
| `yanm20-2k25-group90-entry-correlate.js` | Maps 2K25 descriptor start fields onto Group90 entry table positions | Yes |
| `yanm20-2k25-family-correlate.js` | Correlates normalization sweep results with 2K25 clips structure | Yes |
| `summarize-track-descriptor-patterns.js` | Summarizes track descriptor patterns across YANM and .clips files | No |
| `score-group90-op0.js` | Decodes and scores Group90 opcode-0 token streams from .clips | No |
| `compare-motion-metadata.js` | Structural bridge report between YANM source and .clips target metadata | No |
| `inspect-track-codec-candidate.js` | Inspects candidate track codec mappings between YANM and .clips | No |
| `clips-descriptor-lattice-report.js` | Combines .clips descriptor references with Group90 lattice report | Yes |
| `clips-controlled-diff.js` | Diagnostic diff of two .clips exports from controlled editor experiments | Yes |
| `scan-clips-corpus.js` | Scans a directory tree of .clips files and reports structural summaries | No |
| `pretty-jhips-report.js` | Pretty-prints JHIPS (track codec candidate) inspection reports | No |

### 2K25 Appenders & Patchers (FlatBuffer Writers)

| File | Description | Tests |
|------|-------------|-------|
| `append_2k25_victory_entry.js` | Clean-room writer — clones and appends a VictoryListData.jsfb entry | No |
| `append_2k25_entrance_entry.js` | Clean-room writer — rebuilds 9 vectors of EntranceListData.jsfb + appends template | No |
| `append_2k25_entrance_template_entry.js` | Narrow writer — preserves Entr byte-for-byte, replaces section 8 | No |
| `append_2k25_entrance_preserving_graph.js` | Prepends new root/vector while retaining entire original Entr object graph | No |
| `append_2k25_entrance_clone_graph.js` | Appends section-8 clone retaining original layout (for visibility controls) | No |
| `append_2k25_sdb_string.js` | Clean-room SDB appender — rolling-XOR string pool with offset-dependent seed | No |
| `patch_2k25_victory_list.js` | Copies one VictoryListData record, changes only its two normal victory asset IDs | No |
| `patch_2k25_victory_name_type.js` | Surgical patch — edits one Victory record's name/type fields only | No |
| `parse_2k25_victory_list.js` | Parses and dumps VictoryListData.jsfb contents | No |
| `prepare-6104-editor-import.js` | Prepares editor-exported 6120 defs/clips for a new 6104 namespace | No |

### 2K19 Extraction & Analysis

| File | Description | Tests |
|------|-------------|-------|
| `inspect_2k19_archive.js` | Inspects a WWE 2K19 PAC archive via external AuroraPac19Helper.exe | No |
| `extract_2k19_archive_entries.js` | Extracts specific entries from a 2K19 PAC archive | No |
| `decode_2k19_menu_payloads.js` | Decodes 2K19 menu payloads from installation directory | No |
| `analyze_2k19_menu_templates.js` | Analyzes decoded 2K19 menu template payloads for structural patterns | No |
| `inspect_jsfb_vector.js` | Inspects .jsfb FlatBuffer vectors — dump records or find u32 values | No |
| `decode_adefs_wrapper.js` | Decodes .adefs zlib wrapper to raw binary | No |
| `audit-extracted-root.js` | Exhaustive read-only asset inventory for an extracted WWE game root | No |

### 2K25 Crosswalk & Mapping

| File | Description | Tests |
|------|-------------|-------|
| `build_2k19_2k25_victory_crosswalk.js` | Builds crosswalk mapping between 2K19 decoded motions and 2K25 .clips/.adefs | No |
| `build_2k25_entrance_partition_map.js` | Builds entrance partition map for 2K25 using multi-phase animation pair analysis | No |

### Access & Utility

| File | Description | Tests |
|------|-------------|-------|
| `patreon-access.js` | Patreon tier access verification — validates user access to converter tools | Yes |
| `export_codex_chat.js` | Exports a Codex JSONL session log to Markdown format | No |

### Ghidra Scripts (Java)

All located in `tools/ghidra/`. All are **read-only** headless scripts.

| File | Description |
|------|-------------|
| `DecompileFunctions.java` | Decompiles exact function addresses supplied as args |
| `DecompileEntrypoints.java` | Creates missing function analysis at explicitly supplied entry points |
| `DumpInstructions.java` | Bounded instruction listing for checking decompiler cast ambiguity |
| `DumpMemoryWords.java` | Dumps fixed-width 64-bit words at a virtual address |
| `FindEditorStringReferences.java` | Reports functions referencing selected embedded ASCII strings |
| `FindSymbols.java` | Reports symbols whose name contains requested text |
| `ReferencesToRange.java` | Lists code/data references to every address in a supplied range |

### App/UI Scripts (Electron)

| File | Description | Tests |
|------|-------------|-------|
| `main.js` | Electron main process — window management, IPC handlers, Patreon auth, tool spawning | No |
| `preload.js` | Electron preload — exposes `window.aurora` API | No |
| `app.js` | Renderer process UI — file selection, conversion workflow, Patreon gating | No |

### Stats

- **~93 unique source files** (excluding duplicates in `_work/Aurora-Forge-2K19-to-2K20-Converter/`)
- **~68 test files** covering core libraries and converter pipeline
- **7 Ghidra Java scripts** for native analysis
- **3 Electron app scripts** for the desktop UI
- **10 appenders/patchers** for 2K25 FlatBuffer editing
- **18 duplicate files** in the standalone converter repo (exact copies of main tree)

---

## 2026-09-17 - TRIBUTE method compiled (user-ordered web research: YT + Reddit + Patreon)
- Architecture: Tribute = SLOT MANAGER + BakeMe stager. New content gets IDs ABOVE vanilla range (wrestlers 1500+, auto GFX/hash IDs, nameplates named <id>_placeholder). Files land in tribute/BakeMe/<type>/, ONE CakeView bake, CakeHook mounts at boot. Rebake on every change (Auto-Bake = Tribute<->CakeView IPC + Directory Watcher).
- Loader lineage CONFIRMED: CakeHook = dinput8 + plugins-folder DataCtrlLink v2.1 drop-in. Our SDCL is the clean-room sibling of the exact community design (same folder-watch-then-mount method the 25/26 work used).
- "New entries" are NEVER hand hex-edits: new paths + new IDs + staged index rows, baked together. No SDB hand-editing in flow (names come from JSON profiles/menu-name fields).
- Winn census (2K20): WinningCastSettingsData 38x{motion,cast} (8701/8703 present, 6100 ABSENT - subset registry for multi-cast scenes), WinningCommonEventNoData 53x{event}, RingOutWinning 1x{6139}. EntranceMotionTableData 40x5 = entrance-range ONLY (29000s). 6100-class victories need NONE of these.
- Victory-6100 full set (final): acts + evd + CharProfilePro pairs (SHIPPED in 9790 pack) + EntranceListData motion record (1452-record registry, 209 victory-range, 6100 present) + TronSetup ID array. Missing pieces: #4 append + #5 append (both need FlatBuffer vector-append tooling).

## 2026-09-17 - TRIBUTE VictoryListData cracked: new-row recipe + reader fix (user-supplied tributebake)
- Tribute VictoryListData: stored 12358 (flagged raw) oodle-decodes to 33024B / 657 rows vs stock 661. Diff: ADDED wrestlerIds 14000/14001/14003 (full 10-field rows, type=1, new hideIds, face/heel/title victories), REMOVED 7 rows (1382-1402 range), CHANGED 136 (string-pool rehash + type flags; motion IDs untouched).
- Recipe: rebuild table with appended full rows at new IDs + rehashed strings + type flags. Motions for existing rows never reassigned.
- READER FIX (Foundry ec8b74f): community writers store oodle payloads flag-clear; expandedSize mismatch is the signal. ExtractChunked raw branch now tries oodle-to-expandedSize, falls back raw. Normal-path unpack verified byte-identical to probe decode.
- Port to 2K20: same shape on CharProfilePro rows + EntranceListData motion records (2K20 tables numeric-only, no string pools - simpler).

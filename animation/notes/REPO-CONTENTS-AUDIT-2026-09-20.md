# Aurora Forge — Complete Repo Contents Audit (2026-09-20)

A full read of every source file in every repo under `D:\AuroraForge-Aug26`. Purpose: stop rediscovering what already exists. This is the authoritative inventory.

## The one conclusion that matters

The converter's **only remaining registration gap** is breadth. The FlatBuffer/`.jsfb` writers already exist and are byte-validated for **four** tables; **six** registration files still have no parser/writer:

| Registration file | ident | Writer exists? |
|---|---|---|
| `Entrances/VictoryListData.jsfb` | `Vict` | ✅ `tools/append_2k25_victory_entry.js` |
| `Entrances/EntranceListData.jsfb` | `Entr` | ✅ `tools/append_2k25_entrance_entry.js` (+ clone/preserving variants) |
| `Cutscene/CutsceneNoRegistry.jsfb` | `Cuts` | ✅ `tools/clips-codec/append-cutscene-entry.js` |
| `Sdb/ENG.sdb` | (SDB) | ✅ `tools/append_2k25_sdb_string.js` |
| `Roster/CharMoveSetDataTable.jsfb` | `Char` | ❌ **missing** |
| `Roster/CharProfilePro.jsfb` / `CharProfileTable.jsfb` | `Prof` | ❌ **missing** |
| `Roster/FaceTextures.jsfb` | `Play` | ❌ **missing** |
| `Hide/HideCtrlData.hidelink.jsfb` | `Data` | ❌ **missing** |
| `MoveData/CAMMoveData.jsfb` | `CMov` | ❌ **missing** |
| `Characters/CharacterMapping.jsfb` + `Stable/TeamsTable.jsfb` | — | ❌ **missing** (no tool, only named in docs) |

The six missing writers are the actual blocker to making a NEW victory/entrance menu slot appear (writing the numeric name-id into the full registration graph, not just Vict/Entr/Cuts/SDB).

### Key resources for building the six missing writers
- **Modded-CAK oracle** (correct final state of all 9 registration files, baked by the user's CakeView): `D:\AuroraForge-Aug26\25 bake folders\extracted-modded-cak`
- **Generic FlatBuffer vector reader** (parse any `.jsfb` root→vector→records with field resolution): `WWE2K19-to-2K26-Entrance-Prototype\tools\inspect_jsfb_vector.js`
- **Generic FlatBuffer dumper** (recursive table/vector/string): `WWE2K19-to-2K26-Entrance-Prototype\tools\parse-2k25-jsfb.js`
- **Writer pattern to copy** (parse → clone record → rebuild whole file with hardcoded schema): `tools/append_2k25_victory_entry.js`
- **Stock 2K25 root** (documented in `notes/2026-09-12-animation-converter-source-map.md`): `C:\Games\2k25-extracts\Root` (was present at source-map time; re-verify before use — alternate `D:\WWE26-mods\extracts\Root`).

---

## Per-repo inventory

### 1. `WWE2K19-to-2K26-Entrance-Prototype` (canonical tools/notes home — the main repo)

**What it does:** the primary repository for the 2K19→2K25/26 animation converter, all reverse-engineered file-format tools, and the handoff/notes history.

**FlatBuffer/`.jsfb` parsers + writers:**
- `Vict` (VictoryListData): `append_2k25_victory_entry.js` (writer), `parse_2k25_victory_list.js`, `victory-list.js`, `patch_2k25_victory_list.js`, `patch_2k25_victory_name_type.js`.
- `Entr` (EntranceListData): `locate-entrance-vectors.js`, `find-2k25-entrance-entry.js`, `diff-2k25-entrance-entries.js`, `append_2k25_entrance_entry.js`, `append_2k25_entrance_template_entry.js`, `append_2k25_entrance_preserving_graph.js`, `append_2k25_entrance_clone_graph.js`, `entrance-motion-table.js` (EntranceMotionTableData).
- `Cuts` (CutsceneNoRegistry): `clips-codec/locate-cutscene-vector.js`, `find-cutscene-entry.js`, `append-cutscene-entry.js`, `rename-cutscene-entry.js`, `inspect-cutscene-registry.js`.
- SDB (`ENG.sdb` etc.): `sdb-read.js`, `append_2k25_sdb_string.js` (rolling-XOR, offset-seeded key).
- Generic: `inspect_jsfb_vector.js`, `parse-2k25-jsfb.js`.

**Motion codecs (already built, one-function-per-file):**
- `.clips` Group90 LSB-first bitstream codec under `tools/clips-codec/` (bit-reader/writer, parse/eval/encode groups, descriptors `[i8 scale][u8 width][u16 0][f32 rest]`, `build-imported-clips.js` orchestrator).
- `.adefs` envelope: `adefs-container.js`, `adefs-tool.js`, `decode_adefs_wrapper.js`.
- 2K20 AMYM/YANM20: `amym-container.js`, `yanm20-reader.js`, `yanm20-encoder.js`, `yanm20-ir-writer.js`, etc.
- 2K22/23 TBUF/ANIM: `tbuf-v1*.js`, `convert-acts22-to-anims23.js`.
- 2K19 PAC/BPE/SHDC/0FOP: `extract_2k19_pac.py`, `inspect_2k19_shdc.py`, `parse_2k19_cae_menu.py`, `fop19-reader.js`, `evd-reader.js`.
- Group90 research: `group90-*.js`.

**Notes/docs (format + registration):** `knowledge.md`, `CURRENT-STATUS-AND-REPOSITORY-CAPABILITIES.md`, `ENTRANCE_EXPORTER_FINDINGS.md`, `PIPELINE_ARCHITECTURE.md`, `notes/2026-09-12-animation-converter-source-map.md` (9-file dependency set), `notes/HANDOFF-2026-09-20-BOBNOBOB-TEST-CAK.md` (multi-file registration spread), plus the LOG-* section logs and `AURORA_FORGE_ACTIVE_STATE.md`.

**App:** Electron desktop (`app/`) gated behind Patreon/Discord; ships 30-file allowlisted tool set via `scripts/stage-public-tools.js`.

### 2. `Aurora-Forge-Research` — README-only shell (policy doc; no research content in tree).

### 3. `Aurora-Forge-Animation-Probes` — 2K20→2K22 YANM→TBUF hash research.
- `probe-entrlist.js` (read-only generic FlatBuffer walk of EntranceListData), `crc-dictionary.json` (CRC32C bone-name hashes), `harvest-names.js`/`harvest-rosetta.js`/`name-bones.js`/`validate-crc.js` (name↔hash mapping), `split-manifest.txt` (registration notes). No `.jsfb` writer; no Char/Prof/Play/Data/CMov code.

### 4. `Aurora-Forge-WWE2K19-Animation-Research-Public` — README-only (public archive shell).

### 5. `Sanitized-Research` — `STATUS-SUMMARY.md` (format-chain doc: YANM→AMYM→TBUF→MINA→.adefs/.clips). No code.

### 6. `Aurora-Forge-2K19-PAC-Tools` — 2K19 PAC/SHDC/BPE/CAE-menu inspection (read-only).
- `extract_2k19_pac.py` (HSPC + Yukes BPE), `inspect_2k19_shdc.py`, `parse_2k19_cae_menu.py` (0x28-byte CAE menu records), `decode_2k19_menu_payloads.js`. No modern `.jsfb`.

### 7. `Aurora-Forge-Converter-App` — Electron shell for the 2K19→2K20 package builder (YANM/0FOP/EVD/ACTS). No `.jsfb`.

### 8. `Aurora-Forge-Clips-Tools` — RETIRED placeholder (README + package.json only; code moved to prototype `tools/clips-codec/`).

### 9. `Aurora-Forge-2K19-to-2K20-Converter` — the 2K19→2K20 engine.
- `yanm-keyframes.js`, `yanm20-reader/encoder/ir-writer.js`, `amym-container.js`, `fop19-reader.js`, `evd-reader.js`, `fop19-evd20-body-model.js` (0FOP→EVD bodies), `build-2k19-to-2k20-victory-package.js`. NOTE: references two **missing** files — `export-yanm-ir.js` and `yanm20-normalization-score.js` (they live in the prototype `tools/`, not this repo).

### 10. `Aurora-Forge-Blender-Animation-Tools` — Blender FBX preview + "Entrance Lab" sidebar (read-only crosswalk/timeline). No `.jsfb` export.

### 11. `Aurora-CAK-Foundry` — CAK archive reader/writer (FDIR container).
- C# `third_party/Nenkai-Bakery/CakeTool/` (CakeRegistryFile/CakeFileBuilder/CakeCryptor, per-version v6.7–v9.9 crypto, Oodle/Crunch2, FNV-1a64 string table), JS `electron/cak-reader.js`/`archive-repackager.js`/`cak-v93-backend.js`, `tools/AuroraCakHelper`. Treats `.jsfb`/`.sdb` as opaque payloads (`.sdb` stored raw because incompressible). **No FlatBuffer/sdb parsing.**

### 12. `AuroraForge_WWE_PC-Game_Modding_Tool` (flagship app) — Electron modding tool.
- Mirrors CAK reader/writer. `electron/services/*` (secure-loader, capability-registry, manifest, collision, journal). `app/data/cak-known-paths.json` (FNV-1a64 hash→path dictionary — the only place the 11 named `.jsfb` files appear). `scripts/analyze-name-table.js`/`analyze-cak-name-records.js` (FDIR string-table analysis, not game SDB). **No FlatBuffer/jsfb/sdb parsing.**

### 13. `Aurora-Forge-CAK-Mod-Loader` — C++ dinput8 mod loader (baseline). `src/shared/cak_validator.cpp` (CAK catalog header decrypt/validate). No FlatBuffer/sdb.

### 14. `Aurora-Forge-CAK-Mod-Loader-WWE2K25` — C++ loader for 2K25. `cak_validator.cpp` (most complete: v9.3/v6.8/v8.3, filename-derived key, string-table decrypt, virtual-path reconstruction), `cak_collision.cpp`. No FlatBuffer/sdb.

### 15. `Secure-DataCtrlLink-WWE2K25` / `16. Secure-DataCtrlLink-WWE2K26` — C++ secure proxy + plugins (mod_loader CAK mount, music_loader Wwise, mygm). `profiles.cpp` (game hash/RVA table). No FlatBuffer/sdb.

### 17. `DataCtrlLink-MusicOnly` — C++ proxy variant + Python/Frida RE tools (`tools/capture_cak_mount_calls.py`, `capture_cak_deep_flow.py`, Wwise bank tools). No FlatBuffer/sdb.

### 18. `Aurora-Forge-Custom-Music-Loader` / `19. …-WWE2K25` — C++ Wwise music addon (`bank_builder.cpp` HIRC rebuild). No FlatBuffer/sdb.

### 20. `Aurora-Forge-DDS-Converter` — Electron DDS↔PNG (texconv) + shared CAK runtime. `archive-repackager.js` maps `.jsfb`→JSFB fourcc only. No parsing.

### 21. `Aurora-Forge-Patreon-Verifier` — Cloudflare Worker (Patreon OAuth). No game formats.

### 22. `Aurora-Forge-Knowledgebase` — docs only (project status, handoffs, verified v1.23 facts).

### 23. `Forgeproject` — contains a PARTIAL `WWE2K19-to-2K26-Entrance-Prototype` checkout (no `tools/`). Its `knowledge.md` documents the **full Tribute/Bakery registration experiments v2–v9 and the complete 9-file changed set + SDB format**. Rich docs, no unique code.

### 24. `Sept18th-2026` — dated research capsule. `HANDOFF-2026-09-19-2K25-DIRECT.md` (Group90 codec cracked, CutsceneNoRegistry id@+8/nameString@+12), `RESEARCH-LOG.md`, `SESSION-SUMMARY.md`, `AUDIT-2026-09-19-WORKSPACE-CODE.md`, `2k19-minus-2k25-victory-inventory.json`.

### 25. `wwecrap` — 2-line README + a public-info PDF. Nothing else.

### 26. `release-only-repo` → GitHub `Aurora-Forge-Converter-Releases` — the 2K19→2K20 bridge release `.exe` (source private).

### 27. `tmp-wrestleminus-public` — clone of third-party `pozzum/WrestleMINUS` (reference only, not ours).

---

## Cross-cutting facts (so nothing gets rebuilt)

1. **The `.jsfb`/`.sdb` parsers/writers only exist in `WWE2K19-to-2K26-Entrance-Prototype\tools\`** (and `tools\clips-codec\`). No other repo has FlatBuffer or game-SDB code.
2. **The 2K19→2K20 bridge** (YANM/0FOP/EVD/ACTS/AMYM) is split across `Aurora-Forge-2K19-to-2K20-Converter`, `Aurora-Forge-Converter-App`, and the prototype; `export-yanm-ir.js` + `yanm20-normalization-score.js` live in the prototype, not the converter repo.
3. **CAK container read/write** is complete in `Aurora-CAK-Foundry` and mirrored in the flagship app — but it never parses file contents (`.jsfb`/`.sdb` are opaque).
4. **Name/string IDs are numeric keys into an XOR-encoded SDB** (first-byte key `(offset & 0xff) ^ 0xcd`), never human-readable text. Documented in `knowledge.md` and `notes/2026-09-12-animation-converter-source-map.md`.
5. **The modern `.clips` Group90 codec is already cracked + reimplemented** in `tools/clips-codec/`; the remaining codec gap (separate from registration) is the arbitrary-motion semantic Group90 writer and the full 0FOP→EVD body writer.

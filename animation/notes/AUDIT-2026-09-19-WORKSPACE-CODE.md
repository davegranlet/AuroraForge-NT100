# AUDIT 2026-09-19 — workspace code, loader lineage, file-per-function plan

Scope: `D:\AuroraForge-Aug26` (workspace). One pass, no drive scans.

## 1. Loader lineage (why we stopped rebuilding it)

| Pair | dinput8 SHA-256 (short) | ftrib SHA-256 (short) | Date | Where | Status |
|---|---|---|---|---|---|
| Foundry bundle | `FC0771822612DC5F…` | `84089A2CE223E08F…` | 09-11 | `Aurora-CAK-Foundry/app/data/loader-releases/wwe2k25-v123/` | Canonical product pair (ftrib hash = what the SDCL regression test expects) |
| Proven runtime | `92C26247BCF9EC1F…` | `B8C8A7A9ABD4F07E…` | 09-12 | installed in game; backup `_work/game-cleanup-20260919/` | Ran every successful session incl. mounting the CakeView bake → **RESTORED to game 09-19** |
| Pre-v1.0.0.1 archive | `17EBC938CF815171…` | `4193B2E1641A3039…` | 09-06 | `local-release-archive/WWE2K25-loader-pre-v1001-20260906-1955/` | outdated snapshot |
| Pre-protected-validator | `7B7B8F8CCCA8117F…` | `08BA9492EB22850A…` | 09-06 | `local-release-archive/WWE2K25-live-test/2026-09-07-pre-protected-validator/` | outdated snapshot |
| 2K26 release | `88A0A9D03B67CBD5…` | (n/a here) | 09-04 | `forge2/sdcl-release/…2K26-1.7.6/` | 2K26 loader (older), keep as reference |
| Prior ftrib build | — | `BDB581902BD58351…` | 09-18 | `_work/ftrib-build/` | prior session artifact |
| 09-19 experiments (this chat) | `AD5B656C…`, `9F52A61E…`, `B11C9A4C…` | `FDDE8A81…`, `7428DEDC…`, `A1EDB725…` | 09-19 | build dirs of both loader repos | EXPERIMENTAL — early-mount + signature bypass; not needed; do not ship |

Key facts:
- The loader source in git drifted AFTER the shipped 09-12 binaries (signature gate + boot-burst
  refactors on 09-15…09-18); the current repo HEAD does not reproduce the shipped pair.
- Working runtime pair = `92C26247…` + `B8C8A7A9…`; game folder restored to exactly that,
  content-verified. `mods/tribute-bake-test-sept19.cak` left staged.
- Rule going forward: loader binaries are the reference; do not rebuild the loader unless the
  task is explicitly loader work. Loading of modded CAKs (2K25 + 2K26) counts as SOLVED.

## 2. Repo classification (top-level, from live git state)

CURRENT — active project code:
- `WWE2K19-to-2K26-Entrance-Prototype` (research home; notes/, tools/, analysis/)
- `Aurora-CAK-Foundry` (packer/baker + bundled loader releases)
- `Secure-DataCtrlLink-WWE2K25`, `Secure-DataCtrlLink-WWE2K26` (loaders)
- `Aurora-Forge-CAK-Mod-Loader-WWE2K25` (addon source)
- `Aurora-Forge-Clips-Tools`, `Aurora-Forge-2K19-PAC-Tools`, `Aurora-Forge-Blender-Animation-Tools`,
  `Aurora-Forge-Animation-Probes`, `Aurora-Forge-Converter-App`, `Aurora-Forge-Patreon-Verifier`,
  `Aurora-Forge-Research`, `Aurora-Forge-Knowledgebase`, `Aurora-Forge-DDS-Converter`,
  `Aurora-Forge-Custom-Music-Loader(-WWE2K25)`, `DataCtrlLink-MusicOnly`, `Sanitized-Research`,
  `release-only-repo`, `Sept18th-2026`

OUTDATED — historical, keep frozen:
- `AuroraForge_WWE_PC-Game_Modding_Tool` (last change 09-02), `wwecrap` (08-29),
  `Aurora-Forge-WWE2K19-Animation-Research-Public` (archive), `tmp-wrestleminus-public` (2019 clone),
  `local-release-archive/`, `_archive/`, `_research/`, `_tmp/`, `standalone-repos/`,
  `Chat Gpt backups-Sept7th/`

SCRATCH/MISPLACED — not source, belongs in `_work` or deleted on request:
- `tmp`, `tmp-anim`, `tmp-anim-end`, `tmp-bundle-extract`, `tmp-custommove`, `tmp-decompiled-helper`,
  `tmp-facepaint-video*`, `tmp-full-v116-extract*`, `tmp-helper-bundle`, `tmp-ilspy`, `tmp-sfextract`,
  `tmp-tutorial-sheets`, `tmp-v1`, `tmp-vp1`, `tmp-vp2`, `output/`, `scripts/`, `examples/`,
  `default-models/`, `ghidra_scripts/`, `reverse-analysis/`
- `_worktrees/foundry-v93-verify` = git worktree of Foundry (valid, not a duplicate repo)
- Loader experiments from tonight (see table) and Temp scratch pipeline scripts (below)

## 3. File-per-function convention (user-ordered, 2026-09-19)

Rule: every function lives in its own file named after the function; no multi-purpose grab-bag
modules. Pattern: `verb-noun[-qualifier].js`, kebab-case file, single `module.exports`, matching
camelCase function name, colocated `<same-name>.test.js` run by `node --test`.

First-pass split targets (highest value first):
1. Temp scratch pipeline (currently 3 large multi-function files) → promote into
   `WWE2K19-to-2K26-Entrance-Prototype/tools/` as one-function files:
   - `clips_bitcodec.js` → `read-bits-at.js`, `decode-uleb128.js`(exists), `width-table.js`,
     `parse-timing-group.js`, `eval-dense-group.js`, `eval-entropy-group.js`, `entropy-pair.js`,
     `rot-to-quat.js`, `parse-clips-record.js`, `find-record-table.js`
   - `clips_encode.js` → `bit-writer.js`, `encode-uleb128-token.js`, `encode-dense-group.js`,
     `copy-bits.js`, `concat-writers.js`
   - `build-6185.js` → `resample-keys-catmull-rom.js`, `smooth-column-gaussian.js`,
     `map-into-band.js`, `fit-descriptor.js`, `encode-track-group.js`, `patch-descriptor.js`,
     `build-imported-clips.js`
   - `add-cutscene-entry.js` → `find-cutscene-entry.js`, `append-cutscene-entry.js`
2. Prototype `tools/` multi-function files to split next: `clips-layout.js`, `yanm-keyframes.js`,
   `score-group90-op0.js`, `append_2k25_victory_entry.js`, `append_2k25_sdb_string.js`.
3. Regenerate `REPO-FUNCTION-INVENTORY.md` + `LOG-TOOL-CATALOG.md` after each split pass so the
   index stays the map of "scriptthatdoesblah.js".

Status: audit written 09-19. Loader restored/verified. The first file-per-function refactor batch is now implemented, tested, and committed; this audit line was stale and has been corrected in the active continuity pass.

## 4. Canonical status correction — 2026-09-19

- Exact action: compared this audit against the active transfer ledger, the current Active Log, and the repository's codec test/commit state.
- Result: confirmed that `tools/clips-codec/` contains the batch-1 split modules and integration/registry tests; V1 and V2 pass; the builder return-value fix is committed as `66fccdd`.
- What it proves: the first refactor batch is not merely planned; its offline codec gates and importer smoke path have concrete evidence. This does not prove new registry visibility or end-user in-game readiness.
- Next concrete action: keep the Active Log and transfer ledger synchronized, then perform only new-evidence checks for additive `.clips/.adefs` serving and in-game verification.

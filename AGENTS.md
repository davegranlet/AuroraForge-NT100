# AUTHORITATIVE LOCATION RULE — OWNER, 2026-10-16

ALL code, scripts, tests, working documentation, evidence and build outputs must be developed inside `C:\nt100-codebasemain`. `C:\AFnt100b3` is an alias to this same tree. Do not develop under `C:\nt100-codebasemain\docs\private\aug26`, the old Codex workspace, or Temp/opencode. External game/resource files are read-only inputs. Missing legacy code must be recovered INTO this repository before editing or running it.

Active animation workflow: `C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19`.
Canonical shared tools: `C:\nt100-codebasemain\animation\tools`.
Current private state: `C:\nt100-codebasemain\docs\private\aug26\CURRENT-STATE.md`.
Byte-preserved legacy imports: `.local/consolidation-2026-10-16/sources/` — historical only, never an alternate active codebase.

Private imported research/evidence is locally excluded from Git; this is not permission to publish it. Do not commit or push during consolidation. The location rule supersedes old paths in historical documents.

# Aurora Forge — Agent Guide

Updated 2026-10-16 (America/New_York). This guide contains standing rules, not a build-status ledger. Read `C:\nt100-codebasemain\docs\private\aug26\CURRENT-STATE.md` for the current state and exact artifacts.

## Mission and scope

- Owner clarification, 2026-10-21: the finished workflow must use Aurora Forge-owned tools for every operation. External tools may be used as independent test/reference tools; implement missing production capabilities inside this repository.
- Owner clarification, 2026-10-23: when a required tool/capability is missing, search the internet for an existing implementation or authoritative technical reference first. If no suitable solution exists, create the missing Aurora Forge capability in this repository automatically; do not stop to ask whether to make it. External tools may remain independent test/reference tools only.

- Complete and validate the selected WWE 2K19 entrance as a new WWE 2K26 entry, using the existing in-app converter workflow. Current source: **273, DOLPH ZIGGLER 1**. Current destination: **14002 / test557**. The converter UI/service already exists in Aurora Forge; do not treat first-time app integration as an outstanding task.
- Preserve the source choreography, root travel, legs/feet, timing and required companion behavior. Do not silently replace them with unrelated native/community motion. A diagnostic containing native animated companions must be labeled incomplete.
- Owner clarification: **compiled binaries are usable even without source code**. Inspect or decompile useful CakeView, Tribute, Clips Editor, AnimationEditor or other existing tools when needed. Reuse code, format knowledge and tools; source-code availability is not a prerequisite. This is not permission to substitute borrowed choreography.
- Target-game skeleton identifiers, headers, container structure and compatible registration scaffolding are usable. Explain the difference between structural scaffolding and animated content.
- Latest owner directive,2026-10-17: Codex is restored as project lead. OpenCode sessions are implementation/review workers; no independent staging or project-lead authority. Prior FINAL-LEAD-HANDOFF leadership delegation is superseded. Codex coordinates, independently reviews, stages under existing authorization and communicates acceptance. Up to8OpenCode sessions remain authorized; no unrelated project delegation. Other safeguards remain in effect.

## Canonical locations

| Name | Location / meaning |
|---|---|
| THE BASE / active code | `C:\nt100-codebasemain` |
| Legacy alias | `C:\AFnt100b3` is a junction to THE BASE, not another code copy |
| THE DOCS | `C:\nt100-codebasemain\docs\private\aug26` — private working documentation |
| THE ARCHIVE | `D:\old-code` — read-only historical references |
| Public code repository | `AuroraForge-NT100` — active code for published products; not a destination for private research |
| Current task workspace | `C:\nt100-codebasemain\animation\workflows\dolph-ziggler-1-2k19` |
| Current task evidence | workspace `outputs\dolph-ziggler-1-2k19\` |
| Resource audit | workspace `outputs\6th-resource-audit\` |
| Original 2K19 source file | `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19\aurora-2k25-replace-mod-2k19-extracted\entrance\273.bin` |
| Existing bake tree (reference; do not write without staging authorization) | `D:\Program Files (x86)\Steam\steamapps\common\WWE 2K19\aurora-2k26-library-v4-BakeMe` |
| Native reference extraction | `D:\games\2k26-extracts-2\aurora-full-extract-v116-20260903-221507\Root` — v116 reference, not automatically the current Steam data |
| Game/mod slot | `C:\SteamLibrary\steamapps\common\WWE 2K26\mods\aurora-2k25-replace-mod.cak` |
| Loader log | `C:\SteamLibrary\steamapps\common\WWE 2K26\DataCtrlLink.log` |

Never store a supposedly current installed hash in this standing guide. Hash the actual file and record the observation in the continuation document. Resolve actual paths before use; historical C: and D: game paths are not interchangeable.

## Before work

Owner priority,2026-10-16: when a working converted sample and its authoring software are supplied, reproduce that authoring workflow before building another interpretation. Existing tool operation may be used directly; reimplementation is not a prerequisite. Identify the exact failed operation before further reverse engineering.

1. Read this guide and the entire current continuation document. Historical logs are explicitly non-authoritative; consult a specific entry only for evidence or an unresolved question.
2. **Search all prior project knowledge before every new investigation or test.** Run `node scripts/repo-knowledge/aurora-project-history-search.js "<specific terms>"` with the game/version, component/IDs, prior error/result wording, and candidate name. By default it searches project documentation/results plus `.local` historical notes and imported research; add `--all` to include source code. Read the matching report/ledger entries and linked evidence. For path/purpose discovery, also use `node scripts/repo-knowledge/aurora-knowledge-query.js "<term>"` when its local metadata index exists. Record the query and relevant hits in the active ledger. Do not repeat a test with an already-recorded result unless new evidence creates a distinct question and the proposed test discriminates between stated outcomes.
3. Locate existing implementations and evidence before creating scripts or repeating discovery. Use the available filesystem tools (`rg`, `rg --files`, verified paths); use `local-files` if available, but its absence is not a blocker. Do not guess layouts.
4. Check existing inventories first: resource audit, tool map and existing analysis/notes; the historical asset CSV is `C:\Users\dgran\Desktop\fuuuuuuuuuck.csv`. Resolve old paths under THE BASE where applicable. Do not start another broad inventory when a targeted lookup suffices.
5. Establish the exact source, control, candidate, hashes and expected behavioral change. A previous playable control and the requested source conversion are different artifacts when their source/provenance differs.
6. Preserve successful work. Do not restart registration, loader, SDB or codec investigations already supported by evidence unless a new failure specifically implicates them.

## Implementation and verification

- **Editor-first:** parameterized functions/CLIs with explicit inputs/outputs, validation and useful error reporting. Prototypes should become editor operations, not accumulate as alternate production pipelines. Canonical code lives in THE BASE; workspace scripts may serve as reviewed evidence/prototypes pending integration.
- Never rebuild stock JSFBs with the old lossy writers. Preserve the existing graph/rows and apply tested append/in-place operations. New format-specific writers require round-trip/unchanged-record evidence.
- New IDs start at 14000, collision-checked against relevant tables. Historical SNME rule (section max +3000 =16086) is a different game-era recipe, not the current 2K26 slot rule. `6185` is occupied. Do not change current 14002 without cause.
- Treat clip record IDs and bone IDs as distinct identities. Lowercased-name FNV-1a64 is established for current clip fixtures; do not assume every numeric field uses that hash. Use BigInt/integer-safe parsing for 64-bit values.
- Identify the body by an explicit unique bone-ID-set match; do not select the largest record or assume record 0. RingIn body is record 1 in the current native273 layout.
- Preserve source timing. Do not squeeze motion into a donor duration, smooth genuine choreography away, or use an encode/decode agreement with the same model as proof that the source interpretation is correct.
- Validate actual outputs and unpack every baked CAK. Every intended payload must extract byte-identically; generated files must be validated separately. A helper failure is unresolved until diagnosed.
- Bake directly under the intended final basename. **Never rename a baked CAK**: filename participates in key derivation. Keep manifests/diagnostics/backups outside payload roots.
- 2K26 `.sdb` uses its own offset-keyed cipher and must be stored raw in the archive. Use existing `animation\tools\sdb-2k26.js` and append tooling, not the historical 2K25 rolling-XOR path.
- Current WO005 diagnostic uses an uncompressed bake because the compressed repackager path produced an invalid large-payload chunk layout. Do not generalize that finding into a claim that the game cannot read compressed clips.
- Do not blanket-rekey CutsceneNoRegistry fields. Earlier broad f7 edits damaged valid library rows. Preserve existing valid keys and verify any targeted change against its exact field/schema. Field-number labels are table-specific.
- Offline verification gates runtime requests. Ask for a targeted owner observation only after a concrete substantial change or discriminating diagnostic is ready. No per-edit recording loop. Full source-vs-output entrance review is required for final fidelity acceptance; one or two screenshots cannot establish motion quality.
- **Game-launch handoff rule (owner, 2026-10-23):** If runtime testing requires the owner to launch WWE 2K26, say exactly what to test (for example, “Please launch the game and test Victory 14004 / motion 14003”) and stop all work that depends on the runtime result. The owner will launch as soon as possible and report back. Do not keep researching, editing, staging, or repeatedly checking process/window state while waiting, and do not monitor or poll for the owner’s launch. Resume only after the owner reports the outcome. Continue unrelated work only if the owner explicitly asks for it.
- Report separately: structural validity, source fidelity, editor reopen, archive integrity, loader acceptance and owner-observed playback. None implies the others. Do not claim a crash fix from static reasoning.

## Installation, publishing and protected areas

- Current work is offline. No install/active-slot or bake-tree writes until that specific step is authorized. Only the owner launches games. Never overwrite files while the game is running.
- Preserve a hash-verified rollback before authorized staging. Copy, do not move. Keep the CAK basename unchanged and verify destination hashes.
- Preserve owner mods and their manifest order. Historical “only one CAK total” experiments are superseded: current owner manifest has CustomMusic, 2ndtest-cv, 3rdtest-cv, then the experimental CAK, plus Custom_Music.pck. Limit new experimental registry-changing packages to one controlled test and account for overlapping tables; do not remove owner mods to satisfy an old note.
- Manifest JSON must be UTF-8 without BOM. Do not use PowerShell 5.1 `Set-Content -Encoding UTF8` for it; use explicit BOM-free encoding.
- **Never touch or ship `Hide\HideCtrlData.hidelink.jsfb`.** Entitlement data is outside scope. Never enter `forge2\`, never touch `D:\zips`; do not edit archived snapshots. Reference tool folders remain read-only unless a separate change is needed and authorized.
- No commits, pushes or releases without explicit owner authorization. Research notes, calculations, private handoffs, logs, dumps and secrets must not be published. Public content is limited to approved binary releases and code for published items. Patreon verifier remains private. Historical publishing approvals do not authorize a new push.
- Preserve the frozen/private projects and retired-repository boundaries documented in the historical guide. Do not recreate or republish retired research repositories.

## Reporting and continuity

- Maintain a concise current-state ledger as work happens: actual commands/actions, reason, result, hashes, evidence path, unresolved questions and exact next action. Record observable reasoning summaries, not private deliberation. Do not prepend contradictory “READ FIRST” snapshots indefinitely.
- On handoff/context pressure, save the current evidence and next command before continuing. Do not turn this into repeated “nothing to do” reports while authorized work remains.
- Every status/handoff ends with **Next step (owner)**: a specific action or an honest statement that none is needed. Do not make the owner find source files, repeat answered questions, or relay messages between agents unnecessarily.
- Use dates and times in America/New_York for owner-facing status. Separate observed facts from worker reports and hypotheses. Unknowns stay explicitly unresolved.
- The old full guide/log are preserved under THE DOCS `history\` for traceability, not as current instructions.

## Current reference and concise memory policy

Read `C:\nt100-codebasemain\docs\private\AURORA-FORGE-CURRENT-REFERENCE-2026-10-21.md` for the product-level scope, current 2K19 273 → new 2K26 14002/test557 objective, component completion matrix, and authoritative current artifact status. It supplements this guide and the live ledger; it does not authorize staging or supersede a newer owner instruction.

Keep test memory compact: record test name/scope, ran/pass/fail/not-run, and the evidence path/hash. Retain verbose failure output only when it is needed to resolve an active blocker. Keep observable action intent/outcome and next step in the active ledger; do not store private chain-of-thought or repeat raw transcripts. Historical documents under `C:\AuroraForge-Aug26` are read-only evidence, and older project targets/paths are superseded by the current canonical repo and dated reference unless a specific historical comparison requires them.

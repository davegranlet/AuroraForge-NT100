# read-runtime-victory-setplace-join.ps1 — schema and usage notes

## v1.4.0 takeover additions (2026-10-30)

Current tool file SHA-256:
`42F4F6431EB5498F6CE0312181A1574EF9F18B50AE614A583631E9A38F610418`
(toolVersion `1.4.0-registry-classifier`, 3,081 lines). Offline validation this
session: PowerShell AST parse 0 errors; `-SelfTest` 34/34 PASS
(`claude-takeover-20261030/evidence/reader-v140-selftest.json`); `-DryRun`
against the installed executable returned `exeSha256Matches=True`
(`reader-v140-dryrun.json`); no-process refusal produced exit 4 with no memory
read. The v1.2.2 abort cause ("A parameter cannot be found that matches
parameter name 'Stable'") was a caller-supplied invalid parameter, not a script
defect; the v1.4.0 test card passes only declared parameters.

Additive changes only; no previously captured field was renamed or removed:

1. `nodeRegistry` section (schema v3 additive fields): `manager+0x1200`
   registry pointer, `count` (registry+0x2C, expected 11), `arrayPointer`
   (registry+0x18), records of stride `0xA8` with 18 qword rig-node pointers at
   record `+0x00..+0x88`, aux `+0x90`, in-use `+0x98`, role key byte `+0xA0`,
   plus a 0x90 byte node-index dump per record. Rooted through the same
   validated actor manager; with no manager the section reports an explicit
   failure instead of following nothing.
2. `classKey` classification on every class candidate and actor-table entry
   (`Test-ClassCandidate` / `Get-ActorTable`): the vtable slot-2 method
   prologue (`81 3A` = `cmp dword ptr [rdx],imm32`) is read and the immediate
   is matched against known CRC-32C component-name keys — `ringcomponent`
   0xAE780A89, `actorcomponent` 0x7B962D9E, `character` 0xFC388D56
   (05-DEVILS-ADVOCATE.md B1/B3). A RingComponent can therefore no longer be
   presented as an unclassified performer class.
   `Resolve-Joins.entries[].classKey` carries the classification.
3. `matchedGroupComponent.groupChildPointers` in every container walk
   (`Invoke-GroupChildPointers`): head=`*(group+0x40)`, sentinel=`group+0x38`,
   child=`link-8`, next=`*(link+8)`, up to 40 pointers — the rig-node set that
   `FUN_1410C1690` selects per observer slot from a GroupComponent.
4. `transform210Block90toCF` on classes with a +0x210 TransformComponent: the
   4x4 block at +0x90..+0xCF whose +0xC0 row feeds `entity+0x870`
   (05-DEVILS-ADVOCATE.md Finding 3 reclassified entity+0x870 as a world
   center, not an orientation mirror).
5. `Resolve-Joins` (new optional `-RegistryResult` parameter) intersects each
   node-registry record's 18 node pointers with the class-side rig-node sets
   (class container groups/transforms/group child lists) captured in the same
   snapshot; per-actor `registryRecordMatches` include `pointerIntersections`
   counts, and `registryPerformerRigJoinCandidate` flags any record with >= 6
   intersections. Console summary prints `nodeRegistry=` and
   `registryPerformerRigJoinCandidates=` lines.
6. `answers.nodeRegistry` (registryAccessible/recordCount/capturedRecords/
   role1RecordCaptured/registryJoinCandidates) and
   `captureSetCoverage.nodeRegistryRecords`.
7. SelfTest additions (all pass): registry count/role/node-pointer fixtures and
   the actorcomponent slot-2 classifier fixture.

Expected discriminators in the next capture set (custom early/mid + stock
control in one launch): (a) any non-ring `classKey` (actorcomponent/character)
class candidate inside the resolved actor table/scan; (b) role-1 registry
record node-pointer intersections with the type-1 request group children
(rig identity from the SetPlace side); (c) the same for actor-class containers
(rig identity from the performer side); (d) type-1 rows +0x12D0 request
pointer + request+0x40 container == class+0x20 (existing Lane-1 closure) with
valid pointer validation this time.

---

# read-runtime-victory-setplace-join.ps1 — schema and usage notes

Schema: `aurora-forge/wwe2k26-victory-setplace-join-snapshot/v3` (live snapshot),
`.../v3/plan` (dry-run plan), and `aurora-forge/wwe2k26-victory-placement-status/v1`
(inside `captureStatus`). Tool owner: Lane B (runtime diagnostic), 2026-10-29.
Read-only diagnostic for the Victory 14004 / motion 14003 SetPlace -> performer
pointer/identity join in WWE 2K26 (build SHA-256
`7F9C2461BDB4A662D8A25012BAEAEC73CE0C7F0429C6B77395BBE9232F63FDD5`).

Current tool file SHA-256 (v1.4.0, this session):
`42F4F6431EB5498F6CE0312181A1574EF9F18B50AE614A583631E9A38F610418`.
The historical v1.2.x/v1.1.0 hashes below are retained for lineage:

## Why v3 exists (2026-10-29 live-root correction)

The 2026-10-28 live snapshot
`victory-setplace-join-20261028-222505-pid32172.json` proved the static data
roots used by v1.1.0 are not usable pointers on this build:

- `_DAT_144A44D30` (actor manager) read `0x7F7FFFFFFFFFFFFF`, a non-canonical
  sentinel. The reader then computed `0x7F80000000000847` (`sentinel+0x848`)
  and recorded eight failed reads.
- `_DAT_144A5E0A8` (ComponentsArray manager) read
  `0x3F4A48AE3F4A44D4`, two packed float32 values (~0.7898, ~0.7896), not an
  address. v1.1.0 emitted this as `componentsArray.managerPointer.value`.
- `_DAT_144A37028` (category-4 root) was null in that snapshot.
- The actor table, type-1 records, category-4 rows, requests, global tree and
  joins were empty while `captureAborted` was `false`, so an invalid capture
  looked like a valid empty scene.

v3 reads and classifies every static root before any offset arithmetic, never
follows an invalid root, and adds an independent shape locator. A failed
locator now produces `captureStatus.status = invalid-root` (or `no-target`),
not silent empty sections.

## Usage

1. Start WWE 2K26 with the normally installed current CAK/manifest. Do not
   stage anything for this diagnostic.
2. Enter a live preview: stock The Rock Victory (row 100 / motion 6100),
   custom Victory entry 14004 ("2K19 The Rock", motion 14003), and optionally
   the working custom Entrance 14002. Keep the motion actively playing.
3. From a 64-bit PowerShell, run one snapshot per moment/scene:

   ```
   powershell -NoProfile -ExecutionPolicy Bypass -File `
     C:\nt100-codebasemain\animation\tools\read-runtime-victory-setplace-join.ps1 `
     -SceneLabel stock-6100-early
   ```

   The default output path is
   `animation\workflows\victory-6100-2k19\outputs\coordinator-takeover-20261029\runtime-<label>-<timestamp>-pid<pid>.json`.
   Use `-OutputPath <path>` to choose a different file. Run again with
   `-SceneLabel stock-6100-late`, `-SceneLabel victory-14004-early`,
   `-SceneLabel victory-14004-late`, and optionally the Entrance control.
4. Return the JSON paths and the console `captureStatus=` line. Do not judge
   visual quality from this test; it is a pointer/identity capture.

Optional flags: `-SkipPointerScan` (static-root status only; useful as a
negative control), `-SkipSceneContext` (omit the context-only scene capture),
`-MaxScanBytesMB` (16..2048, default 512), `-MaxScanSeconds` (5..300, default
60), `-MaxEntityHits` (default 64), `-MaxClassCandidates` (default 64),
`-MaxRequestCandidates` (default 64).

Offline modes:

- `-DryRun [-ExePath <game exe>]` — validates the build hash, parses the PE
  section table and prints every planned read. No process handle and no
  memory read.
- `-SelfTest [-OutputPath <file>]` — synthetic fixtures for root
  classification, manager/class/request shape validation, D1/D2/no-request/
  invalid-root verdicts, pointer rejection, and qword-hit logic. No process.
- `-DryRun` with a wrong `-ExpectedSha256` refuses with exit 5.
- Live mode with no game process refuses with exit 4; it never launches.

## What one snapshot captures

- `captureStatus` — the primary answer block:
  - `status`: `valid`, `partial-no-request`, `no-target`, `invalid-root`, or
    `aborted`.
  - `hypothesis`: `D1`, `D1-contained-transform-unlinked`, `D2`,
    `no-request`, `no-target`, `invalid-root`, `indeterminate`.
  - `staticRoots`: every root's exact raw value, verdict, whether it was
    followed, and why.
  - `locatorSummary`: method, manager/class/request counts, truncation,
    errors and notes.
  - `answers`: class/request candidate arrays, `classMatchKeyU32` and whether
    it equals `0x38943282`, per-class request/container/transform/entity
    comparisons, and `d1Satisfied` / `d2Supported`.
- `locator` — the independent locator:
  - `anchorStatus`: loader registry pointer (`0x4D7A920`), static class vtable
    (`0x143E348A8`), old-live camera vtable (`0x143E1A550`, context only;
    it is not the performer class), and the scene-object array
    (`0x4A37D80`), each marked proven/inferred/unresolved.
  - `imageDataSections` and `managerHits`: PE data-section scan for pointers
    whose target has the manager `+0x848`/`+0x85C` shape.
  - `managerCandidates`: strict shape validation (count, array, class
    records, entity magic, actor byte, container state). Up to 64 candidates.
  - `classCandidates`: every shape-valid 0x260 class found via the manager,
    vtable value, or entity+0x30 reverse scan; each has `valid`,
    `identityStrong`, `vtable`, `actorByte70`, `container20`, `entity30`,
    `controller38`, `transform210`, `entityView` equivalents,
    `requestFromController`, `reverseRequests`, and a bounded container walk
    with `matchedGroupChild` / `matchedTransformChild`.
  - `requestCandidates`: live request objects found on controller `+0x12D0`
    or by reverse qword scan for class containers.
  - `scanStats`: bytes, read errors, hit counts, truncation, elapsed ms.
  - `errors` and `notes`: explicit failures and limits.
- `actorTable` — if a manager is usable/validated: `+0x848` array, `+0x85C`
  count, active indices, and per-entry `{+0x70, +0x20, +0x30, +0x38, +0x40,
  +0x200, +0x50, +0x60, +0x210}` plus entity and controller views.
- `setPlaceRecords` — type-1 `0x14D0`-stride records if the manager is
  usable; `scanned` now reflects records actually read (0 on an invalid
  root).
- `componentsArray` — exact raw value and verdict; invalid float-pair values
  are never emitted as a usable manager.
- `category4Table` — exact root raw/verdict; parsed only when the root is a
  usable pointer.
- `requests` — deduplicated request captures from actor/controller handles.
- `selectorMatches` — category-4 rows matching live `+0x14B4` selectors.
- `globalTree` — `manager+0x1210` binding tree, with root status.
- `sceneObjectContext` — context only: `_DAT_144A37D80` channel array and
  scene-registry entries with `+0x4D80` keys. It is never used as an
  actor/class anchor.
- `joins` — pointer equality checks from the actor-table path.
- `completeness` — every failed read with section/label/address; no failed
  read is silently dropped.

## How to read the answer

- `D1`: one performer class satisfies `request+0x40 == class+0x20`,
  `class+0x210` resolves to key `0xF02E11D4` with state `(u8@+0x4E & 3) == 3`,
  and `entity+0x870` equals the `class+0x200` mirror. The SetPlace request
  reaches the same container as the performer entity.
- `D1-contained-transform-unlinked`: the container equality holds but
  `class+0x210` or `entity+0x870` does not match. The SetPlace write target is
  a sibling/other component inside the same container; inspect
  `matchedGroupChild` versus `class+0x210`.
- `D2`: a live request exists but its `+0x40` container is not the performer
  class `+0x20` container. Placement is driven by a different object/scene
  target; inspect the request container tree and the scene context.
- `no-request`: a performer class was found but no live request at capture
  time. Not evidence for D2; capture again after the Ring SetPlace or later
  in the motion.
- `invalid-root`: no static root or locator manager produced a class record.
  The capture is invalid; do not conclude the engine lacks SetPlace.
- `no-target`: locator ran but found no class; the scene may not be in an
  active preview or the caps were reached.

The live value of `_DAT_144db5c3c` is captured as `classMatchKeyU32`. In the
2026-10-28 capture it was `0x00000000`; it is not `0x38943282`, so the
performer class itself is not the GroupComponent-matched child. If D1 holds,
the matched GroupComponent is a sibling in the same container, which is why
`matchedGroupChild` is captured separately from `class+0x210`.

## Safety and access

- `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ)` plus
  `ReadProcessMemory` and `CloseHandle` for ordinary reads.
- The optional bounded heap scan additionally calls `VirtualQueryEx` solely
  to enumerate readable committed regions. It is a query; it does not write or
  change target memory.
- No `WriteProcessMemory`, no suspend/resume, no debugger attach, no thread
  manipulation, no launch, no termination, no staging, no CAK/manifest/loader
  writes. The only files written are the JSON snapshot/plan/selftest outputs
  requested by the operator.
- Exact 64-hex build hash gate; wrong hash refuses with exit 5 before any
  memory read. Absent process refuses with exit 4. Non-64-bit PowerShell
  refuses with exit 3. Self-test failure exits 1. Dry-run success exits 0.

## Known limits

- The C# region-enumeration path (`VirtualQueryEx` + `ReadProcessMemory`) has
  not been exercised against a live game in this session; only the
  shape/verdict logic and the image-data/P E plan have been offline-validated.
  The first owner run is the first live exercise.
- The static class vtable `0x143E348A8` may have zero live occurrences at the
  capture moment (the class may not be instantiated, or the live vtable may
  differ). The locator therefore also uses entity magic and shape, and never
  requires the static vtable.
- `0x143E1A550` is a camera-channel object vtable from the 2026-10-26
  snapshots, not the 0x260 performer class; it is scanned only as context.
- The type-1 index -> class-record identity join is still not assumed. The
  capture reports observed pointer equalities; it does not invent an index
  mapping.
- A capture that finds no class is marked `invalid-root`/`no-target`, not D2.
  Only a live request with a different container supports D2.

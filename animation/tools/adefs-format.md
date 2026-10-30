# Aurora ADefs operations

The version-6 wrapper stores a version-1 sequential payload in the five current
native 2K26 motion-273 phase fixtures. `adefs-file.js` supports the existing zlib
wrapper and Oodle through AuroraCakHelper plus the game codec DLL. An external
animation editor is not required to inspect, export, or rename these definitions.

`adefs-payload.js` reads and serializes the argument catalog and complete
supported state, definition, node, event, trigger and argument-reference sections. Integer fields
are little endian; KV keys are big endian. Catalog type 2 stores signed int32.
64-bit GUIDs and hashes are decimal strings to avoid JavaScript precision loss.

The supported payload profile contains sequential tags `epyt`, `sgra`, `feda`,
`tats`, `__vk`, `cnys`, `_ttd`, `rvot`, `edon`, `csed`, `tnve`, `girt`, `_prg`.
Its string lengths include the terminating NUL. Strings are inline values, not
relative pointers. The identity writer splices only parsed string storage and
lengths, preserving every other byte. The graph writer serializes the measured
sequential grammar, preserves each state's original KV field order, and parses
the result again. Its `write-modern` command accepts JSON from `export-modern`,
transfers field order from the exact input file, and permits changes to argument
values and state event/trigger arrays while retaining the source definition,
state, and DTT layout. It refuses unknown keys/types, a changed
definition/state/DTT layout, malformed values, and output overwrites. Unknown
node kinds, populated unsupported blocks, or malformed inputs fail closed. This
profile is not a claim that every ADefs variant is supported.

From the repository root:

```powershell
node animation/tools/adefs-tool.js inspect-modern INPUT.adefs --work WORKSPACE/scratch --oodle GAME/oo2core_9_win64.dll
node animation/tools/adefs-tool.js export-modern INPUT.adefs OUTPUT.json --work WORKSPACE/scratch --oodle GAME/oo2core_9_win64.dll
node animation/tools/adefs-tool.js write-modern INPUT.adefs MODEL.json OUTPUT.adefs --work WORKSPACE/scratch --oodle GAME/oo2core_9_win64.dll
node animation/tools/adefs-tool.js rename-identity INPUT.adefs OUTPUT.adefs 273 14002 --work WORKSPACE/scratch --oodle GAME/oo2core_9_win64.dll
```

The writer was verified with byte-identical round trips of native Victory
1006100 and candidate 1014003 (20 definitions, 20 states, 80 events each). A
controlled one-trigger change also re-encoded and reopened successfully. This
provides safe graph authoring; it does not establish a 2K19-to-2K26 event-handler
mapping or runtime correctness.

Use an explicit workspace under the canonical repository for this project. Output
files are never overwritten. The helper executable can be selected with
`--helper`; the default is the bundled Aurora helper. The codec DLL remains a
game dependency. This does not require or distribute third-party editor software.

Fresh fixture evidence is under the active workflow's
`work-order-20261021/fresh-placement-review-20261021-v1/`:

- `run02/adefs-review.json`: all 47 definitions/150 events field-compared against
  independent saved editor exports, with exact u64 handling; both CAKs extracted.
- `typed-generation/verification.json`: five renamed wrappers regenerated
  byte-identically; five prototype clip merges unchanged; damaged variant rejected.
- `input-pins.json`: exact source, target clips, candidates and live-slot pins.

The old `380FE...` uoffset variant is rejected. Its nine numeric hits were false
positives overlapping argument types/values or `__vk` tag/count bytes. Neither a
large number nor an arithmetic landing on a later string establishes a pointer.

The prototype integration library now validates ADefs and obtains clip names from
typed node fields before merging records. Source-to-target event semantics,
unknown ADefs variants, app UI exposure, and final runtime/fidelity acceptance
remain separate.

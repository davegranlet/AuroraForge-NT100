# Build the current Aurora Forge workbench

The current Windows workbench entry is `umbrella-app/electron/workbench-main.js`.
The existing desktop services are shared implementations; the workbench shell,
tool library and source-based packaging are built by the current scripts.

## Source locations

| Component | Current source |
|---|---|
| Main app and desktop services | `umbrella-app/electron/`, `umbrella-app/app/` |
| CAK Foundry | `cak-foundry/electron/`, `cak-foundry/scripts/` |
| Animation readers, writers, converters and validators | `animation/tools/` |
| Entrance and Victory workflow one-offs | `animation/workflows/` |
| Native helpers | `umbrella-app/tools/AuroraCakHelper/`, `umbrella-app/tools/AuroraPac19Helper/` |
| Loaders and supporting tools | `loaders/`, `100-not-tribute/`, `scripts/`, `examples/` |
| Authored analysis utilities | Code files under `research/`; research results are omitted |

`SOURCE-SNAPSHOT.json` in a published snapshot lists the exact source file hashes.
Generated app tool copies are rebuilt from canonical source, rather than treated
as independent implementations.

## Building on Windows

Install Node.js/npm and the .NET SDK required by the helper projects. From
an actual Git clone, run `git lfs pull` to restore the application's LFS-managed
artwork. Source line endings are preserved for the snapshot hash manifest.
From
`umbrella-app`, run `npm ci`, then `node scripts/build-cak-helper.js` and
`node scripts/build-pac19-helper.js`. Restore the non-source runtime assets from
the corresponding released workbench using
`node scripts/restore-workbench-runtime.js <unpacked-workbench-folder>`.
Then run `node scripts/build-current-workbench.js`.

The output directory is `umbrella-app/dist/current-workbench/`.
The build synchronizes current tools, generates a source snapshot, checks
relative JavaScript dependencies, prepares the Tool Library, verifies the app,
and packages the Windows Electron runtime.

Node command tools and JavaScript exported functions use the bundled runtime.
For exported functions, arguments are a JSON array. Use an object such as
`{"$file":"C:/input/example.clips"}` for a binary Buffer argument, or
`{"$bigint":"12345678901234567890"}` for an integer-safe identifier.
Python, PowerShell and .NET project operations require their respective host
runtimes. Java/Ghidra scripts and other host-specific source are exposed for
inspection; they need their original host application. One-off scripts can have
specimen-specific assumptions; inclusion does not establish general support.

The current source library does not certify every animation conversion as
complete. The new structural animation pair adapter deliberately leaves unknown
semantic roles unresolved. Game files and private research fixtures are omitted.
The private verifier backend is excluded; its public client remains in the app.

## Verification

Run `node scripts/verify-package.js` and `node scripts/verify-tool-library.js`
from `umbrella-app`. The latter checks every library file hash and verifies
literal command argument handling, unknown-tool rejection, tamper detection
and path traversal rejection. `scripts/verify-current-workbench-runtime.js`
runs under Electron and checks the actual workbench page and preload bridge
using an isolated development profile.

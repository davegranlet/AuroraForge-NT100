# Current source export

All source stays in this GitHub repository. Public downloads, including the
Windows installer, Linux archive, source ZIPs, and checksums, are hosted on
`auroraforge.live`; GitHub Release pages link to the website. The Windows
auto-updater stays on GitHub Releases and must keep the GitHub provider. Attach
only the updater files (Windows installer, `.blockmap`, `latest.yml`) to GitHub.
See [PUBLISHING.md](../../PUBLISHING.md).

Run from the repository root:

```powershell
node scripts/release/export-current-source.js
node --test scripts/release/export-current-source.test.js animation/tools/analyze-2k26-animation-pair.test.js
```

Each invocation writes a new immutable snapshot beneath `.local/source-release/`.
`source/` preserves current source paths, including untracked scripts, one-offs,
build/project files, required source configurations, public licenses, and app
assets. Source bytes are copied and verified by SHA-256. Git history is not
copied. Re-run after app integration changes to capture the final source state.

`manifest.private.json`, outside the source payload, contains included hashes,
exclusion reasons, possible-secret holds, filesystem errors and unresolved
literal JavaScript imports. Never publish this private manifest. The public
`source/SOURCE-SNAPSHOT.json` contains relative paths, sizes and hashes only.

Protected and private trees, the verifier backend, logs, notes, proprietary game
inputs, binaries, generated/decompiled outputs and recursive app source-library
copies are excluded. Authored analysis programs and Ghidra scripts are included;
their research results are not. Source code under `docs/private` stays private.
The dated tool catalog supplements the live tree so known authored scripts in
otherwise generated output locations are considered individually.

This is an export operation, not a publication command. `publishReady` remains
false because source classification, third-party rights, non-JavaScript and
dynamic dependency closure, app integration and binary validation must be
established separately. It never commits, pushes, publishes, installs or edits
game files.

Programmatic use:

```javascript
const { exportCurrentSource } = require('./scripts/release/export-current-source');
const { out, payload, manifestPath, manifest, summary } =
  exportCurrentSource([], { quiet: true });
```

The structural `animation/tools/analyze-2k26-animation-pair.js` adapter restores
the historical import/API shape using current Aurora parsers. It does not
reconstruct missing semantic role classifications: roles stay `unknown` unless
the caller supplies explicit annotations. Role-dependent old crosswalks may
therefore reject an unsupported fixture with an expected-role error. This is
an explicit capability limit, not proof of conversion support.

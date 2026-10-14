# Versioning Audit - 2026-09-14

## Intended rule

- Main public releases use a `vMAJOR.MINOR.PATCH` label, for example `v1.0.0`.
- Smaller updates on top of a main release use a letter suffix without the `v`
  prefix in user-facing labels, for example `1.0.0a`.
- Product changes should always advance a version label before packaging or
  announcing a release.

## Current repo state

- The latest pushed source commit is `3b670b5 Add batch 2K20 Victory package builder`.
- The repository has no Git tags.
- The desktop app package metadata still says `0.9.0`.
- The desktop UI still displays `v0.9.0`.
- Historical notes and handoff files mention the previous packaged artifact
  `aurora-forge-converter 0.9.0.exe`.

## Product-version hits

| Location | Current value | Audit note |
| --- | --- | --- |
| `app/package.json` | `0.9.0` | Active Electron package version. Should be advanced before the next app package build. |
| `app/package-lock.json` | `0.9.0` | Lockfile root package version. Should match `app/package.json`. |
| `app/index.html` | `v0.9.0` | User-facing UI label. Should match the public release/update label. |
| `AURORA_FORGE_ACCOUNT_TRANSFER_HANDOFF_2026-09-14-CURRENT.md` | `0.9.0.exe` | Historical status note. Leave unless refreshing the handoff. |
| `AURORA_FORGE_ACTIVE_STATE.md` | `0.9.0.exe` | Historical status note. Leave unless refreshing the active state. |
| `notes/2026-09-12-direct-codec-paused-handoff.md` | `0.9.0.exe` | Historical note. Leave as record of the earlier build. |
| `notes/2026-09-13-active-codec-blockers.md` | `0.9.0.exe` | Historical note. Leave as record of the earlier build. |
| `knowledge.md` | `1.1.1.a` examples | Existing rule memory says small changes use a dotted letter suffix. Align future wording with the canonical `1.0.0a` style if that is the preferred format. |
| `tools/append_2k25_entrance_preserving_graph.js` | `v1.1.1.a` / `1.1.1.a` | Tool-local experimental writer version. Not the desktop app release version. |

## Related project-version references

These references are about other Aurora Forge tools or third-party artifacts and
should not drive this repository's desktop app version:

- `CURRENT-STATUS-AND-REPOSITORY-CAPABILITIES.md` references
  `v1.7.9.b`, `v1.0.01`, `1.14.1`, and `v1.5.1` for sibling tools and external
  tool folders.
- `blender_addon/aurora_entrance_lab/__init__.py` declares Blender add-on
  version `(0, 1, 0)`.
- Tool code such as `adefs-container.js`, `tbuf-v1.js`, and
  `amym-tbuf-report.js` uses the word `version` for file-format versions, not
  product releases.
- Dependency versions in `app/package-lock.json` are package manager data.

## Recommended correction

For the just-finished batch converter update:

- Treat the prior full 2K19 to 2K20 package-builder release as `v1.0.0`.
- Treat the batch-folder converter as the first smaller update: `1.0.0a`.
- Keep `app/package.json` and `app/package-lock.json` on npm-compatible semver,
  likely `1.0.0`, because `1.0.0a` is not standard npm semver.
- Put the user-facing update label `1.0.0a` in the UI and release artifact name.
- Create Git tag `v1.0.0` on the main package-builder release commit
  `e0abe6a`.
- Create Git tag `1.0.0a` on the batch converter update commit `3b670b5`.

## Suggested next release checklist

1. Update app package metadata from `0.9.0` to `1.0.0`.
2. Update the visible UI version label from `v0.9.0` to `1.0.0a`.
3. Rebuild the portable app so the packaged artifact no longer says `0.9.0`.
4. Confirm the packaged resources include the batch builder.
5. Tag `e0abe6a` as `v1.0.0` and `3b670b5` as `1.0.0a`.
6. Push both tags.


# Repository and Versioning Audit - 2026-09-14

## Scope

This audit covers:

- GitHub repositories visible to the authenticated `davegranlet` account.
- Local Aurora Forge repositories found under the bounded Aurora Forge workspace roots.
- Current product/tool version labels in package metadata, Git tags, and local release folders.
- Whether the major tools developed in the animation research repo have their own standalone repositories.

The broad recursive `.git` scan was stopped after it entered large workspace trees.
The final local scan used a bounded two-level search around the Aurora Forge
workspace roots.

## Versioning rule to preserve

- Main releases: `vMAJOR.MINOR.PATCH`, for example `v1.0.0`.
- Smaller updates: `MAJOR.MINOR.PATCHa`, for example `1.0.0a`.
- Package managers that require strict semver should keep strict metadata such
  as `1.0.0`; put the human-facing letter suffix in release labels, artifact
  names, Git tags, and UI labels.

## GitHub repositories

| Repository | Visibility | Tags found | Audit note |
| --- | --- | --- | --- |
| `davegranlet/Aurora-Forge-WWE2K19-Animation-Research` | Private | `v0.9.0` | Active animation research repo. Needs `v1.0.0` on `e0abe6a` and `1.0.0a` on `3b670b5` if the new rule is applied to the completed 2K20 package builder and batch update. |
| `davegranlet/Aurora-Forge-Converter-Releases` | Public | `v0.9.0` | Release-only repo still reflects the earlier app build. Needs a refreshed artifact once app metadata/UI labels are updated. |
| `davegranlet/Aurora-CAK-Foundry` | Public | `v1.7.9`, `v1.7.9.a`, `v1.7.8` | Uses dotted suffix `v1.7.9.a`; if the canonical small-update style is `1.7.9a`, future tags should switch. Existing tags can remain historical unless you want retag cleanup. |
| `davegranlet/Aurora-Forge-WWE2K19-Animation-Research-Public` | Public | `v0.1.0` | Historical public archive, not current release vehicle. |
| `davegranlet/Aurora-Forge-Research` | Private | none | No release tags. Fine for private research unless publishing artifacts. |
| `davegranlet/Aurora-Forge-Knowledgebase` | Private | none | No release tags. Fine for private docs unless publishing. |
| `davegranlet/Aurora-Forge-DDS-Converter` | Public | none | Public tool repo has package version `1.7.5` but no Git tags. Needs a release tag. |
| `davegranlet/Aurora-Forge-CAK-Mod-Loader-WWE2K25` | Private | `v1.0.02` | Uses two-digit patch style. If canonical rule is strict semver, future version should normalize to `v1.0.2`. |
| `davegranlet/Secure-DataCtrlLink-WWE2K25` | Private | `v1.0.02` | Same two-digit patch issue as above. |
| `davegranlet/AuroraForge_WWE_PC-Game_Modding_Tool` | Public | `v1.7.5`, `v1.7.5a`, `v1.7Major.Rc1.3`, `v1.7Major.Rc1.2`, `v1.7Major.Rc1.1`, `v1.7Major.Rc1`, `cak-foundry-v1.7.6c` | Mixed historical tag styles. Future tags should use the canonical rule. |
| `davegranlet/Aurora-Forge-Custom-Music-Loader-WWE2K25` | Public | none | Public tool repo has no tags. Needs current version and release tag if this is still active. |
| `davegranlet/Aurora-Forge-CAK-Mod-Loader` | Public | none | Public tool repo has dirty local release-note/package script work and no tags. Needs release tag after local changes are resolved. |
| `davegranlet/Aurora-Forge-Custom-Music-Loader` | Public | none | Public tool repo has dirty local release-note/package script work and no tags. Needs release tag after local changes are resolved. |
| `davegranlet/Secure-DataCtrlLink-WWE2K26` | Public | `v1.7.6`, `v1.0.0` | Has canonical main release tag plus newer `v1.7.6`. Check intended product lineage. |
| `davegranlet/wwecrap` | Public | none | General info repo. Tags optional unless it publishes release artifacts. |

## Local unpushed and dirty code

No bounded local repo reported committed work ahead of its upstream. The risks are
dirty and untracked working trees.

| Local repo | Branch | Upstream state | Dirty/untracked summary |
| --- | --- | --- | --- |
| `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype` | `main` | `0 ahead / 0 behind` | Dirty tracked generated `app/dist` files, dirty `tools/amym-tbuf-report.js`, dirty `tools/amym-tbuf-report.test.js`, untracked `app/node_modules`, untracked packaged-resource copies, notes, Ghidra helpers, and audit docs. |
| `D:\AuroraForge-Aug26\AuroraForge_WWE_PC-Game_Modding_Tool` | `agent/rc1-tutorial-automation` | `0 ahead / 0 behind` | Large dirty tree: app pages, Electron scripts, package metadata, PAC helper binary, docs, release notes, knowledge docs, Patreon assets, and 2K19/2K26 analysis scripts. Same status appears in matching `_worktrees` checkout. |
| `D:\AuroraForge-Aug26\Aurora-CAK-Foundry` | `main` | `0 ahead / 0 behind` | Dirty writer/backend files and many untracked packaged test/release assets. |
| `D:\AuroraForge-Aug26\Aurora-Forge-CAK-Mod-Loader` | `main` | `0 ahead / 0 behind` | Dirty `README.md`, `scripts/package-release.ps1`, and untracked `docs/RELEASE-NOTES-1.0.01.md`. |
| `D:\AuroraForge-Aug26\Aurora-Forge-Custom-Music-Loader` | `main` | `0 ahead / 0 behind` | Dirty `README.md`, `scripts/package-release.ps1`, and untracked `docs/RELEASE-NOTES-1.0.01.md`. |
| `D:\AuroraForge-Aug26\_work\aurora-patreon-verifier` | `main` | `0 ahead / 0 behind` | Dirty `worker/index.js` and untracked `aurora-patreon-verifier.tar.gz`. Remote is a ChatGPT-hosted site/source repo, not a named GitHub repo. |

Clean bounded local repos:

- `D:\AuroraForge-Aug26\Aurora-Forge-DDS-Converter`
- `D:\AuroraForge-Aug26\Aurora-Forge-Knowledgebase`
- `D:\AuroraForge-Aug26\Aurora-Forge-Research`
- `D:\AuroraForge-Aug26\Aurora-Forge-WWE2K19-Animation-Research-Public`
- `D:\AuroraForge-Aug26\Aurora-Forge-CAK-Mod-Loader-WWE2K25`
- `D:\AuroraForge-Aug26\Aurora-Forge-Custom-Music-Loader-WWE2K25`
- `D:\AuroraForge-Aug26\Secure-DataCtrlLink-WWE2K25`
- `D:\AuroraForge-Aug26\DataCtrlLink-MusicOnly`
- `D:\AuroraForge-Aug26\forge2\Secure-DataCtrlLink-WWE2K26`
- research clones under `_research`

## Package metadata versions

| Local package | Version | Audit note |
| --- | --- | --- |
| `D:\AuroraForge-Aug26\Aurora-CAK-Foundry\package.json` | `1.7.9` | Matches main `v1.7.9` tag, but small-update tag style is currently `v1.7.9.a`. |
| `D:\AuroraForge-Aug26\AuroraForge_WWE_PC-Game_Modding_Tool\package.json` | `1.7.5` | Package metadata is behind dirty local release docs mentioning `1.7.5a`, `1.7.6`, and `1.7.7`. Needs version reconciliation before next package. |
| `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\package.json` | `0.9.0` | Behind completed 2K20 package builder and batch update. Recommended strict metadata version: `1.0.0`; user-facing release/update label: `1.0.0a`. |
| `D:\AuroraForge-Aug26\Aurora-Forge-DDS-Converter\package.json` | `1.7.5` | No matching Git tag found. |

Foundry packaged Electron `version` files under `portable-release` contain
`43.2.0`, which appears to be the Electron/runtime version rather than the
product release label. Do not use those files as release-version authority.

## Tool-to-repository coverage

Current public repositories cover these standalone products:

- `Aurora-CAK-Foundry`
- `Aurora-Forge-DDS-Converter`
- `AuroraForge_WWE_PC-Game_Modding_Tool`
- `Aurora-Forge-CAK-Mod-Loader`
- `Aurora-Forge-Custom-Music-Loader`
- `Secure-DataCtrlLink-WWE2K26`
- `Aurora-Forge-Converter-Releases` as release-only storage

Major tools currently bundled inside
`WWE2K19-to-2K26-Entrance-Prototype` that do not have obvious standalone
repositories:

| Tool group | Representative files | Suggested repo |
| --- | --- | --- |
| 2K19 to 2K20 package builder | `build-2k19-to-2k20-victory-package.js`, `batch-2k19-to-2k20-victory-packages.js`, `patch-acts20-yanm.js`, `amym-container.js`, `fop19-evd20-body-model.js`, `convert-yanm19-to-yanm20.js` | `Aurora-Forge-2K19-to-2K20-Converter` |
| Desktop converter app | `app/main.js`, `app/app.js`, `app/preload.js`, `app/index.html` | either same as `Aurora-Forge-2K19-to-2K20-Converter` or `Aurora-Forge-Converter-App` |
| 2K19 PAC extraction helpers | `extract_2k19_pac.py`, `inspect_2k19_archive.js`, `inspect_2k19_shdc.py`, `extract_2k19_archive_entries.js` | `Aurora-Forge-2K19-PAC-Tools` |
| Blender animation add-on | `blender_addon/aurora_2k19_fbx_export.py`, `blender_addon/aurora_entrance_lab/__init__.py` | `Aurora-Forge-Blender-Animation-Tools` |
| 2K25 clips/Group90 research tools | `clips-layout.js`, `group90-encoder.js`, `group90-entries.js`, `group90-uleb.js`, `package-exported-clips.js` | keep private until conversion is proven, then split to `Aurora-Forge-Clips-Tools` |
| Patreon verifier worker | `_work\aurora-patreon-verifier\worker/index.js` | `Aurora-Forge-Patreon-Verifier` or keep as Sites/source deployment repo |

## Recommended next actions

1. Create tags in `Aurora-Forge-WWE2K19-Animation-Research`:
   - `v1.0.0` at `e0abe6a`
   - `1.0.0a` at `3b670b5`
2. Update the desktop app version surfaces:
   - `app/package.json`: `1.0.0`
   - `app/package-lock.json`: `1.0.0`
   - UI label: `1.0.0a`
3. Rebuild the portable app and publish the updated artifact to
   `Aurora-Forge-Converter-Releases`.
4. Split the completed 2K19 to 2K20 converter/package builder into its own
   public repo before treating it as a release-grade tool.
5. Decide whether the desktop app and converter CLI live in one repo or two.
6. Normalize future small-update tags to the no-dot suffix style, such as
   `1.0.0a`, while leaving historical tags untouched unless a cleanup pass is
   intentionally planned.
7. Resolve dirty local trees before tagging additional releases, especially:
   - `AuroraForge_WWE_PC-Game_Modding_Tool`
   - `Aurora-CAK-Foundry`
   - `Aurora-Forge-CAK-Mod-Loader`
   - `Aurora-Forge-Custom-Music-Loader`
   - `WWE2K19-to-2K26-Entrance-Prototype`

## Actions completed after audit

- Created and pushed public repo `davegranlet/Aurora-Forge-2K19-to-2K20-Converter`, tagged `1.0.0a`.
- Created and pushed public repo `davegranlet/Aurora-Forge-2K19-PAC-Tools`, tagged `v1.0.0`.
- Created and pushed private repo `davegranlet/Aurora-Forge-Blender-Animation-Tools`, tagged `v0.1.0`.
- Created and pushed private repo `davegranlet/Aurora-Forge-Clips-Tools`, tagged `v0.1.0`.
- Created and pushed public repo `davegranlet/Aurora-Forge-Converter-App`, tagged `1.0.0a`.
- Created and pushed private repo `davegranlet/Aurora-Forge-Patreon-Verifier`, tagged `v1.0.0`.
- Tagged `davegranlet/Aurora-Forge-WWE2K19-Animation-Research`:
  - `v1.0.0` at `e0abe6a`
  - `1.0.0a` at `3b670b5`
- Updated the source desktop app version surfaces:
  - `app/package.json`: `1.0.0`
  - `app/package-lock.json`: `1.0.0`
  - UI label: `1.0.0a`

Validation after version changes:

```powershell
node --check app\app.js
node --check app\main.js
node --check app\preload.js
node --test tools\batch-2k19-to-2k20-victory-packages.test.js tools\build-2k19-to-2k20-victory-package.test.js tools\patch-acts20-yanm.test.js tools\amym-container.test.js tools\fop19-evd20-body-model.test.js
```

Result: 43 tests passed, 0 failed.

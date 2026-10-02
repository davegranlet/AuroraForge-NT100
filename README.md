# AuroraForge NT100 — Umbrella (2.0 / Beta 3)

One repository for the whole AuroraForge NT100 bench.

**Version scheme:** major releases are plain (1.8.0, 2.0, ...); every fix/update
gets the next letter (2.0.a, 2.0.b, ...), one letter per shipped build. Versions
appear in the app, every download filename, and `VERSION-HISTORY.md`.

## Layout

| Section | Path | What lives here |
|---|---|---|
| Umbrella app | `umbrella-app/` | The AuroraForge NT100 desktop app: Electron shell, creator pages, bundled tools, bundled 2K26 skeleton, build + release scripts. |
| 100% Not TRIBUTE | `100-not-tribute/` | Tribute-replacement editors and creation suites, converging into one package (see its README for the inventory). |
| CAK Foundry | `cak-foundry/` | CAK manipulator tools and scripts: view, extract, bake, rebuild, reopen, verify. |
| Animation | `animation/` | The 2K19 → modern animation converter pipeline (app + toolchain). |
| Tutorials | `tutorials/` | Coming soon. |

## House rules

- **No duplicated trees.** Each asset has exactly one home. Example: the
  converter's bundled skeleton lives in `umbrella-app/app/skeletons/`; the
  animation pipeline references it from there instead of keeping a second copy.
- **Source only.** Research dumps, build outputs (`dist/`, `build/`), package
  caches, and rollback binaries stay out of this repository.
- **Private until clearance.** Release artifacts are compiled-only and published
  through the separate release repo (@AuroraForge-NT100), never from this source.

## Verification + protection

Builds verify in-app: active Patreon tier plus linked Discord VIP role, checked
through the hardened hosted verifier. Every release embeds a fresh verification
challenge bound through the whole sign-in flow.

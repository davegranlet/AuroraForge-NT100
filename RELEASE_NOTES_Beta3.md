# Aurora Forge Beta3

## Release Status

Beta3 is the integrated Aurora Forge main-app build for Windows and Linux x64. The main application owns access verification and launches the bundled converter with a short-lived verified session, so a signed-in user is not asked to authorize the converter again.

Big downloads are self-hosted at https://auroraforge.live (Downloads section). This GitHub release is the public mirror for release notes and SHA-256 hashes.

## Included

- Portable AuroraForge NT100 Beta3 for Windows x64 and Linux x64.
- Linux needs no GPU: software rendering is the default on Linux (VPS/headless hosts included). Set `AURORA_FORGE_GPU=1` on desktop Linux to re-enable hardware acceleration; any platform can force software rendering with `AURORA_FORGE_DISABLE_GPU=1`.
- WWE 2K19 to WWE 2K25/2K26 converter capability, launched from the main app.
- Byte-preserving registration writers: existing Victory/Entrance/Cutscene rows stay exactly as shipped; only the new rows are appended. The anchor motion template is never shipped in the output CAK.
- Version registry across WWE 2K19 / 2K20 / 2K25 / 2K26: installed-game detection and per-version CAK bake profiles (2K25 = FDIR 9.3 native, 2K26 = FDIR 9.9 JS).
- Bundled refreshed WWE 2K26 registration skeleton with a game-timestamp scan cache.
- Consolidated project catalog and integrated tool hubs.

## Verification

- Source package verification passed.
- Portable package verification passed (Windows and Linux builds).
- SHA-256: see `SHA256SUMS.txt` and the downloads page. Verify before running.
- Access is enforced in-app on every release: active Patreon tier plus a linked Discord VIP role, checked through the hosted Patreon verifier. The verified session carries from the main app into the bundled converter.

## Boundaries

In-game picker visibility of newly added entries remains under validation; earlier mounts that rebuilt live 2K26 registration tables in the older 2K25 record shape crashed the 2K26 boot, which is why Beta3 preserves live tables byte-for-byte. Universal animation fidelity, final pose alignment, facial conversion, and additive menu registration remain experimental and test-gated. No game files or extracted proprietary assets are included.

## Downloads

- Primary (self-hosted): https://auroraforge.live - Downloads section
- Mirror: https://github.com/davegranlet/AuroraForge-NT100/releases

## Umbrella App

AuroraForge NT100 Beta3 bundles this converter, the verified loader pair, the project catalog, and the flagship tools in one app.

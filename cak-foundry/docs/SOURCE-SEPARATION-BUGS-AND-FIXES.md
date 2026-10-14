**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Source separation bugs and fixes

## ACF-SEP-001 — Helper output folder was assumed to exist

- **Found:** September 5, 2026
- **Impact:** A clean checkout could compile `AuroraCakHelper.exe`, then fail while copying it into the app because `app/tools/cak-helper` did not yet exist.
- **Cause:** The old monolithic workspace always created that folder during staging.
- **Fix:** The standalone build script now creates the destination folder before copying the compiled helper.
- **Verification:** Build from the separated repository must produce `app/tools/cak-helper/AuroraCakHelper.exe`.

## ACF-SEP-002 — Verification script contained a developer-machine default

- **Found:** September 5, 2026
- **Impact:** Public source would expose a machine-specific test location and could test the wrong installation silently.
- **Cause:** The monolithic verification script used a convenient local default.
- **Fix:** The game folder is now a required command-line argument.
- **Verification:** Running without a path stops with a usage message; no personal path remains in source.


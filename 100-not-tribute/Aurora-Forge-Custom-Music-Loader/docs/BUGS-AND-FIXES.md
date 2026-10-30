**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Custom Music Loader bugs and fixes

## AFCML-001 — Generic output filename

- **Bug:** The separated build produced `music_loader.ftrib`, which did not clearly identify its project or purpose.
- **Fix:** The official output is `AuroraForge.CustomMusicLoader.ftrib`.
- **Verification:** The standalone build must produce that exact filename.

## AFCML-002 — Non-reproducible native hash

- **Bug:** Linker timestamps changed the compiled SHA-256 between identical builds.
- **Fix:** The addon uses reproducible PE linking.
- **Verification:** Consecutive builds must produce the same SHA-256, matching the approved Secure DataCtrlLink registry entry.


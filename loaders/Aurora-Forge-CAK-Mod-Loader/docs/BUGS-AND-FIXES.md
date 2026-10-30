**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# CAK Mod Loader bugs and fixes

## AFCML-CAK-001 — Feature ownership was unclear

- **Bug:** CAK mounting was built from the Secure DataCtrlLink repository and emitted the generic name `mod_loader.ftrib`.
- **Fix:** The feature now has its own project identity and emits `AuroraForge.CAKModLoader.ftrib`.
- **Verification:** Its independent reproducible build must match the SHA-256 approved by Secure DataCtrlLink.


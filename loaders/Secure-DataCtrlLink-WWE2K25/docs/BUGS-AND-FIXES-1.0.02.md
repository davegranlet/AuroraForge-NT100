**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Secure DataCtrlLink — WWE 2K25 v1.0.02 bugs and fixes

- Added a dedicated exact-build WWE 2K25 v1.23 profile rather than reusing WWE 2K26 offsets.
- Removed unsafe worker-thread and hardware-breakpoint experiments after their failures were reproduced and recorded.
- Loads only the exact approved CAK Mod Loader filename and SHA-256; arbitrary plugin loading remains disabled.
- Uses the verified game-window-thread dispatch implemented by the separate CAK Mod Loader addon.
- Updated the approved addon hash for the protected-catalog validator and successful custom mount contract.

Verification: the core identified only the pinned v1.23 executable, resolved all six DirectInput exports, loaded the approved addon, and remained responsive while the game returned success for the protected test CAK.

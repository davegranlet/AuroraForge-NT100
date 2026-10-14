**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Secure DataCtrlLink v1.7.7

Status: **Ready**

## What changed

- Removed generic `.ftrib` execution.
- Added a compiled filename and reproducible SHA-256 registry for approved addons.
- Added optional `plugins/addons.txt` enable/disable and initialization order.
- Separated CAK mounting and Custom Music into clearly named addon projects.
- Added detailed rejection reasons for unknown, modified, reparse-point, or malformed addons.
- Added reproducible native linking so official addon hashes remain stable across identical builds.

## Verification

- Registry, selection, status-message, mod-manifest, and runtime-config tests passed.
- Two consecutive builds produced identical addon hashes.
- The packaged loader and addons were extracted into clean folders and matched their published internal hashes.
- On September 5, 2026, the owner confirmed that the game loaded, test CAK content appeared, and custom music played.


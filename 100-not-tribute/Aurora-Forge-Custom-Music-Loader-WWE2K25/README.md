**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge Custom Music Loader

Aurora Forge Custom Music Loader is the custom-music addon separated from Secure DataCtrlLink. DataCtrlLink remains the shared game loader; this repository owns only the music feature.

## Current status

**Experimental — public source separation and loader integration in progress.**

The music functionality existed and worked before AI involvement. This source was separated from the developer's existing project so the secure core loader no longer needs to own the custom-music feature.

## Current ability map

| Area | Current capability | Boundary |
|---|---|---|
| Target game | WWE 2K25 research branch | Not approved by the WWE 2K25 Secure DataCtrlLink core yet |
| Custom music | Source separation and loader integration work are preserved for review | No public ready claim until compatibility and in-game behavior are verified |
| Security posture | Intended to follow the same named-addon and checksum-approval model as the 2K26 addon | Exact policy is not release-ready in this repository |

Publication does not weaken DataCtrlLink's exact-game-build checks. A packaged addon must be accepted through an explicit fail-closed loader policy. It must never depend on unrestricted scanning and execution of arbitrary native files.

The compiled addon is named `AuroraForge.CustomMusicLoader.ftrib` so users, logs, documentation, and support references always identify its purpose clearly.

No WWE game files, captured packages or banks, Oodle libraries, prior addon binaries, rollback copies, or research dumps are included.

The canonical provenance statement is [the development and provenance FAQ](docs/DEVELOPMENT-AND-PROVENANCE-FAQ.md).

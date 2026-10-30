**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate AuroraForge NT100, DataCtrlLink, their functionality, or the underlying development work.

# ADR-002: Standalone tools, SDCL Core, first-party addons, and game-build profiles

**Status:** Accepted
**Date:** 2026-09-01
**Deciders:** VikingStudios / AuroraForge NT100

## Context

AuroraForge NT100 features must ship both inside the main application and, where practical, as focused standalone tools. Secure DataCtrlLink currently combines CAK loading and custom-music behavior in one `dinput8.dll`, and supports one exact WWE 2K26 executable profile. Windows can load only one game-local `dinput8.dll`, while the project forbids generic native plugin discovery and guessed addresses.

## Decision

1. Ship the existing standalone CAK extractor/rebuilder/baker as **Aurora CAK Foundry**.
2. Keep one `dinput8.dll` named **Secure DataCtrlLink Core**. Core owns System32 forwarding, executable-profile selection, CAK validation/mounting, manifest ordering, diagnostics, and the only native hook lifecycle.
3. Remove custom-package registration and music-bank reconstruction from Core.
4. Ship custom music as **Secure DataCtrlLink Custom Music**, using Core's versioned addon ABI. Current and future feature addons rely on the installed Core loader. Core loads only addons explicitly named in its reviewed addon registry/manifest after validating addon ID, ABI version, filename, and approved hash/signature. Core never performs wildcard DLL scanning and never accepts `.asi`, `.dlp`, or unapproved modules.
5. Mirror user-facing controls in AuroraForge NT100 and in focused standalone applications. Shared backend modules remain one source of truth; standalone packages are generated views, not forks.
6. Replace the single build constant with a registry of complete compatibility profiles keyed by full executable SHA-256. Each profile contains every coupled RVA, signature, ordinal/ABI expectation, and timing value. Unknown or incomplete profiles remain fail-closed.

## Options Considered

### Separate competing `dinput8.dll` builds

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| User experience | Poor; Core and Music cannot be active together |
| Security | Strong but fragmented |

**Pros:** Simple binaries.
**Cons:** Mutually exclusive features and confusing installation.

### Generic plugin loader

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Extensibility | High |
| Security | Unacceptable |

**Pros:** Easy third-party expansion.
**Cons:** Restores the arbitrary native loading behavior explicitly rejected by the project.

### Approved-addon registry with a fixed first-party ABI — selected

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| User experience | Core and Music can coexist |
| Security | Fail-closed and auditable |

**Pros:** Clean separation, one proxy, no wildcard directory scanning, independently versioned feature addons.
**Cons:** Core must approve compatible addon versions and maintain a small ABI/registry.

## Consequences

- CAK-only users install Core without music code.
- Custom music can evolve independently without becoming a generic plugin ecosystem.
- Every game patch still requires a complete researched profile; “all versions” means all profiles actually validated and published, never wildcard acceptance.
- Main and standalone UI releases must identify the compatible Core/addon/profile versions.

## Action Items

1. Rename and package the standalone CAK tool as Aurora CAK Foundry.
2. Extract Wwise/package/bank orchestration from Core into the fixed addon ABI.
3. Add approved addon metadata and exact validation to Core.
4. Refactor build-specific constants into complete profile records.
5. Add a compatibility-report submission flow for unknown WWE 2K26 builds.
6. Populate and validate profiles for collected retail/hotfix executable hashes.

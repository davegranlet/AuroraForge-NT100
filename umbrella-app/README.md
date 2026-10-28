**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate AuroraForge NT100, DataCtrlLink, their functionality, or the underlying development work.

# AuroraForge NT100 v1.8.0-beta.1

AuroraForge NT100 is a local WWE PC modding workspace that folds the supporting converter, loader, archive, texture, project, prompt-builder, and tutorial work into one Beta2 app experience.

## Highlights

- **Aurora CAK Foundry:** browse and extract WWE 2K26 CAKs, create a separate protected CAK from a `BakeMe` folder, and verify every stored payload byte-for-byte.
- **WWE 2K26 Modding Hub:** clearly separates working operations from Coming Soon editors.
- **Secure DataCtrlLink Workshop:** fail-closed compatibility checks, checksum-verified installation, backups, rollback, diagnostics, experimental manifest order, and experimental collision reports for the reviewed loader profile.
- **Cross-generation tools:** WWE 2K19 PAC Explorer and Rebuilder and WWE 2K20 CAK Workbench, with unsupported operations labeled honestly.
- **DDS Converter:** button-driven DDS/PNG file and folder conversion using the included redistributable DirectXTex converter.
- **Animation Converter Beta2:** controlled WWE 2K19 motion to WWE 2K25 replacement output, explicitly test-gated for in-game proof.
- **No access gate:** Beta 4 (2.1) opens directly with no Patreon, Discord, or in-app verification.
- Guided prompt builders, project folders, handoff packs, reference workflows, and 48 in-app tutorials.

## Owner-only candidate

The internal repository catalog should stay out of the public Beta2 app. It may return later in an owner-only build as a maintenance and release-audit view.

## Build and verification

See [BUILDING.md](BUILDING.md). No proprietary game file is committed or packaged.

Read [RELEASE_NOTES_1.8.0-beta.1.md](RELEASE_NOTES_1.8.0-beta.1.md), the historical [v1.7.5 notes](RELEASE_NOTES_1.7.5.md), and the canonical [FAQ.md](FAQ.md).

# Aurora Forge v2.0

## Umbrella Beta

This beta brings the supporting Aurora Forge project work into one portable Windows workspace without exposing the internal repository catalog to end users.

### Included

- Bundled Aurora Forge Animation Converter Beta2.
- Bundled WWE 2K25 v1.23/SNME loader pair with checksum-verified boot-thread CAK mounting.
- Main app access gate that verifies Beta2 access before opening the workspace, tools, or bundled converter.
- Existing prompt builders, project workflows, archive tools, DDS conversion, and reference material from v1.7.5.

### Owner-only candidate

The internal repository catalog is reserved for a possible owner-only build as a maintenance and release-audit view. It is not part of the public Beta2 user experience.

### Animation converter status

Beta2 provides the controlled WWE 2K19 decoded-motion plus WWE 2K25 template replacement path. It builds replacement `.clips` output and a loader-ready CAK candidate.

The following remain experimental and must not be described as proven:

- General full-body fidelity across arbitrary animations.
- Additive `TEST 14000` registration and picker preview.
- Universal pose, root, and alignment correction.
- Facial animation conversion.

### Test gate

Treat converter output as a candidate until it visibly plays the imported motion in WWE 2K25. Back up the game and loader configuration, mount only one registry-changing candidate at a time, and retain a known-good rollback.

This beta is not affiliated with or endorsed by WWE, 2K, Visual Concepts, or third-party modding-tool maintainers.

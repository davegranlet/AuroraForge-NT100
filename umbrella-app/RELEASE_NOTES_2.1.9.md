# Aurora Forge NT100 2.1.9

This patch publishes the verified WWE 2K19-to-2K26 Victory native-layout reconstruction used by the successful Candidate G runtime test.

## Animation converter

- Keeps the converted 64-track choreography payload bit-exact.
- Rebuilds the body on the native 73-track WWE 2K26 layout.
- Restores the nine native camera, targeting, foot-IK, dock, and opponent tracks.
- Preserves the converted record identity and frame count.
- Verifies output structure, decoded error, and unchanged companion records.

Canonical CLI:

```text
node animation/tools/rebuild-native-layout-body.js --converted <converted.clips> --native <native-2k26.clips> --out <output.clips>
```

## Downloads

- Windows x64: https://auroraforge.live/downloads/AuroraForge-NT100-Setup-2.1.9-x64.exe
- Linux x64: https://auroraforge.live/downloads/AuroraForge-NT100-2.1.9-Linux-x64.tar.gz

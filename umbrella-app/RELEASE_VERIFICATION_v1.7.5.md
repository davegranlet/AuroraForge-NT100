**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge v1.7.5 release verification

## Main package

- File: `Aurora-Forge-v1.7.5-Windows-x64.zip`
- Size: 249,089,181 bytes (237.55 MiB)
- SHA-256: `AE06262DEFC867B3B90AF33B9B1C4EC7CAC5021E1349EC9A406BF4A51D227DF0`

## Standalone Aurora CAK Foundry package

- File: `Aurora-CAK-Foundry-v1.7.5-Windows-x64.zip`
- Size: 179,401,175 bytes (171.09 MiB)
- SHA-256: `9616EFF638E195763CE6260DA5416F6902BC58684C7F3A0D789381F2B65F3748`

## Completed checks

- Full source/package verification passed.
- Aurora CAK Foundry synthetic rebuild passed: three files, four folders, protected payloads recovered byte-for-byte.
- Secure DataCtrlLink install/rollback, checksum refusal, running-game refusal, release-ZIP staging, diagnostics, collision report, and redacted-report tests passed.
- Mod manifest enable/disable/order tests passed.
- WWE 2K19 HSPC, SHDC, ZLIB extraction/replacement/header tests passed.
- WWE 2K20 verified six archives, 284,260 decoded entries, and six byte-for-byte samples.
- DirectXTex PNG → BC7 DDS → PNG passed at 256×256 with nine mip levels.
- Real WWE 2K26 extraction passed for one stored and two Oodle-compressed samples.
- All 15 original-release and all 15 v1.14 CAKs opened successfully, including both substantially different `bakedfile100.cak` versions.
- Portable ZIP content verification passed, including executables, runtime dependencies, licenses, FAQ, release notes, and rollback instructions.
- The final ZIP was extracted into a new clean temporary folder containing 90 files and 564,085,661 expanded bytes.
- `Aurora Forge.exe` launched from that clean folder and remained running for the ten-second launch check.
- No game CAKs, Oodle DLLs, development/research folders, decompiler names, or personal paths were found in the packaged output scan.
- Standalone Aurora CAK Foundry was independently extracted and launched from a second clean temporary folder.

## Test boundary

No in-game navigation or gameplay acceptance was performed during packaging. The user performs final in-game confirmation. Secure DataCtrlLink remains limited to exact reviewed compatibility profiles.

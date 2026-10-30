# Current WWE 2K26 Loader Status

Timestamp: 2026-09-28 00:40 -04:00

## Current State

Secure DataCtrlLink and CAK Foundry are verified together on the current Steam WWE 2K26 executable for texture replacement CAKs.

- CAK Foundry / baker / validator builds current WWE 2K26 protected `FDIR v9 + T_DB v6` CAKs.
- Secure DataCtrlLink recognizes the fresh Steam WWE 2K26 executable hash.
- The loader mounts valid CAKs directly from `<game>\mods`.
- The verified load-order fix is after stock `bakedfile90.cak`, not after the early boot archives.

## Current WWE 2K26 Testbed

```text
Game folder:
C:\SteamLibrary\steamapps\common\WWE 2K26

Executable:
WWE2K26_x64.exe

SHA256:
48adfde192352a529a215a05381bc754a8a9a360d86858e654086363360c9cea

Profile:
Steam 2026-09-25

mount_rva:     0x2812ED1
signature_rva: 0x281303C
phase_rva:     0x27E2290
```

## Hard Rule

All modded `.cak` files must remain under:

```text
C:\SteamLibrary\steamapps\common\WWE 2K26\mods
```

Do not copy, stage, rename, replace, or masquerade a modded CAK as a game-root `bakedfile*.cak`.

Do not overwrite stock game CAKs.

## Verified Runtime Contract

```ini
CakMountOrigin=2
CakMountIndex=1
CakInjectOrigin=0
CakInjectIndex=90
CakInjectExact=1
```

Meaning:

- Watch native mount calls from the game's own boot thread.
- Trigger only when the stock chain reaches `origin=0,index=90`.
- Mount Aurora mod CAKs as addon archives with `origin=2,index=1`.

The previous early trigger (`origin=0,index>=3`) successfully registered the CAK but did not reliably show changed content because later stock archives could override it.

The previous phase-hook / worker-thread / stock re-mount strategy froze or crashed the September 2026 Steam executable.

After this runtime fix, a package that mounts but shows strange texture results should be debugged as a content/package bake issue first. Owner confirmation on 2026-09-28: correcting the bake made the same runtime path load cleanly.

## Final Verified Test

```text
Input:
D:\WWE26-mods\compiled releases for review\TRIBUTE 26 v1.6.0\TRIBUTE 26\BakeMe

Built CAK:
D:\testcaks\AuroraForgeNT100-Tribute26-v1.6.0-full-final.cak

Staged CAK:
C:\SteamLibrary\steamapps\common\WWE 2K26\mods\AuroraForgeNT100-Tribute26-v1.6.0-full-final.cak

SHA256:
4689dbc18a61e7683b8040e1455a19fc0e6b18f9cc5df8d35d8b7b074b06e5eb

Size:
223,087,246 bytes

Validator:
PASS, files=104, folders=65
```

Owner launch result: game reached menus and the replacement textures appeared in Create-a-Superstar. Follow-up owner confirmation: after fixing the package bake, everything loaded correctly.

## Keep

- Mount-function hook.
- Boot-thread injection.
- `mods\manifest.json` order.
- CAK validation before mount.
- Exact after-90 injection default.
- Music loader disabled unless a music test explicitly needs it.

## Do Not Regress

- Do not stage modded archives into the game root.
- Do not overwrite stock `bakedfile*.cak`.
- Do not go back to phase-hook mounting.
- Do not remount stock archives.
- Do not treat "popup appeared" as enough; the proof is visible in-game replacement content.

# Secure DataCtrlLink WWE 2K26 Current Steam Build Status

Timestamp: 2026-09-28 00:40 -04:00

## Summary

The current fresh Steam WWE 2K26 executable is recognized by Secure DataCtrlLink, and the CAK mod loader is now verified in-game for texture replacement CAKs staged from `mods`.

The winning runtime fix is load order:

- Hook the game mount function (`mount_rva`), not the archive phase.
- Inject mod CAKs on the game's boot thread.
- Wait until the stock chain reaches exactly `origin=0,index=90` (`bakedfile90.cak`).
- Mount each mod CAK with `(absolute path, nullptr, origin=2, index=1)`.
- Keep every modded CAK under `<game>\mods`.

Mounting after `bakedfile03.cak` registered the archive but produced no visible texture changes because later stock CAKs won lookup priority. The old phase-hook / worker-thread / stock re-mount path froze or crashed this executable and must not return.

The final loader/toolchain test is good. If a specific baked package produces strange textures after this point, treat that as a content/package bake issue, not a DataCtrlLink mount failure.

## Supported Builds

```text
Game: C:\SteamLibrary\steamapps\common\WWE 2K26
Executable: WWE2K26_x64.exe

Current (2026-10-08 forced Steam update):
SHA256: 7a540792a9a41a42c38f32d3e2776e816704ab863344c04c0c2ce9052dcf6574
Profile: Steam 2026-10-08
mount_rva: 0x28142C1
signature_rva: 0x281442C
phase_rva: 0x27E3680
RVA shift vs 2026-09-25: +0x13F0 (all three; verified by unique static
signature hits in the new executable; registry_pointer_rva intentionally
omitted, so the post-ResourceSync pass and deferred probes are skipped -
the boot injection at origin=0,index=90 is the proven mounting path)

Previous (2026-09-25):
SHA256: 48adfde192352a529a215a05381bc754a8a9a360d86858e654086363360c9cea
Profile: Steam 2026-09-25
mount_rva: 0x2812ED1
signature_rva: 0x281303C
phase_rva: 0x27E2290
registry_pointer_rva: 0x4D716B0
```

Staged proxy: `dinput8.dll` SHA256 `b2eab90619312a31d979dcc4d5b6b86073cf0707d6b3a9387bdbcd9beada96da`
(backup of previous: `dinput8.dll.20261008-193836.before-20261008-update.bak`).

## Required Mod Storage Rule

Modded CAKs must stay in:

```text
<game>\mods
```

Do not copy or stage modded CAKs into the game root.

Do not overwrite, rename, or imitate stock `bakedfile*.cak` archives.

## Verified Runtime Configuration

Default runtime config now matches the proven path:

```ini
CakMountOrigin=2
CakMountIndex=1
CakInjectOrigin=0
CakInjectIndex=90
CakInjectExact=1
```

## Final Test Archive

```text
Source BakeMe:
D:\WWE26-mods\compiled releases for review\TRIBUTE 26 v1.6.0\TRIBUTE 26\BakeMe

Output:
D:\testcaks\AuroraForgeNT100-Tribute26-v1.6.0-full-final.cak

Staged:
C:\SteamLibrary\steamapps\common\WWE 2K26\mods\AuroraForgeNT100-Tribute26-v1.6.0-full-final.cak

SHA256:
4689dbc18a61e7683b8040e1455a19fc0e6b18f9cc5df8d35d8b7b074b06e5eb

Size:
223,087,246 bytes

Validator:
PASS, files=104, folders=65
```

Owner launch result: game loaded to menus and showed the expected replacement textures in Create-a-Superstar. Follow-up owner confirmation: after correcting the package bake, everything loaded correctly.

## Regression Notes

- `origin=0,index>=3` is not enough. The popup can report the CAK mounted while in-game content remains unchanged.
- Before the load-order fix, both CakeView-baked and Aurora Foundry-baked CAKs failed to show changes, proving that specific failure was runtime order. After the runtime fix, any remaining bad visuals were confirmed as package bake/input issues.
- `_textures.tdb` is not the primary fix for this case.
- Music loader should stay disabled unless custom music is being tested.

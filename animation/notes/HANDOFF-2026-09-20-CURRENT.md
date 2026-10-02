# Aurora Forge Beta1.0.0a — Current Handoff

Date: 2026-09-20
Status: testing
Owner: Codex continuation

## Immediate goal

Deliver the portable Aurora Forge `Beta1.0.0a` Patreon preview with the 2K19-to-2K25 converter/editor surface usable offline, while continuing the WWE 2K25 loader work needed to prove that converted entrance data appears in the in-game picker.

## What is currently usable

- Portable preview: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\Aurora-Forge-Beta1.0.0a-Preview.exe`
- Portable SHA-256: `F556E4C34CF2A08020966611828CE58DA8CC335D6AA0EF92837CD3540C8A00FE`
- Packaged runtime launches successfully.
- Focused converter/editor tests: `38/38` passing.
- Earlier full source-tool suite: `122/122` passing.
- Public pipeline surface has 30 staged tools. Read/write editor helpers, BakeMe orchestration, DataCtrlLink log checking, and Patreon entitlement verification are present.
- Patreon verification supports direct active-tier proof and Discord VIP-role proof with guild, user, role, expiry, and freshness checks. See `app\PATREON_ACCESS.md`.

The portable preview is suitable for an offline converter/editor preview. It is not yet an in-game-validity claim.

## Loader state

Known safe behavior:

- The window-thread fallback can mount an arbitrary-name CAK and logs `ACCEPTED CAK`, but it runs after the frontend has already read the Victory/Cutscene tables. It is too late for reliable picker visibility.
- Worker-thread pre-window calls into the native CAK mount routine repeatedly crash before the `mount returned` log. Do not retry timed worker mounts.
- The old top-level `MessageBox` notice is rejected by design because it steals focus and can destabilize the game. The requested notice must remain an in-game overlay, not a Windows popup.

Current diagnostic source state:

- Addon source: `D:\AuroraForge-Aug26\Aurora-Forge-CAK-Mod-Loader-WWE2K25\src\plugins\mod_loader\mod_loader.cpp`
- The native observer is gated by `RuntimePreWindowMount` and is log-only. It now targets the live archive boot function identified from a captured executable at RVA `0x2E00A0`.
- Latest addon build hash: `88BC53C161708038223F2BFA7B9BFCD32D67827CB1724642EA10670482EBFF3D`
- Core source registry has been updated to approve that hash, but the core has not yet been rebuilt after this latest registry update.
- The current game directory still has the previous phase-observer pair installed and has this diagnostic config:

```ini
RuntimePreWindowMount=1
EarlyPreWindowMount=0
DxgiOverlayNotice=0
```

This is a test configuration, not a release configuration.

## Required next sequence

1. Build `Aurora-Forge-CAK-Mod-Loader-WWE2K25` and confirm the addon hash remains `88BC53C...`.
2. Build `Secure-DataCtrlLink-WWE2K25` after the registry update.
3. Run core tests: `addon_registry_tests.exe`, `runtime_config_tests.exe`, and `status_message_tests.exe`.
4. Stage the newly built core and addon together into `C:\WWE 2K25 Saturday Nights Main Event\`.
5. Verify staged hashes equal the build hashes before launching.
6. Move the old `DataCtrlLink.log` to a timestamped backup, launch the game, and wait approximately 45 seconds.
7. Look for both `Loaded approved addon` and `Native mount observer armed at live archive boot RVA 0x2e00a0`. The useful result is `Native mount detour first call` without a crash.
8. Keep the observer log-only until the real ABI and call sequence are proven. Do not inject CAK mounts from the observer yet.
9. If the observer is safe but never receives a call, re-derive the native target from the live code rather than enabling worker-thread mounting.
10. After the diagnostic run, restore the default-safe configuration by removing the test INI or setting all three flags to `0`.

## Game evidence already established

- Live fallback-safe capture located executable code and string xrefs around the archive boot path.
- Stored profile mount RVA `0x2E03F0` did not behave as a safe observer target; direct hook creation crashed before the detour fired.
- Stored phase RVA `0x2E05A0` produced MinHook status `8` and did not install.
- Live xrefs for `bakedfile` and `%s%02d.cak` identify a candidate function beginning near `0x2E00A0`; that is the current gated observer target.
- The converter-side `TEST 6185` package is offline-validated and has been accepted by the loader, but picker visibility/playback is still unproven.

## Release boundaries

Do not claim any of the following yet:

- that converted content is proven in WWE 2K25;
- that `TEST 14000` or `TEST 6185` appears in the picker;
- that the in-game overlay hook is complete;
- that the current diagnostic loader pair is safe to ship.

The safe Patreon preview claim is: portable converter/editor and entitlement-verification preview, with loader timing and in-game overlay marked `coming` until a matched pair survives launch and a direct picker/preview test succeeds.

## Important files

- [Beta preview notes](D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\notes\BETA1.0.0a-PATREON-PREVIEW-2026-09-19.md)
- [Unsolved loader handoff](D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\notes\HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md)
- [Loader crash handoff](D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\notes\HANDOFF-2026-09-19-BETA100A-LOADER-CRASH.md)
- [Active state](D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\AURORA_FORGE_ACTIVE_STATE.md)
- [Worker communication](D:\worker-communication.md)

## Recovery

If the next diagnostic launch crashes, disable `RuntimePreWindowMount`, remove the test INI, and restore the known safe fallback pair documented in `HANDOFF-LOADER-PREWINDOW-UNSOLVED-2026-09-19.md`. Preserve the new log and crash dump; do not delete them before recording hashes and timestamps.

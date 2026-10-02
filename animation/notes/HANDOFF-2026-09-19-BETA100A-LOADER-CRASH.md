# Aurora Forge Beta1.0.0a / Loader Crash Handoff — 2026-09-19

## Open order

1. `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\AURORA_FORGE_ACTIVE_STATE.md`
2. This file.
3. `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\notes\BETA1.0.0a-PATREON-PREVIEW-2026-09-19.md`
4. For loader code only:
   - `D:\AuroraForge-Aug26\Aurora-Forge-CAK-Mod-Loader-WWE2K25\src\plugins\mod_loader\mod_loader.cpp`
   - `D:\AuroraForge-Aug26\Secure-DataCtrlLink-WWE2K25\src\core\addon_registry.hpp`

## User-facing goal

Produce a portable Aurora Forge Beta1.0.0a preview app for Patreon users, with the 2K19-to-2K25 converter as the immediate test focus.

The preview app now exists and smoke-checks. The live game-serving loader path is not shippable yet because the latest runtime-ready pre-window mount build crashes WWE 2K25 before it logs a CAK mount result.

## Portable app status

- Artifact: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\Aurora-Forge-Beta1.0.0a-Preview.exe`
- Size: `76,031,009` bytes
- SHA-256: `F556E4C34CF2A08020966611828CE58DA8CC335D6AA0EF92837CD3540C8A00FE`
- Build command: `npm run package` from `app\`
- Public tool staging: `30` allowlisted files; research/future-pipeline scripts excluded.
- Packaged resource checks:
  - `resources\aurora-tools\tools\check-datactrlink-log.js` present
  - `resources\aurora-tools\tools\pipeline-editor-suite.js` present
- Smoke check: `app\dist\win-unpacked\Aurora Forge Beta1.0.0a.exe` launched hidden and stayed alive for 6 seconds, then the smoke test closed it.

## Active/coming surface

Active in the portable app:

- 2K19 source intake readers.
- 2K19 to 2K20 proven bridge tooling.
- 2K25 `.clips` inspect/build path in repo tooling.
- VictoryListData editor.
- EntranceListData finder/diff/editor.
- CutsceneNoRegistry finder/inspector/editor.
- SDB reader/summary/writer.
- BakeMe full-tree copy/edit/proof orchestrator.
- CAK catalog inspection.
- DataCtrlLink log checker.
- Hardened Patreon/Discord entitlement response parsing.

Coming/unverified:

- DataCtrlLink pre-frontend mount timing for TEST 14000 picker visibility.
- In-game mod-status overlay notice. DXGI hook install is logged, but no rendered notice was verified because the game crashed before the notice window.

## Patreon entitlement setup

Recommended path remains:

1. Patreon paid tier grants Discord VIP role through Patreon’s Discord integration.
2. User signs in through hosted Aurora verifier.
3. Verifier checks Discord guild membership and VIP role using server-side Discord bot token.
4. App unlocks only for strong proof:
   - direct active Patreon tier proof, or
   - `entitlementMethod: "discord_guild_role"` with `guildId`, `discordUserId`, allowed role overlap, and fresh/unexpired timestamps.

Required verifier config:

```text
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
DISCORD_ALLOWED_ROLE_IDS=vip_role_id_here
AURORA_SESSION_TTL_SECONDS=21600
```

Keep all Discord/Patreon secrets on the hosted verifier. The portable app should only know the verifier URL.

## Test results

Prototype focused suite:

```text
node --test tools\check-datactrlink-log.test.js tools\pipeline-editor-suite.test.js tools\bakeme-orchestrator.test.js tools\patreon-access.test.js tools\clips-codec\cutscene-registry.test.js tools\sdb-read.test.js tools\find-2k25-entrance-entry.test.js
```

Result: `38/38` passing.

Addon tests:

```text
.\build\status_message_tests.exe
.\build\mod_manifest_tests.exe
.\build\runtime_config_tests.exe
.\build\cak_collision_tests.exe
```

Result: pass.

Core tests:

```text
.\build\addon_registry_tests.exe
.\build\status_message_tests.exe
.\build\runtime_config_tests.exe
```

Result: pass.

## Installed game state at handoff

Game folder: `C:\WWE 2K25 Saturday Nights Main Event`

Installed core:

- File: `C:\WWE 2K25 Saturday Nights Main Event\dinput8.dll`
- SHA-256: `02D6BFF68BDEB169F613D19F7820F02513541D7B151069171DE31B282DE3E91C`
- Size: `1,605,120` bytes

Installed addon:

- File: `C:\WWE 2K25 Saturday Nights Main Event\plugins\AuroraForge.CAKModLoader.ftrib`
- SHA-256: `447B878E5973BAADC75A2379508BC82B8191A9F6137CA321F81F72FF444C3C33`
- Size: `1,642,496` bytes

Enabled CAK:

- File: `C:\WWE 2K25 Saturday Nights Main Event\mods\aurora-14000-compat-v103a.cak`
- Size: `56,080,748` bytes

## Latest game-launch verdict

User launched and reported nothing loaded.

Latest log block:

- Start: `[2026-09-19 19:27:18] Secure DataCtrlLink Orchestrator started`
- Core hash in log: `02d6bff68bdeb169f613d19f7820f02513541d7b151069171de31b282de3e91c`
- Addon loaded: `Aurora Forge CAK Mod Loader - WWE 2K25 DXGI overlay runtime-prewindow development build`
- File-open observers installed: yes, `4 of 4`
- DXGI overlay hook installed: yes
- Runtime-ready worker started: yes, `Runtime transition observed; beginning immediate pre-window mod mounts`
- Expected CAK mentioned: no
- `PRE-WINDOW ACCEPTED`: no
- fallback `ACCEPTED CAK`: no
- overlay queued line: no
- log checker status: `wrong_cak_or_no_mount`

Fresh crash dumps:

- `C:\Users\dgran\AppData\Local\CrashDumps\WWE2K25_x64.exe.2240.dmp`
  - Size: `475,854,567` bytes
  - Last write: `2026-09-19 19:26:11`
  - SHA-256: `6086A9C41FDF747334C1DF701C0CE0E150CC261EDA0DD5B2995A7D9A23FAFCCF`
- `C:\Users\dgran\AppData\Local\CrashDumps\WWE2K25_x64.exe.15308.dmp`
  - Size: `475,842,970` bytes
  - Last write: `2026-09-19 19:27:22`
  - SHA-256: `5409143DB7BB9760DFBE214394103D2BB86B79689003A6C14AB640F210B1E9B9`

No `cdb`, `windbg`, or `dumpchk` was found on PATH. LLVM obj tools are present but not enough for useful minidump stack analysis.

## Analysis

The DXGI overlay hook installation itself is not proven to be the crash point. The crash happens after:

```text
Runtime transition observed; beginning immediate pre-window mod mounts
```

and before any archive-specific `PRE-WINDOW ACCEPTED`, failure, fallback, or overlay queued log line. The most likely cause is that the new runtime-ready pre-window worker calls the native CAK mount routine too early for this WWE 2K25 build, crashing in or immediately around that native call before our per-archive logging returns.

The earlier fallback-only build did not crash, but it mounted too late for menu/picker registration. The topmost Windows `MessageBoxW` visual notice build also loaded but was rejected for UX reasons because it stole focus and could destabilize the game. Do not reintroduce that popup.

## Safest next action

Do not ship the installed DXGI/runtime-prewindow loader build as the Patreon preview loader.

Next loader step should be one of:

1. Disable or gate the `runtime_pre_window_worker` and return to a non-crashing baseline while preserving the DXGI hook behind a no-op/diagnostic flag.
2. Add a safer mount trigger between the current too-early runtime-ready point and the too-late window fallback. Candidates to investigate:
   - a later native phase transition after `VirtualProtect` readiness,
   - an actual game archive manager readiness signal rather than `CreateFileW` path sniffing,
   - a delayed first mount after runtime-ready with binary-search timing, logging before and after the native call.
3. Install WinDbg/cdb or otherwise analyze the fresh dump to confirm the crash address before another blind game run.

For the Patreon Beta1.0.0a preview, the portable app can be presented as a converter/editor/orchestrator preview with loader timing and in-game overlay marked coming. The converter is not yet proven in-game valid until TEST 14000 appears in the picker and previews.

## Files changed in this pass

Prototype repo:

- `tools/check-datactrlink-log.js`
- `tools/check-datactrlink-log.test.js`
- `tools/pipeline-editor-suite.js`
- `tools/pipeline-editor-suite.test.js`
- `notes/BETA1.0.0a-PATREON-PREVIEW-2026-09-19.md`
- `AURORA_FORGE_ACTIVE_STATE.md`
- packaged outputs under `app\dist\...`

Addon repo:

- `src\plugins\mod_loader\mod_loader.cpp`
- `build.ps1`
- built `build\AuroraForge.CAKModLoader.ftrib`

Core repo:

- `src\core\addon_registry.hpp`
- `tests\addon_registry_tests.cpp`
- built `build\dinput8.dll`

Do not clean or reset dirty worktrees. Existing generated/package files are intentionally dirty.

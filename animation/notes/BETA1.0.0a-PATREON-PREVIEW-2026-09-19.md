# Aurora Forge Beta1.0.0a Patreon Preview — 2026-09-19

## Portable artifact

- File: `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\app\dist\Aurora-Forge-Beta1.0.0a-Preview.exe`
- Size: `76,031,009` bytes
- SHA-256: `F556E4C34CF2A08020966611828CE58DA8CC335D6AA0EF92837CD3540C8A00FE`
- Build command: `npm run package` from `app\`
- Public tool staging: `30` allowlisted files, including the active 2K25 registry/SDB editor suite, BakeMe orchestrator, and DataCtrlLink log checker; tests and broad research scripts excluded.
- Smoke check: rebuilt unpacked app launched and stayed alive for 6 seconds, then was closed by the test.

## Access gate setup

Recommended preview entitlement path:

1. Patreon paid tier grants the Discord VIP role through the official Patreon Discord integration.
2. User signs in through the hosted Aurora verifier.
3. The verifier checks Discord guild membership and the VIP role with a server-side Discord bot token.
4. The app unlocks only when the verifier returns `entitlementMethod: "discord_guild_role"` plus matching role proof.

Required verifier secrets/config:

```text
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
DISCORD_ALLOWED_ROLE_IDS=vip_role_id_here
AURORA_SESSION_TTL_SECONDS=21600
```

The desktop app must only receive the verifier URL. Do not put Discord or Patreon secrets in the portable app.

## Active in this build

- 2K19 source intake readers
- 2K19 to 2K20 test package builder for the proven bridge path
- 2K25 `.clips` build/inspect path in repo tooling
- 2K25 VictoryListData editor
- 2K25 EntranceListData finder/diff/editor
- 2K25 CutsceneNoRegistry finder/inspector/editor
- 2K25 SDB reader/summary/writer
- BakeMe full-tree copy/edit/proof orchestrator
- CAK catalog inspection
- DataCtrlLink log checker for launch evidence grading
- Hardened entitlement response parsing:
  - Patreon active tier proof
  - Discord VIP role proof
  - expiry/freshness checks

## Coming

- DataCtrlLink/loader pre-frontend mount timing for the TEST 14000 in-game picker test. The 2026-09-19 19:27 launch proved the DXGI-overlay/runtime-ready build loads, but it crashes before any CAK accept/fail line, so it is not shippable as the game-serving path.
- In-game mod-status overlay. The DXGI Present hook installs, but no rendered in-frame notice was verified before the crash.

## Loader baseline (installed, not shipped in the app)

The experimental pre-window mount path is now opt-in and the installed loader defaults to the known non-crashing window-thread fallback:

- Addon `AuroraForge.CAKModLoader.ftrib` SHA-256 `a808a933545e94e1b2400858c478b969cf80f4aea69b0c9fa61a0ffb0641f8e4`, 1,644,544 bytes.
- Core `dinput8.dll` SHA-256 `1560642598000d0862c4082b327d27deba21384053ccfd78984e7953d5874f76`, 1,607,168 bytes.
- `DataCtrlLink.ini` gates (all default `0`): `RuntimePreWindowMount`, `EarlyPreWindowMount`, `DxgiOverlayNotice`. With no `DataCtrlLink.ini`, both pre-window workers are disabled and the DXGI hook installs as a diagnostic no-op.
- The prior crashing pair is backed up at `D:\AuroraForge-Aug26\_work\loader-crash-build-backup-2026-09-19\`.

## Verification run

Focused tests passed:

```text
node --test tools\check-datactrlink-log.test.js tools\pipeline-editor-suite.test.js tools\bakeme-orchestrator.test.js tools\patreon-access.test.js tools\clips-codec\cutscene-registry.test.js tools\sdb-read.test.js tools\find-2k25-entrance-entry.test.js
```

Result: `38/38` passing.

Packaging:

```text
npm run package
```

Result: portable artifact built at the path above.

Live loader verdict:

```text
Latest launch: 2026-09-19 19:27:18
Core SHA-256: 02D6BFF68BDEB169F613D19F7820F02513541D7B151069171DE31B282DE3E91C
Addon SHA-256: 447B878E5973BAADC75A2379508BC82B8191A9F6137CA321F81F72FF444C3C33
Log checker status: wrong_cak_or_no_mount
Crash dumps:
- C:\Users\dgran\AppData\Local\CrashDumps\WWE2K25_x64.exe.2240.dmp, 475,854,567 bytes, SHA-256 6086A9C41FDF747334C1DF701C0CE0E150CC261EDA0DD5B2995A7D9A23FAFCCF
- C:\Users\dgran\AppData\Local\CrashDumps\WWE2K25_x64.exe.15308.dmp, 475,842,970 bytes, SHA-256 5409143DB7BB9760DFBE214394103D2BB86B79689003A6C14AB640F210B1E9B9
```

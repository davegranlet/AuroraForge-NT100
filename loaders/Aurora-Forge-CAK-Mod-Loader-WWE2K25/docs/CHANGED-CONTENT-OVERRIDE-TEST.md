**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# WWE 2K25 changed-content override test (v1.23 and Saturday Night's Main Event)

This controlled gate has verified changed-content replacement for one deliberately changed visual asset on the exact WWE 2K25 v1.23 profile. The test used one protected FDIR v9.3 CAK, only the CAK Mod Loader addon, and produced `accepted=1 rejected=0 failed=0`. Archive mounting and this tested replacement case are **Ready**. The development collision guard rejects an exact shared virtual path between two enabled mod CAKs before mounting either archive; untested asset classes and broader precedence behavior remain **Experimental**.

The pinned baseline below now targets the **Saturday Night's Main Event** build (boot-thread CAK mount injection verified on that profile; the controlled override probe should be re-run on it to re-confirm the visual replacement case). The v1.23 profile remains supported by the same loader binaries.

## Test scope

Use exactly one harmless, obvious, reversible visual asset and exactly one test CAK. Do not use a stock archive as the output and do not rename the finished protected CAK; its catalog protection is derived from its final filename.

The test must use these published baselines:

- Aurora CAK Foundry v1.7.8
- Secure DataCtrlLink WWE 2K25 v1.0.02
- Aurora Forge CAK Mod Loader WWE 2K25 v1.0.02
- WWE 2K25 Saturday Night's Main Event executable SHA-256: `C6BC0459D4D29667C9E8F1DCACA013AE4691D615E4C79D069AD272F70E2CEE01`

The preparation script also pins the published DataCtrlLink and CAK Mod Loader binary hashes. It fails closed before changing local configuration if any required hash, executable size, CAK version, or protected-catalog flag does not match.

## Build the probe CAK

1. Close WWE 2K25.
2. In Aurora CAK Foundry v1.7.8, extract the chosen asset from the installed game into a separate work folder.
3. Copy only that asset into a clean staging folder while preserving its exact virtual path below game `/root`.
4. Make a distinctive visual change that is easy to confirm and easy to reverse.
5. Build a WWE 2K25 FDIR v9.3 protected CAK with a unique final name such as `AuroraOverrideProbe-v1.cak`.
6. Keep the finished filename unchanged. Confirm Foundry reports successful reopen and payload verification.

Do not upload or commit the source asset, modified asset, built CAK, Oodle DLL, game executable, logs containing private paths, or any other game-derived data.

## Prepare the isolated run

From a checkout of this repository, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Prepare-ChangedContentOverrideTest.ps1 -Action Prepare -GameDirectory "C:\path\to\WWE 2K25" -ModCakPath "C:\path\to\AuroraOverrideProbe-v1.cak"
```

The script:

- verifies the exact WWE 2K25 Saturday Night's Main Event executable size and SHA-256;
- verifies the published Secure DataCtrlLink and CAK Mod Loader binary hashes;
- verifies a protected FDIR v9.3 input CAK with a non-stock final filename;
- runs the locally built structural CAK validator before changing configuration;
- backs up any existing `plugins/addons.txt` and `mods/manifest.json` locally;
- stages the CAK without renaming it;
- writes an isolated addon selection containing only the CAK Mod Loader;
- writes a one-CAK manifest with an empty package list.

This deliberately removes multi-mod and multi-addon ordering from the first override test. It does not approve, combine, or delete the separate Custom Music Loader.

## Observe and report

Launch WWE 2K25 offline, navigate directly to the screen that uses the chosen asset, then report only one result:

- `VISIBLE_CHANGED_ASSET`
- `UNCHANGED_ASSET`
- `CRASH`
- `FAILED_MOUNT`

Also report the final CAK totals from `DataCtrlLink.log`—for example, `accepted=1 rejected=0 failed=0`—without uploading the full log or exposing local paths.

Interpretation:

- `VISIBLE_CHANGED_ASSET`: the tested asset class can be promoted to **Ready** after evidence is recorded. This result has been recorded for one protected FDIR v9.3 visual-asset case.
- `UNCHANGED_ASSET`: keep override **Experimental** and investigate virtual-path identity, source archive selection, cache, and mount precedence.
- `CRASH`: restore immediately and keep override **Experimental**.
- `FAILED_MOUNT`: keep mount acceptance unchanged for the published baseline and investigate the staged CAK/configuration.

## Restore

Close the game and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Prepare-ChangedContentOverrideTest.ps1 -Action Restore -GameDirectory "C:\path\to\WWE 2K25"
```

Restore replaces only the two backed-up control files and removes only the staged CAK copy when its SHA-256 still matches the script's recorded value. It does not touch stock archives.

The runner writes recovery state before it changes either control file. If preparation is interrupted before that backup is complete, `Restore` safely clears only the unfinished state; after backup completion, `Restore` has the saved controls required to recover from a failed or interrupted launch.

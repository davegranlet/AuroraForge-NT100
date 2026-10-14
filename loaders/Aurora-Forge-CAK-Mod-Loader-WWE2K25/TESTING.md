**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Testing

## Build

The repository builds with LLVM-MinGW on Windows x64:

```powershell
& .\build.ps1
```

Warnings are treated as errors. The build produces the separate `AuroraForge.CAKModLoader.ftrib` addon, four test executables, and a CAK validator probe beneath `build`.

## Data-free tests

These tests use synthetic inputs and require no WWE files:

```powershell
& .\build\status_message_tests.exe
& .\build\mod_manifest_tests.exe
& .\build\runtime_config_tests.exe
```

They verify status wording, manifest allowlist/order parsing, path and duplicate rejection, configuration bounds, and fail-safe defaults.

The controlled-runner recovery test uses a temporary synthetic game layout; it never reads a WWE file:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\prepare_override_runner_tests.ps1
```

It verifies restoration of the two control files and staged CAK after an interrupted-or-completed prepare transaction, plus safe cleanup when preparation stopped before configuration changed.

## Local CAK validator test

Run this only against a CAK from your own installation or one you built locally:

```powershell
& .\build\cak_validator_tests.exe <archive.cak> [archive2.cak ...]
```

The validator checks protected FDIR v9.3 header recovery and structural bounds, then creates temporary truncated and corrupted samples and confirms they are rejected. No archive or output is committed or uploaded.

## Live gate

The data-free and local validator tests cannot prove changed-content override behavior. Use the [controlled WWE 2K25 changed-content override test](docs/CHANGED-CONTENT-OVERRIDE-TEST.md). Keep the result **Experimental** until one deliberately changed visible asset appears in-game.

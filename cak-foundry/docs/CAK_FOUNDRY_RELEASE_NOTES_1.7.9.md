# Aurora CAK Foundry v1.7.9

## WWE 2K26 September 2026 archive support

- Opens the updated `bakedfile03.cak` and `bakedfile100.cak` catalogs safely.
- Extracts normal in-archive files as before.
- Shows named payloads stored outside those physical CAKs and can recover them only from a user-selected, separately extracted companion folder.
- Checks each companion file's virtual path, rejects symbolic links, and requires its exact catalogued expanded size before copying it into the user's separate extraction folder.
- Keeps zero-offset catalog references unavailable and blocks short placeholder files from the companion-recovery path.

## Packaging and verification

- Protected WWE 2K25 v9.3 rebuild remains unchanged and verified.
- WWE 2K26 local extraction, raw-hash round-trip, full catalog coverage, and baker verification pass against the current installation.
- Original game archives remain read-only. New mod archives are built separately and belong in the game's supported mod path.

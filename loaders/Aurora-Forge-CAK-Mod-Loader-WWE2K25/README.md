**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge CAK Mod Loader

Aurora Forge CAK Mod Loader — WWE 2K25 is the separate Secure DataCtrlLink addon that validates and mounts WWE 2K25 `.cak` mods.

## Current status

**Development build: exact mod-to-mod virtual-path collisions are rejected before mounting. One protected-v9.3 changed-content visual replacement is verified for the exact WWE 2K25 v1.23 profile, and boot-thread mount injection is verified on the Saturday Night's Main Event profile; broader multi-archive precedence behavior remains Experimental.**

The compiled addon is named `AuroraForge.CAKModLoader.ftrib`. It is intentionally separate from the shared DataCtrlLink loader and from the Custom Music Loader.

## Current ability map

| Area | Current capability | Boundary |
|---|---|---|
| Target game | WWE 2K25 Saturday Night's Main Event and WWE 2K25 v1.23 through reviewed Secure DataCtrlLink profiles | Other executable profiles require separate review |
| CAK loading | Validates v9.3 CAK structure, decodes virtual paths, rejects exact mod-to-mod collisions before mounting, honors `mods/manifest.json`, and logs exact failures | Stock replacement is allowed, but broad asset-class behavior stays test-specific |
| Proven runtime evidence | One isolated protected-v9.3 changed-content visual replacement is verified | A mount count alone is not proof for unrelated assets |

It validates CAK structure and bounds before mounting, decodes every FDIR v9.3 virtual path, supports `mods/manifest.json` for explicit archive enable/disable and order, checks the exact supported game profile and code signatures, and logs individual rejection reasons.

If two enabled mod CAKs provide the same virtual path, the loader mounts neither. It logs the exact virtual path and the two CAK filenames. A mod CAK replacing a stock-game asset is allowed; stock archives are never changed or scanned as mod inputs.

The addon is executable native code. Secure DataCtrlLink loads it only when its exact filename and SHA-256 match the registry compiled into that loader release.

No WWE archives, Oodle libraries, extracted assets, captured data, or personal paths are included.

See [Testing](TESTING.md) for the data-free checks and local validation boundary.


## Controlled changed-content test

The fail-closed [WWE 2K25 changed-content override test](docs/CHANGED-CONTENT-OVERRIDE-TEST.md) has verified one isolated, reversible visual replacement (v1.23 profile; the pinned baseline now targets Saturday Night's Main Event). A successful mount return alone remains insufficient evidence for untested asset classes or archive-order scenarios.

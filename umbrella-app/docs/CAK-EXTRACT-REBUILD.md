**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate AuroraForge NT100, DataCtrlLink, their functionality, or the underlying development work.

# Aurora CAK Foundry: WWE 2K26 extraction and rebuilding

AuroraForge NT100 keeps the original game archives read-only. The intended workflow is:

1. Open one or more WWE 2K26 CAK archives in **Aurora CAK Foundry**.
2. Extract the files to a separate working folder.
3. Edit or replace files while preserving their relative paths.
4. Choose that working folder in **Aurora CAK Foundry**.
5. Build a separate CAK and place it in the game's `mods` folder for testing.

## What the rebuilder writes

- FDIR version 9 catalog and hashed virtual paths.
- WWE 2K26-compatible catalog encoding.
- Protected payloads using the key derived from the archive key, stored size, and final payload offset.
- A root `_textures.tdb` version-6 record. A supplied database is preserved; otherwise Aurora creates the valid 16-byte empty database used by working data-only packages.
- One uncompressed chunk per file. WWE 2K26 accepts protected stored payloads, so Oodle compression is not required for correctness; it only reduces archive size.

## Verification layers

After writing, Aurora reopens the catalog, reads every stored payload back, removes its protection, and compares it byte-for-byte with the source file. A build is reported as verified only when every comparison succeeds.

The final compatibility check is always an in-game test because archive priority and collisions with other mods cannot be proven from the CAK alone.

## Texture metadata rule

Replacing an existing texture path can use the metadata already registered by the game, so the empty database is sufficient. A package that introduces an entirely new texture hash must include a populated `_textures.tdb` in the BakeMe root. Aurora warns when texture payloads are present but only an empty database is available.

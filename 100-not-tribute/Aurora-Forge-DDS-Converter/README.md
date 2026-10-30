**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.

# Aurora Forge DDS Converter

Aurora Forge DDS Converter is the standalone texture-conversion workflow from Aurora Forge.

## Release identity

- Public release: **v1.7.5a**
- Runtime version: **1.7.5**
- Status: **Ready**

## Current ability map

| Area | Current capability | Boundary |
|---|---|---|
| DDS to PNG | Converts selected DDS files or folders into editable PNG output | Source textures are never modified in place |
| PNG to DDS | Rebuilds edited PNG files as DDS and can preserve dimensions, compression format, and mip-map expectations when an original same-name DDS is supplied | Format preservation depends on the supplied original DDS reference |
| Third-party tool use | Invokes Microsoft's unmodified DirectXTex `texconv` with source, release URL, license, and pinned SHA-256 recorded | The third-party executable is not stored in this source repository |

It converts DDS textures to PNG and rebuilds PNG edits as DDS files. When an original same-name DDS is supplied, the app can preserve dimensions, compression format, and mip-map expectations. It writes to a separate output folder and does not modify the source texture.

The converter invokes Microsoft's unmodified DirectXTex `texconv` program. That third-party executable is not stored in this source repository. Its official source, release URL, license, and pinned SHA-256 are recorded under `app/tools/texconv`.

No WWE game files, extracted assets, or personal paths are included.

## Source layout note

This repository begins from the exact runtime source used by the completed standalone release. Some shared Aurora Forge Electron services remain present because the released entrypoint imports the shared runtime. Removing that coupling is tracked cleanup work; it is not being hidden behind an unverified rewrite.

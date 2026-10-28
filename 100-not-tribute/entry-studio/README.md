# Aurora Forge Entry Studio

Local API + UI for driving the WWE 2K19 → 2K26 animation conversion flow: importing
source motions, building converted clips, registering new CAE entries, and baking
mod CAKs. It runs entirely on localhost and is used alongside the flagship app and
the converter workspace.

## Run

```
node entry-studio/server.js
```

Then open http://127.0.0.1:7878. (If the port is busy, stop the process holding it
first.)

## What the source contains

| Path | Contents |
|---|---|
| `server.js` | The local HTTP API server: conversion, registration, and bake endpoints |
| `public/` | The browser UI served by the server |
| `API.md` | Endpoint documentation with request/response shapes |

## Notes

- Local tool: binds to 127.0.0.1 only.
- The heavy lifting lives in the animation toolchain of the converter workspace
  (`WWE2K19-to-2K26-Entrance-Prototype`) and the CAK Foundry bake pipeline; Entry
  Studio orchestrates them as a repeatable editor-first flow.
- No proprietary game files are stored in this repository.

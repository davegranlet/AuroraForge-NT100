# Aurora Forge — Entry Studio API

Local companion API for the Entry Studio UI. **Loopback only.** No external network access.

## Security model (enforced in `server.js`)

| Control | Implementation |
|---|---|
| Network exposure | Binds to `127.0.0.1:7878` only. Requests from non-loopback sockets are rejected (`403 loopback only`). |
| Browser cross-origin (CSRF) | `Host` header must match `127.0.0.1:<port>` / `localhost:<port>`; any `Origin` header must match the same — otherwise `403`. |
| Body limits | JSON bodies ≤ 2 MB; uploads ≤ 64 MB (exceeding → connection destroyed). |
| Write confinement | Every path that is written (`/api/bake` output, `/api/stage` CAK + mods dir, uploads) must resolve inside the allowed write roots: `_work\entry-studio` and the game `mods` folder. |
| Uploads | Only `path.basename` of the supplied name is used; bytes are written under `_work\entry-studio\uploads`. |
| Reads | `/api/scan` only lists absolute, existing directories for `*.bin` files (read-only; no file content returned). |

**Disclosure:** the app runs a local-only HTTP server for its UI (127.0.0.1, loopback). It performs no outbound connections. Ship this statement in the app README/about panel when the Studio is packaged for users.

## Endpoints

| Method & path | Body / query | Returns |
|---|---|---|
| `GET /` | — | the Studio UI (static HTML) |
| `GET /api/defaults` | — | configured default paths (`extraction`, `binsEntrance`, `binsVictory`, `work`, `mods`) |
| `POST /api/scan` | `{ folder }` | `{ folder, files: [{ path, name, size }] }` — recursive `*.bin` listing |
| `POST /api/upload` | raw bytes; `?name=` | `{ path, name, size }` — stores a dropped file under `work\uploads` |
| `POST /api/entries` (GET) | — | `GET /api/entries` → `{ entries: [{ id, nameString, name, motion }] }` (ids ≥ 14000 in the work tree) |
| `POST /api/create-entry` | `{ entryId? }` | clones **DIRE INTENTIONS** (entrance row id 1 + victory wrestlerId 1, same nameString) with the new id (default: highest ≥ 14000 + 1, minimum 14000); returns `{ created, state }` |
| `GET /api/entry/:id` | — | current state of the entry in the work tree: entrance row, decoded name, descriptor |
| `POST /api/entry` | `{ entryId, fields: { name, motion, type, field6..field9 }, animationPath? }` | if `animationPath` given → converts the 2K19 `.bin` into `Animation/Entrance/<id>.clips` + `.adefs` + 5 phase files and sets `f4=id`; then writes the row fields + the SDB name. Returns `{ converted, written, state }` |
| `GET /api/music` | — | `[{ id, title, star }]` from `Audio/MusicList.jsfb` (dropdown source) |
| `POST /api/convert` | `{ files: [paths], startId? }` | bulk convert (legacy): builds assets + minimal registration per file; returns per-file results |
| `POST /api/bake` | `{ out? }` | bakes the work tree with FTribTool 9.3 (`--encrypt-header`) → `{ out, bytes }` |
| `POST /api/stage` | `{ cak?, mods? }` | copies the CAK into the mods folder and writes a **BOM-free** `manifest.json` (`cakOrder:[name]`) |

## Notes

- Field meanings: `f4` = MOTION (own animation id), `f5` = title motion, `f6` = MITB, `f7` = double title, `f8` = music id, `f9` = titantron/GFX. `f5–f9` default to DIRE INTENTIONS' values.
- Never edited / never shipped: `Hide/HideCtrlData.hidelink.jsfb` (entitlement data).
- Sources come from the mount-order winners (bakedfile03 for `ENG.sdb`; bakedfile02 for Entrances/Cutscene/CAMMoveData).
- Port change: edit `PORT` in `server.js`.

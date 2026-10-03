# Audio Studio - Custom Music Plan (2K26)

Goal: an in-app Audio Studio that adds and edits custom entrance music in WWE 2K26:
import audio, assign it to a music slot, edit the title/star shown in the game
picker, build the packages, and stage them for the loader.

## How custom music works (already solved by the loader side)

The `AuroraForge.CustomMusicLoader.ftrib` addon (verified in-game Sept 5, 2026):

1. Reads `mods/manifest.json` and registers every `packageOrder` entry as a
   package under `<game>/sound/` (must be a valid AKPK).
2. Extracts the stock music bank (ID `0x8FD5129D`) from `<game>/sound/music.pck`
   and rebuilds it in memory with **2,500 custom slots**:
   - slot `i` -> WEM source id `1080000000 + i` (must exist in a registered package)
   - normal sound `1081000000 + i`, loop sound `1082000000 + i`
   - actions `1083000000 + i` / `1084000000 + i`
   - events `Play_MUS_ID_<3000 + i>` and `Play_MUS_ID_<3000 + i>_LOOP` (FNV-1 lowercase)
3. The game picker therefore addresses custom music as **musicId `3000 + i`**,
   which must exist as a row in `Audio/MusicList.jsfb`.

So one custom track needs three artifacts:

| Artifact | Content | Route |
|---|---|---|
| `sound/Custom_Music.pck` | AKPK with the custom WEMs at ids `1080000000 + i` | `mods/manifest.json` -> `packageOrder` |
| `Audio/MusicList.jsfb` (edited) | row `musicId = 3000 + i`, `starName`, `trackTitle`, `cuePoint` | CAK mod -> CAK Mod Loader |
| `mods/manifest.json` | `cakOrder` + `packageOrder` | already produced by our stage step |

## Proven formats

**WEM (Wwise Opus):** RIFF container, `fmt ` with format tag `0x3041`
(48 kHz stereo), `seek` chunk (u32 offset table), `data` = standard Opus packets
(sample verified: data begins `FC 7F FA ...`). The 2,501 verified custom WEMs in
`D:\AuroraForge-Aug26\DataCtrlLink-MusicOnly\analysis\custom_music_pck\` are this
format and can seed the editor's library.

**AKPK package:** `AKPK` + header_size + flags(1) + languages_size + banks_size +
sounds_size + externals_size + language section (20 bytes, stock "sfx" entry) +
bank table (count 0) + sound table (20-byte entries: id, block_size 4096, size,
start_block, language_id) + external table (count 0); payloads block-aligned to
4096; `offset = start_block * 4096`. Proven against the captured
`Custom_Music.pck` manifest (2500 entries).

**MusicList record:** `f0` musicId u32, `f2` starName string, `f3` trackTitle
string, `f4` type u8, `f5` cuePoint f32. Stock rows: 757, ids 17-2596. Custom
slots 3000+ need new rows.

## Work completed

- `animation/tools/build-music-pck.js` - AKPK builder + validator (selftest
  passes; layout matches the captured package exactly, including the stock
  language section).

## Next steps

1. **WEM muxer** - encode user audio with ffmpeg (libopus) into Ogg Opus, split
   packets, rebuild the Wwise RIFF container (`fmt` 0x3041 + `seek` + `data`).
   Requires confirming the `seek` entry interval (looks like one u32 per 1280
   samples) against the verified samples.
2. **MusicList.jsfb writer** - append rows 3000+i and edit title/star/cuePoint
   while preserving the stock rows byte-for-byte (same byte-preserving approach
   as the entrance/victory writers).
3. **Audio Studio service + page** - in-app page (Tools) with: music list table
   (stock + custom), import audio (MP3/WAV/FLAC/OGG), slot assignment, edit
   metadata, build package, bake MusicList CAK, stage `sound/Custom_Music.pck` +
   `mods/manifest.json`, backup/rollback.
4. **Verification** - validate every built AKPK with the loader's rules; unpack
   and byte-compare the MusicList CAK against source; owner in-game run.

## Open items / decisions

- ffmpeg: found on the dev machine (`WinGet\Links\ffmpeg.exe`); packaged builds
  need a bundled LGPL ffmpeg or a Setup-selected path (licensing notice required).
- `seek` chunk: exact interval/format to confirm from the verified WEMs.
- Language table: stock 20-byte section copied; confirm the game resolver accepts
  it for custom packages in-game.
- The existing 2,501 WEMs are Opus already; the encoder only matters for new
  imports.

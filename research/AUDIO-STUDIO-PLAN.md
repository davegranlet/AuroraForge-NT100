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
- `animation/tools/build-wem.js` - Wwise Opus WEM muxer (ffmpeg libopus -> Ogg
  packets -> RIFF `fmt` 0x3041 + `seek` u16 packet-size table + `data`). Selftest
  passes and the header matches the verified sample WEMs (the `seek` chunk was
  proven to be one u16 per Opus packet; `fmt` carries total samples and packet
  count).
- `animation/tools/edit-2k25-music-list.js` - byte-preserving MusicList writer:
  appends custom rows by cloning a stock template row and inserting vector slots
  (all stock rows verified byte-identical after edits); supports metadata edits.
- `electron/services/audio-studio-service.js` + IPC/preload + `app/audio-studio.html`
  page + tools-hub card: choose game/mods/MusicList source, list picker rows,
  import audio, assign slots (auto next free 3000+), edit title/star/cue, build.
- End-to-end sandbox test passes: WAV -> WEM -> AKPK (validated) -> MusicList
  edit -> CAK (verified) -> `mods/manifest.json` (`cakOrder` + `packageOrder`).

## Next steps

1. **Owner in-game run** - stage a real track into the live game (loader with the
   CustomMusicLoader addon enabled) and confirm the picker shows the custom row
   and plays the audio.
2. **Confirm the picker trigger** - stock rows carry an extra u32 field (f11)
   whose value does not match `Play_MUS_ID_<id>`; custom rows clone the template
   value. If the game ignores it for 3000+ slots the current build is correct;
   if it matters, derive the right hash from a working custom row.
3. **ffmpeg bundling** - bundle an LGPL ffmpeg (or Setup-selected path) so public
   builds can encode without a system install.
4. **Auto-extract MusicList** - pull `Audio/MusicList.jsfb` straight from the
   user's game CAKs instead of asking for an extracted file.

## Open items / decisions

- ffmpeg: found on the dev machine (`WinGet\Links\ffmpeg.exe`); packaged builds
  need a bundled LGPL ffmpeg or a Setup-selected path (licensing notice required).
- `seek` chunk: exact interval/format to confirm from the verified WEMs.
- Language table: stock 20-byte section copied; confirm the game resolver accepts
  it for custom packages in-game.
- The existing 2,501 WEMs are Opus already; the encoder only matters for new
  imports.

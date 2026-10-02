# Discord Multipost: Aurora Forge 2K19 to 2K20 Converter

Each post below is written for standard non-Nitro Discord accounts and stays under the 2,000 character message limit. Copy only the text between each pair of divider lines.

## Post 1/7

----- COPY POST 1 BELOW -----
**Aurora Forge 2K19 -> 2K20 Converter Quick Tutorial**

This is the current working converter stage in Aurora Forge.

It takes:
- a decoded WWE 2K19 motion file
- a decoded WWE 2K20 reference file
- an output path

Then it writes a new `YANM20` binary using the 2K19 motion data inside the 2K20 layout.

Current release status:
- 2K19 -> 2K20 bridge: working
- Full 2K20 `.acts` repack: not included in this quick bridge
- Event data conversion: not included yet
- 2K22 support: in progress, not part of this tutorial yet

For the verified sample, use Victory `6100`.

You can run the converter two ways:
1. Desktop app
2. Command line
----- COPY POST 1 ABOVE -----

## Post 2/7

----- COPY POST 2 BELOW -----
**What You Need**

Before converting, you need:

- Windows
- Node.js, if using the command line version
- A decoded WWE 2K19 motion input
- A decoded WWE 2K20 `.acts` reference
- The 2K19 and 2K20 files should match the same animation slot / track layout

Default Steam install folders are usually:
```txt
C:\Program Files (x86)\Steam\steamapps\common\WWE 2K19
C:\Program Files (x86)\Steam\steamapps\common\WWE2K20
```

The converter does **not** read straight from the game folder. Use your own decoded/extracted files.

Example placeholders:
```txt
<your decoded 2K19 source .bin>
<your decoded 2K20 reference .acts.decoded.bin>
```

Example output:
```txt
<where you want converted-6100.yanm20.bin saved>
```

Tip: start with a matching Victory `6100` pair before testing other animations.
----- COPY POST 2 ABOVE -----

## Post 3/7

----- COPY POST 3 BELOW -----
**What To Extract Without Filling Your Drive**

Do **not** extract the whole game unless you are doing research. For this bridge, start with one matching animation.

For WWE 2K20, extract only the matching `.acts` file:

```txt
Animation\Victory\<id>.acts
```

Example:

```txt
Animation\Victory\6100.acts
```

For entrances, use the matching entrance animation folder/file instead of Victory.

The 2K20 `.evd` file is **not required** for this motion bridge. Extract `.evd` only if you are researching event data.

For WWE 2K19 Victory `6100`, start from this game file:

```txt
pac\evt\06100.pac
```

The converter does **not** use that raw `.pac` directly. Decode it and use the body motion payload inside it:

```txt
*_entry_0_(ZLIB).bin
```

For the verified `6100` test, that decoded body file was the large `YANM` source. The camera payload was `*_entry_1_(ZLIB).bin`, but the current bridge command uses the body source.

Tiny workflow:
1. Pick one animation ID, like `6100`.
2. From 2K19, copy/decode `pac\evt\06100.pac` or the matching ID.
3. Extract the matching 2K20 `.acts`.
4. Run the converter.
----- COPY POST 3 ABOVE -----

## Post 4/7

----- COPY POST 4 BELOW -----
**Option 1: Desktop App**

Open PowerShell or Command Prompt and go to the app folder:

```powershell
cd "<where you extracted Aurora Forge>\app"
```

Start Aurora Forge:

```powershell
.\start-aurora-forge.cmd
```

In the app:

1. Choose the decoded WWE 2K19 source file.
2. Choose the decoded WWE 2K20 reference file.
3. Choose where to save the output `.yanm20.bin`.
4. Press **Run 2K19 -> 2K20 Bridge**.

When it succeeds, the app shows:

- output size
- record count
- track count
- read-back validation result
----- COPY POST 4 ABOVE -----

## Post 5/7

----- COPY POST 5 BELOW -----
**Option 2: Command Line**

From the repository root:

```powershell
cd "<where you extracted Aurora Forge>"
```

Run the wrapper:

```powershell
.\convert-19-to-20.cmd `
  "<your decoded 2K19 source .bin>" `
  "<your decoded 2K20 reference .acts.decoded.bin>" `
  "<your output .yanm20.bin>"
```

That is the easiest command line path.

Default settings:
- source section: `0`
- 2K20 YANM offset: `37212`

Those defaults are already correct for the verified Victory `6100` sample.

If your games are in the default Steam folders, look here when extracting:
```txt
C:\Program Files (x86)\Steam\steamapps\common\WWE 2K19
C:\Program Files (x86)\Steam\steamapps\common\WWE2K20
```
----- COPY POST 5 ABOVE -----

## Post 6/7

----- COPY POST 6 BELOW -----
**Expected Result**

If the conversion succeeds, the command prints JSON like this:

```json
{
  "from": 19,
  "to": 20,
  "output": "converted-6100.yanm20.bin",
  "bytes": 174976,
  "tracks": 62,
  "sentinel": true
}
```

For the verified `6100` sample, the expected output is:

- `174,976` bytes
- `63` records
- `62` motion tracks
- every motion track has both streams

Quick validation command:

```powershell
node -e "const fs=require('fs'); const r=require('./tools/yanm20-reader'); const d=r.decodeSection(fs.readFileSync('<your output .yanm20.bin>')); const tracks=d.records.filter(x=>x.type===0x2100); console.log({bytes:d.bytes,records:d.records.length,tracks:tracks.length,allTracksHaveTwoStreams:tracks.every(x=>x.streamA.length&&x.streamB.length)});"
```
----- COPY POST 6 ABOVE -----

## Post 7/7

----- COPY POST 7 BELOW -----
**Common Problems**

`Only --from 19 --to 20 is implemented`
The public release bridge currently only supports 2K19 -> 2K20.

`track count mismatch`
The 2K19 source and 2K20 reference do not match the same animation shape. Use a matching pair.

`Not a YANM20 section`
The reference file is not the decoded 2K20 section expected by the converter, or the offset is wrong.

**Current Limits**

- Output is a `YANM20` body section.
- It is not a full 2K20 mod package by itself.
- Event data is not converted by this bridge.
- In-game 2K20 playback still needs separate packaging and testing.
- 2K20 -> 2K22 support is the next update and is not included in this tutorial yet.

That is it. Start with the verified `6100` sample first, confirm the output validates, then try additional matching animation pairs.
----- COPY POST 7 ABOVE -----

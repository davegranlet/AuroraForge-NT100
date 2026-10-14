# Aurora Forge 2K19 to 2K20 Converter Tutorial

This is the quick path for using the current Aurora Forge release. The working converter stage is the WWE 2K19 to WWE 2K20 animation bridge.

Discord-ready non-Nitro multipost copy is available in `DISCORD-2K19-TO-2K20-CONVERTER-MULTIPOST.md`.

The converter takes a decoded WWE 2K19 motion section, uses a decoded WWE 2K20 reference section as the layout template, and writes a new `YANM20` binary. It does not write a full 2K20 `.acts` package by itself, and it does not convert to 2K22 or newer yet.

## What You Need

- Windows.
- Node.js, if you want to run the command line version.
- A decoded WWE 2K19 motion input.
- A decoded WWE 2K20 `.acts` reference that matches the same animation slot and track order.
- For the current verified sample, use Victory `6100`.

## What To Extract

Do not extract the whole game for this bridge. Start with one matching animation ID, such as Victory `6100`, and only extract the files needed for that pair.

Default Steam install folders are usually:

```text
C:\Program Files (x86)\Steam\steamapps\common\WWE 2K19
C:\Program Files (x86)\Steam\steamapps\common\WWE2K20
```

For WWE 2K20, extract the matching `.acts` file:

```text
Animation\Victory\<id>.acts
```

For the verified sample:

```text
Animation\Victory\6100.acts
```

The 2K20 `.evd` file is not required by the current motion bridge. Extract `.evd` only if you are researching event data.

For WWE 2K19 Victory `6100`, start from this installed game file:

```text
pac\evt\06100.pac
```

For other Victory IDs, use the matching zero-padded event PAC in `pac\evt`. For example, Victory `6100` maps to `06100.pac`.

The converter does not use the raw `.pac` directly. Extract and decode only that one PAC until you have the decoded body motion payload that Aurora Forge can read:

```text
*_entry_0_(ZLIB).bin
```

For the verified Victory `6100` test, the decoded body source was:

```text
analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin
```

The matching decoded camera payload was:

```text
analysis\victory-6100\decoded-shdc\1_1_06100_entry_1_(BPE)_entry_1_(ZLIB).bin
```

The current bridge command uses the body source file. The camera and event payloads are useful research material, but they are not required for the basic 2K19 to 2K20 motion bridge command.

Smallest practical workflow:

1. Pick one animation ID, such as `6100`.
2. From 2K19, copy/extract only the matching `pac\evt\<id>.pac`, such as `pac\evt\06100.pac`.
3. Extract the matching 2K20 `.acts`.
4. Run the converter.
5. Validate the output before extracting more files.

Example decoded file names for the verified sample look like this. Use your own extracted paths:

```text
<your Aurora Forge folder>\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin
<your 2K20 extract folder>\Animation\Victory\6100.acts.decoded.bin
```

## Option 1: Use the Desktop App

1. Open PowerShell or Command Prompt.
2. Go to the app folder:

```powershell
cd "<where you extracted Aurora Forge>\app"
```

3. Start Aurora Forge:

```powershell
.\start-aurora-forge.cmd
```

4. In the app, choose the decoded 2K19 motion body:

```text
<your Aurora Forge folder>\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin
```

5. Choose the 2K19 event `0FOP` if you are using the full package builder, or choose the 2K20 reference file if you are using the older loose bridge path:

```text
<your 2K20 extract folder>\Animation\Victory\6100.acts.decoded.bin
```

6. For the full package builder, choose the 2K20 reference ACTS, the 2K20 reference EVD, and an output package folder. For the older loose bridge path, choose an output path, for example:

```text
<your output folder>\converted-6100.yanm20.bin
```

7. Press **Build 2K20 Package** in the current app, or **Run 2K19 -> 2K20 Bridge** if you are using an older loose-output build.

When it succeeds, the app shows ACTS/EVD output size, record count, track count, and read-back validation result.

## Option 2: Use the Command Line

From the repository root:

```powershell
cd "<where you extracted Aurora Forge>"
```

Run the wrapper:

```powershell
.\convert-19-to-20.cmd `
  "<your Aurora Forge folder>\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" `
  "<your 2K20 extract folder>\Animation\Victory\6100.acts.decoded.bin" `
  "<your output folder>\converted-6100.yanm20.bin"
```

Or call the Node script directly:

```powershell
node tools\aurora-converter.js `
  --from 19 `
  --to 20 `
  --source "<your Aurora Forge folder>\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" `
  --reference "<your 2K20 extract folder>\Animation\Victory\6100.acts.decoded.bin" `
  --output "<your output folder>\converted-6100.yanm20.bin"
```

The default source section is `0`. The default 2K20 YANM offset is `37212`, which is the verified offset for the current decoded 2K20 Victory `6100` reference.

## Expected Success Output

The command prints JSON similar to this:

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

For the validated `6100` sample, the expected output is `174,976` bytes with `62` motion tracks.

## Quick Validation

After conversion, you can check that the output still parses as a YANM20 section:

```powershell
node -e "const fs=require('fs'); const r=require('./tools/yanm20-reader'); const d=r.decodeSection(fs.readFileSync('<your output folder>/converted-6100.yanm20.bin')); const tracks=d.records.filter(x=>x.type===0x2100); console.log({bytes:d.bytes,records:d.records.length,tracks:tracks.length,allTracksHaveTwoStreams:tracks.every(x=>x.streamA.length&&x.streamB.length)});"
```

Expected result for the sample:

```text
{ bytes: 174976, records: 63, tracks: 62, allTracksHaveTwoStreams: true }
```

## Common Problems

`Only --from 19 --to 20 is implemented`

The release build only supports the 2K19 to 2K20 bridge today.

`track count mismatch`

The 2K19 source and 2K20 reference do not describe the same animation shape. Use a matching source and reference pair.

`Not a YANM20 section`

The reference file is not the decoded 2K20 section expected by the converter, or the offset is wrong.

## Current Limits

- The output is a `YANM20` body section, not a complete mod package.
- Event data is not converted by this bridge.
- In-game 2K20 playback still needs a separate packaging and game test pass.
- 2K20 to 2K22 support is the next update, but it is not part of this current tutorial.

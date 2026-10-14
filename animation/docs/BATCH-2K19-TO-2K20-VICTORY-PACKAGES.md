# Batch 2K19 to 2K20 Victory Package Builder

The batch builder runs the proven single-animation 2K19 -> 2K20 Victory package path over more than one animation id.

It builds package-style output under:

```text
<output folder>\Root\Animation\Victory\<id>.acts
<output folder>\Root\Animation\Victory\<id>.evd
```

It also writes converted intermediate motion files under:

```text
<output folder>\_intermediate\<id>.yanm20.bin
```

## What it needs for each id

For each Victory animation id, the batch builder needs:

- decoded 2K19 motion body, usually a decoded `*_entry_0_(ZLIB).bin`
- decoded/extracted 2K19 event `0FOP`
- matching 2K20 reference `<id>.acts`
- matching 2K20 reference `<id>.evd`

The 2K20 reference folder is usually easy to match because files are named like `6100.acts` and `6100.evd`.

The 2K19 decoded files can be messier. Automatic folder mode works when the id appears somewhere in the file path, such as `victory-6100` or `06100`. If your extracted `0FOP` files have hashed names without the id, put them in id-named folders or use manifest mode.

## Automatic folder mode

Use this when your folders contain ids in the paths.

```powershell
node tools\batch-2k19-to-2k20-victory-packages.js `
  --source19Dir "<folder containing decoded 2K19 motion files>" `
  --fop19Dir "<folder containing decoded 2K19 0FOP event files>" `
  --reference20Root "<folder containing 2K20 Victory .acts/.evd files>" `
  --outputRoot "<output package folder>" `
  --ids 6100,6101,6102
```

Run a no-write match check first:

```powershell
node tools\batch-2k19-to-2k20-victory-packages.js `
  --source19Dir "<folder containing decoded 2K19 motion files>" `
  --fop19Dir "<folder containing decoded 2K19 0FOP event files>" `
  --reference20Root "<folder containing 2K20 Victory .acts/.evd files>" `
  --outputRoot "<output package folder>" `
  --ids 6100,6101,6102 `
  --dry-run true
```

If automatic mode cannot find every required file for an id, the summary reports
`ok: false` and lists the missing fields for that row. If no ids are discovered
at all, the command fails with `no batch rows matched`.

## Manifest mode

Use manifest mode when file names are ambiguous.

Create a JSON file like this:

```json
[
  {
    "id": "6100",
    "source19": "<decoded 2K19 body .bin>",
    "fop19": "<decoded 2K19 event .0fop>",
    "referenceActs20": "<2K20 reference 6100.acts>",
    "referenceEvd20": "<2K20 reference 6100.evd>"
  }
]
```

Then run:

```powershell
node tools\batch-2k19-to-2k20-victory-packages.js `
  --manifest "<manifest.json>" `
  --outputRoot "<output package folder>"
```

Every manifest row must be an object with enough information to resolve the
animation id and the four input files. Malformed rows fail before any package
files are written.

## Current limits

- The measured EVD event-body conversion is currently proven for the Victory 6100 shape.
- Other ids can be matched and attempted, but the tool will report unsupported EVD bodies instead of pretending a conversion is complete.
- The output is a package folder with converted ACTS/EVD files. It still needs separate 2K20 mod packaging and in-game testing.

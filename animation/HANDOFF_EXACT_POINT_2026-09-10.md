# Aurora Forge exact-point handoff — READ THIS FIRST

> **Current-state override (2026-09-12):** This handoff's original “exact next
> task” was completed: `tools\yanm20-body-table-report.js` now exists. The
> user has also verified an in-game changed-texture override through Aurora
> Forge's own loader. Therefore do not resume its loader/Cakehook/CakeView,
> TRIBUTE-baseline, or old full-body-table-report task. The current task is to
> derive one genuinely changed modern 2K25 `.clips` payload/descriptor from the
> bounded 6100 reference using the existing 2K19→2K20 bridge, bind it under a
> new namespace, and then run one targeted motion test. The project remains
> Research until that motion visibly plays.

Date: 2026-09-10  
Branch: `feature/2k19-2k25-motion-codec`  
Latest pushed commit at original handoff creation: `526a137 Add exact point animation research handoff`

Continuation commits after original handoff:

```text
8cc35b9 Log 2K25 descriptor start reuse
dcbaed7 Log YANM20 stream A motion mapping
0b36786 Log corrected 2K20 bridge alignment
ad095ba Add YANM20 bridge inspector
```

## Non-negotiable pickup instructions

Before doing anything else, read this whole file and the findings log:

- `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\HANDOFF_EXACT_POINT_2026-09-10.md`
- `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\research-findings-log.json`

Do not start by searching the whole drive. Do not rediscover paths. Do not rerun broad scans. The important paths and current state are listed below.

The user is low on weekly usage. Be efficient, targeted, and concrete. Run tests only when code changes or when a result is genuinely needed. Do not repeat tests just to confirm the same state.

## Current goal

Build toward a functional WWE 2K19 entrance/victory animation conversion path into WWE 2K25/2K26.

Current exact research point:

We have strong evidence that WWE 2K20 is the missing bridge between 2K19 PAC/YANM and modern 2K25 `.clips`.

The next immediate task is to compare 2K19 J_Hips, 2K20 J_Hips, and 2K25 J_Hips descriptor/token streams to derive transform/channel semantics.

## Repository

Main repo:

```text
D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype
```

Remote:

```text
https://github.com/davegranlet/Aurora-Forge-WWE2K19-Animation-Research.git
```

Branch:

```text
feature/2k19-2k25-motion-codec
```

Latest commits relevant to this handoff:

```text
8cc35b9 Log 2K25 descriptor start reuse
dcbaed7 Log YANM20 stream A motion mapping
0b36786 Log corrected 2K20 bridge alignment
ad095ba Add YANM20 bridge inspector
526a137 Add exact point animation research handoff
87ced0c Log 2K20 J Hips stream continuity
1d30833 Log 2K20 shared YANM track hashes
fca35bc Log WWE 2K20 bridge payload findings
901610c Log descriptor token index evidence
7bdf6b4 Log J Hips token window rhythm
3f6f76e Show all descriptor windows in codec inspection
70e8179 Add readable J Hips codec report
8da72b8 Log J Hips packed range evidence
38ddb31 Log camera descriptor slot patterns
6ea5fa8 Add track descriptor pattern summary
5bd09ef Add animation research findings log
6f9639d Refine Group90 opcode zero scoring
```

At handoff, repo status was clean.

## Exact source/target files

### 2K19 source files

2K19 decoded Victory 6100 source folder:

```text
D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc
```

2K19 body/facial source:

```text
D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin
```

2K19 camera source:

```text
D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\1_1_06100_entry_1_(BPE)_entry_1_(ZLIB).bin
```

Crosswalk:

```text
D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\2k19-2k25-victory-6100-crosswalk.json
```

### 2K25 target files

Primary 2K25 target specimen:

```text
D:\wwe 2k25 mods\extracts\Root\Animation\Victory\6100.clips
D:\wwe 2k25 mods\extracts\Root\Animation\Victory\6100.adefs
```

Same `6100.clips` also exists here, but use the `D:\wwe 2k25 mods...` path unless asked otherwise:

```text
C:\Games\2k25-extracts\Root\Animation\Victory\6100.clips
```

2K25 broader extract:

```text
C:\Games\2k25-extracts\Root
```

Contains useful modern paths including:

```text
Animation\Acts\Basic
Animation\Showcase
Animation\Career
Animation\Universe
Animation\animbanks
Entrances\EntranceListData.jsfb
Entrances\VictoryListData.jsfb
Animation\Data\MotionAreaData.jsfb
AnimSystem\ratanim.adefs
```

### 2K26 extract

2K26 full extract:

```text
D:\games\2k26-extracts-2\aurora-full-extract-v116-20260903-221507
```

Contains many actual `.clips`/`.adefs`, especially:

```text
Animation\Acts\Basic\MotionArea_*.clips
```

### 2K20 bridge files

WWE 2K20 game folder:

```text
D:\Program Files (x86)\Steam\steamapps\common\WWE2K20
```

Important 2K20 loose file:

```text
D:\Program Files (x86)\Steam\steamapps\common\WWE2K20\AnimSystem\ratanim.bin
```

2K20 extracted bridge files:

```text
D:\games\2k20-extracts\animation-bridge\Animation\Victory\6100.acts
D:\games\2k20-extracts\animation-bridge\Animation\Victory\6100.evd
```

2K20 decoded bridge files:

```text
D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin
D:\games\2k20-extracts\animation-bridge\decoded\6100.evd.decoded.bin
```

2K20 Oodle DLL used successfully:

```text
D:\Program Files (x86)\Steam\steamapps\common\WWE2K20\oo2core_7_win64.dll
```

### 2K22 install

WWE 2K22 exists here:

```text
D:\Program Files (x86)\Steam\steamapps\common\WWE 2K22
```

It has `bakedfile00.cak` through `bakedfile07.cak`, but no focused extraction has been done yet.

## Tool/addon inventory already checked

Folder:

```text
D:\WWE26-mods\compiled releases for review\Tools - Addons
```

Useful contents:

```text
Clips Editor v2.21\Clips Editor.exe
AnimationEditor_26_V2.2\AnimEditor.exe
Cakeview1.14\CakeView.exe
CakeTools2021_v0977a (1)\release\CakeTools.exe
Discovery Meta\Discovery Meta\MotionManager26.dll
Discovery Meta\Discovery Meta\EntranceMotions.dat
Discovery Meta\Discovery Meta\VictoryMotions.dat
Blender Addon_v2.10.3
Havok_Blender_Addon_v3.0.9
60 FPS Entrance 2K26
Restored Entrance Motions Mod 2K26.zip
```

Avoid relying on:

```text
CakeView-v1.14-crack
```

CakeTools GUI note:

The user showed CakeTools v0.977a with `bakedfile00.cak` open. There was no visible `Export All` button/menu in that UI. Do not tell the user they are missing an obvious Export All. The local Aurora CAK20 reader worked better.

## Implemented repo tools

```text
tools\clips-layout.js
tools\clips-layout.test.js
tools\scan-clips-corpus.js
tools\compare-motion-metadata.js
tools\inspect-track-codec-candidate.js
tools\score-group90-op0.js
tools\summarize-track-descriptor-patterns.js
tools\pretty-jhips-report.js
tools\yanm-keyframes.js
tools\yanm-keyframes.test.js
tools\export-yanm-ir.js
tools\yanm20-bridge-inspect.js
analysis\research-findings-log.json
```

Important notes:

- `analysis\research-findings-log.json` is metadata-only and was force-added because `analysis/` is ignored.
- Do not commit game payload files.
- It is okay to commit metadata findings and scripts.

## Verified 2K19 and 2K25 findings

### 2K19 source decoding

Command used:

```powershell
node tools\yanm-keyframes.js "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin"
```

Result:

```text
section 0: 62 tracks, 62 supported, 62 timelineMatches
section 1: 7 tracks, 7 supported, 7 timelineMatches
```

Camera source:

```text
2 tracks, supported and matched
```

### 2K25 Victory 6100 body metadata

Command:

```powershell
node tools\compare-motion-metadata.js "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" "D:\wwe 2k25 mods\extracts\Root\Animation\Victory\6100.clips" 15 0
```

Result:

```text
source section 0: 62 tracks
target record 15: body 0xA57FCBAB77BC9BD5
target tracks: 64
frameValue: 1755
fps: 60
sharedOrderedTracks: 62
sourceOnly: 0
targetOnly: 2
group78 descriptors: 384
descriptors per track: 6
group90 entries: 15351
group90Profile count: 15351
unique: 15344
highBit: 6951
zero: 0
```

### 2K25 Victory 6100 camera metadata

Command:

```powershell
node tools\compare-motion-metadata.js "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\1_1_06100_entry_1_(BPE)_entry_1_(ZLIB).bin" "D:\wwe 2k25 mods\extracts\Root\Animation\Victory\6100.clips" 14 0
```

Result:

```text
source camera: 2 tracks
target record 14 camera 0xC2E6DE4A51C9AEDD
target tracks: 3
frameValue: 1755
fps: 60
sharedOrderedTracks: 2
targetOnly: 1
group78 descriptors: 18
group90 entries: 5134
group90Profile count: 5134
unique: 5133
highBit: 2389
zero: 0
```

### Group90 ULEB framing

Body record 15:

```text
Group90 bytes: 122,808
Decoded bytes: 122,808
Token count: 69,492
```

Camera record 14:

```text
Group90 bytes: 41,072
Decoded bytes: 41,072
Token count: 21,781
```

The old note claiming exactly `221 Opcode 0 body runs` should not be trusted as written. Current scorer reports:

```text
body fixed-seven-following-tokens: 531
body large-followers-until-next-small-token: 536
camera fixed-seven-following-tokens: 191
camera large-followers-until-next-small-token: 194
```

Interpretation:

- Group90 is full ULEB-framed data.
- ULEB framing is not transform decoding.
- Small values may be parameters, not opcodes.

## Descriptor pattern findings

### 2K25 body descriptor masks

Command:

```powershell
node tools\summarize-track-descriptor-patterns.js "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" "D:\wwe 2k25 mods\extracts\Root\Animation\Victory\6100.clips" 15 0
```

Key result:

```text
62 aligned 2K19 body tracks
64 target 2K25 body tracks
0 source-only tracks
2 target-only tracks
```

Dominant masks:

```text
0x2200 -> 000111 mostly
0x0204 -> 000111 mostly
J_Hips 0x0304 -> 010111
final 0x2300 dual-timeline body track -> 010010
```

### 2K25 camera descriptor masks

Camera:

```text
2 aligned 2K19 tracks
3 target 2K25 tracks
1 target-only modern track
both aligned source tracks are 0x2300 dual-timeline
target masks: 111111 and 111000
```

Camera masks are front-loaded compared with body masks. Do not blindly copy camera slot assumptions to body.

## J_Hips 2K19→2K25 current state

Matched J_Hips:

```text
source hash32: 0xF91A7A26
source type: 0x0304
target id64: 0xF4043B2D54A71FC8
target mask: 010111
populated slots: 1, 3, 4, 5
```

2K19 J_Hips timelines:

```text
primary: stride 8, 1319 keys, 3 packed words per key, totalFrames 2420
secondary: stride 20, 530 keys, 9 packed words per key, totalFrames 2420
```

2K19 J_Hips quantization candidates:

```text
0.00013908474647905678
58.72182083129883
1.7271270751953125
10.367934226989746
```

J_Hips 2K25 target descriptors:

```text
slot 0: firstU32 0, secondF32 0
slot 1: firstU32 3321, secondF32 -8.953125
slot 2: firstU32 0, secondF32 0
slot 3: firstU32 4336, secondF32 -1.2931060791015625
slot 4: firstU32 4080, secondF32 0.8729095458984375
slot 5: firstU32 4592, secondF32 -0.661529541015625
```

Descriptor `firstU32` is currently a likely Group90 ULEB token index, not a raw byte offset and not an 8-byte-entry offset.

Why:

- Treating firstU32 values as token indexes yields coherent small-token rhythms.
- 8-byte-entry view is opaque packed bytes.
- Byte-offset view has small values but does not align as convincingly.

Token windows:

```text
slot 1 token index 3321: mixed; less clean
slot 4 token index 4080: clean small-token rhythm around 45,52,60,64,85,89,97,102
slot 3 token index 4336: repeated 46 separators plus 0x32xx/0x1axx values
slot 5 token index 4592: clean small-token rhythm around 36,52,53,60,99,100,101
```

Interpretation:

- Slots 3/4/5 are better immediate channel/block parsing candidates.
- Slot 1 may be root/special stream.
- Descriptor second floats are likely metadata such as scale/base/range/curve parameter, not raw animation values.

## 2K20 bridge extraction and decoding

The user could not find CakeTools Export All. We used Aurora’s CAK20 reader instead.

Aurora CAK20 reader path:

```text
D:\AuroraForge-Aug26\Aurora-CAK-Foundry\electron\cak20-reader.js
```

2K20 catalog contained:

```text
Animation/Victory/6100.acts
Animation/Victory/6100.evd
```

Both were in:

```text
D:\Program Files (x86)\Steam\steamapps\common\WWE2K20\bakedfile00.cak
```

Extracted files:

```text
D:\games\2k20-extracts\animation-bridge\Animation\Victory\6100.acts 229,633 bytes
D:\games\2k20-extracts\animation-bridge\Animation\Victory\6100.evd 571 bytes
```

Wrapper layout:

```text
0x00: outer magic ACTS/EVD!
0x04: version 2
0x08: inner magic ACTS/EVD!
0x0C: stored size = file size - 24
0x10: OODL
0x14: decompressed size
0x18: Oodle payload starts
```

Decompressed successfully with 2K20 `oo2core_7_win64.dll`:

```text
6100.acts expected 743,484, actual 743,484
6100.evd expected 20,546, actual 20,546
```

Decoded output:

```text
D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin
D:\games\2k20-extracts\animation-bridge\decoded\6100.evd.decoded.bin
```

Decoded `.acts`:

```text
starts with AMYM
contains embedded YANM at offset 284
```

Decoded `.evd`:

```text
identifies motion as 6100_VIC_SINGLE_The_Rock_M_Face
```

## 2K20 embedded YANM findings

`6100.acts.decoded.bin` contains many embedded YANM blocks.

Important body-like block:

```text
YANM offset: 37212
size: 489256
count: 63
```

This matches the 2K19 body section shape:

```text
count 63 = 62 track records plus one count/sentinel style value
```

First records in the 2K20 body-like block share exact 2K19 hashes:

```text
0x0C5879E5
0xF91A7A26  J_Hips
0x0DAECC2E
0x0DAECC2D
0x3D185308
0xF9D973BE
0xF91972B1
```

This is the strongest evidence so far that 2K20 is a semantic bridge.

2K20 uses new 40-byte record headers. The 2K19 parser does not support them yet.

Observed type/header shapes:

```text
0x8004 with header size 40
0xA000 with header size 40
0x2100 with header size 40
```

The body-like block uses many `0x2100` records.

## 2K20 J_Hips record

Location:

```text
file: D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin
YANM root: 37212
record table start: 37228
stream base: 37220
J_Hips record offset: 37268
```

Record:

```text
type: 0x2100
header size: 40
hash: 0xF91A7A26
u32_8: 2800
u32_12: 2092
u32_16: 19536
u32_20: 1873
f32_24: 0.00013908474647905678
f32_28: 58.72182083129883
f32_32: 1.727128028869629
f32_36: 10.367934226989746
```

This preserves the same J_Hips hash and nearly identical quantization constants as 2K19.

Interpretation:

```text
u32_8/u32_12 likely offset/count pair A
u32_16/u32_20 likely offset/count pair B
```

Both referenced streams parse cleanly as 8-byte records with delta in the final 16-bit word.

Stream A:

```text
relative offset: 2800
count: 2092
first row packed: [12606, 175, -15886], delta 0
next deltas: 1,1,2,2,2,1,2...
```

Stream B:

```text
relative offset: 19536
count: 1873
first row packed: [0, 0, 0], delta 0
next rows include negative/small triples, deltas 2/4/4...
```

Current hypothesis:

- 2K20 has flattened/resampled the older 2K19 J_Hips streams into denser 8-byte triplet streams.
- 2K20 stream A resembles pieces of 2K19 stride-20 secondary family.
- 2K20 stream B resembles 2K19 stride-8 primary-style family.
- This is now confirmed strongly enough for bridge work: stream A exactly matches the 2K19 secondary first triple at many shared frames, and stream B matches the 2K19 primary stream at many shared/tolerance-normalized frames.

## Continuation findings after original handoff

### 2K20 J_Hips stream match

Command/tool now available:

```powershell
node tools\yanm20-bridge-inspect.js "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" "D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin" --sample 3
```

Compact result:

```text
20A_vs_19_secondary.firstTriple: 502 shared frames, 238 exact, 239 within 128 after 16-bit normalization
20A_vs_19_secondary.middleTriple: 502 shared frames, 216 within 128
20A_vs_19_secondary.lastTriple: 502 shared frames, 220 within 128
20B_vs_19_primary: 1254 shared frames, 457 exact, 953 within 128
20A_vs_19_primary: no meaningful match
20B_vs_19_secondary: no meaningful match
```

Interpretation:

- 2K20 stream A is a dense/resampled form of the 2K19 J_Hips secondary first triple.
- 2K20 stream B is a dense/resampled/normalized form of the 2K19 J_Hips primary stream.
- Later stream A mismatches cluster around +/-32768-style sign-domain boundaries; do not treat those as a failed semantic match.

### 2K20 full body table correction

The 2K20 body-like YANM block at offset `37212` has its 40-byte record table at `37228`.

With that corrected alignment:

```text
62 of 63 records match the 62 2K19 body source track hashes exactly and in order.
records 0-61: type 0x2100, header size 40
record 62: non-track/sentinel-like entry
```

Important pattern:

```text
Most ordinary tracks: stream A has high count, stream B count is 19
J_Hips: stream A count 2092, stream B count 1873
Final 0x2300 source track: stream A count 2024, stream B count 550
```

This upgrades 2K20 from “useful bridge candidate” to “direct full-body semantic bridge”.

### 2K20 stream A canonical motion rule

The reusable bridge inspector now handles 9-word and 3-word tracks:

```text
D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\tools\yanm20-bridge-inspect.js
```

Representative checks:

```text
Track 2, source 0x0204, hash 0x0DAECC2E:
2K20 stream A exactly matches 2K19 primary first triple at all 505 shared frames.
2K20 stream A is within 128 after 16-bit normalization for 468/505 middle-triple frames and 472/505 last-triple frames.
2K20 stream B does not carry this ordinary track's main motion.

Track 12, source 0x2200, hash 0xB10CAB4C:
2K20 stream A exactly matches 2K19 primary first triple at all 121 shared frames.
2K20 stream B does not carry this ordinary track's main motion.
```

Practical rule:

```text
For 2K20 0x2100 records, stream A is the main/canonical motion carrier.
Stream B is usually a 19-key auxiliary/static/reference stream.
Treat stream B as special only when its count is not the common 19-key pattern, especially J_Hips and the final 0x2300 track.
```

### 2K25 descriptor-start reuse caution

2K25 Group78 descriptor firstU32 values do not line up with 2K20 stream byte offsets or sample counts.

They repeat across many tracks/slots:

```text
2806 appears 18 times
1786 appears 15 times
247 appears 13 times
506 appears 10 times
1783 appears 10 times
3315 appears 7 times
2039 appears 6 times
2550 appears 6 times
```

Interpretation:

```text
2K25 descriptor firstU32 likely points to shared Group90 token/template segments.
Do not treat it as a direct 2K20 stream offset, 2K20 sample count, or direct packed-sample location.
J_Hips special starts 3321/4336/4080/4592 live near common starts but are not one-to-one 2K20 offsets.
```

## Historical exact next task — completed

Do not rerun the old J_Hips one-liner. It has been superseded by `tools\yanm20-bridge-inspect.js` and the findings already logged.

The next best task is to make a compact 2K20 full-body table inspector/report so the next stage can classify all 62 matched body tracks without fragile one-liners.

Suggested script:

```text
tools\yanm20-body-table-report.js
```

It should:

- read the 2K19 decoded source;
- read the decoded 2K20 ACTS;
- use YANM block offset `37212`;
- use corrected 2K20 record table offset `37228`;
- parse records 0-61 as 40-byte `0x2100` records;
- verify each record hash matches the same-index 2K19 body track hash;
- report source track type, 2K19 timeline key counts, 2K20 stream A/B offset/count, and whether stream B is the common 19-key auxiliary pattern;
- keep output compact enough to paste or commit as metadata.

Useful command to start from current inspector:

```powershell
cd "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype"

node tools\yanm20-bridge-inspect.js "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" "D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin" --track 2 --record 37308 --sample 2
```

## Useful previous commands

### Pretty J_Hips 2K25 report to clipboard

```powershell
cd "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype"

node tools\pretty-jhips-report.js "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" "D:\wwe 2k25 mods\extracts\Root\Animation\Victory\6100.clips" 15 0 | Set-Clipboard
```

### 2K25 descriptor pattern summary

```powershell
cd "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype"

node tools\summarize-track-descriptor-patterns.js "D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin" "D:\wwe 2k25 mods\extracts\Root\Animation\Victory\6100.clips" 15 0
```

### 2K20 extract exact Victory 6100 files from bakedfile00

This was already done, but if it must be reproduced:

```powershell
cd "D:\AuroraForge-Aug26\Aurora-CAK-Foundry"

node -e "const fs=require('fs'); const path=require('path'); const cak=require('./electron/cak20-reader'); const game='D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE2K20'; const outRoot='D:\\games\\2k20-extracts\\animation-bridge'; const wanted=['Animation/Victory/6100.acts','Animation/Victory/6100.evd']; fs.mkdirSync(outRoot,{recursive:true}); const session=cak.openArchive(path.join(game,'bakedfile00.cak')); for(const wantedPath of wanted){const file=session.files.find(f=>String(f.name||'').replace(/\\/g,'/').toLowerCase()===wantedPath.toLowerCase()); if(!file) throw new Error('Missing '+wantedPath); const data=cak.extractFile(session,file); const out=path.join(outRoot,...wantedPath.split('/')); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,data); console.log('extracted',wantedPath,'->',out,data.length,'bytes');}"
```

## Public sources and user-provided source lists

User linked:

```text
https://smacktalks.org/forums/topic/70252-wwe-2k19-master-entrancesvictories-evt-index-all-default-to-be-ported-and-created-entrancevictories/
https://steamcommunity.com/sharedfiles/filedetails/?id=3440987297
```

User pasted 2K25 preset entrances list:

```text
C:\Users\dgran\.codex\attachments\2717c97d-e3e4-4649-af34-1914043a5916\pasted-text.txt
```

Use these as lookup evidence only. Do not copy public lists wholesale into the repo.

## User communication preferences

- User wants direct, efficient progress.
- User was frustrated because handoff paths were missed earlier. Always read and use listed paths.
- User prefers clipboard commands for sharing output.
- Keep commands compact and targeted.
- Avoid giant JSON unless necessary; when needed, pipe to `Set-Clipboard`.
- Do not run broad full-drive scans.
- Do not repeatedly run the same tests for the same result.
- User has very low weekly usage, so do not waste turns.

## What is solved versus unsolved

Solved/verified:

- 2K19 Victory 6100 body/camera source decode works structurally.
- 2K25 Victory 6100 body/camera records are identified.
- 2K25 descriptor slot masks are measured.
- 2K25 Group90 is full ULEB-framed.
- 2K25 descriptor firstU32 is likely a Group90 ULEB token index.
- 2K20 Victory 6100 extracted from CAK.
- 2K20 ACTS/EVD OODL wrappers decoded.
- 2K20 ACTS contains AMYM and embedded YANM.
- 2K20 large YANM body block shares exact 2K19 track hashes.
- 2K20 J_Hips preserves same hash and quantization constants as 2K19.
- 2K20 J_Hips uses 40-byte `0x2100` header and two 8-byte streams.
- Corrected 2K20 body record table starts at offset `37228`.
- 2K20 body records 0-61 match 2K19 body tracks 0-61 by hash and order.
- 2K20 record 62 is non-track/sentinel-like.
- `tools\yanm20-bridge-inspect.js` exists and works for J_Hips, ordinary `0x0204`, and ordinary `0x2200` spot checks.
- 2K20 stream A is verified as the canonical/main motion stream for representative ordinary `0x0204` and `0x2200` tracks.
- 2K25 descriptor firstU32 values are not direct 2K20 offsets/counts; they appear to be shared Group90 token/template segment starts.

Unsolved:

- Final transform semantics.
- Exact meaning of 2K25 descriptor slots 1/3/4/5.
- Exact Group90 token opcodes/parameters.
- Complete generalized YANM20 parser/report.
- Writer/converter.

Best next implementation step:

Create a compact `tools\yanm20-body-table-report.js` or extend existing tooling to report the full corrected 2K20 body table:

- use decoded 2K20 ACTS path `D:\games\2k20-extracts\animation-bridge\decoded\6100.acts.decoded.bin`
- use 2K19 body source path `D:\AuroraForge-Aug26\WWE2K19-to-2K26-Entrance-Prototype\analysis\victory-6100\decoded-shdc\0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin`
- use YANM block offset `37212`
- use corrected record table offset `37228`
- parse records 0-61 as `0x2100`, header size 40
- verify same-index 2K19 hash match
- for `0x2100`, read two offset/count pairs plus four float constants
- classify stream B as common auxiliary when count is 19
- emit compact JSON/table suitable for committing as metadata

Do not overbuild. The goal is a reliable bridge inventory, not the final writer yet.

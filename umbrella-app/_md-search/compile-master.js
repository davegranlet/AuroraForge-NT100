'use strict';
// Compile the master knowledge md: consolidated answers + all 8 batch notes.
const fs = require('node:fs');
const path = require('node:path');
const HERE = __dirname;

const answers = `# AURORA FORGE — MASTER KNOWLEDGE (compiled 2026-09-24)

Sources: **every unique .md file in C:\\AuroraForge-Aug26** (1,387 files scanned → 527 unique by content; the rest byte-identical duplicates in snapshots). Read fully by 8 parallel readers; per-batch evidence in \`notes-batch-1..8.md\` (concatenated below). Searchable via \`node _md-search\\mdsearch.js search <terms>\`.

---

## ANSWERS TO THE 10 QUESTIONS (consolidated synthesis)

### Q1. Which row to clone as template per file
- **EntranceListData**: clone any section-8 row — working template = **row id 1 "DIRE INTENTIONS"** (owner-confirmed; \`append_2k25_entrance_clone_graph.js --clone-id 1\`), byte-preserving (stock rows are 11/12/13-field; the old rebuild writer blanked the list once — never rebuild).
- **VictoryListData**: clone a stock row — proven target **template ID 100 (The Rock)** (\`--clone-id 100\`); writer clones + overrides scalars.
- **CutsceneNoRegistry**: clone **stock template 6100** table (shared-vtable splice; families mix 28/32/36/40-byte tables; Tribute 26 uses 22-byte — our 32-byte appender refuses those).
- **8 extended tables** (teams/charmapping/cammove/facetextures/charmoveset/charprofilepro/charprofiletable/hidemotion): clone a **same-shape stock record**, patch ID/name words only, splice one vector slot, repair crossing refs; validate count+1 + all old rows identical.

### Q2. Mandatory file set
- **PROVEN in-game (Tribute 25 v1.5, stock-motion entries): 3 files** — \`Entrances/EntranceListData.jsfb\` (+1 sec8 row) + \`Entrances/VictoryListData.jsfb\` (+1 row) + \`Sdb/ENG.sdb\` (+1 record, +22 B). Zero assets, Cutscene untouched.
- **Genuinely NEW imported motion additionally requires the Cutscene+assets path**: \`Cutscene/CutsceneNoRegistry.jsfb\` entry + \`Animation/Entrance/<id>.clips\` + \`<id>.adefs\` (+ \`Animation/CaeAdvanced/1x0<id4>.clips|.adefs\` phase files). Corrected 14000 package = 5 files (clips+adefs+VictoryListData+CutsceneNoRegistry+SDB).
- **Full registration spread** (working CakeView bake vs ours: 32 files differ): the name id must be referenced across \`EntranceListData\`, \`VictoryListData\`, \`CharMoveSetDataTable\`, \`FaceTextures\`, \`CutsceneNoRegistry\`, \`CharProfilePro\`, \`CharProfileTable\`, \`CharacterMapping\`, \`CAMMoveData\`, \`TeamsTable\`, CreateShow set, \`ENG.sdb\`. The 8 extended writers cover the extra tables. **Correction:** HideCtrl has NO name-id registration (0xFFFFDAAE hit = soff-header collision); genuine HideCtrl pattern is motion rows only (s0/s17 field-0 low-u16).
- Loader prerequisite SOLVED (2026-09-22): boot-thread mount injection inside the boot archive sequence — registry JSFBs are boot-read, so late mounts never register.

### Q3. Name/string id scheme
- SDB ids are game-internal u32s; new names append at **last id + 1 in the negative space**: stock SNME \`ENG.sdb\` ends signed \`-9555\` → new = \`4294957742\` (\`-9554\`). One name shared across the entry's rows. ENG.sdb only.
- Format: u32 version 256; u32 count; sorted 12-byte (absOffset, byteLen, unsignedId); rolling-XOR payload, \`firstKey = (offset & 0xff) ^ 0xcd\`, \`cipher[n] = plain[n] ^ cipher[n-1]\`; adding a record shifts all payloads 12 bytes → every key must be re-derived (\`append_2k25_sdb_string.js\` does this; fixed-key assumption corrupted strings once).
- SDB ids are NOT common hashes (crc32/fnv/djb2/sdbm/jenkins all miss); do not try to synthesize them.

### Q4. CAMMoveData (\`MoveData/CAMMoveData.jsfb\`, "CMov")
- It is the **motion/camera registration** — how the game finds the new animation's camera/motion entry.
- New entry: clone a same-shape stock **entrance-class** record (proven template: \`--template-motion-id 41525 --vsize 116 --osize 80\`), patch motion id → new id (\`append-2k25-cammove-entry.js\`).
- Schema findings: 116-byte vtables, 56 slots, motion id = low u16 of the f3 payload.

### Q5. Id numbering rule
- **SNME: EntranceListData sec8 max + 3000 = 16086** (owner rule "find the last highest entry in each file and add 3000"); same id used across ALL tables for the entry. House base 14000+ is superseded for SNME. Never reuse; **6185 is taken (THE USOS 1)**; duplicate-id append silently loses to stock.

### Q6. EntranceListData row values (new entry)
- \`id\` = new id; \`nameString\` = SDB name id; \`type\` = 1; **\`f4\` = \`f5\` = own motion id** (so it plays its own animation); \`f6/f7/f8/f9\` cloned from the template row (Dire Intentions: 1152/26008/504/30001). Tribute's own rows clone stock motions (f4=247/390/529) and use f9=30001. f8=music (MusicList.jsfb), f9=titantron/GFX (30001=default).

### Q7. Victory vs Entrance (separate tables/lists)
- \`VictoryListData.jsfb\` ("Vict") rows are 10-field: wrestlerId u16, nameString u32, type u8, hideId u64, someId, victoryFace, victoryHeel, titleVictoryFace/Heel, doubleTitleVictoryFace/Heel. Tribute's 14000 row: type 1, hideId 7871869299616959835, someId=victoryFace=<motion>, heel 8701, titleFace 8703, titleHeel 8712, doubleTitleFace 1942.
- \`EntranceListData.jsfb\` ("Entr") rows are 11-field (plus 12/13-field variants in stock). Separate editors per table.
- Victory clips = 17-record format (motion = record 15, 64 tracks). Entrance clips = 29-record phase format — never mix (17-record victory format in entrance slots crashed the Create-an-Entrance editor).

### Q8. Animation registration
- Files: \`Animation/Entrance/<id>.clips\` (29-record mono; body records 22/24/10/26/27 = phases intro/stage/ramp/ringside/ring) + \`<id>.adefs\` (byte-clone safe — no id refs) + \`Animation/CaeAdvanced/1x0<id4>.clips|.adefs\` (5 phase files) + \`CutsceneNoRegistry\` entry + \`CAMMoveData\` entry.
- Animation id = the filename (no internal id refs in clips); modern clips track/catalog identity = lowercase **FNV-1a 64**.
- \`.clips\` codec cracked: Group90 LSB-first bitstream, descriptor \`[i8 scale][u8 width][u16 0][f32 rest]\`, \`value = bits*2^scale + rest\`; decode→dense re-encode bit-identical.

### Q9. Driver / bake flow
- \`tools/bakeme-orchestrator.js\` (config-driven: copies source tree → applies \`sdb, victory, entrance, cutscene\` + 8 extended blocks → emits \`aurora-bakeme-proof.json\`) → Foundry \`scripts/bake-v93-cli.js\` + \`FTribTool.exe\` (FDIR 9.3, \`--encrypt-header\`; **key derives from the final CAK filename → never rename after bake**) → stage exactly ONE registry CAK + **BOM-free** \`mods/manifest.json\` (PowerShell \`Set-Content -Encoding UTF8\` BOM breaks the loader: "mod manifest invalid").
- Verification: reopen/unpack + byte-compare payloads (\`verified=true payloadVerified=true\`).

### Q10. Acceptance (owner-defined pipeline)
Import a 2K19 animation (entrance OR victory) → app converts it → copies entry #1 "Dire Intentions" → sets the new id (e.g. 14006/16086) + name (from the 2K19 animation's name field) → the Entrance/Victory creator tool opens so the user can edit every field (music id etc.; defaults auto-filled from the 2K19 animation where possible) → user saves as a NEW entry → app builds a CAK (testing: 5 copied entries) → user stages CAK + manifest → SNME Create an Entrance shows the 5 names → scrolling plays the converted animations (cursor up/down moves through new and default entries).

---

## House rules that bite (all batches)
- New ids: 14000+ base (SNME: max+3000); never reuse; 6185 taken; additive-only.
- ONE registry-changing CAK per in-game test; copy + SHA-256 verify when staging.
- "Loader accepted" ≠ works in game.
- Never rename a baked CAK (filename-derived key).
- Never rebuild stock JSFBs (clone + in-place edit only).
- v1.23 is dead — SNME only. Don't edit snapshots (\`latest\\\`, \`Aurora Forge Sept 20\\\`, \`_worktrees\\\`).
- Source roots read-only; copy to \`_work\`.

## Dead ends (do not repeat)
- Worker-thread/pre-window timed mounts (crash); phase_rva hook; v2–v9 list-only registration packages.
- Fixed-key SDB cipher; rebuild-style JSFB writers (blank the list); 17-record victory format in entrance slots (editor crash).
- Tribute 26 v1.6.0 aggregate on 2K25 (control-verified crash; 2K26-native).
- Rock-template clone alone without the full registration spread (loaded but did not register).
- 2K22 victory-list hunt; PS Set-Content BOM manifests; CakeTools v098a animation blindness.

---

# PER-BATCH EVIDENCE (full notes)

`;

const parts = [answers];
for (let i = 1; i <= 8; i++) {
  const file = path.join(HERE, `notes-batch-${i}.md`);
  parts.push(`\n\n---\n\n# BATCH ${i} NOTES\n\n`);
  parts.push(fs.readFileSync(file, 'utf8'));
}
const master = parts.join('');
const out = path.join('C:\\AuroraForge-Aug26', 'AURORA-FORGE-MASTER-KNOWLEDGE.md');
fs.writeFileSync(out, master);
console.log(JSON.stringify({ output: out, bytes: master.length }));

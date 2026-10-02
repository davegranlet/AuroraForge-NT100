# LOG-2K19-2K25-TRANSFER — 2K19 export → 2K25 import (Victory motion)

Update rule: append 2K25-direct transfer findings HERE, never the main ACTIVE log body.
Parent handoff + exact next step: notes/ACTIVE-2K20-PACKAGE-RESEARCH-LOG.md (2026-09-18 condensed log).

## 2026-09-18 — Token VALUE encoder BUILT + first transplant baked (verdict pending)

### Refuted this session (evidence, not claims)
- ULEB-token model DEAD. Descriptor u16le[0] ("tokenStart" 3065/3824/...) is NOT a
  stream index: bytes are [i8 scale][u8 width] (3065 = 0x0BF9 = scale -7 + width 11;
  3824 = 0x0EF0 = scale -16 + width 14). The "28 distinct starts / ~250-token fixed
  budgets" were numerology on (width<<8|scale) combos. ULEB decodes ANY bytes, so
  "decodedBytes == total" proved nothing. group90-segment-summary (entry-index
  model) throws on real data (3824 > 3289 entries) — consistent with refutation.

### Proven this session (machine-checked)
- Source: Clips Editor EXE Ghidra logs in D:/AuroraForge-Aug26/_work/ghidra-clips-editor/:
  FUN_140004600 = LSB-first bit reader over u64-LE stream, arbitrary widths, live cursor.
  FUN_140002e50 = per-3-channel timing-state builder: (1-bit flag, +16-bit count if
  flag=1)* until frame coverage; then 8-bit mode; widths from DAT_140072270 table
  (256 B, recovered exact: 0,2,3,4..16 saturated); value/entropy geometry + record
  counts derived. FUN_1400040a0 = per-frame entropy interpolant (table DAT_140072370
  = combinatorial (a,b) pairs, verified idx0-7, generatable). FUN_140003530 = per-bone
  evaluator: slots 0-2 = position xyz, slots 3-5 = rotation vector → quat
  (sin/cos + slerp; small-angle branch literal from DumpInstructions).
- Descriptor (8 B LE) per channel = [i8 scaleExp][u8 bitWidth][u16 0][f32 rest].
  Verified: bytes 2-3 are zero in ALL 384+768+760 descs checked (8102rec0, 6100rec15,
  6100rec16, 8102rec5). Value = readBits(width) * 2^scale + rest.
  Width 0 = static (rest only, consumes ZERO stream bits — native stride==0 early-out).
- Framing proof: scratch parser (Temp/opencode/clips_bitcodec.js) consumes 210458/210496
  bits of 8102rec0 (+38-bit zero pad) and 960140/960192 of 6100rec15 (+52-bit zero pad).
  Group90 = bit stream zero-padded UP to a whole u64 count (26308→26312 B = 3289 entries;
  120018→120024 B = 15003 entries). Zero bad segments; finger bones show 5-8-seg timing.
- Value proof: stock 8102rec0 hips Y decodes smooth (max 0.76/frame, span [-5.53, +5.02]);
  rot→quat lengths EXACTLY 1.0000 (all 461 frames) under the literal native formula.
- Encoder proof (V2): decode→dense-re-encode of stock hips pos+rot groups is
  BIT-IDENTICAL (21070 + 84250 bits, 0 clamps) on 6100rec15.

### Transfer v1 (hips joint only, shape-with-stock-anchors)
- Rosetta FAILED (as expected): 2K19-6100 (2420 fr) vs 2K25-6100rec15 (1755 fr) hips
  curves uncorrelated (R2 ≤ 0.04 all words; 2K25 X/Z baked static while 2K19 varies) =
  different performances. So: per-channel min/max shape map of 2K19 curves into STOCK
  observed spans (rest-anchored, zero clamp risk by construction):
  Y = 19primary.w1 → 25 slot1; rot[c] = 19secondary triple-c word0 → 25 slot3+c.
  19 X/Z dropped in v1 (stock-static channels stay static). Documented limitation.
- Transplant: _work/6100-rec15-hips19.clips (445520 B, same as stock): rec15 group90
  rebuilt (hips groups re-encoded, all other 62 bones' bits verbatim, boundaries
  identical, reparse pad 52 as stock). Decoded-output error = pure quantization
  (Y 3.9e-3 = half-quantum 2^-7/2; rot 7.6e-6). New Y spans full stock range with 2K19
  rhythm (max 4.59/frame snap vs stock 3.44 — same order, faithful, no smoothing).
- Bake: Foundry bake-v93-cli source _work/hips19-mod/BakeMe (Animation/Victory/6100.clips
  sha256 6386F2DB…) → _work/hips19-mod/aurora-6100-hips19.cak (222300 B,
  verified+payloadVerified, 1 file). Staged to game mods/ + manifest cakOrder append
  (backup kept). Serving precedent: aurora-8102-slowmo.cak (fps-only mod) in same dir.

### Verdict 2026-09-18 ~17:00 UTC — TRANSFER PROVEN (user-run in-game)
- DataCtrlLink.log: ACCEPTED moddedbake.cak + aurora-8102-slowmo.cak +
  aurora-6100-hips19.cak (accepted=3 rejected=0 failed=0). Rock 6100 plays NEW
  motion in preview + in-game, described as janky/weird-looking.
- Jank diagnosis (expected v1 limits, not codec failure): only hips (1/64 bones)
  carries 2K19 shape while the other 63 play stock 6100 choreography (incoherent by
  construction); rot triple mapping was a positional guess; 19 X/Z dropped (stock
  static kept); amplitude = stock spans. Codec path itself validated end-to-end.
- NEXT: full-body transfer (all 62 sec0 tracks → rec15 bones; face rec16 deferred).

### V2 full-body 2026-09-18 (~17:30 UTC) — baked + staged (verdict pending)
- Track map PROVEN STRUCTURAL: 25 bones named via rig-proto.hkt FNV (60/64): root?,
  Hips..Toe + 3 structural. 19 sec0 block layout matches EXACTLY at identity
  (0 root, 1 hips, 2-10 core9, 11-29 L-fingers19, 30-33 R-arm4, 34-52 R-fingers19,
  53-60 legs8, 61 dual-timeline extra). Map = 19[i]→25[i] for 0..61; 62,63 stock.
- Routing: 0204 9-word rot (triple0≈triple2 redundant; triple1 zero-start variant) →
  rot contiguous words; 2200 3-word → rot; 0304 hips primary.w1 → posY (X/Z stock);
  2300 idx61 dual → bone61 posY/rotY (tentative, 2ch↔2ch). V1 ROT BUG FOUND+FIXED:
  v1 used strided words (x,x,x) instead of contiguous triple — likely jank source.
- 25 body is rotation-only (+hips/bone61 Y); all 0204/2200 pos groups are stock-static
  and re-emitted verbatim. 48 entropy groups → dense (size 120024→227576 B, CAK
  265716 B, verified). 0 clamps (observed spans for dense groups, quantum-full for
  entropy groups). Reparse leftover 3 = benign sub-byte tail (all 128 groups exact).
- Fidelity gate: normalized-shape correlation 19src vs decoded-new = 1.0000
  (body/legs/bone61), 0.9936 worst (3-bit finger quantum). _work/fullbody-report.json.
- Staged: v1 CAK retired to _work (file kept), manifest now
  [moddedbake, slowmo, fullbody19] — no same-path collision. Hash 899538CA…B67E match.
### V2 verdict 2026-09-18 — NEW ANIMATION SERVES, mapping bug (user-run in-game)
- Log: fullbody19 CAK ACCEPTED 17:28:43 (3/3, 0 fail). User: different animation,
  model folded in half + flying, camera tracked correct motion.
- Diagnosis: timing/phrasing transferred (camera right); gross transform wrong.
  Prime suspect = bone61 (rest posY -85.688 / rotY -2.78, root-level carrier):
  v2 mapped 19idx61 (probably face/jaw, NOT root motion) into it → whole-skeleton
  fold+fly from one bad root. Fingers exonerated structurally (19 L-hand
  Middle4/Thumb3/Ring4/Index4/Pinky4 = 25 order; R-hand Ring/Index/Pinky/Middle/
  Thumb = 25 order). FBX preview has obfuscated limb names — no ground truth there.
### V4 2026-09-18 — amplitude root-cause + gain rebuild (staged, verdict pending)
- Video analysis (other-bot frame study, user-relayed): v1 = vertical+lateral flight
  on 1.5-2s loop + 90° backward hyper-extension @0:03 (hands normal/stock);
  v2 = diagonal floor-sinking + forward accordion @0:05 + spaghetti limbs, head/
  hands least broken, 2.5-3s loop, 0:09 reset stands UPRIGHT briefly. Observed
  loops = 2K19 bob periods (not playback bug). Reset-upright = directions RIGHT.
- Root cause = AMPLITUDE, not axes: v2/v3 forced every channel to 100% of quantum
  (span-fill + quantum-full). Stock truth: hips Y sd 3.01 (span 25.6, spiky),
  rot0 sd 0.02-0.09. V1's 90° fold independently explained by the v1 (x,x,x) rot
  bug (109° pelvis twist), already fixed in v2+. Identity map + contiguous triples
  stand (reset pose correct, rhythm/camera track).
- V4 gains from cross-performance stats: pos 4.4e-4 (19w1 sd 6817 → ~3.0),
  rot 5.3e-6 (19sec sd 17023 → ~0.09), min-anchored at rest. Offline gate: median
  channel uses 6.7% of quantum (p90 33%, max 80%, 0 clamps, 0 over 90%).
### V3 verdict 2026-09-18 — GROUNDED, celebration reads (user video analysis relayed)
- V4 (gain) verdict: stays in ring, no flight/floor-clip, torso-hips vertical OK,
  hips/legs stable, 4-5s clean loop, camera smooth, 0:05-0:08 recognizable arm-pump
  hype. Remainders: shoulder/arm snap jitter, hands clip thighs on lower half,
  loop-reset pops @0:04/0:09 (source cycle seams — left alone), slight rigid
  forward tilt (deferred). Pipeline math (resample + dense pack) declared verified.
- ARM MAP FIX: hinge fingerprints prove 19idx9/32 = elbows (single-axis word1 =
  stock ch1), wrists even-small, knees 19idx54/58 hinge word1 = stock ch1. But the
  clav/shoulder pairs are swapped: energy+anatomy (stock Sho>>Clav; 19 first-of-pair
  dominates) → 19(7,8)/(30,31) = (Sho,Clav) vs 25 (Clav,Sho). Fingers/legs/core
  hinge+order checks all pass identity.
- V5: source swap {7:8,8:7,30:31,31:30} (4 bones), gains unchanged, 0 clamps.
  Swap verified offline (corr 1.0 vs swapped src; identity would be -0.23/0.92).
### Face clarification 2026-09-18 — NO face transfer exists yet
- Relayed "facial test" analysis describes STOCK rec16 (face record untouched in
  ALL builds — byte-identical). No 19sec1 mapping, no face gains/widths were ever
  authored. Its 3 hypotheses (gain/clamp/width on face channels) are moot.
- Useful as STOCK BASELINE: rec15/rec16 share 1755f timeline (sync by construction);
  stock 6100 face = active jaw/mouth, quiet upper face. Real face stage (19sec1
  7 tracks → rec16 8 tracks × 96ch morph layout) is future work, gated on arm verdict.
- PUBLIC-CLAIM BOUNDARY (user agreed 2026-09-18): in-game transfer proven on 2K25
  ONLY. 2K26 shares the .clips family (reader covers v9.9) but no transferred anim
  has booted there. Announcements say "2K25 (2K26 same format, testing next)".
- USER launches WWE 2K25, checks Rock victory (6100): preview motion + in-game play.
  Verdict classes: (a) new bob rhythm = TRANSFER PROVEN → expand to full body + face;
  (b) stock motion = mod not served (read DataCtrlLink.log, check shadow order);
  (c) crash/garbage = read log, revisit rot mapping or quant.
- Promote (after verdict): Temp scratch (clips_bitcodec.js, clips_encode.js,
  transplant.js, rosetta6100.js, target_curves.js, hips_dump.js) → prototype tools/
  as tested research tools; sync clip-control-pair.js + score-group90-op0.js to
  Clips-Tools standalone (known gap). 2K19 X/Z + true-unit map open.

### V6 2026-09-18 — smoothness fix (CR resample + Gaussian, staged, verdict pending)
- Arm residue: snap jitter. Quantization-blame REFUTED: arm value-steps 0.0025/frame
  (invisible). Real cause = resample judder (linear interp of ~4.4f-spaced keys =
  13Hz velocity kinks); new accel/span 0.33/0.18 vs stock 0.048/0.065.
- Fix: Catmull-Rom + Gaussian σ2.5f on mapped columns. Gate: arm accel ratios
  0.061/0.040 = stock-like; 0 clamps; reparse leftover 1. Bands: new motion sits in
  lower part of stock bands (muted, not wild) — offset question deferred.
- Reply-to-bot: A exonerated by measurement; B-variant deferred; C (face) after arms.
### V7 2026-09-18 — scoped arm band-match (staged, verdict pending)
- Other-bot: residue = rest-offset/scale (2K25 wider frame); options 1/2/3.
- Chose scoped option-2 variant: bones 7,8,30,31 rot affine-mapped 19min→stockLo,
  19max→stockHi (stock bands via new entropy evaluator — exact, e.g. bone8 ch0
  [-0.368,0.429]). Arms now live exactly where stock's proven-clean motion lives;
  elbows/fingers stay gain-muted (clean, untouched). New bands verified ≈ stock
  (smoothing trims peaks ~15%, calmer).
- Baked 231164 B verified, staged same name, hash CA8ADD99…B8026. Verdict pending:
  hands clear thighs? If yes → face stage. If no → rest-bias trim (option 1).

### Codex MKV review 2026-09-18 (upload `2026-09-18_18-50-09.mkv`, Asuka victory editor)
- Remote commit 44826b0 appended timestamped frame review to the (now-retired)
  BOT-SHARE board; substance folded here, board deleted. Rock selected ~13s, fade
  ~13.75-14s; earlier poses = other slots (not evidence). Recording CANNOT confirm
  loaded CAK hash (see install verification below).
- Severe poses: 18.921s airborne split above top rope (legs wide, one horizontal,
  torso tilted, L-hand overlaps inner thigh/groin — contact UNCONFIRMED); legs fold
  to torso 19.121-19.488s; repeat 48.521s. 23.021s best silhouette (upright, arm
  raised, legs still asymmetric). 43.5-44s fade = preview restart (seam hidden).
  Empty-ring stretches prove nothing alone. Arm snap: no isolated snap found in
  18.5-19.5s window (limited sample, not a pass). Up/down-phase classification: none
  defensible from these poses.
- Codex's reconciliation demands (adopted as investigation order): verify installed
  CAK/slot/overrides; same-character stock-vs-build comparison; root/pelvis+legs
  before arm-only v8; face pending; video never prescribes numbers.

### Install verification 2026-09-18 (MKV session = 18:49:33 launch)
- 18:49:33 mount (66s before MKV start): moddedbake + slowmo + fullbody19, 3/3
  accepted. Staged file = v7 (231164 B, mtime 18:33:12, hash CA8ADD99 verified on
  disk — untampered). Manifest order unchanged.
- moddedbake.cak (719MB, 294 files): NO Animation/Victory/6100.clips inside (only
  Entrances/VictoryListData.jsfb). NO competing override — our CAK solely serves
  the path. mods.zip not in manifest (inert).
- Offline stock-vs-v7: hips Y stock [-8.95,16.70] vs v7 [-7.90,14.74] (contained);
  leg bones 53/57 bands contained inside stock bands. Gross placement CANNOT exceed
  stock envelope → airborne-above-ropes NOT explainable by root-Y values.
- Leg-axis note: hinge joints match identity on ch1 (elbows/knees/toes) which argues
  against any within-bone axis permutation; 19idx53 w1-dom vs stock53 ch0-dom is
  ball-joint performance variance until proven otherwise. Arms swap stands (v7
  verdict on arms still open — MKV arm answers inconclusive).
### MKV2 review 2026-09-18 (`2026-09-18_19-08-31.mkv`, Wes Lee menu → Rock @9.5s)
- Same leg-split/fold pattern on 2nd model (15-17s horizontal spread + upward fold;
  18s boot-before-pelvis; 26s leg at pelvis height; 28s suspended above ropes,
  legs sideways + torso folded; recurrence 44-48s; seam hidden by 40-40.5s fade).
  Asuka-only explanation weakened. Arm/clearance answers inconclusive (legs abnormal,
  sample limits). Build not determinable from footage. BOT-SHARE 404 noted: board
  retired — Codex read LOG-2K19-2K25-TRANSFER.md on working instead.

### Install verification 2026-09-18 (MKV2 session = 19:08:02 launch)
- 19:08:02 mount (29s before MKV2 start): moddedbake + slowmo + fullbody19, 3/3
  accepted. Staged = v7 CA8ADD99 on disk, untampered. No overrides (moddedbake
  lacks the path — proven). So MKV2 tested v7 file content as previewed.
- Offline stock-vs-v7 leg magnitudes: max combined rot vector stock 1.645/1.639
  vs v7 1.882/1.075 rad (bone53 +14% over stock max — marginal, not split-class).
  Hips Y contained. Hinge axes match identity (argues against axis permutation;
  a permutation preserves vector lengths so magnitude checks can't rule it out,
  but per-channel band arrangement matches stock under identity).
- Standing contradiction: v7 data is near-stock offline; screen shows splits.
  v4-video (Rock, grounded) vs MKVs (editor multi-character, splits) isolates TEST
  SETUP as a variable: editor preview w/ selection fades may show loading/default/
  non-6100 motion, not our mod.

### Method corrections 2026-09-18 (Codex qualifications, accepted)
- Contained per-channel ranges do NOT imply contained final poses (timing,
  rotation direction, parent transforms, joint combinations all matter). Hips-Y
  containment alone proves nothing about whole-body height; 14% magnitude delta
  is not inherently rounding error. Earlier "cannot exceed envelope" claims withdrawn.
- A clean T0 supports (not proves) setup-dependence; v4 footage is NOT a same-build
  control for v7. T1-leg-restore implicates leg channels OR their interaction (not
  axes alone); T1 failure does not exonerate legs. T0/T1 must hold character, slot,
  camera, launch constant — only animation data changes.
- Review order: placement first, then hands/jitter. Face pending.
- T0 (no build): ROCK, IN-RING post-match 6100 victory (original v1/v4 setup),
  confirm slot on screen. If clean → MKV splits were editor-setup artifacts; take
  arm verdict from clean footage. If splits reproduce → T1.
- T1 (one build): legs 53-60 → stock verbatim, rest v7 (legs-stock isolation).
  If clean → leg-mapping bug (fix axes/gains). If split → hips/bone61 isolation.
- Face stays pending. Video never prescribes numbers.

### T0 verdict 2026-09-18 — failure REPRODUCED in Rock post-match (user/Codex relay)
- MKV 19:26 (40.9s, pinfall + WINNER banner 0-6s, broadcast transition ~8s — real
  post-match, not editor). 17.5-19.5s: torso curled sideways/forward, leg lifted
  across body, folded over thigh, compressed crouch at ropes. NOT the wide editor
  split — distinct folded failure. Hands/jitter/seam: inconclusive from poses.
- T0 session verified: 19:21:05 launch mounted v7 3/3 (MKV @19:26 tested it).
  No normal segment established. Proceed T1.

### T1 build 2026-09-18 — legs 53-60 to stock (staged, verdict pending)
- fullbody.js LEGS_STOCK set (revert by emptying). All 16 leg groups bit-identical
  to stock as sequences; bone4+ spot-confirmed transferred. Diffs vs v7 limited to
  leg ranges + count/pad (required metadata). 0 clamps. v7 CAK archived in _work.
- Baked 230776 B verified, staged SAME name/manifest (only data changes),
  hash 3B08700D…25CCAB8C7. T1 protocol: same Rock in-ring post-match, same
  camera/launch discipline. Clean→legs implicate legs+interaction (not axes alone);
  fail→legs not sole cause (not exonerated). Face pending.

### 2026-09-18 ~20:28 — mods/ EMPTIED by user (stock baseline window)
- mods/ contains NOTHING (no CAKs, no manifest.json). 20:28:30 session: "No mod
  CAKs prepared for mounting" — game running STOCK. T1 (3B08700D) and v7 CAKs
  safe as copies in _work/fullbody19-mod/. Nothing lost; T1 restages in seconds.
- T1 verdict BLOCKED until restage + fresh launch. If current stock run is being
  recorded, that footage = the stock-vs-build baseline Codex asked for.
- C:/Users/dgran/AppData/Local/Temp/opencode/clips_bitcodec.js (parser+evaluator)
- C:/Users/dgran/AppData/Local/Temp/opencode/clips_encode.js (BitWriter+encoder, V1 gate)
- C:/Users/dgran/AppData/Local/Temp/opencode/transplant.js (V2+V3 gates, builds clips)
- C:/Users/dgran/AppData/Local/Temp/opencode/rosetta6100.js (refutation data)
- C:/Users/dgran/AppData/Local/Temp/opencode/target_curves.js (stock curves+corr)
- D:/AuroraForge-Aug26/_work/6100-rec15-hips19.clips (transplant output)
- D:/AuroraForge-Aug26/_work/hips19-mod/ (BakeMe tree + aurora-6100-hips19.cak)

### Testv1.01a 2026-09-18 — versioned testing + dated capsule (staged, verdict pending)
- User directives: tests versioned Testv1.01a+ increasing; today's research into
  dated repo Sept18th-2026 (private, working); game dir reset to default, stock
  baseline footage recorded. Live confirmation: v7 serves-but-folded in-game.
- Sept18th-2026 seeded + pushed (README ledger, RESEARCH-LOG copy, SESSION-SUMMARY,
  ARTIFACT-INDEX). Prototype notes remain canonical.
### Testv1.01a mount FAILURE + root cause 2026-09-18 (my bug, code exonerated)
- 21:45:33: `FAILED CAK aurora-6100-testv101a.cak: game mount routine returned
  false` (accepted=0 failed=1) → stock played. All prior ACCEPTEDs were real.
- Root cause: v9.3 archive keys derive from the CAK FILENAME
  (`cake_name_key` = folded FNV-1a64 lowercase name; Secure-DataCtrlLink
  `cak_validator.cpp:24`, README-documented "do not rename, rebuild under final
  name"). I renamed fullbody19→testv101a post-bake → key mismatch → game refused.
  Cross-checks fit perfectly: backend opens original-name files, fails renamed
  ones (that "corruption" was wrong-key decrypt, not file damage).
- Fix: REBUILT T1 source directly to `aurora-6100-testv101a.cak` (230776 B,
  verified, backend opens, path Animation/Victory/6100.clips). Staged same name,
  hash `39F10FEF…98ED9` both sides. Manifest unchanged (already lists it).
- Rule going forward: version names are decided BEFORE bake; never rename a CAK.
  (Archived `...-v7.cak` is valid bytes under its original name only.)
### Cross-model protocol 2026-09-18 (user-designed, adopted)
- User DELIBERATELY previews Rock victory on other models (Akam): if transfer only
  works on Rock's rig, it fails the goal (browse-by-name, any superstar). Valid gate.
- Adopted two-gate protocol per build, same session: GATE 1 = Rock post-match
  in-ring (primary verdict, native rig). GATE 2 = Rock motion on Akam rig (compat).
  Rock-first; both uncut with full body in frame. T1 verdict still open (22:03
  footage was Akam-gate only; suggests crumple persists with stock legs, unconfirmed
  as T1-of-6100 pending Gate 1).

### Stock baseline 2026-09-18 — Rock default victory captured by user
- `D:/videos/Sept-18th-2026/2026-09-18_20-29-39.mkv` (33.3s, 1440p60 H.264).
  Frames pulled to Temp `frames-stock/` (17 @ 0.5fps, 720p) and eyeballed:
  grounded in-ring, upright torso, fist-pump raised, feet planted, dynamic
  broadcast cameras. No splits/folds. This is the known-good visual reference
  for all future modded comparisons. Testv1.01a verdict still pending.

### 2026-09-18 — 2K19-minus-2K25 Victory inventory
- Authoritative bounded sources: installed 2K19 `pac/evt` filenames (IDs 6000-9999),
  extracted 2K20 Victory `.evd` internal names, and WWE 2K25 `bakedfile60.cak`
  `Animation/Victory/*.clips` filenames.
- Counts: 540 scoped 2K19 IDs; 930 2K25 Victory IDs; **74 scoped 2K19 IDs absent
  from 2K25**. 56 missing IDs have names confirmed by the 2K20 EVD bridge; 18 are
  marked `unknown-2K19-only` rather than guessed.
- Full machine-generated inventory (IDs, names/status, source counts, and set
  hashes): `analysis/2k19-minus-2k25-victory-inventory.json`; copied to the local
  dated capsule `Sept18th-2026/2k19-minus-2K25-victory-inventory.json`.
- Inventory evidence hashes: JSON `38872DE114DDAE9D1A7C1F3DA51E5364ED5F6EE8CEA4BA7D7A7788CAFD11CBF1`;
  2K19 ID-set `28A84EF5E0F613A3FF0FF5B45A34B8110757AA9DCE9D4AC0BA8E76D9A93A4D79`;
  2K25 Victory ID-set `1C17155C5A9B5448A98E916933D385E918C3C8C921049307A7296D27FE43BA2E`.
- This is a complete numeric difference for the stated Victory/event scope, not a
  claim that names for the 18 2K19-only IDs are known. New imported animation IDs
  must be allocated from this missing set; template/registry ID 14000 remains a
  separate high-buffer entry ID.

### First missing-animation probe — 6185
- Selected first named missing candidate: `6185_VIC_Jimmy_or_Jey_Uso18_M_H`.
  Installed 2K19 source `pac/evt/06185.pac` extracted and BPE-decoded locally:
  body section has 62 tracks, identical type distribution/order to 6100, frame
  count 1110; all four decoded sections pass timeline validation.
- Used the existing 2K25 6100 body as a structural template and ran the current
  transfer encoder for a new 6185 payload. Structural rebuild passes, but it
  reports 5,736 quantization clamps, so this candidate is **not baked or staged**.
  The current gain model cannot be reused blindly across source performances.
- Next: per-channel source/target scale calibration for 6185, then emit new
  `Animation/Victory/6185.clips` plus a new template entry 14000 pointing to
  6185. Existing 2K25 animation IDs remain untouched.

### 2026-09-18 — Testv1.02b staged: NEW animation 6185 (Jimmy/Jey Uso victory)
- Target: first missing-set animation `6185_VIC_Jimmy_or_Jey_Uso18_M_H` (2K19-only).
- Auto-fit descriptors added to the transfer encoder: per-channel width widened only
  when the mapped series exceeds the stock band; rest floored onto the quantum grid
  when needed. Result: **0 clamps** (was 5,736), only 5 of 61 groups needed width
  changes, max decode error within one quantization step, reparse leftover 61 bits.
- Built `6185.clips` = stock 6100.clips structure (17 records) with rec15 body
  replaced by the imported motion; `6185.adefs` = byte-clone of 6100.adefs
  (payload has no ID refs). 555,592 bytes.
- Registry: VictoryListData 680→681 — appended row `wrestlerId 14000`
  (type omitted like Rock, hideId clone), `someId/victoryFace = 6185`,
  `nameString = -9554`. ENG.sdb 96992→96993 with id −9554 = `TEST 6185`.
- Baked under FINAL name (filename-keyed crypto rule): `aurora-6185-testv102b.cak`
  (5,021,040 B, 4 files, verified+payloadVerified, opens). SHA256
  `581689D1CC838CFDCE32E842A742C899809304070BF048A74292081B094CF8DE`.
- Staged alone: `mods/aurora-6185-testv102b.cak` + manifest [it]; prior test CAKs
  moved to `_work/retired-mods/` (kept, not deleted).
- PICKER-SOURCE FINDING (new): customizer picker names (e.g. `THUMBS UP, THUMBS
  DOWN` @SDB 218169635, `TIME TRAVELER` @967778171, `TECH CHAIRWOMAN`) are NOT
  `nameString`s of VictoryListData rows (0/680 matches), so the motion picker list
  is not fed by VL rows alone; `TIME TRAVELER` appears exactly once as u32 in
  EntranceListData. Whether our 14000 row surfaces in the TEMPLATE list, the
  MOTION list, or neither is the open question this test answers.
- Verdict protocol (user): launch fresh, victory customizer → TEMPLATE list AND
  motion list, look for `TEST 6185` (uppercase sorts in T), select + preview.

GOAL (fixed): build and validate a usable 2K19→2K25 entrance/victory animation
converter with runnable modern .clips/.adefs output and concrete verification.
Standing rules: additive-only, new IDs from the 2K19-missing set, template/registry
ID 14000 (high buffer), never overwrite stock, never rename a baked CAK.

CODEC (cracked, proven)
- 2K25 group90 is an LSB-first bit stream, not ULEB tokens. Descriptor per channel
  = [i8 scale][u8 width][u16 0][f32 rest]; value = readBits(width)*2^scale + rest.
  Slots 0-2 = position xyz, slots 3-5 = rotation vector → quat (native sin/cos +
  slerp path from Ghidra logs in _work/ghidra-clips-editor/).
- Framing proof: 210458/210496 bits (8102 rec0, +38-bit u64 zero pad);
  960140/960192 (6100 rec15, +52-bit pad). Stock decode→dense re-encode is
  BIT-IDENTICAL (21070 + 84250 bits, 0 clamps). ULEB model REFUTED (descriptor
  u16le[0] bytes were really scale+width; ULEB decodes any bytes).

BUILD / VERDICT TRAIL (Rock victory 6100 unless noted)
| build | content | verdict |
|---|---|---|
| v1 hips19 | hips only, (x,x,x) rot bug | SERVED in-game, visibly new = transfer PROVEN |
| v2/v3 fullbody | span-fill amplitude; bone61 mapped then reverted | flying + fold/double-over |
| v4 gains | pos 4.4e-4, rot 5.3e-6, min-anchored at rest | GROUNDED, celebration reads, camera smooth |
| v5 arm swap | shoulder/clavicle swap 7↔8, 30↔31 | orientation fixed |
| v6 smooth | Catmull-Rom resample + Gaussian σ2.5f | arm accel ratios now stock-like |
| v7 bands | arms 7/8/30/31 mapped into stock observed bands | staged |
| T0 | Rock real post-match (19:26 MKV) | still folded/crouched |
| Testv1.01a (T1) | legs 53-60 → stock bits | staged; in-game verdict still open |
Fixes proven along the way: v1 rot word bug; amplitude = root cause of flight/fold;
judder = linear resample of ~4.4f-spaced keys, not quantization (steps 0.0025/frame).

ADDITIVE / REGISTRY (in progress)
- Convention verified: victoryFace N → Animation/Victory/N.clips (+N.adefs); 930
  motions in bakedfile60; adefs payload has NO id refs → byte-clone safe.
- First additive attempt (test5 @14100 / entry 14004) did not appear; SDB proven
  innocent (61/61 sampled strings byte-identical to stock).
- Tribute method observed directly: it changed ONLY Entrances/VictoryListData.jsfb
  (new row 14000, type=1, someId=victoryFace=6101, hideId 7871869299616959835,
  name -9554) + Sdb/ENG.sdb ("Test5"). Learned: full row must be appended, not a
  partial patch; motion list is driven by this row.
- CAK CRYPTO: v9.3 keys derive from CAK FILENAME. Renaming a baked CAK breaks the
  mount ("game mount routine returned false"). Always bake under the final name.

GITHUB (done)
- 22 source repos verified local, fetched, 0 ahead/0 behind, then DELETED from
  GitHub. Retained only Aurora-Forge-Converter-Releases (cloned local), README
  updated with legal notice + Discord https://discord.gg/pBuHF4mugQ +
  Patreon https://www.patreon.com/cw/dgranletmwo. Local keeps the only code copy.
- Local logs/capsule committed (no remote push: repo is local-only now).

INVENTORY (2K19 minus 2K25, Victory/event 6000-9999)
- 540 scoped 2K19 pac/evt IDs; 930 2K25 Victory .clips IDs; 74 absent from 2K25.
- 56 have bridge names via 2K20 Victory EVD internal names; 18 unknown (kept NULL,
  not guessed). Saved: analysis/2k19-minus-2k25-victory-inventory.json + capsule.
- First target chosen: 6185 = 6185_VIC_Jimmy_or_Jey_Uso18_M_H (2K19-only, 62 tracks,
  1110 frames, structure matches 6100). Extracted + BPE-decoded. Transfer probe
  produced 5736 clamps → NOT baked; needs per-channel calibration.

WORKFLOW (user-designed)
- Me = decoder/builder/verifier. Codex = footage observer (timestamps only, states
  what it cannot determine, never prescribes pipeline). Video bot = community copy
  only (it twice described stock content as transfer results; now restricted).
- User relays prompts; user launches games; I read logs, never ask user to read.
- ffmpeg available locally: I pull frames myself (no video streaming).

NEXT CONCRETE ACTION
- Calibrate 6185 per-channel (fix 5736 clamps), emit Animation/Victory/6185.clips
  + cloned adefs + entry 14000 → 6185 + name → bake v9.3 → stage → Rock/other
  model in-game verdict.

### Testv1.02a 2026-09-18 — NEW entry test5 (additive, staged, verdict pending)
- User: new slot per test + slot in EVERY animation record (tribute pattern).
  Convention verified in bakedfile60: victoryFace N → Animation/Victory/N.clips
  (+N.adefs), 930 motions. adefs payload has NO ID/record refs → byte-clone safe.
- test5 = motion 14100 (free) + entry 14004 (free, above vanilla) + SDB "test5":
  14100.clips (17-rec stock clone, rec15 = T1 motion), 14100.adefs (clone),
  VictoryListData 680→681 (clone Rock: face 14100, name -9554/4294957742, fresh
  hideId), ENG.sdb 96993 (+test5 @ -9554; live = bakedfile03 copy).
- Baked `aurora-test5-v102a.cak` (name first! 5010484 B, 4 files, verified, opens).
  Staged ALONE (v101a file kept, unlisted). Hash 85FED3B6…EB0F.
  Verdict: browse-by-name test5 in victory customizer + preview plays new motion.

### test5 record 2026-09-18 — new slot copying 6100 (built, not baked)
- User: new record per test, then a new slot in EVERY animation record (tribute
  full-index pattern). Built on STOCK 6100.clips (purely additive): 17 stock
  payloads + new record ID 0x1F8578484DFD2C30 (FNV test5) carrying T1 motion
  (legs-stock). File `_work/6100-test5.clips` 665104 B, 18 records.
- Validated: reparse clean (47-bit pad), test5 hips Y [-7.90,14.74] == T1.
  (test2 file = same approach on T1-modified base; superseded.)
  Loading path (VictoryList append + adefs + full index set) staged next.

### 2026-09-18 — BREAKTHROUGH: motion-name registry found (`Cutscene/CutsceneNoRegistry.jsfb`)
- User correction accepted: the victory customizer's picker lists **move names**,
  not wrestler names. Registry hunt result: `Cutscene/CutsceneNoRegistry.jsfb`
  (identifier `Cuts`, live copy in `bakedfile02`, 97,032 B) contains every probe
  picker name (`THUMBS UP, THUMBS DOWN`, `TIME TRAVELER`, `TECH CHAIRWOMAN`,
  `SLAM TO WIN`, `SKY PIRATE`, ...). `VictoryListData` rows contain NONE of them
  (0/680) — the picker is registry-driven, not VL-driven.
- Structure decoded: FlatBuffer root→table(field0 uoffset)→vector of **2,160
  uoffset entry tables**; entry table (32 B, shared vtable): f0@+8 = motion id,
  f1@+12 = nameString, f3@+4/f5@+5/f6@+6 = flags, f4@+16 = 16/20, f7@+24 =
  per-entry hash, f8@+20 = -1. Verified: entry id 6100 → nameString `0x17717C81`
  resolves in ENG.sdb to `THE ROCK`.
- Appender written (Temp `add-cutscene-entry.js`): splice-insert 4 B at vector
  end, shift region +4, existing slots +4, append cloned 6100 table at EOF with
  id 6185 + nameString −9554, reuse shared vtable. Result: 2,161 entries,
  **0 invalid tables**, new entry at index 2160 (table 97036).
- Testv1.02d baked under final name `aurora-testv102d.cak` (5,041,716 B, 4 files:
  `Cutscene/CutsceneNoRegistry.jsfb` + `Animation/Victory/6185.clips` +
  `6185.adefs` + `Sdb/ENG.sdb` w/ `TEST 6185` @ −9554). Verified, opens.
  SHA256 `E9022EC8DD01C76DD7D23FF7B7114216187B6C05F76A56D2716D239D231B57EC`.
- Staged alone in `mods/` + manifest [it]; tests 101a/102a/102b/102c retired to
  `_work/retired-mods/`. Verdict protocol: launch → Creations → VICTORY → pick
  any template → open the move-name picker → look for `TEST 6185` (T section) →
  select/preview.

### 2026-09-18 � CORRECTION + Testv1.02e (rename probes)
- CORRECTION: the "74 missing" list was WRONG. Union of Animation/Victory/*.clips
  across ALL 15 archives = 1,042 ids; bakedfile01/03 (patch archives) hold 75 of
  the "missing" ids, bakedfile100 holds 968. 6185 EXISTS (stock "THE USOS 1");
  our duplicate-id append lost to the stock entry, explaining the no-show.
  TRUE missing set (2K19-only) = 19 ids: 6104,6901,7001,7009,7012,7013,7100,7101,
  7105,7150,7153,7180,7181,7600,7602,7604,8050,8400,8755.
- Testv1.02e staged: registry renames (id 6185 -> "TEST 6185"; ids 6588+588
  ("ZOMBIE" x2) -> "TEST 585858585") + overridden Animation/Victory/6185.clips
  (2K19 Uso port, 0 clamps) + adefs + ENG.sdb names. CAK
  aurora-testv102e.cak (5,043,080 B, 4 files, verified, opens).
  SHA256 0C32056319C36028EEBE15A8FCBB9900EB49C73A5F0534F086D6107859A20BAE.
- Verdict protocol: T section should show TEST 6185 + TEST 585858585; Z section
  should LOSE "ZOMBIE"; preview of TEST 6185 should play the ported motion.

'use strict';

// Renumber the custom Victory motion family inside a BakeMe tree (2K26).
// Map: 14001 -> 14004, 14002 -> 14005, 14003 -> 14006.
// Touches (all directly scoped, nothing else):
//   1.  File renames for the Victory pair set and assembly names.
//   2.  Cutscene/CsaDatabase.jsfb rows: motionId + the pairs vector (Cont ident).
//   3.  Cutscene/CdefDatabase.jsfb rows: pairId (Cont ident).
//   4.  Cutscene/CutsceneNoRegistry.jsfb rows: motion id (Cuts ident).
//   5.  Entrances/VictoryListData.jsfb row 14004: victoryFace 14003 -> 14006 (Vict ident via chain [0,0]).
//   6.  Cutscene/CaeAdvanced/*.jsfb embedded pairId u32 lanes (7-digit values).
//   7.  Animation/CaeAdvanced/*.adefs: equal-length ASCII rename of the motion-id string.
// Every step validates in place; no color-coded guesses, script leaves the report.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('./jsfb-append-lib');
const { locateCutsceneVector, findCutsceneEntry } = require('./clips-codec/locate-cutscene-vector');

const MAP = new Map([[14001, 14004], [14002, 14005], [14003, 14006]]);

function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex').toUpperCase(); }
function fail(msg) { throw new Error(msg); }

const PHASES = ['10', '11', '12', '13', '14'];
const pairIdFor = (phase, motion) => Number(phase) * 100000 + motion;

function renumberContentRows(buf, map, opts) {
  // opts: { rowField: 0 (motionId), pairsField: 5 (vector of u32), isValue: (v) => bool }
  const { root } = readHeader(buf, 'Cont');
  const vector = followChain(buf, root, [0]);
  const info = readVector(buf, vector);
  let touched = 0;
  info.tables.forEach((table, index) => {
    if (table === null) return;
    const resolved = tableAt(buf, table);
    if (!resolved) return;
    const mfield = fieldByIndex(resolved, opts.rowField);
    if (!mfield || mfield.size < 4) return;
    const motionId = buf.readUInt32LE(mfield.at);
    if (!map.has(motionId)) return;
    touched++;
    const newId = map.get(motionId);
    buf.writeUInt32LE(newId >>> 0, mfield.at);
    if (opts.pairsField != null) {
      const pfield = fieldByIndex(resolved, opts.pairsField);
      if (pfield && pfield.size >= 4) {
        const at = pfield.at + buf.readUInt32LE(pfield.at);
        const count = buf.readUInt32LE(at);
        for (let i = 0; i < count; i++) {
          const v = buf.readUInt32LE(at + 4 + i * 4);
    const s = String(v);
    if (s.length === 7 && PHASES.includes(s.slice(0, 2)) && map.has(Number(s.slice(2)))) {
      const next = pairIdFor(s.slice(0, 2), map.get(Number(s.slice(2))));
      buf.writeUInt32LE(next >>> 0, at + 4 + i * 4);
    }
        }
      }
    }
  });
  return touched;
}

function renumberCdefRows(buf, map) {
  const { root } = readHeader(buf, 'Cont');
  const vector = followChain(buf, root, [0]);
  const info = readVector(buf, vector);
  let touched = 0;
  info.tables.forEach((table) => {
    if (table === null) return;
    const resolved = tableAt(buf, table);
    const field = resolved && fieldByIndex(resolved, 0);
    if (!field || field.size < 4) return;
    const v = buf.readUInt32LE(field.at);
    const s = String(v);
    if (!(s.length === 7 && PHASES.includes(s.slice(0, 2)) && map.has(Number(s.slice(2))))) return;
    touched++;
    buf.writeUInt32LE(pairIdFor(s.slice(0, 2), map.get(Number(s.slice(2)))) >>> 0, field.at);
  });
  return touched;
}

function renumberNoRegistryRows(buf, map) {
  const { count, slotsOffset } = locateCutsceneVector(buf);
  let touched = 0;
  for (let i = 0; i < count; i++) {
    const slot = slotsOffset + 4 * i;
    const rel = buf.readUInt32LE(slot);
    if (!rel) continue;
    const table = slot + rel;
    if (table + 12 > buf.length) continue;
    const id = buf.readUInt32LE(table + 8);
    if (!map.has(id)) continue;
    touched++;
    buf.writeUInt32LE(map.get(id) >>> 0, table + 8);
  }
  return touched;
}

// VictoryListData: Vict ident — root.f0 -> wrapper.f0 -> row vector. Row
// wrestlerId is a U16 lane (field 0), victoryFace is a u32 lane (field 5).
// Uses `parse_2k25_victory_list.js`'s authoritative structure exactly.
function patchVictoryListRows(buf, map) {
  const root = buf.readUInt32LE(0);
  const fieldAt = (table, id) => {
    const vtable = table - buf.readInt32LE(table);
    const vtableSize = buf.readUInt16LE(vtable);
    const slot = vtable + 4 + (id * 2);
    if (slot + 2 > vtable + vtableSize) return null;
    const relative = buf.readUInt16LE(slot);
    return relative ? table + relative : null;
  };
  const offsetField = (table, id) => { const at = fieldAt(table, id); return at === null ? null : at + buf.readUInt32LE(at); };
  const victory = offsetField(root, 0);
  const vector = offsetField(victory, 0);
  const count = buf.readUInt32LE(vector);
  let touched = 0;
  for (let i = 0; i < count; i++) {
    const slot = vector + 4 + i * 4;
    const table = slot + buf.readUInt32LE(slot);
    const idAt = fieldAt(table, 0);
    if (idAt === null) continue;
    if (buf.readUInt16LE(idAt) !== 14004) continue;
    const faceAt = fieldAt(table, 5);
    if (faceAt === null) continue;
    if (buf.readUInt32LE(faceAt) !== 14003) continue;
    touched++;
    buf.writeUInt32LE(14006, faceAt);
  }
  return touched;
}

// Cutscene/CaeAdvanced pair JSFB: re-encode the embedded pairId lanes (7-digit) in place.
function patchPairJsfbLanes(buf) {
  let touched = 0;
  for (let i = 0; i + 4 <= buf.length; i += 4) {
    const v = buf.readUInt32LE(i);
    const s = String(v);
    if (!(s.length === 7 && PHASES.includes(s.slice(0, 2)) && MAP.has(Number(s.slice(2))))) continue;
    const next = pairIdFor(s.slice(0, 2), MAP.get(Number(s.slice(2))));
    buf.writeUInt32LE(next >>> 0, i);
    touched++;
  }
  return touched;
}

function forEachFile(root, fn) {
  for (const item of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, item.name);
    if (item.isDirectory()) forEachFile(full, fn);
    else fn(full);
  }
}

function main() {
  const INPUT = process.argv[2];
  const OUTPUT = process.argv[3];
  if (!INPUT || !OUTPUT) fail('usage: node renumber-victory-motion-ids.js <in-bake> <out-bake>');
  if (!fs.existsSync(INPUT)) fail('missing input: ' + INPUT);
  if (fs.existsSync(OUTPUT)) fail('refusing to overwrite: ' + OUTPUT);

  fs.cpSync(INPUT, OUTPUT, { recursive: true });

  // 1. File renames for pair payload files and the assembly files.
  const renames = [];
  forEachFile(OUTPUT, (f) => {
    const base = path.basename(f);
    const m = base.match(/^(\d{2})(1400[123])\.(clips|adefs|jsfb)$/);
    if (m && PHASES.includes(m[1])) {
      const to = m[1] + MAP.get(Number(m[2])) + '.' + m[3];
      renames.push({ from: f, to: path.join(path.dirname(f), to) });
    }
    const a = base.match(/^(1400[123])\.jsfb$/);
    if (a) renames.push({ from: f, to: path.join(path.dirname(f), MAP.get(Number(a[1])) + '.jsfb') });
  });
  for (const r of renames) {
    if (fs.existsSync(r.to)) fail('rename destination exists: ' + r.to);
    fs.renameSync(r.from, r.to);
  }

  // 2. CsaDatabase rows.
  const csaPath = path.join(OUTPUT, 'Cutscene', 'CsaDatabase.jsfb');
  const csa = fs.readFileSync(csaPath);
  const csaTouched = renumberContentRows(csa, MAP, { rowField: 1, pairsField: 5 });
  fs.writeFileSync(csaPath, csa);

  // 3. CdefDatabase rows.
  const cdefPath = path.join(OUTPUT, 'Cutscene', 'CdefDatabase.jsfb');
  const cdef = fs.readFileSync(cdefPath);
  const cdefTouched = renumberCdefRows(cdef, MAP);
  fs.writeFileSync(cdefPath, cdef);

  // 4. CutsceneNoRegistry rows.
  const cnrPath = path.join(OUTPUT, 'Cutscene', 'CutsceneNoRegistry.jsfb');
  const cnr = fs.readFileSync(cnrPath);
  const cnrTouched = renumberNoRegistryRows(cnr, MAP);
  fs.writeFileSync(cnrPath, cnr);

  // 5. VictoryListData row 14004.victoryFace.
  const vlistPath = path.join(OUTPUT, 'Entrances', 'VictoryListData.jsfb');
  const vlist = fs.readFileSync(vlistPath);
  const vlistTouched = patchVictoryListRows(vlist, MAP);
  fs.writeFileSync(vlistPath, vlist);

  // 6. Pair jsfb embedded ids.
  const pairDir = path.join(OUTPUT, 'Cutscene', 'CaeAdvanced');
  let pairLanes = 0;
  for (const file of fs.readdirSync(pairDir)) {
    if (!file.endsWith('.jsfb')) continue;
    const p = path.join(pairDir, file);
    const b = fs.readFileSync(p);
    const touched = patchPairJsfbLanes(b);
    if (touched) { fs.writeFileSync(p, b); pairLanes += touched; }
  }

  // 7. ADefs ASCII motion-id rename (equal-length digits).
  const adefDir = path.join(OUTPUT, 'Animation', 'CaeAdvanced');
  let adefReplaced = 0;
  for (const file of fs.readdirSync(adefDir)) {
    if (!file.endsWith('.adefs')) continue;
    const p = path.join(adefDir, file);
    const b = fs.readFileSync(p);
    for (const [from, to] of MAP) {
      const fm = Buffer.from(String(from), 'ascii');
      const tm = Buffer.from(String(to), 'ascii');
      let idx = 0;
      while ((idx = b.indexOf(fm, idx)) !== -1) {
        tm.copy(b, idx);
        idx += tm.length;
        adefReplaced++;
      }
    }
    fs.writeFileSync(p, b);
  }

  const report = {
    schema: 'aurora-forge/victory-motion-renumber/v2',
    map: Object.fromEntries(MAP),
    renames: renames.map((r) => path.basename(r.to)),
    csaRows: csaTouched,
    cdefRows: cdefTouched,
    cnrRows: cnrTouched,
    victoryListRows: vlistTouched,
    pairJsfbLanes: pairLanes,
    adefsStringReplacements: adefReplaced,
    files: {},
  };
  forEachFile(OUTPUT, (f) => {
    const rel = path.relative(OUTPUT, f).replaceAll('\\', '/');
    report.files[rel] = sha256(fs.readFileSync(f));
  });
  fs.writeFileSync(path.join(OUTPUT, 'RENUMBER-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) main();
module.exports = {
  MAP, renumberContentRows, renumberCdefRows, renumberNoRegistryRows,
  patchVictoryListRows, patchPairJsfbLanes, PHASES, pairIdFor,
};

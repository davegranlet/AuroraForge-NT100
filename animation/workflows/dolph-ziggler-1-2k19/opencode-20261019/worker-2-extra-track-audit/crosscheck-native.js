'use strict';

// Worker-2: cross-check the seven target ids against authoritative 2K26 runtime
// references: the character skeleton jsfbs, the game executable (name strings
// and 8-byte little-endian hash immediates). Read-only.
//
// Usage: node crosscheck-native.js [out.json]

const fs = require('node:fs');
const path = require('node:path');
const { fnv1a64 } = require('./extract-skeleton-name-table');

const TABLE = path.join(__dirname, 'skeleton-name-table.json');
const SKEL_DIR = 'D:\\games\\2k26-extracts-2\\aurora-full-extract-v116-20260903-221507\\Root\\AnimSystem\\wwe\\characters\\assets\\skeletons';
const EXE = 'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26\\WWE2K26_x64.exe';
const TARGETS = ['0x7297B62FB3E082CB', '0xCFB39889B808B369', '0x7A9F9CC254DF530A', '0x3C75D43637687578', '0x8F0F2E8A24A4504B', '0x69754AC24B31BE74', '0x64062025C581971A'];

function leBytes(idHex) { return Buffer.from(idHex.slice(2), 'hex').reverse(); }

function main() {
  const table = JSON.parse(fs.readFileSync(TABLE, 'utf8'));
  const names = table.names;
  const byId = new Map();
  for (const name of names) { const id = fnv1a64(name); if (!byId.has(id)) byId.set(id, name); }

  const skeletons = {};
  for (const file of fs.readdirSync(SKEL_DIR).filter(name => name.endsWith('.jsfb'))) {
    const text = fs.readFileSync(path.join(SKEL_DIR, file)).toString('latin1');
    skeletons[file] = {
      clipsEditorNamesPresent: names.filter(name => text.includes(name)).length,
      targetsPresent: TARGETS.filter(id => byId.has(id) && text.includes(byId.get(id))),
    };
  }

  const immediate = new Map(TARGETS.map(id => [id, 0]));
  const nameString = new Map(TARGETS.map(id => [id, 0]));
  const fd = fs.openSync(EXE, 'r');
  const chunkSize = 64 * 1024 * 1024;
  const buf = Buffer.alloc(chunkSize);
  let carry = Buffer.alloc(0), pos = 0, read;
  const patterns = TARGETS.map(id => ({ id, bytes: leBytes(id) }));
  while ((read = fs.readSync(fd, buf, 0, chunkSize, pos)) > 0) {
    const chunk = Buffer.concat([carry, buf.subarray(0, read)]);
    for (const { id, bytes } of patterns) { let at = chunk.indexOf(bytes); while (at >= 0) { immediate.set(id, immediate.get(id) + 1); at = chunk.indexOf(bytes, at + 1); } }
    const text = chunk.toString('latin1');
    for (const id of TARGETS) { const name = byId.get(id); if (name && text.includes(name)) nameString.set(id, nameString.get(id) + 1); }
    carry = chunk.subarray(Math.max(0, chunk.length - 80));
    pos += read;
  }
  fs.closeSync(fd);

  const result = {
    schema: 'worker2-native-runtime-crosscheck/v1',
    sources: { skeletons: SKEL_DIR, exe: EXE, exeBytes: fs.statSync(EXE).size },
    skeletons,
    targets: TARGETS.map(id => ({ id, name: byId.get(id) || null, exeNameStringOccurrences: nameString.get(id), exeLeHashImmediateOccurrences: immediate.get(id) })),
    limits: ['Exe string/immediate presence is a static cross-check, not a runtime playback test.', 'Skeleton jsfb name presence is the authoritative 2K26 skinning skeleton; absence of the six knee helpers there is the key result.'],
  };
  const out = process.argv[2];
  const text = JSON.stringify(result, null, 2) + '\n';
  if (out) fs.writeFileSync(path.resolve(out), text);
  console.log(text);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(`native crosscheck failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { TARGETS };

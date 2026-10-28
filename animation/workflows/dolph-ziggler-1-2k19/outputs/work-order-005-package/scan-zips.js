'use strict';
// scan-zips.js - bounded zip sweep for .cak entries whose sha256 matches the four sought builds.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const roots = ['C:/nt100-codebasemain/.local/consolidation-2026-10-16/sources/opencode', 'C:/Users/dgran/Documents/Codex'];
const targets = {
  B4C0A5B709FABF38DD4EE322CC0EC03067F808E7D4922E8C363D7C402E570068: 'B4C0A5B7 adaptive-wrap',
  '075E07F58908A9D729622548009D146A13B2133F0AD57D92021E02C0BF81C78F': '075E07F5 sentinel',
  '87F41AD94B18388A483BB165DF2EF87201EBD101FD88997897DD2627E36BEB60': '87F41AD9 f7-restore',
  BFD9EC94C2537CE42B02F88400B923963F1790FBEA32FBBB7A9282F99FF50CA4: 'BFD9EC94 CAE-playable',
};
const zips = [];
(function walk(p) {
  let es = [];
  try { es = fs.readdirSync(p, { withFileTypes: true }); } catch (e) { return; }
  for (const e of es) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const fp = path.join(p, e.name);
    let st; try { st = fs.statSync(fp); } catch (err) { continue; }
    if (e.isDirectory()) walk(fp);
    else if (/\.zip$/i.test(e.name) && st.size > 1048576 && st.size < 400 * 1048576) zips.push({ fp, size: st.size });
  }
})(roots[0]);
(function walk(p) {
  let es = [];
  try { es = fs.readdirSync(p, { withFileTypes: true }); } catch (e) { return; }
  for (const e of es) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const fp = path.join(p, e.name);
    let st; try { st = fs.statSync(fp); } catch (err) { continue; }
    if (e.isDirectory()) walk(fp);
    else if (/\.zip$/i.test(e.name) && st.size > 1048576 && st.size < 400 * 1048576) zips.push({ fp, size: st.size });
  }
})(roots[1]);

console.log('zips found:', zips.length);
function listZip(buf) {
  const eocd = (() => { for (let i = buf.length - 22; i >= buf.length - 65558 && i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) return i; return -1; })();
  if (eocd < 0) return [];
  const total = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let n = 0; n < total; n++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const cSize = buf.readUInt32LE(off + 20);
    const uSize = buf.readUInt32LE(off + 24);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const cmtLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.subarray(off + 46, off + 46 + nameLen).toString('latin1');
    out.push({ name, method, cSize, uSize, localOff });
    off += 46 + nameLen + extraLen + cmtLen;
  }
  return out;
}
function extractEntry(buf, entry) {
  // local file header: 30 bytes + name + extra, then data
  const lo = entry.localOff;
  if (buf.readUInt32LE(lo) !== 0x04034b50) return null;
  const nameLen = buf.readUInt16LE(lo + 26);
  const extraLen = buf.readUInt16LE(lo + 28);
  const start = lo + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + entry.cSize);
  if (entry.method === 0) return Buffer.from(data);
  if (entry.method === 8) { try { return zlib.inflateRawSync(data); } catch (e) { return null; } }
  return null;
}
for (const z of zips) {
  let buf;
  try { buf = fs.readFileSync(z.fp); } catch (e) { continue; }
  const entries = listZip(buf);
  const caks = entries.filter((e) => /\.cak$/i.test(e.name));
  if (!caks.length) continue;
  console.log('  ' + z.fp + ' (' + z.size + 'B) cak entries: ' + caks.map((c) => c.name + '(' + c.uSize + ')').join(', '));
  for (const c of caks) {
    const data = extractEntry(buf, c);
    if (!data) { console.log('    [extract failed] ' + c.name); continue; }
    const h = crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
    const hit = targets[h];
    console.log('    ' + c.name + ' sha=' + h.slice(0, 16) + (hit ? '  *** MATCH: ' + hit : ''));
  }
}

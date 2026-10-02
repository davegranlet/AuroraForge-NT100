// bake-2k20-textures.js — CLI: BakeMe dir (+.dds) -> FDIR v6.8 CAK for WWE 2K20.
// Chain: .dds --(Unity crunch fork)--> CRN --(TEX! v9 writer)--> .tex --(our v6.8 backend)--> .cak
// Provenance: hand-validated on Rock head_color (magenta 09 + user-paint 08 re-container);
// catalog hash == stock hash exact, unpack roundtrip byte-exact, game mounts + boots.
// v1 scope: DXT1 fully automatic. Other fourCCs need --stockTex <file-or-dir> harvest
// (footer tag + fmt/type/srgb taken from the stock .tex of the same virtual path).
// Usage: node tools/bake-2k20-textures.js <BakeMeDir> <output.cak> [--crunch exe] [--caketool exe] [--stockTex dir] [--keep-tmp]
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const FOURCC_MAP = {
  DXT1: { fmt: 0x7FD9CD97, footer: 'BC1:UNORM' },
  DXT5: { fmt: 0x9EE2BD60, footer: 'BC3:UNORM' },
  ATI1: { fmt: 0x4A28D98B, footer: 'BC4:UNORM' },
  BC4U: { fmt: 0x4A28D98B, footer: 'BC4:UNORM' },
  ATI2: { fmt: 0xB8435A88, footer: 'BC5:UNORM' },
  BC5U: { fmt: 0xB8435A88, footer: 'BC5:UNORM' },
};
const TYPE_UNORM = 0x5C0D3942;
const DEFAULT_CRUNCH = 'D:/bot-crap/CakeToolsv098a/release/thirdparty/crunch_x64.exe';
const DEFAULT_CAKETOOL = 'D:/AuroraForge-Aug26/Aurora-CAK-Foundry/app/tools/cak-v93/CakeTool.exe';

function die(m) { console.error('FATAL: ' + m); process.exit(1); }
function readDdsHeader(p) {
  const b = fs.readFileSync(p);
  if (b.length < 128 || b.subarray(0, 4).toString() !== 'DDS ') die('not a DDS: ' + p);
  return {
    h: b.readUInt32LE(12), w: b.readUInt32LE(16), mips: b.readUInt32LE(28),
    fourcc: b.subarray(84, 88).toString(),
  };
}
// Harvest {fmt,type,srgb,numMip,dim,footer} from a stock .tex (TEX! v9) if supplied.
function harvestStock(stockPath) {
  const b = fs.readFileSync(stockPath);
  if (b.subarray(0, 4).toString() !== 'TEX!' || b.readUInt8(4) !== 9) die('stock tex not TEX! v9: ' + stockPath);
  const v = new DataView(b.buffer, b.byteOffset, b.length);
  const size = v.getUint32(36, true);
  return {
    fmt: v.getUint32(24, true), type: v.getUint32(28, true), srgb: v.getUint8(32),
    numMip: v.getUint8(33), dim: v.getUint8(34),
    footer: b.subarray(44 + size, 44 + size + 16).toString().split('\0')[0],
  };
}
function buildTexV9({ w, h, numMip, fmt, type, srgb, dim }, crnBuf, footer) {
  const head = Buffer.alloc(44);
  head.write('TEX!', 0);
  head.writeUInt8(9, 4);
  head.writeUInt16LE(w, 8); head.writeUInt16LE(h, 10); head.writeUInt16LE(0, 12); head.writeUInt16LE(0, 14);
  // 16..24 unkSizes stay zero (matches stock Rock textures)
  head.writeUInt32LE(fmt, 24); head.writeUInt32LE(type, 28);
  head.writeUInt8(srgb, 32); head.writeUInt8(numMip, 33); head.writeUInt8(dim, 34);
  // 35..36 pad zeros via alloc; size@36
  head.writeUInt32LE(crnBuf.length, 36);
  head.write('CRN!', 40);
  return Buffer.concat([head, crnBuf, Buffer.from(footer, 'ascii')]);
}
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.dds$/i.test(e.name)) out.push(p);
  }
  return out;
}
function main() {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const bakeMe = args[0], output = args[1];
  if (!bakeMe || !output) die('Usage: node tools/bake-2k20-textures.js <BakeMeDir> <output.cak> [--crunch exe] [--caketool exe] [--stockTex dir] [--keep-tmp]');
  const crunch = get('--crunch') || DEFAULT_CRUNCH;
  const caketool = get('--caketool') || DEFAULT_CAKETOOL;
  const stockDir = get('--stockTex');
  const keepTmp = args.includes('--keep-tmp');
  if (!fs.existsSync(crunch)) die('crunch exe missing: ' + crunch + ' (Unity fork required, stock BinomialLLC garbles in-game)');
  if (!fs.existsSync(caketool)) die('caketool missing: ' + caketool);
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'bake20-'));
  fs.cpSync(bakeMe, stage, { recursive: true });
  const files = walk(stage);
  if (!files.length) die('no .dds files under ' + bakeMe);
  console.log('dds inputs: ' + files.length);
  let converted = 0;
  for (const dds of files) {
    const rel = path.relative(stage, dds).replace(/\\/g, '/');
    const hdr = readDdsHeader(dds);
    let spec = FOURCC_MAP[hdr.fourcc];
    let stock = null;
    if (stockDir) {
      const cand = path.join(stockDir, rel.replace(/\.dds$/i, '.tex'));
      if (fs.existsSync(cand)) stock = harvestStock(cand);
    }
    if (!spec && !stock) die('unsupported fourCC ' + hdr.fourcc + ' with no --stockTex harvest for ' + rel);
    const fmt = stock ? stock.fmt : spec.fmt;
    const footer = stock && stock.footer ? stock.footer : spec.footer;
    const srgb = stock ? stock.srgb : (/_color/i.test(dds) ? 1 : 0);
    const crnTmp = dds + '.crn';
    execFileSync(crunch, ['-file', dds, '-out', crnTmp, '-mipMode', 'UseSource', '-noprogress', '-quiet'], { stdio: 'pipe' });
    const crn = fs.readFileSync(crnTmp);
    const tex = buildTexV9({ w: hdr.w, h: hdr.h, numMip: stock ? stock.numMip : hdr.mips, fmt, type: stock ? stock.type : TYPE_UNORM, srgb, dim: stock ? stock.dim : 2 }, crn, footer);
    const texPath = dds.replace(/\.dds$/i, '.tex');
    fs.writeFileSync(texPath, tex);
    fs.unlinkSync(dds); fs.unlinkSync(crnTmp);
    converted++;
  }
  console.log('tex built: ' + converted);
  execFileSync(caketool, ['pack', '-i', stage, '-v', '6.8', '--encrypt-header', '-o', output], { stdio: 'inherit' });
  const st = fs.statSync(output);
  console.log('packed: ' + output + ' (' + st.size + 'B)');
  if (!keepTmp) fs.rmSync(stage, { recursive: true, force: true });
  else console.log('staged tree kept: ' + stage);
}
main();

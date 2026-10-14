'use strict';
// WWE 2K26 ENG.sdb string codec (SDBEditor-compatible).
// Ported from SDBEditor 2.0.6 (SDBEditor.Handlers.StringTransform):
// a 64-step keyed state machine seeded by the record's absolute pool offset.
// The transform is an involution: apply with the same offset to decode or encode.
const M = 0xffffffffffffffffn;
const u64 = (v) => BigInt.asUintN(64, v);
const u32 = (v) => Number(BigInt.asUintN(32, BigInt(v)));
const rol64 = (v, n) => { const s = BigInt(n & 63); return s === 0n ? u64(v) : u64((u64(v) << s) | (u64(v) >> (64n - s))); };
const sbyte = (v) => (v << 24) >> 24;

const KS = [4579724129728682375n, 1839667008360511283n, 6502105013889485417n, 13035343817764741564n];
const KI = [2, 0, 3, 1];
const KT = [-4320245347617046290n, -8615628295747243028n, -7065627313369144367n, -4914445679517265100n];

// step i: (s) => mutates the state; transcribed from the .cctor lambdas b__19_i
const STEPS = [
  (s) => { s.keys[0] = u64(KT[0] ^ KS[KI[0]]); },
  (s) => { s.keys[1] = u64(KT[1] ^ KS[KI[1]]); },
  (s) => { s.keys[2] = u64(KT[2] ^ KS[KI[2]]); },
  (s) => { s.keys[3] = u64(KT[3] ^ KS[KI[3]]); },
  (s) => { s.rotA = Number(BigInt.asUintN(32, s.offset ^ 0xE1n)) & 0x3f; },
  (s) => { s.byteB = Number(BigInt.asUintN(8, BigInt.asIntN(8, s.offset & 0xffn) * -21n)); },
  (s) => { s.mix = u64(s.keys[0] * s.offset); },
  (s) => { s.mix = u64(s.mix ^ s.keys[1]); },
  (s) => { s.mix = u64(s.mix - s.keys[2]); },
  (s) => { s.mix = rol64(s.mix, s.rotA); },
  (s) => { s.saved = s.mix; },
  (s) => { s.mix = u64(s.saved + BigInt(s.index)); },
  (s) => { s.mix = u64(s.mix + s.keys[3]); },
  (s) => { s.mix = u64(s.mix + s.offset); },
  (s) => { s.mix = rol64(s.mix, 17); },
  (s) => { s.saved = s.mix; },
  (s) => { s.mix = u64(s.mix >> 23n); },
  (s) => { s.mix = u64(s.mix ^ BigInt(s.input[s.index] || 0)); },
  (s) => { s.mix = u64(s.mix ^ s.saved); },
  (s) => { s.mix = u64(s.mix ^ BigInt(s.byteB)); },
  (s) => { s.output[s.index] = Number(s.mix & 0xffn); s.index += 1; },
  (s) => { s.L0 = rol64(s.L0, 13); },
  (s) => { s.L1 = u64(s.L1 ^ s.L2); },
  (s) => { s.L2 = u64(s.L2 + 7640891576956012808n); },
  (s) => { s.B4 = Number((s.L0 >> 40n) & 0xffn); },
  (s) => { s.L0 = u64(s.L1 * 6364136223846793005n); },
  (s) => { s.L2 = u64(u64(~s.L0) ^ s.L1); },
  (s) => { s.L3 = rol64(u64(s.L3 ^ s.L0), 31); },
  (s) => { s.L1 = u64(s.L1 - 7046029254386353131n); },
  (s) => { s.L0 = u64(s.L0 ^ (s.L0 >> 33n)); },
  (s) => { s.L2 = u64(s.L2 * -49064778989728563n); },
  (s) => { s.B4 = Number(BigInt(s.B4) ^ ((s.L1 >> 56n) & 0xffn)) & 0xff; },
  (s) => { s.L3 = u64(s.L3 + s.L2); },
  (s) => { s.L0 = u64(rol64(s.L0, 27) ^ s.L3); },
  (s) => { s.L1 = u64(s.L1 ^ (s.L1 >> 29n)); },
  (s) => { s.L2 = u64(s.L2 * -4265267296055464877n); },
  (s) => { s.L3 = u64(s.L3 ^ u64((s.L0 << 5n) | (s.L0 >> 59n))); },
  (s) => { s.B4 = Number(BigInt(s.B4) + (s.L2 & 0xffn)) & 0xff; },
  (s) => { s.L0 = u64(s.L2 ^ (s.L2 >> 17n)); },
  (s) => { s.L1 = rol64(s.L1, 45); },
  (s) => { s.L3 = u64(s.L3 - s.L1); },
  (s) => { s.L0 = u64(s.L0 ^ 5871781006564002452n); },
  (s) => { s.L2 = rol64(u64(s.L2 + s.L3), 23); },
  (s) => { s.B4 = Number((s.L3 >> 48n) & 0xffn); },
  (s) => { s.L1 = u64(s.L0 + rol64(s.L1, 37)); },
  (s) => { s.L3 = u64(s.L3 ^ (s.L2 >> 11n)); },
  (s) => { s.L0 = u64(s.L0 * -6939452855193903323n); },
  (s) => { s.L2 = u64(s.L2 ^ rol64(s.L3, 19)); },
  (s) => { s.L1 = u64(s.L1 + 2685821657736338717n); },
  (s) => { s.B4 = Number(BigInt(s.B4) ^ ((s.L0 >> 32n) & 0xffn)) & 0xff; },
  (s) => { s.L3 = rol64(u64(s.L0 ^ s.L1), 41); },
  (s) => { s.L0 = u64(s.L2 - s.L3); },
  (s) => { s.L1 = u64(s.L3 ^ (s.L3 << 7n)); },
  (s) => { s.L2 = u64(s.L0 * -4658895280553007687n); },
  (s) => { s.L3 = u64(s.L3 ^ rol64(s.L1, 53)); },
  (s) => { s.B4 = Number(BigInt(s.B4) + 157n) & 0xff; },
  (s) => { s.L0 = u64(rol64(s.L0, 29) + s.L2); },
  (s) => { s.L1 = u64(s.L1 ^ -7723592293110705685n); },
  (s) => { s.L3 = u64(s.L3 + rol64(s.L2, 7)); },
  (s) => { s.L2 = u64(s.L2 ^ rol64(s.L1, 11)); },
  (s) => { s.L0 = u64(s.L3 * -2960836687051489901n); },
  (s) => { s.L1 = rol64(u64(s.L0 + s.L2), 33); },
  (s) => { s.L3 = u64(s.L3 ^ (s.L1 << 3n)); },
  (s) => { s.B4 = Number(BigInt(s.B4) ^ ((s.L2 >> 24n) & 0xffn)) & 0xff; }
];

// routes: _wp indices mapped to step numbers (see extraction 2026-10-04)
const WP = [24,23,35,57,62,26,54,22,46,3,11,12,48,42,51,6,34,31,52,20,29,5,32,55,17,43,16,7,2,4,37,47,14,27,36,45,8,41,40,15,50,28,25,1,21,49,59,60,44,53,18,13,9,19,10,33,56,58,63,38,39,0,61,30];
const WI = [61,33,43,2,49,28,9,29,23,4,21,15,60,27,22,36,17,4,52,13,54];
const WS = [10,11,51,14,62,32,39,26,24,50,53,23,19,4,31,0];

function transform(input, offset) {
  const s = {
    keys: [0n, 0n, 0n, 0n],
    rotA: 0, byteB: 0,
    mix: 0n, saved: 0n,
    offset: BigInt(offset >>> 0),
    input,
    output: Buffer.alloc(input.length),
    index: 0,
    L0: u64(BigInt(offset >>> 0) * 1099511628211n),
    L1: u64(~BigInt(offset >>> 0)),
    L2: rol64(BigInt(offset >>> 0), 17),
    L3: u64(BigInt(offset >>> 0) ^ -559038737n),
    B4: (offset >>> 8) & 0xff
  };
  for (const i of WI) STEPS[WP[i]](s);
  for (let j = 0; j < input.length; j += 1) for (const i of WS) STEPS[WP[i]](s);
  return s.output;
}

module.exports = { transform };

if (require.main === module) {
  const fs = require('fs');
  const [input, output, offsetRaw] = process.argv.slice(2);
  if (!input || !output || offsetRaw === undefined) {
    console.error('Usage: node sdb-2k26.js <in> <out> <offset>');
    process.exit(2);
  }
  fs.writeFileSync(output, transform(fs.readFileSync(input), Number(offsetRaw)));
  console.log('ok', output);
}

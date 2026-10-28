'use strict';
// Second hash family test. Observation (from the 62 known 2K19 body hashes): for every name,
// hash32(name) ^ lastByte(name) depends only on the prefix (e.g. L/R siblings share it, digit siblings share it).
// Hypothesis under test: hash32(name) = T(prefix) ^ lastByte(name) for some standard 32-bit string hash T.
const { KNOWN_IMPORT } = { KNOWN_IMPORT: null };
void KNOWN_IMPORT;
const KNOWN = [
  ['J_Root', '0c5879e5'], ['J_Hips', 'f91a7a26'], ['J_Spine1', '0daecc2e'], ['J_Spine2', '0daecc2d'], ['J_Chest', '3d185308'],
  ['J_Neck', 'f9d973be'], ['J_Head', 'f91972b1'], ['J_Clavicle_L', 'd153e363'], ['J_Shoulder_L', 'a46a2f43'], ['J_Elbow_L', '6742f8aa'],
  ['J_Wrist_L', 'd4c2705a'], ['J_MiddleF0_L', 'b10ceb4c'], ['J_MiddleF1_L', 'b10cab4c'], ['J_MiddleF2_L', 'b10c6b4c'], ['J_MiddleF3_L', 'b10c2b4c'],
  ['J_ThumbF1_L', 'fc1daa0d'], ['J_ThumbF2_L', 'fc1d6a0d'], ['J_ThumbF3_L', 'fc1d2a0d'], ['J_RingF0_L', '2769889f'], ['J_RingF1_L', '2769c89f'],
  ['J_RingF2_L', '2769089f'], ['J_RingF3_L', '2769489f'], ['J_IndexF0_L', '4111ae4c'], ['J_IndexF1_L', '4111ee4c'], ['J_IndexF2_L', '41112e4c'],
  ['J_IndexF3_L', '41116e4c'], ['J_PinkyF0_L', '481f863c'], ['J_PinkyF1_L', '481fc63c'], ['J_PinkyF2_L', '481f063c'], ['J_PinkyF3_L', '481f463c'],
  ['J_Clavicle_R', 'd153e37d'], ['J_Shoulder_R', 'a46a2f5d'], ['J_Elbow_R', '6742f8b4'], ['J_Wrist_R', 'd4c27044'], ['J_RingF0_R', '27698881'],
  ['J_RingF1_R', '2769c881'], ['J_RingF2_R', '27690881'], ['J_RingF3_R', '27694881'], ['J_IndexF0_R', '4111ae52'], ['J_IndexF1_R', '4111ee52'],
  ['J_IndexF2_R', '41112e52'], ['J_IndexF3_R', '41116e52'], ['J_PinkyF0_R', '481f8622'], ['J_PinkyF1_R', '481fc622'], ['J_PinkyF2_R', '481f0622'],
  ['J_PinkyF3_R', '481f4622'], ['J_MiddleF0_R', 'b10ceb52'], ['J_MiddleF1_R', 'b10cab52'], ['J_MiddleF2_R', 'b10c6b52'], ['J_MiddleF3_R', 'b10c2b52'],
  ['J_ThumbF1_R', 'fc1daa13'], ['J_ThumbF2_R', 'fc1d6a13'], ['J_ThumbF3_R', 'fc1d2a13'], ['J_Leg_L', 'ccb8c530'], ['J_Knee_L', 'ec2c1192'],
  ['J_Foot_L', 'fd6851fa'], ['J_Toe_L', '4df84531'], ['J_Leg_R', 'ccb8c52e'], ['J_Knee_R', 'ec2c118c'], ['J_Foot_R', 'fd6851e4'],
  ['J_Toe_R', '4df8452f'], ['J_Dock', '5c7d3444'],
];
const hex32 = (v) => (v >>> 0).toString(16).padStart(8, '0');

// Consistency check of the structural property on the known data (independent of T).
function xorStructure() {
  const groups = new Map();
  for (const [n, h] of KNOWN) {
    const prefix = n.slice(0, -1), last = n.charCodeAt(n.length - 1);
    const g = (parseInt(h, 16) ^ last) >>> 0;
    if (!groups.has(prefix)) groups.set(prefix, new Set());
    groups.get(prefix).add(hex32(g));
  }
  const multi = [...groups.entries()].filter(([, s]) => s.size > 1);
  return { prefixes: groups.size, inconsistentPrefixes: multi.map(([p, s]) => ({ p, values: [...s] })) };
}

function crc32Table(poly) {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? poly ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
}
const T_IEEE = crc32Table(0xedb88320), T_C = crc32Table(0x82f63b78);
function crcGeneric(table, init, xorOut) {
  return (buf) => { let c = init >>> 0; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ xorOut) >>> 0; };
}
const fnv1a = (seed) => (buf) => { let h = seed >>> 0; for (const b of buf) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h; };
const fnv1 = (seed) => (buf) => { let h = seed >>> 0; for (const b of buf) { h = Math.imul(h, 0x01000193) >>> 0; h ^= b; } return h; };
const djb2 = (seed) => (buf) => { let h = seed >>> 0; for (const b of buf) h = (Math.imul(h, 33) + b) >>> 0; return h; };
const djb2x = (seed) => (buf) => { let h = seed >>> 0; for (const b of buf) h = (Math.imul(h, 33) ^ b) >>> 0; return h; };
const joaat = (seed) => (buf) => { let h = seed >>> 0; for (const b of buf) { h = (h + b) >>> 0; h = (h + (h << 10)) >>> 0; h ^= h >>> 6; } h = (h + (h << 3)) >>> 0; h ^= h >>> 11; h = (h + (h << 15)) >>> 0; return h; };
const sdbm = (seed) => (buf) => { let h = seed >>> 0; for (const b of buf) h = (b + Math.imul(h, 65599)) >>> 0; return h; };
const Ts = {
  crc32_std: crcGeneric(T_IEEE, 0xffffffff, 0xffffffff),
  crc32_noxor: crcGeneric(T_IEEE, 0xffffffff, 0),
  crc32_init0: crcGeneric(T_IEEE, 0, 0),
  crc32_init0_xor: crcGeneric(T_IEEE, 0, 0xffffffff),
  crc32c_std: crcGeneric(T_C, 0xffffffff, 0xffffffff),
  crc32c_noxor: crcGeneric(T_C, 0xffffffff, 0),
  fnv1a_offset: fnv1a(0x811c9dc5), fnv1a_0: fnv1a(0), fnv1_offset: fnv1(0x811c9dc5), fnv1_0: fnv1(0),
  djb2_5381: djb2(5381), djb2x_5381: djb2x(5381), joaat_0: joaat(0), sdbm_0: sdbm(0),
};
const cases = { as_is: (s) => s, lower: (s) => s.toLowerCase(), upper: (s) => s.toUpperCase() };

const out = { structure: xorStructure(), hits: [] };
for (const [tn, T] of Object.entries(Ts)) {
  for (const [cn, tf] of Object.entries(cases)) {
    let matches = 0;
    for (const [n, h] of KNOWN) {
      const s = tf(n);
      const prefix = Buffer.from(s.slice(0, -1), 'utf8');
      const last = s.charCodeAt(s.length - 1);
      if (hex32((T(prefix) ^ last) >>> 0) === h) matches++;
    }
    out.hits.push({ T: tn, casing: cn, matches, of: KNOWN.length });
  }
}
out.hits.sort((a, b) => b.matches - a.matches);
process.stdout.write(JSON.stringify(out.structure) + '\n');
for (const h of out.hits.slice(0, 10)) process.stdout.write(JSON.stringify(h) + '\n');

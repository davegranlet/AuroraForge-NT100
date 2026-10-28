'use strict';
// Test a family of 32-bit string hashes against the 62 known 2K19 body hashes (decoded from source S0).
// Observation motivating the family: L/R sibling names differ by XOR 0x1E in the low byte
// ('L'^'R'), and Spine1/Spine2 differ by XOR 0x03 ('1'^'2'): the last character behaves as a direct XOR.
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
const FACIAL_SRC = ['5f384530', '5f38452e', 'abf2b0f3', 'a64221cf', 'a64221cc', 'a64221cd', 'a64221ca'];
const FACIAL_NAMES = ['J_Eye_L', 'J_Eye_R', 'J_Jaw', 'J_Tongue1', 'J_Tongue2', 'J_Tongue3', 'J_Tongue4'];
const hex32 = (v) => (v >>> 0).toString(16).padStart(8, '0');

// Family: h = (h * M) ^ c  (djb2a-like) and h = (h * M) + c then optional final xor by last char, etc.
function family(seed, M) {
  return (buf) => { let h = seed >>> 0; for (const b of buf) h = (Math.imul(h, M) ^ b) >>> 0; return h; };
}
function familyAdd(seed, M) {
  return (buf) => { let h = seed >>> 0; for (const b of buf) h = (Math.imul(h, M) + b) >>> 0; return h; };
}
function familyXorFirst(seed, M) {
  return (buf) => { let h = seed >>> 0; for (const b of buf) h = Math.imul(h ^ b, M) >>> 0; return h; };
}
const SEEDS = [0, 1, 5381, 0x1505, 0x811c9dc5, 0xffffffff, 0x9e3779b9, 0x12345678];
const MULTS = [5, 7, 16, 31, 33, 37, 65599, 131, 1313, 16777619, 0x01000193, 0x5bd1e995, 0x2127599b];
const FAMILIES = { xor_after_mul: family, add_after_mul: familyAdd, mul_after_xor: familyXorFirst };

const cases = { as_is: (s) => s, lower: (s) => s.toLowerCase(), upper: (s) => s.toUpperCase() };
const results = [];
for (const [fname, make] of Object.entries(FAMILIES)) {
  for (const seed of SEEDS) for (const M of MULTS) {
    const fn = make(seed, M);
    for (const [cname, tf] of Object.entries(cases)) {
      let matches = 0;
      for (const [name, h] of KNOWN) if (hex32(fn(Buffer.from(tf(name), 'utf8'))) === h) matches++;
      if (matches >= 3) results.push({ family: fname, seed, M, casing: cname, matches, of: KNOWN.length });
    }
  }
}
results.sort((a, b) => b.matches - a.matches);
process.stdout.write('family hits with >=3 matches (top 15):\n');
for (const r of results.slice(0, 15)) process.stdout.write(JSON.stringify(r) + '\n');
if (!results.length) process.stdout.write('none with >=3 matches\n');
// Test the best candidate, if any, against the facial hashes.
if (results.length && results[0].matches >= 40) {
  const r = results[0];
  const fn = FAMILIES[r.family](r.seed, r.M);
  const tf = cases[r.casing];
  process.stdout.write('best candidate facial test:\n');
  for (const n of FACIAL_NAMES) process.stdout.write(`  ${n} -> ${hex32(fn(Buffer.from(tf(n), 'utf8')))}\n`);
  process.stdout.write('source facial hash32: ' + FACIAL_SRC.join(' ') + '\n');
}

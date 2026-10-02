'use strict';

const MASK64 = 0xffffffffffffffffn;
const u32 = (value) => Number(BigInt.asUintN(32, BigInt(value)));
const u64 = (value) => BigInt.asUintN(64, BigInt(value));

function crc32cByteRaw(seed, value) {
  let crc = u32(seed ^ (value & 0xff));
  for (let bit = 0; bit < 8; bit += 1) crc = u32((crc >>> 1) ^ ((crc & 1) ? 0x82f63b78 : 0));
  return crc;
}

function crc32cU64Raw(seed, value) {
  let crc = seed;
  let word = u64(value);
  for (let index = 0; index < 8; index += 1) {
    crc = crc32cByteRaw(crc, Number(word & 0xffn));
    word >>= 8n;
  }
  return crc;
}

function crc32cBuffer(input) {
  let crc = 0xffffffff;
  for (const value of input) crc = crc32cByteRaw(crc, value);
  return u32(~crc);
}

function fnv64StringI(value) {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index += 1) {
    hash = u64((hash ^ BigInt(value[index].toLowerCase().charCodeAt(0))) * 0x100000001b3n);
  }
  return hash;
}

class Sfmt19937 {
  constructor(seed) {
    this.state = new Uint32Array(624);
    this.state[0] = u32(seed);
    for (let index = 1; index < 624; index += 1) {
      this.state[index] = u32(Math.imul(1812433253, u32(this.state[index - 1] ^ (this.state[index - 1] >>> 30))) + index);
    }
    const parity = [1, 0, 0, 0x13c9e684];
    let inner = 0;
    for (let index = 0; index < 4; index += 1) inner ^= this.state[index] & parity[index];
    for (let shift = 16; shift > 0; shift >>>= 1) inner ^= inner >>> shift;
    if ((inner & 1) === 0) {
      outer: for (let index = 0; index < 4; index += 1) {
        for (let work = 1, bit = 0; bit < 32; bit += 1, work = u32(work << 1)) {
          if ((work & parity[index]) !== 0) { this.state[index] ^= work; break outer; }
        }
      }
    }
    this.index = 624;
  }

  generate() {
    const p = this.state;
    let a = 0, b = 122 * 4, c = (156 - 2) * 4, d = (156 - 1) * 4;
    do {
      p[a + 3] = u32(p[a + 3] ^ u32(p[a + 3] << 8) ^ (p[a + 2] >>> 24) ^ (p[c + 3] >>> 8) ^ ((p[b + 3] >>> 11) & 0xbffffff6) ^ u32(p[d + 3] << 18));
      p[a + 2] = u32(p[a + 2] ^ u32(p[a + 2] << 8) ^ (p[a + 1] >>> 24) ^ u32(p[c + 3] << 24) ^ (p[c + 2] >>> 8) ^ ((p[b + 2] >>> 11) & 0xbffaffff) ^ u32(p[d + 2] << 18));
      p[a + 1] = u32(p[a + 1] ^ u32(p[a + 1] << 8) ^ (p[a] >>> 24) ^ u32(p[c + 2] << 24) ^ (p[c + 1] >>> 8) ^ ((p[b + 1] >>> 11) & 0xddfecb7f) ^ u32(p[d + 1] << 18));
      p[a] = u32(p[a] ^ u32(p[a] << 8) ^ u32(p[c + 1] << 24) ^ (p[c] >>> 8) ^ ((p[b] >>> 11) & 0xdfffffef) ^ u32(p[d] << 18));
      c = d; d = a; a += 4; b += 4; if (b >= 624) b = 0;
    } while (a < 624);
  }

  next() {
    if (this.index >= 624) { this.generate(); this.index = 0; }
    return this.state[this.index++];
  }
}

function rol32(value, shift) {
  const amount = shift & 31;
  return amount === 0 ? u32(value) : u32((value << amount) | (value >>> (32 - amount)));
}

function readU32LE(input, offset) { return input.readUInt32LE(offset); }

function chacha20V99(input) {
  const key = Buffer.from('G7MGM-k_BB-iw4Y%ftP%2Rg2;-Rrp[RK', 'ascii');
  const iv = Buffer.concat([Buffer.alloc(4), Buffer.from('hrA*WPe$', 'ascii')]);
  const sigma = Buffer.from('a_42W0*X{W1+@N%x', 'ascii');
  const state = new Uint32Array(16);
  for (let index = 0; index < 4; index += 1) state[index] = readU32LE(sigma, index * 4);
  for (let index = 0; index < 8; index += 1) state[4 + index] = readU32LE(key, index * 4);
  state[12] = 0; state[13] = readU32LE(iv, 0); state[14] = readU32LE(iv, 4); state[15] = readU32LE(iv, 8);
  const work = Uint32Array.from(state);
  const quarter = (a, b, c, d) => {
    work[a] = u32(work[a] + work[b]); work[d] = rol32(work[d] ^ work[a], 16);
    work[c] = u32(work[c] + work[d]); work[b] = rol32(work[b] ^ work[c], 12);
    work[a] = u32(work[a] + work[b]); work[d] = rol32(work[d] ^ work[a], 8);
    work[c] = u32(work[c] + work[d]); work[b] = rol32(work[b] ^ work[c], 7);
  };
  for (let round = 0; round < 10; round += 1) {
    quarter(0, 4, 8, 12); quarter(1, 5, 9, 13); quarter(2, 6, 10, 14); quarter(3, 7, 11, 15);
    quarter(0, 5, 10, 15); quarter(1, 6, 11, 12); quarter(2, 7, 8, 13); quarter(3, 4, 9, 14);
  }
  const stream = Buffer.alloc(64);
  for (let index = 0; index < 16; index += 1) stream.writeUInt32LE(u32(work[index] + state[index]), index * 4);
  const output = Buffer.from(input);
  for (let index = 0; index < output.length; index += 1) output[index] ^= stream[index];
  return output;
}

function rol64(value, shift) {
  const amount = BigInt(shift & 63);
  return amount === 0n ? u64(value) : u64((u64(value) << amount) | (u64(value) >> (64n - amount)));
}

// The v9.9 key path always passes a 32-byte seed table to this hash.
function v99Hash32(input, seed) {
  if (input.length !== 32) throw new Error('The WWE 2K26 key hash requires a 32-byte seed table.');
  const constants = [0x85ebca77c2b2ae63n, 0x165667b19e3779f9n, 0xc2b2ae3d27d4eb4fn, 0x9e3779b185ebca87n];
  const multipliers = [0x4f6cdd1dn, 0x133111ebn, 0x963ee407n, 0x6659fd93n];
  let lanes = [u64(seed + constants[0]), u64((~seed) * constants[1]), u64(seed ^ constants[2]), u64(seed * constants[3])];
  for (let index = 0; index < 4; index += 1) {
    let mixed = u64(constants[index] ^ lanes[index] ^ input.readBigUInt64LE(index * 8));
    mixed = u64(mixed + ((mixed & 0xffffffffn) * multipliers[index]));
    lanes[index] = rol64(mixed, 32);
  }
  const tail = lanes.map((value, index) => u64(constants[index] ^ value));
  let result = u64(tail[0] * 0xd6e8feb86659fd93n) ^ u64(tail[3] * 0x2545f4914f6cdd1dn) ^
    u64(tail[1] * 0xa24baed4963ee407n) ^ u64(tail[2] * 0x94d049bb133111ebn) ^ 32n ^ seed;
  result = u64((result ^ (result >> 33n)) * 0xff51afd7ed558ccdn);
  result = u64((result ^ (result >> 33n)) * 0xc4ceb9fe1a85ec53n);
  return u64(result ^ (result >> 33n));
}

function scrambleSeed(input) {
  let value = 0;
  for (const byte of input) {
    value = u32(value * 16 + byte);
    value = u32((value ^ ((value & 0xf0000000) >>> 24)) & 0x0fffffff);
  }
  return value;
}

function foldFinalKey(value) {
  const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(u64(value));
  let folded = 0;
  for (let index = 0; index < 6; index += 1) folded = u32((folded + bytes[index]) * 16);
  folded = u32(folded + bytes[6]);
  folded = u32(bytes[7] + u32((folded ^ ((folded & 0xf0000000) >>> 24)) * 16));
  folded = u32(folded ^ ((folded & 0xf0000000) >>> 24));
  folded = u32((~(folded & 0xf0000000)) & folded);
  const b0 = folded & 0xff, b1 = (folded >>> 8) & 0xff;
  const b2 = (folded >>> 16) & 0xff, b3 = (folded >>> 24) & 0xff;
  const lowFold = u32((((b0 * 16 + b1) * 16 + b2) * 16 + b3));
  return u32((~lowFold) ^ folded);
}

function deriveArchiveKeyV99(fileName, trace) {
  const note = (label, value) => { if (typeof trace === 'function') trace(label, value); };
  const name = String(fileName);
  const fnv = fnv64StringI(name);
  note('fnv', fnv);
  const random = new Sfmt19937(Number(fnv & 0xffffffffn));
  const majorCrc = crc32cByteRaw(0xffffffff, 9);
  const minorCrc = crc32cByteRaw(0xffffffff, 9);
  // The native routine hashes a fixed 32-byte ASCII seed. Hex conversion drops
  // leading zeroes, so retain the full 16 characters of the inverted FNV lane.
  const seedText = u64(~fnv).toString(16).padStart(16, '0') +
    u32(u32(~majorCrc) ^ u32(random.next() + 1)).toString(16).padStart(8, '0') +
    u32(u32(random.next() + 1) ^ minorCrc).toString(16).padStart(8, '0');
  note('seedText', seedText);
  const plain = Buffer.from(seedText, 'ascii');
  const encrypted = chacha20V99(plain);
  const initialCrc = crc32cBuffer(plain);
  const scrambled = scrambleSeed(plain);
  note('crc', initialCrc); note('scramble', scrambled);
  let rolling = u32(scrambled ^ initialCrc);
  const count = random.next() % 13 + 1;
  for (let index = 0; index < count; index += 1) {
    rolling = crc32cU64Raw(rolling, BigInt(seedText.charCodeAt(random.next() % 23)));
  }
  const combinedSeed = u64((BigInt(u32(random.next() + 1) ^ rolling) << 32n) | BigInt(rolling));
  note('seed1', combinedSeed);
  const hash1 = v99Hash32(encrypted, combinedSeed);
  note('hash1', hash1);
  const nextA = random.next();
  const nextB = random.next();
  const hash2Seed = u64(combinedSeed ^ hash1 ^ BigInt(u32(u32(~nextB) | u32(nextA << 13))));
  note('seed2', hash2Seed);
  const hash2 = v99Hash32(plain, hash2Seed);
  note('hash2', hash2);
  return foldFinalKey(u64(~hash2) ^ combinedSeed ^ hash1);
}

module.exports = { deriveArchiveKeyV99 };

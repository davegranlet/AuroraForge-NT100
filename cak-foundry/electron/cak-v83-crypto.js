'use strict';

// V8.3 FDIR cipher — ported from CakeTool C# source (CakeCryptor.cs)
// Handles WWE 2K22/2K23 CAK header decryption

// CRC32C polynomial (reversed): 0x82F63B78
const CRC32C_POLY = 0x82F63B78;
const crc32cTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (c >>> 1) ^ CRC32C_POLY : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function u32(v) { return v >>> 0; }
function u64(v) { return BigInt.asUintN(64, v); }

// ChaCha20 constants for v8.x (C# pads to 32/12 bytes with zeroes)
const CHACHA_KEY_V8 = Buffer.alloc(32, 0);
Buffer.from('r-v4WVyWOprRr7Qw9kN0myq5KCXGaaf', 'ascii').copy(CHACHA_KEY_V8);
const CHACHA_IV_V8 = Buffer.alloc(12, 0);
Buffer.from('xTKmfw_', 'ascii').copy(CHACHA_IV_V8, 4);

// CRC32C of a buffer (same as .NET BitOperations.Crc32C)
function crc32c(buf, seed = 0xFFFFFFFF) {
  let crc = seed ^ 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crc32cTable[(crc ^ buf[i]) & 0xFF];
  return crc ^ 0xFFFFFFFF;
}

// CRC32C of a buffer (same as .NET BitOperations.Crc32C)
function crc32c(buf, seed = 0xFFFFFFFF) {
  let crc = seed ^ 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crc32cTable[(crc ^ buf[i]) & 0xFF];
  return crc ^ 0xFFFFFFFF;
}

// CRC32C of a uint32 seed and 64-bit data (matches .NET BitOperations.Crc32C(uint,ulong))
function crc32cU64(seed, data) {
  let crc = seed ^ Number(data & 0xFFFFFFFFn);
  for (let i = 0; i < 4; i++) crc = (crc >>> 8) ^ crc32cTable[crc & 0xFF];
  crc = crc ^ Number((data >> 32n) & 0xFFFFFFFFn);
  for (let i = 0; i < 4; i++) crc = (crc >>> 8) ^ crc32cTable[crc & 0xFF];
  return crc >>> 0;
}

// CRC32C of a single uint32 word (initial crc provided) — matches .NET BitOperations.Crc32C(uint,uint)
function crc32cU32(seed, val) {
  let crc = seed ^ val;
  for (let i = 0; i < 4; i++) crc = (crc >>> 8) ^ crc32cTable[crc & 0xFF];
  return crc >>> 0;
}

// Read 16-bit LE from buffer
function readU16LE(buf, off) { return buf.readUInt16LE(off); }

// CRC32C of 4 bytes from buffer at offset (initial crc provided)
function crc32cWordAt(crc, buf, off) {
  const lo = buf.readUInt32LE(off);
  const hi = buf.readUInt32LE(off + 4);
  return crc32cU32(crc32cU32(crc, lo), hi);
}

// --- ChaCha20 (RFC 7539) ---
function quarterRound(state, a, b, c, d) {
  state[a] = u32(state[a] + state[b]); state[d] = u32(Math.imul(state[d] ^ state[a], 1) >>> 0);
  state[d] = ((state[d] << 16) | (state[d] >>> 16)) >>> 0;
  state[c] = u32(state[c] + state[d]); state[b] = u32(Math.imul(state[b] ^ state[c], 1) >>> 0);
  state[b] = ((state[b] << 12) | (state[b] >>> 20)) >>> 0;
  state[a] = u32(state[a] + state[b]); state[d] = u32(Math.imul(state[d] ^ state[a], 1) >>> 0);
  state[d] = ((state[d] << 8) | (state[d] >>> 24)) >>> 0;
  state[c] = u32(state[c] + state[d]); state[b] = u32(Math.imul(state[b] ^ state[c], 1) >>> 0);
  state[b] = ((state[b] << 7) | (state[b] >>> 25)) >>> 0;
}

function chacha20Block(key, counter, nonce) {
  const sigma = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];
  const state = new Uint32Array(16);
  state[0] = sigma[0]; state[1] = sigma[1]; state[2] = sigma[2]; state[3] = sigma[3];
  for (let i = 0; i < 8; i++) state[4 + i] = key.readUInt32LE(i * 4);
  state[12] = counter;
  state[13] = nonce.readUInt32LE(0); state[14] = nonce.readUInt32LE(4); state[15] = nonce.readUInt32LE(8);
  const working = new Uint32Array(state);
  for (let i = 0; i < 10; i++) {
    quarterRound(working, 0, 4, 8, 12);
    quarterRound(working, 1, 5, 9, 13);
    quarterRound(working, 2, 6, 10, 14);
    quarterRound(working, 3, 7, 11, 15);
    quarterRound(working, 0, 5, 10, 15);
    quarterRound(working, 1, 6, 11, 12);
    quarterRound(working, 2, 7, 8, 13);
    quarterRound(working, 3, 4, 9, 14);
  }
  const out = Buffer.alloc(64);
  for (let i = 0; i < 16; i++) out.writeUInt32LE(u32(working[i] + state[i]), i * 4);
  return out;
}

function chacha20Crypt(data, key, iv) {
  let blockCount = 0;
  let offset = 0;
  while (offset < data.length) {
    const block = chacha20Block(key, blockCount, iv);
    const len = Math.min(64, data.length - offset);
    for (let i = 0; i < len; i++) data[offset + i] ^= block[i];
    offset += len;
    blockCount++;
  }
}

// --- MetroHash UnkCustomV9_1 (from CakeTool MetroHash.cs) ---
function metroHashUnkCustomV9_1(key, len, seed) {
  const k0 = 0x63516654, k1 = 0x68576D5A, k2 = 0x482B4D62, k3 = 0x51655468;
  const v = [0n, 0n, 0n, 0n];
  v[0] = u64((BigInt(seed - k0 | 0) * BigInt(k3)) + BigInt(len));
  v[1] = u64((BigInt(seed + k1 | 0) * BigInt(k2)) + BigInt(len));

  let ptr = 0;
  if (len >= 32) {
    v[2] = u64((BigInt(seed + k0 | 0) * BigInt(k2)) + BigInt(len));
    v[3] = u64((BigInt(seed - k1 | 0) * BigInt(k3)) + BigInt(len));
    do {
      v[0] ^= BigInt(crc32cU64(u32(Number(v[0])), readU64LE(key, ptr))); ptr += 8;
      v[1] ^= BigInt(crc32cU64(u32(Number(v[1])), readU64LE(key, ptr))); ptr += 8;
      v[2] ^= BigInt(crc32cU64(u32(Number(v[2])), readU64LE(key, ptr))); ptr += 8;
      v[3] ^= BigInt(crc32cU64(u32(Number(v[3])), readU64LE(key, ptr))); ptr += 8;
    } while (ptr + 32 <= len);

    v[2] ^= rotateRight64(u64(u64(u64(v[0] + v[3]) * BigInt(k0)) + v[1]), 34) * BigInt(k1);
    v[3] ^= rotateRight64(u64(u64(u64(v[1] + v[2]) * BigInt(k1)) + v[0]), 37) * BigInt(k0);
    v[0] ^= rotateRight64(u64(u64(u64(v[0] + v[2]) * BigInt(k0)) + v[3]), 34) * BigInt(k1);
    v[1] ^= rotateRight64(u64(u64(u64(v[1] + v[3]) * BigInt(k1)) + v[2]), 37) * BigInt(k0);
  }
  if (ptr + 16 <= len) {
    v[0] += u64(u64(readU64LE(key, ptr)) * BigInt(k2)); ptr += 8;
    v[0] = rotateRight64(v[0], 34) * BigInt(k3);
    v[1] += u64(u64(readU64LE(key, ptr)) * BigInt(k2)); ptr += 8;
    v[1] = rotateRight64(v[1], 34) * BigInt(k3);
    v[0] ^= rotateRight64(u64(u64(v[0] * BigInt(k2)) + v[1]), 30) * BigInt(k1);
    v[1] ^= rotateRight64(u64(u64(v[1] * BigInt(k3)) + v[0]), 30) * BigInt(k0);
  }
  if (ptr + 8 <= len) {
    v[0] += u64(u64(readU64LE(key, ptr)) * BigInt(k2)); ptr += 8;
    v[0] = rotateRight64(v[0], 36) * BigInt(k3);
    v[0] ^= rotateRight64(u64(u64(v[0] * BigInt(k2)) + v[1]), 23) * BigInt(k1);
  }
  if (ptr + 4 <= len) {
    v[1] ^= BigInt(crc32cU32(u32(Number(v[0])), crc32cU32(key.readUInt32LE(ptr), key.readUInt32LE(ptr + 4)))); ptr += 4;
    v[1] ^= rotateRight64(u64(u64(v[1] * BigInt(k3)) + v[0]), 19) * BigInt(k0);
  }
  if (ptr + 2 <= len) {
    v[0] ^= BigInt(crc32cU32(u32(Number(v[1])), Number(readU16LE(key, ptr)))); ptr += 2;
    v[0] ^= rotateRight64(u64(u64(v[0] * BigInt(k2)) + v[1]), 13) * BigInt(k1);
  }
  if (ptr + 1 <= len) {
    v[1] ^= BigInt(crc32cU32(u32(Number(v[0])), key[ptr])); ptr += 1;
    v[1] ^= rotateRight64(u64(u64(v[1] * BigInt(k3)) + v[0]), 17) * BigInt(k0);
  }
  v[0] += rotateRight64(u64(u64(v[0] * BigInt(k0)) + v[1]), 11);
  v[1] += rotateRight64(u64(u64(v[1] * BigInt(k1)) + v[0]), 26);
  v[0] += rotateRight64(u64(u64(v[0] * BigInt(k0)) + v[1]), 11);
  v[1] += rotateRight64(u64(u64(v[1] * BigInt(k1)) + v[0]), 26);

  const out = Buffer.alloc(16);
  out.writeUInt32LE(u32(Number(v[0] & 0xFFFFFFFFn)), 0);
  out.writeUInt32LE(u32(Number(v[0] >> 32n)), 4);
  out.writeUInt32LE(u32(Number(v[1] & 0xFFFFFFFFn)), 8);
  out.writeUInt32LE(u32(Number(v[1] >> 32n)), 12);
  return out;
}

function readU64LE(buf, off) {
  return u64(BigInt(buf.readUInt32LE(off)) | (BigInt(buf.readUInt32LE(off + 4)) << 32n));
}
function rotateRight64(val, n) {
  n = BigInt(n);
  return u64((val >> n) | (val << (64n - n)));
}
// --- CreateInitialKeyTable (v8.2/v8.3 zigzag pattern) ---
function createInitialKeyTableV83(nameSeed, length) {
  const k = Buffer.alloc(length);
  let seedIndex = 0;
  let incDirection = 1;
  for (let i = 0; i < length; i++) {
    k[i] = nameSeed.charCodeAt(seedIndex);
    seedIndex += incDirection;
    if (seedIndex === nameSeed.length - 1 || seedIndex === 0) incDirection = -incDirection;
  }
  k[length - 1] = 0;
  return k;
}

// --- RotateCrypt (v8.3 header cipher) ---
function rotateCrypt(data, key) {
  const keyBytes = Buffer.alloc(4);
  keyBytes.writeUInt32LE(key >>> 0, 0);
  for (let i = 0; i < data.length; i++) {
    const rotated = byteRotateRight(data[i], (i - 1) ^ 5);
    data[i] = byteRotateLeft((rotated ^ (i + keyBytes[(i + 1) % 4] - 1)) & 0xFF, i + 1);
  }
}

function byteRotateRight(val, n) {
  n = ((n % 8) + 8) % 8;
  return ((val >>> n) | (val << (8 - n))) & 0xFF;
}
function byteRotateLeft(val, n) {
  n = ((n % 8) + 8) % 8;
  return ((val << n) | (val >>> (8 - n))) & 0xFF;
}

// --- Main key generation for v8.3 ---
function generateCryptoKeyV83(fileName) {
  const nameSeed = `${fileName.toLowerCase()}0803`;

  // Step 1: Create initial key table (zigzag)
  const table = createInitialKeyTableV83(nameSeed, 0x40);

  // Step 2: ChaCha20Crypt (first 0x3F bytes)
  chacha20Crypt(table.subarray(0, 0x3F), CHACHA_KEY_V8, CHACHA_IV_V8);

  // Step 3: MetroHash on first 0x3F bytes
  const metroHash = metroHashUnkCustomV9_1(table, 0x3F, 0);

  // Step 4: XOR mixing (14 rounds over uint32s)
  let seed = metroHash.readUInt32LE(0) ^ metroHash.readUInt32LE(4) ^ metroHash.readUInt32LE(8) ^ metroHash.readUInt32LE(12);
  const tableInts = [];
  for (let i = 0; i < Math.floor(0x3F / 4); i++) tableInts.push(table.readUInt32LE(i * 4));
  for (let i = 0; i < 14 && i < tableInts.length; i++) {
    tableInts[i] ^= seed;
    seed = tableInts[i];
  }

  // Step 5: Byte-level XOR mixing (bytes 52-62)
  seed = table[52];
  for (let i = 56; i < 63 && i < table.length; i++) {
    table[i] ^= seed;
    seed = table[i];
  }

  // Step 6: Second MetroHash
  const metroHash2 = metroHashUnkCustomV9_1(table, 0x3F, 0);

  // Step 7: Final key
  const key = (metroHash2.readUInt32LE(0) ^ metroHash2.readUInt32LE(4) ^ metroHash2.readUInt32LE(8) ^ metroHash2.readUInt32LE(12)) >>> 0;
  return key;
}

// --- Public API ---
function decryptHeader(catalogData, fileName) {
  const key = generateCryptoKeyV83(fileName);
  const data = Buffer.from(catalogData);
  rotateCrypt(data, key);
  return { key, data };
}

module.exports = { generateCryptoKeyV83, decryptHeader, rotateCrypt, createInitialKeyTableV83, chacha20Crypt, metroHashUnkCustomV9_1 };

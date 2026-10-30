'use strict';

const crypto = require('node:crypto');
const zlib = require('node:zlib');

const MAGIC = 0x57414354;
const INNER_MAGIC = 0x544e4943;
const VERSION = 1;
const FLAGS = 3;
const NONCE_LEN = 12;
const TAG_LEN = 16;
const MAX_UNCOMPRESSED = 256 * 1024 * 1024;

const MEMBERS = Object.freeze({
  1: 'slotJson',
  2: 'metaJson',
  3: 'attireJson',
  4: 'bodyBin',
  5: 'attireBin',
  6: 'previewBin',
  7: 'renderBin',
  8: 'extraBin',
});

const MEMBER_IDS = Object.freeze(Object.fromEntries(
  Object.entries(MEMBERS).map(([id, name]) => [name, Number(id)]),
));

const MIX_A = [2814582352, 435468333, 1846389188, 995618834, 3369225879, 1369486911, 3835460888, 797353419];
const MIX_B = [1561904036, 3085078639, 80027064, 2587781105, 1924454414, 2400994726, 3493445207, 385516227];

function deriveKey() {
  const key = Buffer.alloc(32);
  for (let index = 0; index < 8; index += 1) {
    key.writeUInt32LE((MIX_A[index] ^ MIX_B[index]) >>> 0, index * 4);
  }
  return key;
}

function memberId(value) {
  if (Number.isInteger(value) && MEMBERS[value]) return value;
  const id = MEMBER_IDS[value];
  if (!id) throw new Error(`unknown TCAW member ${value}`);
  return id;
}

function normalizeMembers(members) {
  if (!members || typeof members !== 'object') throw new Error('members must be an object');
  const entries = Object.entries(members).map(([key, value]) => {
    const id = memberId(/^\d+$/.test(key) ? Number(key) : key);
    if (value !== null && value !== undefined && !Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
      throw new Error(`TCAW member ${key} must be a Buffer`);
    }
    return [id, value ? Buffer.from(value) : Buffer.alloc(0)];
  });
  if (entries.length === 0) throw new Error('TCAW pack must contain at least one member');
  if (entries.length > 255) throw new Error('TCAW pack has too many members');
  const seen = new Set();
  for (const [id] of entries) {
    if (seen.has(id)) throw new Error(`duplicate TCAW member id ${id}`);
    seen.add(id);
  }
  return entries.sort((a, b) => a[0] - b[0]);
}

function buildInner(members) {
  const entries = normalizeMembers(members);
  const headerBytes = 6;
  const total = headerBytes + entries.reduce((sum, [id, data]) => sum + 5 + data.length, 0);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(INNER_MAGIC, 0);
  out.writeUInt16LE(entries.length, 4);
  let offset = headerBytes;
  for (const [id, data] of entries) {
    out.writeUInt8(id, offset);
    out.writeUInt32LE(data.length, offset + 1);
    data.copy(out, offset + 5);
    offset += 5 + data.length;
  }
  return { inner: out, entries };
}

function parseInner(buffer) {
  if (buffer.length < 6) throw new Error('TCAW inner container is truncated');
  if (buffer.readUInt32LE(0) !== INNER_MAGIC) throw new Error('TCAW inner magic is invalid');
  const count = buffer.readUInt16LE(4);
  const members = {};
  let offset = 6;
  for (let index = 0; index < count; index += 1) {
    if (offset + 5 > buffer.length) throw new Error('TCAW member header exceeds inner container');
    const id = buffer.readUInt8(offset);
    if (!MEMBERS[id]) throw new Error(`TCAW member id ${id} is invalid`);
    const length = buffer.readUInt32LE(offset + 1);
    offset += 5;
    if (offset + length > buffer.length) throw new Error('TCAW member payload exceeds inner container');
    members[MEMBERS[id]] = buffer.subarray(offset, offset + length);
    offset += length;
  }
  if (offset !== buffer.length) throw new Error('TCAW inner container has trailing bytes');
  return members;
}

function buildHeader(header, nameBytes, nonce, uncompressedBytes, compressedBytes) {
  const fixed = 4 + 2 + 2 + 2 + 4 + 4 + 1;
  const out = Buffer.alloc(fixed + nameBytes.length + NONCE_LEN + 8);
  out.writeUInt32LE(MAGIC, 0);
  out.writeUInt16LE(VERSION, 4);
  out.writeUInt16LE(FLAGS, 6);
  out.writeInt16LE(header.slotId ?? 0, 8);
  out.writeInt32LE(header.cawType ?? 0, 10);
  out.writeUInt32LE((header.uniqueId ?? 0) >>> 0, 14);
  out.writeUInt8(nameBytes.length, 18);
  nameBytes.copy(out, 19);
  nonce.copy(out, 19 + nameBytes.length);
  out.writeUInt32LE(uncompressedBytes, 19 + nameBytes.length + NONCE_LEN);
  out.writeUInt32LE(compressedBytes, 19 + nameBytes.length + NONCE_LEN + 4);
  return out;
}

function encode(header, members) {
  if (!header || typeof header !== 'object') throw new Error('header is required');
  const name = Buffer.from(String(header.displayName ?? ''), 'utf8');
  const nameBytes = name.length > 255 ? name.subarray(0, 255) : name;
  const { inner } = buildInner(members);
  if (inner.length > MAX_UNCOMPRESSED) throw new Error('TCAW inner payload exceeds size limit');
  const compressed = zlib.deflateSync(inner, { level: 9 });
  const nonce = crypto.randomBytes(NONCE_LEN);
  const prefix = buildHeader(header, nameBytes, nonce, inner.length, compressed.length);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), nonce);
  cipher.setAAD(prefix);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();
  if (tag.length !== TAG_LEN) throw new Error('TCAW authentication tag length is invalid');
  return Buffer.concat([prefix, ciphertext, tag]);
}

function decode(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (buffer.length < 4 + 2 + 2 + 2 + 4 + 4 + 1 + NONCE_LEN + 8 + TAG_LEN) {
    throw new Error('TCAW file is truncated');
  }
  if (buffer.readUInt32LE(0) !== MAGIC) throw new Error('TCAW magic is invalid');
  if (buffer.readUInt16LE(4) !== VERSION) throw new Error('TCAW version is unsupported');
  if (buffer.readUInt16LE(6) !== FLAGS) throw new Error('TCAW flags are unsupported');
  const slotId = buffer.readInt16LE(8);
  const cawType = buffer.readInt32LE(10);
  const uniqueId = buffer.readUInt32LE(14);
  const nameLength = buffer.readUInt8(18);
  const nameStart = 19;
  const nonceStart = nameStart + nameLength;
  if (nonceStart + NONCE_LEN + 8 + TAG_LEN > buffer.length) throw new Error('TCAW header exceeds file');
  const displayName = buffer.subarray(nameStart, nonceStart).toString('utf8');
  const nonce = buffer.subarray(nonceStart, nonceStart + NONCE_LEN);
  const uncompressedBytes = buffer.readUInt32LE(nonceStart + NONCE_LEN);
  const compressedBytes = buffer.readUInt32LE(nonceStart + NONCE_LEN + 4);
  if (uncompressedBytes === 0 || uncompressedBytes > MAX_UNCOMPRESSED) throw new Error('TCAW uncompressed size is invalid');
  const prefixLength = nonceStart + NONCE_LEN + 8;
  if (prefixLength + compressedBytes + TAG_LEN !== buffer.length) throw new Error('TCAW ciphertext length is invalid');
  const prefix = buffer.subarray(0, prefixLength);
  const ciphertext = buffer.subarray(prefixLength, prefixLength + compressedBytes);
  const tag = buffer.subarray(prefixLength + compressedBytes);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), nonce);
  decipher.setAAD(prefix);
  decipher.setAuthTag(tag);
  let compressed;
  try {
    compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('TCAW authentication failed');
  }
  let inner;
  try {
    inner = zlib.inflateSync(compressed);
  } catch {
    throw new Error('TCAW zlib payload is invalid');
  }
  if (inner.length !== uncompressedBytes) throw new Error('TCAW uncompressed size mismatch');
  const members = parseInner(inner);
  return {
    schema: 'aurora-forge-tcaw/v1',
    header: { slotId, cawType, uniqueId, displayName },
    members,
    uncompressedBytes,
    compressedBytes,
    bytes: buffer.length,
  };
}

function inspect(buffer) {
  const pack = decode(buffer);
  return {
    schema: pack.schema,
    bytes: pack.bytes,
    header: pack.header,
    uncompressedBytes: pack.uncompressedBytes,
    compressedBytes: pack.compressedBytes,
    members: Object.fromEntries(Object.entries(pack.members).map(([name, data]) => [name, data.length])),
  };
}

module.exports = {
  MAGIC,
  INNER_MAGIC,
  VERSION,
  FLAGS,
  MEMBERS,
  MEMBER_IDS,
  deriveKey,
  encode,
  decode,
  inspect,
  buildInner,
  parseInner,
};

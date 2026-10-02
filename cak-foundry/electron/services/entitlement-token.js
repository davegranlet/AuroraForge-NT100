'use strict';

const { webcrypto } = require('node:crypto');
const encoder = new TextEncoder();

function base64urlDecode(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('token has invalid base64url data');
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

function parseEntitlement(token) {
  if (typeof token !== 'string') throw new Error('entitlement token is required');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('entitlement token has invalid segment count');
  let header; let claims;
  try { header = JSON.parse(base64urlDecode(parts[0]).toString('utf8')); claims = JSON.parse(base64urlDecode(parts[1]).toString('utf8')); }
  catch { throw new Error('entitlement token JSON is invalid'); }
  if (header.alg !== 'EdDSA' || header.typ !== 'JWT') throw new Error('entitlement token algorithm is invalid');
  return { header, claims, signed: `${parts[0]}.${parts[1]}`, signature: base64urlDecode(parts[2]) };
}

function validateClaims(claims, now = Date.now()) {
  if (!claims || claims.iss !== 'aurora-entitlements' || typeof claims.sub !== 'string' || typeof claims.device_hash !== 'string') throw new Error('entitlement claims are invalid');
  if (!Number.isSafeInteger(claims.exp) || claims.exp <= now) throw new Error('entitlement has expired');
  if (!Array.isArray(claims.releases) || claims.releases.some(item => typeof item !== 'string')) throw new Error('entitlement releases are invalid');
  return claims;
}

async function verifyEntitlement(token, publicJwk, now = Date.now()) {
  if (!publicJwk || typeof publicJwk !== 'object') throw new Error('public entitlement key is required');
  const parsed = parseEntitlement(token);
  const key = await webcrypto.subtle.importKey('jwk', publicJwk, { name: 'Ed25519' }, false, ['verify']);
  const valid = await webcrypto.subtle.verify({ name: 'Ed25519' }, key, parsed.signature, encoder.encode(parsed.signed));
  if (!valid) throw new Error('entitlement signature is invalid');
  return validateClaims(parsed.claims, now);
}

function allowsRelease(claims, release) {
  return Array.isArray(claims?.releases) && claims.releases.includes(release);
}

module.exports = { parseEntitlement, validateClaims, verifyEntitlement, allowsRelease };

'use strict';

const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const test = require('node:test');
const { verifyEntitlement, allowsRelease } = require('./entitlement-token');

function base64url(bytes) { return Buffer.from(bytes).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, ''); }

async function signedToken(privateKey, claims) {
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })));
  const payload = base64url(Buffer.from(JSON.stringify(claims)));
  const signed = `${header}.${payload}`;
  const signature = await webcrypto.subtle.sign({ name: 'Ed25519' }, privateKey, Buffer.from(signed));
  return `${signed}.${base64url(signature)}`;
}

test('verifies a signed current entitlement and release access', async () => {
  const pair = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const now = Date.now();
  const token = await signedToken(pair.privateKey, { iss: 'aurora-entitlements', sub: 'license-1', device_hash: 'a'.repeat(64), releases: ['cak-foundry'], exp: now + 60_000 });
  const claims = await verifyEntitlement(token, await webcrypto.subtle.exportKey('jwk', pair.publicKey), now);
  assert.equal(allowsRelease(claims, 'cak-foundry'), true);
  assert.equal(allowsRelease(claims, 'other-tool'), false);
});

test('rejects expired and modified tokens', async () => {
  const pair = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const publicJwk = await webcrypto.subtle.exportKey('jwk', pair.publicKey); const now = Date.now();
  const expired = await signedToken(pair.privateKey, { iss: 'aurora-entitlements', sub: 'license-1', device_hash: 'a'.repeat(64), releases: ['cak-foundry'], exp: now - 1 });
  await assert.rejects(() => verifyEntitlement(expired, publicJwk, now), /expired/);
  const valid = await signedToken(pair.privateKey, { iss: 'aurora-entitlements', sub: 'license-1', device_hash: 'a'.repeat(64), releases: ['cak-foundry'], exp: now + 60_000 });
  await assert.rejects(() => verifyEntitlement(`${valid}x`, publicJwk, now), /invalid/);
});

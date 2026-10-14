import assert from 'node:assert/strict';
import test from 'node:test';
import { parseActivation, parseIssue, signEntitlement } from '../shared.mjs';

test('accepts a constrained activation request', () => {
  const result = parseActivation({ license_key: 'AF-abcdefghijklmnopqrstuvwx', device_hash: 'a'.repeat(64) });
  assert.equal(result.deviceHash, 'a'.repeat(64));
});

test('rejects a raw device identifier', () => {
  assert.throws(() => parseActivation({ license_key: 'AF-abcdefghijklmnopqrstuvwx', device_hash: 'DESKTOP-ALICE' }), /device_hash/);
});

test('accepts bounded manual issue input', () => {
  const result = parseIssue({ subscriber_id: 'patreon-123', tier: 'early-access', releases: ['cak-foundry', 'animation-bridge'], expires_at: Date.now() + 60_000, max_devices: 2 });
  assert.equal(result.maxDevices, 2);
});

test('rejects unsafe release identifiers and excessive device limits', () => {
  assert.throws(() => parseIssue({ subscriber_id: 'abc', tier: 'tier', releases: ['../all'], expires_at: Date.now() + 60_000, max_devices: 1 }), /releases/);
  assert.throws(() => parseIssue({ subscriber_id: 'abc', tier: 'tier', releases: ['cak-foundry'], expires_at: Date.now() + 60_000, max_devices: 6 }), /max_devices/);
});

test('signs an entitlement with an ephemeral Ed25519 key', async () => {
  const keys = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const privateJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', keys.privateKey));
  const token = await signEntitlement({ sub: 'license-1', exp: Date.now() + 60_000 }, privateJwk);
  const [header, payload, signature] = token.split('.');
  assert.equal(token.split('.').length, 3);
  const decode = value => Uint8Array.from(Buffer.from(value.replaceAll('-', '+').replaceAll('_', '/'), 'base64'));
  assert.equal(await crypto.subtle.verify({ name: 'Ed25519' }, keys.publicKey, decode(signature), new TextEncoder().encode(`${header}.${payload}`)), true);
});

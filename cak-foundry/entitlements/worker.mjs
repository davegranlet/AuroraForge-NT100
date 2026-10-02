import { newLicenseKey, parseActivation, parseIssue, sha256Hex, signEntitlement } from './shared.mjs';

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const failure = (message, status = 400) => json({ error: message }, status);

async function body(request) {
  try { return await request.json(); } catch { throw new Error('request body must be valid JSON'); }
}

function admin(request, env) {
  const supplied = request.headers.get('authorization');
  if (!env.ADMIN_TOKEN || supplied !== `Bearer ${env.ADMIN_TOKEN}`) throw new Error('administrator authorization failed');
}

function active(row, now) {
  return row && !row.revoked_at && row.expires_at > now;
}

async function issueToken(row, deviceHash, env, now) {
  const tokenExpiry = Math.min(row.expires_at, now + 7 * 24 * 60 * 60 * 1000);
  return signEntitlement({ iss: 'aurora-entitlements', sub: row.license_id, tier: row.tier, releases: JSON.parse(row.releases_json), device_hash: deviceHash, iat: now, exp: tokenExpiry }, env.ENTITLEMENT_PRIVATE_KEY_JWK);
}

async function activate(request, env) {
  const { licenseKey, deviceHash } = parseActivation(await body(request));
  const row = await env.DB.prepare('SELECT * FROM licenses WHERE key_hash = ?').bind(await sha256Hex(licenseKey)).first();
  const now = Date.now();
  if (!active(row, now)) return failure('license is inactive, expired, or revoked', 403);
  const existing = await env.DB.prepare('SELECT device_hash FROM devices WHERE license_id = ? AND device_hash = ?').bind(row.license_id, deviceHash).first();
  if (!existing) {
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM devices WHERE license_id = ?').bind(row.license_id).first();
    if (count.count >= row.max_devices) return failure('device activation limit reached', 403);
    await env.DB.prepare('INSERT INTO devices (license_id, device_hash, first_activated_at, last_validated_at) VALUES (?, ?, ?, ?)').bind(row.license_id, deviceHash, now, now).run();
  } else {
    await env.DB.prepare('UPDATE devices SET last_validated_at = ? WHERE license_id = ? AND device_hash = ?').bind(now, row.license_id, deviceHash).run();
  }
  return json({ entitlement: await issueToken(row, deviceHash, env, now), expires_at: Math.min(row.expires_at, now + 7 * 24 * 60 * 60 * 1000) });
}

async function createLicense(request, env) {
  admin(request, env);
  const input = parseIssue(await body(request)); const now = Date.now(); const licenseKey = newLicenseKey(); const licenseId = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO licenses (license_id, key_hash, subscriber_id, tier, releases_json, expires_at, max_devices, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(licenseId, await sha256Hex(licenseKey), input.subscriberId, input.tier, JSON.stringify(input.releases), input.expiresAt, input.maxDevices, now).run();
  return json({ license_id: licenseId, license_key: licenseKey, expires_at: input.expiresAt, max_devices: input.maxDevices }, 201);
}

async function revoke(request, env) {
  admin(request, env); const { license_id: licenseId } = await body(request);
  if (typeof licenseId !== 'string' || !/^[0-9a-f-]{36}$/iu.test(licenseId)) return failure('license_id is invalid');
  await env.DB.prepare('UPDATE licenses SET revoked_at = ? WHERE license_id = ?').bind(Date.now(), licenseId).run();
  return json({ revoked: true });
}

export default {
  async fetch(request, env) {
    if (!env.DB || !env.ENTITLEMENT_PRIVATE_KEY_JWK || !env.ENTITLEMENT_PUBLIC_KEY_JWK) return failure('service is not configured', 503);
    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true });
      if (request.method === 'GET' && url.pathname === '/v1/public-key') return json(JSON.parse(env.ENTITLEMENT_PUBLIC_KEY_JWK), 200);
      if (request.method === 'POST' && url.pathname === '/v1/activate') return activate(request, env);
      if (request.method === 'POST' && url.pathname === '/v1/admin/licenses') return createLicense(request, env);
      if (request.method === 'POST' && url.pathname === '/v1/admin/revoke') return revoke(request, env);
      return failure('not found', 404);
    } catch (error) { return failure(error.message || 'request failed', error.message === 'administrator authorization failed' ? 401 : 400); }
  },
};

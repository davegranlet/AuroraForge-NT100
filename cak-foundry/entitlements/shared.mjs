const encoder = new TextEncoder();

export function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function parseDeviceHash(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/iu.test(value)) throw new Error('device_hash must be a SHA-256 hex digest');
  return value.toLowerCase();
}

export function parseActivation(body) {
  if (!body || typeof body !== 'object') throw new Error('JSON body is required');
  if (typeof body.license_key !== 'string' || !/^AF-[A-Za-z0-9_-]{20,128}$/u.test(body.license_key)) throw new Error('license_key is invalid');
  return { licenseKey: body.license_key, deviceHash: parseDeviceHash(body.device_hash) };
}

export function parseIssue(body) {
  if (!body || typeof body !== 'object') throw new Error('JSON body is required');
  if (typeof body.subscriber_id !== 'string' || body.subscriber_id.length < 3 || body.subscriber_id.length > 128) throw new Error('subscriber_id is invalid');
  if (typeof body.tier !== 'string' || body.tier.length < 1 || body.tier.length > 64) throw new Error('tier is invalid');
  if (!Array.isArray(body.releases) || body.releases.length < 1 || body.releases.length > 32 || body.releases.some(item => typeof item !== 'string' || !/^[a-z0-9._-]{1,96}$/iu.test(item))) throw new Error('releases is invalid');
  if (!Number.isSafeInteger(body.expires_at) || body.expires_at <= Date.now()) throw new Error('expires_at must be a future Unix timestamp in milliseconds');
  if (!Number.isInteger(body.max_devices) || body.max_devices < 1 || body.max_devices > 5) throw new Error('max_devices must be between 1 and 5');
  return { subscriberId: body.subscriber_id, tier: body.tier, releases: body.releases, expiresAt: body.expires_at, maxDevices: body.max_devices };
}

export function newLicenseKey() {
  const random = new Uint8Array(24); crypto.getRandomValues(random);
  return `AF-${base64url(random)}`;
}

export async function signEntitlement(claims, privateJwk) {
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })));
  const payload = base64url(encoder.encode(JSON.stringify(claims)));
  const key = await crypto.subtle.importKey('jwk', JSON.parse(privateJwk), { name: 'Ed25519' }, false, ['sign']);
  const signed = `${header}.${payload}`;
  const signature = await crypto.subtle.sign({ name: 'Ed25519' }, key, encoder.encode(signed));
  return `${signed}.${base64url(new Uint8Array(signature))}`;
}

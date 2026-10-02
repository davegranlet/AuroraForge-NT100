'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const DEFAULT_VERIFY_URL = 'https://aurora-patreon-verifier.rd741904.chatgpt.site/api/verify';
const REMOTE_SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Per-release challenge: a fresh random value generated for every release.
// The hosted verifier echoes it back and stored sessions are bound to it, so a
// session or crack for one release does not unlock the next one.
function currentReleaseChallenge() {
  const candidates = [
    path.join(__dirname, '..', '..', 'config', 'release-challenge.json'),
    path.join(__dirname, '..', 'config', 'release-challenge.json'),
  ];
  for (const candidate of candidates) {
    try {
      const record = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      const value = String((record && record.challenge) || '');
      if (/^[0-9a-f]{64}$/i.test(value)) return value;
    } catch (_error) { /* keep looking */ }
  }
  return '';
}
const ALLOWED_REMOTE_ENTITLEMENT_METHODS = new Set([
  'oauth_user_id',
  'oauth_member_id',
  'campaign_member',
  'currently_entitled_tiers',
  'discord_guild_role',
  'patreon_discord_role',
  'signed_campaign_member',
]);

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// Stable, non-reversible device identifier sent only to the hosted verifier.
// It lets a revoked account be blocked by machine as well as by email, so a
// brand-new Patreon account on the same PC is still refused. This is abuse
// correlation, not perfect hardware enforcement: it can be spoofed, so it is
// never the only signal the verifier uses.
function readWindowsMachineGuid() {
  try {
    const output = execFileSync(
      'reg',
      ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
      { encoding: 'utf8', windowsHide: true, timeout: 5000 },
    );
    const match = output.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]{16,})/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function readWindowsUserSid() {
  try {
    const output = execFileSync('whoami', ['/user'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    const match = output.match(/S-1-[0-9-]{8,}/);
    return match ? match[0] : '';
  } catch {
    return '';
  }
}

function computeMachineId(overrides = {}) {
  const parts = [
    overrides.machineGuid ?? readWindowsMachineGuid(),
    overrides.userSid ?? readWindowsUserSid(),
    overrides.hostname ?? os.hostname(),
    overrides.platform ?? process.platform,
    overrides.arch ?? process.arch,
  ].map(value => String(value ?? '').trim());
  return crypto.createHash('sha256').update(parts.join('\u0000'), 'utf8').digest('hex');
}

function readConfig(env = process.env) {
  const accessToken = env.AURORA_PATREON_ACCESS_TOKEN;
  const campaignId = env.AURORA_PATREON_CAMPAIGN_ID;
  const allowedTierIds = splitCsv(env.AURORA_PATREON_ALLOWED_TIER_IDS);
  const directConfigured = Boolean(accessToken && campaignId && allowedTierIds.length);
  const defaultVerifyUrl = env.AURORA_PATREON_DISABLE_DEFAULT_VERIFY_URL ? '' : DEFAULT_VERIFY_URL;
  const verifyUrl = String(env.AURORA_PATREON_VERIFY_URL || (directConfigured ? '' : defaultVerifyUrl) || '').trim();
  return { accessToken, campaignId, allowedTierIds, verifyUrl };
}

function oauthBaseUrl(verifyUrl) {
  const url = new URL(verifyUrl);
  url.pathname = url.pathname.replace(/\/api\/verify$/, '/api/oauth');
  url.search = '';
  url.hash = '';
  return url;
}

function buildOAuthStartUrl({ verifyUrl, redirectUri, state, releaseChallenge }) {
  if (!verifyUrl) throw new Error('Patreon verifier URL is required for OAuth login.');
  if (!redirectUri) throw new Error('OAuth redirect URI is required.');
  if (!state) throw new Error('OAuth state is required.');
  const url = oauthBaseUrl(verifyUrl);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/start`;
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  const challenge = releaseChallenge || currentReleaseChallenge();
  if (challenge) url.searchParams.set('release_challenge', challenge);
  return url.toString();
}

function configStatus(env = process.env) {
  const config = readConfig(env);
  if (config.verifyUrl) {
    return {
      configured: true,
      mode: 'remote',
      missing: [],
      verifyUrl: config.verifyUrl,
      allowedTierIds: config.allowedTierIds,
      campaignId: config.campaignId || null,
    };
  }
  const missing = [];
  if (!config.accessToken) missing.push('AURORA_PATREON_ACCESS_TOKEN');
  if (!config.campaignId) missing.push('AURORA_PATREON_CAMPAIGN_ID');
  if (!config.allowedTierIds.length) missing.push('AURORA_PATREON_ALLOWED_TIER_IDS');
  return {
    configured: missing.length === 0,
    mode: 'direct',
    missing,
    verifyUrl: null,
    allowedTierIds: config.allowedTierIds,
    campaignId: config.campaignId || null,
  };
}

function tierIdFromLink(link) {
  const match = String(link || '').match(/\/tiers\/([^/]+)$/);
  return match ? match[1] : null;
}

function memberEmail(member, includedById) {
  const direct = normalizeEmail(member.attributes?.email);
  if (direct) return direct;
  const userId = member.relationships?.user?.data?.id;
  return normalizeEmail(includedById.get(userId)?.attributes?.email);
}

function memberUserId(member) {
  return member.relationships?.user?.data?.id || null;
}

function memberTierIds(member) {
  return (member.relationships?.currently_entitled_tiers?.data || [])
    .map(tier => tier.id)
    .filter(Boolean);
}

function indexIncluded(included = []) {
  return new Map(included.map(item => [item.id, item]));
}

function memberResult(member, includedById, allowedTierIds) {
  const entitledTierIds = memberTierIds(member);
  const allowed = entitledTierIds.filter(id => allowedTierIds.includes(id));
  const entitledTierTitles = entitledTierIds.map(id => ({
    id,
    title: includedById.get(id)?.attributes?.title || null,
  }));
  return {
    ok: member.attributes?.patron_status === 'active_patron' && allowed.length > 0,
    patronStatus: member.attributes?.patron_status || null,
    entitledTierIds,
    allowedTierIds: allowed,
    entitledTierTitles,
  };
}

async function patreonRequest(url, accessToken, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('No fetch implementation available');
  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      throw new Error(`Patreon returned non-JSON response (${response.status})`);
    }
  }
  if (!response.ok) {
    const detail = body?.errors?.[0]?.detail || body?.errors?.[0]?.title || response.statusText;
    throw new Error(`Patreon API request failed (${response.status}): ${detail}`);
  }
  return body || {};
}

async function remoteVerify(email, verifyUrl, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('No fetch implementation available');
  const response = await fetchImpl(verifyUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  return parseVerifierResponse(response);
}

async function remoteOAuthVerify({ verifyUrl, code, redirectUri, state, machineId, appVersion }, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('No fetch implementation available');
  const url = oauthBaseUrl(verifyUrl);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/verify`;
  let payload = { code, redirect_uri: redirectUri, state };
  if (machineId) payload.machine_id = machineId;
  if (appVersion) payload.app_version = String(appVersion).slice(0, 32);
  const releaseChallenge = currentReleaseChallenge();
  if (releaseChallenge) payload.release_challenge = releaseChallenge;
  const response = await fetchImpl(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return parseVerifierResponse(response);
}

async function parseVerifierResponse(response) {
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      throw new Error(`Patreon verifier returned non-JSON response (${response.status})`);
    }
  }
  // A revoked account is a terminal state, not a transient error. It is
  // returned instead of thrown so callers can lock the app and must never
  // fall back to a cached session.
  if (response.status === 403 && body?.code === 'banned') {
    return {
      ok: false,
      code: 'banned',
      terminal: true,
      reason: body?.reason || 'Access to Aurora Forge has been revoked for this account.',
      patronStatus: body?.patronStatus || null,
    };
  }
  if (!response.ok) {
    const detail = body?.reason || body?.error || response.statusText;
    throw new Error(`Patreon verifier failed (${response.status}): ${detail}`);
  }
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'empty_response', reason: 'Patreon verifier returned an empty response.' };
  }
  const allowedTierIds = Array.isArray(body.allowedTierIds) ? body.allowedTierIds.filter(Boolean) : [];
  const allowedRoleIds = Array.isArray(body.allowedRoleIds) ? body.allowedRoleIds.filter(Boolean) : [];
  const discordRoleIds = Array.isArray(body.discordRoleIds) ? body.discordRoleIds.filter(Boolean) : [];
  const entitlementMethod = body.entitlementMethod || null;
  const issuedAt = body.issuedAt || body.verifiedAt || null;
  const expiresAt = body.expiresAt || null;
  const hardeningErrors = [];
  if (body.ok) {
    const patreonProof = body.patronStatus === 'active_patron' && allowedTierIds.length > 0;
    const discordProof = (entitlementMethod === 'discord_guild_role' || entitlementMethod === 'patreon_discord_role') &&
      body.guildId &&
      body.discordUserId &&
      allowedRoleIds.length > 0 &&
      discordRoleIds.some(roleId => allowedRoleIds.includes(roleId));
    if (!patreonProof) hardeningErrors.push('Patreon active tier proof');
    if (!discordProof) hardeningErrors.push('linked Discord VIP role proof');
    if (entitlementMethod !== 'patreon_discord_role') hardeningErrors.push('two-tier Patreon plus Discord entitlement method');
    if (!ALLOWED_REMOTE_ENTITLEMENT_METHODS.has(entitlementMethod)) hardeningErrors.push('recognized entitlement method');
    if (expiresAt && Number.isNaN(Date.parse(expiresAt))) hardeningErrors.push('valid expiration timestamp');
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) hardeningErrors.push('unexpired session');
    if (issuedAt && Number.isNaN(Date.parse(issuedAt))) hardeningErrors.push('valid issue timestamp');
    if (issuedAt && Date.now() - Date.parse(issuedAt) > REMOTE_SESSION_MAX_AGE_MS) hardeningErrors.push('fresh verifier session');
    const expectedChallenge = currentReleaseChallenge();
    if (expectedChallenge) {
      const strict = process.env.AURORA_PATREON_REQUIRE_CHALLENGE === '1';
      if (body.releaseChallenge ? String(body.releaseChallenge) !== expectedChallenge : strict) hardeningErrors.push('release challenge match');
    }
  }
  const hardenedOk = Boolean(body.ok) && hardeningErrors.length === 0;
  return {
    ok: hardenedOk,
    code: hardenedOk ? (body.code || 'verified') : (body.code || 'weak_verifier_response'),
    reason: hardenedOk
      ? (body.reason || 'Patreon tier access verified.')
      : (body.ok
          ? `Patreon verifier response was not strong enough to unlock Beta access; missing ${hardeningErrors.join(', ')}.`
          : (body.reason || 'Patreon verification returned an unrecognized response.')),
    patronStatus: body.patronStatus || null,
    allowedTierIds,
    allowedRoleIds,
    discordRoleIds,
    entitlementMethod,
    displayName: body.displayName || null,
    memberId: body.memberId || null,
    userId: body.userId || null,
    discordUserId: body.discordUserId || null,
    guildId: body.guildId || null,
    campaignId: body.campaignId || null,
    issuedAt,
    expiresAt,
    verifier: body.verifier || null,
    releaseChallenge: body.releaseChallenge || null,
    signed: Boolean(body.signed || body.signature),
  };
}

function membersUrl(campaignId) {
  const url = new URL(`https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members`);
  url.searchParams.set('include', 'currently_entitled_tiers,user');
  url.searchParams.set('fields[member]', 'patron_status,full_name,email');
  url.searchParams.set('fields[tier]', 'title');
  url.searchParams.set('fields[user]', 'email,full_name');
  url.searchParams.set('page[size]', '100');
  return url.toString();
}

async function verifyPatreonAccess(identity, options = {}) {
  const email = normalizeEmail(identity);
  if (!email) return { ok: false, reason: 'Enter the Patreon account email to verify access.' };

  const env = options.env || process.env;
  const config = readConfig(env);
  if (config.verifyUrl) return remoteVerify(email, config.verifyUrl, options.fetchImpl);

  const status = configStatus(env);
  if (!status.configured) {
    return {
      ok: false,
      reason: `Patreon access gate is not configured. Missing: ${status.missing.join(', ')}.`,
      missing: status.missing,
    };
  }

  let nextUrl = membersUrl(config.campaignId);
  while (nextUrl) {
    const page = await patreonRequest(nextUrl, config.accessToken, options.fetchImpl);
    const includedById = indexIncluded(page.included);
    for (const member of page.data || []) {
      if (memberEmail(member, includedById) !== email) continue;
      const result = memberResult(member, includedById, config.allowedTierIds);
      return result.ok
        ? { ok: true, reason: 'Patreon tier access verified.', ...result }
        : { ok: false, reason: 'Patreon account is not active on an allowed tier.', ...result };
    }
    nextUrl = page.links?.next || null;
  }

  return { ok: false, reason: 'No Patreon member with that email was found for this campaign.' };
}

module.exports = {
  ALLOWED_REMOTE_ENTITLEMENT_METHODS,
  buildOAuthStartUrl,
  computeMachineId,
  configStatus,
  currentReleaseChallenge,
  DEFAULT_VERIFY_URL,
  memberResult,
  normalizeEmail,
  REMOTE_SESSION_MAX_AGE_MS,
  readConfig,
  remoteOAuthVerify,
  verifyPatreonAccess,
};

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildOAuthStartUrl, computeMachineId, configStatus, normalizeEmail, remoteOAuthVerify, verifyPatreonAccess } = require('./patreon-access');

function response(body, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Bad Request',
    text: async () => JSON.stringify(body),
  };
}

const env = {
  AURORA_PATREON_ACCESS_TOKEN: 'token',
  AURORA_PATREON_CAMPAIGN_ID: 'campaign',
  AURORA_PATREON_ALLOWED_TIER_IDS: 'tier_allowed,tier_plus',
};

test('reports missing direct Patreon configuration without touching the network when defaults are disabled', () => {
  assert.deepEqual(configStatus({ AURORA_PATREON_DISABLE_DEFAULT_VERIFY_URL: '1' }), {
    configured: false,
    missing: [
      'AURORA_PATREON_ACCESS_TOKEN',
      'AURORA_PATREON_CAMPAIGN_ID',
      'AURORA_PATREON_ALLOWED_TIER_IDS',
    ],
    mode: 'direct',
    verifyUrl: null,
    allowedTierIds: [],
    campaignId: null,
  });
});

test('reports remote verifier configuration without requiring creator secrets locally', () => {
  assert.deepEqual(configStatus({ AURORA_PATREON_VERIFY_URL: 'https://verify.example/api/verify' }), {
    configured: true,
    mode: 'remote',
    missing: [],
    verifyUrl: 'https://verify.example/api/verify',
    allowedTierIds: [],
    campaignId: null,
  });
});

test('normalizes patron identity emails', () => {
  assert.equal(normalizeEmail('  USER@Example.COM  '), 'user@example.com');
});

test('builds remote OAuth start URL from verifier URL', () => {
  const url = buildOAuthStartUrl({
    verifyUrl: 'https://verify.example/api/verify',
    redirectUri: 'http://127.0.0.1:123/callback',
    state: 'abc',
  });
  assert.equal(url, 'https://verify.example/api/oauth/start?redirect_uri=http%3A%2F%2F127.0.0.1%3A123%2Fcallback&state=abc');
});

test('allows an active patron on an allowed tier', async () => {
  const result = await verifyPatreonAccess('USER@example.com', {
    env,
    fetchImpl: async () => response({
      data: [{
        id: 'member_1',
        attributes: { patron_status: 'active_patron' },
        relationships: {
          user: { data: { id: 'user_1', type: 'user' } },
          currently_entitled_tiers: { data: [{ id: 'tier_allowed', type: 'tier' }] },
        },
      }],
      included: [
        { id: 'user_1', type: 'user', attributes: { email: 'user@example.com' } },
        { id: 'tier_allowed', type: 'tier', attributes: { title: 'Converter Tier' } },
      ],
    }),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.allowedTierIds, ['tier_allowed']);
});

test('uses the remote verifier when a verifier URL is configured', async () => {
  const calls = [];
  const result = await verifyPatreonAccess(' USER@example.com ', {
    env: { AURORA_PATREON_VERIFY_URL: 'https://verify.example/api/verify' },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response({
        ok: true,
        code: 'verified',
        reason: 'Patreon tier access verified.',
        patronStatus: 'active_patron',
        allowedTierIds: ['tier_allowed'],
        entitlementMethod: 'patreon_discord_role',
        guildId: 'guild_1',
        discordUserId: 'discord_user_1',
        allowedRoleIds: ['vip_role'],
        discordRoleIds: ['member_role', 'vip_role'],
        issuedAt: new Date().toISOString(),
      });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, 'verified');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://verify.example/api/verify');
  assert.equal(JSON.parse(calls[0].init.body).email, 'user@example.com');
});

test('surfaces remote verifier failures', async () => {
  await assert.rejects(
    () => verifyPatreonAccess('user@example.com', {
      env: { AURORA_PATREON_VERIFY_URL: 'https://verify.example/api/verify' },
      fetchImpl: async () => response({ ok: false, code: 'api_error', reason: 'Verifier offline' }, false, 503),
    }),
    /Verifier offline/,
  );
});

test('rejects active patrons outside the configured tier list', async () => {
  const result = await verifyPatreonAccess('user@example.com', {
    env,
    fetchImpl: async () => response({
      data: [{
        id: 'member_1',
        attributes: { patron_status: 'active_patron', email: 'user@example.com' },
        relationships: {
          currently_entitled_tiers: { data: [{ id: 'tier_low', type: 'tier' }] },
        },
      }],
      included: [{ id: 'tier_low', type: 'tier', attributes: { title: 'Lower Tier' } }],
    }),
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /not active on an allowed tier/);
});

test('passes through verifier reason codes for clearer client messaging', async () => {
  const result = await verifyPatreonAccess('user@example.com', {
    env: { AURORA_PATREON_VERIFY_URL: 'https://verify.example/api/verify' },
    fetchImpl: async () => response({ ok: false, code: 'tier_not_allowed', reason: 'Patreon account is active, but not on an allowed tier.' }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'tier_not_allowed');
  assert.match(result.reason, /not on an allowed tier/);
});

test('rejects weak remote verifier success without active tier proof', async () => {
  const result = await verifyPatreonAccess('user@example.com', {
    env: { AURORA_PATREON_VERIFY_URL: 'https://verify.example/api/verify' },
    fetchImpl: async () => response({ ok: true, code: 'verified', reason: 'Legacy success only.' }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'verified');
  assert.match(result.reason, /not strong enough/);
  assert.match(result.reason, /Patreon active tier proof/);
  assert.match(result.reason, /linked Discord VIP role proof/);
});

test('rejects expired remote verifier sessions', async () => {
  const result = await verifyPatreonAccess('user@example.com', {
    env: { AURORA_PATREON_VERIFY_URL: 'https://verify.example/api/verify' },
    fetchImpl: async () => response({
      ok: true,
      patronStatus: 'active_patron',
      allowedTierIds: ['tier_allowed'],
      entitlementMethod: 'patreon_discord_role',
      guildId: 'guild_1',
      discordUserId: 'discord_user_1',
      allowedRoleIds: ['vip_role'],
      discordRoleIds: ['member_role', 'vip_role'],
      expiresAt: '2020-01-01T00:00:00.000Z',
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'weak_verifier_response');
  assert.match(result.reason, /unexpired session/);
});

test('rejects Discord-only verifier success without Patreon tier proof', async () => {
  const result = await verifyPatreonAccess('user@example.com', {
    env: { AURORA_PATREON_VERIFY_URL: 'https://verify.example/api/verify' },
    fetchImpl: async () => response({
      ok: true,
      entitlementMethod: 'discord_guild_role',
      guildId: 'guild_1',
      discordUserId: 'discord_user_1',
      allowedRoleIds: ['vip_role'],
      discordRoleIds: ['member_role', 'vip_role'],
      issuedAt: new Date().toISOString(),
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'weak_verifier_response');
  assert.match(result.reason, /Patreon active tier proof/);
  assert.match(result.reason, /two-tier Patreon plus Discord entitlement method/);
});

test('rejects Discord verifier success when the VIP role is absent', async () => {
  const result = await verifyPatreonAccess('user@example.com', {
    env: { AURORA_PATREON_VERIFY_URL: 'https://verify.example/api/verify' },
    fetchImpl: async () => response({
      ok: true,
      entitlementMethod: 'discord_guild_role',
      guildId: 'guild_1',
      discordUserId: 'discord_user_1',
      allowedRoleIds: ['vip_role'],
      discordRoleIds: ['member_role'],
      issuedAt: new Date().toISOString(),
    }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'weak_verifier_response');
  assert.match(result.reason, /linked Discord VIP role proof/);
});

test('rejects Discord role proof without a guild member identity', async () => {
  const result = await verifyPatreonAccess('user@example.com', {
    env: { AURORA_PATREON_VERIFY_URL: 'https://verify.example/api/verify' },
    fetchImpl: async () => response({
      ok: true,
      entitlementMethod: 'discord_guild_role',
      allowedRoleIds: ['vip_role'],
      discordRoleIds: ['vip_role'],
      issuedAt: new Date().toISOString(),
    }),
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /linked Discord VIP role proof/);
});

test('follows Patreon pagination until the requested patron is found', async () => {
  const urls = [];
  const result = await verifyPatreonAccess('user@example.com', {
    env,
    fetchImpl: async url => {
      urls.push(url);
      if (urls.length === 1) return response({ data: [], links: { next: 'https://next.example/page2' } });
      return response({
        data: [{
          id: 'member_2',
          attributes: { patron_status: 'active_patron', email: 'user@example.com' },
          relationships: {
            currently_entitled_tiers: { data: [{ id: 'tier_plus', type: 'tier' }] },
          },
        }],
      });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(urls.length, 2);
});

test('posts OAuth code to remote verifier endpoint', async () => {
  const calls = [];
  const result = await remoteOAuthVerify({
    verifyUrl: 'https://verify.example/api/verify',
    code: 'code_1',
    redirectUri: 'http://127.0.0.1:123/callback',
    state: 'state_1',
  }, async (url, init) => {
    calls.push({ url, init });
    return response({
      ok: true,
      code: 'verified',
      reason: 'Patreon account verified.',
      patronStatus: 'active_patron',
      allowedTierIds: ['tier_allowed'],
      entitlementMethod: 'patreon_discord_role',
      guildId: 'guild_1',
      discordUserId: 'discord_user_1',
      allowedRoleIds: ['vip_role'],
      discordRoleIds: ['member_role', 'vip_role'],
      issuedAt: new Date().toISOString(),
    });
  });
  assert.equal(result.ok, true);
  assert.equal(result.entitlementMethod, 'patreon_discord_role');
  assert.equal(calls[0].url, 'https://verify.example/api/oauth/verify');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    code: 'code_1',
    redirect_uri: 'http://127.0.0.1:123/callback',
    state: 'state_1',
  });
});

test('sends the device identifier and app version with the OAuth exchange', async () => {
  const calls = [];
  const result = await remoteOAuthVerify({
    verifyUrl: 'https://verify.example/api/verify',
    code: 'code_2',
    redirectUri: 'http://127.0.0.1:123/callback',
    state: 'state_2',
    machineId: 'a'.repeat(64),
    appVersion: '1.2.3',
  }, async (url, init) => {
    calls.push({ url, init });
    return response({
      ok: true,
      code: 'verified',
      patronStatus: 'active_patron',
      allowedTierIds: ['tier_allowed'],
      entitlementMethod: 'patreon_discord_role',
      guildId: 'guild_1',
      discordUserId: 'discord_user_1',
      allowedRoleIds: ['vip_role'],
      discordRoleIds: ['member_role', 'vip_role'],
      issuedAt: new Date().toISOString(),
    });
  });
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    code: 'code_2',
    redirect_uri: 'http://127.0.0.1:123/callback',
    state: 'state_2',
    machine_id: 'a'.repeat(64),
    app_version: '1.2.3',
  });
});

test('treats a banned verifier response as terminal instead of throwing', async () => {
  const result = await remoteOAuthVerify({
    verifyUrl: 'https://verify.example/api/verify',
    code: 'code_3',
    redirectUri: 'http://127.0.0.1:123/callback',
    state: 'state_3',
  }, async () => response({
    ok: false,
    code: 'banned',
    reason: 'Access to Aurora Forge has been revoked for this account.',
  }, false, 403));
  assert.equal(result.ok, false);
  assert.equal(result.code, 'banned');
  assert.equal(result.terminal, true);
});

test('computes a stable machine identifier from injected device parts', () => {
  const parts = { machineGuid: 'guid-1', userSid: 'S-1-5-21-1', hostname: 'PC', platform: 'win32', arch: 'x64' };
  const first = computeMachineId(parts);
  const second = computeMachineId(parts);
  const third = computeMachineId({ ...parts, machineGuid: 'guid-2' });
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, second);
  assert.notEqual(first, third);
});

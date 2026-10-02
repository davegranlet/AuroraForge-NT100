# Aurora Forge Preview Access Gate

Aurora Forge public releases use a hosted verifier:

```text
https://aurora-patreon-verifier.rd741904.chatgpt.site/api/verify
```

The app no longer accepts an email address as proof of access. Users click the access button, complete browser OAuth, and the hosted verifier returns a hardened entitlement response. Secrets stay on the hosted verifier, not inside the EXE.

For Aurora Forge Beta2, the recommended preview path is:

```text
Patreon paid tier -> Patreon Discord integration -> Discord VIP role -> Aurora verifier checks role
```

This prevents a leaked or guessed patron email from unlocking the converter. The unlock requires control of the linked Discord account and a live VIP role in the configured server.

When the converter is launched from the signed-in Aurora Forge main app, it accepts the main app's short-lived Beta2 session and does not ask the user to sign in a second time. Direct converter launches still use the verifier flow below as a fallback.

## Recommended Discord VIP verifier

Patreon grants the user's Discord account a VIP role through the official Patreon Discord integration. The hosted verifier checks Discord membership/roles and returns `entitlementMethod: "discord_guild_role"` only when the user has the configured role.

Configure these environment variables on the hosted verifier:

- `DISCORD_CLIENT_ID`: Discord OAuth app client ID.
- `DISCORD_CLIENT_SECRET`: Discord OAuth app client secret.
- `DISCORD_BOT_TOKEN`: bot token; the bot must be installed in the Aurora Forge Discord server.
- `DISCORD_GUILD_ID`: Aurora Forge Discord server ID.
- `DISCORD_ALLOWED_ROLE_IDS`: comma-separated role IDs allowed to unlock the Beta, for example the VIP role Patreon syncs.
- `AURORA_SESSION_TTL_SECONDS`: recommended `21600` (6 hours) or less.

The verifier should return this shape for a valid Discord role unlock:

```json
{
  "ok": true,
  "code": "verified",
  "reason": "Discord VIP role verified.",
  "entitlementMethod": "discord_guild_role",
  "guildId": "DISCORD_GUILD_ID",
  "discordUserId": "USER_DISCORD_ID",
  "allowedRoleIds": ["VIP_ROLE_ID"],
  "discordRoleIds": ["MEMBER_ROLE_ID", "VIP_ROLE_ID"],
  "displayName": "Discord display name",
  "issuedAt": "2026-09-19T18:30:00.000Z",
  "expiresAt": "2026-09-20T00:30:00.000Z"
}
```

The app refuses `ok: true` Discord responses unless all of these are present:

- `entitlementMethod` is `discord_guild_role`
- `guildId`
- `discordUserId`
- at least one `allowedRoleIds` entry
- at least one matching ID between `allowedRoleIds` and `discordRoleIds`
- a non-expired session timestamp when `expiresAt` is supplied

## Supported Patreon tier verifier

The app still supports the existing Patreon OAuth verifier path. The Patreon creator token and OAuth client secret stay on the hosted verifier, not inside the EXE. Configure these environment variables on the hosted verifier:

- `AURORA_PATREON_ACCESS_TOKEN`: Patreon creator API access token used to read campaign members.
- `AURORA_PATREON_CAMPAIGN_ID`: Patreon campaign ID.
- `AURORA_PATREON_ALLOWED_TIER_IDS`: comma-separated Patreon tier IDs that may use the converter.
- `AURORA_PATREON_OAUTH_CLIENT_ID`: Patreon OAuth app client ID.
- `AURORA_PATREON_OAUTH_CLIENT_SECRET`: Patreon OAuth app client secret used to exchange browser login codes.

Current campaign/tier configuration:

```text
AURORA_PATREON_CAMPAIGN_ID=10903139
AURORA_PATREON_ALLOWED_TIER_IDS=29572582
```

The app refuses `ok: true` Patreon responses unless they include:

- `patronStatus: "active_patron"`
- at least one `allowedTierIds` entry
- a recognized entitlement method such as `oauth_user_id`, `campaign_member`, `currently_entitled_tiers`, or `signed_campaign_member`
- a non-expired session timestamp when `expiresAt` is supplied

## Verification flow

1. The desktop app starts a localhost callback server at `http://127.0.0.1:53702/patreon-callback`.
2. The app opens `/api/oauth/start` on the hosted verifier with a random state and fixed localhost redirect URI.
3. The hosted verifier redirects the browser to Discord OAuth or Patreon OAuth, depending on the verifier configuration.
4. The OAuth provider redirects back to the app's localhost callback with an authorization code.
5. The app sends the code to `/api/oauth/verify`.
6. The hosted verifier exchanges the code server-side, checks either Discord role proof or Patreon tier proof, and returns the hardened entitlement response.
7. The app unlocks only when the response contains one of the strong proof paths above.

## Admin, ban, and device-binding policy

Admin and banned-user lists must live on the hosted verifier, not inside the desktop EXE. Do not embed raw emails, Discord IDs, Patreon IDs, or a hashed ban list in the app. A determined user can diff, patch, or bypass client-side lists.

The verifier should store identifiers as keyed hashes, for example `HMAC-SHA-512(normalized_identifier, server_secret_pepper)`. The secret pepper must stay server-side only.

Recommended account identifiers:

- normalized Patreon email, if available from OAuth
- Patreon user/member ID
- Discord user ID
- Discord guild role IDs observed during verification

Recommended device record, sent only to the verifier and stored server-side as keyed hashes:

- generated install UUID
- Windows MachineGuid hash
- Windows user SID hash
- coarse OS/app version metadata

The device record is for abuse correlation and ban evasion resistance. It is not impossible to fake and must not be represented as perfect hardware ID enforcement.

Verifier response policy:

- `admin`: full access after OAuth identity is proven; may receive longer server-issued sessions, such as 45 days.
- `subscriber`: full access while Discord role or Patreon tier remains valid.
- `banned`: no access to current/future protected builds; optionally return `allowedMaxVersion` for legacy-only access.
- `legacy_only`: allow only builds at or below the server-returned version.

The app should treat the verifier as authoritative every time it can reach the network. Local cached sessions are convenience only and must never override a live server-side ban.

## Local direct mode

For private developer testing, the desktop app can still call Patreon directly if the hosted verifier URL is removed/overridden and these variables are present locally:

```powershell
$env:AURORA_PATREON_DISABLE_DEFAULT_VERIFY_URL = "1"
$env:AURORA_PATREON_ACCESS_TOKEN = "patreon-token"
$env:AURORA_PATREON_CAMPAIGN_ID = "campaign-id"
$env:AURORA_PATREON_ALLOWED_TIER_IDS = "tier-id-1,tier-id-2"
npm start
```

Direct mode still uses email lookup and is for private developer testing only. Public releases should use the hosted OAuth verifier.

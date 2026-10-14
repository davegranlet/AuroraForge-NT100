# Patreon Access Gate

Aurora Forge public releases use the hosted Patreon verifier:

```text
https://aurora-patreon-verifier.rd741904.chatgpt.site/api/verify
```

End users do not need Patreon API tokens or environment variables. They only enter the email address on their Patreon account, and the app unlocks when the hosted verifier confirms an active allowed tier.

## Server-side verifier configuration

The Patreon creator token is stored as a secret on the hosted verifier, not inside the EXE. Configure these environment variables on the hosted verifier:

- `AURORA_PATREON_ACCESS_TOKEN`: Patreon creator API access token.
- `AURORA_PATREON_CAMPAIGN_ID`: Patreon campaign ID.
- `AURORA_PATREON_ALLOWED_TIER_IDS`: comma-separated Patreon tier IDs that may use the converter.

Current campaign/tier configuration:

```text
AURORA_PATREON_CAMPAIGN_ID=10903139
AURORA_PATREON_ALLOWED_TIER_IDS=29572582
```

## Local direct mode

For private developer testing, the desktop app can still call Patreon directly if the hosted verifier URL is removed/overridden and these variables are present locally:

```powershell
$env:AURORA_PATREON_ACCESS_TOKEN = "patreon-token"
$env:AURORA_PATREON_CAMPAIGN_ID = "campaign-id"
$env:AURORA_PATREON_ALLOWED_TIER_IDS = "tier-id-1,tier-id-2"
npm start
```

The verifier checks the campaign members endpoint and unlocks conversion only when the member is an `active_patron` with at least one currently entitled tier listed in `AURORA_PATREON_ALLOWED_TIER_IDS`.

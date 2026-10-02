# Aurora Entitlements (staged rollout)

This is the server-side entitlement service for Aurora desktop releases. It is
deliberately separate from the Electron application and contains no production
secrets. It is designed for Cloudflare Workers + D1 but uses only Web APIs.

## What it does now

- Issues opaque, one-time-displayed license keys from an administrator endpoint.
- Stores only SHA-256 hashes of those license keys.
- Activates a key on a caller-supplied, locally hashed device identifier.
- Enforces a configurable device limit and revocation/expiry state.
- Returns a short-lived Ed25519-signed entitlement token that an app can verify
  offline using only the public JWK.

It **never** deletes user data or terminates a process as a response to a
license failure. A client should simply disable subscriber-only operations and
show a recovery path.

## Patreon rollout

The first subscriber wave can use manually issued keys. Add Patreon v2 OAuth
and `members:*` webhook reconciliation only after the Patreon client, campaign
and tier mapping are configured. The Patreon client secret and webhook secret
belong in Worker secrets, never in the desktop app or this repository.

## Local setup

1. Create a D1 database and apply `schema.sql`.
2. Copy `wrangler.toml.example` to a local `wrangler.toml` and replace the D1
   database id. Do not commit it.
3. Generate an Ed25519 JWK key pair; set the private JWK, public JWK and an
   administrator token with your platform's secret manager.
4. Deploy only after a separate review of the domain, secret storage, privacy
   notice and Patreon v2 configuration.

Required secrets:

```text
ADMIN_TOKEN
ENTITLEMENT_PRIVATE_KEY_JWK
ENTITLEMENT_PUBLIC_KEY_JWK
```

Run the portable unit tests with:

```text
node --test entitlements/test/*.test.mjs
```

## Client contract

`POST /v1/activate` accepts a license key and a SHA-256 device hash over TLS.
It returns an entitlement token containing only a license id, tier, releases,
device hash and expiry. The client pins `ENTITLEMENT_PUBLIC_KEY_JWK`, verifies
the Ed25519 signature locally, checks the device hash and applies a documented
offline grace period. The private signing key never ships to subscribers.

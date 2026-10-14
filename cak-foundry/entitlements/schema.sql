CREATE TABLE IF NOT EXISTS licenses (
  license_id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  subscriber_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  releases_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  max_devices INTEGER NOT NULL CHECK (max_devices BETWEEN 1 AND 5),
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS devices (
  license_id TEXT NOT NULL REFERENCES licenses(license_id),
  device_hash TEXT NOT NULL,
  first_activated_at INTEGER NOT NULL,
  last_validated_at INTEGER NOT NULL,
  PRIMARY KEY (license_id, device_hash)
);

CREATE INDEX IF NOT EXISTS devices_license_id ON devices(license_id);

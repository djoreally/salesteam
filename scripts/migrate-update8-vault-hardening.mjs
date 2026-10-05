import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = new Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(`
    DELETE FROM settings older
    USING settings newer
    WHERE older.organization_id = newer.organization_id
      AND older.key = newer.key
      AND older.id < newer.id;

    DELETE FROM credential_vault older
    USING credential_vault newer
    WHERE older.organization_id = newer.organization_id
      AND older.provider_id = newer.provider_id
      AND older.secret_name = newer.secret_name
      AND older.id < newer.id;

    CREATE UNIQUE INDEX IF NOT EXISTS settings_org_key_uidx
      ON settings(organization_id, key);

    CREATE UNIQUE INDEX IF NOT EXISTS credential_vault_org_provider_secret_uidx
      ON credential_vault(organization_id, provider_id, secret_name);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
      ON password_reset_tokens(user_id);
  `);
  await client.query("COMMIT");
  console.log("Update 8 vault/auth hardening migration complete");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

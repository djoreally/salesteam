import pg from "pg";

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

const tables = [
  "runs",
  "run_steps",
  "connections",
  "opportunities",
  "products",
  "variants",
  "listings",
  "orders",
  "fulfillments",
  "api_calls",
  "decisions",
  "provider_certifications",
];

await client.connect();
try {
  await client.query("BEGIN");
  for (const table of tables) {
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS organization_id integer`);
    await client.query(`CREATE INDEX IF NOT EXISTS ${table}_organization_id_idx ON ${table}(organization_id)`);
  }
  await client.query("COMMIT");
  console.log(`Update 8 tenancy migration complete for ${tables.length} tables`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

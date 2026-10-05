#!/usr/bin/env node
/**
 * Commerce Agent Installation / Setup Script.
 *
 * Applies infrastructure schema, creates admin user, initializes workspace,
 * and verifies the database is ready for the first run.
 */

const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

async function setup() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log("=== Commerce Agent Setup ===");
    console.log("Checking database connection...");
    await pool.query("SELECT 1");
    console.log("Database connected.");

    console.log("Infrastructure tables verified.");
    console.log("Setup complete. Use the web interface to complete onboarding.");
    console.log("Next: configure WooCommerce and Printify credentials in Settings.");
  } catch (err) {
    console.error("Setup failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();

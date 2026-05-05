#!/usr/bin/env node

/**
 * Seed-only runner. Re-applies every .sql in database/seeds/ to the
 * Elex NeonDB. Idempotent (seeds use ON CONFLICT DO NOTHING).
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.ELEX_CONNECTION_STRING;

if (!connectionString) {
  console.error('❌ Error: ELEX_CONNECTION_STRING is not set in .env');
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting ...');
    await client.connect();

    const seedsDir = path.join(__dirname, '../database/seeds');
    const seedFiles = fs
      .readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of seedFiles) {
      console.log(`🌱 ${file}`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');
      await client.query(sql);
    }

    console.log('\n✨ Seeds applied');
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

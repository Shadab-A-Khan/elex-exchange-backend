#!/usr/bin/env node

/**
 * Database init runner for Elex Exchange.
 * Connects to the Elex NeonDB and applies schema.sql + every file under
 * database/seeds/ in lexical order.
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
    console.log('🔌 Connecting to Elex NeonDB ...');
    await client.connect();
    console.log('✅ Connected\n');

    // Apply schema
    console.log('📋 Applying schema.sql ...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schema);
    console.log('✅ Schema applied (15 tables, 14 enums, RLS, triggers)\n');

    // Apply every seed in lexical order
    const seedsDir = path.join(__dirname, '../database/seeds');
    const seedFiles = fs
      .readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of seedFiles) {
      console.log(`🌱 Seeding ${file} ...`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');
      await client.query(sql);
      console.log(`✅ ${file} done`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✨ Elex DB ready');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Migration failed');
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

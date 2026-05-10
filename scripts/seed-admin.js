#!/usr/bin/env node

/**
 * Seeds an ADMIN user into the Elex NeonDB `users` table.
 *
 * Usage:
 *   node scripts/seed-admin.js \
 *     --email admin@elex.in \
 *     --password '<temp-password>' \
 *     --first-name Admin \
 *     --last-name User
 *
 * Or interactive: omit any flag and it prompts.
 *
 * Idempotent: if a user with the given email already exists, prints the existing
 * row and exits without modification.
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

const connectionString = process.env.ELEX_CONNECTION_STRING;

if (!connectionString) {
  console.error('❌ Error: ELEX_CONNECTION_STRING is not set in .env');
  process.exit(1);
}

// --- CLI flag parsing ---------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const cliArgs = parseArgs(process.argv);

// --- Interactive prompt fallback ---------------------------------------------

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    if (!hidden) {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    // Hidden input (for password) — manual handling to suppress echo
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    let buffer = '';
    const onData = (ch) => {
      const c = ch.toString('utf8');
      if (c === '\n' || c === '\r' || c === '') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(buffer);
      } else if (c === '') {
        // Ctrl+C
        process.exit(130);
      } else if (c === '') {
        // Backspace
        if (buffer.length) {
          buffer = buffer.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        buffer += c;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
    stdin.resume();
  });
}

// --- Validation ---------------------------------------------------------------

function isValidEmail(email) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

// --- Main ---------------------------------------------------------------------

async function run() {
  const email = (cliArgs.email || (await prompt('Admin email: '))).trim();

  if (!isValidEmail(email)) {
    console.error(`❌ Invalid email: ${email}`);
    process.exit(1);
  }

  const password =
    (cliArgs.password && String(cliArgs.password)) ||
    (await prompt('Admin password (min 8 chars): ', { hidden: true }));

  if (!password || password.length < 8) {
    console.error('❌ Password must be at least 8 characters.');
    process.exit(1);
  }

  const firstName =
    cliArgs['first-name'] || (await prompt('First name: ')) || 'Admin';
  const lastName =
    cliArgs['last-name'] || (await prompt('Last name: ')) || 'User';
  const role =
    cliArgs.role && String(cliArgs.role).toUpperCase() === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : 'ADMIN';

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('\n🔌 Connecting to NeonDB...');
    await client.connect();

    // Idempotency check
    const existing = await client.query(
      'SELECT id, email, role, status, created_at FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log('\n⚠️  An user with this email already exists — not modified:');
      console.log(JSON.stringify(existing.rows[0], null, 2));
      console.log(
        '\nIf you need to change the password, do it via the password-reset flow or update the row directly.'
      );
      return;
    }

    console.log('🔐 Hashing password (bcrypt cost 10)...');
    const passwordHash = await bcrypt.hash(password, 10);

    console.log(`👤 Inserting ${role} user ${email}...`);
    const result = await client.query(
      `INSERT INTO users (
         email, password_hash, first_name, last_name,
         role, status, email_verified, phone_verified
       ) VALUES ($1, $2, $3, $4, $5::user_role, 'ACTIVE'::user_status, TRUE, TRUE)
       RETURNING id, email, role, status, created_at`,
      [email, passwordHash, firstName, lastName, role]
    );

    console.log('\n✨ Admin user created:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    console.log(
      `\nYou can now log in to elex-exchange-admin at http://localhost:3003 with ${email} / <your password>.`
    );
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

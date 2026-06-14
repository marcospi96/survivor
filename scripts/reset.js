#!/usr/bin/env node
// Clears all game data (users, rounds, picks, results, messages, api_cache)
// while keeping teams intact and the admin account.
// Usage: node scripts/reset.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const msgs    = await client.query('DELETE FROM messages RETURNING id');
    const picks   = await client.query('DELETE FROM picks RETURNING id');
    const results = await client.query('DELETE FROM results RETURNING id');
    const rounds  = await client.query('DELETE FROM rounds RETURNING id');
    const cache   = await client.query('DELETE FROM api_cache RETURNING key');
    const users   = await client.query('DELETE FROM users WHERE is_admin = false RETURNING id');

    await client.query('COMMIT');

    console.log(`✓ messages   deleted: ${msgs.rowCount}`);
    console.log(`✓ picks      deleted: ${picks.rowCount}`);
    console.log(`✓ results    deleted: ${results.rowCount}`);
    console.log(`✓ rounds     deleted: ${rounds.rowCount}`);
    console.log(`✓ api_cache  deleted: ${cache.rowCount}`);
    console.log(`✓ users      deleted: ${users.rowCount} (admin kept)`);
    console.log('\n✅ Base de datos limpia y lista para el lanzamiento.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Reset failed:', err.message);
  process.exit(1);
});

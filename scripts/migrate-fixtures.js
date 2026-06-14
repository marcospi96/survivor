#!/usr/bin/env node
// Adds api_cache table + match_start_date/match_end_date columns to rounds.
// Safe to run multiple times.
// Usage: node scripts/migrate-fixtures.js

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS api_cache (
        key VARCHAR(200) PRIMARY KEY,
        data JSONB NOT NULL,
        fetched_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ api_cache table ready');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'rounds' AND column_name = 'match_start_date'
        ) THEN
          ALTER TABLE rounds ADD COLUMN match_start_date DATE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'rounds' AND column_name = 'match_end_date'
        ) THEN
          ALTER TABLE rounds ADD COLUMN match_end_date DATE;
        END IF;
      END
      $$
    `);
    console.log('✓ rounds.match_start_date / match_end_date columns ready');

    await client.query('COMMIT');
    console.log('\n✅ Migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});

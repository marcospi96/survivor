#!/usr/bin/env node
// Setup script: initializes DB schema, seeds teams, and creates admin user
// Usage: node scripts/setup.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running schema + seed SQL...');
    const sql = fs.readFileSync(path.join(__dirname, '../seed.sql'), 'utf-8');
    await client.query(sql);
    console.log('✅ Schema and teams seeded');

    console.log('👤 Creating admin user...');
    const hash = await bcrypt.hash('Argentina', 10);
    await client.query(
      `INSERT INTO users (username, password_hash, is_admin, is_alive, has_seen_welcome)
       VALUES ($1, $2, true, true, true)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      ['Survivor', hash]
    );
    console.log('✅ Admin user created: Survivor / Argentina');
    console.log('');
    console.log('🏆 Survivor is ready! Run: npm run dev');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});

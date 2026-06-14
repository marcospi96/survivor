#!/usr/bin/env node
// Update teams table with the official 2026 FIFA World Cup teams.
// Safe to run on a live DB — upserts by name, only deletes teams
// that have no picks AND are not in the new list.
// Usage: npm run update-teams

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const TEAMS = [
  // CONMEBOL
  { name: 'Argentina',          flag_emoji: '🇦🇷' },
  { name: 'Brasil',             flag_emoji: '🇧🇷' },
  { name: 'Colombia',           flag_emoji: '🇨🇴' },
  { name: 'Ecuador',            flag_emoji: '🇪🇨' },
  { name: 'Paraguay',           flag_emoji: '🇵🇾' },
  { name: 'Uruguay',            flag_emoji: '🇺🇾' },
  // UEFA
  { name: 'Alemania',           flag_emoji: '🇩🇪' },
  { name: 'Austria',            flag_emoji: '🇦🇹' },
  { name: 'Bélgica',            flag_emoji: '🇧🇪' },
  { name: 'Bosnia Herzegovina', flag_emoji: '🇧🇦' },
  { name: 'Croacia',            flag_emoji: '🇭🇷' },
  { name: 'Chequia',            flag_emoji: '🇨🇿' },
  { name: 'Inglaterra',         flag_emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Francia',            flag_emoji: '🇫🇷' },
  { name: 'Países Bajos',       flag_emoji: '🇳🇱' },
  { name: 'Noruega',            flag_emoji: '🇳🇴' },
  { name: 'Portugal',           flag_emoji: '🇵🇹' },
  { name: 'Escocia',            flag_emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { name: 'España',             flag_emoji: '🇪🇸' },
  { name: 'Suecia',             flag_emoji: '🇸🇪' },
  { name: 'Suiza',              flag_emoji: '🇨🇭' },
  { name: 'Turquía',            flag_emoji: '🇹🇷' },
  // AFC
  { name: 'Australia',          flag_emoji: '🇦🇺' },
  { name: 'Irak',               flag_emoji: '🇮🇶' },
  { name: 'Irán',               flag_emoji: '🇮🇷' },
  { name: 'Japón',              flag_emoji: '🇯🇵' },
  { name: 'Jordania',           flag_emoji: '🇯🇴' },
  { name: 'Corea del Sur',      flag_emoji: '🇰🇷' },
  { name: 'Qatar',              flag_emoji: '🇶🇦' },
  { name: 'Arabia Saudita',     flag_emoji: '🇸🇦' },
  { name: 'Uzbekistán',         flag_emoji: '🇺🇿' },
  // CAF
  { name: 'Argelia',            flag_emoji: '🇩🇿' },
  { name: 'Cabo Verde',         flag_emoji: '🇨🇻' },
  { name: 'Congo DR',           flag_emoji: '🇨🇩' },
  { name: 'Costa de Marfil',    flag_emoji: '🇨🇮' },
  { name: 'Egipto',             flag_emoji: '🇪🇬' },
  { name: 'Ghana',              flag_emoji: '🇬🇭' },
  { name: 'Marruecos',          flag_emoji: '🇲🇦' },
  { name: 'Senegal',            flag_emoji: '🇸🇳' },
  { name: 'Sudáfrica',          flag_emoji: '🇿🇦' },
  { name: 'Túnez',              flag_emoji: '🇹🇳' },
  // CONCACAF
  { name: 'Canadá',             flag_emoji: '🇨🇦' },
  { name: 'México',             flag_emoji: '🇲🇽' },
  { name: 'Estados Unidos',     flag_emoji: '🇺🇸' },
  { name: 'Curazao',            flag_emoji: '🇨🇼' },
  { name: 'Haití',              flag_emoji: '🇭🇹' },
  { name: 'Panamá',             flag_emoji: '🇵🇦' },
  // OFC
  { name: 'Nueva Zelanda',      flag_emoji: '🇳🇿' },
  // Play-off spots
  { name: 'Costa Rica',         flag_emoji: '🇨🇷' },
  { name: 'Venezuela',          flag_emoji: '🇻🇪' },
  { name: 'Indonesia',          flag_emoji: '🇮🇩' },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure unique constraint on name exists (idempotent)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'teams_name_unique' AND conrelid = 'teams'::regclass
        ) THEN
          ALTER TABLE teams ADD CONSTRAINT teams_name_unique UNIQUE (name);
        END IF;
      END
      $$
    `);
    console.log('✓ Unique constraint on teams.name ensured');

    // 2. Upsert all teams by name
    let upserted = 0;
    for (const team of TEAMS) {
      await client.query(
        `INSERT INTO teams (name, flag_emoji)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET flag_emoji = EXCLUDED.flag_emoji`,
        [team.name, team.flag_emoji]
      );
      upserted++;
    }
    console.log(`✓ Upserted ${upserted} teams`);

    // 3. Delete stale teams not in new list AND not referenced by any pick
    const newNames = TEAMS.map(t => t.name);
    const deletedResult = await client.query(
      `DELETE FROM teams
       WHERE name != ALL($1::text[])
         AND id NOT IN (SELECT DISTINCT team_id FROM picks)
         AND id NOT IN (SELECT DISTINCT team_id FROM results)
       RETURNING name`,
      [newNames]
    );
    if (deletedResult.rows.length > 0) {
      console.log(`🗑  Removed stale teams: ${deletedResult.rows.map(r => r.name).join(', ')}`);
    } else {
      console.log('✓ No stale teams to remove');
    }

    await client.query('COMMIT');
    console.log('');
    console.log(`🏆 Teams updated! Total: ${TEAMS.length} teams in the list.`);

    // Show what's in DB now
    const final = await client.query('SELECT COUNT(*) FROM teams');
    console.log(`   DB now has ${final.rows[0].count} team(s).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ update-teams failed:', err.message);
  process.exit(1);
});

-- Survivor World Cup 2026 — Database Schema + Seed
-- Run this once against your Neon/PostgreSQL database

-- Drop tables (for re-seeding)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS picks CASCADE;
DROP TABLE IF EXISTS rounds CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  is_alive BOOLEAN DEFAULT true,
  has_seen_welcome BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rounds ("fechas")
CREATE TABLE rounds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed','resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  flag_emoji VARCHAR(10) NOT NULL
);

-- Picks
CREATE TABLE picks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, round_id),
  UNIQUE(user_id, team_id)
);

-- Results
CREATE TABLE results (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  outcome VARCHAR(10) NOT NULL CHECK (outcome IN ('win','draw','loss')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, team_id)
);

-- Messages (banter wall)
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_picks_user_id ON picks(user_id);
CREATE INDEX idx_picks_round_id ON picks(round_id);
CREATE INDEX idx_results_round_id ON results(round_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- ============================================================
-- SEED: FIFA World Cup 2026 Teams (48 confirmed + play-offs)
-- ============================================================
INSERT INTO teams (name, flag_emoji) VALUES
-- CONMEBOL (6)
('Argentina',         '🇦🇷'),
('Brasil',            '🇧🇷'),
('Colombia',          '🇨🇴'),
('Ecuador',           '🇪🇨'),
('Paraguay',          '🇵🇾'),
('Uruguay',           '🇺🇾'),
-- UEFA (16)
('Alemania',          '🇩🇪'),
('Austria',           '🇦🇹'),
('Bélgica',           '🇧🇪'),
('Bosnia Herzegovina','🇧🇦'),
('Croacia',           '🇭🇷'),
('Chequia',           '🇨🇿'),
('Inglaterra',        '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
('Francia',           '🇫🇷'),
('Países Bajos',      '🇳🇱'),
('Noruega',           '🇳🇴'),
('Portugal',          '🇵🇹'),
('Escocia',           '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
('España',            '🇪🇸'),
('Suecia',            '🇸🇪'),
('Suiza',             '🇨🇭'),
('Turquía',           '🇹🇷'),
-- AFC (9)
('Australia',         '🇦🇺'),
('Irak',              '🇮🇶'),
('Irán',              '🇮🇷'),
('Japón',             '🇯🇵'),
('Jordania',          '🇯🇴'),
('Corea del Sur',     '🇰🇷'),
('Qatar',             '🇶🇦'),
('Arabia Saudita',    '🇸🇦'),
('Uzbekistán',        '🇺🇿'),
-- CAF (10)
('Argelia',           '🇩🇿'),
('Cabo Verde',        '🇨🇻'),
('Congo DR',          '🇨🇩'),
('Costa de Marfil',   '🇨🇮'),
('Egipto',            '🇪🇬'),
('Ghana',             '🇬🇭'),
('Marruecos',         '🇲🇦'),
('Senegal',           '🇸🇳'),
('Sudáfrica',         '🇿🇦'),
('Túnez',             '🇹🇳'),
-- CONCACAF (6)
('Canadá',            '🇨🇦'),
('México',            '🇲🇽'),
('Estados Unidos',    '🇺🇸'),
('Curazao',           '🇨🇼'),
('Haití',             '🇭🇹'),
('Panamá',            '🇵🇦'),
-- OFC (1)
('Nueva Zelanda',     '🇳🇿'),
-- Play-off spots
('Costa Rica',        '🇨🇷'),
('Venezuela',         '🇻🇪'),
('Indonesia',         '🇮🇩');

-- ============================================================
-- SEED: Admin user (password: Argentina)
-- bcrypt hash of "Argentina" with 10 rounds
-- ============================================================
-- NOTE: The setup script (scripts/setup.js) will create this
-- user with the correct bcrypt hash. Run it with: node scripts/setup.js
-- If you want to insert manually, generate the hash first.

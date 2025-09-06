// setup-db.js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'synergysphere_db_user',
  password: '8dd0U3HhiVdZ1iPQU0kefMv0SqBKH1LB',
  host: 'dpg-d2ttkr3uibrs73f4ie50-a.oregon-postgres.render.com',
  port: 5432,
  database: 'synergysphere_db',
  ssl: {
    rejectUnauthorized: false
  }
});

const createTables = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT  UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  full_name     TEXT    NOT NULL,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent  TEXT,
  ip_address  INET,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function setupDatabase() {
  try {
    await pool.query(createTables);
    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await pool.end();
  }
}

setupDatabase();

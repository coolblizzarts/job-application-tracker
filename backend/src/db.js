import pkg from 'pg';
const { Pool } = pkg;

// Create a connection pool using env vars
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'jobs',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres'
});

// Run once at startup to create tables if they don't exist
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company TEXT NOT NULL,
      role TEXT,
      location TEXT,
      status TEXT NOT NULL DEFAULT 'Applied',
      source TEXT,
      applied_on DATE NOT NULL DEFAULT CURRENT_DATE,
      job_url TEXT,
      salary INTEGER,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_apps_applied_on ON applications(applied_on);
  `);
}

export default pool;

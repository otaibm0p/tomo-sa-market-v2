/**
 * Minimal SQL migration runner for TOMO Market
 * - Applies backend/migrations/*.sql in lexical order
 * - Records applied files in schema_migrations
 *
 * Usage:
 *   node backend/migrate.js
 *
 * Note: In production, we also call this from server.js during boot.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function getConnectionString() {
  // Prefer DATABASE_URL if provided (production-friendly)
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Fallback to same local default used in server.js
  return 'postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db';
}

async function main() {
  const pool = new Pool({ connectionString: getConnectionString() });
  const migrationsDir = path.join(__dirname, 'migrations');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const files = fs.existsSync(migrationsDir)
    ? fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
    : [];

  for (const file of files) {
    const already = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (already.rows.length) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    if (!sql.trim()) continue;

    console.log(`🧱 Applying migration: ${file}`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [file]);
      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`❌ Migration failed: ${file}`);
      throw err;
    }
  }

  console.log('✅ Migrations complete');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



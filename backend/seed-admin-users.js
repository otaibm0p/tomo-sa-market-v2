/**
 * One-time seed: create/update Super Admin and Admin users.
 * Run from backend folder with PostgreSQL running.
 *
 * Windows (PowerShell):
 *   $env:TOMO_ADMIN_PASSWORD="Tomo.2439"; node seed-admin-users.js
 *
 * Windows (CMD):
 *   set TOMO_ADMIN_PASSWORD=Tomo.2439
 *   node seed-admin-users.js
 *
 * Linux/Mac:
 *   TOMO_ADMIN_PASSWORD=Tomo.2439 node seed-admin-users.js
 *
 * Password is read from env TOMO_ADMIN_PASSWORD (not stored in code).
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const PASSWORD = process.env.TOMO_ADMIN_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db';

const USERS = [
  { email: 'super-admin@tomo.com', name: 'Super Admin', role: 'super_admin' },
  { email: 'admin@tomo.com', name: 'Admin', role: 'admin' },
];

async function run() {
  if (!PASSWORD || PASSWORD.length < 6) {
    console.error('❌ Set TOMO_ADMIN_PASSWORD (min 6 chars). Example: TOMO_ADMIN_PASSWORD=Tomo.2439 node seed-admin-users.js');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    await pool.query('SELECT 1');
  } catch (e) {
    console.error('❌ Cannot connect to database. Is PostgreSQL running? Set DATABASE_URL in .env');
    console.error(e.message);
    await pool.end();
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const u of USERS) {
    try {
      const res = await pool.query(
        `SELECT id, email, role FROM users WHERE email = $1`,
        [u.email]
      );
      if (res.rows.length > 0) {
        await pool.query(
          `UPDATE users SET name = $1, full_name = $1, password_hash = $2, role = $3, is_active = true, status = 'active', updated_at = NOW() WHERE email = $4`,
          [u.name, passwordHash, u.role, u.email]
        );
        console.log('✅ Updated:', u.email, '→', u.role);
      } else {
        await pool.query(
          `INSERT INTO users (name, full_name, email, password_hash, role, is_active, status)
           VALUES ($1, $1, $2, $3, $4, true, 'active')`,
          [u.name, u.email, passwordHash, u.role]
        );
        console.log('✅ Created:', u.email, '→', u.role);
      }
    } catch (err) {
      console.error('❌', u.email, err.message || err);
    }
  }

  await pool.end();
  console.log('\nتم. سجّل الدخول من /admin/login باستخدام البريد وكلمة المرور التي حددتها.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

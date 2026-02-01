// Simple script to run drivers foreign key fix migration
// Usage: node run-drivers-fix-simple.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get database connection string
const getConnectionString = () => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return 'postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db';
};

async function runMigration() {
  const connectionString = getConnectionString();
  console.log('🔌 Connecting to database...');
  console.log('📍 Connection:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password
  
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected successfully!\n');
    console.log('📁 Reading migration file...');
    
    const migrationPath = path.join(__dirname, 'migrations', '0007_fix_drivers_foreign_key.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running migration...\n');
    
    // Execute the entire migration file
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration executed successfully!\n');
    
    // Verify results
    console.log('🔍 Verifying results...\n');
    
    const pkResult = await client.query(`
      SELECT 
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'drivers'::regclass
        AND contype = 'p'
      LIMIT 1
    `);
    
    const fkResult = await client.query(`
      SELECT 
        conname AS constraint_name,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'drivers'::regclass
        AND contype = 'f'
        AND confrelid = 'users'::regclass
      LIMIT 1
    `);
    
    console.log('📊 Verification Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (pkResult.rows.length > 0) {
      console.log('✅ PRIMARY KEY:', pkResult.rows[0].definition);
    } else {
      console.log('❌ PRIMARY KEY: NOT FOUND');
    }
    
    if (fkResult.rows.length > 0) {
      console.log('✅ FOREIGN KEY:', fkResult.rows[0].definition);
    } else {
      console.log('❌ FOREIGN KEY: NOT FOUND');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (pkResult.rows.length > 0 && fkResult.rows.length > 0) {
      console.log('🎉 Migration completed successfully!');
      console.log('✅ All constraints are correct.');
    } else {
      console.log('⚠️  Some constraints may be missing. Please check manually.');
    }
    
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Migration failed!');
    console.error('Error:', err.message);
    
    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure PostgreSQL is running and accessible.');
      console.error('   Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));
    }
    
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

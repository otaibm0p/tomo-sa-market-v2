// Run Drivers Foreign Key Fix Migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get database connection string
const getConnectionString = () => {
  // Prefer DATABASE_URL if provided (production-friendly)
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  
  // Default local connection (from server.js)
  return 'postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db';
};

const connectionString = getConnectionString();
const pool = new Pool({ connectionString });

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connecting to database...');
    console.log('📁 Reading migration file...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '0007_fix_drivers_foreign_key.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running migration...\n');
    
    // Execute migration
    await client.query('BEGIN');
    
    // Split by semicolons and execute each statement
    // Note: DO blocks need special handling
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log('✅ Executed statement');
        } catch (err) {
          // Some errors are expected (like "already exists")
          if (err.message.includes('already exists') || 
              err.message.includes('does not exist') ||
              err.message.includes('duplicate')) {
            console.log(`ℹ️  ${err.message}`);
          } else {
            throw err;
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!');
    
    // Verify the result
    console.log('\n🔍 Verifying results...');
    
    const pkCheck = await client.query(`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'drivers'::regclass
        AND contype = 'p'
    `);
    
    const fkCheck = await client.query(`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'drivers'::regclass
        AND contype = 'f'
        AND confrelid = 'users'::regclass
    `);
    
    console.log('\n📊 Results:');
    console.log('PRIMARY KEY:', pkCheck.rows.length > 0 ? pkCheck.rows[0].definition : 'NOT FOUND');
    console.log('FOREIGN KEY:', fkCheck.rows.length > 0 ? fkCheck.rows[0].definition : 'NOT FOUND');
    
    if (pkCheck.rows.length > 0 && fkCheck.rows.length > 0) {
      console.log('\n✅ All constraints are correct!');
    } else {
      console.log('\n⚠️  Some constraints may be missing. Please check manually.');
    }
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

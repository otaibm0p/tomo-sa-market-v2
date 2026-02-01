// Run Drivers Fix Migration on Server
console.log('🔧 Starting Drivers Migration Fix...');

const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Use environment or fallback - same as backend server
  const { Pool } = require('pg');
  
  function getConnectionString() {
    // Use DATABASE_URL if available (production-friendly)
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    // Fallback for local
    return process.env.DATABASE_URL || 
      'postgresql://postgres:postgres@localhost:5432/postgres';
  }

  console.log('📡 Connecting to database...');
  const connectionString = getConnectionString();
  console.log('🔗 Connection configured');
  
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected successfully!');
    
    const migrationFile = '0007_fix_drivers_foreign_key.sql';
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    console.log('📁 Reading migration file...');
    console.log('📍 Path:', migrationPath);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running migration...');
    console.log('');
    
    // Execute the migration - using same method as migrate.js
    await client.query('BEGIN');
    
    try {
      await client.query(migrationSQL);
      await client.query('COMMIT');
      
      console.log('✅ Migration executed successfully!');
    } catch (execErr) {
      await client.query('ROLLBACK');
      throw execErr;
    }
    
    // Verify results
    console.log('🔍 Verifying results...');
    
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
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'drivers'::regclass
        AND contype = 'f'
        AND confrelid = 'users'::regclass
      LIMIT 1
    `);
    
    console.log('\n📊 Verification Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
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
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (pkResult.rows.length > 0 && fkResult.rows.length > 0) {
      console.log('\n🎯 SUCCESS: All constraints are correct!');
      console.log('✅ user_id is PRIMARY KEY');
      console.log('✅ FOREIGN KEY references users(id)');
    } else {
      console.log('\n⚠️  Some constraints may be missing. Please check manually.');
    }
    
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});\n    console.error('\n❌ Migration failed completely!');\n    console.error('Error:', err.message);\n    \n    if (err.code === 'ECONNREFUSED') {\n      console.error('\n💡 Database connection refused.');\n      console.error('Make sure PostgreSQL is running on the server.');\n    }\n    \n    process.exit(1);\n  } finally {\n    console.log('\n🏁 Cleaning up...');\n    client.release();\n    await pool.end();\n    console.log('✅ Connection closed.');\n  }\n}\n\n// Run\nrunMigration().then(() => {\n  console.log('\n🎉 Migration process completed!');\n  process.exit(0);\n}).catch(err => {\n  console.error('\n💥 Fatal error:', err);\n  process.exit(1);\n});\n
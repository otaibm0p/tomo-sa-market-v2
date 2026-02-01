// Test login API
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"
});

async function testLogin() {
  try {
    const email = 'admin@tomo.com';
    const password = 'admin123';
    
    // Get user
    const userResult = await pool.query(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('User not found!');
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log('=== User Found ===');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Is Active: ${user.is_active}`);
    console.log(`Password Hash: ${user.password_hash.substring(0, 20)}...`);
    
    // Test password
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log(`\n=== Password Check ===`);
    console.log(`Password: ${password}`);
    console.log(`Is Valid: ${isValid}`);
    
    if (!isValid) {
      console.log('\n❌ Password does not match!');
      console.log('Resetting password...');
      
      const newHash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [newHash, email]
      );
      
      console.log('✅ Password reset! Try again.');
    } else {
      console.log('\n✅ Password is correct!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testLogin();


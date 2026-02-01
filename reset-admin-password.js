// Reset admin password
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"
});

async function resetPassword() {
  try {
    const newPassword = 'admin123'; // كلمة مرور جديدة
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update admin user
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = 'admin@tomo.com' OR email = 'admin'
      RETURNING id, email, role
    `, [hashedPassword]);
    
    console.log("=== Password Reset ===");
    console.log(`Updated ${result.rows.length} admin user(s)`);
    result.rows.forEach(user => {
      console.log(`\nEmail: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`New Password: ${newPassword}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

resetPassword();


// Check admin users in database
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"
});

async function checkAdmin() {
  try {
    // Check users with admin roles
    const admins = await pool.query(`
      SELECT id, email, role, name 
      FROM users 
      WHERE role IN ('admin', 'super_admin')
      ORDER BY id
    `);
    
    console.log("=== Admin Users ===");
    if (admins.rows.length === 0) {
      console.log("No admin users found!");
    } else {
      admins.rows.forEach(admin => {
        console.log(`\nID: ${admin.id}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Role: ${admin.role}`);
        console.log(`Name: ${admin.name || 'N/A'}`);
      });
    }
    
    // Check all users
    const allUsers = await pool.query(`
      SELECT id, email, role, name 
      FROM users 
      ORDER BY id
      LIMIT 10
    `);
    
    console.log("\n\n=== All Users (first 10) ===");
    allUsers.rows.forEach(user => {
      console.log(`ID: ${user.id} | Email: ${user.email} | Role: ${user.role}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkAdmin();


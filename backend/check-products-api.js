require('dotenv').config();
const { Pool } = require('pg');

const connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db";

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000
});

async function checkProducts() {
  try {
    const result = await pool.query(`
      SELECT id, name_ar, is_featured 
      FROM products 
      WHERE is_featured = true 
      LIMIT 5
    `);
    
    console.log('✅ Featured products from DB:');
    result.rows.forEach(p => {
      console.log(`  ID: ${p.id}, Name: ${p.name_ar}, Featured: ${p.is_featured}`);
    });
    
    const total = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log(`\n📊 Total products: ${total.rows[0].count}`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

checkProducts();


require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db",
  connectionTimeoutMillis: 5000
});

async function checkProducts() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log('✅ Total products:', result.rows[0].count);
    
    const sample = await pool.query('SELECT id, name_ar, name_en, price, is_featured FROM products LIMIT 5');
    console.log('\n📦 Sample products:');
    sample.rows.forEach(p => {
      console.log(`  - ${p.name_ar || p.name_en} (ID: ${p.id}, Featured: ${p.is_featured}, Price: ${p.price})`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkProducts();


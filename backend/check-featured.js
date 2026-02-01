require('dotenv').config();
const { Pool } = require('pg');

const connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db";

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000
});

async function checkFeatured() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM products WHERE is_featured = true');
    console.log(`✅ عدد المنتجات المميزة: ${result.rows[0].count}`);
    
    const products = await pool.query('SELECT id, name_ar, is_featured FROM products WHERE is_featured = true LIMIT 10');
    console.log('\n📦 أمثلة على المنتجات المميزة:');
    products.rows.forEach(p => {
      console.log(`  - ${p.name_ar} (ID: ${p.id})`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ خطأ:', error);
    await pool.end();
  }
}

checkFeatured();


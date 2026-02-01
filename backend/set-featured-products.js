require('dotenv').config();
const { Pool } = require('pg');

const connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db";

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000
});

async function setFeaturedProducts() {
  try {
    // تعيين 20 منتج عشوائي كمميز
    await pool.query(`
      UPDATE products 
      SET is_featured = true 
      WHERE id IN (
        SELECT id FROM products 
        WHERE image_url IS NOT NULL AND image_url != ''
        ORDER BY RANDOM() 
        LIMIT 20
      )
    `);
    
    const result = await pool.query('SELECT COUNT(*) as count FROM products WHERE is_featured = true');
    console.log(`✅ تم تعيين ${result.rows[0].count} منتج كمميز`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ خطأ:', error);
    await pool.end();
  }
}

setFeaturedProducts();


require('dotenv').config();
const { Pool } = require('pg');

const connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db";

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000
});

async function countProducts() {
  try {
    const result = await pool.query('SELECT COUNT(*) as total FROM products');
    console.log(`📊 إجمالي المنتجات في قاعدة البيانات: ${result.rows[0].total}`);
    
    const withImages = await pool.query("SELECT COUNT(*) as total FROM products WHERE image_url IS NOT NULL AND image_url != ''");
    console.log(`🖼️  منتجات بصور: ${withImages.rows[0].total}`);
    
    const byCategory = await pool.query(`
      SELECT c.name_ar, COUNT(p.id) as count 
      FROM categories c 
      LEFT JOIN products p ON p.category_id = c.id 
      GROUP BY c.id, c.name_ar 
      ORDER BY count DESC
    `);
    
    console.log(`\n📁 المنتجات حسب التصنيف:`);
    byCategory.rows.forEach(row => {
      console.log(`   ${row.name_ar}: ${row.count} منتج`);
    });
    
  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await pool.end();
  }
}

countProducts();


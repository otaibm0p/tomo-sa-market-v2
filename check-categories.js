// Check categories in database
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"
});

async function checkCategories() {
  try {
    // Check categories
    const categories = await pool.query(`
      SELECT id, name_ar, name_en, image_url
      FROM categories 
      ORDER BY id
    `);
    
    console.log("=== Categories ===");
    console.log(`Total: ${categories.rows.length} categories\n`);
    
    if (categories.rows.length === 0) {
      console.log("No categories found!");
    } else {
      categories.rows.forEach(cat => {
        console.log(`ID: ${cat.id}`);
        console.log(`Name AR: ${cat.name_ar || 'N/A'}`);
        console.log(`Name EN: ${cat.name_en || 'N/A'}`);
        console.log(`Image: ${cat.image_url || 'NULL'}`);
        console.log('---');
      });
    }
    
    // Check products per category
    const productsByCategory = await pool.query(`
      SELECT 
        c.id,
        c.name_ar,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id, c.name_ar
      ORDER BY c.id
    `);
    
    console.log("\n=== Products per Category ===");
    productsByCategory.rows.forEach(row => {
      console.log(`${row.name_ar || 'N/A'}: ${row.product_count} products`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkCategories();


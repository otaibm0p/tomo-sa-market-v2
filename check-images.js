// Check how images are stored in database
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"
});

async function checkImages() {
  try {
    // Check products table structure first
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name LIKE '%image%'
    `);
    
    console.log("=== Image columns in products table ===");
    columns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    // Check products
    const products = await pool.query(`
      SELECT id, name, image_url
      FROM products 
      LIMIT 5
    `);
    
    console.log("=== Products Images ===");
    products.rows.forEach(p => {
      console.log(`\nProduct ID: ${p.id}`);
      console.log(`Name: ${p.name}`);
      console.log(`image_url: ${p.image_url || 'NULL'}`);
      console.log(`images: ${p.images ? JSON.stringify(p.images) : 'NULL'}`);
    });
    
    // Check categories
    const categories = await pool.query(`
      SELECT id, name_ar, name_en, image_url 
      FROM categories 
      LIMIT 5
    `);
    
    console.log("\n\n=== Categories Images ===");
    categories.rows.forEach(c => {
      console.log(`\nCategory ID: ${c.id}`);
      console.log(`Name: ${c.name_ar || c.name_en}`);
      console.log(`image_url: ${c.image_url || 'NULL'}`);
    });
    
    // Count products with/without images
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(image_url) as products_with_images,
        COUNT(*) - COUNT(image_url) as products_without_images
      FROM products
    `);
    
    console.log("\n\n=== Statistics ===");
    console.log(`Total Products: ${stats.rows[0].total_products}`);
    console.log(`Products with images: ${stats.rows[0].products_with_images}`);
    console.log(`Products without images: ${stats.rows[0].products_without_images}`);
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkImages();


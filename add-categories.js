// Add categories to database
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"
});

const categories = [
  { name_ar: 'خضروات', name_en: 'Vegetables', image_url: null },
  { name_ar: 'فواكه', name_en: 'Fruits', image_url: null },
  { name_ar: 'لحوم', name_en: 'Meat', image_url: null },
  { name_ar: 'ألبان', name_en: 'Dairy', image_url: null },
  { name_ar: 'مخبوزات', name_en: 'Bakery', image_url: null },
  { name_ar: 'مشروبات', name_en: 'Beverages', image_url: null },
  { name_ar: 'منتجات غذائية', name_en: 'Food Products', image_url: null },
  { name_ar: 'منتجات التنظيف', name_en: 'Cleaning Products', image_url: null },
];

async function addCategories() {
  try {
    console.log("Adding categories...\n");
    
    for (const cat of categories) {
      // Check if category exists
      const exists = await pool.query(
        'SELECT id FROM categories WHERE name_ar = $1 OR name_en = $2',
        [cat.name_ar, cat.name_en]
      );
      
      if (exists.rows.length > 0) {
        console.log(`⚠️  Category "${cat.name_ar}" already exists (ID: ${exists.rows[0].id})`);
        continue;
      }
      
      // Insert category
      const result = await pool.query(
        `INSERT INTO categories (name, name_ar, name_en, image_url) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, name_ar, name_en`,
        [cat.name_ar, cat.name_ar, cat.name_en, cat.image_url]
      );
      
      console.log(`✅ Added: ${result.rows[0].name_ar} (ID: ${result.rows[0].id})`);
    }
    
    // Show all categories
    const all = await pool.query('SELECT id, name_ar, name_en FROM categories ORDER BY id');
    console.log(`\n=== Total Categories: ${all.rows.length} ===`);
    all.rows.forEach(cat => {
      console.log(`${cat.id}. ${cat.name_ar} / ${cat.name_en}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

addCategories();


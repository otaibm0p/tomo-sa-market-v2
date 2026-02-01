// Quick check
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"
});

pool.query('SELECT COUNT(*) as total, COUNT(image_url) as with_images FROM products WHERE image_url IS NOT NULL AND image_url != \'\'').then(r => {
  console.log('Total products:', r.rows[0].total);
  console.log('Products with images:', r.rows[0].with_images);
  process.exit(0);
});


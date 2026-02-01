// Import products with images from CSV
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"
});

async function importProducts() {
  try {
    const csvPath = path.join(__dirname, 'final_saudi_products.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Skip header
    const products = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Parse CSV (simple parser - handles quoted fields)
      const fields = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim());
      
      if (fields.length >= 13) {
        const nameAr = fields[1] || '';
        const categoryAr = fields[3] || '';
        const barcode = fields[4] || '';
        const descriptionAr = fields[6] || '';
        const imageUrl = fields[7] || '';
        const price = parseFloat(fields[9]) || 0;
        const pricePerUnit = parseFloat(fields[10]) || price;
        const unit = fields[11] || 'piece';
        const unitStep = parseFloat(fields[12]) || 1;
        const stock = parseInt(fields[13]) || 0;
        
        if (nameAr && price > 0) {
          products.push({
            name_ar: nameAr,
            name_en: fields[0] || nameAr,
            category_ar: categoryAr,
            category_en: fields[2] || categoryAr,
            barcode,
            description_ar: descriptionAr,
            description_en: fields[5] || descriptionAr,
            image_url: imageUrl,
            price,
            price_per_unit: pricePerUnit,
            unit,
            unit_step: unitStep,
            stock_quantity: stock
          });
        }
      }
    }
    
    console.log(`Found ${products.length} products to import\n`);
    
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      try {
        // Find category
        let categoryId = null;
        if (product.category_ar) {
          const catResult = await pool.query(
            'SELECT id FROM categories WHERE name_ar = $1 OR name = $1 LIMIT 1',
            [product.category_ar]
          );
          if (catResult.rows.length > 0) {
            categoryId = catResult.rows[0].id;
          }
        }
        
        // Check if product exists by barcode or name
        const exists = await pool.query(
          'SELECT id FROM products WHERE barcode = $1 OR name = $2 LIMIT 1',
          [product.barcode || '', product.name_ar]
        );
        
        if (exists.rows.length > 0) {
          // Update existing
          await pool.query(
            `UPDATE products 
             SET name = $1, name_ar = $2, name_en = $3, 
                 price = $4, price_per_unit = $5, unit = $6, unit_step = $7,
                 image_url = $8, description = $9, description_ar = $10, description_en = $11,
                 category_id = $12, barcode = $13
             WHERE id = $14`,
            [
              product.name_ar, product.name_ar, product.name_en,
              product.price, product.price_per_unit, product.unit, product.unit_step,
              product.image_url, product.description_ar, product.description_ar, product.description_en,
              categoryId, product.barcode || null, exists.rows[0].id
            ]
          );
          updated++;
          console.log(`✅ Updated: ${product.name_ar}`);
        } else {
          // Insert new
          await pool.query(
            `INSERT INTO products (name, name_ar, name_en, price, price_per_unit, unit, unit_step,
                                  image_url, description, description_ar, description_en,
                                  category_id, barcode)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              product.name_ar, product.name_ar, product.name_en,
              product.price, product.price_per_unit, product.unit, product.unit_step,
              product.image_url, product.description_ar, product.description_ar, product.description_en,
              categoryId, product.barcode || null
            ]
          );
          imported++;
          console.log(`➕ Added: ${product.name_ar}`);
        }
      } catch (err) {
        console.error(`❌ Error with ${product.name_ar}:`, err.message);
        skipped++;
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Imported: ${imported}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${products.length}`);
    
    // Show products with images
    const withImages = await pool.query(
      'SELECT COUNT(*) FROM products WHERE image_url IS NOT NULL AND image_url != \'\''
    );
    console.log(`\nProducts with images: ${withImages.rows[0].count}`);
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

importProducts();


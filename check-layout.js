// Check home layout
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"
});

async function checkLayout() {
  try {
    // Check if home_layout table exists
    const layout = await pool.query(`
      SELECT * FROM home_layout 
      ORDER BY id
      LIMIT 1
    `);
    
    if (layout.rows.length === 0) {
      console.log("No home layout found!");
      console.log("Creating default layout...");
      
      // Create default layout with categories section
      const defaultLayout = {
        sections: [
          {
            id: 'banner-1',
            type: 'banner',
            active: true,
            slides: []
          },
          {
            id: 'categories-1',
            type: 'categories',
            active: true,
            title: 'التصنيفات',
            titleAr: 'التصنيفات',
            titleEn: 'Categories'
          },
          {
            id: 'featured-1',
            type: 'product-row',
            active: true,
            title: 'منتجات مميزة',
            titleAr: 'منتجات مميزة',
            titleEn: 'Featured Products',
            filter: 'featured'
          }
        ]
      };
      
      await pool.query(
        `INSERT INTO home_layout (sections) VALUES ($1)`,
        [JSON.stringify(defaultLayout.sections)]
      );
      
      console.log("✅ Default layout created!");
    } else {
      console.log("=== Home Layout ===");
      const sections = layout.rows[0].sections;
      console.log(`Total sections: ${sections.length}\n`);
      
      sections.forEach((section, idx) => {
        console.log(`${idx + 1}. ${section.type} - Active: ${section.active}`);
        if (section.type === 'categories') {
          console.log(`   Title: ${section.titleAr || section.title}`);
        }
      });
      
      // Check if categories section exists and is active
      const categoriesSection = sections.find(s => s.type === 'categories');
      if (!categoriesSection) {
        console.log("\n⚠️  Categories section not found! Adding it...");
        sections.push({
          id: 'categories-1',
          type: 'categories',
          active: true,
          title: 'التصنيفات',
          titleAr: 'التصنيفات',
          titleEn: 'Categories'
        });
        
        await pool.query(
          `UPDATE home_layout SET sections = $1 WHERE id = $2`,
          [JSON.stringify(sections), layout.rows[0].id]
        );
        
        console.log("✅ Categories section added!");
      } else if (!categoriesSection.active) {
        console.log("\n⚠️  Categories section is inactive! Activating it...");
        categoriesSection.active = true;
        
        await pool.query(
          `UPDATE home_layout SET sections = $1 WHERE id = $2`,
          [JSON.stringify(sections), layout.rows[0].id]
        );
        
        console.log("✅ Categories section activated!");
      } else {
        console.log("\n✅ Categories section is active!");
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkLayout();


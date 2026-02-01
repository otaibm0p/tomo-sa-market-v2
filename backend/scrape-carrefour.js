const https = require('https');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db",
});

// Fallback Data (Carrefour Bestsellers)
const FALLBACK_PRODUCTS = [
    {
        name_ar: "حليب المراعي كامل الدسم 2 لتر",
        name_en: "Almarai Full Fat Milk 2L",
        price: "11.00",
        category: "ألبان وأجبان",
        image_url: "https://images.openfoodfacts.org/images/products/628/100/700/0556/front_en.18.400.jpg",
        barcode: "6281007000556"
    },
    {
        name_ar: "جبنة كرافت شيدر 100 جم",
        name_en: "Kraft Cheddar Cheese 100g",
        price: "6.50",
        category: "ألبان وأجبان",
        image_url: "https://images.openfoodfacts.org/images/products/762/230/071/0376/front_en.13.400.jpg",
        barcode: "7622300710376"
    },
    {
        name_ar: "بيبسي علبة 330 مل",
        name_en: "Pepsi Can 330ml",
        price: "2.50",
        category: "مشروبات",
        image_url: "https://images.openfoodfacts.org/images/products/001/200/000/0133/front_en.16.400.jpg",
        barcode: "0012000000133"
    },
    {
        name_ar: "خبز لوزين شرائح أبيض",
        name_en: "Lusine Sliced White Bread",
        price: "5.00",
        category: "مخبز",
        image_url: "https://images.openfoodfacts.org/images/products/628/100/701/1606/front_en.6.400.jpg",
        barcode: "6281007011606"
    },
    {
        name_ar: "ليز رقائق بطاطس بالملح",
        name_en: "Lays Salted Potato Chips",
        price: "7.00",
        category: "تسالي وحلويات",
        image_url: "https://images.openfoodfacts.org/images/products/628/103/600/2286/front_en.10.400.jpg",
        barcode: "6281036002286"
    },
    {
        name_ar: "أرز بسمتي الشعلان 10 كجم",
        name_en: "Al Shalan Basmati Rice 10kg",
        price: "75.00",
        category: "المواد الغذائية",
        image_url: "https://m.media-amazon.com/images/I/71wwM+y8-wL._AC_SX679_.jpg", // Verified Amazon Link
        barcode: "6281100600103"
    },
    {
        name_ar: "زيت دوار الشمس عافية 1.5 لتر",
        name_en: "Afia Sunflower Oil 1.5L",
        price: "18.50",
        category: "المواد الغذائية",
        image_url: "https://images.openfoodfacts.org/images/products/628/100/600/1885/front_en.7.400.jpg",
        barcode: "6281006001885"
    }
];

// Categories to fetch
const CATEGORIES = [
    { name: "Dairy", query: "milk", ar: "ألبان وأجبان" },
    { name: "Beverages", query: "juice", ar: "مشروبات" },
    { name: "Snacks", query: "chocolate", ar: "تسالي وحلويات" },
    { name: "Bakery", query: "bread", ar: "مخبز" },
    { name: "Pantry", query: "oil", ar: "المواد الغذائية" }
];

async function fetchFromOFF(query) {
    return new Promise((resolve) => {
        // Corrected URL for Saudi Arabia
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=10&tagtype_0=countries&tag_contains_0=contains&tag_0=saudi-arabia&fields=code,product_name,product_name_ar,product_name_en,image_url,brands,quantity`;
        
        https.get(url, { headers: { 'User-Agent': 'TomoMarketScraper/2.0' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.products && json.products.length > 0) {
                        console.log(`   ✅ Fetched ${json.products.length} items for ${query}`);
                        resolve(json.products);
                    } else {
                        console.log(`   ⚠️ No items found for ${query} (API might be strict), using fallback.`);
                        resolve([]);
                    }
                } catch (e) {
                    console.error(`   ❌ JSON Parse Error for ${query}`);
                    resolve([]);
                }
            });
        }).on('error', (err) => {
            console.error(`   ❌ Network Error for ${query}:`, err.message);
            resolve([]);
        });
    });
}

async function getOrCreateCategory(nameAr) {
    // 1. Check if category exists
    const res = await pool.query("SELECT id FROM categories WHERE name = $1 OR name_ar = $1", [nameAr]);
    if (res.rows.length > 0) return res.rows[0].id;

    // 2. Generate Slug
    const slug = nameAr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    // 3. Create if not exists
    const newCat = await pool.query(
        "INSERT INTO categories (name, name_ar, image_url, slug) VALUES ($1, $1, $2, $3) RETURNING id",
        [nameAr, 'https://placehold.co/100x100?text=' + encodeURIComponent(nameAr), slug]
    );
    return newCat.rows[0].id;
}

async function main() {
    console.log("🚀 Starting Smart Scraper...");
    
    let allProducts = [...FALLBACK_PRODUCTS]; // Start with high-quality fallback data

    // 1. Try Fetching Data
    for (const cat of CATEGORIES) {
        process.stdout.write(`🔍 Searching for ${cat.name}... `);
        const products = await fetchFromOFF(cat.query);
        
        for (const p of products) {
            // Validate essential fields
            if (!p.image_url) continue;
            const name = p.product_name_ar || p.product_name || p.product_name_en;
            if (!name) continue;

            const name_ar = p.product_name_ar || name; // Prefer Arabic
            const name_en = p.product_name_en || name; // Prefer English

            // Avoid duplicates
            if (allProducts.some(existing => existing.barcode === p.code)) continue;

            const basePrice = (Math.random() * 45 + 5).toFixed(2); 
            
            allProducts.push({
                name_ar: name_ar,
                name_en: name_en,
                description_ar: `${name_ar} - ${p.brands || ''} ${p.quantity || ''}`,
                description_en: `${name_en} - ${p.brands || ''} ${p.quantity || ''}`,
                price: basePrice,
                category: cat.ar,
                image_url: p.image_url,
                barcode: p.code || `GENERATED-${Math.floor(Math.random()*100000)}`,
                stock_quantity: 50 + Math.floor(Math.random() * 100),
                unit: 'piece',
                unit_step: 1
            });
        }
    }

    console.log(`📦 Total Products Prepared: ${allProducts.length}`);

    // 2. Generate CSV
    const csvHeader = "name_ar,name_en,price,category,description_ar,description_en,image_url,barcode,stock_quantity,unit,unit_step\n";
    const csvRows = allProducts.map(p => {
        // Simple CSV escaping
        const escape = (txt) => (txt || '').replace(/"/g, '""');
        return `"${escape(p.name_ar)}","${escape(p.name_en)}",${p.price},"${p.category}","${escape(p.description_ar)}","${escape(p.description_en)}","${p.image_url}","${p.barcode}",${p.stock_quantity},"${p.unit}",${p.unit_step}`;
    }).join("\n");
    
    fs.writeFileSync('backend/carrefour_products.csv', csvHeader + csvRows);
    console.log("📄 Generated 'backend/carrefour_products.csv' (You can download this if needed).");

    // 3. Direct DB Import
    console.log("🔄 Auto-Importing to Database...");
    
    await pool.query(`
        INSERT INTO stores (name, code, address, latitude, longitude) 
        VALUES ('المخزن الرئيسي', 'MAIN-001', 'الرياض', 24.7136, 46.6753) 
        ON CONFLICT (code) DO NOTHING
    `);

    let successCount = 0;
    
    for (const p of allProducts) {
        try {
            const categoryId = await getOrCreateCategory(p.category);
            
            await pool.query(`
                INSERT INTO products (
                    name, name_ar, name_en, price, description, description_ar, description_en, 
                    category_id, image_url, barcode, unit, unit_step, price_per_unit,
                    cost_price, is_price_locked, images
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $4, $13, false, $14)
                ON CONFLICT (barcode) DO UPDATE SET
                    price = EXCLUDED.price,
                    image_url = EXCLUDED.image_url,
                    images = EXCLUDED.images
            `, [
                p.name_ar, p.name_ar, p.name_en, p.price, p.description_ar, p.description_ar, p.description_en,
                categoryId, p.image_url, p.barcode, p.unit, p.unit_step,
                (p.price * 0.75).toFixed(2), // Cost price
                [p.image_url] // Initialize images array
            ]);
            
            // Get ID (separate query to handle conflict gracefully if RETURNING fails on old Postgres versions with conflict, though 9.5+ is fine)
            // But simply, we can use barcode to find it.
            const prodRes = await pool.query("SELECT id FROM products WHERE barcode = $1", [p.barcode]);
            if (prodRes.rows.length > 0) {
                 const pid = prodRes.rows[0].id;
                 await pool.query(`
                    INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
                    VALUES (1, $1, $2, true)
                    ON CONFLICT (store_id, product_id) DO UPDATE SET quantity = $2, is_available = true
                `, [pid, p.stock_quantity]);
            }

            successCount++;
        } catch (err) {
            console.error(`❌ Error importing ${p.name_en}:`, err.message);
        }
    }

    console.log(`✅ Success! Imported ${successCount} products.`);
    await pool.end();
}

main();

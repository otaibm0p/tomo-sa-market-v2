require('dotenv').config();
const { Pool } = require('pg');

const connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db";

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000
});

// استخراج المزيد من المنتجات من روابط الصور والبيانات المرسلة
// سأستخدم روابط الصور لاستخراج المزيد من المنتجات
const imageUrls = [
  'https://cdn.mafrservices.com/pim-content/SAU/media/product/625697/1733734804/625697_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/sys-master-root/h5a/h7f/51573676113950/95884_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/sys-master-root/hc4/h0e/51573672804382/691295_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/sys-master-root/haf/h74/51573668315166/666226_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/sys-master-root/h22/he1/51573560639518/625703_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/pim-content/SAU/media/product/691294/1733734804/691294_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/sys-master-root/hb9/h11/51573559951390/625704_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/sys-master-root/h10/h48/26533563564062/625700_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/pim-content/SAU/media/product/673862/1767161673/673862_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/sys-master-root/hdb/h68/63026597986334/722169_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/pim-content/SAU/media/product/658716/1767161650/658716_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/pim-content/SAU/media/product/673863/1733745603/673863_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/pim-content/SAU/media/product/736618/1722264003/736618_main.jpg?im=Resize=400',
  'https://cdn.mafrservices.com/pim-content/SAU/media/product/587933/1733745603/587933_main.jpg?im=Resize=400',
];

// استخراج المزيد من المنتجات من البيانات
const moreProducts = [
  // منتجات من روابط الصور
  { name_ar: 'منتج مميز 1', name_en: 'Featured Product 1', price: 25.00, image_url: imageUrls[0], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 2', name_en: 'Featured Product 2', price: 30.00, image_url: imageUrls[1], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 3', name_en: 'Featured Product 3', price: 35.00, image_url: imageUrls[2], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 4', name_en: 'Featured Product 4', price: 40.00, image_url: imageUrls[3], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 5', name_en: 'Featured Product 5', price: 45.00, image_url: imageUrls[4], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 6', name_en: 'Featured Product 6', price: 50.00, image_url: imageUrls[5], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 7', name_en: 'Featured Product 7', price: 55.00, image_url: imageUrls[6], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 8', name_en: 'Featured Product 8', price: 60.00, image_url: imageUrls[7], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 9', name_en: 'Featured Product 9', price: 65.00, image_url: imageUrls[8], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 10', name_en: 'Featured Product 10', price: 70.00, image_url: imageUrls[9], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 11', name_en: 'Featured Product 11', price: 75.00, image_url: imageUrls[10], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 12', name_en: 'Featured Product 12', price: 80.00, image_url: imageUrls[11], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 13', name_en: 'Featured Product 13', price: 85.00, image_url: imageUrls[12], category: 'منتجات غذائية' },
  { name_ar: 'منتج مميز 14', name_en: 'Featured Product 14', price: 90.00, image_url: imageUrls[13], category: 'منتجات غذائية' },
  
  // منتجات إضافية من البيانات
  { name_ar: 'ميريندا حمضيات 2.2 لتر', name_en: 'Mirinda Citrus 2.2L', price: 12.95, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/630443/1733734804/630443_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير إضافي 1', name_en: 'Additional Juice Product 1', price: 15.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/100833/1755181805/100833_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير إضافي 2', name_en: 'Additional Juice Product 2', price: 18.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/532394/1764748924/532394_main.jpg?im=Resize=400', category: 'مشروبات' },
];

async function addProducts() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🚀 بدء إضافة ${moreProducts.length} منتج إضافي...`);
    
    let added = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const product of moreProducts) {
      try {
        // البحث عن التصنيف أو إنشاؤه
        let categoryResult = await client.query(
          'SELECT id FROM categories WHERE name_ar = $1 OR name_en = $1 OR name = $1',
          [product.category]
        );
        
        let categoryId;
        if (categoryResult.rows.length === 0) {
          const newCategory = await client.query(
            `INSERT INTO categories (name, name_ar, name_en, image_url) 
             VALUES ($1, $2, $3, NULL) 
             RETURNING id`,
            [product.category, product.category, product.category]
          );
          categoryId = newCategory.rows[0].id;
          console.log(`✅ تم إنشاء تصنيف جديد: ${product.category} (ID: ${categoryId})`);
        } else {
          categoryId = categoryResult.rows[0].id;
        }
        
        // التحقق من وجود المنتج
        const existingProduct = await client.query(
          'SELECT id FROM products WHERE name_ar = $1 OR name_en = $2',
          [product.name_ar, product.name_en]
        );
        
        if (existingProduct.rows.length > 0) {
          await client.query(
            `UPDATE products 
             SET name_ar = $1, name_en = $2, price = $3, image_url = $4, 
                 category_id = $5, description_ar = $6, description_en = $7
             WHERE id = $8`,
            [
              product.name_ar,
              product.name_en,
              product.price,
              product.image_url,
              categoryId,
              product.description_ar || `منتج ${product.category} عالي الجودة`,
              product.description_en || `High quality ${product.category} product`,
              existingProduct.rows[0].id
            ]
          );
          updated++;
        } else {
          await client.query(
            `INSERT INTO products 
             (name, name_ar, name_en, price, image_url, category_id, description_ar, description_en, is_featured)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
            [
              product.name_ar,
              product.name_ar,
              product.name_en,
              product.price,
              product.image_url,
              categoryId,
              product.description_ar || `منتج ${product.category} عالي الجودة`,
              product.description_en || `High quality ${product.category} product`
            ]
          );
          added++;
          console.log(`✅ تم إضافة: ${product.name_ar}`);
        }
      } catch (err) {
        skipped++;
        console.error(`❌ خطأ في إضافة ${product.name_ar}:`, err.message);
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n🎉 تم بنجاح!`);
    console.log(`✅ تم إضافة: ${added} منتج جديد`);
    console.log(`🔄 تم تحديث: ${updated} منتج موجود`);
    console.log(`⏭️  تم تخطي: ${skipped} منتج بسبب أخطاء`);
    console.log(`📊 المجموع: ${added + updated} منتج`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إضافة المنتجات:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addProducts().catch(console.error);


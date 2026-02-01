require('dotenv').config();
const { Pool } = require('pg');

// استخدام نفس connection string من server.js
const connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db";

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000
});

// التحقق من الاتصال
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// المنتجات المنظمة من البيانات المرسلة
const products = [
  // عصائر كي دي دي
  {
    name_ar: 'كي دي دي ميني عصير تفاح 125 مل × 18 حبة',
    name_en: 'KDD Mini Apple Juice 125ml x 18',
    price: 24.95,
    image_url: 'https://cdn.mafrservices.com/sys-master-root/hcf/hd9/13869216202782/581203_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'عصير تفاح طبيعي من كي دي دي',
    description_en: 'Natural apple juice from KDD'
  },
  {
    name_ar: 'كي دي دي عصير التفاح 180 مل × 24',
    name_en: 'KDD Apple Juice 180ml x 24',
    price: 36.95,
    image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/100833/1755181805/100833_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'عصير تفاح طبيعي',
    description_en: 'Natural apple juice'
  },
  {
    name_ar: 'كي دي دي عصير برتقال 180 مل × 24',
    name_en: 'KDD Orange Juice 180ml x 24',
    price: 24.95,
    image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/532394/1764748924/532394_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'عصير برتقال طبيعي',
    description_en: 'Natural orange juice'
  },
  {
    name_ar: 'كي دي دي عصير أناناس 1 لتر',
    name_en: 'KDD Pineapple Juice 1L',
    price: 6.00,
    image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/435896/1727704804/435896_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'عصير أناناس طبيعي',
    description_en: 'Natural pineapple juice'
  },
  {
    name_ar: 'كي دي دي - عصير عنب أحمر 1 لتر',
    name_en: 'KDD Red Grape Juice 1L',
    price: 7.00,
    image_url: 'https://cdn.mafrservices.com/sys-master-root/ha4/he3/63026588352542/112993_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'عصير عنب أحمر طبيعي',
    description_en: 'Natural red grape juice'
  },
  {
    name_ar: 'كي دي دي حليب كامل الدسم 1لتر',
    name_en: 'KDD Full Cream Milk 1L',
    price: 6.00,
    image_url: 'https://cdn.mafrservices.com/sys-master-root/h5a/h13/14184527200286/133491_main.jpg?im=Resize=400',
    category: 'ألبان',
    description_ar: 'حليب كامل الدسم',
    description_en: 'Full cream milk'
  },
  
  // قهوة نسكافيه
  {
    name_ar: 'نسكافيه جولد قهوة سريعة التحضير 200 جرام',
    name_en: 'Nescafe Gold Instant Coffee 200g',
    price: 59.50,
    image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/126140/1732194004/126140_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'قهوة سريعة التحضير من نسكافيه جولد',
    description_en: 'Nescafe Gold instant coffee'
  },
  {
    name_ar: 'نسكافيه قهوة سريعة التحضير كلاسيك 95 جرام',
    name_en: 'Nescafe Classic Instant Coffee 95g',
    price: 6.25,
    image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/606615/1755185404/606615_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'قهوة سريعة التحضير كلاسيك',
    description_en: 'Classic instant coffee'
  },
  
  // عصائر الربيع
  {
    name_ar: 'الربيع عصير العنب الأحمر 1 لتر × 8',
    name_en: 'Al Rabie Red Grape Juice 1L x 8',
    price: 54.25,
    image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/117710/1721309405/117710_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'عصير عنب أحمر من الربيع',
    description_en: 'Red grape juice from Al Rabie'
  },
  {
    name_ar: 'الربيع عصير الأناناس 1 لتر',
    name_en: 'Al Rabie Pineapple Juice 1L',
    price: 6.50,
    image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/143562/1721311204/143562_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'عصير أناناس طبيعي',
    description_en: 'Natural pineapple juice'
  },
  
  // مياه
  {
    name_ar: 'أوسكا مياه 200 مل × 48',
    name_en: 'Oska Water 200ml x 48',
    price: 18.50,
    image_url: 'https://cdn.mafrservices.com/sys-master-root/h6a/ha3/28088447467550/671703_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'مياه شرب معبأة',
    description_en: 'Bottled drinking water'
  },
  {
    name_ar: 'أوسكا مياه 330 مل × 40',
    name_en: 'Oska Water 330ml x 40',
    price: 20.50,
    image_url: 'https://cdn.mafrservices.com/sys-master-root/hdd/h7f/49533858054174/671705_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'مياه شرب معبأة',
    description_en: 'Bottled drinking water'
  },
  {
    name_ar: 'أروى مياه 330 مل × 40',
    name_en: 'Arwa Water 330ml x 40',
    price: 20.50,
    image_url: 'https://cdn.mafrservices.com/sys-master-root/heb/h76/51636547715102/345674_main.jpg?im=Resize=400',
    category: 'مشروبات',
    description_ar: 'مياه شرب معبأة',
    description_en: 'Bottled drinking water'
  },
  
  // خبز
  {
    name_ar: 'لوزين خبز التوست أبيض 600 جرام',
    name_en: 'Lusine White Toast Bread 600g',
    price: 7.95,
    image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/100832/1755181805/100832_main.jpg?im=Resize=400',
    category: 'مخبز',
    description_ar: 'خبز توست أبيض',
    description_en: 'White toast bread'
  },
  {
    name_ar: 'يومي خبز توست أبيض 600 جرام',
    name_en: 'Yumi White Toast Bread 600g',
    price: 9.00,
    image_url: 'https://cdn.mafrservices.com/sys-master-root/h9b/hee/63264247349278/708602_main.jpg?im=Resize=400',
    category: 'مخبز',
    description_ar: 'خبز توست أبيض',
    description_en: 'White toast bread'
  },
  
  // بسكويت
  {
    name_ar: 'ريتز البسكويت المالح الأصلي 39.6جرام ×12',
    name_en: 'Ritz Original Salty Biscuits 39.6g x 12',
    price: 2.25,
    image_url: 'https://cdn.mafrservices.com/sys-master-root/ha4/h40/27862878912542/573981_main.jpg?im=Resize=400',
    category: 'منتجات غذائية',
    description_ar: 'بسكويت مالح أصلي',
    description_en: 'Original salty biscuits'
  },
  {
    name_ar: 'أوريو - بسكويت الشوكولاتة الأصلي 12 × 36.8 جرام',
    name_en: 'Oreo Original Chocolate Biscuits 12 x 36.8g',
    price: 9.95,
    image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/418065/1748863803/418065_main.jpg?im=Resize=400',
    category: 'منتجات غذائية',
    description_ar: 'بسكويت شوكولاتة أصلي',
    description_en: 'Original chocolate biscuits'
  }
];

async function addProducts() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🚀 بدء إضافة ${products.length} منتج...`);
    
    for (const product of products) {
      // البحث عن التصنيف أو إنشاؤه
      let categoryResult = await client.query(
        'SELECT id FROM categories WHERE name_ar = $1 OR name_en = $1',
        [product.category]
      );
      
      let categoryId;
      if (categoryResult.rows.length === 0) {
        // إنشاء تصنيف جديد
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
        // تحديث المنتج الموجود
        await client.query(
          `UPDATE products 
           SET name_ar = $1, name_en = $2, price = $3, image_url = $4, 
               category_id = $5, description_ar = $6, description_en = $7,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $8`,
          [
            product.name_ar,
            product.name_en,
            product.price,
            product.image_url,
            categoryId,
            product.description_ar || '',
            product.description_en || '',
            existingProduct.rows[0].id
          ]
        );
        console.log(`🔄 تم تحديث: ${product.name_ar}`);
      } else {
        // إضافة منتج جديد
        await client.query(
          `INSERT INTO products 
           (name, name_ar, name_en, price, image_url, category_id, description_ar, description_en, is_featured)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
          [
            product.name_ar, // name column
            product.name_ar,
            product.name_en,
            product.price,
            product.image_url,
            categoryId,
            product.description_ar || '',
            product.description_en || ''
          ]
        );
        console.log(`✅ تم إضافة: ${product.name_ar}`);
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n🎉 تم إضافة/تحديث ${products.length} منتج بنجاح!`);
    
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


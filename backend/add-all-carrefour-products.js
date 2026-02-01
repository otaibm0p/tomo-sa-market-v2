require('dotenv').config();
const { Pool } = require('pg');

// استخدام نفس connection string من server.js
const connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db";

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000
});

// استخراج جميع المنتجات من البيانات المرسلة
const productsData = `
كي دي دي ميني عصير تفاح 125 مل × 18 حبة|24.95|https://cdn.mafrservices.com/sys-master-root/hcf/hd9/13869216202782/581203_main.jpg?im=Resize=400|مشروبات
كي دي دي عصير التفاح 180 مل × 24|36.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/100833/1755181805/100833_main.jpg?im=Resize=400|مشروبات
كي دي دي عصير برتقال 180 مل × 24|24.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/532394/1764748924/532394_main.jpg?im=Resize=400|مشروبات
كي دي دي عصير أناناس 1 لتر|6.00|https://cdn.mafrservices.com/pim-content/SAU/media/product/435896/1727704804/435896_main.jpg?im=Resize=400|مشروبات
كي دي دي - عصير عنب أحمر 1 لتر|7.00|https://cdn.mafrservices.com/sys-master-root/ha4/he3/63026588352542/112993_main.jpg?im=Resize=400|مشروبات
كي دي دي حليب كامل الدسم 1لتر|6.00|https://cdn.mafrservices.com/sys-master-root/h5a/h13/14184527200286/133491_main.jpg?im=Resize=400|ألبان
نسكافيه جولد قهوة سريعة التحضير 200 جرام|59.50|https://cdn.mafrservices.com/pim-content/SAU/media/product/126140/1732194004/126140_main.jpg?im=Resize=400|مشروبات
نسكافيه قهوة سريعة التحضير كلاسيك 95 جرام|6.25|https://cdn.mafrservices.com/pim-content/SAU/media/product/606615/1755185404/606615_main.jpg?im=Resize=400|مشروبات
الربيع عصير العنب الأحمر 1 لتر × 8|54.25|https://cdn.mafrservices.com/pim-content/SAU/media/product/117710/1721309405/117710_main.jpg?im=Resize=400|مشروبات
الربيع عصير الأناناس 1 لتر|6.50|https://cdn.mafrservices.com/pim-content/SAU/media/product/143562/1721311204/143562_main.jpg?im=Resize=400|مشروبات
أوسكا مياه 200 مل × 48|18.50|https://cdn.mafrservices.com/sys-master-root/h6a/ha3/28088447467550/671703_main.jpg?im=Resize=400|مشروبات
أوسكا مياه 330 مل × 40|20.50|https://cdn.mafrservices.com/sys-master-root/hdd/h7f/49533858054174/671705_main.jpg?im=Resize=400|مشروبات
أروى مياه 330 مل × 40|20.50|https://cdn.mafrservices.com/sys-master-root/heb/h76/51636547715102/345674_main.jpg?im=Resize=400|مشروبات
لوزين خبز التوست أبيض 600 جرام|7.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/100832/1755181805/100832_main.jpg?im=Resize=400|مخبز
يومي خبز توست أبيض 600 جرام|9.00|https://cdn.mafrservices.com/sys-master-root/h9b/hee/63264247349278/708602_main.jpg?im=Resize=400|مخبز
ريتز البسكويت المالح الأصلي 39.6جرام ×12|2.25|https://cdn.mafrservices.com/sys-master-root/ha4/h40/27862878912542/573981_main.jpg?im=Resize=400|منتجات غذائية
أوريو - بسكويت الشوكولاتة الأصلي 12 × 36.8 جرام|9.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/418065/1748863803/418065_main.jpg?im=Resize=400|منتجات غذائية
لوزين خبز توست النخاله 600 جرام|7.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/100832/1755181805/100832_main.jpg?im=Resize=400|مخبز
لوزين خبز التوست بر 600 جرام|7.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/100832/1755181805/100832_main.jpg?im=Resize=400|مخبز
فونتي خبز بالحليب صغير 9 حبات - 315 جرام|7.95|https://cdn.mafrservices.com/sys-master-root/h86/hba/9454863548446/113052_main.jpg?im=Resize=400|مخبز
البطل فشار بالزبدة معد بضغط الهواء 23 جرام ×10|7.95|https://cdn.mafrservices.com/sys-master-root/h15/h7c/9136929964062/104267_main.jpg?im=Resize=400|منتجات غذائية
كي دي دي شوكولاتة بالحليب طويلة الأمد 180 مل × 18 قطعة|36.95|https://cdn.mafrservices.com/sys-master-root/h11/h3f/50564117987358/200226_main.jpg?im=Resize=400|مشروبات
كي دي دي، عصير تفاح 180 مل × 6 عبوات|36.95|https://cdn.mafrservices.com/sys-master-root/h58/he8/9298253217822/113048_main.jpg?im=Resize=400|مشروبات
كي دي دي عصير كوكتيل صغير 125 مل × 18|24.95|https://cdn.mafrservices.com/sys-master-root/h7a/hf5/12719011332126/112997_main.jpg?im=Resize=400|مشروبات
كي دي دي عصير أناناس 180 ملي × حزمة من 6|6.00|https://cdn.mafrservices.com/sys-master-root/hf4/h26/50564117266462/200219_main.jpg?im=Resize=400|مشروبات
كي دي دي عصير تفاح 1 لتر × 4|7.00|https://cdn.mafrservices.com/sys-master-root/h3e/h61/13869214695454/160678_main.jpg?im=Resize=400|مشروبات
كي دي دي عصير اناناس 1 لتر × 4|6.00|https://cdn.mafrservices.com/sys-master-root/h7f/h80/50520598970398/689064_main.jpg?im=Resize=400|مشروبات
كي دي دي عصير كوكتيل 1 لتر|7.00|https://cdn.mafrservices.com/sys-master-root/h20/h5d/14966918840350/112995_main.jpg?im=Resize=400|مشروبات
كي دي دي قشطة قيمر 250مل×6|6.00|https://cdn.mafrservices.com/sys-master-root/h78/hea/15162465419294/112998_main.jpg?im=Resize=400|ألبان
كي دي دي حليب بنكهة الشوكولاتة 125 مل|6.00|https://cdn.mafrservices.com/sys-master-root/hed/hfe/13080120295454/113012_main.jpg?im=Resize=400|ألبان
كي دي دي، عصير برتقال 180 مل × 6 عبوات|24.95|https://cdn.mafrservices.com/sys-master-root/h54/h3f/63697738104862/274397_main.jpg?im=Resize=400|مشروبات
نسكافيه 3 في 1 قهوة كلاسيك 20 جرام|6.25|https://cdn.mafrservices.com/pim-content/SAU/media/product/100832/1755181805/100832_main.jpg?im=Resize=400|مشروبات
كوفي ميت كريمة مبيضة للقهوة الأصلي 400 جرام|21.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/174561/1732194004/174561_main.jpg?im=Resize=400|مشروبات
نسكافيه جولد عبوة إعادة تعبئة بنكهة غنية ومذاق ناعم - قهوة سريعة الذوبان 190 جرام|44.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/483627/1732194004/483627_main.jpg?im=Resize=400|مشروبات
نسكافيه قهوة سريعة التحضير كلاسيك 47.5جرام|6.25|https://cdn.mafrservices.com/pim-content/SAU/media/product/483628/1732194004/483628_main.jpg?im=Resize=400|مشروبات
نسكافيه كابتشينو غير محلى 14.2 جرام|18.95|https://cdn.mafrservices.com/sys-master-root/h69/h91/51619080273950/527870_main.jpg?im=Resize=400|مشروبات
نسكافيه جولد عبوة إعادة تعبئة - قهوة سريعة الذوبان 47.5 جرام|44.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/749312/1746342003/749312_main.jpg?im=Resize=400|مشروبات
نسكافيه 3 في 1 مزيج القهوة الكلاسيكية سريعة التحضير 20 جرام، حزمة من 12|6.25|https://cdn.mafrservices.com/pim-content/SAU/media/product/483805/1732194004/483805_main.jpg?im=Resize=400|مشروبات
نسكافيه لاتيه بنكهة الفانيليا 17 جرام|18.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/742714/1732431603/742714_main.jpg?im=Resize=400|مشروبات
نسكافيه قهوة سريعة التحضير ريد مق 47.5جرام|18.95|https://cdn.mafrservices.com/pim-content/SAU/media/product/742716/1732431603/742716_main.jpg?im=Resize=400|مشروبات
الربيع عصير مانجو وفاكهة 185 مل x  18|27.00|https://cdn.mafrservices.com/pim-content/SAU/media/product/117005/1721309405/117005_main.jpg?im=Resize=400|مشروبات
الربيع عصير عنب و توت 200 مل * 18|27.75|https://cdn.mafrservices.com/pim-content/SAU/media/product/645197/1721311204/645197_main.jpg?im=Resize=400|مشروبات
الربيع مشروب البرتقال 250 مل|6.50|https://cdn.mafrservices.com/pim-content/SAU/media/product/117046/1721309405/117046_main.jpg?im=Resize=400|مشروبات
الربيع عصير العنب الأحمر 1 لتر|6.50|https://cdn.mafrservices.com/pim-content/SAU/media/product/658688/1753164462/658688_main.jpg?im=Resize=400|مشروبات
الربيع عصير خليط العنب والتفاح والتوت ، 120 مل|6.50|https://cdn.mafrservices.com/pim-content/SAU/media/product/117025/1721309405/117025_main.jpg?im=Resize=400|مشروبات
الربيع عصير الأناناس 185 مل|6.25|https://cdn.mafrservices.com/sys-master-root/h06/h29/15398211780638/658690_main.jpg?im=Resize=400|مشروبات
الربيع نكتار متعدد الفواكه + فيتامينات 120 مل × 18|29.50|https://cdn.mafrservices.com/pim-content/SAU/media/product/18600/1721311204/18600_main.jpg?im=Resize=400|مشروبات
الربيع مشروب البرتقال 250 مل × 27|17.25|https://cdn.mafrservices.com/pim-content/SAU/media/product/117043/1721311204/117043_main.jpg?im=Resize=400|مشروبات
الربيع مشروب البرتقال والفواكه المختلطة 120 مل × 18|17.25|https://cdn.mafrservices.com/pim-content/SAU/media/product/645195/1721311204/645195_main.jpg?im=Resize=400|مشروبات
اروى مياه شرب معباة 1.5لتر×6|9.50|https://cdn.mafrservices.com/sys-master-root/hfe/h6e/47962606338078/136301_main.jpg?im=Resize=400|مشروبات
أوسكا - ماء 330 مل × 20|5.75|https://cdn.mafrservices.com/sys-master-root/hce/hd6/51573552807966/398501_main.jpg?im=Resize=400|مشروبات
نوفا مياه 1.5لتر ×  6|9.00|https://cdn.mafrservices.com/sys-master-root/h0b/hd3/16973506215966/18380_main.jpg?im=Resize=400|مشروبات
بيرين مياة شرب معبأة  330 مل × 40|14.00|https://cdn.mafrservices.com/sys-master-root/h20/h96/17158416105502/163063_main.jpg?im=Resize=400|مشروبات
اكوافينا  مياه للشرب قارورة 200 مل × 48|9.50|https://cdn.mafrservices.com/sys-master-root/h0c/hdd/49898517594142/702101_main.jpg?im=Resize=400|مشروبات
مياه صفا مكة المكرمة 330 مل × 40|20.50|https://cdn.mafrservices.com/sys-master-root/hf9/hc7/47962608009246/545205_main.jpg?im=Resize=400|مشروبات
خبز فرنسي 400 جرام|8.95|https://cdn.mafrservices.com/sys-master-root/h6f/hab/9216715161630/78541_main.jpg?im=Resize=400|مخبز
فونتي تورتيلا بني، حجم متوسط، 6 قطع 250 جرام|8.95|https://cdn.mafrservices.com/sys-master-root/h83/h52/11514589577246/560691_main.jpg?im=Resize=400|مخبز
تسالي شيبس بالليمون والكمون 155 جرام|2.25|https://cdn.mafrservices.com/sys-master-root/hc4/h4e/11514589446174/522770_main.jpg?im=Resize=400|منتجات غذائية
نسكافيه فارمَرز أورجنز - كبسولات قهوة البرازيل، أنبوب من 10 كبسولات، 44 جرام|59.50|https://cdn.mafrservices.com/pim-content/SAU/media/product/483629/1732194004/483629_main.jpg?im=Resize=400|مشروبات
نسكافيه فارمَرز أورجنز - كبسولات قهوة أفريقيا، أنبوب من 10 كبسولات، 44 جرام|59.50|https://cdn.mafrservices.com/pim-content/SAU/media/product/749317/1746342003/749317_main.jpg?im=Resize=400|مشروبات
`;

// استخراج المنتجات من البيانات
const products = [];
const lines = productsData.trim().split('\n').filter(line => line.trim());

lines.forEach(line => {
  const parts = line.split('|');
  if (parts.length >= 4) {
    const name_ar = parts[0].trim();
    const price = parseFloat(parts[1].trim()) || 0;
    const image_url = parts[2].trim();
    const category = parts[3].trim();
    
    if (name_ar && price > 0 && image_url) {
      // إنشاء اسم إنجليزي بسيط
      const name_en = name_ar.replace(/كي دي دي/g, 'KDD')
                              .replace(/نسكافيه/g, 'Nescafe')
                              .replace(/الربيع/g, 'Al Rabie')
                              .replace(/أوسكا/g, 'Oska')
                              .replace(/أروى/g, 'Arwa')
                              .replace(/لوزين/g, 'Lusine')
                              .replace(/يومي/g, 'Yumi')
                              .replace(/ريتز/g, 'Ritz')
                              .replace(/أوريو/g, 'Oreo')
                              .replace(/فونتي/g, 'Fontein')
                              .replace(/البطل/g, 'Al Batal')
                              .replace(/تسالي/g, 'Tasali')
                              .replace(/نوفا/g, 'Nova')
                              .replace(/بيرين/g, 'Bireen')
                              .replace(/اكوافينا/g, 'Aquafina')
                              .replace(/مياه صفا مكة المكرمة/g, 'Safa Makkah Water');
      
      products.push({
        name_ar,
        name_en: name_en || name_ar,
        price,
        image_url,
        category,
        description_ar: `منتج ${category} عالي الجودة`,
        description_en: `High quality ${category} product`
      });
    }
  }
});

async function addProducts() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🚀 بدء إضافة ${products.length} منتج...`);
    
    let added = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      try {
        // البحث عن التصنيف أو إنشاؤه
        let categoryResult = await client.query(
          'SELECT id FROM categories WHERE name_ar = $1 OR name_en = $1 OR name = $1',
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
                 category_id = $5, description_ar = $6, description_en = $7
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
          updated++;
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


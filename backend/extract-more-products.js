require('dotenv').config();
const { Pool } = require('pg');

const connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db";

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 5000
});

// استخراج المزيد من المنتجات من البيانات المرسلة
// سأستخدم جميع روابط الصور والأسماء المذكورة
const additionalProducts = [
  // من البيانات المرسلة - استخراج المزيد
  { name_ar: 'ميريندا حمضيات 2.2 لتر', name_en: 'Mirinda Citrus 2.2L', price: 12.95, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/630443/1733734804/630443_main.jpg?im=Resize=400', category: 'مشروبات' },
  
  // منتجات من روابط الصور الإضافية
  { name_ar: 'منتج غذائي مميز 1', name_en: 'Premium Food Product 1', price: 25.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/625697/1733734804/625697_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 2', name_en: 'Premium Food Product 2', price: 30.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h5a/h7f/51573676113950/95884_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 3', name_en: 'Premium Food Product 3', price: 35.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hc4/h0e/51573672804382/691295_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 4', name_en: 'Premium Food Product 4', price: 40.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/haf/h74/51573668315166/666226_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 5', name_en: 'Premium Food Product 5', price: 45.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h22/he1/51573560639518/625703_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 6', name_en: 'Premium Food Product 6', price: 50.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/691294/1733734804/691294_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 7', name_en: 'Premium Food Product 7', price: 55.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hb9/h11/51573559951390/625704_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 8', name_en: 'Premium Food Product 8', price: 60.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h10/h48/26533563564062/625700_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 9', name_en: 'Premium Food Product 9', price: 65.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/673862/1767161673/673862_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 10', name_en: 'Premium Food Product 10', price: 70.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hdb/h68/63026597986334/722169_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 11', name_en: 'Premium Food Product 11', price: 75.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/658716/1767161650/658716_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 12', name_en: 'Premium Food Product 12', price: 80.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/673863/1733745603/673863_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 13', name_en: 'Premium Food Product 13', price: 85.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/736618/1722264003/736618_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي مميز 14', name_en: 'Premium Food Product 14', price: 90.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/587933/1733745603/587933_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  
  // منتجات إضافية من روابط الصور الأخرى
  { name_ar: 'منتج مشروبات 1', name_en: 'Beverage Product 1', price: 15.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h86/hba/9454863548446/113052_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 2', name_en: 'Beverage Product 2', price: 18.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h15/h7c/9136929964062/104267_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 3', name_en: 'Beverage Product 3', price: 20.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h11/h3f/50564117987358/200226_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 4', name_en: 'Beverage Product 4', price: 22.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h58/he8/9298253217822/113048_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 5', name_en: 'Beverage Product 5', price: 24.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h7a/hf5/12719011332126/112997_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 6', name_en: 'Beverage Product 6', price: 26.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hf4/h26/50564117266462/200219_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 7', name_en: 'Beverage Product 7', price: 28.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h3e/h61/13869214695454/160678_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 8', name_en: 'Beverage Product 8', price: 30.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h7f/h80/50520598970398/689064_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 9', name_en: 'Beverage Product 9', price: 32.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h20/h5d/14966918840350/112995_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 10', name_en: 'Beverage Product 10', price: 34.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h78/hea/15162465419294/112998_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 11', name_en: 'Beverage Product 11', price: 36.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hed/hfe/13080120295454/113012_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 12', name_en: 'Beverage Product 12', price: 38.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h54/h3f/63697738104862/274397_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 13', name_en: 'Beverage Product 13', price: 40.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h09/h4d/14184898625566/647644_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مشروبات 14', name_en: 'Beverage Product 14', price: 42.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hcb/ha3/13148932735006/283598_main.jpg?im=Resize=400', category: 'مشروبات' },
  
  // منتجات من روابط الصور الأخرى
  { name_ar: 'منتج قهوة مميز 1', name_en: 'Premium Coffee Product 1', price: 45.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/174561/1732194004/174561_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج قهوة مميز 2', name_en: 'Premium Coffee Product 2', price: 50.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/483627/1732194004/483627_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج قهوة مميز 3', name_en: 'Premium Coffee Product 3', price: 55.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/483628/1732194004/483628_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج قهوة مميز 4', name_en: 'Premium Coffee Product 4', price: 60.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h69/h91/51619080273950/527870_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج قهوة مميز 5', name_en: 'Premium Coffee Product 5', price: 65.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/749312/1746342003/749312_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج قهوة مميز 6', name_en: 'Premium Coffee Product 6', price: 70.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/483805/1732194004/483805_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج قهوة مميز 7', name_en: 'Premium Coffee Product 7', price: 75.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/742714/1732431603/742714_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج قهوة مميز 8', name_en: 'Premium Coffee Product 8', price: 80.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/742716/1732431603/742716_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج قهوة مميز 9', name_en: 'Premium Coffee Product 9', price: 85.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/483629/1732194004/483629_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج قهوة مميز 10', name_en: 'Premium Coffee Product 10', price: 90.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/749317/1746342003/749317_main.jpg?im=Resize=400', category: 'مشروبات' },
  
  // منتجات من روابط الصور الأخرى
  { name_ar: 'منتج عصير الربيع 1', name_en: 'Al Rabie Juice Product 1', price: 8.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/117005/1721309405/117005_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 2', name_en: 'Al Rabie Juice Product 2', price: 9.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/645197/1721311204/645197_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 3', name_en: 'Al Rabie Juice Product 3', price: 10.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/117046/1721309405/117046_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 4', name_en: 'Al Rabie Juice Product 4', price: 11.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/658688/1753164462/658688_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 5', name_en: 'Al Rabie Juice Product 5', price: 12.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/117025/1721309405/117025_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 6', name_en: 'Al Rabie Juice Product 6', price: 13.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h06/h29/15398211780638/658690_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 7', name_en: 'Al Rabie Juice Product 7', price: 14.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/18600/1721311204/18600_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 8', name_en: 'Al Rabie Juice Product 8', price: 15.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/117043/1721311204/117043_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 9', name_en: 'Al Rabie Juice Product 9', price: 16.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/645195/1721311204/645195_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 10', name_en: 'Al Rabie Juice Product 10', price: 17.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/116989/1721309405/116989_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 11', name_en: 'Al Rabie Juice Product 11', price: 18.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/645198/1721311204/645198_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 12', name_en: 'Al Rabie Juice Product 12', price: 19.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/471109/1721311204/471109_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 13', name_en: 'Al Rabie Juice Product 13', price: 20.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/117707/1721309405/117707_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 14', name_en: 'Al Rabie Juice Product 14', price: 21.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/716810/1721311204/716810_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 15', name_en: 'Al Rabie Juice Product 15', price: 22.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/117007/1721309405/117007_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 16', name_en: 'Al Rabie Juice Product 16', price: 23.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/18601/1762089599/18601_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 17', name_en: 'Al Rabie Juice Product 17', price: 24.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/117784/1721311204/117784_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج عصير الربيع 18', name_en: 'Al Rabie Juice Product 18', price: 25.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/471113/1721311204/471113_main.jpg?im=Resize=400', category: 'مشروبات' },
  
  // منتجات مياه إضافية
  { name_ar: 'منتج مياه 1', name_en: 'Water Product 1', price: 5.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h9b/hee/63264247349278/708602_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مياه 2', name_en: 'Water Product 2', price: 6.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/ha4/h40/27862878912542/573981_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مياه 3', name_en: 'Water Product 3', price: 7.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/418065/1748863803/418065_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مياه 4', name_en: 'Water Product 4', price: 8.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hfe/h6e/47962606338078/136301_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مياه 5', name_en: 'Water Product 5', price: 9.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hce/hd6/51573552807966/398501_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مياه 6', name_en: 'Water Product 6', price: 10.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h0b/hd3/16973506215966/18380_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مياه 7', name_en: 'Water Product 7', price: 11.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h20/h96/17158416105502/163063_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مياه 8', name_en: 'Water Product 8', price: 12.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h0c/hdd/49898517594142/702101_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مياه 9', name_en: 'Water Product 9', price: 13.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hf9/hc7/47962608009246/545205_main.jpg?im=Resize=400', category: 'مشروبات' },
  { name_ar: 'منتج مياه 10', name_en: 'Water Product 10', price: 14.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/671601/1732514404/671601_main.jpg?im=Resize=400', category: 'مشروبات' },
  
  // منتجات خبز إضافية
  { name_ar: 'منتج خبز 1', name_en: 'Bread Product 1', price: 8.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h6f/hab/9216715161630/78541_main.jpg?im=Resize=400', category: 'مخبز' },
  { name_ar: 'منتج خبز 2', name_en: 'Bread Product 2', price: 9.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h83/h52/11514589577246/560691_main.jpg?im=Resize=400', category: 'مخبز' },
  { name_ar: 'منتج خبز 3', name_en: 'Bread Product 3', price: 10.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hc4/h4e/11514589446174/522770_main.jpg?im=Resize=400', category: 'مخبز' },
  { name_ar: 'منتج خبز 4', name_en: 'Bread Product 4', price: 11.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hec/hb9/12624678027294/78493_main.jpg?im=Resize=400', category: 'مخبز' },
  { name_ar: 'منتج خبز 5', name_en: 'Bread Product 5', price: 12.00, image_url: 'https://cdn.mafrservices.com/pim-content/SAU/media/product/671602/1732514404/671602_main.jpg?im=Resize=400', category: 'مخبز' },
  { name_ar: 'منتج خبز 6', name_en: 'Bread Product 6', price: 13.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h6f/h53/48390876856350/603365_main.jpeg?im=Resize=400', category: 'مخبز' },
  { name_ar: 'منتج خبز 7', name_en: 'Bread Product 7', price: 14.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hf5/h44/17158418366494/666913_main.jpg?im=Resize=400', category: 'مخبز' },
  { name_ar: 'منتج خبز 8', name_en: 'Bread Product 8', price: 15.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/had/h95/9216713785374/78680_main.jpg?im=Resize=400', category: 'مخبز' },
  { name_ar: 'منتج خبز 9', name_en: 'Bread Product 9', price: 16.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h12/h68/49533756604446/671697_main.jpg?im=Resize=400', category: 'مخبز' },
  
  // منتجات غذائية إضافية
  { name_ar: 'منتج غذائي 1', name_en: 'Food Product 1', price: 20.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hce/h4c/9169096802334/4755_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي 2', name_en: 'Food Product 2', price: 22.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hf2/ha9/51542164078622/667037_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي 3', name_en: 'Food Product 3', price: 24.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h94/hec/14787579478046/519115_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي 4', name_en: 'Food Product 4', price: 26.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h86/hba/9454863548446/113052_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي 5', name_en: 'Food Product 5', price: 28.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h15/h7c/9136929964062/104267_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي 6', name_en: 'Food Product 6', price: 30.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h11/h3f/50564117987358/200226_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي 7', name_en: 'Food Product 7', price: 32.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h58/he8/9298253217822/113048_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي 8', name_en: 'Food Product 8', price: 34.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h7a/hf5/12719011332126/112997_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي 9', name_en: 'Food Product 9', price: 36.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/hf4/h26/50564117266462/200219_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
  { name_ar: 'منتج غذائي 10', name_en: 'Food Product 10', price: 38.00, image_url: 'https://cdn.mafrservices.com/sys-master-root/h3e/h61/13869214695454/160678_main.jpg?im=Resize=400', category: 'منتجات غذائية' },
];

async function addProducts() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🚀 بدء إضافة ${additionalProducts.length} منتج إضافي...`);
    
    let added = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const product of additionalProducts) {
      try {
        // البحث عن التصنيف
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
        } else {
          categoryId = categoryResult.rows[0].id;
        }
        
        // التحقق من وجود المنتج
        const existingProduct = await client.query(
          'SELECT id FROM products WHERE name_ar = $1 OR name_en = $2',
          [product.name_ar, product.name_en]
        );
        
        if (existingProduct.rows.length > 0) {
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
          if (added % 10 === 0) {
            console.log(`✅ تم إضافة ${added} منتج حتى الآن...`);
          }
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


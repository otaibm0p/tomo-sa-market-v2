// ================= Automated Logistics: Geofencing & Smart Dispatch =================
// نظام المواقع والربط الذكي

// Note: pool will be passed as parameter to functions

/**
 * حساب المسافة بين نقطتين GPS باستخدام Haversine formula
 * @param {number} lat1 - خط عرض النقطة الأولى
 * @param {number} lon1 - خط طول النقطة الأولى
 * @param {number} lat2 - خط عرض النقطة الثانية
 * @param {number} lon2 - خط طول النقطة الثانية
 * @returns {number} المسافة بالكيلومتر
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * خوارزمية AssignOrder: البحث عن أقرب متجر يغطي موقع الزبون
 * @param {number} customerLat - خط عرض موقع الزبون
 * @param {number} customerLon - خط طول موقع الزبون
 * @param {Array} productIds - قائمة معرفات المنتجات المطلوبة
 * @returns {Object|null} معلومات المتجر الأقرب أو null
 */
async function assignOrderToStore(pool, customerLat, customerLon, productIds) {
  try {
    if (!customerLat || !customerLon || !productIds || productIds.length === 0) {
      return null;
    }

    // البحث عن المتاجر التي:
    // 1. نشطة
    // 2. لديها جميع المنتجات المطلوبة في المخزون
    // 3. موقع الزبون ضمن نطاق التوصيل (delivery_radius)
    const result = await pool.query(`
      WITH store_products AS (
        SELECT 
          s.id as store_id,
          s.name,
          s.code,
          s.latitude,
          s.longitude,
          s.delivery_radius,
          s.phone,
          s.email,
          COUNT(DISTINCT si.product_id) as available_products_count,
          MIN(si.quantity) as min_stock,
          calculate_distance($1, $2, s.latitude, s.longitude) as distance
        FROM stores s
        INNER JOIN store_inventory si ON s.id = si.store_id
        WHERE s.is_active = true
          AND si.is_available = true
          AND si.quantity > 0
          AND si.product_id = ANY($3::int[])
          AND calculate_distance($1, $2, s.latitude, s.longitude) <= s.delivery_radius
        GROUP BY s.id, s.name, s.code, s.latitude, s.longitude, s.delivery_radius, s.phone, s.email
        HAVING COUNT(DISTINCT si.product_id) = $4
      )
      SELECT * FROM store_products
      ORDER BY distance ASC
      LIMIT 1;
    `, [customerLat, customerLon, productIds, productIds.length]);

    if (result.rows.length === 0) {
      return null;
    }

    const store = result.rows[0];
    return {
      store_id: store.store_id,
      store_name: store.name,
      store_code: store.code,
      latitude: parseFloat(store.latitude),
      longitude: parseFloat(store.longitude),
      delivery_radius: parseFloat(store.delivery_radius),
      distance: parseFloat(store.distance),
      phone: store.phone,
      email: store.email
    };
  } catch (err) {
    console.error("AssignOrder error:", err);
    return null;
  }
}

/**
 * البحث عن أقرب 3 مناديب نشطين ومتوفرين ضمن نطاق 5 كم من المتجر
 * @param {number} storeLat - خط عرض المتجر
 * @param {number} storeLon - خط طول المتجر
 * @param {number} maxDistance - المسافة القصوى بالكيلومتر (افتراضي 5)
 * @param {number} limit - عدد المناديب المطلوبين (افتراضي 3)
 * @returns {Array} قائمة المناديب الأقرب
 */
async function findNearestAvailableDrivers(pool, storeLat, storeLon, maxDistance = 5, limit = 3) {
  try {
    if (!storeLat || !storeLon) {
      return [];
    }

    const result = await pool.query(`
      SELECT 
        d.id,
        d.user_id,
        u.name as driver_name,
        u.email,
        d.phone,
        d.vehicle_type,
        d.status,
        COALESCE(d.current_latitude, 0) as current_latitude,
        COALESCE(d.current_longitude, 0) as current_longitude,
        COALESCE(d.last_location_update, NOW() - INTERVAL '1 day') as last_location_update,
        calculate_distance($1, $2, COALESCE(d.current_latitude, $1), COALESCE(d.current_longitude, $2)) as distance
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE d.is_active = true
        AND d.is_approved = true
        AND u.is_active = true
        AND d.status = 'online'
        AND d.id NOT IN (
          SELECT DISTINCT driver_id 
          FROM orders 
          WHERE driver_id IS NOT NULL 
          AND status IN ('out_for_delivery', 'preparing', 'confirmed')
        )
        AND calculate_distance($1, $2, COALESCE(d.current_latitude, $1), COALESCE(d.current_longitude, $2)) <= $3
      ORDER BY distance ASC
      LIMIT $4;
    `, [storeLat, storeLon, maxDistance, limit]);

    return result.rows.map(row => ({
      driver_id: row.id,
      user_id: row.user_id,
      driver_name: row.driver_name,
      email: row.email,
      phone: row.phone,
      vehicle_type: row.vehicle_type,
      status: row.status,
      current_latitude: parseFloat(row.current_latitude),
      current_longitude: parseFloat(row.current_longitude),
      last_location_update: row.last_location_update,
      distance: parseFloat(row.distance)
    }));
  } catch (err) {
    console.error("Find nearest drivers error:", err);
    return [];
  }
}

/**
 * حساب وقت التوصيل المتوقع (ETA) بالدقائق
 * @param {number} storeLat - خط عرض المتجر
 * @param {number} storeLon - خط طول المتجر
 * @param {number} customerLat - خط عرض موقع الزبون
 * @param {number} customerLon - خط طول موقع الزبون
 * @param {number} driverLat - خط عرض موقع المندوب (اختياري)
 * @param {number} driverLon - خط طول موقع المندوب (اختياري)
 * @returns {Object} معلومات ETA
 */
function calculateETA(storeLat, storeLon, customerLat, customerLon, driverLat = null, driverLon = null) {
  try {
    // حساب المسافات
    const storeToCustomerDistance = calculateDistance(storeLat, storeLon, customerLat, customerLon);
    
    let driverToStoreDistance = 0;
    if (driverLat && driverLon) {
      driverToStoreDistance = calculateDistance(driverLat, driverLon, storeLat, storeLon);
    }

    // متوسط السرعة (كم/ساعة)
    const averageSpeed = 40; // 40 كم/ساعة في المدينة
    const preparationTime = 10; // 10 دقائق للتحضير

    // حساب الأوقات (بالدقائق)
    const driverToStoreTime = (driverToStoreDistance / averageSpeed) * 60;
    const storeToCustomerTime = (storeToCustomerDistance / averageSpeed) * 60;
    
    const totalETA = Math.ceil(preparationTime + driverToStoreTime + storeToCustomerTime);

    return {
      total_eta_minutes: totalETA,
      preparation_time_minutes: preparationTime,
      driver_to_store_time_minutes: Math.ceil(driverToStoreTime),
      store_to_customer_time_minutes: Math.ceil(storeToCustomerTime),
      store_to_customer_distance_km: parseFloat(storeToCustomerDistance.toFixed(2)),
      driver_to_store_distance_km: parseFloat(driverToStoreDistance.toFixed(2))
    };
  } catch (err) {
    console.error("Calculate ETA error:", err);
    return {
      total_eta_minutes: 30, // افتراضي 30 دقيقة
      preparation_time_minutes: 10,
      driver_to_store_time_minutes: 0,
      store_to_customer_time_minutes: 20,
      store_to_customer_distance_km: 0,
      driver_to_store_distance_km: 0
    };
  }
}

module.exports = {
  calculateDistance,
  assignOrderToStore,
  findNearestAvailableDrivers,
  calculateETA
};


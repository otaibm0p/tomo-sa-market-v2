// Admin AI Insights Engine
// Rule-based insights for admin dashboard (extensible for ML/AI later)

const { pool } = require('../../db');

/**
 * Get admin insights (low stock, slow sellers, recommendations)
 */
async function getAdminInsights() {
  try {
    const [lowStock, slowSellers, highDemand, categoryImbalance] = await Promise.all([
      getLowStockProducts(),
      getSlowSellingProducts(),
      getHighDemandProducts(),
      getCategoryImbalance(),
    ]);

    return {
      low_stock: lowStock,
      slow_sellers: slowSellers,
      high_demand: highDemand,
      category_imbalance: categoryImbalance,
      recommendations: generateRecommendations(lowStock, slowSellers, highDemand, categoryImbalance),
    };
  } catch (error) {
    console.error('Error generating admin insights:', error);
    return {
      low_stock: [],
      slow_sellers: [],
      high_demand: [],
      category_imbalance: [],
      recommendations: [],
    };
  }
}

/**
 * Get products with low stock
 */
async function getLowStockProducts() {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        COALESCE(p.name_ar, p.name_en, p.name, '') as name_ar,
        COALESCE(p.name_en, p.name, '') as name_en,
        COALESCE(p.name, '') as name,
        p.stock_quantity,
        COALESCE(p.unit, 'piece') as unit
      FROM products p
      WHERE p.is_active = true
        AND (p.stock_quantity IS NULL OR p.stock_quantity <= 10)
      ORDER BY COALESCE(p.stock_quantity, 0) ASC
      LIMIT 10
    `);

    return result.rows || [];
  } catch (error) {
    console.error('Error in getLowStockProducts:', error);
    return [];
  }
}

/**
 * Get products that haven't sold in last 7/14 days
 */
async function getSlowSellingProducts() {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        COALESCE(p.name_ar, p.name_en, p.name, '') as name_ar,
        COALESCE(p.name_en, p.name, '') as name_en,
        COALESCE(p.name, '') as name,
        p.stock_quantity,
        p.price,
        (SELECT MAX(o.created_at) FROM order_items oi 
         JOIN orders o ON o.id = oi.order_id 
         WHERE oi.product_id = p.id) as last_sold
      FROM products p
      WHERE p.is_active = true
        AND (
          (SELECT MAX(o.created_at) FROM order_items oi 
           JOIN orders o ON o.id = oi.order_id 
           WHERE oi.product_id = p.id) IS NULL
          OR (SELECT MAX(o.created_at) FROM order_items oi 
              JOIN orders o ON o.id = oi.order_id 
              WHERE oi.product_id = p.id) < NOW() - INTERVAL 14 DAY
        )
      ORDER BY COALESCE((SELECT MAX(o.created_at) FROM order_items oi 
                         JOIN orders o ON o.id = oi.order_id 
                         WHERE oi.product_id = p.id), p.created_at) ASC
      LIMIT 10
    `);

    return result.rows || [];
  } catch (error) {
    console.error('Error in getSlowSellingProducts:', error);
    return [];
  }
}

/**
 * Get high demand products (selling fast)
 */
async function getHighDemandProducts() {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        COALESCE(p.name_ar, p.name_en, p.name, '') as name_ar,
        COALESCE(p.name_en, p.name, '') as name_en,
        COALESCE(p.name, '') as name,
        p.stock_quantity,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE p.is_active = true
        AND (o.created_at >= NOW() - INTERVAL 7 DAY OR o.created_at IS NULL)
      GROUP BY p.id, p.name_ar, p.name_en, p.name, p.stock_quantity
      HAVING COUNT(oi.id) > 0
      ORDER BY COUNT(oi.id) DESC, SUM(oi.quantity) DESC
      LIMIT 10
    `);

    return result.rows || [];
  } catch (error) {
    console.error('Error in getHighDemandProducts:', error);
    return [];
  }
}

/**
 * Get category imbalance (categories with too few products)
 */
async function getCategoryImbalance() {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        COALESCE(c.name_ar, c.name_en, c.name, '') as name_ar,
        COALESCE(c.name_en, c.name, '') as name_en,
        COALESCE(c.name, '') as name,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.is_active = true OR c.is_active IS NULL
      GROUP BY c.id, c.name_ar, c.name_en, c.name
      HAVING COUNT(p.id) < 5
      ORDER BY COUNT(p.id) ASC
      LIMIT 10
    `);

    return result.rows || [];
  } catch (error) {
    console.error('Error in getCategoryImbalance:', error);
    return [];
  }
}

/**
 * Generate human-readable recommendations
 */
function generateRecommendations(lowStock, slowSellers, highDemand, categoryImbalance) {
  const recommendations = [];

  if (lowStock.length > 0) {
    recommendations.push({
      type: 'low_stock',
      priority: 'high',
      title: '???????????? ?????????? ??????????????',
      message: `???????? ${lowStock.length} ???????? ?????????? ?????? ?????????? ?????? ????????????`,
      action: '???????? ???? ?????????????? ???????? ???????????? ??????????',
      products: lowStock.slice(0, 5),
    });
  }

  if (slowSellers.length > 0) {
    recommendations.push({
      type: 'slow_sellers',
      priority: 'medium',
      title: '???????????? ?????????? ??????????',
      message: `???????? ${slowSellers.length} ???????? ???? ?????? ???????? ?????? 14 ??????`,
      action: '?????? ???? ???????????? ???? ?????????? ?????? ????????????????',
      products: slowSellers.slice(0, 5),
    });
  }

  if (highDemand.length > 0) {
    recommendations.push({
      type: 'high_demand',
      priority: 'low',
      title: '???????????? ?????????? ??????????',
      message: `?????? ???????????????? ???????? ??????????: ${highDemand.length} ????????`,
      action: '???????? ???? ???????? ?????????????? ????????????',
      products: highDemand.slice(0, 5),
    });
  }

  if (categoryImbalance.length > 0) {
    recommendations.push({
      type: 'category_imbalance',
      priority: 'medium',
      title: '???????? ?????????? ????????????',
      message: `???????? ${categoryImbalance.length} ?????? ?????????? ?????? ???? 5 ????????????`,
      action: '?????? ???????????? ???????? ???????????? ???????????? ????????????',
      categories: categoryImbalance.slice(0, 5),
    });
  }

  return recommendations;
}

module.exports = {
  getAdminInsights,
  getLowStockProducts,
  getSlowSellingProducts,
  getHighDemandProducts,
  getCategoryImbalance,
};

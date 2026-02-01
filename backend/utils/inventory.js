// Inventory Management - Soft Reserve System

/**
 * Soft reserve inventory for an order
 * @param {Object} client - Database client (from pool.connect())
 * @param {number} storeId - Store ID
 * @param {number} productId - Product ID
 * @param {number} quantity - Quantity to reserve
 * @returns {Promise<boolean>} Success
 */
async function softReserveInventory(client, storeId, productId, quantity) {
  try {
    // Check available quantity
    const checkResult = await client.query(
      `SELECT quantity, is_available 
       FROM store_inventory 
       WHERE store_id = $1 AND product_id = $2`,
      [storeId, productId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error(`Product ${productId} not found in store ${storeId} inventory`);
    }

    const inventory = checkResult.rows[0];
    if (!inventory.is_available) {
      throw new Error(`Product ${productId} is not available in store ${storeId}`);
    }

    if (inventory.quantity < quantity) {
      throw new Error(`Insufficient inventory. Available: ${inventory.quantity}, Requested: ${quantity}`);
    }

    // Soft reserve: Reduce available quantity
    await client.query(
      `UPDATE store_inventory 
       SET quantity = quantity - $1, 
           last_updated = NOW()
       WHERE store_id = $2 AND product_id = $3 
         AND quantity >= $1`,
      [quantity, storeId, productId]
    );

    return true;
  } catch (err) {
    console.error('Soft reserve inventory error:', err);
    throw err;
  }
}

/**
 * Release inventory on order cancellation
 * @param {Object} client - Database client
 * @param {number} orderId - Order ID
 * @returns {Promise<boolean>} Success
 */
async function releaseInventory(client, orderId) {
  try {
    // Get order items with store assignments
    const itemsResult = await client.query(
      `SELECT osa.store_id, osa.product_id, osa.quantity
       FROM order_store_assignments osa
       WHERE osa.order_id = $1`,
      [orderId]
    );

    if (itemsResult.rows.length === 0) {
      // Try order_items as fallback
      const fallbackResult = await client.query(
        `SELECT oi.product_id, oi.quantity, o.store_id
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE oi.order_id = $1 AND o.store_id IS NOT NULL`,
        [orderId]
      );

      for (const item of fallbackResult.rows) {
        await client.query(
          `UPDATE store_inventory 
           SET quantity = quantity + $1, 
               last_updated = NOW()
           WHERE store_id = $2 AND product_id = $3`,
          [item.quantity, item.store_id, item.product_id]
        );
      }
      return true;
    }

    // Release inventory for each item
    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE store_inventory 
         SET quantity = quantity + $1, 
             last_updated = NOW()
         WHERE store_id = $2 AND product_id = $3`,
        [item.quantity, item.store_id, item.product_id]
      );
    }

    return true;
  } catch (err) {
    console.error('Release inventory error:', err);
    throw err;
  }
}

/**
 * Check if product has sufficient inventory
 * @param {Object} pool - Database pool
 * @param {number} storeId - Store ID
 * @param {number} productId - Product ID
 * @param {number} quantity - Required quantity
 * @returns {Promise<boolean>} Has sufficient inventory
 */
async function checkInventory(pool, storeId, productId, quantity) {
  try {
    const result = await pool.query(
      `SELECT quantity, is_available 
       FROM store_inventory 
       WHERE store_id = $1 AND product_id = $2`,
      [storeId, productId]
    );

    if (result.rows.length === 0) return false;
    const inventory = result.rows[0];
    return inventory.is_available && inventory.quantity >= quantity;
  } catch (err) {
    console.error('Check inventory error:', err);
    return false;
  }
}

module.exports = {
  softReserveInventory,
  releaseInventory,
  checkInventory
};

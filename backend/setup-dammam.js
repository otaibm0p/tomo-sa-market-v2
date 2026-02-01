const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db",
});

async function setupDammamInfrastructure() {
    try {
        console.log('🏗️ Setting up Dammam Infrastructure...');

        // 1. Create or Get Dammam Store
        // Check if exists first
        const checkStore = await pool.query("SELECT id FROM stores WHERE code = 'DMM-001'");
        let storeId;
        
        if (checkStore.rows.length > 0) {
            storeId = checkStore.rows[0].id;
            console.log(`ℹ️ Store already exists: ID ${storeId}`);
        } else {
            const storeRes = await pool.query(`
                INSERT INTO stores (name, code, address, latitude, longitude, delivery_radius, is_active)
                VALUES ('Dammam Central Store', 'DMM-001', 'King Fahd Road, Dammam', 26.34633650, 50.05370100, 50.00, true)
                RETURNING id;
            `);
            storeId = storeRes.rows[0].id;
            console.log(`✅ Created Store: Dammam Central Store (ID: ${storeId})`);
        }

        // 2. Stock all products (DELETE first to avoid conflict issues if constraint missing)
        await pool.query('DELETE FROM store_inventory WHERE store_id = $1', [storeId]);
        await pool.query('DELETE FROM store_prices WHERE store_id = $1', [storeId]);

        const productsRes = await pool.query('SELECT id, price FROM products');
        for (const product of productsRes.rows) {
            await pool.query(`
                INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
                VALUES ($1, $2, 100, true);
            `, [storeId, product.id]);
            
            await pool.query(`
                INSERT INTO store_prices (store_id, product_id, price, is_active)
                VALUES ($1, $2, $3, true);
            `, [storeId, product.id, product.price]);
        }
        console.log(`✅ Stocked ${productsRes.rowCount} products in Dammam Store`);

        // 3. Create a Driver in Dammam
        // Check if exists
        const checkDriver = await pool.query("SELECT id FROM users WHERE email = 'driver_dmm@tomo.com'");
        let driverUserId;
        
        if (checkDriver.rows.length > 0) {
             driverUserId = checkDriver.rows[0].id;
             // Update location
             await pool.query(`
                UPDATE drivers SET current_latitude = 26.34600000, current_longitude = 50.05300000, status = 'available'
                WHERE user_id = $1
             `, [driverUserId]);
             console.log('ℹ️ Driver already exists, updated location.');
        } else {
            const driverUserRes = await pool.query(`
                INSERT INTO users (name, email, password_hash, role, is_active)
                VALUES ('Dammam Rider', 'driver_dmm@tomo.com', '$2b$10$YourHashedPasswordHere', 'driver', true)
                RETURNING id;
            `);
            driverUserId = driverUserRes.rows[0].id;

            const driverRes = await pool.query(`
                INSERT INTO drivers (user_id, vehicle_type, plate_number, current_latitude, current_longitude, is_active, is_approved, status)
                VALUES ($1, 'motorcycle', 'DMM-1234', 26.34600000, 50.05300000, true, true, 'available')
                RETURNING id;
            `, [driverUserId]);
            console.log(`✅ Created Driver: Dammam Rider (ID: ${driverRes.rows[0].id})`);
        }

        // 4. Update pending orders (3 and 4)
        await pool.query(`
            UPDATE orders 
            SET store_id = $1, status = 'preparing' 
            WHERE id IN (3, 4) AND status = 'pending';
        `, [storeId]);
        console.log('✅ Updated Orders #3 and #4 to "Preparing"');

        // 5. Fix Assignments
        // Remove old assignments for these orders just in case
        await pool.query('DELETE FROM order_store_assignments WHERE order_id IN (3, 4)');
        
        await pool.query(`
             INSERT INTO order_store_assignments (order_id, store_id, product_id, quantity, unit_price)
             SELECT oi.order_id, $1, oi.product_id, oi.quantity, oi.unit_price
             FROM order_items oi
             WHERE oi.order_id IN (3, 4);
        `, [storeId]);
        console.log('✅ Fixed Order Assignments');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

setupDammamInfrastructure();
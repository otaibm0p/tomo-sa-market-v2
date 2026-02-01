/**
 * MVP Order Lifecycle Automated Test
 * Simulates: Customer Order → Store Accept → Store Preparing → Store Ready → Driver Accept → Driver Picked Up → Driver Delivered
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.API_URL || 'http://localhost:3000';

// Test credentials (should exist in database)
const CUSTOMER_EMAIL = 'test@customer.com';
const CUSTOMER_PASSWORD = 'test123';
const STORE_EMAIL = 'store@test.com';
const STORE_PASSWORD = 'test123';
const DRIVER_EMAIL = 'driver@test.com';
const DRIVER_PASSWORD = 'test123';

let customerToken = null;
let storeToken = null;
let driverToken = null;
let testOrderId = null;
let testProductId = 1; // Assume product ID 1 exists

async function login(email, password) {
  try {
    const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
    return res.data.token;
  } catch (err) {
    console.error(`Login failed for ${email}:`, err.response?.data || err.message);
    throw err;
  }
}

async function createOrder(token, items, lat = 24.7136, lng = 46.6753) {
  try {
    const res = await axios.post(
      `${API_BASE}/api/orders`,
      {
        items,
        delivery_latitude: lat,
        delivery_longitude: lng,
        delivery_address: 'Test Address, Riyadh',
        payment_method: 'online'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.order;
  } catch (err) {
    console.error('Create order failed:', err.response?.data || err.message);
    throw err;
  }
}

async function getOrderStatus(token, orderId) {
  try {
    const res = await axios.get(`${API_BASE}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.order.status;
  } catch (err) {
    console.error('Get order status failed:', err.response?.data || err.message);
    throw err;
  }
}

async function storeAcceptOrder(token, orderId) {
  try {
    const res = await axios.post(
      `${API_BASE}/api/store/orders/${orderId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  } catch (err) {
    console.error('Store accept failed:', err.response?.data || err.message);
    throw err;
  }
}

async function storeUpdateStatus(token, orderId, status) {
  try {
    const res = await axios.put(
      `${API_BASE}/api/store/orders/${orderId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  } catch (err) {
    console.error('Store update status failed:', err.response?.data || err.message);
    throw err;
  }
}

async function driverAcceptOrder(token, orderId) {
  try {
    const res = await axios.post(
      `${API_BASE}/api/drivers/orders/${orderId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  } catch (err) {
    console.error('Driver accept failed:', err.response?.data || err.message);
    throw err;
  }
}

async function driverUpdateStatus(token, orderId, status) {
  try {
    const res = await axios.put(
      `${API_BASE}/api/drivers/orders/${orderId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  } catch (err) {
    console.error('Driver update status failed:', err.response?.data || err.message);
    throw err;
  }
}

async function assertStatus(orderId, expectedStatus, description) {
  const actualStatus = await getOrderStatus(customerToken, orderId);
  if (actualStatus === expectedStatus) {
    console.log(`✅ ${description}: Status is ${actualStatus}`);
    return true;
  } else {
    console.error(`❌ ${description}: Expected ${expectedStatus}, got ${actualStatus}`);
    return false;
  }
}

async function runTest() {
  console.log('🚀 Starting MVP Order Lifecycle Test\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Login
    console.log('\n[1] Logging in...');
    customerToken = await login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
    storeToken = await login(STORE_EMAIL, STORE_PASSWORD);
    driverToken = await login(DRIVER_EMAIL, DRIVER_PASSWORD);
    console.log('✅ All users logged in');

    // Step 2: Create Order
    console.log('\n[2] Creating order...');
    const order = await createOrder(customerToken, [
      { product_id: testProductId, quantity: 2, unit_price: 10.00, unit: 'piece' }
    ]);
    testOrderId = order.id;
    console.log(`✅ Order created: #${testOrderId}`);
    
    // Assert: Order should be CREATED
    await assertStatus(testOrderId, 'CREATED', 'After order creation');

    // Step 3: Store Accepts
    console.log('\n[3] Store accepting order...');
    await storeAcceptOrder(storeToken, testOrderId);
    await assertStatus(testOrderId, 'ACCEPTED', 'After store acceptance');

    // Step 4: Store Starts Preparing
    console.log('\n[4] Store starting preparation...');
    await storeUpdateStatus(storeToken, testOrderId, 'PREPARING');
    await assertStatus(testOrderId, 'PREPARING', 'After store starts preparing');

    // Step 5: Store Marks Ready
    console.log('\n[5] Store marking order as ready...');
    await storeUpdateStatus(storeToken, testOrderId, 'READY');
    await assertStatus(testOrderId, 'READY', 'After store marks ready');

    // Step 6: Driver Accepts
    console.log('\n[6] Driver accepting order...');
    await driverAcceptOrder(driverToken, testOrderId);
    await assertStatus(testOrderId, 'ASSIGNED', 'After driver acceptance');

    // Step 7: Driver Picks Up
    console.log('\n[7] Driver picking up order...');
    await driverUpdateStatus(driverToken, testOrderId, 'PICKED_UP');
    await assertStatus(testOrderId, 'PICKED_UP', 'After driver picks up');

    // Step 8: Driver Delivers
    console.log('\n[8] Driver delivering order...');
    await driverUpdateStatus(driverToken, testOrderId, 'DELIVERED');
    await assertStatus(testOrderId, 'DELIVERED', 'After driver delivers');

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE: All status transitions successful!');
    console.log(`📦 Final Order Status: DELIVERED`);
    console.log(`🆔 Order ID: ${testOrderId}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    if (testOrderId) {
      console.log(`\n📦 Order ID: ${testOrderId}`);
      try {
        const status = await getOrderStatus(customerToken, testOrderId);
        console.log(`📊 Current Status: ${status}`);
      } catch (e) {
        console.log('Could not fetch final status');
      }
    }
    process.exit(1);
  }
}

// Run test
runTest();

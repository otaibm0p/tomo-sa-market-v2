
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tomo_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkAndFixSettings() {
  try {
    console.log('🔌 Connecting to database...');
    console.log(`User: ${process.env.DB_USER}, DB: ${process.env.DB_NAME}`);
    const client = await pool.connect();
    console.log('✅ Connected.');

    // 1. Check shop_settings table
    console.log('🔍 Checking shop_settings table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shop_settings'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ Table shop_settings does not exist. Creating...');
      await client.query(`
        CREATE TABLE shop_settings (
          id SERIAL PRIMARY KEY,
          site_name VARCHAR(255) DEFAULT 'TOMO Market',
          header_logo TEXT,
          footer_logo TEXT,
          phone VARCHAR(50),
          whatsapp VARCHAR(50),
          email VARCHAR(255),
          location VARCHAR(255),
          social_x VARCHAR(255),
          social_instagram VARCHAR(255),
          social_tiktok VARCHAR(255),
          social_snapchat VARCHAR(255),
          free_shipping_threshold DECIMAL(10, 2) DEFAULT 150.00,
          announcement_bar_text TEXT,
          enable_cod BOOLEAN DEFAULT true,
          enable_online_payment BOOLEAN DEFAULT true,
          enable_wallet_payment BOOLEAN DEFAULT true,
          delivery_fee DECIMAL(10, 2) DEFAULT 15.00,
          vat_percentage DECIMAL(5, 2) DEFAULT 15.00,
          primary_color VARCHAR(50) DEFAULT '#2e7d32',
          secondary_color VARCHAR(50) DEFAULT '#d4af37'
        );
      `);
      console.log('✅ Table shop_settings created.');
    } else {
      console.log('✅ Table shop_settings exists.');
    }

    // 2. Check if settings exist
    const settingsCheck = await client.query('SELECT COUNT(*) FROM shop_settings');
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      console.log('⚠️ No settings found. Inserting default settings...');
      await client.query(`
        INSERT INTO shop_settings (
          site_name, phone, whatsapp, email, location, 
          free_shipping_threshold, enable_cod, enable_online_payment, 
          delivery_fee, vat_percentage
        ) VALUES (
          'TOMO Market', '', '', 'admin@tomo-sa.com', 'Saudi Arabia',
          150.00, true, true, 
          15.00, 15.00
        );
      `);
      console.log('✅ Default settings inserted.');
    }

    // 3. Check system_settings table (for automation)
    console.log('🔍 Checking system_settings table...');
    const sysTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_settings'
      );
    `);

    if (!sysTableCheck.rows[0].exists) {
      console.log('⚠️ Table system_settings does not exist. Creating...');
      await client.query(`
        CREATE TABLE system_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT,
          description TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Table system_settings created.');
    } else {
      console.log('✅ Table system_settings exists.');
    }

    // 4. Seed system settings
    const defaultSysSettings = {
      'auto_dispatch_enabled': 'true',
      'auto_assign_on_payment': 'true',
      'auto_select_nearest_rider': 'true',
      'max_assign_distance': '10',
      'max_orders_per_rider': '5',
      'assignment_timeout_seconds': '60'
    };

    for (const [key, value] of Object.entries(defaultSysSettings)) {
      await client.query(`
        INSERT INTO system_settings (key, value) 
        VALUES ($1, $2) 
        ON CONFLICT (key) DO NOTHING;
      `, [key, value]);
    }
    console.log('✅ System settings seeded.');

    client.release();
    console.log('🎉 Done checking/fixing settings tables.');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

checkAndFixSettings();

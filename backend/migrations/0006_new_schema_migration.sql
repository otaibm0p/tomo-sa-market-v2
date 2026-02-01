-- =========================
-- Migration to New Schema
-- Converts from current PostgreSQL schema to new MySQL-compatible schema
-- =========================

-- Note: This is PostgreSQL syntax. For MySQL, adjust AUTO_INCREMENT and ENUM syntax

-- =========================
--  USERS - Update existing table
-- =========================
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30) UNIQUE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Migrate name to full_name if full_name is null
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- Make full_name NOT NULL after migration
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- Update role to match new ENUM values
UPDATE users SET role = 'customer' WHERE role NOT IN ('customer', 'store_staff', 'driver', 'admin');
UPDATE users SET role = 'store_staff' WHERE role = 'store';
UPDATE users SET role = 'driver' WHERE role IN ('rider', 'courier');

-- =========================
--  STORES - Update existing table
-- =========================
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS internal_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS is_open_now BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS address_text VARCHAR(255),
  ADD COLUMN IF NOT EXISTS prep_time_min INTEGER DEFAULT 10;

-- Migrate existing data
UPDATE stores SET 
  internal_name = name,
  lat = latitude,
  lng = longitude,
  address_text = address
WHERE internal_name IS NULL;

-- Make required fields NOT NULL after migration
ALTER TABLE stores 
  ALTER COLUMN internal_name SET NOT NULL,
  ALTER COLUMN lat SET NOT NULL,
  ALTER COLUMN lng SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status, is_open_now, is_busy);
CREATE INDEX IF NOT EXISTS idx_stores_geo ON stores(lat, lng);

-- =========================
--  STORE_USERS - New table
-- =========================
CREATE TABLE IF NOT EXISTS store_users (
  store_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('manager', 'picker', 'cashier', 'viewer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, user_id),
  CONSTRAINT fk_store_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_store_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
--  ZONES - Update existing table
-- =========================
-- Check if delivery_zones exists, if so migrate data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_zones') THEN
    -- Migrate from delivery_zones to zones
    INSERT INTO zones (id, name, is_active, created_at, updated_at)
    SELECT id, COALESCE(name_ar, name_en, 'Zone ' || id), is_active, created_at, updated_at
    FROM delivery_zones
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Ensure zones table exists with correct structure
CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  city VARCHAR(80),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(is_active);

-- =========================
--  STORE_ZONES - New table
-- =========================
CREATE TABLE IF NOT EXISTS store_zones (
  store_id INTEGER NOT NULL,
  zone_id INTEGER NOT NULL,
  priority INTEGER DEFAULT 1,
  PRIMARY KEY (store_id, zone_id),
  CONSTRAINT fk_store_zones_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_store_zones_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- =========================
--  CUSTOMER_ADDRESSES - New table
-- =========================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  label VARCHAR(80),
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  address_text VARCHAR(255),
  zone_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_addr_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_zone ON customer_addresses(zone_id);

-- =========================
--  PRODUCTS - Update existing table
-- =========================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS brand VARCHAR(120),
  ADD COLUMN IF NOT EXISTS category VARCHAR(120),
  ADD COLUMN IF NOT EXISTS unit VARCHAR(40),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- =========================
--  STORE_PRODUCTS - New table (replaces store_inventory)
-- =========================
CREATE TABLE IF NOT EXISTS store_products (
  store_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  in_stock BOOLEAN DEFAULT true,
  stock_qty INTEGER,
  reserved_qty INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_source VARCHAR(20) DEFAULT 'manual' CHECK (last_source IN ('manual', 'csv', 'pos')),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, product_id),
  CONSTRAINT fk_sp_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store_id, is_active, in_stock);

-- Migrate data from store_inventory if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_inventory') THEN
    INSERT INTO store_products (store_id, product_id, price, in_stock, stock_qty, is_active, updated_at)
    SELECT 
      si.store_id,
      si.product_id,
      COALESCE(sp.price, p.price, 0) as price,
      si.is_available as in_stock,
      si.quantity as stock_qty,
      si.is_available as is_active,
      si.last_updated as updated_at
    FROM store_inventory si
    LEFT JOIN products p ON si.product_id = p.id
    LEFT JOIN store_prices sp ON si.store_id = sp.store_id AND si.product_id = sp.product_id
    ON CONFLICT (store_id, product_id) DO NOTHING;
  END IF;
END $$;

-- =========================
--  ORDERS - Major update
-- =========================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS public_code VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id),
  ADD COLUMN IF NOT EXISTS zone_id INTEGER REFERENCES zones(id),
  ADD COLUMN IF NOT EXISTS address_id INTEGER REFERENCES customer_addresses(id),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_payment' CHECK (
    status IN ('pending_payment', 'paid', 'store_accepted', 'preparing', 'ready',
               'driver_assigned', 'picked_up', 'delivered', 'cancelled', 'refunded')
  ),
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (
    payment_status IN ('unpaid', 'paid', 'failed', 'refunded')
  ),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(40),
  ADD COLUMN IF NOT EXISTS notes_customer VARCHAR(500);

-- Generate public_code for existing orders
UPDATE orders 
SET public_code = 'ORD' || LPAD(id::text, 8, '0')
WHERE public_code IS NULL;

-- Migrate existing data
UPDATE orders SET
  subtotal = total_amount,
  total = total_amount,
  payment_status = CASE 
    WHEN status = 'paid' OR status = 'delivered' THEN 'paid'
    WHEN status = 'cancelled' THEN 'refunded'
    ELSE 'unpaid'
  END,
  status = CASE
    WHEN status = 'pending' THEN 'pending_payment'
    WHEN status = 'paid' THEN 'paid'
    WHEN status = 'preparing' THEN 'preparing'
    WHEN status = 'ready' THEN 'ready'
    WHEN status = 'delivered' THEN 'delivered'
    WHEN status = 'cancelled' THEN 'cancelled'
    ELSE 'pending_payment'
  END
WHERE public_code IS NOT NULL;

-- Make required fields NOT NULL after migration
ALTER TABLE orders
  ALTER COLUMN public_code SET NOT NULL,
  ALTER COLUMN store_id SET NOT NULL,
  ALTER COLUMN address_id SET NOT NULL;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_public_code ON orders(public_code);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- =========================
--  ORDER_ITEMS - Update existing table
-- =========================
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(190),
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS qty INTEGER,
  ADD COLUMN IF NOT EXISTS line_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (
    status IN ('active', 'substituted', 'removed')
  );

-- Migrate existing data
UPDATE order_items SET
  product_name = (SELECT name FROM products WHERE id = order_items.product_id),
  unit_price = order_items.unit_price,
  qty = order_items.quantity::INTEGER,
  line_total = order_items.unit_price * order_items.quantity
WHERE product_name IS NULL;

-- Make required fields NOT NULL after migration
ALTER TABLE order_items
  ALTER COLUMN product_name SET NOT NULL,
  ALTER COLUMN unit_price SET NOT NULL,
  ALTER COLUMN qty SET NOT NULL,
  ALTER COLUMN line_total SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- =========================
--  ORDER_STATUS_HISTORY - New table
-- =========================
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  old_status VARCHAR(40),
  new_status VARCHAR(40) NOT NULL,
  actor_type VARCHAR(20) DEFAULT 'system' CHECK (
    actor_type IN ('system', 'customer', 'store', 'driver', 'admin')
  ),
  actor_id INTEGER,
  note VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_osh_order ON order_status_history(order_id, created_at);

-- =========================
--  DRIVERS - Update existing table
-- =========================
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline' CHECK (
    status IN ('offline', 'online', 'busy', 'suspended')
  ),
  ADD COLUMN IF NOT EXISTS last_lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS last_lng NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

-- Migrate existing data
UPDATE drivers SET
  last_lat = current_latitude,
  last_lng = current_longitude,
  last_seen_at = last_location_update,
  status = CASE
    WHEN rider_status = 'available' THEN 'online'
    WHEN rider_status = 'busy' THEN 'busy'
    WHEN is_banned = true THEN 'suspended'
    ELSE 'offline'
  END
WHERE status = 'offline' AND (last_lat IS NULL OR last_lng IS NULL);

-- Ensure user_id is unique and references users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drivers_user_id_key'
  ) THEN
    ALTER TABLE drivers ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- =========================
-- Cleanup old tables (optional - comment out if you want to keep them)
-- =========================
-- DROP TABLE IF EXISTS store_inventory CASCADE;
-- DROP TABLE IF EXISTS store_prices CASCADE;
-- DROP TABLE IF EXISTS delivery_zones CASCADE;

-- =========================
-- Migration Complete
-- =========================

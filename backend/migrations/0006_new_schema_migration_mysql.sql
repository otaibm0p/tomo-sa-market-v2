-- =========================
-- Migration to New Schema (MySQL Version)
-- This is the MySQL-compatible version of the new schema
-- =========================

-- =========================
--  USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(120) NOT NULL,
  phone         VARCHAR(30) NULL,
  email         VARCHAR(190) NULL,
  password_hash VARCHAR(255) NULL,
  role          ENUM('customer','store_staff','driver','admin') NOT NULL DEFAULT 'customer',
  status        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  STORES
-- =========================
CREATE TABLE IF NOT EXISTS stores (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  internal_name   VARCHAR(120) NOT NULL,
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  is_open_now     TINYINT(1) NOT NULL DEFAULT 1,
  is_busy         TINYINT(1) NOT NULL DEFAULT 0,
  lat             DECIMAL(10,7) NOT NULL,
  lng             DECIMAL(10,7) NOT NULL,
  address_text    VARCHAR(255) NULL,
  prep_time_min   INT NOT NULL DEFAULT 10,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stores_status (status, is_open_now, is_busy),
  KEY idx_stores_geo (lat, lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  STORE_USERS
-- =========================
CREATE TABLE IF NOT EXISTS store_users (
  store_id   BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  role       ENUM('manager','picker','cashier','viewer') NOT NULL DEFAULT 'viewer',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, user_id),
  CONSTRAINT fk_store_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_store_users_user  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  ZONES
-- =========================
CREATE TABLE IF NOT EXISTS zones (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120) NOT NULL,
  city          VARCHAR(80) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_zones_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  STORE_ZONES
-- =========================
CREATE TABLE IF NOT EXISTS store_zones (
  store_id  BIGINT UNSIGNED NOT NULL,
  zone_id   BIGINT UNSIGNED NOT NULL,
  priority  INT NOT NULL DEFAULT 1,
  PRIMARY KEY (store_id, zone_id),
  CONSTRAINT fk_store_zones_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_store_zones_zone  FOREIGN KEY (zone_id)  REFERENCES zones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  CUSTOMER_ADDRESSES
-- =========================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id  BIGINT UNSIGNED NOT NULL,
  label        VARCHAR(80) NULL,
  lat          DECIMAL(10,7) NOT NULL,
  lng          DECIMAL(10,7) NOT NULL,
  address_text VARCHAR(255) NULL,
  zone_id      BIGINT UNSIGNED NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_addresses_customer (customer_id),
  KEY idx_addresses_zone (zone_id),
  CONSTRAINT fk_addr_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_addr_zone     FOREIGN KEY (zone_id)     REFERENCES zones(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  PRODUCTS
-- =========================
CREATE TABLE IF NOT EXISTS products (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(190) NOT NULL,
  barcode      VARCHAR(64) NULL,
  brand        VARCHAR(120) NULL,
  category     VARCHAR(120) NULL,
  image_url    VARCHAR(500) NULL,
  unit         VARCHAR(40) NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_barcode (barcode),
  KEY idx_products_active (is_active),
  FULLTEXT KEY ft_products_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  STORE_PRODUCTS
-- =========================
CREATE TABLE IF NOT EXISTS store_products (
  store_id      BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  in_stock      TINYINT(1) NOT NULL DEFAULT 1,
  stock_qty     INT NULL,
  reserved_qty  INT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_source   ENUM('manual','csv','pos') NOT NULL DEFAULT 'manual',
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, product_id),
  KEY idx_store_products_store (store_id, is_active, in_stock),
  CONSTRAINT fk_sp_store   FOREIGN KEY (store_id)   REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  ORDERS
-- =========================
CREATE TABLE IF NOT EXISTS orders (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_code      VARCHAR(20) NOT NULL,
  customer_id      BIGINT UNSIGNED NOT NULL,
  store_id         BIGINT UNSIGNED NOT NULL,
  zone_id          BIGINT UNSIGNED NULL,
  address_id       BIGINT UNSIGNED NOT NULL,
  status           ENUM(
                    'pending_payment','paid',
                    'store_accepted','preparing','ready',
                    'driver_assigned','picked_up','delivered',
                    'cancelled','refunded'
                   ) NOT NULL DEFAULT 'pending_payment',
  subtotal         DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee     DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_fee      DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount         DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency         VARCHAR(10) NOT NULL DEFAULT 'SAR',
  payment_status   ENUM('unpaid','paid','failed','refunded') NOT NULL DEFAULT 'unpaid',
  payment_method   VARCHAR(40) NULL,
  notes_customer   VARCHAR(500) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_public_code (public_code),
  KEY idx_orders_customer (customer_id, created_at),
  KEY idx_orders_store (store_id, status, created_at),
  KEY idx_orders_status (status),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_store    FOREIGN KEY (store_id)    REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_zone     FOREIGN KEY (zone_id)     REFERENCES zones(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_address  FOREIGN KEY (address_id)  REFERENCES customer_addresses(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  ORDER_ITEMS
-- =========================
CREATE TABLE IF NOT EXISTS order_items (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NOT NULL,
  product_name  VARCHAR(190) NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  qty           INT NOT NULL,
  line_total    DECIMAL(10,2) NOT NULL,
  status        ENUM('active','substituted','removed') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  ORDER_STATUS_HISTORY
-- =========================
CREATE TABLE IF NOT EXISTS order_status_history (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    BIGINT UNSIGNED NOT NULL,
  old_status  VARCHAR(40) NULL,
  new_status  VARCHAR(40) NOT NULL,
  actor_type  ENUM('system','customer','store','driver','admin') NOT NULL DEFAULT 'system',
  actor_id    BIGINT UNSIGNED NULL,
  note        VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_osh_order (order_id, created_at),
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
--  DRIVERS
-- =========================
CREATE TABLE IF NOT EXISTS drivers (
  user_id        BIGINT UNSIGNED NOT NULL,
  status         ENUM('offline','online','busy','suspended') NOT NULL DEFAULT 'offline',
  last_lat       DECIMAL(10,7) NULL,
  last_lng       DECIMAL(10,7) NULL,
  last_seen_at   DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_drivers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: Fixed typo from original schema (user_change -> user_id)

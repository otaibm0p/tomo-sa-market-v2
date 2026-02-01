-- =========================
-- Migration: Fix Drivers Table Foreign Key (MySQL Version)
-- Issue: Foreign key might reference user_change instead of user_id
-- Date: 2025-01-24
-- =========================

-- Step 1: Check if table exists and create if not
CREATE TABLE IF NOT EXISTS drivers (
  user_id        BIGINT UNSIGNED NOT NULL,
  phone          VARCHAR(20) NULL,
  vehicle_type   VARCHAR(50) NULL,
  license_number VARCHAR(100) NULL,
  id_number      VARCHAR(20) NULL,
  city           VARCHAR(100) NULL,
  plate_number   VARCHAR(50) NULL,
  identity_card_url TEXT NULL,
  driving_license_url TEXT NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  status         ENUM('offline','online','busy','suspended') NOT NULL DEFAULT 'offline',
  is_approved    TINYINT(1) NOT NULL DEFAULT 0,
  rider_status   ENUM('available','busy','offline') NOT NULL DEFAULT 'offline',
  current_latitude DECIMAL(10,8) NULL,
  current_longitude DECIMAL(10,8) NULL,
  last_lat       DECIMAL(10,7) NULL,
  last_lng       DECIMAL(10,7) NULL,
  last_location_update DATETIME NULL,
  last_seen_at   DATETIME NULL,
  is_banned      TINYINT(1) NOT NULL DEFAULT 0,
  banned_at      DATETIME NULL,
  ban_reason     TEXT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_drivers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Drop incorrect foreign key constraints if they exist
-- Check and drop constraint with wrong column name (user_change)
SET @constraint_name = NULL;

SELECT CONSTRAINT_NAME INTO @constraint_name
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drivers'
  AND REFERENCED_TABLE_NAME = 'users'
  AND (CONSTRAINT_NAME LIKE '%user_change%' OR COLUMN_NAME = 'user_change');

SET @sql = IF(@constraint_name IS NOT NULL,
  CONCAT('ALTER TABLE drivers DROP FOREIGN KEY ', @constraint_name),
  'SELECT "No incorrect foreign key found" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Ensure user_id is PRIMARY KEY
-- Check if PRIMARY KEY exists on user_id
SET @pk_exists = (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'drivers'
    AND COLUMN_NAME = 'user_id'
    AND CONSTRAINT_NAME = 'PRIMARY'
);

-- If PRIMARY KEY doesn't exist on user_id, fix it
SET @sql = IF(@pk_exists = 0,
  'ALTER TABLE drivers DROP PRIMARY KEY, ADD PRIMARY KEY (user_id)',
  'SELECT "PRIMARY KEY already correct on user_id" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Add correct FOREIGN KEY constraint if it doesn't exist
SET @fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'drivers'
    AND COLUMN_NAME = 'user_id'
    AND REFERENCED_TABLE_NAME = 'users'
    AND REFERENCED_COLUMN_NAME = 'id'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE drivers ADD CONSTRAINT fk_drivers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'SELECT "FOREIGN KEY already exists correctly" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Verify the structure
SELECT 
  'Verification Results' AS info,
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drivers'
  AND (CONSTRAINT_NAME = 'PRIMARY' OR REFERENCED_TABLE_NAME = 'users');

-- =========================
-- Migration Complete
-- =========================

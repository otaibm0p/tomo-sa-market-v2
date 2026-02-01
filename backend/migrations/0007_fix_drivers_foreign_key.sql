-- =========================
-- Migration: Fix Drivers Table Foreign Key
-- Issue: Foreign key might reference user_change instead of user_id
-- Date: 2025-01-24
-- =========================

-- =========================
-- PostgreSQL Version
-- =========================

-- Step 1: Check if drivers table exists and has user_id column
DO $$
BEGIN
  -- Verify table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'drivers'
  ) THEN
    RAISE NOTICE 'Table drivers does not exist. Creating it...';
    
    -- Create drivers table with correct structure
    CREATE TABLE drivers (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      phone VARCHAR(20),
      vehicle_type VARCHAR(50),
      license_number VARCHAR(100),
      id_number VARCHAR(20),
      city VARCHAR(100),
      plate_number VARCHAR(50),
      identity_card_url TEXT,
      driving_license_url TEXT,
      is_active BOOLEAN DEFAULT true,
      status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('offline', 'online', 'busy', 'suspended')),
      is_approved BOOLEAN DEFAULT false,
      rider_status VARCHAR(20) DEFAULT 'offline' CHECK (rider_status IN ('available', 'busy', 'offline')),
      current_latitude NUMERIC(10,8),
      current_longitude NUMERIC(10,8),
      last_lat NUMERIC(10,7),
      last_lng NUMERIC(10,7),
      last_location_update TIMESTAMP,
      last_seen_at TIMESTAMP,
      is_banned BOOLEAN DEFAULT false,
      banned_at TIMESTAMP,
      ban_reason TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    RAISE NOTICE 'Table drivers created successfully with user_id as PRIMARY KEY';
  ELSE
    RAISE NOTICE 'Table drivers exists. Proceeding with fixes...';
    
    -- Step 2: Check if user_id column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'drivers' 
      AND column_name = 'user_id'
    ) THEN
      RAISE EXCEPTION 'Column user_id does not exist in drivers table. Please check table structure.';
    END IF;
    
    -- Step 3: Drop any incorrect foreign key constraints
    -- Check for constraint with wrong column name (user_change)
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'drivers'::regclass 
      AND confrelid = 'users'::regclass
      AND conname LIKE '%user_change%'
    ) THEN
      RAISE NOTICE 'Found incorrect foreign key constraint. Dropping it...';
      ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_user_change_fkey;
      ALTER TABLE drivers DROP CONSTRAINT IF EXISTS fk_drivers_user_change;
    END IF;
    
    -- Step 4: Ensure user_id is PRIMARY KEY
    -- Check if user_id is already PRIMARY KEY
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'drivers'::regclass 
      AND contype = 'p'
      AND conkey::text LIKE '%user_id%'
    ) THEN
      RAISE NOTICE 'Making user_id PRIMARY KEY...';
      
      -- If there's an old PRIMARY KEY on 'id', drop it first
      IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'drivers'::regclass 
        AND contype = 'p'
        AND conkey::text LIKE '%id%'
        AND conkey::text NOT LIKE '%user_id%'
      ) THEN
        -- Drop old primary key (if it's on 'id' column)
        ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_pkey;
      END IF;
      
      -- Make user_id PRIMARY KEY
      ALTER TABLE drivers ADD CONSTRAINT drivers_pkey PRIMARY KEY (user_id);
      RAISE NOTICE 'user_id is now PRIMARY KEY';
    ELSE
      RAISE NOTICE 'user_id is already PRIMARY KEY';
    END IF;
    
    -- Step 5: Add correct FOREIGN KEY constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'drivers'::regclass 
      AND confrelid = 'users'::regclass
      AND conname = 'fk_drivers_user'
      AND conkey::text LIKE '%user_id%'
    ) THEN
      RAISE NOTICE 'Adding correct FOREIGN KEY constraint...';
      ALTER TABLE drivers 
      ADD CONSTRAINT fk_drivers_user 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      RAISE NOTICE 'FOREIGN KEY constraint added successfully';
    ELSE
      RAISE NOTICE 'Correct FOREIGN KEY constraint already exists';
    END IF;
    
    -- Step 6: Ensure user_id is UNIQUE (should be automatic with PRIMARY KEY, but just in case)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'drivers'::regclass 
      AND contype = 'u'
      AND conname = 'drivers_user_id_key'
    ) THEN
      ALTER TABLE drivers ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);
    END IF;
    
  END IF;
END $$;

-- Step 7: Verify the final structure
DO $$
DECLARE
  pk_constraint text;
  fk_constraint text;
BEGIN
  -- Check PRIMARY KEY
  SELECT conname INTO pk_constraint
  FROM pg_constraint 
  WHERE conrelid = 'drivers'::regclass 
  AND contype = 'p';
  
  -- Check FOREIGN KEY
  SELECT conname INTO fk_constraint
  FROM pg_constraint 
  WHERE conrelid = 'drivers'::regclass 
  AND confrelid = 'users'::regclass
  AND contype = 'f';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verification Results:';
  RAISE NOTICE 'PRIMARY KEY constraint: %', COALESCE(pk_constraint, 'NOT FOUND');
  RAISE NOTICE 'FOREIGN KEY constraint: %', COALESCE(fk_constraint, 'NOT FOUND');
  RAISE NOTICE '========================================';
END $$;

-- =========================
-- Migration Complete
-- =========================

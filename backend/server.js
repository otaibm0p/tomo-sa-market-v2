// server.js
// TOMO Market Backend (Users + Products + Orders + Frontend)

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const multer = require("multer");
const cron = require("node-cron"); // Automating Logistics
const session = require("express-session");
const cookieParser = require("cookie-parser");

// MVP Utilities
const { validateStatusTransition, mapToMVPStatus, MVP_STATUSES } = require("./utils/orderStatus");
const { softReserveInventory, releaseInventory, checkInventory } = require("./utils/inventory");
const whatsappProvider = require("./providers/whatsappProvider");

// تحميل متغيرات البيئة من .env (إن وجد)
dotenv.config();

// Production environment setup
const NODE_ENV = process.env.NODE_ENV || 'production';
process.env.NODE_ENV = NODE_ENV;

// إنشاء تطبيق إكسبريس
const app = express();
const server = http.createServer(app);

// Socket.IO للـ Real-time Updates
let io;

// Unified order update broadcaster (safe no-op if io is null)
function emitOrderUpdated({ orderId, status, storeId, driverId, userId }) {
  if (!io) return;
  if (!orderId) return;

  const payload = {
    orderId,
    status,
    storeId: storeId || null,
    driverId: driverId || null,
    updatedAt: new Date().toISOString(),
  };

  // Admin
  io.to('admin-all').emit('order.updated', payload);
  io.to('admin-dashboard').emit('order.updated', payload);

  // Store room
  if (storeId) io.to(`store-${storeId}`).emit('order.updated', payload);

  // Driver/Rider room
  if (driverId) {
    io.to(`rider-${driverId}`).emit('order.updated', payload);
    io.to(`driver-${driverId}`).emit('order.updated', payload); // backward
  }

  // Customer
  if (userId) io.to(`customer-${userId}`).emit('order.updated', payload);

  // Order room
  io.to(`order-${orderId}`).emit('order.updated', payload);
}

try {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: {
      origin: [
        'https://tomo-sa.com',
        'https://www.tomo-sa.com',
        'http://tomo-sa.com',
        'http://www.tomo-sa.com',
        process.env.DROPLET_IP ? `http://${process.env.DROPLET_IP}` : 'http://138.68.245.29', // DigitalOcean Droplet IP
        // Development origins (keep for local testing)
        'http://localhost:5173', 
        'http://localhost:5000', 
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5000',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket.IO Connection Handler - Enhanced for Real-time Notifications
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Join store room for branch employees
    socket.on('join-store', (storeId) => {
      socket.join(`store-${storeId}`);
      console.log(`Client ${socket.id} joined store-${storeId}`);
    });

    async function joinRiderRooms(riderId) {
      if (!riderId) return;
      socket.join(`rider-${riderId}`);
      socket.join(`driver-${riderId}`); // Keep backward compatibility
      console.log(`🚴 Rider ${riderId} connected: ${socket.id}`);
      
      // Update rider status to available (Quick Commerce) & Update Last Seen
      try {
        await pool.query(
          'UPDATE drivers SET rider_status = $1, status = $2, last_seen = NOW() WHERE id = $3',
          ['available', 'online', riderId]
        );
        
        // Broadcast rider availability to admin dashboard
        io.to('admin-dashboard').emit('rider-status-updated', {
          rider_id: riderId,
          status: 'available', // Logic will handle this as Online
          last_seen: new Date().toISOString(),
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error updating rider status:', err);
      }
    }

    // Join rider room for Quick Commerce riders
    socket.on('join-rider', (id) => joinRiderRooms(id));
    
    // Backward compatibility: keep join-driver
    socket.on('join-driver', (id) => joinRiderRooms(id));

    // Optional but important tracking rooms
    socket.on('join-order', (orderId) => {
      if (!orderId) return;
      socket.join(`order-${orderId}`);
    });
    socket.on('join-customer', (userId) => {
      if (!userId) return;
      socket.join(`customer-${userId}`);
    });

    // Join admin room for admin users
    socket.on('join-admin', (userId) => {
      socket.join(`admin-${userId}`);
      socket.join('admin-all'); // All admins room
      socket.join('admin-dashboard'); // Elite Dashboard room
      console.log(`Admin ${userId} connected: ${socket.id}`);
    });

    // Join admin dashboard (Elite Dark Store Dashboard)
    socket.on('join-admin-dashboard', () => {
      socket.join('admin-dashboard');
      console.log(`✅ Admin dashboard client connected: ${socket.id}`);
    });

    // Handle rider location updates (Real-time tracking for Quick Commerce)
    socket.on('rider-location-update', async (data) => {
      const { riderId, latitude, longitude } = data;
      try {
        await pool.query(
          `UPDATE drivers 
           SET current_latitude = $1, current_longitude = $2, last_location_update = NOW(), last_seen = NOW()
           WHERE id = $3`,
          [latitude, longitude, riderId]
        );
        
        // Broadcast location to admin dashboard (Real-time tracking)
        io.to('admin-dashboard').emit('rider-location-updated', {
          rider_id: riderId,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        });
        
        // Broadcast to all admins
        io.to('admin-all').emit('driver-location-updated', {
          driverId: riderId,
          latitude,
          longitude,
          timestamp: new Date()
        });
        
        // Emit to order tracking rooms if rider has active orders (Real-time customer tracking)
        const activeOrders = await pool.query(
          `SELECT id, user_id FROM orders 
           WHERE driver_id = $1 AND status IN ('ASSIGNED', 'PICKED_UP')`,
          [riderId]
        );
        
        activeOrders.rows.forEach(order => {
          // Real-time tracking for customer
          io.to(`customer-${order.user_id}`).emit('rider-location-updated', {
            order_id: order.id,
            rider_id: riderId,
            latitude,
            longitude,
            timestamp: new Date().toISOString()
          });
          
          // Also emit to order room
          io.to(`order-${order.id}`).emit('driver-location-updated', {
            driverId: riderId,
            latitude,
            longitude,
            timestamp: new Date()
          });
        });
      } catch (err) {
        console.error('Error updating rider location:', err);
      }
    });
    
    // Backward compatibility: keep driver-location-update
    socket.on('driver-location-update', async (data) => {
      socket.emit('rider-location-update', data);
    });

    socket.on('disconnect', async () => {
      console.log('❌ Client disconnected:', socket.id);
      
      // Try to update driver status to offline if it was a driver
      // Note: This is a best-effort approach since we don't track socket->driver mapping
    });
  });
} catch (err) {
  console.warn('⚠️ Socket.IO not available, real-time updates disabled');
  io = null;
}

// CORS Configuration - Enhanced for Development and Production
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://tomo-sa.com',
      'https://www.tomo-sa.com',
      'http://tomo-sa.com',
      'http://www.tomo-sa.com',
      'http://138.68.245.29', // DigitalOcean Droplet IP
      // Development origins
      'http://localhost:5173',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:5000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`⚠️ [CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'tomo-market-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "uploads", "drivers");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ================= Frontend (public) =================

// نحدد مجلد الواجهة الأمامية بشكل ذكي
// أولاً: نحاول frontend/dist (إذا تم البناء - PRODUCTION)
// ثانياً: نحاول frontend (للتطوير - Vite dev server)
let publicDir = path.join(__dirname, "..", "frontend", "dist");
let indexPath = path.join(publicDir, "index.html");

if (!fs.existsSync(indexPath)) {
  // للتطوير: استخدم frontend directory مباشرة (Vite سيعمل على port 5173)
  publicDir = path.join(__dirname, "..", "frontend");
  indexPath = path.join(publicDir, "index.html");
  if (fs.existsSync(indexPath)) {
    console.log("⚠️ Frontend dist not found. Using frontend directory.");
    console.log("💡 For development, use Vite dev server: cd frontend && npm run dev (runs on port 5173)");
  }
} else {
  console.log("✅ Serving production build from frontend/dist");
}

console.log("📁 Serving frontend from:", publicDir);

// ================= Maintenance Mode & Site Password Protection Middleware =================
// Check if maintenance mode is enabled
async function checkMaintenanceMode(req, res, next) {
  try {
    // Skip maintenance check for API endpoints and admin routes
    // IMPORTANT: Always allow /admin routes to pass through (even in maintenance mode)
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) {
      return next();
    }
    
    // Skip maintenance check for static assets
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
      return next();
    }
    
    // Skip maintenance check for maintenance page itself and maintenance login
    if (req.path === '/maintenance' || req.path === '/maintenance-login' || req.path === '/api/maintenance/check' || req.path === '/api/maintenance/login') {
      return next();
    }
    
    // Check if maintenance mode is enabled
    const maintenanceResult = await pool.query(
      'SELECT value_json FROM site_settings WHERE setting_key = $1',
      ['maintenance_mode']
    );
    
    if (maintenanceResult.rows.length > 0) {
      const maintenance = maintenanceResult.rows[0].value_json;
      
      if (maintenance && maintenance.enabled === true) {
        // Allow access if user has maintenance bypass session
        if (req.session && req.session.maintenance_bypass === true) {
          return next();
        }
        
        // IMPORTANT: Allow root path (/) to pass through if Host is admin subdomain
        // This prevents redirect loop when React Router handles /admin routing
        const host = req.get('host') || '';
        if (req.path === '/' && host.includes('admin.')) {
          return next();
        }
        
        // Redirect to maintenance page for HTML requests
        if (req.accepts('html')) {
          return res.redirect('/maintenance');
        }
        
        // Return 503 for API requests
        return res.status(503).json({ 
          message: maintenance.message_ar || maintenance.message_en || 'Site is under maintenance',
          maintenance_mode: true 
        });
      }
    }
    
    return next();
  } catch (err) {
    console.error('Error checking maintenance mode:', err);
    return next(); // Allow access on error
  }
}

// Check if site password protection is enabled
async function checkSitePassword(req, res, next) {
  try {
    // Skip password check for API endpoints and admin routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) {
      return next();
    }
    
    // Skip password check for static assets
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
      return next();
    }
    
    // Skip password check for visitor login page and maintenance page
    if (req.path === '/visitor-login' || req.path === '/maintenance' || req.path === '/api/visitor/login' || req.path === '/api/visitor/check') {
      return next();
    }
    
    // Check if password protection is enabled
    const settingsResult = await pool.query(
      'SELECT value_json FROM app_settings WHERE setting_key = $1',
      ['site_password']
    );
    
    if (settingsResult.rows.length === 0) {
      return next(); // No password protection configured
    }
    
    const settings = settingsResult.rows[0].value_json;
    
    if (!settings || !settings.enabled) {
      return next(); // Password protection is disabled
    }
    
    // Check if user has authenticated session
    if (req.session && req.session.site_authenticated === true) {
      return next(); // User is authenticated
    }
    
    // Redirect to login page for HTML requests
    if (req.accepts('html')) {
      return res.redirect('/visitor-login');
    }
    
    // Return 401 for API requests
    return res.status(401).json({ 
      message: 'Site password required',
      requires_password: true 
    });
  } catch (err) {
    console.error('Error checking site password:', err);
    return next(); // Allow access on error
  }
}

// Apply maintenance mode middleware first, then password protection
app.use(checkMaintenanceMode);

// Apply password protection middleware (after maintenance mode)
app.use(checkSitePassword);

if (fs.existsSync(indexPath)) {
  app.use(express.static(publicDir));
} else {
  console.warn("⚠️ Frontend index.html not found. Please run 'npm run build' in frontend or use Vite dev server on port 5173");
}

// Serve uploaded files
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ================= Subdomain Route Enforcement Middleware =================
// Enforce route restrictions based on Host header (subdomain)
function enforceSubdomainRouting(req, res, next) {
  const host = req.get('host') || '';
  const path = req.path;
  
  // Always allow static assets
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
    return next();
  }
  
  // Always allow API endpoints (they handle their own auth)
  if (path.startsWith('/api/')) {
    return next();
  }
  
  // Always allow uploads
  if (path.startsWith('/uploads/')) {
    return next();
  }
  
  // Admin subdomain: only allow /admin routes
  if (host.includes('admin.tomo-sa.com')) {
    // Allow /admin routes
    if (path.startsWith('/admin')) {
      return next();
    }
    // Allow root path (will be redirected by nginx, but also allow here for safety)
    if (path === '/') {
      return res.redirect('/admin');
    }
    // Block everything else
    return res.status(404).json({ 
      message: 'Not found',
      error: 'Admin subdomain only allows /admin routes'
    });
  }
  
  // Store subdomain: only allow /store routes
  if (host.includes('store.tomo-sa.com')) {
    // Allow /store routes
    if (path.startsWith('/store')) {
      return next();
    }
    // Allow root path (will be redirected by nginx, but also allow here for safety)
    if (path === '/') {
      return res.redirect('/store');
    }
    // Block everything else
    return res.status(404).json({ 
      message: 'Not found',
      error: 'Store subdomain only allows /store routes'
    });
  }
  
  // Driver subdomain: only allow /driver routes
  if (host.includes('driver.tomo-sa.com')) {
    // Allow /driver routes
    if (path.startsWith('/driver')) {
      return next();
    }
    // Allow root path (will be redirected by nginx, but also allow here for safety)
    if (path === '/') {
      return res.redirect('/driver');
    }
    // Block everything else
    return res.status(404).json({ 
      message: 'Not found',
      error: 'Driver subdomain only allows /driver routes'
    });
  }
  
  // Customer domains (tomo-sa.com, www.tomo-sa.com): allow all public routes
  // Block admin/store/driver routes unless authenticated (handled by auth middleware)
  if (host.includes('tomo-sa.com') && !host.includes('admin.') && !host.includes('store.') && !host.includes('driver.')) {
    // Allow all public routes
    return next();
  }
  
  // Default: allow (for localhost, IP addresses, etc.)
  return next();
}

// Apply subdomain routing enforcement (after static files, before API routes)
app.use(enforceSubdomainRouting);

// ================= API Route Protection by Role =================
// Apply role-based protection to all /api/admin/* routes
app.use('/api/admin/*', (req, res, next) => {
  // Ensure req.user is populated (Bearer token) before role checks.
  // This prevents instant logout loops when admin pages call /api/admin/* endpoints.
  const runRoleCheck = () => {
    verifyHostRole(req, res, () => {
      requireAdminRole(req, res, next);
    });
  };

  if (req.user) return runRoleCheck();
  return authMiddleware(req, res, runRoleCheck);
});

// Apply role-based protection to all /api/store/* routes
app.use('/api/store/*', (req, res, next) => {
  const runRoleCheck = () => {
    verifyHostRole(req, res, () => {
      requireStoreRole(req, res, next);
    });
  };

  if (req.user) return runRoleCheck();
  return authMiddleware(req, res, runRoleCheck);
});

// Apply role-based protection to all /api/driver/* routes
app.use('/api/driver/*', (req, res, next) => {
  const runRoleCheck = () => {
    verifyHostRole(req, res, () => {
      requireDriverRole(req, res, next);
    });
  };

  if (req.user) return runRoleCheck();
  return authMiddleware(req, res, runRoleCheck);
});

// Also protect /api/drivers/* routes (legacy naming)
app.use('/api/drivers/*', (req, res, next) => {
  const runRoleCheck = () => {
    verifyHostRole(req, res, () => {
      requireDriverRole(req, res, next);
    });
  };

  if (req.user) return runRoleCheck();
  return authMiddleware(req, res, runRoleCheck);
});

// NOTE: Catch-all route for React Router is at the END of this file (after all API routes)
// This ensures all API routes are handled first before serving the React app

// ================= إعدادات عامة =================

// Force port 3000 - Unified port configuration
const PORT = process.env.PORT || 3000;

// JWT: required everywhere; length >= 32; no fallback. --create-super-admin skips server so JWT unused.
function getJwtSecret() {
  if (process.argv.includes('--create-super-admin')) return 'create-super-admin-mode-unused';
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is required and must be at least 32 characters. Set it in .env');
  }
  return secret;
}
const JWT_SECRET = getJwtSecret();

// ================= تهيئة قاعدة البيانات (Resilient Connection) =================
// Attempts real connection, falls back to Mock Mode on failure
let pool;
let isDbConnected = false;

try {
  console.log("🔌 [DB] Attempting connection...");
  // Production: always use DATABASE_URL from env. Dev: fallback to localhost with warning.
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes('YOUR_PASSWORD')) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ [DB] DATABASE_URL is required in production. Set it in .env');
      throw new Error('DATABASE_URL required in production');
    }
    connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db";
    console.warn('⚠️ [DB] Using dev fallback (localhost). Set DATABASE_URL in .env for production.');
  }

  const realPool = new Pool({
    connectionString: connectionString,
    connectionTimeoutMillis: 5000 // 5s timeout
  });

  // Attach error handler to prevent crash on idle client error
  realPool.on('error', (err) => {
    console.error('❌ [DB] Unexpected error on idle client:', err.message);
    isDbConnected = false;
  });

  pool = realPool;
  
  // Test connection immediately (Async check)
  pool.query('SELECT NOW()')
    .then(() => {
      console.log('✅ [DB] Connected successfully!');
      isDbConnected = true;
    })
    .catch((err) => {
      console.error('❌ [DB] Initial connection failed:', err.message);
      console.warn('⚠️ [Server] Switching to SIMULATION MODE.');
      isDbConnected = false;
      // We don't replace 'pool' here because it's const/let reference, 
      // but we can flag isDbConnected = false to skip DB logic in routes.
    });

} catch (err) {
  console.error("❌ [DB] Connection setup failed:", err.message);
  console.warn("⚠️ [Server] Using MOCK Database (Simulation Mode).");
  
  // Create Mock Pool
  pool = {
    query: async (text) => {
      // Mock responses for critical initialization queries
      if (text && text.toLowerCase().includes('count')) return { rows: [{ count: 1 }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    on: () => {},
    connect: async () => {},
    end: async () => {}
  };
  isDbConnected = false;
}




// ================= تهيئة قاعدة البيانات =================
async function initDb() {
  try {
    // إضافة دالة حساب المسافة (مهمة جداً للبحث عن أقرب متجر)
    await pool.query(`
      CREATE OR REPLACE FUNCTION calculate_distance(lat1 NUMERIC, lon1 NUMERIC, lat2 NUMERIC, lon2 NUMERIC)
      RETURNS NUMERIC AS $$
      DECLARE
        R NUMERIC := 6371;
        dLat NUMERIC;
        dLon NUMERIC;
        a NUMERIC;
        c NUMERIC;
      BEGIN
        IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
          RETURN 999999;
        END IF;
        dLat := (lat2 - lat1) * PI() / 180;
        dLon := (lon2 - lon1) * PI() / 180;
        a := SIN(dLat/2) * SIN(dLat/2) +
             COS(lat1 * PI() / 180) * COS(lat2 * PI() / 180) *
             SIN(dLon/2) * SIN(dLon/2);
        c := 2 * ATAN2(SQRT(a), SQRT(1-a));
        RETURN R * c;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // جدول المستخدمين - Updated Schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(120) NOT NULL,
        name VARCHAR(100), -- Keep for backward compatibility
        phone VARCHAR(30) UNIQUE,
        email VARCHAR(190) UNIQUE,
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'store_staff', 'driver', 'admin', 'super_admin')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
        is_active BOOLEAN DEFAULT true, -- Keep for backward compatibility
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    try {
      await pool.query('ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT false');
    } catch (e) {
      if (e.code !== '42701') throw e;
    }

    /*
    -- Migrate name to full_name if needed
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name' AND column_name != 'full_name') THEN
        UPDATE users SET full_name = name WHERE full_name IS NULL OR full_name = '';
      END IF;
    END $$;
    
    -- Add indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    */

    // جدول المنتجات - Updated Schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        barcode VARCHAR(64) UNIQUE,
        brand VARCHAR(120),
        category VARCHAR(120),
        image_url VARCHAR(500),
        unit VARCHAR(40),
        price NUMERIC(10,2), -- Keep for backward compatibility
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    /*
    -- Create indexes
    CREATE UNIQUE INDEX IF NOT EXISTS uq_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    */

    // ================= Tables required before orders (FK references) =================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        internal_name VARCHAR(120) NOT NULL DEFAULT '',
        code VARCHAR(50) UNIQUE NOT NULL DEFAULT 'store_1',
        address TEXT,
        address_text VARCHAR(255),
        latitude NUMERIC(10,8),
        longitude NUMERIC(10,8),
        lat NUMERIC(10,7),
        lng NUMERIC(10,7),
        phone VARCHAR(20),
        email VARCHAR(150),
        manager_name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        is_active BOOLEAN DEFAULT true,
        is_open_now BOOLEAN DEFAULT true,
        is_busy BOOLEAN DEFAULT false,
        prep_time_min INTEGER DEFAULT 10,
        delivery_radius NUMERIC(10,2) DEFAULT 10.0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS zones (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        city VARCHAR(80),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        label VARCHAR(80),
        lat NUMERIC(10,7) NOT NULL,
        lng NUMERIC(10,7) NOT NULL,
        address_text VARCHAR(255),
        zone_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_addr_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_addr_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
      );
    `);

    // جدول الطلبات - Updated Schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        public_code VARCHAR(20) UNIQUE,
        customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Keep for backward compatibility
        store_id INTEGER REFERENCES stores(id),
        zone_id INTEGER REFERENCES zones(id),
        address_id INTEGER REFERENCES customer_addresses(id),
        total_amount NUMERIC(10,2) DEFAULT 0, -- Keep for backward compatibility
        total NUMERIC(10,2) DEFAULT 0,
        subtotal NUMERIC(10,2) DEFAULT 0,
        delivery_fee NUMERIC(10,2) DEFAULT 0,
        service_fee NUMERIC(10,2) DEFAULT 0,
        discount NUMERIC(10,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'SAR',
        status VARCHAR(50) DEFAULT 'CREATED' CHECK (
          status IN ('CREATED', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED')
        ),
        payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (
          payment_status IN ('unpaid', 'paid', 'failed', 'refunded')
        ),
        payment_method VARCHAR(40),
        notes_customer VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Generate public_code for existing orders
    await pool.query(`
      UPDATE orders 
      SET public_code = 'ORD' || LPAD(id::text, 8, '0')
      WHERE public_code IS NULL;
    `);
    
    // Migrate user_id to customer_id if needed
    await pool.query(`
      UPDATE orders 
      SET customer_id = user_id 
      WHERE customer_id IS NULL AND user_id IS NOT NULL;
    `);
    
    // Create indexes
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_public_code ON orders(public_code) WHERE public_code IS NOT NULL;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at) WHERE customer_id IS NOT NULL;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id, status, created_at) WHERE store_id IS NOT NULL;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);

    // جدول عناصر الطلب - Updated Schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        product_name VARCHAR(190) NOT NULL,
        quantity NUMERIC(10,3) NOT NULL,
        qty INTEGER, -- New field
        unit_price NUMERIC(10,2) NOT NULL,
        line_total NUMERIC(10,2) NOT NULL,
        unit VARCHAR(20) DEFAULT 'piece',
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'substituted', 'removed'))
      );
    `);
    
    // Migrate existing data
    await pool.query(`
      UPDATE order_items 
      SET 
        product_name = COALESCE(product_name, (SELECT name FROM products WHERE id = order_items.product_id)),
        qty = quantity::INTEGER,
        line_total = COALESCE(line_total, unit_price * quantity)
      WHERE product_name IS NULL OR qty IS NULL OR line_total IS NULL;
    `);
    
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);`);

    // جدول إعدادات المتجر (نحتفظ بسجل واحد فقط)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shop_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        site_name VARCHAR(200),
        header_logo TEXT,
        footer_logo TEXT,
        phone VARCHAR(20),
        whatsapp VARCHAR(20),
        email VARCHAR(150),
        location TEXT,
        social_x VARCHAR(255),
        social_instagram VARCHAR(255),
        social_tiktok VARCHAR(255),
        social_snapchat VARCHAR(255),
        free_shipping_threshold NUMERIC(10,2) DEFAULT 0,
        announcement_bar_text TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      );
    `);

    // إضافة عمود role للمستخدمين
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    // إضافة الأعمدة المفقودة إذا لم تكن موجودة
    await pool.query(`
      ALTER TABLE shop_settings 
      ADD COLUMN IF NOT EXISTS social_snapchat VARCHAR(255),
      ADD COLUMN IF NOT EXISTS site_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS email VARCHAR(150),
      ADD COLUMN IF NOT EXISTS location TEXT,
      ADD COLUMN IF NOT EXISTS enable_cod BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS enable_wallet BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS enable_online_payment BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#1a237e',
      ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#2e7d32',
      ADD COLUMN IF NOT EXISTS banner_image TEXT,
      ADD COLUMN IF NOT EXISTS promo_strip JSONB,
      ADD COLUMN IF NOT EXISTS home_hero JSONB,
      ADD COLUMN IF NOT EXISTS site_links JSONB,
      ADD COLUMN IF NOT EXISTS site_pages JSONB,
      ADD COLUMN IF NOT EXISTS site_support JSONB,
      ADD COLUMN IF NOT EXISTS trust_features JSONB,
      ADD COLUMN IF NOT EXISTS store_status VARCHAR(20) DEFAULT 'open',
      ADD COLUMN IF NOT EXISTS minimum_order_value NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delivery_fee_base NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delivery_fee_per_km NUMERIC(10,2) DEFAULT 0;
    `);

    // جدول Riders (فريق التوصيل السريع)
    await pool.query(`
      -- جدول drivers - Updated Schema (user_id as primary key)
      CREATE TABLE IF NOT EXISTS drivers (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        -- Keep id for backward compatibility if exists
        id INTEGER, -- Will be removed in future migration
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
        -- Rider status for Quick Commerce: available, busy, offline (keep for backward compatibility)
        rider_status VARCHAR(20) DEFAULT 'offline' CHECK (rider_status IN ('available', 'busy', 'offline')),
        current_latitude NUMERIC(10,8),
        current_longitude NUMERIC(10,8),
        last_lat NUMERIC(10,7), -- New schema field
        last_lng NUMERIC(10,7), -- New schema field
        last_location_update TIMESTAMP,
        last_seen_at TIMESTAMP, -- New schema field
        is_banned BOOLEAN DEFAULT false,
        banned_at TIMESTAMP,
        ban_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Migrate existing data if id exists
      DO $$
      BEGIN
        -- If table has id column, migrate to user_id as primary
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'id' AND column_name != 'user_id') THEN
          -- Update last_lat/last_lng from current_latitude/longitude
          UPDATE drivers SET 
            last_lat = current_latitude,
            last_lng = current_longitude,
            last_seen_at = last_location_update
          WHERE (last_lat IS NULL OR last_lng IS NULL) AND (current_latitude IS NOT NULL OR current_longitude IS NOT NULL);
        END IF;
      END $$;
      
      -- Ensure user_id is unique and primary key
      DO $$ 
      BEGIN
        -- If id column exists and user_id doesn't have primary key constraint
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'id') THEN
          -- Make user_id primary if not already
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'drivers_pkey' AND contype = 'p'
          ) THEN
            ALTER TABLE drivers ADD PRIMARY KEY (user_id);
          END IF;
        END IF;
      END $$;
      
      -- Create tracking_history table for orders
      CREATE TABLE IF NOT EXISTS order_tracking_history (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        driver_id INTEGER REFERENCES drivers(user_id), -- Fixed: use user_id instead of id
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ================= Multi-Store System Tables (يجب إنشاؤها قبل api_keys) =================
    // جدول المتاجر - Updated Schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200), -- Keep for backward compatibility
        internal_name VARCHAR(120) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        address TEXT,
        address_text VARCHAR(255),
        latitude NUMERIC(10,8),
        longitude NUMERIC(10,8),
        lat NUMERIC(10,7),
        lng NUMERIC(10,7),
        phone VARCHAR(20),
        email VARCHAR(150),
        manager_name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        is_active BOOLEAN DEFAULT true, -- Keep for backward compatibility
        is_open_now BOOLEAN DEFAULT true,
        is_busy BOOLEAN DEFAULT false,
        prep_time_min INTEGER DEFAULT 10,
        delivery_radius NUMERIC(10,2) DEFAULT 10.0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /*
    -- Migrate existing data
    DO $$
    BEGIN
      UPDATE stores SET 
        internal_name = COALESCE(internal_name, name),
        lat = COALESCE(lat, latitude),
        lng = COALESCE(lng, longitude),
        address_text = COALESCE(address_text, address),
        status = CASE 
          WHEN is_active = true THEN 'active'
          ELSE 'inactive'
        END
      WHERE internal_name IS NULL OR lat IS NULL OR lng IS NULL;
    END $$;
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status, is_open_now, is_busy);
    CREATE INDEX IF NOT EXISTS idx_stores_geo ON stores(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
    */

    // Add PostGIS geometry column for stores (if PostGIS is available)
    try {
      await pool.query(`
        SELECT AddGeometryColumn('stores', 'location', 4326, 'POINT', 2);
      `);
      console.log('✅ PostGIS geometry column added to stores');
    } catch (err) {
      // Column might already exist or PostGIS not available
      if (!err.message.includes('already exists') && !err.message.includes('does not exist')) {
        console.warn('⚠️ Could not add PostGIS geometry column:', err.message);
      }
    }

    // Create spatial index for better performance
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_stores_location ON stores USING GIST(location);
      `);
    } catch (err) {
      // Index might already exist or PostGIS not available
      if (!err.message.includes('already exists')) {
        console.warn('⚠️ Could not create spatial index:', err.message);
      }
    }

    // ================= New Schema Tables =================
    
    // جدول store_users - ربط الموظفين بالمتاجر
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_users (
        store_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('manager', 'picker', 'cashier', 'viewer')),
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (store_id, user_id),
        CONSTRAINT fk_store_users_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        CONSTRAINT fk_store_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    // جدول store_zones - ربط المتاجر بالمناطق
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_zones (
        store_id INTEGER NOT NULL,
        zone_id INTEGER NOT NULL,
        priority INTEGER DEFAULT 1,
        PRIMARY KEY (store_id, zone_id),
        CONSTRAINT fk_store_zones_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        CONSTRAINT fk_store_zones_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
      );
    `);
    
    // جدول customer_addresses - عناوين العملاء
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        label VARCHAR(80),
        lat NUMERIC(10,7) NOT NULL,
        lng NUMERIC(10,7) NOT NULL,
        address_text VARCHAR(255),
        zone_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_addr_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_addr_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_addresses_customer ON customer_addresses(customer_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_addresses_zone ON customer_addresses(zone_id);`);
    
    // جدول store_products - بدلاً من store_inventory
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_products (
        store_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        in_stock BOOLEAN DEFAULT true,
        stock_qty INTEGER,
        reserved_qty INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        last_source VARCHAR(20) DEFAULT 'manual' CHECK (last_source IN ('manual', 'csv', 'pos')),
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (store_id, product_id),
        CONSTRAINT fk_sp_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        CONSTRAINT fk_sp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store_id, is_active, in_stock);`);
    
    // Migrate from store_inventory to store_products if exists
    await pool.query(`
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
    `);
    
    // جدول order_status_history - سجل حالات الطلب
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        old_status VARCHAR(40),
        new_status VARCHAR(40) NOT NULL,
        actor_type VARCHAR(20) DEFAULT 'system' CHECK (actor_type IN ('system', 'customer', 'store', 'driver', 'admin')),
        actor_id INTEGER,
        note VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_osh_order ON order_status_history(order_id, created_at);`);

    // تحديث جدول الطلبات لإضافة معلومات التسليم والبيانات المالية
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES drivers(user_id),
      ADD COLUMN IF NOT EXISTS delivery_address TEXT,
      ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(10,8),
      ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(10,8),
      ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
      ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id),
      ADD COLUMN IF NOT EXISTS eta_minutes INTEGER,
      ADD COLUMN IF NOT EXISTS driver_notification_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS driver_notification_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS escalation_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS driver_commission NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS fixed_commission NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS order_cost NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS order_vat NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS net_profit NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS settlement_completed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'online',
      -- New schema fields
      ADD COLUMN IF NOT EXISTS public_code VARCHAR(20) UNIQUE,
      ADD COLUMN IF NOT EXISTS zone_id INTEGER REFERENCES zones(id),
      ADD COLUMN IF NOT EXISTS address_id INTEGER REFERENCES customer_addresses(id),
      ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'SAR',
      ADD COLUMN IF NOT EXISTS notes_customer VARCHAR(500),
      ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMP;
    `);
    
    // Generate public_code for existing orders if missing
    await pool.query(`
      UPDATE orders 
      SET public_code = 'ORD' || LPAD(id::text, 8, '0')
      WHERE public_code IS NULL;
    `);
    
    // Update status to match MVP schema (map old statuses to MVP statuses)
    await pool.query(`
      UPDATE orders 
      SET status = CASE
        WHEN status IN ('pending', 'pending_payment', 'paid') THEN 'CREATED'
        WHEN status = 'store_accepted' THEN 'ACCEPTED'
        WHEN status = 'preparing' THEN 'PREPARING'
        WHEN status = 'ready' THEN 'READY'
        WHEN status IN ('driver_assigned', 'assigned', 'confirmed') THEN 'ASSIGNED'
        WHEN status IN ('picked_up', 'out_for_delivery') THEN 'PICKED_UP'
        WHEN status IN ('delivered', 'completed') THEN 'DELIVERED'
        WHEN status IN ('cancelled', 'refunded') THEN 'CANCELLED'
        ELSE status
      END
      WHERE status NOT IN ('CREATED', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED')
        OR status IS NULL
    `);
    
    // Create indexes for new fields
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_public_code ON orders(public_code) WHERE public_code IS NOT NULL;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_zone ON orders(zone_id) WHERE zone_id IS NOT NULL;`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_address ON orders(address_id) WHERE address_id IS NOT NULL;`);
    
    // Create tracking_history table (already done above, but ensure it exists)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_tracking_history (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        driver_id INTEGER REFERENCES drivers(user_id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ================= Automated Order Dispatch System Tables =================
    // Dispatch Settings Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dispatch_settings (
        id SERIAL PRIMARY KEY,
        mode VARCHAR(20) DEFAULT 'AUTO_OFFER' CHECK (mode IN ('AUTO_OFFER', 'AUTO_ASSIGN')),
        is_enabled BOOLEAN DEFAULT true,
        offer_timeout_seconds INTEGER DEFAULT 30,
        max_couriers_per_offer INTEGER DEFAULT 5,
        retry_enabled BOOLEAN DEFAULT true,
        max_retries INTEGER DEFAULT 3,
        scoring_weights JSONB DEFAULT '{"distance_weight": 0.4, "performance_weight": 0.3, "fairness_weight": 0.3}',
        fallback_behavior VARCHAR(50) DEFAULT 'notify_admin' CHECK (fallback_behavior IN ('switch_manual', 'notify_admin', 'keep_retrying')),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      );
      
      -- Insert default settings if not exists
      INSERT INTO dispatch_settings (id, mode, is_enabled, offer_timeout_seconds, max_couriers_per_offer, retry_enabled, max_retries, scoring_weights, fallback_behavior)
      VALUES (1, 'AUTO_OFFER', true, 30, 5, true, 3, '{"distance_weight": 0.4, "performance_weight": 0.3, "fairness_weight": 0.3}', 'notify_admin')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Order Dispatch Attempts Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_dispatch_attempts (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        courier_id INTEGER REFERENCES drivers(user_id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('OFFERED', 'ACCEPTED', 'REJECTED', 'TIMEOUT', 'CANCELLED')),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        responded_at TIMESTAMP,
        UNIQUE(order_id, courier_id, attempt_number)
      );
      
      CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_order ON order_dispatch_attempts(order_id);
      CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_courier ON order_dispatch_attempts(courier_id);
      CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_status ON order_dispatch_attempts(status);
    `);

    // Courier Stats Table (for performance tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courier_stats (
        courier_id INTEGER PRIMARY KEY REFERENCES drivers(user_id) ON DELETE CASCADE,
        completed_orders INTEGER DEFAULT 0,
        cancelled_orders INTEGER DEFAULT 0,
        rejected_offers INTEGER DEFAULT 0,
        avg_delivery_time_minutes NUMERIC(10,2),
        last_assigned_at TIMESTAMP,
        performance_score NUMERIC(5,2) DEFAULT 100.0,
        total_distance_km NUMERIC(10,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_courier_stats_performance ON courier_stats(performance_score);
      CREATE INDEX IF NOT EXISTS idx_courier_stats_last_assigned ON courier_stats(last_assigned_at);
    `);

    // جدول تقييمات Riders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_ratings (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        driver_id INTEGER REFERENCES drivers(user_id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // جدول الفئات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        image_url TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // إضافة أعمدة اللغات للتصنيفات
    await pool.query(`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS name_ar VARCHAR(200),
      ADD COLUMN IF NOT EXISTS name_en VARCHAR(200),
      ADD COLUMN IF NOT EXISTS description_ar TEXT,
      ADD COLUMN IF NOT EXISTS description_en TEXT;
    `);

    // نسخ البيانات الموجودة من name إلى name_ar إذا كان name_ar فارغاً
    await pool.query(`
      UPDATE categories 
      SET name_ar = COALESCE(name_ar, name)
      WHERE name_ar IS NULL OR name_ar = '';
    `);

    // نسخ البيانات الموجودة من description إلى description_ar إذا كان description_ar فارغاً
    await pool.query(`
      UPDATE categories 
      SET description_ar = COALESCE(description_ar, description)
      WHERE (description_ar IS NULL OR description_ar = '') AND description IS NOT NULL;
    `);

    // إضافة category_id للمنتجات
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
      ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'piece',
      ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS unit_step NUMERIC(10,3) DEFAULT 1,
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS name_ar VARCHAR(200),
      ADD COLUMN IF NOT EXISTS name_en VARCHAR(200),
      ADD COLUMN IF NOT EXISTS description_ar TEXT,
      ADD COLUMN IF NOT EXISTS description_en TEXT;
    `);

    // نسخ البيانات الموجودة من name إلى name_ar إذا كان name_ar فارغاً
    await pool.query(`
      UPDATE products 
      SET name_ar = COALESCE(name_ar, name)
      WHERE name_ar IS NULL OR name_ar = '';
    `);

    // نسخ البيانات الموجودة من description إلى description_ar إذا كان description_ar فارغاً
    await pool.query(`
      UPDATE products 
      SET description_ar = COALESCE(description_ar, description)
      WHERE (description_ar IS NULL OR description_ar = '') AND description IS NOT NULL;
    `);

    // ================= PostGIS Extension for Geofencing =================
    // Enable PostGIS extension for advanced geospatial operations
    try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
      console.log('✅ PostGIS extension enabled');
    } catch (err) {
      console.warn('⚠️ PostGIS extension not available (this is OK if not installed):', err.message);
    }


    // Update existing stores to populate location geometry from latitude/longitude
    try {
      await pool.query(`
        UPDATE stores 
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
        WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;
      `);
    } catch (err) {
      // PostGIS might not be available
      if (!err.message.includes('does not exist')) {
        console.warn('⚠️ Could not update store locations:', err.message);
      }
    }

    // ================= Premium Homepage & Product Features Tables =================
    
    // جدول إعدادات الصفحة الرئيسية (Homepage Sections)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homepage_sections (
        id SERIAL PRIMARY KEY,
        section_key VARCHAR(50) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT true,
        title_ar VARCHAR(200),
        title_en VARCHAR(200),
        layout_type VARCHAR(20) DEFAULT 'slider' CHECK (layout_type IN ('slider', 'grid')),
        item_limit INTEGER DEFAULT 10,
        sort_mode VARCHAR(50) DEFAULT 'default',
        image_ratio VARCHAR(10) DEFAULT '1:1' CHECK (image_ratio IN ('1:1', '4:5')),
        hide_missing_images BOOLEAN DEFAULT false,
        cta_text_ar VARCHAR(100),
        cta_text_en VARCHAR(100),
        cta_link VARCHAR(500),
        sort_priority INTEGER DEFAULT 0,
        config_json JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // جدول صور المنتجات (Product Images Gallery)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(product_id, sort_order)
      );
    `);

    // إنشاء فهرس لتحسين الأداء
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true;
    `);

    // جدول الإعدادات العامة (Global Settings)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        value_json JSONB DEFAULT '{}',
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // تهيئة أقسام الصفحة الرئيسية الافتراضية
    await pool.query(`
      INSERT INTO homepage_sections (section_key, enabled, title_ar, title_en, layout_type, item_limit, sort_mode, image_ratio, sort_priority)
      VALUES 
        ('best_sellers', true, 'الأكثر مبيعاً', 'Best Sellers', 'slider', 10, 'popularity', '1:1', 1),
        ('deals_of_day', true, 'عروض اليوم', 'Deals of the Day', 'slider', 12, 'deals', '1:1', 2),
        ('featured', true, 'منتجات مميزة', 'Featured Products', 'slider', 10, 'featured', '1:1', 0)
      ON CONFLICT (section_key) DO NOTHING;
    `);

    // تهيئة إعدادات الشحن والإرجاع
    await pool.query(`
      INSERT INTO app_settings (setting_key, value_json, description)
      VALUES 
        ('shipping_policy', '{"ar": "سياسة الشحن", "en": "Shipping Policy"}', 'Shipping policy text'),
        ('returns_policy', '{"ar": "سياسة الإرجاع", "en": "Returns Policy"}', 'Returns policy text')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    // تهيئة إعدادات قفل الموقع
    await pool.query(`
      INSERT INTO app_settings (setting_key, value_json, description)
      VALUES 
        ('site_password', '{"enabled": false, "password_hash": ""}', 'Site password protection for visitors')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    // جدول الصفحات الثابتة (Static Pages CMS)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS static_pages (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) UNIQUE NOT NULL,
        title_ar TEXT,
        title_en TEXT,
        content_ar TEXT,
        content_en TEXT,
        is_published BOOLEAN DEFAULT true,
        meta_description_ar TEXT,
        meta_description_en TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // إنشاء فهرس لتحسين الأداء
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_static_pages_slug ON static_pages(slug);
      CREATE INDEX IF NOT EXISTS idx_static_pages_published ON static_pages(is_published) WHERE is_published = true;
    `);

    // تهيئة الصفحات الثابتة الافتراضية
    await pool.query(`
      INSERT INTO static_pages (slug, title_ar, title_en, content_ar, content_en, is_published)
      VALUES 
        ('about', 'من نحن', 'About Us', 'محتوى صفحة من نحن', 'About Us content', true),
        ('privacy', 'سياسة الخصوصية', 'Privacy Policy', 'محتوى سياسة الخصوصية', 'Privacy Policy content', true),
        ('terms', 'الشروط والأحكام', 'Terms & Conditions', 'محتوى الشروط والأحكام', 'Terms & Conditions content', true),
        ('shipping-returns', 'الشحن والاسترجاع', 'Shipping & Returns', 'محتوى الشحن والاسترجاع', 'Shipping & Returns content', true),
        ('contact', 'تواصل معنا', 'Contact Us', 'محتوى صفحة التواصل', 'Contact Us content', true)
      ON CONFLICT (slug) DO NOTHING;
    `);

    // جدول إعدادات الموقع (Site Settings) - للفوتر والإعدادات العامة
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        value_json JSONB DEFAULT '{}',
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // تهيئة إعدادات الفوتر الافتراضية
    await pool.query(`
      INSERT INTO site_settings (setting_key, value_json, description)
      VALUES 
        ('footer_config', '{
          "columns": [
            {
              "id": "col1",
              "type": "about",
              "title_ar": "من نحن",
              "title_en": "About Us",
              "content_ar": "متجرنا يوفر أفضل المنتجات بجودة عالية وتوصيل سريع.",
              "content_en": "Our store provides the best products with high quality and fast delivery.",
              "enabled": true,
              "order": 1
            },
            {
              "id": "col2",
              "type": "links",
              "title_ar": "روابط سريعة",
              "title_en": "Quick Links",
              "links": [
                {"label_ar": "الرئيسية", "label_en": "Home", "url": "/", "order": 1},
                {"label_ar": "المنتجات", "label_en": "Products", "url": "/categories", "order": 2},
                {"label_ar": "تتبع الطلب", "label_en": "Track Order", "url": "/orders", "order": 3}
              ],
              "enabled": true,
              "order": 2
            },
            {
              "id": "col3",
              "type": "contact",
              "title_ar": "تواصل معنا",
              "title_en": "Contact Us",
              "phone": "",
              "whatsapp": "",
              "email": "",
              "address_ar": "",
              "address_en": "",
              "enabled": true,
              "order": 3
            },
            {
              "id": "col4",
              "type": "social",
              "title_ar": "تابعنا",
              "title_en": "Follow Us",
              "social_links": [],
              "enabled": true,
              "order": 4
            }
          ],
          "bottom_bar": {
            "copyright_text_ar": "جميع الحقوق محفوظة",
            "copyright_text_en": "All rights reserved",
            "company_name": "TOMO Market",
            "show_year": true
          }
        }', 'Footer configuration'),
        ('contact_info', '{
          "phone": "",
          "whatsapp": "",
          "email": "",
          "address_ar": "",
          "address_en": ""
        }', 'Contact information'),
        ('social_links', '{
          "instagram": "",
          "x": "",
          "tiktok": "",
          "snapchat": "",
          "facebook": "",
          "youtube": ""
        }', 'Social media links'),

        -- Customer pricing display controls (Admin-driven)
        ('ui_pricing_display', '{
          "hide_shipping_cost_line_item": true,
          "delivery_fee_label_ar": "رسوم التوصيل",
          "delivery_fee_label_en": "Delivery fee",
          "show_delivery_fee_line": true,
          "show_service_fee_line": false,
          "service_fee_label_ar": "رسوم الخدمة",
          "service_fee_label_en": "Service fee",
          "show_free_delivery_threshold": true,
          "free_delivery_over_amount": 150
        }', 'Pricing lines visibility + labels (AR/EN)'),

        -- Operations SLA & timer settings (Admin-driven)
        ('operations_sla', '{
          "customer_timer_enabled": true,
          "target_minutes": 45,
          "thresholds": {
            "green_minutes": 35,
            "yellow_minutes": 45,
            "red_minutes": 60
          }
        }', 'SLA targets and timer thresholds'),

        -- Maintenance mode settings
        ('maintenance_mode', '{
          "enabled": false,
          "message_ar": "نقوم بإجراء صيانة على الموقع. سنعود قريباً!",
          "message_en": "We are performing maintenance on the site. We will be back soon!",
          "title_ar": "الموقع قيد الصيانة",
          "title_en": "Site Under Maintenance",
          "maintenance_password_hash": null
        }', 'Maintenance mode settings'),

        -- Product page settings (Admin-driven)
        ('product_page_settings', '{
          "show_brand": true,
          "show_origin_country": true,
          "tabs": {
            "description": true,
            "ingredients": true,
            "nutrition": true,
            "allergens": true,
            "storage": true
          },
          "similar_products_limit": 8,
          "similar_products_fallback": "brand"
        }', 'Product page toggles + similar products config')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    // نقل الصور الموجودة من image_url إلى product_images إذا لم تكن موجودة
    await pool.query(`
      INSERT INTO product_images (product_id, url, sort_order, is_primary)
      SELECT id, image_url, 0, true
      FROM products
      WHERE image_url IS NOT NULL 
        AND image_url != ''
        AND image_url != 'null'
        AND NOT EXISTS (
          SELECT 1 FROM product_images WHERE product_id = products.id
        )
      ON CONFLICT DO NOTHING;
    `);

    // جدول المخزون لكل متجر
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_inventory (
        id SERIAL PRIMARY KEY,
        store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 10,
        is_available BOOLEAN DEFAULT true,
        last_updated TIMESTAMP DEFAULT NOW(),
        UNIQUE(store_id, product_id)
      );
    `);

    // إضافة barcode لـ store_inventory
    await pool.query(`
      ALTER TABLE store_inventory 
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
    `);

    // جدول API Keys للـ POS Systems
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key_name VARCHAR(200) NOT NULL,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        store_id INTEGER REFERENCES stores(id),
        is_active BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      );
    `);

    // جدول Sync Logs لتتبع طلبات POS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        api_key_id INTEGER REFERENCES api_keys(id),
        store_id INTEGER REFERENCES stores(id),
        barcode VARCHAR(100),
        product_id INTEGER REFERENCES products(id),
        quantity_sold INTEGER NOT NULL,
        quantity_before INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'success',
        error_message TEXT,
        request_data JSONB,
        response_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // فهرس للأداء
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_store_inventory_barcode ON store_inventory(barcode, store_id);
      CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
    `);

    // تحديث free_shipping_threshold الافتراضي إلى 150
    await pool.query(`
      UPDATE shop_settings 
      SET free_shipping_threshold = 150.00 
      WHERE id = 1 AND free_shipping_threshold = 0;
    `);

    // جدول Footer Settings (Dynamic Footer Management)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS footer_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        contact_phone VARCHAR(20),
        contact_email VARCHAR(150),
        contact_whatsapp VARCHAR(20),
        support_phone VARCHAR(20),
        social_links JSONB DEFAULT '[]'::jsonb,
        page_links JSONB DEFAULT '[]'::jsonb,
        link_categories JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT single_footer_row CHECK (id = 1)
      );
    `);

    // جدول Driver Notifications (لإشعارات المناديب)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_notifications (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        driver_id INTEGER REFERENCES drivers(user_id) ON DELETE CASCADE,
        notification_type VARCHAR(50) DEFAULT 'order_assignment',
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_driver_notifications_order ON driver_notifications(order_id);
      CREATE INDEX IF NOT EXISTS idx_driver_notifications_driver ON driver_notifications(driver_id);
      CREATE INDEX IF NOT EXISTS idx_driver_notifications_status ON driver_notifications(status);
    `);

    // جدول Staff Permissions (صلاحيات الموظفين)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
        can_accept_orders BOOLEAN DEFAULT true,
        can_prepare_orders BOOLEAN DEFAULT true,
        can_update_inventory BOOLEAN DEFAULT true,
        can_print_invoices BOOLEAN DEFAULT true,
        can_view_reports BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, store_id)
      );
      CREATE INDEX IF NOT EXISTS idx_staff_permissions_user ON staff_permissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_staff_permissions_store ON staff_permissions(store_id);
    `);

    // جدول Hero Slider (للتحكم من قبل الأدمن)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hero_slides (
        id SERIAL PRIMARY KEY,
        title_ar VARCHAR(200),
        title_en VARCHAR(200),
        subtitle_ar VARCHAR(300),
        subtitle_en VARCHAR(300),
        image_url TEXT NOT NULL,
        bg_gradient VARCHAR(100),
        link_url TEXT,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // إضافة featured و discount_price للمنتجات
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS discount_price NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS discount_percentage INTEGER,
      ADD COLUMN IF NOT EXISTS deal_end_time TIMESTAMP;
    `);

    // ================= Advanced RBAC & Business Logic Tables =================
    
    // Audit Log Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_name VARCHAR(100),
        user_role VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    `);

    // Internal notes (orders + riders) - for ops console and audit
    await pool.query(`
      CREATE TABLE IF NOT EXISTS internal_notes (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(20) NOT NULL,
        entity_id INTEGER NOT NULL,
        note TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_internal_notes_entity ON internal_notes(entity_type, entity_id);
    `);

    // Category Markup Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS category_markups (
        id SERIAL PRIMARY KEY,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        markup_percentage NUMERIC(5,2) NOT NULL,
        vat_percentage NUMERIC(5,2) DEFAULT 15.00,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(category_id)
      );
    `);

    // Product Cost & Override Table
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS vat_percentage NUMERIC(5,2) DEFAULT 15.00,
      ADD COLUMN IF NOT EXISTS override_markup BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS custom_markup_percentage NUMERIC(5,2);
    `);

    // Courier Wallet Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courier_wallets (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER UNIQUE REFERENCES drivers(user_id) ON DELETE CASCADE,
        cod_balance NUMERIC(10,2) DEFAULT 0.00,
        payable_balance NUMERIC(10,2) DEFAULT 0.00,
        total_collected NUMERIC(10,2) DEFAULT 0.00,
        total_returned NUMERIC(10,2) DEFAULT 0.00,
        last_updated TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Add payable_balance column if it doesn't exist (migration)
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'courier_wallets' AND column_name = 'payable_balance') THEN
          ALTER TABLE courier_wallets ADD COLUMN payable_balance NUMERIC(10,2) DEFAULT 0.00;
        END IF;
      END $$;
    `);

    // Delivery Zones Table
    await pool.query(`
      -- جدول zones - Updated Schema (مبسط)
      CREATE TABLE IF NOT EXISTS zones (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        city VARCHAR(80),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Keep delivery_zones for backward compatibility, but migrate to zones
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id SERIAL PRIMARY KEY,
        name_ar VARCHAR(200),
        name_en VARCHAR(200),
        description TEXT,
        polygon_coordinates JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Migrate delivery_zones to zones if needed
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_zones') THEN
          INSERT INTO zones (id, name, is_active, created_at, updated_at)
          SELECT id, COALESCE(name_ar, name_en, 'Zone ' || id), is_active, created_at, NOW()
          FROM delivery_zones
          ON CONFLICT (id) DO NOTHING;
        END IF;
      END $$;
      
      CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(is_active);
    `);

    // Driver Zone Assignment
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_zones (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER REFERENCES drivers(user_id) ON DELETE CASCADE,
        zone_id INTEGER REFERENCES delivery_zones(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT false,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(driver_id, zone_id)
      );
    `);

    // Coupons Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name_ar VARCHAR(200),
        name_en VARCHAR(200),
        description_ar TEXT,
        description_en TEXT,
        discount_type VARCHAR(20) NOT NULL, -- 'percentage' or 'fixed'
        discount_value NUMERIC(10,2) NOT NULL,
        min_purchase_amount NUMERIC(10,2) DEFAULT 0,
        max_discount_amount NUMERIC(10,2),
        usage_limit INTEGER,
        used_count INTEGER DEFAULT 0,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
      CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_from, valid_until);
    `);

    // BOGO Offers Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bogo_offers (
        id SERIAL PRIMARY KEY,
        name_ar VARCHAR(200),
        name_en VARCHAR(200),
        buy_product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        get_product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        buy_quantity INTEGER DEFAULT 1,
        get_quantity INTEGER DEFAULT 1,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Flash Sales Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flash_sales (
        id SERIAL PRIMARY KEY,
        name_ar VARCHAR(200),
        name_en VARCHAR(200),
        description_ar TEXT,
        description_en TEXT,
        discount_percentage NUMERIC(5,2) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Flash Sale Products (Many-to-Many)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flash_sale_products (
        id SERIAL PRIMARY KEY,
        flash_sale_id INTEGER REFERENCES flash_sales(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        sale_price NUMERIC(10,2),
        stock_limit INTEGER,
        sold_count INTEGER DEFAULT 0,
        UNIQUE(flash_sale_id, product_id)
      );
    `);

    // ================= Advanced Employee & Task Management Tables =================
    
    // Employee Tasks Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title_ar VARCHAR(200),
        title_en VARCHAR(200),
        description_ar TEXT,
        description_en TEXT,
        task_type VARCHAR(50), -- 'daily', 'kpi', 'project'
        due_date DATE,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
        priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
        assigned_by INTEGER REFERENCES users(id),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_employee_tasks_user_id ON employee_tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_employee_tasks_status ON employee_tasks(status);
    `);

    // Custom Permissions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        permission_key VARCHAR(100) NOT NULL, -- e.g., 'edit_images', 'edit_prices', 'view_reports'
        granted BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, permission_key)
      );
      CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
    `);

    // ================= Enterprise Role-Based Access Control (RBAC) =================
    // Role Permissions Definition Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role VARCHAR(50) NOT NULL UNIQUE,
        permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
        description_ar TEXT,
        description_en TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Initialize default role permissions
    const defaultRoles = [
      {
        role: 'super_admin',
        permissions: {
          all: true,
          manage_users: true,
          manage_products: true,
          manage_orders: true,
          manage_stores: true,
          manage_finance: true,
          manage_marketing: true,
          manage_drivers: true,
          view_reports: true,
          manage_settings: true,
          manage_footer: true
        },
        description_ar: 'الآدمن العام - صلاحيات كاملة',
        description_en: 'Super Admin - Full Access'
      },
      {
        role: 'admin',
        permissions: {
          manage_products: true,
          manage_orders: true,
          manage_stores: true,
          view_reports: true,
          manage_settings: true
        },
        description_ar: 'مدير عام',
        description_en: 'General Admin'
      },
      {
        role: 'finance_manager',
        permissions: {
          view_orders: true,
          manage_payments: true,
          view_reports: true,
          manage_supplier_payments: true,
          manage_expenses: true,
          view_financial_reports: true
        },
        description_ar: 'مدير المالية',
        description_en: 'Finance Manager'
      },
      {
        role: 'marketing_manager',
        permissions: {
          manage_products: true,
          manage_promotions: true,
          manage_coupons: true,
          manage_hero_slider: true,
          view_reports: true,
          manage_footer: true
        },
        description_ar: 'مدير التسويق',
        description_en: 'Marketing Manager'
      },
      {
        role: 'ops_manager',
        permissions: {
          view_orders: true,
          manage_orders: true,
          live_dispatch: true,
          view_riders: true,
          manage_riders: true,
          view_tracking: true,
          sla_timers: true
        },
        description_ar: 'مدير العمليات',
        description_en: 'Operations Manager'
      },
      {
        role: 'store_manager',
        permissions: {
          view_products: true,
          manage_products: true,
          view_categories: true,
          manage_categories: true,
          view_orders: true
        },
        description_ar: 'مدير المتجر',
        description_en: 'Store Manager'
      },
      {
        role: 'accounting',
        permissions: {
          view_finance_dashboard: true,
          view_reports: true,
          exports_csv: true,
          view_settlements: true
        },
        description_ar: 'المحاسبة',
        description_en: 'Accounting'
      },
      {
        role: 'marketing',
        permissions: {
          manage_site_content: true,
          manage_promo_strip: true,
          manage_home_hero: true,
          manage_site_links: true,
          manage_support_settings: true,
          manage_campaigns: true,
          manage_utm_builder: true,
          manage_coupons: true
        },
        description_ar: 'التسويق',
        description_en: 'Marketing'
      },
      {
        role: 'branch_employee',
        permissions: {
          view_orders: true,
          accept_orders: true,
          prepare_orders: true,
          update_inventory: true,
          print_invoices: true
        },
        description_ar: 'موظف الفرع',
        description_en: 'Branch Employee'
      },
      {
        role: 'driver',
        permissions: {
          view_assigned_orders: true,
          update_order_status: true,
          update_location: true,
          view_wallet: true
        },
        description_ar: 'Rider التوصيل السريع',
        description_en: 'Delivery Driver'
      },
      {
        role: 'customer',
        permissions: {
          view_products: true,
          place_orders: true,
          view_own_orders: true
        },
        description_ar: 'عميل',
        description_en: 'Customer'
      }
    ];

    for (const roleData of defaultRoles) {
      await pool.query(`
        INSERT INTO role_permissions (role, permissions, description_ar, description_en)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (role) DO UPDATE SET
          permissions = EXCLUDED.permissions,
          description_ar = EXCLUDED.description_ar,
          description_en = EXCLUDED.description_en,
          updated_at = NOW();
      `, [roleData.role, JSON.stringify(roleData.permissions), roleData.description_ar, roleData.description_en]);
    }

    // Performance Tracking Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        metric_type VARCHAR(50) NOT NULL, -- 'coupon_usage', 'banner_ctr', 'stock_accuracy', 'order_completion'
        metric_value NUMERIC(10,2),
        metric_date DATE NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, metric_type, metric_date)
      );
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
    `);

    // Attendance Log Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL, -- 'login', 'logout'
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON attendance_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_logs_created_at ON attendance_logs(created_at);
    `);

    // ================= Advanced Accounting Tables =================
    
    // Supplier Payments Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id SERIAL PRIMARY KEY,
        supplier_name VARCHAR(200) NOT NULL,
        invoice_number VARCHAR(100),
        invoice_date DATE,
        amount NUMERIC(10,2) NOT NULL,
        vat_amount NUMERIC(10,2) DEFAULT 0,
        total_amount NUMERIC(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'partial', 'overdue'
        payment_date DATE,
        payment_method VARCHAR(50),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_status ON supplier_payments(status);
      CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(invoice_date);
    `);

    // Operational Expenses Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS operational_expenses (
        id SERIAL PRIMARY KEY,
        expense_category VARCHAR(100) NOT NULL, -- 'rent', 'utilities', 'salaries', 'marketing', 'other'
        description TEXT,
        amount NUMERIC(10,2) NOT NULL,
        expense_date DATE NOT NULL,
        receipt_url TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_operational_expenses_category ON operational_expenses(expense_category);
      CREATE INDEX IF NOT EXISTS idx_operational_expenses_date ON operational_expenses(expense_date);
    `);

    // Profit Margin Tracking (for leakage detection)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profit_margin_history (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id),
        cost_price NUMERIC(10,2),
        sale_price NUMERIC(10,2),
        expected_margin_percentage NUMERIC(5,2),
        actual_margin_percentage NUMERIC(5,2),
        margin_leakage NUMERIC(10,2), -- difference between expected and actual
        recorded_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_profit_margin_product_id ON profit_margin_history(product_id);
      CREATE INDEX IF NOT EXISTS idx_profit_margin_recorded_at ON profit_margin_history(recorded_at);
    `);

    // إدراج إعدادات افتراضية للمتجر
    const settingsCount = await pool.query('SELECT COUNT(*)::int AS count FROM shop_settings;');
    if (settingsCount.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO shop_settings (
          phone, whatsapp, free_shipping_threshold, announcement_bar_text
        ) VALUES (
          '', '', 100.00, 'مرحباً بك في TOMO Market! 🛒'
        );
      `);
    }

    // إدراج شرائح افتراضية للـ Hero Slider
    const slidesCount = await pool.query('SELECT COUNT(*)::int AS count FROM hero_slides;');
    if (slidesCount.rows[0].count === 0) {
      await pool.query(`
        INSERT INTO hero_slides (title_ar, title_en, subtitle_ar, subtitle_en, image_url, bg_gradient, display_order) VALUES
        ('تسوق طازج ومضمون', 'Fresh Groceries Delivered', 'احصل على أفضل المنتجات عند بابك', 'Get the best products at your doorstep', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80', 'from-emerald-500 to-green-600', 1),
        ('احتياجاتك اليومية', 'Daily Essentials', 'كل ما تحتاجه، توصيل سريع', 'Everything you need, delivered fast', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&q=80', 'from-blue-500 to-cyan-500', 2),
        ('جودة ممتازة', 'Premium Quality', 'الأفضل فقط لك', 'Only the best for you', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80', 'from-purple-500 to-pink-500', 3);
      `);
    }

    // جدول الأسعار لكل متجر (بعد stores)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_prices (
        id SERIAL PRIMARY KEY,
        store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        price NUMERIC(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        effective_from TIMESTAMP DEFAULT NOW(),
        effective_to TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(store_id, product_id, effective_from)
      );
    `);

    // جدول تخصيص الطلبات للمتاجر (بعد stores)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_store_assignments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity NUMERIC(10,3) NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(order_id, store_id, product_id)
      );
    `);

    // فهارس للأداء (بعد إنشاء جميع الجداول)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_store_inventory_store_product ON store_inventory(store_id, product_id);
      CREATE INDEX IF NOT EXISTS idx_store_inventory_available ON store_inventory(is_available, quantity);
      CREATE INDEX IF NOT EXISTS idx_store_prices_store_product ON store_prices(store_id, product_id);
      CREATE INDEX IF NOT EXISTS idx_stores_location ON stores(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);
    `);

    // إدخال منتجات تجريبية إذا كانت المنتجات فاضية
    const countRes = await pool.query(
  'SELECT COUNT(*)::int AS count FROM products;'
);

const count =
  countRes &&
  countRes.rows &&
  countRes.rows.length > 0
    ? countRes.rows[0].count
    : 0;

    if (count === 0) {
      await pool.query(`
        INSERT INTO products (name, price, description) VALUES
          ('حليب طازج', 6.50, 'حليب كامل الدسم'),
          ('خبز عربي', 2.00, 'خبز طازج من الفرن'),
          ('ماء 600 مل', 1.50, 'ماء شرب صحي');
      `);
      console.log("🛒 Seed products inserted");
    }

    // ================= SQL Migrations (after all base tables exist) =================
    await runSqlMigrations();

    console.log("✅ Database initialized");
  } catch (err) {
    console.error("DB init error:", err);
    // process.exit(1); // Removed to allow Simulation Mode
    throw err;
  }
}

async function runSqlMigrations() {
  try {
    if (!pool) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, "migrations");
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const already = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
      if (already.rows.length) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      if (!sql.trim()) continue;

      console.log(`🧱 [MIGRATION] Applying ${file}`);
      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [file]);
        await pool.query("COMMIT");
      } catch (err) {
        await pool.query("ROLLBACK");
        console.error(`❌ [MIGRATION] Failed ${file}:`, err);
        throw err;
      }
    }
  } catch (err) {
    console.error("❌ [MIGRATIONS] Error:", err);
    // Keep booting; but log loudly for ops visibility.
  }
}

// ================= JWT & Auth Middleware =================

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'customer',
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Helper function to get redirect path based on role
function getRedirectPathForRole(role) {
  switch (role) {
    case ROLES.ADMIN:
    case ROLES.SUPER_ADMIN:
      return '/admin';
    case ROLES.STORE:
      return '/store';
    case ROLES.DRIVER:
      return '/driver/dashboard';
    default:
      return '/';
  }
}

// ================= Role-Based Access Control (RBAC) =================

// Define allowed roles
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STORE: 'store',
  DRIVER: 'driver',
  ACCOUNTANT: 'accountant',
  MARKETING: 'marketing',
  PROMOTIONS: 'promotions',
  DELIVERY_MANAGER: 'delivery_manager',
  CUSTOMER: 'customer'
};

// Role-based middleware factory
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'غير مصرح' });
      }

      const userResult = await pool.query(
        'SELECT role FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: 'المستخدم غير موجود' });
      }

      const userRole = userResult.rows[0].role;

      // Super Admin has access to everything
      if (userRole === ROLES.SUPER_ADMIN) {
        return next();
      }

      // Check if user role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          required_roles: allowedRoles,
          your_role: userRole
        });
      }

      next();
    } catch (err) {
      console.error('Role check error:', err);
      res.status(500).json({ message: 'حدث خطأ في التحقق من الصلاحيات' });
    }
  };
}

// Unified order timeline: build canonical events from order + order_status_history (best-effort, no logic change)
async function buildOrderTimeline(orderId) {
  const events = [];
  try {
    const orderRes = await pool.query(
      `SELECT created_at, payment_received_at, paid_at, status FROM orders WHERE id = $1`,
      [orderId]
    );
    if (orderRes.rows.length === 0) return { events };
    const o = orderRes.rows[0];
    const paymentAt = o.payment_received_at || o.paid_at;
    if (o.created_at) events.push({ type: 'created', at: o.created_at, actor: 'system', meta: {} });
    if (paymentAt) events.push({ type: 'payment_confirmed', at: paymentAt, actor: 'system', meta: {} });
    const histRes = await pool.query(
      `SELECT new_status, actor_type, actor_id, note, created_at FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC`,
      [orderId]
    );
    const statusToType = {
      CREATED: 'created',
      ACCEPTED: 'store_started',
      PREPARING: 'store_started',
      READY: 'store_ready',
      ASSIGNED: 'dispatch_assigned',
      PICKED_UP: 'picked_up',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled'
    };
    for (const h of histRes.rows) {
      const type = statusToType[String(h.new_status).toUpperCase()] || 'status_change';
      const actor = ['system', 'admin', 'store', 'driver'].includes(h.actor_type) ? h.actor_type : 'system';
      if (type === 'created') continue;
      events.push({
        type,
        at: h.created_at,
        actor,
        meta: { note: h.note || undefined, actor_id: h.actor_id }
      });
    }
    events.sort((a, b) => new Date(a.at) - new Date(b.at));
  } catch (err) {
    console.error('buildOrderTimeline error:', err);
  }
  return { events };
}

// Audit Log Helper Function
async function logAuditAction(req, action, entityType = null, entityId = null, oldValues = null, newValues = null) {
  try {
    const user = req.user;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';

    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        user?.id || null,
        user?.name || 'Unknown',
        user?.role || 'unknown',
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err);
    // Don't fail the request if audit logging fails
  }
}

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "غير مصرح: لا يوجد رمز دخول" });
    }
    const token = authHeader.slice("Bearer ".length);
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isDbConnected) {
      return res.status(503).json({ code: "DB_UNAVAILABLE", message: "قاعدة البيانات غير متاحة." });
    }

    // Get user role from database
    pool.query('SELECT role, is_active FROM users WHERE id = $1', [decoded.id])
      .then(result => {
        if (result.rows.length === 0) {
          return res.status(401).json({ message: "المستخدم غير موجود" });
        }
        
        const user = result.rows[0];
        if (!user.is_active) {
          return res.status(403).json({ message: "تم تعطيل حسابك" });
        }
        
        req.user = {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: user.role || 'customer',
        };
        next();
      })
      .catch(err => {
        console.error("Auth error:", err.message);
        return res.status(401).json({ message: "رمز الدخول غير صالح" });
      });
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "رمز الدخول غير صالح" });
  }
}

// ================= Host + Role Verification Middleware =================
// Verify that user's role matches the subdomain they're accessing
function verifyHostRole(req, res, next) {
  const host = req.get('host') || '';
  const userRole = req.user?.role;
  
  // Super admin can access all subdomains
  if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
    return next();
  }
  
  // Admin subdomain requires ADMIN or SUPER_ADMIN role
  if (host.includes('admin.tomo-sa.com')) {
    if (userRole !== ROLES.ADMIN && userRole !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ 
        message: 'Access denied: Admin subdomain requires admin role',
        required_role: 'admin',
        your_role: userRole
      });
    }
  }
  
  // Store subdomain requires STORE role
  if (host.includes('store.tomo-sa.com')) {
    if (userRole !== ROLES.STORE) {
      return res.status(403).json({ 
        message: 'Access denied: Store subdomain requires store role',
        required_role: 'store',
        your_role: userRole
      });
    }
  }
  
  // Driver subdomain requires DRIVER role
  if (host.includes('driver.tomo-sa.com')) {
    if (userRole !== ROLES.DRIVER) {
      return res.status(403).json({ 
        message: 'Access denied: Driver subdomain requires driver role',
        required_role: 'driver',
        your_role: userRole
      });
    }
  }
  
  next();
}

// ================= Role-Specific Route Protection =================
// Middleware to protect routes based on role requirements
function requireAdminRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const userRole = req.user.role;
  if (userRole !== ROLES.ADMIN && userRole !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({ 
      message: 'Access denied: Admin role required',
      required_roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
      your_role: userRole
    });
  }
  
  next();
}

function requireStoreRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const userRole = req.user.role;
  if (userRole !== ROLES.STORE) {
    return res.status(403).json({ 
      message: 'Access denied: Store role required',
      required_role: ROLES.STORE,
      your_role: userRole
    });
  }
  
  next();
}

function requireDriverRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const userRole = req.user.role;
  if (userRole !== ROLES.DRIVER) {
    return res.status(403).json({ 
      message: 'Access denied: Driver role required',
      required_role: ROLES.DRIVER,
      your_role: userRole
    });
  }
  
  next();
}

// ================= Health Check =================

app.get("/api/health", (req, res) => {
  res.json({ ok: true, db: isDbConnected, status: "TOMO Market Backend Running ✅" });
});

// ================= WhatsApp Webhook (Meta Cloud API) =================
const whatsappWebhookRateLimit = new Map(); // ip -> { count, resetAt }
const WHATSAPP_WEBHOOK_RATE_WINDOW_MS = 60000;
const WHATSAPP_WEBHOOK_RATE_MAX = 120;

function checkWhatsAppWebhookRate(ip) {
  const now = Date.now();
  let entry = whatsappWebhookRateLimit.get(ip);
  if (!entry) {
    entry = { count: 0, resetAt: now + WHATSAPP_WEBHOOK_RATE_WINDOW_MS };
    whatsappWebhookRateLimit.set(ip, entry);
  }
  if (now >= entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WHATSAPP_WEBHOOK_RATE_WINDOW_MS;
  }
  entry.count++;
  return entry.count <= WHATSAPP_WEBHOOK_RATE_MAX;
}

app.get("/api/webhooks/whatsapp", (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = whatsappProvider.getWebhookVerifyToken();
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return res.type('text/plain').send(challenge);
  }
  res.status(403).send('Forbidden');
});

app.post("/api/webhooks/whatsapp", express.json(), (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkWhatsAppWebhookRate(ip)) {
    return res.status(429).send('Too Many Requests');
  }
  res.status(200).send('OK');
  const body = req.body || {};
  if (body.object !== 'whatsapp_business_account') return;
  const entries = body.entry || [];
  entries.forEach((entry) => {
    const changes = entry.changes || [];
    changes.forEach((change) => {
      if (change.field !== 'messages') return;
      const value = change.value || {};
      const statuses = value.statuses || [];
      const messages = value.messages || [];
      statuses.forEach((st) => {
        const id = st.id;
        const status = (st.status || '').toLowerCase();
        const timestamp = st.timestamp;
        if (!id) return;
        (async () => {
          try {
            if (!pool) return;
            const updateRes = await pool.query(
              `UPDATE marketing_message_log SET status = $1, error = $2 WHERE provider_message_id = $3 RETURNING id, campaign_run_id`,
              [status, status === 'failed' ? (st.errors && st.errors[0] && st.errors[0].message) || 'failed' : null, id]
            );
            if (updateRes.rows.length > 0 && (status === 'delivered' || status === 'read' || status === 'failed')) {
              const runId = updateRes.rows[0].campaign_run_id;
              const counts = await pool.query(
                `SELECT status, COUNT(*) as c FROM marketing_message_log WHERE campaign_run_id = $1 GROUP BY status`,
                [runId]
              );
              let totalSent = 0, totalFailed = 0;
              counts.rows.forEach((r) => {
                if (r.status === 'sent' || r.status === 'delivered' || r.status === 'read') totalSent += parseInt(r.c, 10);
                else if (r.status === 'failed') totalFailed += parseInt(r.c, 10);
              });
              await pool.query(
                `UPDATE marketing_campaign_runs SET total_sent = $1, total_failed = $2 WHERE id = $3`,
                [totalSent, totalFailed, runId]
              );
            }
          } catch (e) {
            console.error('WhatsApp webhook update error:', e);
          }
        })();
      });
    });
  });
});

// ================= Dev Endpoints (Development Only) =================
// Endpoint بدون مصادقة للتطوير - يجب حذفه في الإنتاج
app.post("/api/dev/seed-test-data", async (req, res) => {
  try {
    const defaultPassword = "driver123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const testDrivers = [
      { name_ar: "أحمد المنصور", name_en: "Ahmed Al-Mansour", phone: "0501234567", vehicle: "car", status: "active", is_approved: true, email: "ahmed.driver@tomo.com" },
      { name_ar: "خالد العتيبي", name_en: "Khaled Al-Otaibi", phone: "0557654321", vehicle: "car", status: "active", is_approved: true, email: "khaled.driver@tomo.com" },
      { name_ar: "سلطان الشمري", name_en: "Sultan Al-Shammari", phone: "0543210987", vehicle: "car", status: "offline", is_approved: false, email: "sultan.driver@tomo.com" }
    ];

    const createdDrivers = [];

    for (const driverData of testDrivers) {
      try {
        const userResult = await pool.query(
          `INSERT INTO users (name, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, 'driver', $4)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
           RETURNING id;`,
          [driverData.name_ar, driverData.email, passwordHash, driverData.is_approved]
        );

        const userId = userResult.rows[0].id;

        const driverResult = await pool.query(
          `INSERT INTO drivers (user_id, phone, vehicle_type, status, is_active, is_approved)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id) DO UPDATE SET 
             phone = EXCLUDED.phone,
             vehicle_type = EXCLUDED.vehicle_type,
             status = EXCLUDED.status,
             is_active = EXCLUDED.is_active,
             is_approved = EXCLUDED.is_approved
           RETURNING id;`,
          [userId, driverData.phone, driverData.vehicle, driverData.status, driverData.is_approved, driverData.is_approved]
        );

        createdDrivers.push({
          id: driverResult.rows[0].id,
          name: driverData.name_ar,
          email: driverData.email,
          password: defaultPassword
        });
      } catch (err) {
        console.error(`Error creating driver ${driverData.name_ar}:`, err.message);
      }
    }

    const testCustomers = [
      { name: "سارة محمد", email: "sara.customer@tomo.com" },
      { name: "عبدالله الفهد", email: "abdullah.customer@tomo.com" }
    ];

    const createdCustomers = [];
    for (const customer of testCustomers) {
      try {
        const customerHash = await bcrypt.hash("customer123", 10);
        const customerResult = await pool.query(
          `INSERT INTO users (name, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, 'customer', true)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
           RETURNING id;`,
          [customer.name, customer.email, customerHash]
        );
        createdCustomers.push(customerResult.rows[0].id);
      } catch (err) {
        console.error(`Error creating customer ${customer.name}:`, err.message);
      }
    }

    const testOrders = [
      { customer_index: 0, total_price: 155.50, status: "pending", delivery_address: "الرياض، حي النرجس، شارع الملك فهد" },
      { customer_index: 1, total_price: 89.00, status: "confirmed", driver_id: createdDrivers[0]?.id || null, delivery_address: "الرياض، حي العليا، شارع التحلية" }
    ];

    const createdOrders = [];
    for (const orderData of testOrders) {
      if (createdCustomers[orderData.customer_index]) {
        try {
          const orderResult = await pool.query(
            `INSERT INTO orders (user_id, total_amount, status, delivery_address, driver_id, delivery_status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id;`,
            [
              createdCustomers[orderData.customer_index],
              orderData.total_price,
              orderData.status,
              orderData.delivery_address,
              orderData.driver_id,
              orderData.status
            ]
          );

          if (orderData.driver_id) {
            await pool.query(
              `INSERT INTO order_tracking_history (order_id, status, driver_id) VALUES ($1, $2, $3);`,
              [orderResult.rows[0].id, orderData.status, orderData.driver_id]
            );
          }

          createdOrders.push(orderResult.rows[0].id);
        } catch (err) {
          console.error(`Error creating order:`, err.message);
        }
      }
    }

    res.json({
      message: "تم إدخال البيانات التجريبية بنجاح",
      drivers: createdDrivers,
      customers: createdCustomers.length,
      orders: createdOrders.length,
      note: "كلمات المرور الافتراضية: driver123 للسائقين، customer123 للعملاء"
    });
  } catch (err) {
    console.error("Seed test data error:", err);
    res.status(500).json({ 
      message: "حدث خطأ في إدخال البيانات التجريبية", 
      error: err.message 
    });
  }
});

// ================= Create Initial Admin (Development Only) =================

// Endpoint to create/update admin user - requires explicit body; no hardcoded credentials.
app.post("/api/auth/create-admin", async (req, res) => {
  try {
    if (!pool || !isDbConnected) {
      return res.status(503).json({ code: "DB_UNAVAILABLE", message: "قاعدة البيانات غير متاحة. شغّل PostgreSQL أولاً." });
    }
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ message: "الايميل وكلمة المرور والاسم مطلوبة", code: "MISSING_FIELDS" });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(`🔐 Creating admin user: ${email} with password hash`);

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT id, email, role FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      // Update existing user to super_admin
      const result = await pool.query(
        `UPDATE users 
         SET name = $1, password_hash = $2, role = 'super_admin', is_active = true
         WHERE email = $3
         RETURNING id, name, email, role;`,
        [name, passwordHash, email]
      );

      console.log(`✅ Updated existing user to super_admin: ${email}`);
      return res.status(200).json({
        message: 'Admin user updated successfully',
        user: result.rows[0],
        credentials: {
          email,
          password
        }
      });
    }

    // Create new admin user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'super_admin', true)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role = 'super_admin',
         is_active = true
       RETURNING id, name, email, role;`,
      [name, email, passwordHash]
    );

    console.log(`✅ Created new admin user: ${email}`);
    res.status(201).json({
      message: 'Admin user created successfully',
      user: result.rows[0],
      credentials: {
        email,
        password
      }
    });
  } catch (err) {
    console.error("❌ Create admin error:", err);
    res.status(500).json({ 
      message: err.message || "Failed to create admin user",
      error: err.toString()
    });
  }
});

// ================= Create Test Accounts (Development Only) =================
// Guard: ALLOW_TEST_ACCOUNTS=true or NODE_ENV !== 'production'. Idempotent for driver@tomo.com.
app.post("/api/auth/create-test-accounts", async (req, res) => {
  try {
    const allowTest = String(process.env.ALLOW_TEST_ACCOUNTS || '').toLowerCase() === 'true' || process.env.NODE_ENV !== 'production';
    if (!allowTest) {
      return res.status(403).json({ code: "FORBIDDEN", message: "Create test accounts is disabled in production." });
    }
    if (!pool || !isDbConnected) {
      return res.status(503).json({ code: "DB_UNAVAILABLE", message: "قاعدة البيانات غير متاحة. يرجى تشغيل PostgreSQL." });
    }

    // Step 1: Delete ALL old test accounts (store and driver roles) - SAFE deletion
    console.log("🗑️ Deleting old test accounts...");
    
    let deletedCount = { store: 0, driver: 0 };
    
    try {
      // Get all store/driver user IDs first
      const oldStoreUsers = await pool.query(`SELECT id FROM users WHERE role = 'store'`);
      const oldDriverUsers = await pool.query(`SELECT id FROM users WHERE role = 'driver'`);
      
      const oldStoreUserIds = oldStoreUsers.rows.map(r => r.id);
      const oldDriverUserIds = oldDriverUsers.rows.map(r => r.id);
      
      // Delete store_users links (if table exists)
      if (oldStoreUserIds.length > 0) {
        try {
          await pool.query(`DELETE FROM store_users WHERE user_id = ANY($1::int[])`, [oldStoreUserIds]);
        } catch (e) {
          console.warn("⚠️ Could not delete from store_users:", e.message);
        }
      }
      
      // Delete drivers records (CASCADE should handle this, but we do it explicitly)
      if (oldDriverUserIds.length > 0) {
        try {
          await pool.query(`DELETE FROM drivers WHERE user_id = ANY($1::int[])`, [oldDriverUserIds]);
        } catch (e) {
          console.warn("⚠️ Could not delete from drivers:", e.message);
        }
      }
      
      // Delete users (this should work due to CASCADE or we handle FK manually)
      if (oldStoreUserIds.length > 0 || oldDriverUserIds.length > 0) {
        try {
          const delResult = await pool.query(`DELETE FROM users WHERE role IN ('store', 'driver') RETURNING id, role`);
          deletedCount.store = delResult.rows.filter(r => r.role === 'store').length;
          deletedCount.driver = delResult.rows.filter(r => r.role === 'driver').length;
        } catch (e) {
          console.warn("⚠️ Could not delete users:", e.message);
          // Try individual deletes as fallback
          for (const id of [...oldStoreUserIds, ...oldDriverUserIds]) {
            try {
              await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
            } catch (e2) {
              // ignore individual failures
            }
          }
        }
      }
      
      console.log(`✅ Deleted ${deletedCount.store} store users and ${deletedCount.driver} driver users`);
    } catch (e) {
      console.warn("⚠️ Error during deletion (continuing anyway):", e.message);
    }

    // Step 2: Create new store
    const storePassword = "store123";
    const storeHash = await bcrypt.hash(storePassword, 10);
    
    let storeResult = await pool.query('SELECT id FROM stores WHERE is_active = true LIMIT 1');
    let storeId;
    
    if (storeResult.rows.length === 0) {
      const newStore = await pool.query(`
        INSERT INTO stores (name, code, address, latitude, longitude, delivery_radius, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, ['متجر تجريبي', 'TEST-STORE-001', 'عنوان تجريبي، الرياض', 24.7136, 46.6753, 10, true]);
      storeId = newStore.rows[0].id;
      console.log(`✅ Created new store: ${storeId}`);
    } else {
      storeId = storeResult.rows[0].id;
    }

    // Step 3: Create NEW Store User
    const storeEmail = 'store@tomo.com';
    const storeUserResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'store', true)
       RETURNING id, name, email, role;`,
      ['متجر تجريبي', storeEmail, storeHash]
    );
    const storeUserId = storeUserResult.rows[0].id;
    console.log(`✅ Created new store user: ${storeEmail}`);

    // Link store to user
    try {
      await pool.query(
        `INSERT INTO store_users (store_id, user_id, role)
         VALUES ($1, $2, 'manager')
         ON CONFLICT (store_id, user_id) DO UPDATE SET role = 'manager';`,
        [storeId, storeUserId]
      );
    } catch (e) {
      // store_users table might not exist, ignore
    }

    // Step 4: Create or update Driver User (idempotent)
    const driverPassword = "driver123";
    const driverHash = await bcrypt.hash(driverPassword, 10);
    const driverEmail = 'driver@tomo.com';
    const existingDriver = await pool.query(`SELECT id FROM users WHERE email = $1 AND role = 'driver'`, [driverEmail]);
    let driverUserId;
    if (existingDriver.rows.length > 0) {
      driverUserId = existingDriver.rows[0].id;
      await pool.query(`UPDATE users SET name = $1, password_hash = $2, is_active = true WHERE id = $3`, ['مندوب تجريبي', driverHash, driverUserId]);
      console.log(`✅ Updated existing driver user: ${driverEmail}`);
    } else {
      const driverUserResult = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'driver', true)
         RETURNING id, name, email, role;`,
        ['مندوب تجريبي', driverEmail, driverHash]
      );
      driverUserId = driverUserResult.rows[0].id;
      console.log(`✅ Created new driver user: ${driverEmail}`);
    }
    try {
      await pool.query(
        `INSERT INTO drivers (user_id, phone, vehicle_type, status, is_active, is_approved)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET phone = $2, vehicle_type = $3, status = $4, is_active = $5, is_approved = $6`,
        [driverUserId, '0501234567', 'car', 'active', true, true]
      );
    } catch (e) {
      if (e.code !== '23505') console.warn("⚠️ Driver record:", e.message);
    }

    res.json({
      message: "تم حذف الحسابات القديمة وإنشاء حسابات جديدة بنجاح",
      deleted: {
        storeUsers: oldStoreUserIds.length,
        driverUsers: oldDriverUserIds.length
      },
      created: {
        store: {
          email: storeEmail,
          password: storePassword,
          storeId: storeId
        },
        driver: {
          email: driverEmail,
          password: driverPassword
        }
      }
    });
  } catch (err) {
    console.error("❌ Create test accounts error:", err);
    const isDbError = err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || (err.message && err.message.includes('connect'));
    res.status(isDbError ? 503 : 500).json({
      code: isDbError ? "DB_UNAVAILABLE" : "CREATE_TEST_ACCOUNTS_ERROR",
      message: err.message || "Failed to create test accounts"
    });
  }
});

// ================= Auth Routes (Register / Login / Me) =================

// تسجيل مستخدم جديد
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "الاسم والايميل وكلمة المرور مطلوبة" });
    }

    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
    if (existing.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "الايميل مستخدم مسبقاً" });
    }

    const hash = await bcrypt.hash(password, 10);

    const insertRes = await pool.query(
      `
        INSERT INTO users (full_name, name, email, password_hash, role, status)
        VALUES ($1, $1, $2, $3, $4, $5)
        RETURNING id, full_name, name, email, phone, role, status, created_at;
      `,
      [name, email, hash, 'customer', 'active']
    );

    const user = insertRes.rows[0];
    const token = generateToken(user);

    res.status(201).json({ 
      user: {
        id: user.id,
        name: user.full_name || user.name,
        full_name: user.full_name || user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'customer',
        status: user.status || 'active',
      },
      token 
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "حدث خطأ في التسجيل" });
  }
});

// تسجيل الدخول
app.post("/api/auth/login", async (req, res) => {
  try {
    // Debug: Log request details
    console.log('[LOGIN] Request received:', {
      method: req.method,
      path: req.path,
      contentType: req.get('content-type'),
      bodyKeys: req.body ? Object.keys(req.body) : 'no body',
      body: req.body
    });

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "الايميل وكلمة المرور مطلوبة" });
    }

    if (!isDbConnected) {
      return res.status(503).json({ code: "DB_UNAVAILABLE", message: "قاعدة البيانات غير متاحة." });
    }

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ code: "INVALID_CREDENTIALS", message: "بيانات الدخول غير صحيحة" });
    }

    const user = result.rows[0];
    
    // التحقق من حالة المستخدم (status أو is_active)
    if ((user.status && user.status === 'disabled') || user.is_active === false) {
      return res.status(403).json({ code: "ACCOUNT_DISABLED", message: "تم تعطيل حسابك. يرجى الاتصال بالإدارة" });
    }
    
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ code: "INVALID_CREDENTIALS", message: "بيانات الدخول غير صحيحة" });
    }

    // Verify host+role match for subdomain portals
    const host = req.get('host') || '';
    const userRole = user.role || 'customer';
    
    // Check if user is trying to login from wrong subdomain
    if (host.includes('admin.tomo-sa.com')) {
      if (userRole !== ROLES.ADMIN && userRole !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ 
          message: 'Access denied: Admin portal requires admin role',
          required_role: 'admin',
          your_role: userRole
        });
      }
    }
    
    if (host.includes('store.tomo-sa.com')) {
      if (userRole !== ROLES.STORE) {
        return res.status(403).json({ 
          message: 'Access denied: Store portal requires store role',
          required_role: 'store',
          your_role: userRole
        });
      }
    }
    
    if (host.includes('driver.tomo-sa.com')) {
      if (userRole !== ROLES.DRIVER) {
        return res.status(403).json({ 
          message: 'Access denied: Driver portal requires driver role',
          required_role: 'driver',
          your_role: userRole
        });
      }
    }

    const token = generateToken(user);
    const forcePasswordChange = !!user.force_password_change;
    const redirectPath = forcePasswordChange && (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN)
      ? '/admin/change-password'
      : getRedirectPathForRole(userRole);

    res.json({
      user: {
        id: user.id,
        name: user.full_name || user.name,
        full_name: user.full_name || user.name,
        email: user.email,
        phone: user.phone,
        role: userRole,
        status: user.status || (user.is_active ? 'active' : 'disabled'),
        force_password_change: forcePasswordChange,
      },
      token,
      redirectPath,
    });
  } catch (err) {
    console.error("❌ [LOGIN] Error:", err?.message || err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack?.split('\n').slice(0, 10)
    });
    const isDbError = !pool || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || (err.message && (err.message.includes('connect') || err.message.includes('pool') || err.message.includes('timeout')));
    if (isDbError) {
      return res.status(503).json({ code: "DB_UNAVAILABLE", message: "قاعدة البيانات غير متاحة. يرجى تشغيل PostgreSQL." });
    }
    const detail = process.env.NODE_ENV !== 'production' ? err.message : undefined;
    res.status(500).json({ code: "LOGIN_ERROR", message: "حدث خطأ في تسجيل الدخول", detail });
  }
});

// Change password (logged-in user). Clears force_password_change.
app.post("/api/auth/change-password", authMiddleware, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body || {};
    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "كلمة المرور الجديدة مطلوبة." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "تأكيد كلمة المرور غير مطابق." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." });
    }
    if (!isDbConnected || !pool) {
      return res.status(503).json({ code: "DB_UNAVAILABLE", message: "قاعدة البيانات غير متاحة." });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password_hash = $1, force_password_change = false, updated_at = NOW() WHERE id = $2",
      [passwordHash, req.user.id]
    );
    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "حدث خطأ في تغيير كلمة المرور." });
  }
});

// ================= Customer Auth (Signup / Login) — rate limited, JWT required =================
const customerAuthRateLimit = new Map(); // ip -> [timestamps]
const CUSTOMER_AUTH_WINDOW_MS = 15 * 60 * 1000;
const CUSTOMER_AUTH_MAX_REQUESTS = 20;

function customerAuthRateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let times = customerAuthRateLimit.get(ip) || [];
  times = times.filter(t => now - t < CUSTOMER_AUTH_WINDOW_MS);
  if (times.length >= CUSTOMER_AUTH_MAX_REQUESTS) {
    return res.status(429).json({ code: "RATE_LIMITED", message: "محاولات كثيرة. يرجى المحاولة لاحقاً." });
  }
  times.push(now);
  customerAuthRateLimit.set(ip, times);
  next();
}

function normalizePhone(v) {
  if (v == null || typeof v !== 'string') return null;
  const s = v.trim().replace(/\s+/g, '');
  return s || null;
}

function isEmail(s) {
  if (typeof s !== 'string' || !s.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

app.post("/api/auth/customer/signup", customerAuthRateLimiter, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      return res.status(500).json({ code: "CONFIG_ERROR", message: "إعدادات الخادم غير مكتملة. يرجى المحاولة لاحقاً." });
    }
    const { name, phone, email, password, marketing_opt_in, channel_opt_in } = req.body || {};
    const fullName = typeof name === 'string' ? name.trim() : '';
    const rawPhone = phone != null ? String(phone).trim() : '';
    const rawEmail = email != null ? String(email).trim() : '';
    const pwd = typeof password === 'string' ? password : '';
    const optIn = marketing_opt_in === true;
    const channelOpt = channel_opt_in && typeof channel_opt_in === 'object' ? channel_opt_in : {};

    if (!fullName) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "الاسم مطلوب." });
    }
    const normalizedPhone = normalizePhone(rawPhone);
    const hasPhone = !!normalizedPhone;
    const hasEmail = !!rawEmail && isEmail(rawEmail);
    if (!hasPhone && !hasEmail) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "رقم الجوال أو البريد الإلكتروني مطلوب." });
    }
    if (hasPhone && hasEmail) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "أدخل رقم الجوال أو البريد الإلكتروني فقط (واحد منهما)." });
    }
    if (pwd.length < 6) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." });
    }

    if (!isDbConnected || !pool) {
      return res.status(503).json({ code: "DB_UNAVAILABLE", message: "الخدمة غير متاحة مؤقتاً." });
    }

    const existingByPhone = hasPhone
      ? await pool.query('SELECT id FROM users WHERE phone = $1', [normalizedPhone])
      : { rows: [] };
    const existingByEmail = hasEmail
      ? await pool.query('SELECT id FROM users WHERE email = $1', [rawEmail.toLowerCase()])
      : { rows: [] };
    if (existingByPhone.rows.length > 0 || existingByEmail.rows.length > 0) {
      return res.status(409).json({ code: "USER_EXISTS", message: "رقم الجوال أو البريد الإلكتروني مسجل مسبقاً." });
    }

    const password_hash = await bcrypt.hash(pwd, 10);
    const insertPhone = hasPhone ? normalizedPhone : null;
    const insertEmail = hasEmail ? rawEmail.toLowerCase() : null;
    const insertRes = await pool.query(
      `INSERT INTO users (full_name, name, phone, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, 'customer', 'active')
       RETURNING id, full_name, name, phone, email, role, status`,
      [fullName, fullName, insertPhone, insertEmail, password_hash]
    );
    const user = insertRes.rows[0];
    if (optIn && user.id) {
      try {
        const whatsappOpt = channelOpt.whatsapp === true;
        const preferredChannel = whatsappOpt ? 'whatsapp' : (channelOpt.sms ? 'sms' : channelOpt.email ? 'email' : channelOpt.push ? 'push' : null);
        const channelJson = JSON.stringify({
          whatsapp: !!channelOpt.whatsapp,
          sms: !!channelOpt.sms,
          email: !!channelOpt.email,
          push: !!channelOpt.push,
        });
        const whatsappPhone = (whatsappOpt && insertPhone)
          ? (insertPhone.startsWith('+') ? insertPhone : '+966' + insertPhone.replace(/^0/, ''))
          : null;
        await pool.query(
          `UPDATE users SET marketing_opt_in = true, marketing_opt_in_at = NOW(), channel_opt_in = $1::jsonb, preferred_channel = $2, whatsapp_phone = COALESCE($3, whatsapp_phone), updated_at = NOW() WHERE id = $4`,
          [channelJson, preferredChannel, whatsappPhone, user.id]
        );
      } catch (e) {
        if (e.code !== '42701') throw e;
      }
    }
    const token = generateToken(user);
    res.status(200).json({
      ok: true,
      token,
      user: { id: user.id, name: user.full_name || user.name, role: user.role || 'customer' },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ code: "USER_EXISTS", message: "رقم الجوال أو البريد الإلكتروني مسجل مسبقاً." });
    }
    console.error("Customer signup error:", err);
    res.status(500).json({ code: "SERVER_ERROR", message: "حدث خطأ. يرجى المحاولة لاحقاً." });
  }
});

app.post("/api/auth/customer/login", customerAuthRateLimiter, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      return res.status(500).json({ code: "CONFIG_ERROR", message: "إعدادات الخادم غير مكتملة. يرجى المحاولة لاحقاً." });
    }
    const { phone, email, password } = req.body || {};
    const phoneOrEmail = typeof phone === 'string' && phone.trim()
      ? phone.trim()
      : typeof email === 'string' && email.trim()
        ? email.trim()
        : '';
    const pwd = typeof password === 'string' ? password : '';

    if (!phoneOrEmail || !pwd) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "رقم الجوال أو البريد الإلكتروني وكلمة المرور مطلوبان." });
    }

    if (!isDbConnected || !pool) {
      return res.status(503).json({ code: "DB_UNAVAILABLE", message: "الخدمة غير متاحة مؤقتاً." });
    }

    const isEmailInput = isEmail(phoneOrEmail);
    const normalizedInput = isEmailInput ? phoneOrEmail.toLowerCase() : normalizePhone(phoneOrEmail);
    if (!normalizedInput) {
      return res.status(401).json({ code: "INVALID_CREDENTIALS", message: "بيانات الدخول غير صحيحة." });
    }

    const result = await pool.query(
      isEmailInput
        ? `SELECT id, full_name, name, email, phone, role, password_hash, status FROM users WHERE email = $1 AND role = 'customer'`
        : `SELECT id, full_name, name, email, phone, role, password_hash, status FROM users WHERE phone = $1 AND role = 'customer'`,
      [normalizedInput]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ code: "INVALID_CREDENTIALS", message: "بيانات الدخول غير صحيحة." });
    }
    const user = result.rows[0];
    if (user.status === 'disabled') {
      return res.status(403).json({ code: "ACCOUNT_DISABLED", message: "تم تعطيل حسابك." });
    }
    const match = await bcrypt.compare(pwd, user.password_hash);
    if (!match) {
      return res.status(401).json({ code: "INVALID_CREDENTIALS", message: "بيانات الدخول غير صحيحة." });
    }
    const token = generateToken(user);
    res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.full_name || user.name, role: user.role || 'customer' },
    });
  } catch (err) {
    console.error("Customer login error:", err);
    res.status(500).json({ code: "SERVER_ERROR", message: "حدث خطأ. يرجى المحاولة لاحقاً." });
  }
});

// ================= OAuth scaffolding (Google / Apple) — 501 if env missing =================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URL;
const hasGoogleOAuth = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY_P8;
const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URL;
const hasAppleOAuth = !!(APPLE_CLIENT_ID && APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY && APPLE_REDIRECT_URI);

const OAUTH_NOT_CONFIGURED_MSG = "تسجيل الدخول عبر هذا المزود غير مفعّل حالياً.";

app.get("/api/auth/oauth/google/start", (req, res) => {
  if (!hasGoogleOAuth) {
    return res.status(501).json({ code: "OAUTH_NOT_CONFIGURED", message: OAUTH_NOT_CONFIGURED_MSG });
  }
  const redirect = (req.query.redirect && typeof req.query.redirect === 'string') ? req.query.redirect : '/';
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = Buffer.from(JSON.stringify({ redirect, nonce })).toString('base64url');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=openid%20email%20profile&state=${state}`;
  res.redirect(302, authUrl);
});

app.get("/api/auth/oauth/google/callback", (req, res) => {
  if (!hasGoogleOAuth) {
    return res.status(501).json({ code: "OAUTH_NOT_CONFIGURED", message: OAUTH_NOT_CONFIGURED_MSG });
  }
  res.status(501).json({ code: "OAUTH_CALLBACK_NOT_IMPLEMENTED", message: "استكمال تسجيل الدخول عبر Google غير مفعّل بعد." });
});

app.get("/api/auth/oauth/apple/start", (req, res) => {
  if (!hasAppleOAuth) {
    return res.status(501).json({ code: "OAUTH_NOT_CONFIGURED", message: OAUTH_NOT_CONFIGURED_MSG });
  }
  const redirect = (req.query.redirect && typeof req.query.redirect === 'string') ? req.query.redirect : '/';
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = Buffer.from(JSON.stringify({ redirect, nonce })).toString('base64url');
  res.status(501).json({ code: "OAUTH_NOT_IMPLEMENTED", message: "تسجيل الدخول عبر Apple غير مفعّل بعد." });
});

app.post("/api/auth/oauth/apple/callback", (req, res) => {
  if (!hasAppleOAuth) {
    return res.status(501).json({ code: "OAUTH_NOT_CONFIGURED", message: OAUTH_NOT_CONFIGURED_MSG });
  }
  res.status(501).json({ code: "OAUTH_CALLBACK_NOT_IMPLEMENTED", message: "استكمال تسجيل الدخول عبر Apple غير مفعّل بعد." });
});

// بيانات المستخدم الحالي
app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, name, email, phone, role, status, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    const user = result.rows[0];
    res.json({
      id: user.id,
      name: user.full_name || user.name,
      full_name: user.full_name || user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      created_at: user.created_at
    });
  } catch (err) {
    console.error("❌ [ME] FULL ERROR:", err);
    res.status(500).json({ message: "حدث خطأ في جلب بيانات المستخدم" });
  }
});

// Canonical permissions schema (groups + flat list) for RBAC UI
const PERMISSIONS_GROUPS = [
  { id: 'ops', label_ar: 'العمليات', label_en: 'Operations', permissions: ['view_orders', 'manage_orders', 'live_dispatch', 'view_riders', 'manage_riders', 'view_tracking', 'sla_timers'] },
  { id: 'catalog', label_ar: 'الكتالوج', label_en: 'Catalog', permissions: ['view_products', 'manage_products', 'view_categories', 'manage_categories'] },
  { id: 'experience', label_ar: 'التجربة', label_en: 'Experience', permissions: ['manage_site_content', 'manage_promo_strip', 'manage_home_hero', 'manage_site_links', 'manage_support_settings'] },
  { id: 'marketing', label_ar: 'التسويق', label_en: 'Marketing', permissions: ['manage_campaigns', 'manage_utm_builder', 'manage_coupons'] },
  { id: 'finance', label_ar: 'المالية', label_en: 'Finance', permissions: ['view_finance_dashboard', 'view_reports', 'exports_csv', 'view_settlements'] },
  { id: 'admin', label_ar: 'الإدارة', label_en: 'Admin', permissions: ['manage_users_roles', 'view_audit_log', 'manage_system_settings', 'control_center'] },
];
const ALL_PERMISSIONS = [...new Set(PERMISSIONS_GROUPS.flatMap((g) => g.permissions))];

// Role templates when DB unavailable (super_admin, ops_manager, store_manager, marketing, accounting)
const STATIC_ROLE_TEMPLATES = [
  { role: 'super_admin', permissions: Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true])), description_ar: 'الآدمن العام', description_en: 'Super Admin' },
  { role: 'ops_manager', permissions: { view_orders: true, manage_orders: true, live_dispatch: true, view_riders: true, manage_riders: true, view_tracking: true, sla_timers: true }, description_ar: 'مدير العمليات', description_en: 'Operations Manager' },
  { role: 'store_manager', permissions: { view_products: true, manage_products: true, view_categories: true, manage_categories: true, view_orders: true }, description_ar: 'مدير المتجر', description_en: 'Store Manager' },
  { role: 'marketing', permissions: { manage_site_content: true, manage_promo_strip: true, manage_home_hero: true, manage_site_links: true, manage_support_settings: true, manage_campaigns: true, manage_utm_builder: true, manage_coupons: true }, description_ar: 'التسويق', description_en: 'Marketing' },
  { role: 'accounting', permissions: { view_finance_dashboard: true, view_reports: true, exports_csv: true, view_settlements: true }, description_ar: 'المحاسبة', description_en: 'Accounting' },
];

// Full manage permissions for super_admin (must include all canonical + legacy keys)
const SUPER_ADMIN_PERMISSIONS = {
  all: true,
  ...Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true])),
  manage_orders: true,
  manage_products: true,
  manage_stores: true,
  view_reports: true,
  manage_settings: true,
  manage_marketing: true,
  manage_users: true,
  manage_drivers: true,
  manage_finance: true,
};

// Effective permissions for current admin (RBAC: role template + user overrides). Super_admin always gets full manage.
app.get("/api/admin/me/permissions", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role || 'customer';
    if (role === 'super_admin') {
      return res.json({ permissions: { ...SUPER_ADMIN_PERMISSIONS }, role: 'super_admin' });
    }
    if (!pool) {
      return res.json({
        permissions: role === 'admin' ? { ...SUPER_ADMIN_PERMISSIONS } : { all: true, manage_orders: true, manage_products: true, manage_stores: true, view_reports: true, manage_settings: true },
        role: role,
      });
    }
    const roleRes = await pool.query(
      'SELECT permissions FROM role_permissions WHERE role = $1',
      [role]
    );
    const rolePerms = (roleRes.rows[0]?.permissions && typeof roleRes.rows[0].permissions === 'object')
      ? roleRes.rows[0].permissions
      : {};
    const userRes = await pool.query(
      'SELECT permission_key, granted FROM user_permissions WHERE user_id = $1',
      [userId]
    );
    const overrides = {};
    userRes.rows.forEach((r) => {
      overrides[r.permission_key] = r.granted !== false;
    });
    const effective = { ...rolePerms, ...overrides };
    res.json({ permissions: effective, role });
  } catch (err) {
    console.error("Effective permissions error:", err);
    const fallbackRole = req.user?.role || 'customer';
    const fallbackPerms = (fallbackRole === 'super_admin' || fallbackRole === 'admin')
      ? { ...SUPER_ADMIN_PERMISSIONS }
      : { view_reports: true };
    res.json({
      permissions: fallbackPerms,
      role: fallbackRole,
    });
  }
});

// Permissions schema for admin UI: groups, flat permissions list, role templates
app.get("/api/admin/permissions/schema", authMiddleware, async (req, res) => {
  try {
    let roles = STATIC_ROLE_TEMPLATES.map((r) => ({
      role: r.role,
      permissions: r.permissions,
      description_ar: r.description_ar,
      description_en: r.description_en,
    }));
    if (pool) {
      const result = await pool.query(
        "SELECT role, permissions, description_ar, description_en FROM role_permissions ORDER BY role"
      );
      if (result.rows.length > 0) {
        roles = result.rows.map((r) => ({
          role: r.role,
          permissions: r.permissions && typeof r.permissions === "object" ? r.permissions : {},
          description_ar: r.description_ar || r.role,
          description_en: r.description_en || r.role,
        }));
      }
    }
    res.json({ groups: PERMISSIONS_GROUPS, permissions: ALL_PERMISSIONS, roles });
  } catch (err) {
    console.error("Permissions schema error:", err);
    res.json({
      groups: PERMISSIONS_GROUPS,
      permissions: ALL_PERMISSIONS,
      roles: STATIC_ROLE_TEMPLATES.map((r) => ({
        role: r.role,
        permissions: r.permissions,
        description_ar: r.description_ar,
        description_en: r.description_en,
      })),
    });
  }
});

// ================= Product Routes =================

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// كل المنتجات - مع دعم Geofencing و Store Filtering
app.get("/api/products", async (req, res) => {
  try {
    const { 
      store_id, 
      customer_lat, 
      customer_lon,
      page = 1,
      limit = 24,
      category_id,
      search,
      min_price,
      max_price,
      sort = 'newest'
    } = req.query;
    
    let storeFilter = '';
    let storeParams = [];
    let nearestStore = null;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Geofencing: إذا تم توفير إحداثيات العميل، نجد أقرب متجر ضمن نطاق التوصيل
    if (customer_lat && customer_lon) {
      const customerLat = parseFloat(customer_lat);
      const customerLon = parseFloat(customer_lon);
      
      if (!isNaN(customerLat) && !isNaN(customerLon)) {
        try {
          // محاولة استخدام PostGIS إذا كان متاحاً
          const geoQuery = `
      SELECT 
              s.id,
              s.name,
              s.latitude,
              s.longitude,
              s.delivery_radius,
              ST_Distance(
                s.location,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
              ) / 1000.0 as distance_km
            FROM stores s
            WHERE s.is_active = true
              AND ST_DWithin(
                s.location::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                s.delivery_radius * 1000
              )
            ORDER BY distance_km ASC
            LIMIT 1;
          `;
          
          const geoResult = await pool.query(geoQuery, [customerLon, customerLat]);
          
          if (geoResult.rows.length > 0) {
            nearestStore = geoResult.rows[0];
            storeFilter = 'AND si.store_id = $' + (storeParams.length + 1);
            storeParams.push(nearestStore.id);
            console.log(`✅ Found nearest store: ${nearestStore.name} (${nearestStore.distance_km.toFixed(2)} km away)`);
          }
        } catch (geoErr) {
          // Fallback to Haversine formula if PostGIS is not available
          console.log('⚠️ PostGIS not available, using Haversine formula');
          
          const storesResult = await pool.query(`
            SELECT id, name, latitude, longitude, delivery_radius
            FROM stores
            WHERE is_active = true
          `);
          
          let minDistance = Infinity;
          for (const store of storesResult.rows) {
            const distance = calculateDistance(
              customerLat, customerLon,
              parseFloat(store.latitude), parseFloat(store.longitude)
            );
            
            if (distance <= parseFloat(store.delivery_radius) && distance < minDistance) {
              minDistance = distance;
              nearestStore = {
                ...store,
                distance_km: distance
              };
            }
          }
          
          if (nearestStore) {
            storeFilter = 'AND si.store_id = $' + (storeParams.length + 1);
            storeParams.push(nearestStore.id);
            console.log(`✅ Found nearest store: ${nearestStore.name} (${nearestStore.distance_km.toFixed(2)} km away)`);
          } else {
            console.log('⚠️ No store found within delivery radius');
          }
        }
      }
    }
    
    // إذا تم تحديد store_id مباشرة
    if (store_id && !nearestStore) {
      storeFilter = 'AND si.store_id = $' + (storeParams.length + 1);
      storeParams.push(parseInt(store_id));
    }
    
    // Build WHERE conditions
    let whereConditions = ['TRUE'];
    let queryParams = [...storeParams];
    let paramIndex = storeParams.length + 1;
    
    // Category filter
    if (category_id) {
      whereConditions.push(`p.category_id = $${paramIndex}`);
      queryParams.push(parseInt(category_id));
      paramIndex++;
    }
    
    // Search filter
    if (search) {
      whereConditions.push(`(
        LOWER(p.name) LIKE $${paramIndex} OR 
        LOWER(COALESCE(p.name_ar, p.name)) LIKE $${paramIndex} OR 
        LOWER(COALESCE(p.name_en, p.name)) LIKE $${paramIndex} OR
        LOWER(p.description) LIKE $${paramIndex}
      )`);
      queryParams.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }
    
    // Price range filter
    if (min_price) {
      whereConditions.push(`p.price >= $${paramIndex}`);
      queryParams.push(parseFloat(min_price));
      paramIndex++;
    }
    if (max_price) {
      whereConditions.push(`p.price <= $${paramIndex}`);
      queryParams.push(parseFloat(max_price));
      paramIndex++;
    }
    
    // Build ORDER BY clause
    let orderBy = 'p.is_featured DESC, p.id DESC'; // Default
    switch (sort) {
      case 'oldest':
        orderBy = 'p.id ASC';
        break;
      case 'price_low':
        orderBy = 'p.price ASC, p.id DESC';
        break;
      case 'price_high':
        orderBy = 'p.price DESC, p.id DESC';
        break;
      case 'name_asc':
        orderBy = 'p.name ASC, p.id DESC';
        break;
      case 'name_desc':
        orderBy = 'p.name DESC, p.id DESC';
        break;
      case 'newest':
      default:
        orderBy = 'p.is_featured DESC, p.id DESC';
        break;
    }
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0]?.total || 0);
    
    // بناء الاستعلام مع دعم Geofencing, Filters, Sorting, and Pagination
    let query = `
      SELECT DISTINCT
        p.id, 
        p.name, 
        COALESCE(p.name_ar, p.name) as name_ar, 
        COALESCE(p.name_en, p.name) as name_en, 
        p.price, 
        p.description, 
        COALESCE(p.description_ar, p.description) as description_ar, 
        COALESCE(p.description_en, p.description) as description_en,
        p.category_id, 
        p.unit, 
        p.price_per_unit, 
        p.unit_step, 
        p.image_url, 
        p.barcode,
        p.is_featured, 
        p.discount_price, 
        p.discount_percentage,
        p.created_at,
        (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) as quantity, 
        (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) as available_quantity, 
        (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) as stock_quantity,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image_url,
        true as in_stock
      FROM products p
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit));
    queryParams.push(offset);
    
    console.log("🔍 Executing products query with filters, sorting, and pagination...");
    console.log("🔍 Filters:", { category_id, search, min_price, max_price, sort, page, limit });
    
    if (!pool) {
      console.warn("⚠️ Database pool not available, returning empty products");
      return res.json({
        products: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 0,
        store: null
      });
    }

    const result = await pool.query(query, queryParams);
    console.log(`✅ Products query successful. Found ${result.rows.length} products (Total: ${totalCount}).`);
    
    // تحديث البيانات - استخدام primary_image_url إذا كان متاحاً
    const products = result.rows.map((row) => {
      // تحويل الكميات - نترك null إذا لم تكن موجودة (يعني متاح افتراضياً)
      const availableQty = row.available_quantity !== null && row.available_quantity !== undefined 
        ? parseInt(row.available_quantity) 
        : null;
      const quantity = row.quantity !== null && row.quantity !== undefined 
        ? parseInt(row.quantity) 
        : null;
      const stockQty = row.stock_quantity !== null && row.stock_quantity !== undefined 
        ? parseInt(row.stock_quantity) 
        : null;
      
      return {
      ...row,
      price: row.price ? parseFloat(row.price) : 0,
      discount_price: row.discount_price ? parseFloat(row.discount_price) : null,
      image_url: row.primary_image_url || row.image_url, // Use primary image if available
      store_id: nearestStore ? nearestStore.id : (row.store_id || null),
      distance_km: nearestStore ? nearestStore.distance_km : null,
        quantity: quantity,
        available_quantity: availableQty, // null يعني متاح افتراضياً
        stock_quantity: stockQty,
      };
    });
    
    console.log(`📦 Returning ${products.length} products to frontend (Page ${page} of ${Math.ceil(totalCount / parseInt(limit))})`);
    
    res.json({
      products,
      total: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      // MVP: Hide store name from customer
      store: nearestStore ? {
        id: nearestStore.id,
        distance_km: nearestStore.distance_km
        // name removed - customer should not see store name
      } : null
    });
  } catch (err) {
    console.error("❌ Get products error:", err);
    console.error("❌ Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack?.split('\n').slice(0, 5)
    });
    
    // Return empty structure matching success response format to prevent frontend crash
    res.json({
      products: [],
      store: null
    });
  }
});

// Admin Products Endpoint - جلب جميع المنتجات للإدارة
app.get("/api/admin/products", authMiddleware, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: "Database connection not available" });
    }

    const query = `
      SELECT DISTINCT
        p.id, 
        p.name, 
        COALESCE(p.name_ar, p.name) as name_ar, 
        COALESCE(p.name_en, p.name) as name_en, 
        p.price, 
        p.description, 
        COALESCE(p.description_ar, p.description) as description_ar, 
        COALESCE(p.description_en, p.description) as description_en,
        p.category_id, 
        p.unit, 
        p.price_per_unit, 
        p.unit_step, 
        p.image_url, 
        p.barcode,
        p.is_featured, 
        p.discount_price, 
        p.discount_percentage,
        COALESCE((SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id), 0) as quantity, 
        COALESCE((SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id), 0) as available_quantity, 
        CASE WHEN COALESCE((SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id), 0) > 0 THEN true ELSE false END as in_stock
      FROM products p
      ORDER BY p.is_featured DESC, p.id DESC
    `;
    
    const result = await pool.query(query);
    const products = result.rows.map((row) => {
      // تحويل الكميات - نترك null إذا لم تكن موجودة (يعني متاح افتراضياً)
      const availableQty = row.available_quantity !== null && row.available_quantity !== undefined 
        ? parseInt(row.available_quantity) 
        : null;
      const quantity = row.quantity !== null && row.quantity !== undefined 
        ? parseInt(row.quantity) 
        : null;
      
      return {
      ...row,
      price: row.price ? parseFloat(row.price) : 0,
      discount_price: row.discount_price ? parseFloat(row.discount_price) : null,
        quantity: quantity,
        available_quantity: availableQty, // null يعني متاح افتراضياً
      };
    });
    
    res.json(products);
  } catch (err) {
    console.error("❌ Get admin products error:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
    res.status(500).json({ message: "حدث خطأ في جلب المنتجات: " + (err.message || "خطأ غير معروف") });
  }
});

// ================= Profit Guard (Read-only) =================
// GET /api/admin/profit-guard
// - Read-only: NO price/order changes, NO schema changes
// - Flags: NO_COST_DATA, LOW_MARGIN, NEGATIVE_MARGIN, OUT_OF_STOCK
app.get("/api/admin/profit-guard", authMiddleware, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ message: "Database connection not available" });

    // Prefer store_products if available (new schema), fallback to store_inventory.
    const queryStoreProducts = `
      SELECT
        p.id AS "productId",
        COALESCE(p.name_ar, p.name_en, p.name) AS name,
        COALESCE(c.name, p.category, '') AS category,
        COALESCE(p.price_per_unit, p.price, 0) AS price,
        p.cost_price AS cost,
        COALESCE((
          SELECT SUM(COALESCE(sp.stock_qty, 0))
          FROM store_products sp
          WHERE sp.product_id = p.id AND (sp.is_active IS NULL OR sp.is_active = true)
        ), 0) AS stock_quantity
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.id DESC
    `;

    const queryStoreInventory = `
      SELECT
        p.id AS "productId",
        COALESCE(p.name_ar, p.name_en, p.name) AS name,
        COALESCE(c.name, p.category, '') AS category,
        COALESCE(p.price_per_unit, p.price, 0) AS price,
        p.cost_price AS cost,
        COALESCE((SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id), 0) AS stock_quantity
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.id DESC
    `;

    let rows = [];
    try {
      const r = await pool.query(queryStoreProducts);
      rows = r.rows || [];
    } catch (e) {
      const r = await pool.query(queryStoreInventory);
      rows = r.rows || [];
    }

    const items = rows.map((row) => {
      const price = row.price != null ? Number(row.price) : 0;
      const cost = row.cost != null ? Number(row.cost) : null;
      const stockQty = row.stock_quantity != null ? Number(row.stock_quantity) : 0;

      const flags = [];

      let marginPct = null;
      if (cost == null) {
        flags.push("NO_COST_DATA");
      } else if (Number.isFinite(price) && price > 0) {
        marginPct = ((price - cost) / price) * 100;
        if (marginPct < 0) flags.push("NEGATIVE_MARGIN");
        else if (marginPct < 8) flags.push("LOW_MARGIN");
      } else {
        // No valid price => can't compute margin
        marginPct = null;
      }

      if (Number.isFinite(stockQty) && stockQty <= 0) flags.push("OUT_OF_STOCK");

      const suggestedActions = [];
      if (flags.includes("NO_COST_DATA")) suggestedActions.push("أضف تكلفة المنتج (Cost) لحساب هامش الربح بدقة.");
      if (flags.includes("NEGATIVE_MARGIN")) suggestedActions.push("تحقق من سعر البيع أو التكلفة — الهامش سلبي.");
      if (flags.includes("LOW_MARGIN")) suggestedActions.push("راجع التسعير/الـ markup — الهامش منخفض (< 8%).");
      if (flags.includes("OUT_OF_STOCK")) suggestedActions.push("أعد تزويد المخزون أو عطّل المنتج مؤقتًا إذا لزم.");
      suggestedActions.push("افتح صفحة المنتج داخل إدارة المنتجات لمراجعة التفاصيل.");

      return {
        productId: row.productId,
        name: row.name || "",
        category: row.category || "",
        price: Number.isFinite(price) ? price : 0,
        cost: Number.isFinite(cost) ? cost : null,
        marginPct: typeof marginPct === "number" && Number.isFinite(marginPct) ? Math.round(marginPct * 10) / 10 : null,
        flags,
        suggestedActions,
      };
    });

    res.json({ items });
  } catch (err) {
    console.error("❌ Profit Guard error:", err);
    res.status(500).json({ message: "Failed to compute profit guard" });
  }
});

// منتج واحد
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const productResult = await pool.query(
      `SELECT id, name, name_ar, name_en, price, description, description_ar, description_en, 
              category_id, unit, price_per_unit, unit_step, image_url, barcode,
              is_featured, discount_price, discount_percentage,
              short_description_ar, short_description_en, full_description_ar, full_description_en,
              ingredients_ar, ingredients_en, nutrition_facts_ar, nutrition_facts_en,
              allergens_ar, allergens_en, storage_instructions_ar, storage_instructions_en,
              origin_country, brand
       FROM products WHERE id = $1`,
      [id]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }
    
    const product = productResult.rows[0];
    
    // Get images from product_images table
    const imagesResult = await pool.query(
      `SELECT id, url, sort_order, is_primary 
       FROM product_images 
       WHERE product_id = $1 
       ORDER BY is_primary DESC, sort_order ASC`,
      [id]
    );
    
    // If no images in product_images, use image_url as primary
    let images = imagesResult.rows.map(img => ({
      id: img.id,
      url: img.url,
      is_primary: img.is_primary,
      sort_order: img.sort_order
    }));
    
    if (images.length === 0 && product.image_url) {
      images = [{
        id: null,
        url: product.image_url,
        is_primary: true,
        sort_order: 0
      }];
    }
    
    // Get primary image URL
    const primaryImage = images.find(img => img.is_primary) || images[0];
    const primary_image_url = primaryImage ? primaryImage.url : product.image_url;
    
    res.json({
      ...product,
      images,
      primary_image_url,
      image_url: primary_image_url // Backward compatibility
    });
  } catch (err) {
    console.error("Get product error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب المنتج" });
  }
});

// إضافة منتج جديد (مربوطة لاحقاً بلوحة تحكم)
app.post("/api/products", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      name_ar,
      name_en,
      price,
      description,
      description_ar,
      description_en,
      short_description_ar,
      short_description_en,
      full_description_ar,
      full_description_en,
      ingredients_ar,
      ingredients_en,
      nutrition_facts_ar,
      nutrition_facts_en,
      allergens_ar,
      allergens_en,
      storage_instructions_ar,
      storage_instructions_en,
      brand,
      origin_country,
      category_id,
      unit,
      price_per_unit,
      unit_step,
      image_url,
      barcode,
      stock_quantity,
      is_featured,
      discount_price,
      discount_percentage,
      cost_price,
      is_price_locked,
      images,
    } = req.body || {};
    
    // التحقق من وجود اسم (عربي أو إنجليزي أو الاسم القديم)
    if (!name && !name_ar && !name_en) {
      return res
        .status(400)
        .json({ message: "اسم المنتج مطلوب (name_ar أو name_en أو name)" });
    }
    
    if (price == null && price_per_unit == null && cost_price == null) {
      return res
        .status(400)
        .json({ message: "السعر مطلوب" });
    }

    // استخدام name_ar أو name_en أو name (للتوافق مع القديم)
    const final_name_ar = name_ar || name || '';
    const final_name_en = name_en || '';

    // معالجة الصور
    let final_images = images;
    let final_image_url = image_url;
    
    // إذا تم إرسال مصفوفة صور، نستخدم الصورة الأولى كصورة رئيسية
    if (Array.isArray(images) && images.length > 0) {
      final_images = images.slice(0, 5); // حد أقصى 5 صور
      if (!final_image_url) {
        final_image_url = final_images[0];
      }
    } else if (image_url) {
      // إذا تم إرسال صورة واحدة فقط ولم تكن في المصفوفة، نضيفها
      final_images = [image_url];
    } else {
        final_images = null;
    }

    // Calculate initial price based on cost_price and tier rules if not provided or unlocked
    let final_price = price || price_per_unit;
    
    if (cost_price && !is_price_locked) {
      try {
        const tierResult = await pool.query(
          `SELECT * FROM price_tier_rules 
           WHERE min_price <= $1 AND max_price >= $1 
           AND is_active = true 
           ORDER BY min_price DESC LIMIT 1`,
          [cost_price]
        );
        
        if (tierResult.rows.length > 0) {
          const rule = tierResult.rows[0];
          final_price = (parseFloat(cost_price) * (1 + parseFloat(rule.markup_percentage) / 100)).toFixed(2);
          console.log(`✅ Applied Tier Rule to New Product: Cost ${cost_price} -> Price ${final_price}`);
        }
      } catch (tierErr) {
        console.error("⚠️ Failed to apply tier pricing for new product:", tierErr);
      }
    }

    const result = await pool.query(
      `
        INSERT INTO products (
          name, name_ar, name_en, price, description, description_ar, description_en, 
          short_description_ar, short_description_en, full_description_ar, full_description_en,
          ingredients_ar, ingredients_en, nutrition_facts_ar, nutrition_facts_en,
          allergens_ar, allergens_en, storage_instructions_ar, storage_instructions_en,
          brand, origin_country,
          category_id, unit, price_per_unit, unit_step, image_url, barcode,
          is_featured, discount_price, discount_percentage, cost_price, is_price_locked, images
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
        RETURNING *;
      `,
      [
        final_name_ar, // name (backward compatibility)
        final_name_ar,
        final_name_en || null,
        final_price,
        description || description_ar || null,
        description_ar || null,
        description_en || null,
        short_description_ar || null,
        short_description_en || null,
        full_description_ar || null,
        full_description_en || null,
        ingredients_ar || null,
        ingredients_en || null,
        nutrition_facts_ar || null,
        nutrition_facts_en || null,
        allergens_ar || null,
        allergens_en || null,
        storage_instructions_ar || null,
        storage_instructions_en || null,
        brand || null,
        origin_country || null,
        category_id || null,
        unit || "piece",
        final_price, // price_per_unit sync
        unit_step || 1,
        final_image_url || null,
        barcode || null,
        is_featured || false,
        discount_price || null,
        discount_percentage || null,
        cost_price || null,
        is_price_locked || false,
        final_images
      ]
    );

    const newProduct = result.rows[0];

    // إضافة المخزون الأولي إذا تم إرساله
    if (stock_quantity !== undefined && stock_quantity !== null) {
      try {
         const qty = parseInt(stock_quantity);
         if (!isNaN(qty)) {
           await pool.query(
            `
            INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
            SELECT id, $1, $2, ($2 > 0) FROM stores WHERE is_active = true
            ON CONFLICT (store_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity, is_available = EXCLUDED.is_available;
            `,
            [newProduct.id, qty]
           );
         }
      } catch (invErr) {
         console.error("⚠️ Initial inventory set failed:", invErr.message);
      }
    } else {
        // افتراضياً نضيف 0 مخزون للمتجر الرئيسي
        try {
           await pool.query(
            `
            INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
            SELECT id, $1, 0, false FROM stores WHERE is_active = true
            ON CONFLICT DO NOTHING
            `,
            [newProduct.id]
           );
        } catch (e) { /* ignore */ }
    }

    res.status(201).json(newProduct);
  } catch (err) {
    console.error("❌ Create product error:", err);
    res.status(500).json({ message: "حدث خطأ في إضافة المنتج: " + err.message });
  }
});

// تعديل منتج
app.put("/api/products/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      name_ar,
      name_en,
      price,
      description,
      description_ar,
      description_en,
      category_id,
      unit,
      price_per_unit,
      unit_step,
      image_url,
      barcode,
      stock_quantity,
      is_featured,
      discount_price,
      discount_percentage,
      cost_price,
      is_price_locked,
      images,
    } = req.body || {};

    // استخدام name_ar أو name_en أو name (للتوافق مع القديم)
    const final_name_ar = name_ar !== undefined ? name_ar : (name !== undefined ? name : null);
    const final_name_en = name_en !== undefined ? name_en : null;

    // معالجة الصور
    let final_images = images;
    let final_image_url = image_url;
    
    // إذا تم إرسال مصفوفة صور، نستخدم الصورة الأولى كصورة رئيسية
    if (Array.isArray(images) && images.length > 0) {
      final_images = images.slice(0, 5); // حد أقصى 5 صور
      if (image_url === undefined && final_images.length > 0) {
         // إذا لم يتم تحديد image_url صراحة، نستخدم الأولى
         final_image_url = final_images[0];
      }
    } else if (image_url) {
      // إذا تم إرسال صورة واحدة فقط، نضيفها للمصفوفة إذا كانت المصفوفة غير موجودة
      if (!final_images) {
          final_images = [image_url];
      }
    }

    // معالجة category_id (تحويل النص الفارغ أو غير الصالح إلى null)
    let final_category_id = category_id;
    if (!final_category_id || 
        final_category_id === "null" || 
        final_category_id === "undefined" || 
        (typeof final_category_id === 'string' && final_category_id.trim() === "")) {
      final_category_id = null;
    }

    // معالجة القيم الرقمية
    const final_discount_price = (discount_price !== "" && discount_price !== null) ? discount_price : null;
    const final_discount_percentage = (discount_percentage !== "" && discount_percentage !== null) ? discount_percentage : null;

    const result = await pool.query(
      `
        UPDATE products
        SET
          name = COALESCE($1, name),
          name_ar = COALESCE($1, name_ar, name),
          name_en = COALESCE($2, name_en),
          price = COALESCE($3, price),
          description = COALESCE($4, description),
          description_ar = COALESCE($5, description_ar),
          description_en = COALESCE($6, description_en),
          short_description_ar = COALESCE($20, short_description_ar),
          short_description_en = COALESCE($21, short_description_en),
          full_description_ar = COALESCE($22, full_description_ar),
          full_description_en = COALESCE($23, full_description_en),
          ingredients_ar = COALESCE($24, ingredients_ar),
          ingredients_en = COALESCE($25, ingredients_en),
          nutrition_facts_ar = COALESCE($26, nutrition_facts_ar),
          nutrition_facts_en = COALESCE($27, nutrition_facts_en),
          allergens_ar = COALESCE($28, allergens_ar),
          allergens_en = COALESCE($29, allergens_en),
          storage_instructions_ar = COALESCE($30, storage_instructions_ar),
          storage_instructions_en = COALESCE($31, storage_instructions_en),
          brand = COALESCE($32, brand),
          origin_country = COALESCE($33, origin_country),
          category_id = $7, -- Use direct value, logic handled above
          unit = COALESCE($8, unit),
          price_per_unit = COALESCE($9, price_per_unit),
          unit_step = COALESCE($10, unit_step),
          image_url = COALESCE($11, image_url),
          barcode = COALESCE($12, barcode),
          is_featured = COALESCE($13, is_featured),
          discount_price = $14,
          discount_percentage = $15,
          cost_price = COALESCE($17, cost_price),
          is_price_locked = COALESCE($18, is_price_locked),
          images = COALESCE($19, images)
        WHERE id = $16
        RETURNING *;
      `,
      [
        final_name_ar,
        final_name_en,
        price,
        description || description_ar,
        description_ar,
        description_en,
        final_category_id,
        unit,
        price_per_unit,
        unit_step,
        final_image_url,
        barcode,
        is_featured,
        final_discount_price,
        final_discount_percentage,
        id,
        req.body.cost_price || null,
        req.body.is_price_locked !== undefined ? req.body.is_price_locked : null,
        final_images,
        short_description_ar || null,
        short_description_en || null,
        full_description_ar || null,
        full_description_en || null,
        ingredients_ar || null,
        ingredients_en || null,
        nutrition_facts_ar || null,
        nutrition_facts_en || null,
        allergens_ar || null,
        allergens_en || null,
        storage_instructions_ar || null,
        storage_instructions_en || null,
        brand || null,
        origin_country || null
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    // تحديث المخزون إذا تم إرساله
    if (stock_quantity !== undefined && stock_quantity !== null) {
      try {
        const qty = parseInt(stock_quantity);
        if (!isNaN(qty)) {
          await pool.query(
            `
            INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
            SELECT id, $1, $2, ($2 > 0) FROM stores WHERE is_active = true
            ON CONFLICT (store_id, product_id) 
            DO UPDATE SET quantity = EXCLUDED.quantity, is_available = EXCLUDED.is_available;
            `,
            [result.rows[0].id, qty]
          );
        }
      } catch (invErr) {
        console.error("⚠️ Inventory update failed:", invErr.message);
        // Don't fail the whole request if inventory fails, just log it
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Update product error:", err);
    res.status(500).json({ message: "حدث خطأ في تعديل المنتج: " + err.message });
  }
});

// حذف منتج
app.delete("/api/products/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // First delete dependent data that might lack CASCADE
    await pool.query('DELETE FROM store_inventory WHERE product_id = $1', [id]);
    await pool.query('DELETE FROM sync_logs WHERE product_id = $1', [id]);
    await pool.query('DELETE FROM store_prices WHERE product_id = $1', [id]);

    const result = await pool.query(
      `DELETE FROM products WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }

    res.json({ message: "تم حذف المنتج بنجاح" });
  } catch (err) {
    console.error("Delete product error:", err);
    if (err.code === '23503') {
      return res.status(400).json({ message: "لا يمكن حذف المنتج لأنه مرتبط بطلبات سابقة. يفضل تعطيله بدلاً من حذفه." });
    }
    res.status(500).json({ message: "حدث خطأ في حذف المنتج: " + err.message });
  }
});

// Bulk Delete Products - حذف جماعي للمنتجات
app.post("/api/admin/products/bulk-delete", authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "قائمة المنتجات للحذف غير صالحة" });
    }

    console.log(`🗑️ Bulk Deleting ${ids.length} products:`, ids);

    // Delete dependent data first
    await pool.query('DELETE FROM store_inventory WHERE product_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM sync_logs WHERE product_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM store_prices WHERE product_id = ANY($1)', [ids]);
    
    // Delete products
    const result = await pool.query('DELETE FROM products WHERE id = ANY($1) RETURNING id', [ids]);

    res.json({ 
      success: true, 
      message: `تم حذف ${result.rowCount} منتج بنجاح`,
      deletedCount: result.rowCount
    });
  } catch (err) {
    console.error("Bulk delete products error:", err);
    if (err.code === '23503') {
      return res.status(400).json({ message: "بعض المنتجات مرتبطة بطلبات سابقة ولا يمكن حذفها. يفضل تعطيلها." });
    }
    res.status(500).json({ message: "حدث خطأ في الحذف الجماعي: " + err.message });
  }
});

// Direct CSV File Import - رفع ملف CSV مباشرة
app.post("/api/admin/products/import-csv-file", authMiddleware, async (req, res) => {
  try {
    const csvFilePath = path.join(__dirname, "..", "final_saudi_products.csv");
    
    if (!fs.existsSync(csvFilePath)) {
      return res.status(404).json({ message: "ملف CSV غير موجود في: " + csvFilePath });
    }

    // قراءة ملف CSV
    const csvContent = fs.readFileSync(csvFilePath, "utf-8");
    const lines = csvContent.split("\n").filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ message: "الملف فارغ أو لا يحتوي على بيانات" });
    }

    // تحليل Header
    const headers = lines[0].split(",").map(h => h.trim());
    const products = [];

    // تحليل البيانات
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // معالجة CSV مع دعم الفواصل داخل النصوص
      const values = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length < headers.length) continue;

      const product = {};
      headers.forEach((header, index) => {
        product[header] = values[index] || "";
      });

      // استخدام Name_Ar إذا كان Name_Ar موجوداً، وإلا Name
      if (product.Name_Ar && product.Name_Ar.trim()) {
        product.name = product.Name_Ar.trim();
      } else if (product.Name && product.Name.trim()) {
        product.name = product.Name.trim();
      }

      if (product.name) {
        products.push(product);
      }
    }

    if (products.length === 0) {
      return res.status(400).json({ message: "لم يتم العثور على منتجات في الملف" });
    }

    // استخدام نفس منطق bulk-import
    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
    };

    // معالجة كل منتج
    for (const productData of products) {
      try {
        // Normalize column names
        const normalized = {};
        Object.keys(productData).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'name_ar' || lowerKey === 'name_ar') {
            normalized.name_ar = productData[key];
          } else if (lowerKey === 'name_en' || lowerKey === 'name_en') {
            normalized.name_en = productData[key];
          } else if (lowerKey.includes('name_ar')) {
            normalized.name_ar = productData[key];
          } else if (lowerKey.includes('name_en')) {
            normalized.name_en = productData[key];
          } else if (lowerKey.includes('name') && !normalized.name_ar && !normalized.name_en) {
            // Fallback: if only 'Name' is present, treat as Arabic
            normalized.name_ar = productData[key];
          } else if (lowerKey.includes('price') && !lowerKey.includes('per')) {
            normalized.price = productData[key];
          } else if (lowerKey.includes('barcode')) {
            normalized.barcode = productData[key];
          } else if (lowerKey.includes('category_ar') || (lowerKey.includes('category') && !normalized.category)) {
            normalized.category = productData[key];
          } else if (lowerKey === 'description_ar' || lowerKey.includes('description_ar')) {
            normalized.description_ar = productData[key];
          } else if (lowerKey === 'description_en' || lowerKey.includes('description_en')) {
            normalized.description_en = productData[key];
          } else if (lowerKey.includes('description') && !normalized.description_ar && !normalized.description_en) {
            normalized.description_ar = productData[key];
          } else if (lowerKey.includes('image_url') || lowerKey.includes('image')) {
            normalized.image_url = productData[key];
          } else if (lowerKey.includes('stock_quantity') || (lowerKey.includes('stock') && !normalized.stock_quantity)) {
            normalized.stock_quantity = productData[key];
          } else if (lowerKey.includes('unit') && !lowerKey.includes('step')) {
            normalized.unit = productData[key];
          } else if (lowerKey.includes('price_per_unit') || lowerKey.includes('priceperunit')) {
            normalized.price_per_unit = productData[key];
          } else if (lowerKey.includes('unit_step') || lowerKey.includes('unitstep')) {
            normalized.unit_step = productData[key];
          }
        });
        
        // Ensure we have at least one name
        normalized.name = normalized.name_ar || normalized.name_en || '';

        // التحقق من البيانات المطلوبة
        if (!normalized.name_ar && !normalized.name_en && !normalized.name) {
          results.errors++;
          continue;
        }
        
        // Ensure name_ar exists (use name_en or name as fallback)
        if (!normalized.name_ar) {
          normalized.name_ar = normalized.name_en || normalized.name || '';
        }

        // معالجة التصنيف
        let categoryId = null;
        if (normalized.category) {
          const categoryCheck = await pool.query(
            `SELECT id FROM categories WHERE LOWER(name) = LOWER($1)`,
            [normalized.category]
          );

          if (categoryCheck.rows.length > 0) {
            categoryId = categoryCheck.rows[0].id;
          } else {
            const newCategory = await pool.query(
              `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id`,
              [normalized.category, `تصنيف ${normalized.category}`]
            );
            categoryId = newCategory.rows[0].id;
          }
        }

        // التحقق من وجود المنتج بالـ Barcode
        if (normalized.barcode && normalized.barcode.trim()) {
          const existingProduct = await pool.query(
            `SELECT id FROM products WHERE barcode = $1`,
            [normalized.barcode.trim()]
          );

          if (existingProduct.rows.length > 0) {
            // تحديث المنتج الموجود
            const productId = existingProduct.rows[0].id;
            const price = parseFloat(normalized.price || normalized.price_per_unit || 0);
            const pricePerUnit = parseFloat(normalized.price_per_unit || normalized.price || price);

            await pool.query(
              `UPDATE products SET
                name = COALESCE($1, name),
                name_ar = COALESCE($1, name_ar, name),
                name_en = COALESCE($2, name_en),
                price = COALESCE($3, price),
                price_per_unit = COALESCE($4, price_per_unit),
                description = COALESCE($5, description),
                description_ar = COALESCE($6, description_ar),
                description_en = COALESCE($7, description_en),
                category_id = COALESCE($8, category_id),
                image_url = COALESCE($9, image_url),
                unit = COALESCE($10, unit),
                unit_step = COALESCE($11, unit_step)
              WHERE id = $12`,
              [
                normalized.name_ar || normalized.name,
                normalized.name_en || null,
                price,
                pricePerUnit,
                normalized.description_ar || normalized.description || null,
                normalized.description_ar || null,
                normalized.description_en || null,
                categoryId,
                normalized.image_url || null,
                normalized.unit || 'piece',
                normalized.unit_step ? parseFloat(normalized.unit_step) : 1,
                productId,
              ]
            );

            if (normalized.stock_quantity !== undefined && normalized.stock_quantity !== null) {
              await pool.query(
                `INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
                VALUES (1, $1, $2, true)
                ON CONFLICT (store_id, product_id) DO UPDATE SET 
                  quantity = $2,
                  is_available = CASE WHEN $2 > 0 THEN true ELSE false END`,
                [productId, parseInt(normalized.stock_quantity) || 100]
              );
            }

            results.skipped++;
          } else {
            // إنشاء منتج جديد
            const price = parseFloat(normalized.price || normalized.price_per_unit || 0);
            const pricePerUnit = parseFloat(normalized.price_per_unit || normalized.price || price);

            const newProduct = await pool.query(
              `INSERT INTO products (
                name, name_ar, name_en, price, price_per_unit, description, description_ar, description_en, category_id,
                image_url, barcode, unit, unit_step
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              RETURNING id`,
              [
                normalized.name_ar || normalized.name,
                normalized.name_ar || normalized.name,
                normalized.name_en || null,
                price,
                pricePerUnit,
                normalized.description_ar || normalized.description || null,
                normalized.description_ar || null,
                normalized.description_en || null,
                categoryId,
                normalized.image_url || null,
                normalized.barcode.trim() || null,
                normalized.unit || 'piece',
                normalized.unit_step ? parseFloat(normalized.unit_step) : 1,
              ]
            );

            if (normalized.stock_quantity !== undefined && normalized.stock_quantity !== null) {
              await pool.query(
                `INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
                VALUES (1, $1, $2, true)
                ON CONFLICT (store_id, product_id) DO UPDATE SET 
                  quantity = $2,
                  is_available = CASE WHEN $2 > 0 THEN true ELSE false END`,
                [newProduct.rows[0].id, parseInt(normalized.stock_quantity) || 100]
              );
            }

            results.success++;
          }
        } else {
          // لا يوجد Barcode - إنشاء منتج جديد
          const price = parseFloat(normalized.price || normalized.price_per_unit || 0);
          const pricePerUnit = parseFloat(normalized.price_per_unit || normalized.price || price);

          const newProduct = await pool.query(
            `INSERT INTO products (
              name, name_ar, name_en, price, price_per_unit, description, description_ar, description_en, category_id,
              image_url, unit, unit_step
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id`,
            [
              normalized.name_ar || normalized.name,
              normalized.name_ar || normalized.name,
              normalized.name_en || null,
              price,
              pricePerUnit,
              normalized.description_ar || normalized.description || null,
              normalized.description_ar || null,
              normalized.description_en || null,
              categoryId,
              normalized.image_url || null,
              normalized.unit || 'piece',
              normalized.unit_step ? parseFloat(normalized.unit_step) : 1,
            ]
          );

          if (normalized.stock_quantity !== undefined && normalized.stock_quantity !== null) {
            await pool.query(
              `INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
              VALUES (1, $1, $2, true)
              ON CONFLICT (store_id, product_id) DO UPDATE SET 
                quantity = $2,
                is_available = CASE WHEN $2 > 0 THEN true ELSE false END`,
              [newProduct.rows[0].id, parseInt(normalized.stock_quantity) || 100]
            );
          }

          results.success++;
        }
      } catch (err) {
        console.error("Error processing product:", err, productData);
        results.errors++;
      }
    }

    res.json({
      message: `تم معالجة ${products.length} منتج من ملف CSV`,
      results,
      filePath: csvFilePath,
    });
  } catch (err) {
    console.error("CSV file import error:", err);
    res.status(500).json({ message: "حدث خطأ في استيراد ملف CSV: " + err.message });
  }
});

// Bulk Import Products from Excel/CSV
app.post("/api/admin/products/bulk-import", authMiddleware, async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "البيانات غير صحيحة" });
    }

    const results = {
      success: 0,
      errors: 0,
      skipped: 0,
    };

    // معالجة كل منتج
    for (const productData of products) {
      try {
        // Normalize column names (case-insensitive)
        const normalized = {};
        Object.keys(productData).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'name_ar' || lowerKey.includes('name_ar')) {
            normalized.name_ar = productData[key];
          } else if (lowerKey === 'name_en' || lowerKey.includes('name_en')) {
            normalized.name_en = productData[key];
          } else if (lowerKey.includes('name') && !normalized.name_ar && !normalized.name_en) {
            // Fallback: if only 'Name' is present, treat as Arabic
            normalized.name_ar = productData[key];
          } else if (lowerKey.includes('price') && !lowerKey.includes('per')) {
            normalized.price = productData[key];
          } else if (lowerKey.includes('barcode')) {
            normalized.barcode = productData[key];
          } else if (lowerKey.includes('category')) {
            normalized.category = productData[key];
          } else if (lowerKey === 'description_ar' || lowerKey.includes('description_ar')) {
            normalized.description_ar = productData[key];
          } else if (lowerKey === 'description_en' || lowerKey.includes('description_en')) {
            normalized.description_en = productData[key];
          } else if (lowerKey.includes('description') && !normalized.description_ar && !normalized.description_en) {
            normalized.description_ar = productData[key];
          } else if (lowerKey.includes('image') || lowerKey.includes('url')) {
            normalized.image_url = productData[key];
          } else if (lowerKey.includes('stock') || lowerKey.includes('quantity')) {
            normalized.stock_quantity = productData[key];
          } else if (lowerKey.includes('unit') && !lowerKey.includes('step')) {
            normalized.unit = productData[key];
          } else if (lowerKey.includes('price_per_unit') || lowerKey.includes('priceperunit')) {
            normalized.price_per_unit = productData[key];
          } else if (lowerKey.includes('unit_step') || lowerKey.includes('unitstep')) {
            normalized.unit_step = productData[key];
          }
        });
        
        // Ensure we have at least one name
        normalized.name = normalized.name_ar || normalized.name_en || '';
        if (!normalized.name_ar) {
          normalized.name_ar = normalized.name_en || normalized.name || '';
        }

        // التحقق من البيانات المطلوبة
        if (!normalized.name_ar && !normalized.name_en || (!normalized.price && !normalized.price_per_unit)) {
          results.errors++;
          continue;
        }

        // معالجة التصنيف - إنشاءه إذا لم يكن موجوداً
        let categoryId = null;
        if (normalized.category) {
          const categoryCheck = await pool.query(
            `SELECT id FROM categories WHERE LOWER(name) = LOWER($1)`,
            [normalized.category]
          );

          if (categoryCheck.rows.length > 0) {
            categoryId = categoryCheck.rows[0].id;
          } else {
            // إنشاء التصنيف الجديد
            const newCategory = await pool.query(
              `INSERT INTO categories (name) VALUES ($1) RETURNING id`,
              [normalized.category]
            );
            categoryId = newCategory.rows[0].id;
          }
        }

        // التحقق من وجود المنتج بالـ Barcode
        if (normalized.barcode) {
          const existingProduct = await pool.query(
            `SELECT id FROM products WHERE barcode = $1`,
            [normalized.barcode]
          );

          if (existingProduct.rows.length > 0) {
            // تحديث المنتج الموجود
            const productId = existingProduct.rows[0].id;
            const price = parseFloat(normalized.price || normalized.price_per_unit || 0);
            const pricePerUnit = parseFloat(normalized.price_per_unit || normalized.price || price);

            await pool.query(
              `
              UPDATE products SET
                name = COALESCE($1, name),
                name_ar = COALESCE($1, name_ar, name),
                name_en = COALESCE($2, name_en),
                price = COALESCE($3, price),
                price_per_unit = COALESCE($4, price_per_unit),
                description = COALESCE($5, description),
                description_ar = COALESCE($6, description_ar),
                description_en = COALESCE($7, description_en),
                category_id = COALESCE($8, category_id),
                image_url = COALESCE($9, image_url),
                unit = COALESCE($10, unit),
                unit_step = COALESCE($11, unit_step)
              WHERE id = $12
              `,
              [
                normalized.name_ar || normalized.name,
                normalized.name_en || null,
                price,
                pricePerUnit,
                normalized.description_ar || normalized.description || null,
                normalized.description_ar || null,
                normalized.description_en || null,
                categoryId,
                normalized.image_url || null,
                normalized.unit || 'piece',
                normalized.unit_step ? parseFloat(normalized.unit_step) : 1,
                productId,
              ]
            );

            // تحديث المخزون في المتجر الافتراضي (Store ID = 1) إذا كان موجوداً
            if (normalized.stock_quantity !== undefined && normalized.stock_quantity !== null) {
              await pool.query(
                `
                INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
                VALUES (1, $1, $2, true)
                ON CONFLICT (store_id, product_id) DO UPDATE SET 
                  quantity = $2,
                  is_available = CASE WHEN $2 > 0 THEN true ELSE false END
                `,
                [productId, parseInt(normalized.stock_quantity)]
              );
            }

            results.success++;
          } else {
            // إنشاء منتج جديد
            const price = parseFloat(normalized.price || normalized.price_per_unit || 0);
            const pricePerUnit = parseFloat(normalized.price_per_unit || normalized.price || price);

            const newProduct = await pool.query(
              `
              INSERT INTO products (
                name, name_ar, name_en, price, price_per_unit, description, description_ar, description_en, category_id,
                image_url, barcode, unit, unit_step
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              RETURNING id
              `,
              [
                normalized.name_ar || normalized.name,
                normalized.name_ar || normalized.name,
                normalized.name_en || null,
                price,
                pricePerUnit,
                normalized.description_ar || normalized.description || null,
                normalized.description_ar || null,
                normalized.description_en || null,
                categoryId,
                normalized.image_url || null,
                normalized.barcode || null,
                normalized.unit || 'piece',
                normalized.unit_step ? parseFloat(normalized.unit_step) : 1,
              ]
            );

            // إضافة المخزون في المتجر الافتراضي (Store ID = 1) إذا كان موجوداً
            if (normalized.stock_quantity !== undefined && normalized.stock_quantity !== null) {
              await pool.query(
                `
                INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
                VALUES (1, $1, $2, true)
                ON CONFLICT (store_id, product_id) DO UPDATE SET 
                  quantity = $2,
                  is_available = CASE WHEN $2 > 0 THEN true ELSE false END
                `,
                [newProduct.rows[0].id, parseInt(normalized.stock_quantity)]
              );
            }

            results.success++;
          }
        } else {
          // لا يوجد Barcode - إنشاء منتج جديد دائماً
          const price = parseFloat(normalized.price || normalized.price_per_unit || 0);
          const pricePerUnit = parseFloat(normalized.price_per_unit || normalized.price || price);

          const newProduct = await pool.query(
            `
            INSERT INTO products (
              name, name_ar, name_en, price, price_per_unit, description, description_ar, description_en, category_id,
              image_url, unit, unit_step
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
            `,
            [
              normalized.name_ar || normalized.name,
              normalized.name_ar || normalized.name,
              normalized.name_en || null,
              price,
              pricePerUnit,
              normalized.description_ar || normalized.description || null,
              normalized.description_ar || null,
              normalized.description_en || null,
              categoryId,
              normalized.image_url || null,
              normalized.unit || 'piece',
              normalized.unit_step ? parseFloat(normalized.unit_step) : 1,
            ]
          );

          // إضافة المخزون في المتجر الافتراضي (Store ID = 1) إذا كان موجوداً
          if (normalized.stock_quantity !== undefined && normalized.stock_quantity !== null) {
            await pool.query(
              `
              INSERT INTO store_inventory (store_id, product_id, quantity, is_available)
              VALUES (1, $1, $2, true)
              ON CONFLICT (store_id, product_id) DO UPDATE SET 
                quantity = $2,
                is_available = CASE WHEN $2 > 0 THEN true ELSE false END
              `,
              [newProduct.rows[0].id, parseInt(normalized.stock_quantity)]
            );
          }

          results.success++;
        }
      } catch (err) {
        console.error("Error processing product:", err, productData);
        results.errors++;
      }
    }

    res.json({
      message: `تم معالجة ${products.length} منتج`,
      results,
    });
  } catch (err) {
    console.error("Bulk import error:", err);
    res.status(500).json({ message: "حدث خطأ في استيراد المنتجات" });
  }
});

// ================= Multi-Store System Routes =================

// حساب المسافة بين نقطتين (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Smart Store Selection Algorithm - اختيار المتجر الذكي
async function selectBestStore(productId, quantity, customerLat, customerLon) {
  try {
    // جلب جميع المتاجر النشطة التي لديها المنتج في المخزون
    const storesResult = await pool.query(`
      SELECT 
        s.id, s.name, s.code, s.latitude, s.longitude, s.delivery_radius,
        si.quantity as stock_quantity,
        COALESCE(sp.price, p.price) as price,
        calculate_distance($1, $2, s.latitude, s.longitude) as distance
      FROM stores s
      INNER JOIN store_inventory si ON s.id = si.store_id
      INNER JOIN products p ON si.product_id = p.id
      LEFT JOIN store_prices sp ON s.id = sp.store_id AND p.id = sp.product_id AND sp.is_active = true
      WHERE s.is_active = true
        AND si.product_id = $3
        AND si.is_available = true
        AND si.quantity >= $4
        AND (
          sp.effective_to IS NULL OR sp.effective_to > NOW()
        )
      ORDER BY 
        calculate_distance($1, $2, s.latitude, s.longitude) ASC,
        COALESCE(sp.price, p.price) ASC
      LIMIT 1;
    `, [customerLat, customerLon, productId, quantity]);

    if (storesResult.rows.length === 0) {
      return null; // لا يوجد متجر متاح
    }

    const store = storesResult.rows[0];
    
    // التحقق من أن المتجر ضمن نطاق التوصيل
    if (store.distance > store.delivery_radius) {
      return null; // المتجر خارج نطاق التوصيل
    }

    return {
      store_id: store.id,
      store_name: store.name,
      store_code: store.code,
      price: parseFloat(store.price),
      distance: store.distance,
      stock_quantity: parseInt(store.stock_quantity)
    };
  } catch (err) {
    console.error("Smart store selection error:", err);
    return null;
  }
}

// إضافة دالة حساب المسافة في قاعدة البيانات
app.post("/api/admin/stores/init-distance-function", authMiddleware, async (req, res) => {
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION calculate_distance(lat1 NUMERIC, lon1 NUMERIC, lat2 NUMERIC, lon2 NUMERIC)
      RETURNS NUMERIC AS $$
      DECLARE
        R NUMERIC := 6371;
        dLat NUMERIC;
        dLon NUMERIC;
        a NUMERIC;
        c NUMERIC;
      BEGIN
        dLat := (lat2 - lat1) * PI() / 180;
        dLon := (lon2 - lon1) * PI() / 180;
        a := SIN(dLat/2) * SIN(dLat/2) +
             COS(lat1 * PI() / 180) * COS(lat2 * PI() / 180) *
             SIN(dLon/2) * SIN(dLon/2);
        c := 2 * ATAN2(SQRT(a), SQRT(1-a));
        RETURN R * c;
      END;
      $$ LANGUAGE plpgsql;
    `);
    res.json({ message: "تم إنشاء دالة حساب المسافة" });
  } catch (err) {
    console.error("Init distance function error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء الدالة" });
  }
});

// إدارة المتاجر
app.get("/api/admin/stores", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
        COUNT(DISTINCT si.product_id) as products_count,
        COUNT(DISTINCT CASE WHEN si.quantity > 0 THEN si.product_id END) as available_products
      FROM stores s
      LEFT JOIN store_inventory si ON s.id = si.store_id
      GROUP BY s.id
      ORDER BY s.created_at DESC;
    `);
    res.json({ stores: result.rows });
  } catch (err) {
    console.error("Get stores error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب المتاجر" });
  }
});

app.post("/api/admin/stores", authMiddleware, async (req, res) => {
  try {
    const { name, code, address, latitude, longitude, phone, email, manager_name, delivery_radius } = req.body;
    
    const result = await pool.query(`
      INSERT INTO stores (name, code, address, latitude, longitude, phone, email, manager_name, delivery_radius)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [name, code, address, latitude, longitude, phone, email, manager_name, delivery_radius || 10.0]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create store error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء المتجر" });
  }
});

app.put("/api/admin/stores/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, latitude, longitude, phone, email, manager_name, is_active, delivery_radius } = req.body;
    
    const result = await pool.query(`
      UPDATE stores
      SET name = COALESCE($1, name),
          code = COALESCE($2, code),
          address = COALESCE($3, address),
          latitude = COALESCE($4, latitude),
          longitude = COALESCE($5, longitude),
          phone = COALESCE($6, phone),
          email = COALESCE($7, email),
          manager_name = COALESCE($8, manager_name),
          is_active = COALESCE($9, is_active),
          delivery_radius = COALESCE($10, delivery_radius),
          updated_at = NOW()
      WHERE id = $11
      RETURNING *;
    `, [name, code, address, latitude, longitude, phone, email, manager_name, is_active, delivery_radius, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "المتجر غير موجود" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update store error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث المتجر" });
  }
});

app.delete("/api/admin/stores/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM stores WHERE id = $1", [id]);
    res.json({ message: "تم حذف المتجر بنجاح" });
  } catch (err) {
    console.error("Delete store error:", err);
    res.status(500).json({ message: "حدث خطأ في حذف المتجر" });
  }
});

// إدارة المخزون
app.get("/api/admin/stores/:storeId/inventory", authMiddleware, async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await pool.query(`
      SELECT si.*, p.name as product_name, p.price as default_price
      FROM store_inventory si
      JOIN products p ON si.product_id = p.id
      WHERE si.store_id = $1
      ORDER BY p.name;
    `, [storeId]);
    res.json({ inventory: result.rows });
  } catch (err) {
    console.error("Get inventory error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب المخزون" });
  }
});

app.post("/api/admin/stores/:storeId/inventory", authMiddleware, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { product_id, quantity, min_stock_level, is_available } = req.body;
    
    const result = await pool.query(`
      INSERT INTO store_inventory (store_id, product_id, quantity, min_stock_level, is_available)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (store_id, product_id)
      DO UPDATE SET quantity = $3, min_stock_level = $4, is_available = $5, last_updated = NOW()
      RETURNING *;
    `, [storeId, product_id, quantity, min_stock_level || 10, is_available !== false]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update inventory error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث المخزون" });
  }
});

// إدارة الأسعار
app.get("/api/admin/stores/:storeId/prices", authMiddleware, async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await pool.query(`
      SELECT sp.*, p.name as product_name
      FROM store_prices sp
      JOIN products p ON sp.product_id = p.id
      WHERE sp.store_id = $1 AND sp.is_active = true
        AND (sp.effective_to IS NULL OR sp.effective_to > NOW())
      ORDER BY p.name;
    `, [storeId]);
    res.json({ prices: result.rows });
  } catch (err) {
    console.error("Get prices error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الأسعار" });
  }
});

app.post("/api/admin/stores/:storeId/prices", authMiddleware, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { product_id, price, effective_to } = req.body;
    
    // تعطيل السعر القديم
    await pool.query(`
      UPDATE store_prices
      SET is_active = false, effective_to = NOW()
      WHERE store_id = $1 AND product_id = $2 AND is_active = true;
    `, [storeId, product_id]);
    
    // إضافة السعر الجديد
    const result = await pool.query(`
      INSERT INTO store_prices (store_id, product_id, price, effective_to)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [storeId, product_id, price, effective_to || null]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update price error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث السعر" });
  }
});

// ================= Order Routes =================

// إنشاء طلب جديد مع Smart Store Selection
// body: { items: [{ product_id, quantity, unit_price, unit }, ...], delivery_address, delivery_latitude, delivery_longitude, delivery_notes }
// إنشاء طلب جديد مع Smart Store Selection (Transactional)
// body: { items: [{ product_id, quantity, unit_price, unit }, ...], delivery_address, delivery_latitude, delivery_longitude, delivery_notes }
app.post("/api/orders", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      items,
      delivery_address,
      delivery_latitude,
      delivery_longitude,
      delivery_notes,
      payment_method = 'online', // نظام الدفع الإلكتروني فقط
    } = req.body || {};
    
    // فرض الدفع الإلكتروني فقط
    if (payment_method !== 'online' && payment_method !== 'card') {
      return res.status(400).json({ 
        message: "نظام TOMO يعتمد على الدفع الإلكتروني فقط. يرجى استخدام طريقة الدفع الإلكتروني" 
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "لابد من وجود عناصر في الطلب" });
    }

    // Start Transaction
    await client.query('BEGIN');

    // حساب إجمالي المبلغ الأولي (سيتم تحديثه بعد Smart Store Selection)
    let initialTotal = 0;
    items.forEach((it) => {
      initialTotal += Number(it.unit_price) * Number(it.quantity);
    });

    // Generate public_code
    const publicCodeRes = await client.query('SELECT nextval(\'orders_id_seq\')');
    const nextOrderId = publicCodeRes.rows[0].nextval;
    const publicCode = 'ORD' + String(nextOrderId).padStart(8, '0');
    
    // Find or create customer address
    let addressId = null;
    if (delivery_latitude && delivery_longitude) {
      // Try to find existing address
      const addrRes = await client.query(
        `SELECT id FROM customer_addresses 
         WHERE customer_id = $1 AND lat = $2 AND lng = $3 
         LIMIT 1`,
        [req.user.id, delivery_latitude, delivery_longitude]
      );
      
      if (addrRes.rows.length > 0) {
        addressId = addrRes.rows[0].id;
      } else {
        // Create new address
        const newAddrRes = await client.query(
          `INSERT INTO customer_addresses (customer_id, lat, lng, address_text, label)
           VALUES ($1, $2, $3, $4, 'Default')
           RETURNING id`,
          [req.user.id, delivery_latitude, delivery_longitude, delivery_address || null]
        );
        addressId = newAddrRes.rows[0].id;
      }
    }
    
    // Find zone if coordinates provided
    let zoneId = null;
    if (delivery_latitude && delivery_longitude) {
      const zoneRes = await client.query(
        `SELECT z.id FROM zones z
         JOIN store_zones sz ON z.id = sz.zone_id
         WHERE z.is_active = true
         LIMIT 1`
      );
      if (zoneRes.rows.length > 0) {
        zoneId = zoneRes.rows[0].id;
      }
    }
    
    // إنشاء الطلب - Updated Schema
    const orderRes = await client.query(
      `
        INSERT INTO orders (
          public_code, customer_id, user_id, 
          store_id, zone_id, address_id,
          total_amount, total, subtotal, 
          delivery_fee, service_fee, discount,
          currency, status, payment_status, payment_method,
          delivery_address, delivery_latitude, delivery_longitude, 
          delivery_notes, notes_customer
        )
        VALUES ($1, $2, $2, $3, $4, $5, $6, $6, $6, 0, 0, 0, 'SAR', $12, 'paid', $7, $8, $9, $10, $11, $11)
        RETURNING id, public_code, customer_id, user_id, total_amount, total, status, payment_status, created_at;
      `,
      [
        publicCode,
        req.user.id,
        null, // store_id will be set after Smart Store Selection
        zoneId,
        addressId,
        initialTotal, // سيتم تحديثه بعد Smart Store Selection
        'online', // فرض الدفع الإلكتروني فقط
        delivery_address || null,
        delivery_latitude || null,
        delivery_longitude || null,
        delivery_notes || null,
        MVP_STATUSES.CREATED // MVP: Start with CREATED status
      ]
    );

    const order = orderRes.rows[0];

    // SLA: set payment_received_at once on electronic payment confirmation (idempotent)
    if (order.payment_status === 'paid' || order.payment_status === 'success') {
      await client.query(
        `UPDATE orders SET payment_received_at = COALESCE(payment_received_at, NOW()), paid_at = COALESCE(paid_at, NOW()) WHERE id = $1`,
        [order.id]
      );
    }

    // Smart Store Selection - اختيار المتجر الذكي لكل منتج
    const storeAssignments = [];
    let totalAmount = 0;

    for (const item of items) {
      if (!delivery_latitude || !delivery_longitude) {
        // Fallback to default price if no location
        const itemTotal = Number(item.unit_price) * Number(item.quantity);
        totalAmount += itemTotal;
        
        // Get product name for order_items
        const productResFallback = await client.query('SELECT name FROM products WHERE id = $1', [item.product_id]);
        const productNameFallback = productResFallback.rows[0]?.name || 'Product';
        const qtyFallback = parseInt(item.quantity) || 1;
        const lineTotalFallback = Number(item.unit_price) * qtyFallback;
        
        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, qty, unit_price, line_total, unit, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active');
        `, [
          order.id, 
          item.product_id, 
          productNameFallback,
          item.quantity, 
          qtyFallback,
          item.unit_price, 
          lineTotalFallback,
          item.unit || 'piece'
        ]);
        continue;
      }

      const bestStore = await selectBestStore(
        item.product_id,
        item.quantity,
        delivery_latitude,
        delivery_longitude
      );

      if (!bestStore) {
        // Fallback to default price if no store found
        const itemTotal = Number(item.unit_price) * Number(item.quantity);
        totalAmount += itemTotal;
        
        // Get product name for order_items
        const productResFallback = await client.query('SELECT name FROM products WHERE id = $1', [item.product_id]);
        const productNameFallback = productResFallback.rows[0]?.name || 'Product';
        const qtyFallback = parseInt(item.quantity) || 1;
        const lineTotalFallback = Number(item.unit_price) * qtyFallback;
        
        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, qty, unit_price, line_total, unit, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active');
        `, [
          order.id, 
          item.product_id, 
          productNameFallback,
          item.quantity, 
          qtyFallback,
          item.unit_price, 
          lineTotalFallback,
          item.unit || 'piece'
        ]);
        continue;
      }

      // استخدام سعر المتجر المختار
      const finalPrice = bestStore.price;
      const itemTotal = finalPrice * Number(item.quantity);
      totalAmount += itemTotal;

      // إدخال عنصر الطلب
      // Get product name
      const productResFinal = await client.query('SELECT name FROM products WHERE id = $1', [item.product_id]);
      const productNameFinal = productResFinal.rows[0]?.name || 'Product';
      const qtyFinal = parseInt(item.quantity) || 1;
      const lineTotalFinal = Number(finalPrice) * qtyFinal;
      
      await client.query(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, qty, unit_price, line_total, unit, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active');
      `, [
        order.id, 
        item.product_id, 
        productNameFinal,
        item.quantity, 
        qtyFinal,
        finalPrice, 
        lineTotalFinal,
        item.unit || 'piece'
      ]);

      // تسجيل تخصيص المتجر
      await client.query(`
        INSERT INTO order_store_assignments (order_id, store_id, product_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (order_id, store_id, product_id) DO NOTHING;
      `, [order.id, bestStore.store_id, item.product_id, item.quantity, finalPrice]);

      // MVP: Soft reserve inventory
      try {
        await softReserveInventory(client, bestStore.store_id, item.product_id, item.quantity);
      } catch (invErr) {
        console.error(`Inventory reservation failed for product ${item.product_id}:`, invErr);
        throw new Error(`Insufficient inventory for product ${item.product_id}`);
      }
    }

    // Add Delivery Fee and VAT Logic
    const DELIVERY_FEE = 10.00;
    const TAX_RATE = 0.15;
    
    // Calculate final total (Subtotal + Delivery + VAT)
    const subtotal = totalAmount; // This is the sum of items from loop above
    const tax = subtotal * TAX_RATE;
    const finalTotal = subtotal + DELIVERY_FEE + tax;

    // تحديث إجمالي الطلب بالسعر الفعلي
    await client.query(`
      UPDATE orders SET total_amount = $1, total = $1, subtotal = $1 WHERE id = $2;
    `, [finalTotal, order.id]);

    // ================= Quick Commerce / Dark Store: Instant Store Notification & Rider Assignment =================
    // فور إنشاء الطلب: إرسال إشعار فوري للمخزن + البحث عن أقرب Rider متاح
    if (delivery_latitude && delivery_longitude) {
      // جلب store_id من order_store_assignments
      const storeAssignmentResult = await client.query(`
        SELECT DISTINCT store_id FROM order_store_assignments WHERE order_id = $1 LIMIT 1;
      `, [order.id]);

      if (storeAssignmentResult.rows.length > 0) {
        const assignedStoreId = storeAssignmentResult.rows[0].store_id;
        
        // MVP: Update store_id, keep status as CREATED (store will accept)
        await client.query(`
          UPDATE orders SET store_id = $1 WHERE id = $2;
        `, [assignedStoreId, order.id]);

        // ========== 1. إشعار فوري للمخزن (Dark Store) ==========
        if (io) {
          io.to(`store-${assignedStoreId}`).emit('new_order_instant', {
            order_id: order.id,
            total_amount: totalAmount,
            items_count: items.length,
            created_at: order.created_at,
            priority: 'high', // Quick Commerce: أولوية عالية
            message: 'طلب جديد - يرجى التحضير فوراً'
          });
          
          // إشعار لجميع الموظفين في المتجر
          io.to(`store-${assignedStoreId}`).emit('new_order', {
            order_id: order.id,
            total_amount: totalAmount,
            created_at: order.created_at
          });
        }

        // Unified event for dashboards/rooms
        emitOrderUpdated({
          orderId: order.id,
          status: order.status || MVP_STATUSES.CREATED,
          storeId: assignedStoreId,
          driverId: null,
          userId: order.user_id || (req.user && req.user.id) || null,
        });

        // ========== 2. Automated Order Dispatch System ==========
        const storeResult = await client.query(`
          SELECT latitude, longitude, name FROM stores WHERE id = $1;
        `, [assignedStoreId]);

        if (storeResult.rows.length > 0) {
          const store = storeResult.rows[0];
          
          // Use new dispatch system
          const dispatchResult = await dispatchOrder(order.id, assignedStoreId);
          
          if (dispatchResult && dispatchResult.success) {
            console.log(`✅ Dispatch: Order #${order.id} dispatched successfully (${dispatchResult.courier_name || `${dispatchResult.offers?.length || 0} offers`})`);
          } else {
            console.log(`⚠️ Dispatch: Order #${order.id} dispatch failed: ${dispatchResult?.reason || 'Unknown'}`);
            
            // Fallback to old system if dispatch fails
            const settingsRes = await client.query("SELECT value FROM system_settings WHERE key = 'auto_dispatch_enabled'");
            const isAutoDispatch = settingsRes.rows[0]?.value === 'true';
            
            let assignedRider = null;

            if (isAutoDispatch) {
            console.log('🤖 Auto-Dispatch: Searching for nearest rider...');
            // Find closest available rider (Distance Matrix Logic)
            const nearestRider = await client.query(`
              SELECT 
                d.id,
                d.user_id,
                u.name as rider_name,
                u.email,
                d.phone,
                d.vehicle_type,
                COALESCE(d.current_latitude, $1) as current_latitude,
                COALESCE(d.current_longitude, $2) as current_longitude,
                calculate_distance($1, $2, COALESCE(d.current_latitude, $1), COALESCE(d.current_longitude, $2)) as distance
              FROM drivers d
              JOIN users u ON d.user_id = u.id
              WHERE d.is_active = true
                AND d.is_approved = true
                AND d.is_banned = false
                AND u.is_active = true
                AND (d.last_seen > NOW() - INTERVAL '120 seconds' OR d.last_location_update > NOW() - INTERVAL '120 seconds') -- Heartbeat Check
                AND d.id NOT IN (
                  SELECT DISTINCT driver_id 
                  FROM orders 
                  WHERE driver_id IS NOT NULL 
                  AND status IN ('ASSIGNED', 'PICKED_UP')
                )
                AND calculate_distance($1, $2, COALESCE(d.current_latitude, $1), COALESCE(d.current_longitude, $2)) <= 15
              ORDER BY distance ASC
              LIMIT 1;
            `, [store.latitude, store.longitude]);

            if (nearestRider.rows.length > 0) {
              const rider = nearestRider.rows[0];
              assignedRider = rider;
              
              // MVP: Assign Order (READY -> ASSIGNED)
              await client.query(`
                UPDATE orders SET driver_id = $1, status = $2, updated_at = NOW() WHERE id = $3 AND status = 'READY';
              `, [rider.id, MVP_STATUSES.ASSIGNED, order.id]);
              
              await client.query(`
                UPDATE drivers SET rider_status = 'delivering', status = 'busy' WHERE id = $1;
              `, [rider.id]);

              console.log(`✅ Auto-Dispatch: Assigned Order #${order.id} to Rider ${rider.rider_name} (${rider.distance.toFixed(2)} km away)`);

              // Notify Rider
              if (io) {
                io.to(`rider-${rider.id}`).emit('new_order_assigned', {
                  order_id: order.id,
                  store_name: store.name,
                  store_lat: store.latitude,
                  store_lon: store.longitude,
                  customer_address: delivery_address,
                  customer_lat: delivery_latitude,
                  customer_lon: delivery_longitude,
                  total_amount: totalAmount,
                  earnings: 15.00 // Estimated earnings
                });
              }
            } else {
              console.log('⚠️ Auto-Dispatch: No riders available nearby.');
            }
          }

            // Fallback: Notify all nearby riders if not auto-assigned
            if (!assignedRider && io) {
               // ... notification logic (omitted for brevity)
            }

            // حساب ETA (Quick Commerce: وقت توصيل سريع)
            let etaMinutes = 30; // Default
            
            // ... ETA logic ...
            
            // تحديث ETA في الطلب
            await client.query(`
              UPDATE orders SET 
                eta_minutes = $1,
                driver_notification_sent_at = NOW(),
                driver_notification_expires_at = $2
              WHERE id = $3;
            `, [etaMinutes, new Date(Date.now() + 5 * 60 * 1000), order.id]);
          }
        }
      }
    }
    // ================= End Automated Logistics =================

    // Commit Transaction
    await client.query('COMMIT');

    // جلب الطلب المحدث مع معلومات المتاجر (Query outside transaction or new query)
    const updatedOrder = await pool.query(`
      SELECT * FROM orders WHERE id = $1;
    `, [order.id]);

    res.status(201).json({ 
      order: updatedOrder.rows[0],
      eta_minutes: updatedOrder.rows[0].eta_minutes || null
    });
  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error("❌ [CREATE ORDER] FULL ERROR:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
      table: err.table,
      column: err.column,
      stack: err.stack?.split('\n').slice(0, 10)
    });
    res.status(500).json({ message: "حدث خطأ في إنشاء الطلب: " + err.message });
  } finally {
    client.release();
  }
});

// كل طلبات المستخدم الحالي
app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, public_code, customer_id, user_id, 
               total_amount, total, subtotal, delivery_fee, service_fee, discount,
               currency, status, payment_status, payment_method,
               store_id, zone_id, address_id,
               created_at, paid_at, accepted_at, packed_at, 
               picked_up_at, delivered_at, cancelled_at, eta_minutes
        FROM orders
        WHERE customer_id = $1 OR user_id = $1
        ORDER BY id DESC;
      `,
      [req.user.id]
    );
    
    // Get order items for each order
    const ordersWithItems = await Promise.all(result.rows.map(async (order) => {
      const itemsRes = await pool.query(
        `
          SELECT oi.id, oi.product_id, oi.product_name, oi.quantity, oi.qty, oi.unit_price, oi.line_total, oi.unit, oi.status,
                 COALESCE(p.name_ar, p.name, oi.product_name) as product_name_ar,
                 COALESCE(p.name_en, p.name, oi.product_name) as product_name_en,
                 COALESCE(p.name, oi.product_name) as product_name,
                 (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as product_image
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = $1;
        `,
        [order.id]
      );
      return { ...order, items: itemsRes.rows };
    }));
    
    res.json({ orders: ordersWithItems });
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الطلبات" });
  }
});

// تفاصيل طلب واحد مع العناصر
app.get("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const orderRes = await pool.query(
      `
        SELECT id, public_code, customer_id, user_id,
               total_amount, total, subtotal, delivery_fee, service_fee, discount,
               currency, status, payment_status, payment_method,
               store_id, zone_id, address_id,
               created_at, paid_at, accepted_at, packed_at, 
               picked_up_at, delivered_at, cancelled_at, eta_minutes,
               delivery_address, delivery_latitude, delivery_longitude, notes_customer
        FROM orders
        WHERE id = $1 AND (customer_id = $2 OR user_id = $2);
      `,
      [id, req.user.id]
    );
    const order = orderRes.rows[0];
    if (!order) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    const itemsRes = await pool.query(
      `
        SELECT oi.id, oi.product_id, oi.product_name, oi.quantity, oi.qty, oi.unit_price, oi.line_total, oi.unit, oi.status,
          oi.id,
          oi.product_id,
          p.name,
          oi.quantity,
          oi.unit_price
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1;
      `,
      [id]
    );

    res.json({ order, items: itemsRes.rows });
  } catch (err) {
    console.error("Get order detail error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب تفاصيل الطلب" });
  }
});

// Get Order Details (Full Order Information)
app.get("/api/admin/orders/:orderId", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        o.*,
        u.name as customer_name,
        u.email as customer_email,
        d.id as driver_id,
        du.name as driver_name,
        du.email as driver_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN drivers d ON o.driver_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      WHERE o.id = $1;
    `, [orderId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }
    const orderRow = result.rows[0];
    orderRow.payment_received_at = orderRow.payment_received_at || orderRow.paid_at;
    const timeline = await buildOrderTimeline(orderId);
    res.json({ order: orderRow, timeline: timeline.events });
  } catch (err) {
    console.error("Get order detail error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب تفاصيل الطلب" });
  }
});

// Unified order timeline (canonical events)
app.get("/api/admin/orders/:orderId/timeline", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const timeline = await buildOrderTimeline(orderId);
    res.json(timeline);
  } catch (err) {
    console.error("Get order timeline error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الجدول الزمني" });
  }
});

// Get Order Items (for Mission Control Picking List)
app.get("/api/admin/orders/:orderId/items", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        oi.id,
        oi.product_id,
        oi.quantity,
        oi.unit_price,
        oi.unit,
        p.name_ar as product_name_ar,
        p.name_en as product_name_en,
        p.image_url,
        p.category_id,
        c.name_ar as category_name_ar,
        c.name_en as category_name_en
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE oi.order_id = $1
      ORDER BY oi.id;
    `, [orderId]);
    
    res.json({ items: result.rows });
  } catch (err) {
    console.error("Get order items error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب عناصر الطلب" });
  }
});

// Get Order Activity Log
app.get("/api/admin/orders/:orderId/activity-log", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id,
        status,
        notes,
        driver_id,
        created_at
      FROM order_tracking_history
      WHERE order_id = $1
      ORDER BY created_at ASC;
    `, [orderId]);
    
    res.json({ logs: result.rows });
  } catch (err) {
    console.error("Get activity log error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب سجل الأحداث" });
  }
});

// Get Rider Details
app.get("/api/admin/riders/:riderId", authMiddleware, async (req, res) => {
  try {
    const { riderId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        d.id,
        d.phone,
        d.rider_status,
        d.current_latitude,
        d.current_longitude,
        d.avatar_url,
        u.name,
        u.email
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = $1;
    `, [riderId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Rider غير موجود" });
    }
    
    const rider = result.rows[0];
    res.json({ 
      rider: {
        id: rider.id,
        name: rider.name,
        phone: rider.phone,
        rider_status: rider.rider_status,
        avatar_url: rider.avatar_url,
        email: rider.email
      }
    });
  } catch (err) {
    console.error("Get rider details error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب بيانات Rider" });
  }
});

// ================= Shop Settings Routes =================

// نقطة نهاية لإصلاح جداول الإعدادات
app.get("/api/admin/fix-settings-schema", async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // 1. Check shop_settings
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'shop_settings'
        );
      `);

      if (!tableCheck.rows[0].exists) {
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
      }

      // Ensure default row exists
      const settingsCheck = await client.query('SELECT COUNT(*) FROM shop_settings');
      if (parseInt(settingsCheck.rows[0].count) === 0) {
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
      }

      // 2. Check system_settings
      const sysTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'system_settings'
        );
      `);

      if (!sysTableCheck.rows[0].exists) {
        await client.query(`
          CREATE TABLE system_settings (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }

      // Seed system settings
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

      res.json({ success: true, message: "Settings tables verified/fixed" });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Fix settings error:", err);
    res.status(500).json({ error: err.message });
  }
});

// الحصول على إعدادات المتجر
app.get("/api/settings", async (req, res) => {
  try {
    // التحقق من اتصال قاعدة البيانات
    if (!pool) {
      console.warn("⚠️ [SETTINGS] Database pool not initialized, returning default settings");
      return res.json(getDefaultSettings());
    }
    
    const result = await pool.query("SELECT * FROM shop_settings ORDER BY id DESC LIMIT 1;");
    const shopSettings = result.rows.length > 0 ? result.rows[0] : getDefaultSettings();
    
    // Get automation settings from system_settings
    const automationResult = await pool.query(`
      SELECT key, value FROM system_settings 
      WHERE key IN (
        'auto_dispatch_enabled',
        'auto_assign_on_payment',
        'auto_select_nearest_rider',
        'max_assign_distance',
        'max_orders_per_rider',
        'assignment_timeout_seconds'
      )
    `);
    // Get campaigns from system_settings (marketing, safe)
    let campaigns = [];
    try {
      const campRes = await pool.query(`SELECT value FROM system_settings WHERE key = 'campaigns'`);
      if (campRes.rows.length > 0 && campRes.rows[0].value) {
        const parsed = JSON.parse(campRes.rows[0].value);
        campaigns = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) { /* keep [] */ }

    // Get feature flags from system_settings (namespaced)
    const defaultFeatures = getDefaultSettings().features;
    let features = defaultFeatures;
    try {
      const featRes = await pool.query(`SELECT value FROM system_settings WHERE key = 'features'`);
      if (featRes.rows.length > 0 && featRes.rows[0].value) {
        const parsed = JSON.parse(featRes.rows[0].value);
        if (parsed && typeof parsed === 'object') {
          features = {
            ...defaultFeatures,
            ...parsed,
            modules_enabled: { ...(defaultFeatures?.modules_enabled || {}), ...(parsed.modules_enabled || {}) },
          };
        }
      }
    } catch (e) {
      // keep defaults
    }
    
    const automationSettingsObj = {};
    automationResult.rows.forEach(row => {
      const value = row.value;
      if (value === 'true' || value === 'false') {
        automationSettingsObj[row.key] = value === 'true';
      } else if (!isNaN(Number(value))) {
        automationSettingsObj[row.key] = Number(value);
      } else {
        automationSettingsObj[row.key] = value;
      }
    });
    
    const defaults = getDefaultSettings();
    const promoStrip = shopSettings?.promo_strip || shopSettings?.promoStrip || defaults.promoStrip;
    const homeHero = shopSettings?.home_hero || shopSettings?.homeHero || defaults.homeHero;
    const siteLinks = shopSettings?.site_links || shopSettings?.siteLinks || defaults.siteLinks;
    const sitePagesRaw = shopSettings?.site_pages || shopSettings?.sitePages || defaults.sitePages;
    const sitePages = Array.isArray(sitePagesRaw)
      ? sitePagesRaw
      : (sitePagesRaw && typeof sitePagesRaw === 'object' && Array.isArray(sitePagesRaw.pages))
        ? sitePagesRaw.pages
        : defaults.sitePages;
    const siteSupport = shopSettings?.site_support || shopSettings?.siteSupport || defaults.siteSupport;
    const trustFeatures = shopSettings?.trust_features || shopSettings?.trustFeatures || defaults.trustFeatures;

    // Dispatch mode (derived from existing dispatch_settings)
    let dispatchMode = defaults.dispatchMode || 'AUTO_ASSIGN';
    try {
      const dmRes = await pool.query(`SELECT mode FROM dispatch_settings WHERE id = 1`);
      const raw = dmRes?.rows?.[0]?.mode;
      dispatchMode = raw === 'AUTO_OFFER' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN';
    } catch (e) {
      // If dispatch tables are missing, keep default
      dispatchMode = defaults.dispatchMode || 'AUTO_ASSIGN';
    }

    let whatsapp = defaults.whatsapp ? { ...defaults.whatsapp } : getDefaultSettings().whatsapp;
    try {
      const waRes = await pool.query("SELECT value_json FROM site_settings WHERE setting_key = 'whatsapp_config'");
      if (waRes.rows.length > 0 && waRes.rows[0].value_json) {
        const stored = waRes.rows[0].value_json;
        whatsapp = { ...whatsapp, ...stored };
      }
    } catch (e) { /* keep defaults */ }
    whatsapp.token_configured = !!whatsappProvider.isConfigured();

    const finalSettings = {
      ...shopSettings,
      auto_dispatch_enabled: automationSettingsObj.auto_dispatch_enabled !== false,
      auto_assign_on_payment: automationSettingsObj.auto_assign_on_payment !== false,
      auto_select_nearest_rider: automationSettingsObj.auto_select_nearest_rider !== false,
      max_assign_distance: automationSettingsObj.max_assign_distance || 10,
      max_orders_per_rider: automationSettingsObj.max_orders_per_rider || 3,
      assignment_timeout_seconds: automationSettingsObj.assignment_timeout_seconds || 30,
      dispatchMode,
      // Payment settings defaults
      enable_cod: shopSettings.enable_cod !== undefined ? shopSettings.enable_cod : false,
      enable_wallet: shopSettings.enable_wallet !== undefined ? shopSettings.enable_wallet : false,
      enable_online_payment: shopSettings.enable_online_payment !== undefined ? shopSettings.enable_online_payment : true,
      // New UI keys (camelCase for frontend)
      promoStrip: promoStrip || defaults.promoStrip,
      homeHero: homeHero || defaults.homeHero,
      siteLinks: siteLinks || defaults.siteLinks,
      sitePages,
      siteSupport: siteSupport || defaults.siteSupport,
      trustFeatures: trustFeatures || defaults.trustFeatures,
      features,
      campaigns,
      whatsapp,
    };

    res.json(finalSettings);
  } catch (err) {
    console.error("❌ [SETTINGS] FULL ERROR:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack?.split('\n').slice(0, 10)
    });
    // إرجاع قيم افتراضية بدلاً من خطأ 500
    console.warn("⚠️ [SETTINGS] Returning default settings due to error");
    res.json(getDefaultSettings());
  }
});

// دالة مساعدة لإرجاع الإعدادات الافتراضية
function getDefaultSettings() {
  return {
    id: 1,
    header_logo: null,
    footer_logo: null,
    phone: "",
    whatsapp: "",
    email: "",
    location: "",
    social_x: "",
    social_instagram: "",
    social_tiktok: "",
    social_snapchat: "",
    free_shipping_threshold: 150,
    announcement_bar_text: "",
    site_name: "TOMO Market",
    enable_cod: false,
    enable_wallet: false,
    enable_online_payment: true,
    primary_color: "#1a237e",
    secondary_color: "#2e7d32",
    banner_image: null,
    // UI marketing (safe defaults)
    promoStrip: {
      enabled: false,
      textAr: '',
      textEn: '',
      icon: '🔥',
      linkUrl: null,
      linkLabelAr: null,
      linkLabelEn: null,
      variant: 'neutral',
      align: 'center',
      dismissible: true,
      scope: 'all',
      mobileOnly: false,
      startAt: null,
      endAt: null
    },
    homeHero: {
      enabled: false,
      height: 'sm'
    },
    siteLinks: {
      // New public navigation structure (V2)
      headerLinks: [
        { key: 'categories', label_ar: 'الأقسام', label_en: 'Categories', href: '/categories', external: false },
        { key: 'products', label_ar: 'جميع المنتجات', label_en: 'Products', href: '/products', external: false },
        { key: 'orders', label_ar: 'طلباتي', label_en: 'Orders', href: '/orders', external: false },
      ],
      footerColumns: [
        {
          title_ar: 'روابط سريعة',
          title_en: 'Links',
          links: [
            { label_ar: 'الرئيسية', label_en: 'Home', href: '/', external: false },
            { label_ar: 'الأقسام', label_en: 'Categories', href: '/categories', external: false },
            { label_ar: 'جميع المنتجات', label_en: 'Products', href: '/products', external: false },
            { label_ar: 'اتصل بنا', label_en: 'Contact', href: '/contact', external: false },
          ],
        },
        {
          title_ar: 'السياسات',
          title_en: 'Policies',
          links: [
            { label_ar: 'الخصوصية', label_en: 'Privacy', href: '/p/privacy', external: false },
            { label_ar: 'الشروط', label_en: 'Terms', href: '/p/terms', external: false },
            { label_ar: 'الاسترجاع', label_en: 'Returns', href: '/p/shipping-returns', external: false },
          ],
        },
        {
          title_ar: 'عن تومو',
          title_en: 'About',
          links: [
            { label_ar: 'من نحن', label_en: 'About', href: '/p/about', external: false },
            { label_ar: 'الدعم', label_en: 'Support', href: '/contact', external: false },
          ],
        },
      ],
      support: {
        whatsappNumber: null,
        whatsappMessageAr: null,
        whatsappMessageEn: null,
      },
      header: {
        showSupportButton: true,
        supportLabelAr: 'خدمة العملاء',
        supportLabelEn: 'Support',
      },
      footer: {
        columns: [
          {
            id: 'about',
            titleAr: 'عن تومو',
            titleEn: 'About',
            links: [
              { id: 'about', labelAr: 'عن تومو', labelEn: 'About', url: '/about', external: false },
              { id: 'shipping', labelAr: 'الشحن والاسترجاع', labelEn: 'Shipping & Returns', url: '/shipping-returns', external: false },
            ],
          },
          {
            id: 'links',
            titleAr: 'روابط سريعة',
            titleEn: 'Links',
            links: [
              { id: 'home', labelAr: 'الرئيسية', labelEn: 'Home', url: '/', external: false },
              { id: 'categories', labelAr: 'الأقسام', labelEn: 'Categories', url: '/categories', external: false },
              { id: 'products', labelAr: 'جميع المنتجات', labelEn: 'Products', url: '/products', external: false },
              { id: 'orders', labelAr: 'تتبع الطلب', labelEn: 'Orders', url: '/orders', external: false },
            ],
          },
          {
            id: 'support',
            titleAr: 'الدعم',
            titleEn: 'Support',
            links: [
              { id: 'contact', labelAr: 'تواصل معنا', labelEn: 'Contact', url: '/contact', external: false },
              { id: 'privacy', labelAr: 'الخصوصية', labelEn: 'Privacy', url: '/privacy', external: false },
              { id: 'terms', labelAr: 'الشروط', labelEn: 'Terms', url: '/terms', external: false },
            ],
          },
        ],
        trustItems: [
          { id: 'fast', textAr: 'توصيل سريع', textEn: 'Fast delivery', icon: '🚚' },
          { id: 'secure', textAr: 'دفع آمن', textEn: 'Secure payment', icon: '🔒' },
          { id: 'support', textAr: 'دعم عملاء', textEn: 'Support', icon: '📞' },
        ],
      },
    },
    // Public pages (stored in site_pages JSONB as ARRAY)
    sitePages: [
      { slug: 'privacy', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
      { slug: 'terms', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
      { slug: 'about', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
      { slug: 'faq', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
      { slug: 'shipping-returns', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
    ],
    siteSupport: {
      whatsappNumber: null,
      phone: null,
      email: null,
      hours_ar: null,
      hours_en: null,
    },
    trustFeatures: [
      { icon: 'truck', color: '#10b981', labelAr: 'توصيل سريع داخل مدينتك', labelEn: 'Fast delivery in your city', enabled: true },
      { icon: 'lock', color: '#f59e0b', labelAr: 'دفع آمن 100%', labelEn: '100% secure payment', enabled: true },
      { icon: 'phone', color: '#3b82f6', labelAr: 'دعم عملاء متاح', labelEn: 'Customer support available', enabled: true },
    ],
    // Dispatch mode (public key)
    dispatchMode: 'AUTO_ASSIGN',
    // Feature flags (admin control center) — default OFF for new modules
    features: {
      customer_portal_enabled: true,
      customer_signup_enabled: true,
      customer_oauth_google_enabled: false,
      customer_oauth_apple_enabled: false,
      store_portal_enabled: true,
      driver_portal_enabled: true,
      sla_timer_enabled: true,
      sla_timer_limit_minutes: 30,
      modules_enabled: {
        marketing: false,
        accounting: false,
        support: false,
        users_roles: false,
        exports: false,
        settlements: false,
        campaigns: false,
        coupons: false,
        ops_console: true,
      },
    },
    store_status: "open",
    minimum_order_value: 0,
    delivery_fee_base: 0,
    delivery_fee_per_km: 0,
    whatsapp: {
      enabled: false,
      whatsapp_phone_e164: "",
      whatsapp_provider: "meta_cloud_api",
      whatsapp_waba_id: "",
      whatsapp_phone_number_id: "",
      token_configured: false,
    },
  };
}

// SiteLinks allowlist sanitizer (avoid arbitrary writes)
function sanitizeSiteLinks(input, defaults) {
  const d = defaults || getDefaultSettings().siteLinks;
  const src = input && typeof input === 'object' ? input : {};

  function cleanStr(v) {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    return s ? s : null;
  }
  function cleanBool(v, fallback) {
    if (typeof v === 'boolean') return v;
    return !!fallback;
  }
  function cleanId(v, fallback) {
    const s = cleanStr(v);
    return s || fallback;
  }

  const support = src.support && typeof src.support === 'object' ? src.support : {};
  const header = src.header && typeof src.header === 'object' ? src.header : {};
  const footer = src.footer && typeof src.footer === 'object' ? src.footer : {};
  const headerLinks = Array.isArray(src.headerLinks) ? src.headerLinks : (Array.isArray(d?.headerLinks) ? d.headerLinks : []);
  const footerColumns = Array.isArray(src.footerColumns) ? src.footerColumns : (Array.isArray(d?.footerColumns) ? d.footerColumns : []);

  const out = {
    headerLinks: [],
    footerColumns: [],
    support: {
      whatsappNumber: cleanStr(support.whatsappNumber) || null, // no '+'
      whatsappMessageAr: cleanStr(support.whatsappMessageAr) || null,
      whatsappMessageEn: cleanStr(support.whatsappMessageEn) || null,
    },
    header: {
      showSupportButton: cleanBool(header.showSupportButton, d?.header?.showSupportButton !== false),
      supportLabelAr: (cleanStr(header.supportLabelAr) || d?.header?.supportLabelAr || 'خدمة العملاء'),
      supportLabelEn: (cleanStr(header.supportLabelEn) || d?.header?.supportLabelEn || 'Support'),
    },
    footer: {
      columns: [],
      trustItems: [],
    }
  };

  const cols = Array.isArray(footer.columns) ? footer.columns : (Array.isArray(d?.footer?.columns) ? d.footer.columns : []);
  const safeCols = [];
  for (const c of cols) {
    if (!c || typeof c !== 'object') continue;
    const links = Array.isArray(c.links) ? c.links : [];
    const safeLinks = [];
    for (const l of links) {
      if (!l || typeof l !== 'object') continue;
      const url = cleanStr(l.url);
      const labelAr = cleanStr(l.labelAr);
      const labelEn = cleanStr(l.labelEn);
      if (!url || (!labelAr && !labelEn)) continue;
      safeLinks.push({
        id: cleanId(l.id, crypto.randomBytes(4).toString('hex')),
        labelAr: labelAr || (labelEn ? '' : 'رابط'),
        labelEn: labelEn || (labelAr ? '' : 'Link'),
        url,
        external: typeof l.external === 'boolean' ? l.external : false,
      });
    }
    safeCols.push({
      id: cleanId(c.id, crypto.randomBytes(4).toString('hex')),
      titleAr: cleanStr(c.titleAr) || 'عنوان',
      titleEn: cleanStr(c.titleEn) || 'Title',
      links: safeLinks,
    });
  }
  out.footer.columns = safeCols.length ? safeCols.slice(0, 8) : (d?.footer?.columns || []);

  const tis = Array.isArray(footer.trustItems) ? footer.trustItems : (Array.isArray(d?.footer?.trustItems) ? d.footer.trustItems : []);
  const safeTis = [];
  for (const it of tis) {
    if (!it || typeof it !== 'object') continue;
    const textAr = cleanStr(it.textAr);
    const textEn = cleanStr(it.textEn);
    const icon = cleanStr(it.icon) || '✨';
    if (!textAr && !textEn) continue;
    safeTis.push({
      id: cleanId(it.id, crypto.randomBytes(4).toString('hex')),
      textAr: textAr || '',
      textEn: textEn || '',
      icon,
    });
  }
  out.footer.trustItems = safeTis.length ? safeTis.slice(0, 5) : (d?.footer?.trustItems || []);

  // V2 headerLinks + footerColumns (snake_case fields)
  const safeHeaderLinks = [];
  for (const it of headerLinks) {
    if (!it || typeof it !== 'object') continue;
    const href = cleanStr(it.href);
    const la = cleanStr(it.label_ar);
    const le = cleanStr(it.label_en);
    const key = cleanStr(it.key) || crypto.randomBytes(4).toString('hex');
    if (!href || (!la && !le)) continue;
    safeHeaderLinks.push({
      key,
      label_ar: la || '',
      label_en: le || '',
      href,
      external: typeof it.external === 'boolean' ? it.external : false,
    });
  }
  out.headerLinks = safeHeaderLinks.length ? safeHeaderLinks.slice(0, 12) : (d?.headerLinks || []);

  const safeFooterColumns = [];
  for (const c of footerColumns) {
    if (!c || typeof c !== 'object') continue;
    const title_ar = cleanStr(c.title_ar) || '';
    const title_en = cleanStr(c.title_en) || '';
    const links = Array.isArray(c.links) ? c.links : [];
    const safeLinks = [];
    for (const l of links) {
      if (!l || typeof l !== 'object') continue;
      const href = cleanStr(l.href);
      const la = cleanStr(l.label_ar);
      const le = cleanStr(l.label_en);
      if (!href || (!la && !le)) continue;
      safeLinks.push({
        label_ar: la || '',
        label_en: le || '',
        href,
        external: typeof l.external === 'boolean' ? l.external : false,
      });
    }
    if (!safeLinks.length) continue;
    safeFooterColumns.push({
      title_ar,
      title_en,
      links: safeLinks.slice(0, 12),
    });
  }
  out.footerColumns = safeFooterColumns.length ? safeFooterColumns.slice(0, 6) : (d?.footerColumns || []);

  return out;
}

function sanitizeSitePages(input, defaults) {
  const d = defaults || getDefaultSettings().sitePages;
  const pages = Array.isArray(input)
    ? input
    : (input && typeof input === 'object' && Array.isArray(input.pages))
      ? input.pages
      : (Array.isArray(d) ? d : []);
  const safe = [];

  function cleanStr(v) {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    return s ? s : null;
  }
  function cleanSlug(v) {
    const s = cleanStr(v) || '';
    const slug = s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return slug || null;
  }
  for (const p of pages) {
    if (!p || typeof p !== 'object') continue;
    const slug = cleanSlug(p.slug);
    if (!slug) continue;
    safe.push({
      slug,
      titleAr: cleanStr(p.titleAr ?? p.titleAR ?? p.title_ar) || '',
      titleEn: cleanStr(p.titleEn ?? p.titleEN ?? p.title_en) || '',
      contentAr: cleanStr(p.contentAr ?? p.contentAR ?? p.bodyArMarkdown ?? p.body_ar_md) || '',
      contentEn: cleanStr(p.contentEn ?? p.contentEN ?? p.bodyEnMarkdown ?? p.body_en_md) || '',
      published: typeof p.published === 'boolean' ? p.published : (typeof p.enabled === 'boolean' ? p.enabled : false),
    });
  }
  return safe.length ? safe.slice(0, 50) : (Array.isArray(d) ? d : []);
}

function sanitizeSiteSupport(input, defaults) {
  const d = defaults || getDefaultSettings().siteSupport;
  const src = input && typeof input === 'object' ? input : {};

  function cleanStr(v) {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    return s ? s : null;
  }
  return {
    whatsappNumber: cleanStr(src.whatsappNumber) || d?.whatsappNumber || null,
    phone: cleanStr(src.phone) || d?.phone || null,
    email: cleanStr(src.email) || d?.email || null,
    hours_ar: cleanStr(src.hours_ar) || d?.hours_ar || null,
    hours_en: cleanStr(src.hours_en) || d?.hours_en || null,
  };
}

function sanitizeTrustFeatures(input, defaults) {
  const d = defaults || getDefaultSettings().trustFeatures;
  const src = input;
  const items = Array.isArray(src)
    ? src
    : (src && typeof src === 'object' && Array.isArray(src.items))
      ? src.items
      : (Array.isArray(d) ? d : (d && typeof d === 'object' && Array.isArray(d.items) ? d.items : []));
  const safe = [];

  function cleanStr(v) {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    return s ? s : null;
  }
  function cleanIcon(v) {
    const s = cleanStr(v);
    if (s === 'truck' || s === 'lock' || s === 'phone') return s;
    return 'truck';
  }
  function cleanColor(v) {
    const s = cleanStr(v);
    if (!s) return '#10b981';
    // accept hex or css color string
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s;
    return s;
  }
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const labelAr = cleanStr(it.labelAr ?? it.text_ar) || '';
    const labelEn = cleanStr(it.labelEn ?? it.text_en) || '';
    if (!labelAr && !labelEn) continue;
    safe.push({
      icon: cleanIcon(it.icon),
      color: cleanColor(it.color),
      labelAr,
      labelEn,
      enabled: typeof it.enabled === 'boolean' ? it.enabled : true,
    });
  }
  return safe.length ? safe.slice(0, 8) : (Array.isArray(d) ? d : []);
}

// تحديث إعدادات المتجر
app.put("/api/settings", authMiddleware, async (req, res) => {
  try {
    const {
      site_name,
      header_logo,
      footer_logo,
      phone,
      whatsapp,
      email,
      location,
      social_x,
      social_instagram,
      social_tiktok,
      social_snapchat,
      free_shipping_threshold,
      announcement_bar_text,
      enable_cod,
      enable_wallet,
      enable_online_payment,
      primary_color,
      secondary_color,
      banner_image,
      store_status,
      minimum_order_value,
      delivery_fee_base,
      delivery_fee_per_km,
      // Automation settings
      auto_dispatch_enabled,
      auto_assign_on_payment,
      auto_select_nearest_rider,
      max_assign_distance,
      max_orders_per_rider,
      assignment_timeout_seconds,
      // UI marketing (optional)
      promoStrip,
      homeHero,
      siteLinks,
      sitePages,
      siteSupport,
      trustFeatures,
      // Dispatch mode (public key)
      dispatchMode,
      // Feature flags (admin control center)
      features,
      campaigns,
      whatsapp: whatsappConfig,
    } = req.body;

    const defaults = getDefaultSettings();
    const safePromoStrip = promoStrip && typeof promoStrip === 'object' ? promoStrip : defaults.promoStrip;
    const safeHomeHero = homeHero && typeof homeHero === 'object' ? homeHero : defaults.homeHero;
    const safeSiteLinks = sanitizeSiteLinks(siteLinks, defaults.siteLinks);
    const safeSitePages = sanitizeSitePages(sitePages, defaults.sitePages);
    const safeSiteSupport = sanitizeSiteSupport(siteSupport, defaults.siteSupport);
    const safeTrustFeatures = sanitizeTrustFeatures(trustFeatures, defaults.trustFeatures);

    // التحقق من وجود سجل
    const existing = await pool.query("SELECT id FROM shop_settings WHERE id = 1;");
    
    let result;
    if (existing.rows.length === 0) {
      result = await pool.query(
        `
        INSERT INTO shop_settings (
          id, site_name, header_logo, footer_logo, phone, whatsapp, email, location,
          social_x, social_instagram, social_tiktok, social_snapchat,
          free_shipping_threshold, announcement_bar_text,
          enable_cod, enable_wallet, enable_online_payment, primary_color, secondary_color, banner_image,
          promo_strip, home_hero, site_links, site_pages, site_support, trust_features,
          store_status, minimum_order_value, delivery_fee_base, delivery_fee_per_km
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
        RETURNING *;
      `,
        [
          site_name || "TOMO Market",
          header_logo || null,
          footer_logo || null,
          phone || "",
          whatsapp || "",
          email || "",
          location || "",
          social_x || "",
          social_instagram || "",
          social_tiktok || "",
          social_snapchat || "",
          free_shipping_threshold || 150,
          announcement_bar_text || "",
          enable_cod !== undefined ? enable_cod : true,
          enable_wallet !== undefined ? enable_wallet : false,
          enable_online_payment !== undefined ? enable_online_payment : false,
          primary_color || "#1a237e",
          secondary_color || "#2e7d32",
          banner_image || null,
          safePromoStrip,
          safeHomeHero,
          safeSiteLinks,
          safeSitePages,
          safeSiteSupport,
          safeTrustFeatures,
          store_status || "open",
          minimum_order_value || 0,
          delivery_fee_base || 0,
          delivery_fee_per_km || 0,
        ]
      );
    } else {
      result = await pool.query(
        `
        UPDATE shop_settings SET
          site_name = $1,
          header_logo = $2,
          footer_logo = $3,
          phone = $4,
          whatsapp = $5,
          email = $6,
          location = $7,
          social_x = $8,
          social_instagram = $9,
          social_tiktok = $10,
          social_snapchat = $11,
          free_shipping_threshold = $12,
          announcement_bar_text = $13,
          enable_cod = $14,
          enable_wallet = $15,
          enable_online_payment = $16,
          primary_color = $17,
          secondary_color = $18,
          banner_image = $19,
          promo_strip = $20,
          home_hero = $21,
          site_links = $22,
          site_pages = $23,
          site_support = $24,
          trust_features = $25,
          store_status = $26,
          minimum_order_value = $27,
          delivery_fee_base = $28,
          delivery_fee_per_km = $29,
          updated_at = NOW()
        WHERE id = 1
        RETURNING *;
      `,
        [
          site_name || "TOMO Market",
          header_logo || null,
          footer_logo || null,
          phone || "",
          whatsapp || "",
          email || "",
          location || "",
          social_x || "",
          social_instagram || "",
          social_tiktok || "",
          social_snapchat || "",
          free_shipping_threshold || 150,
          announcement_bar_text || "",
          enable_cod !== undefined ? enable_cod : true,
          enable_wallet !== undefined ? enable_wallet : false,
          enable_online_payment !== undefined ? enable_online_payment : false,
          primary_color || "#1a237e",
          secondary_color || "#2e7d32",
          banner_image || null,
          safePromoStrip,
          safeHomeHero,
          safeSiteLinks,
          safeSitePages,
          safeSiteSupport,
          safeTrustFeatures,
          store_status || "open",
          minimum_order_value || 0,
          delivery_fee_base || 0,
          delivery_fee_per_km || 0,
        ]
      );
    }

    // Save automation settings to system_settings
    if (auto_dispatch_enabled !== undefined || auto_assign_on_payment !== undefined || 
        auto_select_nearest_rider !== undefined || max_assign_distance !== undefined ||
        max_orders_per_rider !== undefined || assignment_timeout_seconds !== undefined) {
      
      const automationSettings = [
        { key: 'auto_dispatch_enabled', value: auto_dispatch_enabled !== false },
        { key: 'auto_assign_on_payment', value: auto_assign_on_payment !== false },
        { key: 'auto_select_nearest_rider', value: auto_select_nearest_rider !== false },
        { key: 'max_assign_distance', value: max_assign_distance || 10 },
        { key: 'max_orders_per_rider', value: max_orders_per_rider || 3 },
        { key: 'assignment_timeout_seconds', value: assignment_timeout_seconds || 30 },
      ];
      
      for (const setting of automationSettings) {
        await pool.query(`
          INSERT INTO system_settings (key, value)
          VALUES ($1, $2::text)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [setting.key, String(setting.value)]);
      }
    }

    // Save dispatchMode -> dispatch_settings.mode (isolated + safe)
    if (dispatchMode !== undefined) {
      const safeDispatchMode = dispatchMode === 'OFFER_ACCEPT' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN';
      const targetMode = safeDispatchMode === 'OFFER_ACCEPT' ? 'AUTO_OFFER' : 'AUTO_ASSIGN';
      await pool.query(`
        INSERT INTO dispatch_settings (id, mode)
        VALUES (1, $1)
        ON CONFLICT (id) DO UPDATE SET mode = EXCLUDED.mode, updated_at = NOW()
      `, [targetMode]);
    }

    // Save feature flags -> system_settings (namespaced, safe)
    if (features !== undefined && features !== null && typeof features === 'object') {
      let oldFeaturesVal = null;
      try {
        const oldF = await pool.query("SELECT value FROM system_settings WHERE key = 'features'");
        if (oldF.rows.length > 0) oldFeaturesVal = oldF.rows[0].value;
      } catch (e) { /* ignore */ }
      const def = getDefaultSettings().features;
      const safeFeatures = {
        customer_portal_enabled: typeof features.customer_portal_enabled === 'boolean' ? features.customer_portal_enabled : (def?.customer_portal_enabled !== false),
        customer_signup_enabled: typeof features.customer_signup_enabled === 'boolean' ? features.customer_signup_enabled : (def?.customer_signup_enabled !== false),
        customer_oauth_google_enabled: typeof features.customer_oauth_google_enabled === 'boolean' ? features.customer_oauth_google_enabled : (def?.customer_oauth_google_enabled === true),
        customer_oauth_apple_enabled: typeof features.customer_oauth_apple_enabled === 'boolean' ? features.customer_oauth_apple_enabled : (def?.customer_oauth_apple_enabled === true),
        store_portal_enabled: typeof features.store_portal_enabled === 'boolean' ? features.store_portal_enabled : (def?.store_portal_enabled !== false),
        driver_portal_enabled: typeof features.driver_portal_enabled === 'boolean' ? features.driver_portal_enabled : (def?.driver_portal_enabled !== false),
        sla_timer_enabled: typeof features.sla_timer_enabled === 'boolean' ? features.sla_timer_enabled : (def?.sla_timer_enabled !== false),
        sla_timer_limit_minutes: typeof features.sla_timer_limit_minutes === 'number' && features.sla_timer_limit_minutes >= 1 && features.sla_timer_limit_minutes <= 120 ? features.sla_timer_limit_minutes : (def?.sla_timer_limit_minutes || 30),
        modules_enabled: {
          marketing: typeof features.modules_enabled?.marketing === 'boolean' ? features.modules_enabled.marketing : (def?.modules_enabled?.marketing === true),
          accounting: typeof features.modules_enabled?.accounting === 'boolean' ? features.modules_enabled.accounting : (def?.modules_enabled?.accounting === true),
          support: typeof features.modules_enabled?.support === 'boolean' ? features.modules_enabled.support : (def?.modules_enabled?.support === true),
          users_roles: typeof features.modules_enabled?.users_roles === 'boolean' ? features.modules_enabled.users_roles : (def?.modules_enabled?.users_roles === true),
          exports: typeof features.modules_enabled?.exports === 'boolean' ? features.modules_enabled.exports : (def?.modules_enabled?.exports === true),
          settlements: typeof features.modules_enabled?.settlements === 'boolean' ? features.modules_enabled.settlements : (def?.modules_enabled?.settlements === true),
          campaigns: typeof features.modules_enabled?.campaigns === 'boolean' ? features.modules_enabled.campaigns : (def?.modules_enabled?.campaigns === true),
          coupons: typeof features.modules_enabled?.coupons === 'boolean' ? features.modules_enabled.coupons : (def?.modules_enabled?.coupons === true),
          ops_console: typeof features.modules_enabled?.ops_console === 'boolean' ? features.modules_enabled.ops_console : (def?.modules_enabled?.ops_console !== false),
        },
      };
      await pool.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('features', $1::text)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [JSON.stringify(safeFeatures)]);
      await logAuditAction(req, 'FEATURE_TOGGLES_CHANGE', 'settings', null, oldFeaturesVal ? { features: oldFeaturesVal } : null, { features: safeFeatures });
    }

    if (whatsappConfig !== undefined && whatsappConfig !== null && typeof whatsappConfig === 'object') {
      const safeWa = {
        enabled: !!whatsappConfig.enabled,
        whatsapp_phone_e164: typeof whatsappConfig.whatsapp_phone_e164 === 'string' ? whatsappConfig.whatsapp_phone_e164.trim() : '',
        whatsapp_provider: whatsappConfig.whatsapp_provider === 'meta_cloud_api' ? 'meta_cloud_api' : 'meta_cloud_api',
        whatsapp_waba_id: typeof whatsappConfig.whatsapp_waba_id === 'string' ? whatsappConfig.whatsapp_waba_id.trim() : '',
        whatsapp_phone_number_id: typeof whatsappConfig.whatsapp_phone_number_id === 'string' ? whatsappConfig.whatsapp_phone_number_id.trim() : '',
      };
      await pool.query(`
        INSERT INTO site_settings (setting_key, value_json, updated_at) VALUES ('whatsapp_config', $1::jsonb, NOW())
        ON CONFLICT (setting_key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
      `, [JSON.stringify(safeWa)]);
    }

    if (campaigns !== undefined && Array.isArray(campaigns)) {
      let oldCampaignsVal = null;
      try {
        const oldC = await pool.query("SELECT value FROM system_settings WHERE key = 'campaigns'");
        if (oldC.rows.length > 0) oldCampaignsVal = oldC.rows[0].value;
      } catch (e) { /* ignore */ }
      const safeCampaigns = campaigns.slice(0, 100).map((c) => ({
        id: c.id || String(Math.random()).slice(2, 10),
        name_ar: typeof c.name_ar === 'string' ? c.name_ar.slice(0, 200) : '',
        name_en: typeof c.name_en === 'string' ? c.name_en.slice(0, 200) : '',
        start: c.start || null,
        end: c.end || null,
        active: !!c.active,
      }));
      await pool.query(`
        INSERT INTO system_settings (key, value)
        VALUES ('campaigns', $1::text)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [JSON.stringify(safeCampaigns)]);
      await logAuditAction(req, 'CAMPAIGNS_UPDATE', 'campaigns', null, oldCampaignsVal ? { campaigns: oldCampaignsVal } : null, { campaigns: safeCampaigns });
    }

    // Return updated settings (including automation settings)
    const updatedResult = await pool.query("SELECT * FROM shop_settings WHERE id = 1;");
    const updatedSettings = updatedResult.rows[0] || result.rows[0];
    
    const automationResult = await pool.query(`
      SELECT key, value FROM system_settings 
      WHERE key IN (
        'auto_dispatch_enabled',
        'auto_assign_on_payment',
        'auto_select_nearest_rider',
        'max_assign_distance',
        'max_orders_per_rider',
        'assignment_timeout_seconds'
      )
    `);
    
    const automationSettingsObj = {};
    automationResult.rows.forEach(row => {
      const value = row.value;
      if (value === 'true' || value === 'false') {
        automationSettingsObj[row.key] = value === 'true';
      } else if (!isNaN(Number(value))) {
        automationSettingsObj[row.key] = Number(value);
      } else {
        automationSettingsObj[row.key] = value;
      }
    });

    // Include dispatchMode in response (derived from dispatch_settings)
    let resolvedDispatchMode = (dispatchMode === 'OFFER_ACCEPT' || dispatchMode === 'AUTO_ASSIGN')
      ? (dispatchMode === 'OFFER_ACCEPT' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN')
      : (getDefaultSettings().dispatchMode || 'AUTO_ASSIGN');
    try {
      const dmRes = await pool.query(`SELECT mode FROM dispatch_settings WHERE id = 1`);
      const raw = dmRes?.rows?.[0]?.mode;
      resolvedDispatchMode = raw === 'AUTO_OFFER' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN';
    } catch (e) {
      // keep fallback
    }
    
    // Resolve campaigns for response
    let resolvedCampaigns = [];
    try {
      const campRes = await pool.query(`SELECT value FROM system_settings WHERE key = 'campaigns'`);
      if (campRes.rows.length > 0 && campRes.rows[0].value) {
        const parsed = JSON.parse(campRes.rows[0].value);
        resolvedCampaigns = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) { /* keep [] */ }

    // Resolve features for response (from DB or just-saved). When never saved, default modules_enabled to all true so admin features stay visible.
    let resolvedFeatures = getDefaultSettings().features;
    try {
      const featRes = await pool.query(`SELECT value FROM system_settings WHERE key = 'features'`);
      if (featRes.rows.length > 0 && featRes.rows[0].value) {
        const parsed = JSON.parse(featRes.rows[0].value);
        if (parsed && typeof parsed === 'object') {
          resolvedFeatures = { ...resolvedFeatures, ...parsed, modules_enabled: { ...resolvedFeatures?.modules_enabled, ...parsed.modules_enabled } };
        }
      } else {
        resolvedFeatures = { ...resolvedFeatures, modules_enabled: { marketing: true, accounting: true, support: true, users_roles: true, exports: true, settlements: true, campaigns: true, coupons: true, ops_console: true } };
      }
    } catch (e) { /* keep default */ }

    res.json({
      ...updatedSettings,
      features: resolvedFeatures,
      campaigns: resolvedCampaigns,
      auto_dispatch_enabled: automationSettingsObj.auto_dispatch_enabled !== false,
      auto_assign_on_payment: automationSettingsObj.auto_assign_on_payment !== false,
      auto_select_nearest_rider: automationSettingsObj.auto_select_nearest_rider !== false,
      max_assign_distance: automationSettingsObj.max_assign_distance || 10,
      max_orders_per_rider: automationSettingsObj.max_orders_per_rider || 3,
      assignment_timeout_seconds: automationSettingsObj.assignment_timeout_seconds || 30,
      dispatchMode: resolvedDispatchMode,
      promoStrip: (updatedSettings && (updatedSettings.promo_strip || updatedSettings.promoStrip)) || safePromoStrip,
      homeHero: (updatedSettings && (updatedSettings.home_hero || updatedSettings.homeHero)) || safeHomeHero,
      siteLinks: (updatedSettings && (updatedSettings.site_links || updatedSettings.siteLinks)) || safeSiteLinks,
      sitePages: (() => {
        const raw = (updatedSettings && (updatedSettings.site_pages || updatedSettings.sitePages)) || safeSitePages
        return Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && Array.isArray(raw.pages) ? raw.pages : safeSitePages)
      })(),
      siteSupport: (updatedSettings && (updatedSettings.site_support || updatedSettings.siteSupport)) || safeSiteSupport,
      trustFeatures: (updatedSettings && (updatedSettings.trust_features || updatedSettings.trustFeatures)) || safeTrustFeatures,
    });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الإعدادات" });
  }
});

// ================= Driver Routes =================

// ================= Driver Offers (OFFER_ACCEPT mode via existing dispatch system) =================
// List active offers for logged-in driver (read-only view; does not change order/status)
app.get("/api/driver/offers", authMiddleware, async (req, res) => {
  try {
    const driverResult = await pool.query("SELECT id FROM drivers WHERE user_id = $1;", [req.user.id]);
    if (driverResult.rows.length === 0) {
      return res.status(403).json({ message: "ليس لديك صلاحية سائق" });
    }
    const driverId = driverResult.rows[0].id;

    // Mark expired offers as TIMEOUT (isolated write; safe + does not touch orders)
    try {
      await pool.query(`
        UPDATE order_dispatch_attempts
        SET status = 'TIMEOUT', responded_at = NOW()
        WHERE courier_id = $1
          AND status = 'OFFERED'
          AND expires_at IS NOT NULL
          AND expires_at <= NOW()
      `, [driverId]);
    } catch (e) {
      // ignore timeout update failures
    }

    const offersRes = await pool.query(`
      SELECT
        a.id as offer_id,
        a.order_id,
        a.attempt_number,
        a.status as offer_status,
        a.expires_at,
        a.created_at,
        o.status as order_status,
        o.total_amount,
        o.delivery_address,
        o.delivery_latitude,
        o.delivery_longitude,
        o.store_id,
        o.user_id
      FROM order_dispatch_attempts a
      JOIN orders o ON o.id = a.order_id
      WHERE a.courier_id = $1
        AND a.status = 'OFFERED'
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
      ORDER BY a.expires_at ASC NULLS LAST, a.created_at DESC
      LIMIT 50
    `, [driverId]);

    res.json({
      offers: (offersRes.rows || []).map((r) => ({
        id: r.offer_id,
        orderId: r.order_id,
        attemptNumber: r.attempt_number,
        status: r.offer_status,
        expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
        order: {
          id: r.order_id,
          status: r.order_status,
          total_amount: r.total_amount,
          delivery_address: r.delivery_address,
          delivery_latitude: r.delivery_latitude,
          delivery_longitude: r.delivery_longitude,
          store_id: r.store_id,
          user_id: r.user_id,
        },
      })),
    });
  } catch (err) {
    console.error("❌ Driver offers error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب العروض" });
  }
});

// Accept offer (atomic assignment if still unassigned + offer valid)
app.post("/api/driver/offers/:offerId/accept", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { offerId } = req.params;
    await client.query('BEGIN');

    const driverResult = await client.query("SELECT id FROM drivers WHERE user_id = $1;", [req.user.id]);
    if (driverResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: "ليس لديك صلاحية سائق" });
    }
    const driverId = driverResult.rows[0].id;

    // Accept this specific offer
    const attemptResult = await client.query(`
      UPDATE order_dispatch_attempts
      SET status = 'ACCEPTED', responded_at = NOW()
      WHERE id = $1
        AND courier_id = $2
        AND status = 'OFFERED'
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING order_id
    `, [offerId, driverId]);

    if (attemptResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "العرض غير صالح أو منتهي الصلاحية" });
    }
    const orderId = attemptResult.rows[0].order_id;

    // Cancel other offers for this order
    await client.query(`
      UPDATE order_dispatch_attempts
      SET status = 'CANCELLED', responded_at = NOW()
      WHERE order_id = $1
        AND courier_id != $2
        AND status = 'OFFERED'
    `, [orderId, driverId]);

    const orderRow = await client.query(`SELECT id, status, store_id, user_id FROM orders WHERE id = $1`, [orderId]);
    if (orderRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "الطلب غير موجود" });
    }

    const currentStatus = orderRow.rows[0].status;
    const storeId = orderRow.rows[0].store_id || null;
    const userId = orderRow.rows[0].user_id || null;

    // MVP: Validate transition READY -> ASSIGNED (no logic change)
    const validation = validateStatusTransition(currentStatus, MVP_STATUSES.ASSIGNED);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: validation.message });
    }
    if (currentStatus !== MVP_STATUSES.READY) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Order must be READY to accept. Current status: ${currentStatus}` });
    }

    // Atomic assignment (only if still unassigned)
    const updateResult = await client.query(`
      UPDATE orders
      SET driver_id = $1,
          status = $2,
          updated_at = NOW()
      WHERE id = $3
        AND (driver_id IS NULL OR driver_id = $1)
        AND status = $4
      RETURNING id
    `, [driverId, MVP_STATUSES.ASSIGNED, orderId, currentStatus]);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "الطلب غير متاح أو تم تعيينه لسائق آخر" });
    }

    // Update courier status + stats (same behavior as existing accept endpoint)
    await client.query(`UPDATE drivers SET rider_status = 'busy', status = 'busy' WHERE id = $1`, [driverId]);
    await client.query(`
      INSERT INTO courier_stats (courier_id, last_assigned_at, updated_at)
      VALUES ($1, NOW(), NOW())
      ON CONFLICT (courier_id)
      DO UPDATE SET last_assigned_at = NOW(), updated_at = NOW()
    `, [driverId]);

    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, actor_type, actor_id, note)
       VALUES ($1, $2, $3, 'driver', $4, 'Driver accepted offer')`,
      [orderId, currentStatus, MVP_STATUSES.ASSIGNED, req.user.id]
    );

    await client.query('COMMIT');

    // Emit order.updated (required) + keep existing system stable
    try {
      emitOrderUpdated({ orderId, status: MVP_STATUSES.ASSIGNED, storeId, driverId, userId });
    } catch {}

    res.json({ ok: true, orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Accept offer error:", err);
    res.status(500).json({ message: "حدث خطأ في قبول العرض" });
  } finally {
    client.release();
  }
});

// Reject offer (isolated write; does not touch orders)
app.post("/api/driver/offers/:offerId/reject", authMiddleware, async (req, res) => {
  try {
    const { offerId } = req.params;
    const driverResult = await pool.query("SELECT id FROM drivers WHERE user_id = $1;", [req.user.id]);
    if (driverResult.rows.length === 0) {
      return res.status(403).json({ message: "ليس لديك صلاحية سائق" });
    }
    const driverId = driverResult.rows[0].id;

    const upd = await pool.query(`
      UPDATE order_dispatch_attempts
      SET status = 'REJECTED', responded_at = NOW()
      WHERE id = $1
        AND courier_id = $2
        AND status = 'OFFERED'
      RETURNING order_id
    `, [offerId, driverId]);

    // Emit order.updated (required) - status unchanged, but update stream for UIs
    if (upd.rows.length > 0) {
      try {
        const orderId = upd.rows[0].order_id;
        const info = await pool.query(`SELECT status, store_id, user_id, driver_id FROM orders WHERE id = $1`, [orderId]);
        if (info.rows.length > 0) {
          emitOrderUpdated({
            orderId,
            status: info.rows[0].status,
            storeId: info.rows[0].store_id || null,
            driverId: info.rows[0].driver_id || null,
            userId: info.rows[0].user_id || null,
          });
        }
      } catch {}
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Reject offer error:", err);
    res.status(500).json({ message: "حدث خطأ في رفض العرض" });
  }
});

// تسجيل Rider جديد
app.post("/api/drivers/register", authMiddleware, upload.fields([
  { name: 'identity_card', maxCount: 1 },
  { name: 'driving_license', maxCount: 1 }
]), async (req, res) => {
  try {
    const { phone, vehicle_type, license_number, id_number, city, plate_number } = req.body;
    const files = req.files;

    // Handle file uploads
    const identityCardUrl = files.identity_card?.[0] 
      ? `/uploads/drivers/${files.identity_card[0].filename}` 
      : null;
    const drivingLicenseUrl = files.driving_license?.[0] 
      ? `/uploads/drivers/${files.driving_license[0].filename}` 
      : null;

    // تحديث دور المستخدم إلى driver
    await pool.query("UPDATE users SET role = 'driver' WHERE id = $1;", [req.user.id]);

    const result = await pool.query(
      `
      INSERT INTO drivers (user_id, phone, vehicle_type, license_number, id_number, city, plate_number, identity_card_url, driving_license_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        phone = EXCLUDED.phone,
        vehicle_type = EXCLUDED.vehicle_type,
        license_number = COALESCE(EXCLUDED.license_number, drivers.license_number),
        id_number = EXCLUDED.id_number,
        city = EXCLUDED.city,
        plate_number = EXCLUDED.plate_number,
        identity_card_url = COALESCE(EXCLUDED.identity_card_url, drivers.identity_card_url),
        driving_license_url = COALESCE(EXCLUDED.driving_license_url, drivers.driving_license_url)
      RETURNING *;
    `,
      [
        req.user.id, 
        phone, 
        vehicle_type, 
        license_number || id_number || null, 
        id_number || null,
        city || null,
        plate_number || null,
        identityCardUrl,
        drivingLicenseUrl
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Driver register error:", err);
    res.status(500).json({ message: "حدث خطأ في تسجيل Rider" });
  }
});

// الحصول على مهام Rider
app.get("/api/drivers/tasks", authMiddleware, async (req, res) => {
  try {
    const driverResult = await pool.query("SELECT id FROM drivers WHERE user_id = $1;", [
      req.user.id,
    ]);
    if (driverResult.rows.length === 0) {
      return res.status(403).json({ message: "ليس لديك صلاحية سائق" });
    }

    const driverId = driverResult.rows[0].id;

    // جلب الطلبات المخصصة لهذا Rider أو المتاحة
    const ordersResult = await pool.query(
      `
      SELECT o.*, u.name as customer_name, u.email as customer_email,
             o.delivery_address, o.delivery_latitude, o.delivery_longitude,
             o.delivery_fee, o.delivery_notes
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE (o.driver_id = $1 OR o.driver_id IS NULL)
        AND o.status IN ('CREATED', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP')
      ORDER BY 
        CASE WHEN o.driver_id = $1 THEN 0 ELSE 1 END,
        o.created_at ASC;
    `,
      [driverId]
    );

    // Calculate distance for each order if driver location is available
    const driverLocation = await pool.query(
      `SELECT current_latitude, current_longitude FROM drivers WHERE id = $1;`,
      [driverId]
    );

    let ordersWithDistance = ordersResult.rows;
    if (driverLocation.rows.length > 0 && driverLocation.rows[0].current_latitude && driverLocation.rows[0].current_longitude) {
      const driverLat = parseFloat(driverLocation.rows[0].current_latitude);
      const driverLon = parseFloat(driverLocation.rows[0].current_longitude);
      
      ordersWithDistance = ordersResult.rows.map((order) => {
        if (order.delivery_latitude && order.delivery_longitude) {
          // Haversine formula to calculate distance
          const R = 6371; // Earth's radius in km
          const orderLat = parseFloat(order.delivery_latitude);
          const orderLon = parseFloat(order.delivery_longitude);
          const dLat = ((orderLat - driverLat) * Math.PI) / 180;
          const dLon = ((orderLon - driverLon) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((driverLat * Math.PI) / 180) *
              Math.cos((orderLat * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          order.distance_km = parseFloat((R * c).toFixed(2));
        } else {
          order.distance_km = null;
        }
        return order;
      });
    } else {
      ordersWithDistance = ordersResult.rows.map((order) => {
        order.distance_km = null;
        return order;
      });
    }

    res.json({ orders: ordersWithDistance || ordersResult.rows });
  } catch (err) {
    console.error("Get driver tasks error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب المهام" });
  }
});

// قبول طلب من قبل Rider
// Courier Accept Order (Enhanced for dispatch system)
app.post("/api/drivers/orders/:orderId/accept", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId } = req.params;
    const { attempt_id } = req.body; // Optional: for dispatch attempts
    
    await client.query('BEGIN');
    
    const driverResult = await client.query("SELECT id FROM drivers WHERE user_id = $1;", [
      req.user.id,
    ]);
    if (driverResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: "ليس لديك صلاحية سائق" });
    }

    const driverId = driverResult.rows[0].id;

    // Check if this is a dispatch attempt
    if (attempt_id) {
      // Update dispatch attempt
      const attemptResult = await client.query(`
        UPDATE order_dispatch_attempts 
        SET status = 'ACCEPTED', responded_at = NOW()
        WHERE id = $1 
          AND courier_id = $2 
          AND status = 'OFFERED'
          AND expires_at > NOW()
        RETURNING order_id
      `, [attempt_id, driverId]);
      
      if (attemptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: "العرض غير صالح أو منتهي الصلاحية" });
      }
      
      // Cancel other offers for this order (AUTO_OFFER mode)
      await client.query(`
        UPDATE order_dispatch_attempts 
        SET status = 'CANCELLED', responded_at = NOW()
        WHERE order_id = $1 
          AND courier_id != $2 
          AND status = 'OFFERED'
      `, [orderId, driverId]);
      
      // Notify other couriers that offer was cancelled
      if (io) {
        const cancelledOffers = await client.query(`
          SELECT courier_id FROM order_dispatch_attempts 
          WHERE order_id = $1 AND courier_id != $2 AND status = 'CANCELLED'
        `, [orderId, driverId]);
        
        cancelledOffers.rows.forEach(row => {
          io.to(`rider-${row.courier_id}`).emit('order_offer_cancelled', {
            order_id: orderId,
            reason: 'accepted_by_another',
            timestamp: new Date().toISOString()
          });
        });
      }
    }

    // Get current order status
    const orderCheck = await client.query('SELECT status FROM orders WHERE id = $1', [orderId]);
    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "الطلب غير موجود" });
    }
    
    const currentStatus = orderCheck.rows[0].status;
    
    // MVP: Validate transition READY -> ASSIGNED
    const validation = validateStatusTransition(currentStatus, MVP_STATUSES.ASSIGNED);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: validation.message });
    }
    
    // MVP: Only accept READY orders
    if (currentStatus !== MVP_STATUSES.READY) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `Order must be READY to accept. Current status: ${currentStatus}` 
      });
    }
    
    // Assign order with lock to prevent double assignment
    const updateResult = await client.query(`
      UPDATE orders 
      SET driver_id = $1, 
          status = $2,
          updated_at = NOW()
      WHERE id = $3 
        AND (driver_id IS NULL OR driver_id = $1)
        AND status = $4
      RETURNING id
    `, [driverId, MVP_STATUSES.ASSIGNED, orderId, currentStatus]);
    
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "الطلب غير متاح أو تم تعيينه لسائق آخر" });
    }
    
    // Update courier status
    await client.query(`
      UPDATE drivers 
      SET rider_status = 'busy', status = 'busy' 
      WHERE id = $1
    `, [driverId]);
    
    // Update courier stats
    await client.query(`
      INSERT INTO courier_stats (courier_id, last_assigned_at, updated_at)
      VALUES ($1, NOW(), NOW())
      ON CONFLICT (courier_id) 
      DO UPDATE SET last_assigned_at = NOW(), updated_at = NOW()
    `, [driverId]);
    
    // Log to order_status_history
    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, actor_type, actor_id, note)
       VALUES ($1, $2, $3, 'driver', $4, 'Driver accepted order')`,
      [orderId, currentStatus, MVP_STATUSES.ASSIGNED, req.user.id]
    );

    await client.query('COMMIT');
    
    // Emit real-time events
    if (io) {
      // Notify admin
      io.to('admin-dashboard').emit('dispatch_event', {
        type: 'order_accepted',
        order_id: orderId,
        courier_id: driverId,
        timestamp: new Date().toISOString()
      });
      
      // Notify customer
      const customerResult = await client.query('SELECT user_id FROM orders WHERE id = $1', [orderId]);
      if (customerResult.rows.length > 0) {
        io.to(`customer-${customerResult.rows[0].user_id}`).emit('order_status_update', {
          order_id: orderId,
          status: MVP_STATUSES.ASSIGNED,
          driver_assigned: true,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ message: "تم قبول الطلب بنجاح" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Accept order error:", err);
    res.status(500).json({ message: "حدث خطأ في قبول الطلب" });
  } finally {
    client.release();
  }
});

// Courier Reject Order (New endpoint for dispatch system)
app.post("/api/drivers/orders/:orderId/reject", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { attempt_id } = req.body;
    
    const driverResult = await pool.query("SELECT id FROM drivers WHERE user_id = $1;", [
      req.user.id,
    ]);
    if (driverResult.rows.length === 0) {
      return res.status(403).json({ message: "ليس لديك صلاحية سائق" });
    }

    const driverId = driverResult.rows[0].id;

    if (attempt_id) {
      // Update dispatch attempt
      await pool.query(`
        UPDATE order_dispatch_attempts 
        SET status = 'REJECTED', responded_at = NOW()
        WHERE id = $1 
          AND courier_id = $2 
          AND status = 'OFFERED'
      `, [attempt_id, driverId]);
    }

    // Emit event
    if (io) {
      io.to('admin-dashboard').emit('dispatch_event', {
        type: 'order_rejected',
        order_id: orderId,
        courier_id: driverId,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ message: "تم رفض الطلب" });
  } catch (err) {
    console.error("Reject order error:", err);
    res.status(500).json({ message: "حدث خطأ في رفض الطلب" });
  }
});

// دالة لحساب وتحديث عمولة Rider تلقائياً
// ================= Self-Settlement: Automated Financial Calculation =================
// أتمتة الجانب المالي: حساب عمولة المندوب والضرائب وتكلفة المنتجات تلقائياً
async function calculateAndUpdateCourierCommission(orderId, driverId) {
  try {
    // جلب تفاصيل الطلب مع تكلفة المنتجات
    const orderResult = await pool.query(`
      SELECT 
        o.total_amount, 
        o.delivery_fee, 
        o.payment_method,
        o.fixed_commission,
        COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost,
        COALESCE(SUM(oi.quantity * oi.unit_price * 0.15), 0) as total_vat
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = $1 AND o.driver_id = $2
      GROUP BY o.id, o.total_amount, o.delivery_fee, o.payment_method, o.fixed_commission;
    `, [orderId, driverId]);
    
    if (orderResult.rows.length === 0) return null;
    
    // 1. Get Sovereign Rules
    const rulesRes = await pool.query("SELECT * FROM rider_rules WHERE rule_key IN ('global_commission', 'target_bonus', 'manual_override')");
    const rules = {};
    rulesRes.rows.forEach(r => rules[r.rule_key] = r);

    // Fetch driver specific financial settings
    const driverSettings = await pool.query(
      'SELECT base_commission_per_order, bonus_threshold, bonus_amount FROM drivers WHERE id = $1',
      [driverId]
    );
    const dSettings = driverSettings.rows[0] || {};
    const baseCommission = parseFloat(dSettings.base_commission_per_order) || 9.00;
    const bonusThreshold = parseInt(dSettings.bonus_threshold) || 500;
    const bonusAmountVal = parseFloat(dSettings.bonus_amount) || 150.00;

    const order = orderResult.rows[0];
    const totalAmount = parseFloat(order.total_amount) || 0;
    const totalCost = parseFloat(order.total_cost) || 0;
    const totalVAT = parseFloat(order.total_vat) || 0;
    
    // --- Rule C: Manual Override (Freeze) ---
    const isFrozen = rules['manual_override']?.is_enabled;
    
    // حساب العمولة
    let commission = 0;
    
    if (isFrozen) {
        console.log(`🛑 Commission skipped for Driver ${driverId} due to Manual Override (Freeze).`);
        commission = 0;
    } else {
        if (order.fixed_commission && parseFloat(order.fixed_commission) > 0) {
          // استخدام المبلغ الثابت المحدد للطلب (Override)
          commission = parseFloat(order.fixed_commission);
        } else {
          // Rule B: Global Commission Check
          // If Global Commission Rule exists and is DISABLED, commission is 0.
          if (rules['global_commission'] && !rules['global_commission'].is_enabled) {
              commission = 0;
          } else {
              commission = baseCommission;
          }
        }
    }
    
    // حساب الربح الصافي للتاجر (بعد خصم التكلفة والعمولة والضرائب)
    const netProfit = totalAmount - totalCost - commission - totalVAT;
    
    // التأكد من وجود محفظة لـ Rider
    await pool.query(`
      INSERT INTO courier_wallets (driver_id, cod_balance, payable_balance, total_collected, total_returned)
      VALUES ($1, 0, 0, 0, 0)
      ON CONFLICT (driver_id) DO NOTHING;
    `, [driverId]);
    
    // تحديث المحفظة - إضافة العمولة فقط إذا لم يكن مجمداً
    if (commission > 0) {
        await pool.query(`
          UPDATE courier_wallets
          SET payable_balance = COALESCE(payable_balance, 0) + $1,
              total_earnings = COALESCE(total_earnings, 0) + $1,
              total_orders = COALESCE(total_orders, 0) + 1,
              last_updated = NOW()
          WHERE driver_id = $2;
        `, [commission, driverId]);
        
        // تسجيل المعاملة
        await pool.query(`
          INSERT INTO courier_wallet_transactions (driver_id, transaction_type, amount, order_id, description)
          VALUES ($1, 'commission', $2, $3, $4);
        `, [driverId, commission, orderId, `عمولة طلب #${orderId} (${commission.toFixed(2)} ريال)`]);
    } else {
        // Just update total orders count if 0 commission
        await pool.query(`
          UPDATE courier_wallets SET total_orders = COALESCE(total_orders, 0) + 1 WHERE driver_id = $1;
        `, [driverId]);
    }
    
    // ================= BONUS CHECK LOGIC =================
    // Only check bonus if NOT frozen AND Target Bonus Rule is Enabled
    if (!isFrozen && rules['target_bonus']?.is_enabled) {
        // Check total orders for this driver in the current month
        const monthlyStats = await pool.query(`
          SELECT COUNT(*) as count 
          FROM orders 
          WHERE driver_id = $1 
          AND status = 'DELIVERED'
          AND created_at >= date_trunc('month', CURRENT_DATE);
        `, [driverId]);

        const currentMonthOrders = parseInt(monthlyStats.rows[0].count);

        // If exactly hit the threshold, award bonus
        if (currentMonthOrders === bonusThreshold) {
           console.log(`🎉 BONUS! Driver ${driverId} reached ${currentMonthOrders} orders. Adding ${bonusAmountVal} SAR.`);
           
           await pool.query(`
            UPDATE courier_wallets
            SET payable_balance = COALESCE(payable_balance, 0) + $1,
                total_earnings = COALESCE(total_earnings, 0) + $1
            WHERE driver_id = $2;
          `, [bonusAmountVal, driverId]);

          await pool.query(`
            INSERT INTO courier_wallet_transactions (driver_id, transaction_type, amount, description)
            VALUES ($1, 'bonus', $2, $3);
          `, [driverId, bonusAmountVal, `مكافأة شهرية: تحقيق ${bonusThreshold} طلب`]);
        }
    }
    // =====================================================
    
    if (order.payment_method === 'cod') {
      await pool.query(`
        INSERT INTO courier_wallet_transactions (driver_id, transaction_type, amount, order_id, description)
        VALUES ($1, 'cod_collection', $2, $3, $4);
      `, [driverId, totalAmount, orderId, `تحصيل مبلغ الطلب #${orderId} (${totalAmount.toFixed(2)} ريال)`]);
    }
    
    // تحديث جدول الطلبات بحسابات مالية (للتقارير)
    await pool.query(`
      UPDATE orders 
      SET 
        driver_commission = $1,
        order_cost = $2,
        order_vat = $3,
        net_profit = $4,
        settlement_completed_at = NOW()
      WHERE id = $5;
    `, [commission, totalCost, totalVAT, netProfit, orderId]);
    
    // إرسال إشعار Socket.IO للمندوب
    if (io) {
      const walletResult = await pool.query(`
        SELECT payable_balance FROM courier_wallets WHERE driver_id = $1;
      `, [driverId]);
      
      io.to(`driver-${driverId}`).emit('wallet_updated', {
        order_id: orderId,
        commission: commission,
        bonus: (!isFrozen && rules['target_bonus']?.is_enabled && currentMonthOrders === bonusThreshold) ? bonusAmountVal : 0,
        new_balance: walletResult.rows[0]?.payable_balance || 0,
        timestamp: new Date().toISOString()
      });
    }
    
    return { 
      commission, 
      cod_amount: order.payment_method === 'cod' ? totalAmount : 0,
      total_cost: totalCost,
      total_vat: totalVAT,
      net_profit: netProfit
    };
  } catch (err) {
    console.error("Calculate commission error:", err);
    return null;
  }
}

// MVP: Update order status (driver) - PICKED_UP, DELIVERED
app.put("/api/drivers/orders/:orderId/status", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { orderId } = req.params;
    const { status } = req.body;

    const driverResult = await client.query("SELECT id FROM drivers WHERE user_id = $1;", [
      req.user.id,
    ]);
    if (driverResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: "ليس لديك صلاحية سائق" });
    }

    const driverId = driverResult.rows[0].id;
    
    // Get current order status
    const orderCheck = await client.query(
      'SELECT status FROM orders WHERE id = $1 AND driver_id = $2',
      [orderId, driverId]
    );
    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "الطلب غير موجود أو غير مخصص لك" });
    }
    
    const oldStatus = orderCheck.rows[0].status;
    const newStatus = mapToMVPStatus(status);
    
    // MVP: Validate transition
    const validation = validateStatusTransition(oldStatus, newStatus);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: validation.message });
    }
    
    // Update order status
    await client.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND driver_id = $3",
      [newStatus, orderId, driverId]
    );
    
    // Log to order_status_history
    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, actor_type, actor_id, note)
       VALUES ($1, $2, $3, 'driver', $4, 'Driver updated order status')`,
      [orderId, oldStatus, newStatus, req.user.id]
    );
    
    // إذا تم التسليم، حساب العمولة تلقائياً وتحديث حالة Rider إلى "available"
    if (newStatus === MVP_STATUSES.DELIVERED) {
      const commissionResult = await calculateAndUpdateCourierCommission(orderId, driverId);
      if (commissionResult) {
        console.log(`✅ Commission calculated for rider ${driverId}: ${commissionResult.commission} SAR`);
      }
      
      // تحديث حالة Rider إلى "available" بعد التسليم
      await client.query(`
        UPDATE drivers SET rider_status = 'available', status = 'online' WHERE id = $1;
      `, [driverId]);
    }
    
    // إرسال إشعار Socket.IO للزبون
    if (io) {
      const orderResult = await pool.query(`
        SELECT user_id FROM orders WHERE id = $1;
      `, [orderId]);
      
      if (orderResult.rows.length > 0) {
        io.to(`customer-${orderResult.rows[0].user_id}`).emit('order_status_update', {
          order_id: orderId,
          status: status,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ message: "تم تحديث حالة الطلب" });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث حالة الطلب" });
  }
});

// ================= Driver Rating Routes =================

// إضافة تقييم لـ Rider
app.post("/api/drivers/ratings", authMiddleware, async (req, res) => {
  try {
    const { order_id, driver_id, rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "التقييم يجب أن يكون بين 1 و 5" });
    }

    const result = await pool.query(
      `
      INSERT INTO driver_ratings (order_id, driver_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `,
      [order_id, driver_id, rating, comment || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Add rating error:", err);
    res.status(500).json({ message: "حدث خطأ في إضافة التقييم" });
  }
});

// الحصول على تقييمات Rider
app.get("/api/drivers/:driverId/ratings", async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await pool.query(
      `
      SELECT dr.*, o.id as order_id, u.name as customer_name
      FROM driver_ratings dr
      JOIN orders o ON dr.order_id = o.id
      JOIN users u ON o.user_id = u.id
      WHERE dr.driver_id = $1
      ORDER BY dr.created_at DESC;
    `,
      [driverId]
    );

    res.json({ ratings: result.rows });
  } catch (err) {
    console.error("Get ratings error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب التقييمات" });
  }
});

// ================= Hero Slider Routes =================

// الحصول على جميع شرائح Hero (للعامة - فقط النشطة)
app.get("/api/hero-slides", async (req, res) => {
  try {
    // محاولة جلب البيانات مباشرة - إذا فشل، نتحقق من وجود الجدول
    let result;
    try {
      result = await pool.query(
        "SELECT id, title_ar, title_en, subtitle_ar, subtitle_en, image_url, bg_gradient, link_url, is_active, display_order FROM hero_slides WHERE is_active = true ORDER BY display_order, id;"
      );
      console.log(`✅ Hero slides loaded: ${result.rows.length} slides`);
      
      // إذا كانت المصفوفة فارغة، نعيد شرائح افتراضية
      if (result.rows.length === 0) {
        console.warn('⚠️ No active hero slides found, returning default slides');
        return res.json([
          {
            id: 1,
            title_ar: 'تسوق طازج ومضمون',
            title_en: 'Fresh Groceries Delivered',
            subtitle_ar: 'احصل على أفضل المنتجات عند بابك',
            subtitle_en: 'Get the best products at your doorstep',
            image_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80',
            bg_gradient: 'from-emerald-500 to-green-600',
            link_url: null,
            is_active: true,
            display_order: 1
          }
        ]);
      }
      
      return res.json(result.rows);
    } catch (queryErr) {
      // إذا فشل الاستعلام، قد يكون الجدول غير موجود
      console.warn('⚠️ Query failed, checking if table exists:', queryErr.message);
      
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'hero_slides'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.warn('⚠️ hero_slides table does not exist, returning default slides');
        return res.json([
          {
            id: 1,
            title_ar: 'تسوق طازج ومضمون',
            title_en: 'Fresh Groceries Delivered',
            subtitle_ar: 'احصل على أفضل المنتجات عند بابك',
            subtitle_en: 'Get the best products at your doorstep',
            image_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80',
            bg_gradient: 'from-emerald-500 to-green-600',
            link_url: null,
            is_active: true,
            display_order: 1
          }
        ]);
      }
      
      // إذا كان الجدول موجوداً لكن الاستعلام فشل، نعيد مصفوفة فارغة
      throw queryErr;
    }
  } catch (err) {
    console.error("❌ Get hero slides error:", err);
    // إرجاع شرائح افتراضية بدلاً من مصفوفة فارغة
    res.json([
      {
        id: 1,
        title_ar: 'تسوق طازج ومضمون',
        title_en: 'Fresh Groceries Delivered',
        subtitle_ar: 'احصل على أفضل المنتجات عند بابك',
        subtitle_en: 'Get the best products at your doorstep',
        image_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80',
        bg_gradient: 'from-emerald-500 to-green-600',
        link_url: null,
        is_active: true,
        display_order: 1
      }
    ]
    );
  }
});

// الحصول على جميع شرائح Hero (للأدمن - جميع الشرائح)
app.get("/api/admin/hero-slides", authMiddleware, async (req, res) => {
  try {
    // التحقق من وجود الجدول أولاً
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hero_slides'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.warn('⚠️ hero_slides table does not exist, returning empty array');
      return res.json([]);
    }
    
    const result = await pool.query(
      "SELECT * FROM hero_slides ORDER BY display_order, id;"
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error("Get admin hero slides error:", err);
    // إرجاع مصفوفة فارغة بدلاً من خطأ
    res.json([]);
  }
});

// إضافة شريحة Hero جديدة
app.post("/api/admin/hero-slides", authMiddleware, async (req, res) => {
  try {
    const { title_ar, title_en, subtitle_ar, subtitle_en, image_url, bg_gradient, link_url, display_order } = req.body;
    
    if (!image_url) {
      return res.status(400).json({ message: "رابط الصورة مطلوب" });
    }
    
    const result = await pool.query(
      `
      INSERT INTO hero_slides (title_ar, title_en, subtitle_ar, subtitle_en, image_url, bg_gradient, link_url, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
      `,
      [
        title_ar || null,
        title_en || null,
        subtitle_ar || null,
        subtitle_en || null,
        image_url,
        bg_gradient || 'from-emerald-500 to-green-600',
        link_url || null,
        display_order || 0
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create hero slide error:", err);
    res.status(500).json({ message: "حدث خطأ في إضافة الشريحة" });
  }
});

// تعديل شريحة Hero
app.put("/api/admin/hero-slides/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title_ar, title_en, subtitle_ar, subtitle_en, image_url, bg_gradient, link_url, is_active, display_order } = req.body;
    
    const result = await pool.query(
      `
      UPDATE hero_slides
      SET title_ar = COALESCE($1, title_ar),
          title_en = COALESCE($2, title_en),
          subtitle_ar = COALESCE($3, subtitle_ar),
          subtitle_en = COALESCE($4, subtitle_en),
          image_url = COALESCE($5, image_url),
          bg_gradient = COALESCE($6, bg_gradient),
          link_url = COALESCE($7, link_url),
          is_active = COALESCE($8, is_active),
          display_order = COALESCE($9, display_order)
      WHERE id = $10
      RETURNING *;
      `,
      [
        title_ar,
        title_en,
        subtitle_ar,
        subtitle_en,
        image_url,
        bg_gradient,
        link_url,
        is_active,
        display_order,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الشريحة غير موجودة" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update hero slide error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الشريحة" });
  }
});

// حذف شريحة Hero
app.delete("/api/admin/hero-slides/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM hero_slides WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الشريحة غير موجودة" });
    }
    res.json({ message: "تم حذف الشريحة بنجاح" });
  } catch (err) {
    console.error("Delete hero slide error:", err);
    res.status(500).json({ message: "حدث خطأ في حذف الشريحة" });
  }
});

// ================= Category Routes =================

// الحصول على جميع الفئات
app.get("/api/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, name_ar, name_en, image_url, description, description_ar, description_en, created_at FROM categories ORDER BY COALESCE(name_ar, name);");
    res.json(result.rows);
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الفئات" });
  }
});

// إضافة فئة جديدة
app.post("/api/categories", authMiddleware, async (req, res) => {
  try {
    const { name, name_ar, name_en, image_url, description, description_ar, description_en } = req.body;
    
    // استخدام name_ar أو name_en أو name (للتوافق مع القديم)
    const final_name_ar = name_ar || name || '';
    const final_name_en = name_en || '';
    
    if (!final_name_ar && !final_name_en) {
      return res.status(400).json({ message: "اسم الفئة مطلوب (name_ar أو name_en أو name)" });
    }
    
    const result = await pool.query(
      `
      INSERT INTO categories (name, name_ar, name_en, image_url, description, description_ar, description_en)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
      `,
      [
        final_name_ar, // name (backward compatibility)
        final_name_ar,
        final_name_en || null,
        image_url || null,
        description || description_ar || null,
        description_ar || null,
        description_en || null
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({ message: "حدث خطأ في إضافة الفئة" });
  }
});

// تعديل فئة
app.put("/api/categories/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, name_en, image_url, description, description_ar, description_en } = req.body;

    // استخدام name_ar أو name_en أو name (للتوافق مع القديم)
    const final_name_ar = name_ar !== undefined ? name_ar : (name !== undefined ? name : null);
    const final_name_en = name_en !== undefined ? name_en : null;

    const result = await pool.query(
      `
      UPDATE categories
      SET name = COALESCE($1, name),
          name_ar = COALESCE($1, name_ar, name),
          name_en = COALESCE($2, name_en),
          image_url = COALESCE($3, image_url),
          description = COALESCE($4, description),
          description_ar = COALESCE($5, description_ar),
          description_en = COALESCE($6, description_en)
      WHERE id = $7
      RETURNING *;
      `,
      [
        final_name_ar,
        final_name_en,
        image_url || null,
        description || description_ar,
        description_ar,
        description_en,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الفئة غير موجودة" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update category error:", err);
    res.status(500).json({ message: "حدث خطأ في تعديل الفئة" });
  }
});

// حذف فئة
app.delete("/api/categories/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM categories WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الفئة غير موجودة" });
    }

    res.json({ message: "تم حذف الفئة بنجاح" });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ message: "حدث خطأ في حذف الفئة" });
  }
});

// ================= Admin Routes =================

// الحصول على جميع Riders مع التقييمات وحالاتهم (Quick Commerce)
app.get("/api/admin/drivers", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        d.*, 
        u.name, 
        u.email, 
        u.is_active as user_active,
        COALESCE(d.rider_status, 'offline') as rider_status,
        COALESCE(AVG(dr.rating), 0) as avg_rating,
        COUNT(dr.id) as total_ratings,
        COUNT(CASE WHEN o.status IN ('ASSIGNED', 'PICKED_UP') THEN 1 END) as active_orders_count
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN driver_ratings dr ON d.id = dr.driver_id
      LEFT JOIN orders o ON d.id = o.driver_id AND o.status IN ('ASSIGNED', 'PICKED_UP')
      GROUP BY d.id, u.name, u.email, u.is_active
      ORDER BY 
        CASE COALESCE(d.rider_status, 'offline')
          WHEN 'available' THEN 1
          WHEN 'busy' THEN 2
          WHEN 'offline' THEN 3
        END,
        d.created_at DESC;
    `
    );
    res.json({ drivers: result.rows });
  } catch (err) {
    console.error("Get drivers error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب Riders" });
  }
});

// الحصول على Riders (فريق التوصيل السريع) مع حالاتهم
// ================= Rider Sovereign Control Rules =================

// Get All Rules
app.get("/api/admin/rider-rules", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rider_rules ORDER BY rule_key");
    res.json(result.rows);
  } catch (err) {
    console.error("Get rider rules error:", err);
    res.status(500).json({ message: "Error fetching rules" });
  }
});

// Update Rule (Toggle/Settings)
app.put("/api/admin/rider-rules/:key", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { key } = req.params;
    const { is_enabled, settings } = req.body;
    
    await pool.query(
      "UPDATE rider_rules SET is_enabled = $1, settings = $2, updated_at = NOW() WHERE rule_key = $3",
      [is_enabled, settings, key]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error("Update rider rule error:", err);
    res.status(500).json({ message: "Error updating rule" });
  }
});

// Manual Balance Adjustment
app.post("/api/admin/riders/:driverId/adjustment", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { driverId } = req.params;
    const { amount, reason } = req.body;
    const adminId = req.user.id;

    // 1. Update Wallet
    await pool.query(`
      UPDATE courier_wallets 
      SET payable_balance = payable_balance + $1, 
          last_updated = NOW()
      WHERE driver_id = $2
    `, [amount, driverId]);

    // 2. Log Adjustment
    await pool.query(`
      INSERT INTO wallet_adjustments (driver_id, amount, reason, admin_id)
      VALUES ($1, $2, $3, $4)
    `, [driverId, amount, reason, adminId]);

    // 3. Log Transaction
    await pool.query(`
      INSERT INTO courier_wallet_transactions (driver_id, transaction_type, amount, description)
      VALUES ($1, 'adjustment', $2, $3)
    `, [driverId, amount, `Manual Adjustment: ${reason}`]);

    res.json({ success: true, message: "Balance adjusted successfully" });
  } catch (err) {
    console.error("Balance adjustment error:", err);
    res.status(500).json({ message: "Error adjusting balance" });
  }
});

// =========================================================================

// ================= Rider Global Settings & Status Automation =================

// Get Global Rider Settings
app.get("/api/admin/settings/riders", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('rider_default_commission', 'rider_monthly_target', 'rider_bonus_amount')");
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error("Get rider settings error:", err);
    res.status(500).json({ message: "Error fetching settings" });
  }
});

// Apply Global Settings to ALL Riders
app.post("/api/admin/settings/riders/apply-all", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { default_commission, monthly_target, bonus_amount } = req.body;

    // 1. Update System Settings
    await pool.query(`
      INSERT INTO system_settings (key, value) VALUES
      ('rider_default_commission', $1),
      ('rider_monthly_target', $2),
      ('rider_bonus_amount', $3)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `, [default_commission, monthly_target, bonus_amount]);

    // 2. Update All Drivers
    await pool.query(`
      UPDATE drivers 
      SET 
        base_commission_per_order = $1,
        bonus_threshold = $2,
        bonus_amount = $3
      WHERE is_active = true;
    `, [default_commission, monthly_target, bonus_amount]);

    res.json({ success: true, message: "Global settings applied to all active riders" });
  } catch (err) {
    console.error("Apply global settings error:", err);
    res.status(500).json({ message: "Error applying settings" });
  }
});

// Driver Heartbeat (Keep-Alive for Online Status)
app.post("/api/driver/heartbeat", authMiddleware, async (req, res) => {
  try {
    // Determine driver ID from user ID
    const driverRes = await pool.query("SELECT id FROM drivers WHERE user_id = $1", [req.user.id]);
    if (driverRes.rows.length > 0) {
      await pool.query("UPDATE drivers SET last_seen = NOW() WHERE id = $1", [driverRes.rows[0].id]);
    }
    res.status(200).send("OK");
  } catch (err) {
    // Silent fail
    res.status(200).send("OK"); 
  }
});

// =========================================================================

app.get("/api/admin/riders", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        d.id as rider_id,
        d.id as id,
        d.id as driver_id,
        u.name as rider_name,
        u.name as name,
        u.email,
        d.phone,
        d.vehicle_type,
        -- AUTOMATED STATUS LOGIC
        CASE 
          WHEN (COUNT(CASE WHEN o.status IN ('ASSIGNED', 'PICKED_UP') THEN 1 END) > 0) THEN 'delivering'
          WHEN (d.last_seen > NOW() - INTERVAL '120 seconds' OR d.last_location_update > NOW() - INTERVAL '120 seconds') THEN 'available' -- "Online" (2 mins heartbeat)
          ELSE 'offline'
        END as rider_status,
        
        d.current_latitude,
        d.current_longitude,
        d.last_location_update,
        d.last_seen,
        d.is_active,
        u.is_active as user_active,
        d.is_approved,
        d.base_commission_per_order,
        d.bonus_threshold,
        d.bonus_amount,
        d.payout_frequency,
        
        -- Orders this Month
        (SELECT COUNT(*) FROM orders o2 
         WHERE o2.driver_id = d.id 
         AND o2.status = 'DELIVERED'
         AND o2.created_at >= date_trunc('month', CURRENT_DATE)
        ) as orders_this_month,
        
        -- Wallet Balance
        COALESCE((SELECT payable_balance FROM courier_wallets cw WHERE cw.driver_id = d.id), 0) as wallet_balance,

        COUNT(CASE WHEN o.status IN ('ASSIGNED', 'PICKED_UP') THEN 1 END) as active_orders_count,
        COALESCE(AVG(dr.rating), 0) as avg_rating,
        COUNT(dr.id) as total_ratings
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN orders o ON d.id = o.driver_id AND o.status IN ('ASSIGNED', 'PICKED_UP')
      LEFT JOIN driver_ratings dr ON d.id = dr.driver_id
      GROUP BY d.id, u.name, u.email, u.is_active, d.phone, d.vehicle_type, d.rider_status, 
               d.current_latitude, d.current_longitude, d.last_location_update, d.last_seen,
               d.is_active, d.is_approved,
               d.base_commission_per_order, d.bonus_threshold, d.bonus_amount, d.payout_frequency
      ORDER BY 
        CASE 
          WHEN (COUNT(CASE WHEN o.status IN ('ASSIGNED', 'PICKED_UP') THEN 1 END) > 0) THEN 1 -- Delivering first
          WHEN (d.last_seen > NOW() - INTERVAL '5 minutes') THEN 2 -- Online second
          ELSE 3 -- Offline last
        END ASC
      `
    );

    res.json({ riders: result.rows });
  } catch (err) {
    console.error("Get riders error:", err);
    res.status(500).json({ message: "Error fetching riders" });
  }
});

// تحديث حالة Rider (نشط/غير نشط)
app.put("/api/admin/drivers/:driverId/status", authMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { is_active } = req.body;

    await pool.query("UPDATE drivers SET is_active = $1 WHERE id = $2;", [is_active, driverId]);
    await pool.query(
      "UPDATE users SET is_active = $1 WHERE id = (SELECT user_id FROM drivers WHERE id = $2);",
      [is_active, driverId]
    );

    res.json({ message: "تم تحديث حالة Rider" });
  } catch (err) {
    console.error("Update driver status error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث حالة Rider" });
  }
});

// تحديث حالة Rider (Quick Commerce: available, busy, offline)
app.put("/api/admin/riders/:riderId/status", authMiddleware, async (req, res) => {
  try {
    const { riderId } = req.params;
    const { rider_status } = req.body;

    if (!['available', 'busy', 'offline'].includes(rider_status)) {
      return res.status(400).json({ message: "حالة Rider غير صالحة. يجب أن تكون: available, busy, أو offline" });
    }

    await pool.query(
      "UPDATE drivers SET rider_status = $1 WHERE id = $2;",
      [rider_status, riderId]
    );

    // إرسال إشعار Socket.IO
    if (io) {
      io.to(`rider-${riderId}`).emit('rider_status_changed', {
        rider_id: riderId,
        status: rider_status,
        timestamp: new Date().toISOString()
      });
      
      io.to('admin-dashboard').emit('rider-status-updated', {
        rider_id: riderId,
        status: rider_status,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ message: `تم تحديث حالة Rider إلى: ${rider_status}` });
  } catch (err) {
    console.error("Update rider status error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث حالة Rider" });
  }
});

// الموافقة/الرفض على Rider
app.put("/api/admin/drivers/:driverId/approve", authMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { is_approved } = req.body;

    await pool.query("UPDATE drivers SET is_approved = $1 WHERE id = $2;", [is_approved, driverId]);
    if (is_approved) {
      await pool.query("UPDATE drivers SET is_active = true WHERE id = $1;", [driverId]);
      await pool.query(
        "UPDATE users SET is_active = true WHERE id = (SELECT user_id FROM drivers WHERE id = $1);",
        [driverId]
      );
    }

    res.json({ message: is_approved ? "تم الموافقة على Rider" : "تم رفض Rider" });
  } catch (err) {
    console.error("Approve driver error:", err);
    res.status(500).json({ message: "حدث خطأ في معالجة طلب Rider" });
  }
});

// إدخال بيانات تجريبية (Seed Test Data)
app.post("/api/admin/seed-test-data", authMiddleware, async (req, res) => {
  try {
    const defaultPassword = "driver123"; // كلمة مرور افتراضية
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // بيانات Riders التجريبية
    const testDrivers = [
      { name_ar: "أحمد المنصور", name_en: "Ahmed Al-Mansour", phone: "0501234567", vehicle: "car", status: "active", is_approved: true, email: "ahmed.driver@tomo.com" },
      { name_ar: "خالد العتيبي", name_en: "Khaled Al-Otaibi", phone: "0557654321", vehicle: "car", status: "active", is_approved: true, email: "khaled.driver@tomo.com" },
      { name_ar: "سلطان الشمري", name_en: "Sultan Al-Shammari", phone: "0543210987", vehicle: "car", status: "offline", is_approved: false, email: "sultan.driver@tomo.com" }
    ];

    const createdDrivers = [];

    for (const driverData of testDrivers) {
      try {
        // إنشاء مستخدم أولاً
        const userResult = await pool.query(
          `INSERT INTO users (name, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, 'driver', $4)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
           RETURNING id;`,
          [driverData.name_ar, driverData.email, passwordHash, driverData.is_approved]
        );

        const userId = userResult.rows[0].id;

        // إنشاء Rider
        const driverResult = await pool.query(
          `INSERT INTO drivers (user_id, phone, vehicle_type, status, is_active, is_approved)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id) DO UPDATE SET 
             phone = EXCLUDED.phone,
             vehicle_type = EXCLUDED.vehicle_type,
             status = EXCLUDED.status,
             is_active = EXCLUDED.is_active,
             is_approved = EXCLUDED.is_approved
           RETURNING id;`,
          [userId, driverData.phone, driverData.vehicle, driverData.status, driverData.is_approved, driverData.is_approved]
        );

        createdDrivers.push({
          id: driverResult.rows[0].id,
          name: driverData.name_ar,
          email: driverData.email,
          password: defaultPassword
        });
      } catch (err) {
        console.error(`Error creating driver ${driverData.name_ar}:`, err.message);
      }
    }

    // بيانات الطلبات التجريبية - نحتاج مستخدمين للعملاء أولاً
    const testCustomers = [
      { name: "سارة محمد", email: "sara.customer@tomo.com" },
      { name: "عبدالله الفهد", email: "abdullah.customer@tomo.com" }
    ];

    const createdCustomers = [];
    for (const customer of testCustomers) {
      try {
        const customerHash = await bcrypt.hash("customer123", 10);
        const customerResult = await pool.query(
          `INSERT INTO users (name, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, 'customer', true)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
           RETURNING id;`,
          [customer.name, customer.email, customerHash]
        );
        createdCustomers.push(customerResult.rows[0].id);
      } catch (err) {
        console.error(`Error creating customer ${customer.name}:`, err.message);
      }
    }

    // إنشاء الطلبات التجريبية
    const testOrders = [
      { customer_index: 0, total_price: 155.50, status: "pending", delivery_address: "الرياض، حي النرجس، شارع الملك فهد" },
      { customer_index: 1, total_price: 89.00, status: "confirmed", driver_id: createdDrivers[0]?.id || null, delivery_address: "الرياض، حي العليا، شارع التحلية" }
    ];

    const createdOrders = [];
    for (const orderData of testOrders) {
      if (createdCustomers[orderData.customer_index]) {
        try {
          const orderResult = await pool.query(
            `INSERT INTO orders (user_id, total_amount, status, delivery_address, driver_id, delivery_status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id;`,
            [
              createdCustomers[orderData.customer_index],
              orderData.total_price,
              orderData.status,
              orderData.delivery_address,
              orderData.driver_id,
              orderData.status
            ]
          );

          if (orderData.driver_id) {
            // Log to tracking history
            await pool.query(
              `INSERT INTO order_tracking_history (order_id, status, driver_id) VALUES ($1, $2, $3);`,
              [orderResult.rows[0].id, orderData.status, orderData.driver_id]
            );
          }

          createdOrders.push(orderResult.rows[0].id);
        } catch (err) {
          console.error(`Error creating order:`, err.message);
        }
      }
    }

    res.json({
      message: "تم إدخال البيانات التجريبية بنجاح",
      drivers: createdDrivers,
      customers: createdCustomers.length,
      orders: createdOrders.length,
      note: "كلمات المرور الافتراضية: driver123 للسائقين، customer123 للعملاء"
    });
  } catch (err) {
    console.error("Seed test data error:", err);
    res.status(500).json({ 
      message: "حدث خطأ في إدخال البيانات التجريبية", 
      error: err.message,
      details: err.stack 
    });
  }
});

// تعيين Rider لطلب (يدوي)
app.post("/api/admin/orders/:orderId/assign-driver", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driver_id } = req.body;

    if (!driver_id) {
      return res.status(400).json({ message: "معرف Rider مطلوب" });
    }

    // التحقق من وجود Rider
    const driverCheck = await pool.query("SELECT id, is_active FROM drivers WHERE id = $1;", [driver_id]);
    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ message: "Rider غير موجود" });
    }

    if (!driverCheck.rows[0].is_active) {
      return res.status(400).json({ message: "Rider غير نشط" });
    }

    // تعيين Rider للطلب
    await pool.query(
      `UPDATE orders SET driver_id = $1, status = 'ASSIGNED', delivery_status = 'ASSIGNED' WHERE id = $2;`,
      [driver_id, orderId]
    );
    
    // Log to tracking history
    await pool.query(
      `INSERT INTO order_tracking_history (order_id, status, driver_id) VALUES ($1, 'ASSIGNED', $2);`,
      [orderId, driver_id]
    );

    // إرسال إشعار Socket.IO للمندوب
    if (io) {
      const orderResult = await pool.query(`
        SELECT o.total_amount, o.delivery_address, u.name as customer_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = $1;
      `, [orderId]);
      
      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];
        io.to(`driver-${driver_id}`).emit('new_order_notification', {
          order_id: orderId,
          total_amount: order.total_amount,
          delivery_address: order.delivery_address,
          customer_name: order.customer_name,
          timestamp: new Date().toISOString()
        });
      }
      
      // إشعار للزبون
      const customerResult = await pool.query(`
        SELECT user_id FROM orders WHERE id = $1;
      `, [orderId]);
      
      if (customerResult.rows.length > 0) {
        io.to(`customer-${customerResult.rows[0].user_id}`).emit('order_status_update', {
          order_id: orderId,
          status: MVP_STATUSES.ASSIGNED,
          driver_assigned: true,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ message: "تم تعيين Rider للطلب بنجاح" });
  } catch (err) {
    console.error("Assign driver error:", err);
    res.status(500).json({ message: "حدث خطأ في تعيين Rider" });
  }
});

// ================= Dispatch Settings Admin Endpoints =================
// Get dispatch settings
app.get("/api/admin/dispatch/settings", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dispatch_settings WHERE id = 1');
    if (result.rows.length === 0) {
      // Return default settings
      return res.json({
        mode: 'AUTO_OFFER',
        is_enabled: true,
        offer_timeout_seconds: 30,
        max_couriers_per_offer: 5,
        retry_enabled: true,
        max_retries: 3,
        scoring_weights: { distance_weight: 0.4, performance_weight: 0.3, fairness_weight: 0.3 },
        fallback_behavior: 'notify_admin'
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get dispatch settings error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إعدادات التوزيع" });
  }
});

// Manual offer creation (admin-only) - only meaningful in AUTO_OFFER mode
app.post("/api/admin/orders/:orderId/offer", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverIds, driverId, expiresInSeconds } = req.body || {};
    const list = Array.isArray(driverIds)
      ? driverIds
      : (driverId != null ? [driverId] : []);
    const targets = (list || []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
    if (!targets.length) {
      return res.status(400).json({ message: "driverIds مطلوب" });
    }

    const settingsRes = await pool.query(`SELECT mode, offer_timeout_seconds FROM dispatch_settings WHERE id = 1`);
    const mode = settingsRes?.rows?.[0]?.mode || 'AUTO_ASSIGN';
    const timeoutDefault = Number(settingsRes?.rows?.[0]?.offer_timeout_seconds || 30);
    if (mode !== 'AUTO_OFFER') {
      return res.status(400).json({ message: "Offer mode is not enabled" });
    }

    const orderInfo = await pool.query(`SELECT id, status, store_id, user_id, driver_id FROM orders WHERE id = $1`, [orderId]);
    if (orderInfo.rows.length === 0) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }
    if (orderInfo.rows[0].driver_id) {
      return res.status(400).json({ message: "الطلب تم تعيينه بالفعل" });
    }

    const nextAttempt = await pool.query(
      `SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next FROM order_dispatch_attempts WHERE order_id = $1`,
      [orderId]
    );
    const attemptNumber = Number(nextAttempt?.rows?.[0]?.next || 1);
    const ttl = Math.max(5, Math.min(300, Number(expiresInSeconds || timeoutDefault || 30)));
    const expiresAt = new Date(Date.now() + ttl * 1000);

    const created = [];
    for (const did of targets) {
      const ins = await pool.query(
        `
        INSERT INTO order_dispatch_attempts (order_id, courier_id, attempt_number, status, expires_at)
        VALUES ($1, $2, $3, 'OFFERED', $4)
        ON CONFLICT (order_id, courier_id, attempt_number) DO NOTHING
        RETURNING id
      `,
        [orderId, did, attemptNumber, expiresAt]
      );
      if (ins.rows.length) {
        const offerId = ins.rows[0].id;
        created.push({ id: offerId, driverId: did, orderId: Number(orderId), expiresAt: expiresAt.toISOString() });
        if (io) {
          io.to(`rider-${did}`).emit('offer.created', { offerId, orderId: Number(orderId), expiresAt: expiresAt.toISOString() });
          io.to(`driver-${did}`).emit('offer.created', { offerId, orderId: Number(orderId), expiresAt: expiresAt.toISOString() }); // backward
        }
      }
    }

    // Emit order.updated (even though order doesn't change)
    try {
      emitOrderUpdated({
        orderId: Number(orderId),
        status: orderInfo.rows[0].status,
        storeId: orderInfo.rows[0].store_id || null,
        driverId: orderInfo.rows[0].driver_id || null,
        userId: orderInfo.rows[0].user_id || null,
      });
    } catch {}

    await logAuditAction(req, 'OFFER_RESEND', 'order', parseInt(orderId, 10), null, { driverIds: targets, offerCount: created.length });
    res.json({ ok: true, offers: created });
  } catch (err) {
    console.error("❌ Admin create offer error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء العرض" });
  }
});

// Internal notes (orders + riders) - feature-flagged via admin auth
app.get("/api/admin/internal-notes", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { entityType, entityId } = req.query;
    if (!entityType || !entityId) {
      return res.status(400).json({ message: "entityType and entityId required" });
    }
    const allowed = ['order', 'rider'];
    if (!allowed.includes(String(entityType))) {
      return res.status(400).json({ message: "entityType must be order or rider" });
    }
    const eid = parseInt(String(entityId), 10);
    if (!Number.isFinite(eid) || eid < 1) {
      return res.status(400).json({ message: "entityId must be a positive integer" });
    }
    const result = await pool.query(
      `SELECT n.id, n.entity_type, n.entity_id, n.note, n.created_at, u.name AS author_name
       FROM internal_notes n
       LEFT JOIN users u ON u.id = n.author_id
       WHERE n.entity_type = $1 AND n.entity_id = $2
       ORDER BY n.created_at ASC`,
      [entityType, eid]
    );
    res.json({ notes: result.rows });
  } catch (err) {
    console.error("Internal notes list error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الملاحظات" });
  }
});

app.post("/api/admin/internal-notes", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { entityType, entityId, note } = req.body || {};
    if (!entityType || entityId == null || !String(note || '').trim()) {
      return res.status(400).json({ message: "entityType, entityId and note required" });
    }
    const allowed = ['order', 'rider'];
    if (!allowed.includes(String(entityType))) {
      return res.status(400).json({ message: "entityType must be order or rider" });
    }
    const eid = parseInt(String(entityId), 10);
    if (!Number.isFinite(eid) || eid < 1) {
      return res.status(400).json({ message: "entityId must be a positive integer" });
    }
    const authorId = req.user?.id || null;
    const text = String(note).trim();
    const result = await pool.query(
      `INSERT INTO internal_notes (entity_type, entity_id, note, author_id) VALUES ($1, $2, $3, $4) RETURNING id, entity_type, entity_id, note, created_at`,
      [entityType, eid, text, authorId]
    );
    const row = result.rows[0];
    await logAuditAction(req, 'NOTE_ADDED', entityType, eid, null, { noteId: row.id, snippet: text.slice(0, 100) });
    res.status(201).json({ note: { id: row.id, entity_type: row.entity_type, entity_id: row.entity_id, note: row.note, created_at: row.created_at, author_name: null } });
  } catch (err) {
    console.error("Internal notes add error:", err);
    res.status(500).json({ message: "حدث خطأ في إضافة الملاحظة" });
  }
});

// Ops action log only (UI-only actions record intent for audit)
app.post("/api/admin/ops-action", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { action, entityType, entityId, details } = req.body || {};
    const actionName = String(action || 'OPS_ACTION').slice(0, 80);
    await logAuditAction(req, actionName, entityType || null, entityId != null ? parseInt(String(entityId), 10) : null, null, details || {});
    res.json({ ok: true });
  } catch (err) {
    console.error("Ops action log error:", err);
    res.status(500).json({ message: "حدث خطأ في تسجيل الإجراء" });
  }
});

// Update dispatch settings
app.put("/api/admin/dispatch/settings", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const {
      mode,
      is_enabled,
      offer_timeout_seconds,
      max_couriers_per_offer,
      retry_enabled,
      max_retries,
      scoring_weights,
      fallback_behavior
    } = req.body;

    await pool.query(`
      INSERT INTO dispatch_settings (
        id, mode, is_enabled, offer_timeout_seconds, max_couriers_per_offer,
        retry_enabled, max_retries, scoring_weights, fallback_behavior, updated_at
      )
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        mode = EXCLUDED.mode,
        is_enabled = EXCLUDED.is_enabled,
        offer_timeout_seconds = EXCLUDED.offer_timeout_seconds,
        max_couriers_per_offer = EXCLUDED.max_couriers_per_offer,
        retry_enabled = EXCLUDED.retry_enabled,
        max_retries = EXCLUDED.max_retries,
        scoring_weights = EXCLUDED.scoring_weights,
        fallback_behavior = EXCLUDED.fallback_behavior,
        updated_at = NOW()
    `, [
      mode || 'AUTO_OFFER',
      is_enabled !== undefined ? is_enabled : true,
      offer_timeout_seconds || 30,
      max_couriers_per_offer || 5,
      retry_enabled !== undefined ? retry_enabled : true,
      max_retries || 3,
      JSON.stringify(scoring_weights || { distance_weight: 0.4, performance_weight: 0.3, fairness_weight: 0.3 }),
      fallback_behavior || 'notify_admin'
    ]);

    // Emit real-time update
    if (io) {
      io.to('admin-dashboard').emit('dispatch_settings_updated', {
        timestamp: new Date().toISOString()
      });
    }

    res.json({ message: "تم تحديث إعدادات التوزيع بنجاح" });
  } catch (err) {
    console.error("Update dispatch settings error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث إعدادات التوزيع" });
  }
});

// Get dispatch history for an order
app.get("/api/admin/orders/:orderId/dispatch-history", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        oda.*,
        d.id as courier_id,
        u.name as courier_name,
        d.phone as courier_phone
      FROM order_dispatch_attempts oda
      LEFT JOIN drivers d ON oda.courier_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE oda.order_id = $1
      ORDER BY oda.created_at ASC
    `, [orderId]);
    
    res.json({ attempts: result.rows });
  } catch (err) {
    console.error("Get dispatch history error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب تاريخ التوزيع" });
  }
});

// الحصول على جميع المستخدمين (لإدارة الموظفين)
app.get("/api/admin/users", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, email, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC;
    `
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب المستخدمين" });
  }
});

// إنشاء مستخدم جديد (موظف)
app.post("/api/admin/users", authMiddleware, async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({
        message: "قاعدة البيانات غير متاحة حالياً. تأكد من تشغيل قاعدة البيانات ثم أعد المحاولة.",
      });
    }
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "الاسم والبريد وكلمة المرور مطلوبة" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, is_active, created_at;
    `,
      [name, email, hash, role || 'staff']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }
    console.error("Create user error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء المستخدم" });
  }
});

// تحديث دور المستخدم
app.put("/api/admin/users/:userId/role", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    await pool.query("UPDATE users SET role = $1 WHERE id = $2;", [role, userId]);

    res.json({ message: "تم تحديث دور المستخدم" });
  } catch (err) {
    console.error("Update user role error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث دور المستخدم" });
  }
});

// تحديث حالة المستخدم (نشط/غير نشط)
app.put("/api/admin/users/:userId/status", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    await pool.query("UPDATE users SET is_active = $1 WHERE id = $2;", [is_active, userId]);

    res.json({ message: "تم تحديث حالة المستخدم" });
  } catch (err) {
    console.error("Update user status error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث حالة المستخدم" });
  }
});

// Get single user (for Users & Roles UI)
app.get("/api/admin/users/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      "SELECT id, name, email, role, is_active, created_at, force_password_change FROM users WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    const row = result.rows[0];
    res.json({ ...row, force_password_change: !!row.force_password_change });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب المستخدم" });
  }
});

// Reset user password (super_admin only). Sets temporary password + force_password_change. Self-reset blocked.
app.post("/api/admin/users/:id/reset-password", authMiddleware, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (!Number.isInteger(targetId)) {
      return res.status(400).json({ code: "INVALID_ID", message: "معرف المستخدم غير صالح." });
    }
    if (req.user.id === targetId) {
      return res.status(403).json({ code: "SELF_RESET_FORBIDDEN", message: "لا يمكن إعادة تعيين كلمة مرورك من هنا. استخدم تغيير كلمة المرور." });
    }
    if (!isDbConnected || !pool) {
      return res.status(503).json({ code: "DB_UNAVAILABLE", message: "قاعدة البيانات غير متاحة." });
    }
    const target = await pool.query("SELECT id, email, role FROM users WHERE id = $1", [targetId]);
    if (target.rows.length === 0) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    const tempPassword = crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 14);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await pool.query(
      "UPDATE users SET password_hash = $1, force_password_change = true, updated_at = NOW() WHERE id = $2",
      [passwordHash, targetId]
    );
    res.json({ success: true, message: "تم تعيين كلمة مرور مؤقتة وإجبار تغييرها عند الدخول التالي." });
  } catch (err) {
    if (err.message && err.message.includes('role')) {
      return res.status(403).json({ code: "FORBIDDEN", message: "صلاحية super_admin مطلوبة." });
    }
    console.error("Reset password error:", err);
    res.status(500).json({ message: "حدث خطأ في إعادة تعيين كلمة المرور." });
  }
});

// Get role templates (for dropdown and permission keys); fallback to static when DB unavailable
app.get("/api/admin/role-templates", authMiddleware, async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query(
        "SELECT role, permissions, description_ar, description_en FROM role_permissions ORDER BY role"
      );
      if (result.rows.length > 0) {
        const templates = result.rows.map((r) => ({
          role: r.role,
          permissions: r.permissions && typeof r.permissions === "object" ? r.permissions : {},
          description_ar: r.description_ar || r.role,
          description_en: r.description_en || r.role,
        }));
        return res.json({ templates });
      }
    }
    res.json({ templates: STATIC_ROLE_TEMPLATES });
  } catch (err) {
    console.error("Get role templates error:", err);
    res.json({ templates: STATIC_ROLE_TEMPLATES });
  }
});

// Combined update user: role, active, permissions (backward compatible with existing endpoints)
app.put("/api/admin/users/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, active, permissions } = req.body;

    if (role !== undefined && role !== null) {
      await pool.query("UPDATE users SET role = $1 WHERE id = $2;", [role, userId]);
    }
    if (active !== undefined) {
      const isActive = active === true || active === "true";
      await pool.query("UPDATE users SET is_active = $1 WHERE id = $2;", [isActive, userId]);
    }
    if (permissions !== undefined && Array.isArray(permissions)) {
      await pool.query("DELETE FROM user_permissions WHERE user_id = $1;", [userId]);
      for (const key of permissions) {
        if (typeof key === "string" && key.trim()) {
          await pool.query(
            "INSERT INTO user_permissions (user_id, permission_key, granted) VALUES ($1, $2, true) ON CONFLICT (user_id, permission_key) DO UPDATE SET granted = true;",
            [userId, key.trim()]
          );
        }
      }
    } else if (permissions !== undefined && permissions !== null && !Array.isArray(permissions)) {
      // object form: { key: true/false }
      await pool.query("DELETE FROM user_permissions WHERE user_id = $1;", [userId]);
      const obj = typeof permissions === "object" ? permissions : {};
      for (const [key, granted] of Object.entries(obj)) {
        if (typeof key === "string" && key.trim()) {
          await pool.query(
            "INSERT INTO user_permissions (user_id, permission_key, granted) VALUES ($1, $2, $3) ON CONFLICT (user_id, permission_key) DO UPDATE SET granted = $4;",
            [userId, key.trim(), granted === true, granted === true]
          );
        }
      }
    }

    const userResult = await pool.query(
      "SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    await logAuditAction(req, "UPDATE_USER", "user", parseInt(userId, 10), null, { role, active, permissions: permissions !== undefined });
    res.json(userResult.rows[0]);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث المستخدم" });
  }
});

// الحصول على جميع الطلبات (للأدمن)
app.get("/api/admin/orders", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        o.*,
        u.name as customer_name,
        u.email as customer_email,
        d.user_id as driver_user_id,
        du.name as driver_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN drivers d ON o.driver_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      ORDER BY o.created_at DESC;
    `
    );
    res.json({ orders: result.rows });
  } catch (err) {
    console.error("Get admin orders error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الطلبات" });
  }
});

// تحديث حالة الطلب (للأدمن)
// ================= Smart Dispatcher: Auto-Assign with 30s Timeout =================
// محرك التوزيع الذكي: تخصيص تلقائي مع timeout 30 ثانية
// ================= Automated Order Dispatch Engine =================
// Get dispatch settings
async function getDispatchSettings() {
  try {
    const result = await pool.query('SELECT * FROM dispatch_settings WHERE id = 1');
    if (result.rows.length === 0) {
      // Return default settings
      return {
        mode: 'AUTO_OFFER',
        is_enabled: true,
        offer_timeout_seconds: 30,
        max_couriers_per_offer: 5,
        retry_enabled: true,
        max_retries: 3,
        scoring_weights: { distance_weight: 0.4, performance_weight: 0.3, fairness_weight: 0.3 },
        fallback_behavior: 'notify_admin'
      };
    }
    return result.rows[0];
  } catch (err) {
    console.error('Error getting dispatch settings:', err);
    return null;
  }
}

// Get eligible couriers for an order
async function getEligibleCouriers(storeLat, storeLon, maxCount = 5, excludeIds = []) {
  try {
    const excludeClause = excludeIds.length > 0 
      ? `AND d.id NOT IN (${excludeIds.map((_, i) => `$${i + 5}`).join(', ')})`
      : '';
    
    const params = [storeLat, storeLon, maxCount, ...excludeIds];
    
    const result = await pool.query(`
      SELECT 
        d.id,
        d.user_id,
        u.name as courier_name,
        d.phone,
        d.vehicle_type,
        COALESCE(d.current_latitude, $1) as current_latitude,
        COALESCE(d.current_longitude, $2) as current_longitude,
        calculate_distance($1, $2, COALESCE(d.current_latitude, $1), COALESCE(d.current_longitude, $2)) as distance,
        COALESCE(cs.performance_score, 100.0) as performance_score,
        COALESCE(cs.completed_orders, 0) as completed_orders,
        COALESCE(cs.last_assigned_at, '1970-01-01'::timestamp) as last_assigned_at
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN courier_stats cs ON d.id = cs.courier_id
      WHERE d.is_active = true
        AND d.is_approved = true
        AND d.is_banned = false
        AND u.is_active = true
        AND COALESCE(d.rider_status, 'offline') = 'available'
        AND (d.last_seen > NOW() - INTERVAL '120 seconds' OR d.last_location_update > NOW() - INTERVAL '120 seconds')
        AND d.id NOT IN (
          SELECT DISTINCT driver_id 
          FROM orders 
          WHERE driver_id IS NOT NULL 
          AND status IN ('ASSIGNED', 'PICKED_UP')
        )
        ${excludeClause}
      ORDER BY distance ASC
      LIMIT $3;
    `, params);
    
    return result.rows;
  } catch (err) {
    console.error('Error getting eligible couriers:', err);
    return [];
  }
}

// Calculate courier score for AUTO_ASSIGN mode
function calculateCourierScore(courier, weights, allCouriers) {
  const { distance_weight, performance_weight, fairness_weight } = weights;
  
  // Normalize distance (lower is better, so invert)
  const maxDistance = Math.max(...allCouriers.map(c => parseFloat(c.distance) || 999));
  const normalizedDistance = maxDistance > 0 ? 1 - (parseFloat(courier.distance) || 999) / maxDistance : 1;
  
  // Normalize performance score (0-100 scale, higher is better)
  const normalizedPerformance = (parseFloat(courier.performance_score) || 100) / 100;
  
  // Calculate fairness (time since last assignment, higher is better)
  const lastAssigned = new Date(courier.last_assigned_at || '1970-01-01');
  const hoursSinceAssignment = (Date.now() - lastAssigned.getTime()) / (1000 * 60 * 60);
  const normalizedFairness = Math.min(hoursSinceAssignment / 24, 1); // Cap at 24 hours
  
  // Weighted score
  const score = 
    (normalizedDistance * distance_weight) +
    (normalizedPerformance * performance_weight) +
    (normalizedFairness * fairness_weight);
  
  return score;
}

// AUTO_OFFER Mode: Send offers to multiple couriers
async function dispatchOrderAutoOffer(orderId, storeId, attemptNumber = 1) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get dispatch settings
    const settings = await getDispatchSettings();
    if (!settings || !settings.is_enabled) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Dispatch disabled' };
    }
    
    // Get order and store info
    const orderResult = await client.query(`
      SELECT o.id, o.status, o.delivery_address, o.delivery_latitude, o.delivery_longitude,
             s.latitude as store_lat, s.longitude as store_lon
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.id = $1
    `, [orderId]);
    
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Order not found' };
    }
    
    const order = orderResult.rows[0];
    
    // MVP: Check if already assigned (only READY orders can be assigned)
    if (order.status !== 'READY') {
      await client.query('ROLLBACK');
      return { success: false, reason: `Order status must be READY. Current: ${order.status}` };
    }
    
    // Get store location
    if (!order.store_lat || !order.store_lon) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Store location not found' };
    }
    
    // Get eligible couriers
    const couriers = await getEligibleCouriers(
      order.store_lat,
      order.store_lon,
      settings.max_couriers_per_offer,
      []
    );
    
    if (couriers.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'No eligible couriers', shouldRetry: settings.retry_enabled && attemptNumber < settings.max_retries };
    }
    
    // Create offers for all eligible couriers
    const expiresAt = new Date(Date.now() + settings.offer_timeout_seconds * 1000);
    const offers = [];
    
    for (const courier of couriers) {
      const attemptResult = await client.query(`
        INSERT INTO order_dispatch_attempts (order_id, courier_id, attempt_number, status, expires_at)
        VALUES ($1, $2, $3, 'OFFERED', $4)
        RETURNING id
      `, [orderId, courier.id, attemptNumber, expiresAt]);
      
      offers.push({
        courier_id: courier.id,
        courier_name: courier.courier_name,
        attempt_id: attemptResult.rows[0].id
      });
      
      // Send real-time offer to courier
      if (io) {
        io.to(`rider-${courier.id}`).emit('order_offer', {
          order_id: orderId,
          attempt_id: attemptResult.rows[0].id,
          delivery_address: order.delivery_address,
          distance: parseFloat(courier.distance),
          expires_at: expiresAt.toISOString(),
          timeout_seconds: settings.offer_timeout_seconds,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Log dispatch event
    if (io) {
      io.to('admin-dashboard').emit('dispatch_event', {
        type: 'offers_sent',
        order_id: orderId,
        couriers_count: offers.length,
        attempt_number: attemptNumber,
        timestamp: new Date().toISOString()
      });
    }
    
    await client.query('COMMIT');
    
    // Schedule timeout check
    setTimeout(async () => {
      await checkOfferTimeout(orderId, attemptNumber);
    }, settings.offer_timeout_seconds * 1000);
    
    return { 
      success: true, 
      offers: offers,
      expires_at: expiresAt.toISOString()
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in AUTO_OFFER dispatch:', err);
    return { success: false, reason: err.message };
  } finally {
    client.release();
  }
}

// AUTO_ASSIGN Mode: Assign to best courier
async function dispatchOrderAutoAssign(orderId, storeId, attemptNumber = 1) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get dispatch settings
    const settings = await getDispatchSettings();
    if (!settings || !settings.is_enabled) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Dispatch disabled' };
    }
    
    // Get order and store info
    const orderResult = await client.query(`
      SELECT o.id, o.status, o.delivery_address,
             s.latitude as store_lat, s.longitude as store_lon
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.id = $1
    `, [orderId]);
    
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Order not found' };
    }
    
    const order = orderResult.rows[0];
    
    // MVP: Check if already assigned (only READY orders can be assigned)
    if (order.status !== 'READY') {
      await client.query('ROLLBACK');
      return { success: false, reason: `Order status must be READY. Current: ${order.status}` };
    }
    
    if (!order.store_lat || !order.store_lon) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'Store location not found' };
    }
    
    // Get eligible couriers
    const couriers = await getEligibleCouriers(
      order.store_lat,
      order.store_lon,
      20, // Get more candidates for scoring
      []
    );
    
    if (couriers.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'No eligible couriers', shouldRetry: settings.retry_enabled && attemptNumber < settings.max_retries };
    }
    
    // Score and rank couriers
    const scoredCouriers = couriers.map(c => ({
      ...c,
      score: calculateCourierScore(c, settings.scoring_weights, couriers)
    })).sort((a, b) => b.score - a.score);
    
    const bestCourier = scoredCouriers[0];
    
    // Create assignment attempt
    const expiresAt = new Date(Date.now() + settings.offer_timeout_seconds * 1000);
    const attemptResult = await client.query(`
      INSERT INTO order_dispatch_attempts (order_id, courier_id, attempt_number, status, expires_at)
      VALUES ($1, $2, $3, 'OFFERED', $4)
      RETURNING id
    `, [orderId, bestCourier.id, attemptNumber, expiresAt]);
    
    // Assign order (with lock to prevent double assignment)
    const updateResult = await client.query(`
      UPDATE orders 
      SET driver_id = $1, 
          status = $4,
          driver_notification_sent_at = NOW(),
          driver_notification_expires_at = $2,
          updated_at = NOW()
      WHERE id = $3 
        AND status = 'READY'
        AND driver_id IS NULL
      RETURNING id
    `, [bestCourier.id, expiresAt, orderId, MVP_STATUSES.ASSIGNED]);
    
    if (updateResult.rows.length === 0) {
      // Order was already assigned
      await client.query('ROLLBACK');
      return { success: false, reason: 'Order already assigned' };
    }
    
    // Send real-time assignment to courier
    if (io) {
      io.to(`rider-${bestCourier.id}`).emit('order_assigned', {
        order_id: orderId,
        attempt_id: attemptResult.rows[0].id,
        delivery_address: order.delivery_address,
        distance: parseFloat(bestCourier.distance),
        expires_at: expiresAt.toISOString(),
        timeout_seconds: settings.offer_timeout_seconds,
        requires_acceptance: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log dispatch event
    if (io) {
      io.to('admin-dashboard').emit('dispatch_event', {
        type: 'order_assigned',
        order_id: orderId,
        courier_id: bestCourier.id,
        courier_name: bestCourier.courier_name,
        score: bestCourier.score,
        attempt_number: attemptNumber,
        timestamp: new Date().toISOString()
      });
    }
    
    await client.query('COMMIT');
    
    // Schedule timeout check
    setTimeout(async () => {
      await checkAssignmentTimeout(orderId, bestCourier.id, attemptNumber);
    }, settings.offer_timeout_seconds * 1000);
    
    return { 
      success: true, 
      courier_id: bestCourier.id,
      courier_name: bestCourier.courier_name,
      score: bestCourier.score,
      expires_at: expiresAt.toISOString()
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in AUTO_ASSIGN dispatch:', err);
    return { success: false, reason: err.message };
  } finally {
    client.release();
  }
}

// Check offer timeout (AUTO_OFFER mode)
async function checkOfferTimeout(orderId, attemptNumber) {
  try {
    const orderResult = await pool.query('SELECT id, status, driver_id FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) return;
    
    const order = orderResult.rows[0];
    
    // MVP: If order is still READY and no driver assigned
    if (order.status === 'READY' && !order.driver_id) {
      // Mark all pending offers as TIMEOUT
      await pool.query(`
        UPDATE order_dispatch_attempts 
        SET status = 'TIMEOUT', responded_at = NOW()
        WHERE order_id = $1 
          AND attempt_number = $2 
          AND status = 'OFFERED'
          AND expires_at < NOW()
      `, [orderId, attemptNumber]);
      
      // Get settings and retry if enabled
      const settings = await getDispatchSettings();
      if (settings && settings.retry_enabled && attemptNumber < settings.max_retries) {
        console.log(`⏰ Offer timeout for order ${orderId}, retrying...`);
        if (settings.mode === 'AUTO_OFFER') {
          await dispatchOrderAutoOffer(orderId, null, attemptNumber + 1);
        } else {
          await dispatchOrderAutoAssign(orderId, null, attemptNumber + 1);
        }
      } else {
        // Fallback behavior
        if (settings && settings.fallback_behavior === 'notify_admin' && io) {
          io.to('admin-dashboard').emit('dispatch_failed', {
            order_id: orderId,
            reason: 'All offers timed out',
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  } catch (err) {
    console.error('Error checking offer timeout:', err);
  }
}

// Check assignment timeout (AUTO_ASSIGN mode)
async function checkAssignmentTimeout(orderId, courierId, attemptNumber) {
  try {
    const orderResult = await pool.query('SELECT id, status, driver_id FROM orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) return;
    
    const order = orderResult.rows[0];
    
    // If order is still pending and driver hasn't accepted
    if (order.status === 'READY' && order.driver_id === courierId) {
      // Mark attempt as TIMEOUT
      await pool.query(`
        UPDATE order_dispatch_attempts 
        SET status = 'TIMEOUT', responded_at = NOW()
        WHERE order_id = $1 
          AND courier_id = $2
          AND attempt_number = $3
          AND status = 'OFFERED'
      `, [orderId, courierId, attemptNumber]);
      
      // Unassign and retry
      await pool.query('UPDATE orders SET driver_id = NULL WHERE id = $1', [orderId]);
      
      const settings = await getDispatchSettings();
      if (settings && settings.retry_enabled && attemptNumber < settings.max_retries) {
        console.log(`⏰ Assignment timeout for order ${orderId}, retrying...`);
        await dispatchOrderAutoAssign(orderId, null, attemptNumber + 1);
      }
    }
  } catch (err) {
    console.error('Error checking assignment timeout:', err);
  }
}

// Main dispatch function (called when order is created)
async function dispatchOrder(orderId, storeId) {
  try {
    const settings = await getDispatchSettings();
    
    if (!settings || !settings.is_enabled) {
      console.log('Dispatch system is disabled');
      return { success: false, reason: 'Dispatch disabled' };
    }
    
    if (settings.mode === 'AUTO_OFFER') {
      return await dispatchOrderAutoOffer(orderId, storeId, 1);
    } else if (settings.mode === 'AUTO_ASSIGN') {
      return await dispatchOrderAutoAssign(orderId, storeId, 1);
    }
    
    return { success: false, reason: 'Invalid dispatch mode' };
  } catch (err) {
    console.error('Error in dispatchOrder:', err);
    return { success: false, reason: err.message };
  }
}

async function assignBestRider(orderId, storeId, excludeRiderId = null) {
  const startTime = Date.now(); // بدء قياس الوقت
  try {
    // جلب موقع المتجر
    const storeResult = await pool.query(
      `SELECT latitude, longitude FROM stores WHERE id = $1`,
      [storeId]
    );
    
    if (storeResult.rows.length === 0) return null;
    
    const store = storeResult.rows[0];
    
    // بناء query مع استثناء Rider محدد (لإعادة التخصيص بعد timeout)
    let excludeClause = '';
    const params = [store.latitude, store.longitude];
    
    if (excludeRiderId) {
      params.push(excludeRiderId);
      excludeClause = `AND d.id != $${params.length}`;
    }
    
    // جلب Rider الأقرب المتاح (Quick Commerce: فقط المتاحين)
    const riderResult = await pool.query(`
      SELECT 
        d.id,
        d.user_id,
        u.name as rider_name,
        (6371 * acos(
          cos(radians($1)) * cos(radians(COALESCE(d.current_latitude, $1))) *
          cos(radians(COALESCE(d.current_longitude, $2)) - radians($2)) +
          sin(radians($1)) * sin(radians(COALESCE(d.current_latitude, $1)))
        )) as distance
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE d.is_active = true
        AND u.is_active = true
        AND COALESCE(d.rider_status, 'offline') = 'available'
        AND d.id NOT IN (
          SELECT DISTINCT driver_id 
          FROM orders 
          WHERE driver_id IS NOT NULL 
          AND status IN ('ASSIGNED', 'PICKED_UP')
        )
        ${excludeClause}
      ORDER BY distance ASC
      LIMIT 1;
    `, params);
    
    if (riderResult.rows.length === 0) return null;
    
    const rider = riderResult.rows[0];
    
    // تعيين Rider للطلب مع timeout 30 ثانية
    const expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds from now
    
    await pool.query(
      `UPDATE orders 
       SET driver_id = $1, 
           driver_notification_sent_at = NOW(),
           driver_notification_expires_at = $2
       WHERE id = $3`,
      [rider.id, expiresAt, orderId]
    );
    
    // تحديث حالة Rider إلى "busy" مؤقتاً (سيتم إعادة تعيينها إذا لم يقبل)
    // لا نحدثها الآن، ننتظر قبول Rider
    
    // إرسال إشعار Socket.IO لـ Rider مع timeout
    if (io) {
      io.to(`driver-${rider.id}`).emit('new_order_notification', {
        order_id: orderId,
        distance: parseFloat(rider.distance),
        expires_at: expiresAt.toISOString(),
        timeout_seconds: 30,
        timestamp: new Date().toISOString()
      });
    }
    
    // جدولة فحص timeout بعد 30 ثانية
    setTimeout(async () => {
      const orderCheck = await pool.query(
        `SELECT id, driver_id, status FROM orders WHERE id = $1`,
        [orderId]
      );
      
      if (orderCheck.rows.length > 0) {
        const order = orderCheck.rows[0];
        // إذا لم يقبل Rider (لا يزال driver_id هو نفسه لكن status لم يتغير)
        if (order.driver_id === rider.id && order.status === 'READY') {
          console.log(`⏰ Timeout: Rider ${rider.id} لم يقبل الطلب ${orderId}، إعادة التخصيص...`);
          
          // إعادة تعيين Rider آخر
          const nextRider = await assignBestRider(orderId, storeId, rider.id);
          if (nextRider) {
            console.log(`✅ تم إعادة تعيين Rider ${nextRider.rider_id} للطلب ${orderId}`);
          } else {
            console.log(`⚠️ لا يوجد Riders متاحين للطلب ${orderId}`);
          }
        }
      }
    }, 30000); // 30 seconds
    
    const assigningTime = Date.now() - startTime; // حساب الوقت المستغرق
    console.log(`⏱️ [ASSIGNING TIME] Order #${orderId} assigned to Rider #${rider.id} (${rider.rider_name}) in ${assigningTime}ms | Distance: ${parseFloat(rider.distance).toFixed(2)}km`);
    
    return {
      rider_id: rider.id,
      driver_id: rider.id, // Backward compatibility
      rider_name: rider.rider_name,
      driver_name: rider.rider_name, // Backward compatibility
      distance: parseFloat(rider.distance),
      expires_at: expiresAt.toISOString(),
      assigning_time_ms: assigningTime // إضافة وقت التعيين للاستجابة
    };
  } catch (err) {
    const assigningTime = Date.now() - startTime;
    console.error(`❌ [ASSIGNING TIME] Auto assign rider error for Order #${orderId} after ${assigningTime}ms:`, err);
    return null;
  }
}

// Backward compatibility: keep assignBestDriver
async function assignBestDriver(orderId, storeId) {
  return await assignBestRider(orderId, storeId);
}

// ================= Set Fixed Commission for Order =================
// تعيين عمولة ثابتة للطلب
app.put("/api/admin/orders/:orderId/commission", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { fixed_commission } = req.body;
    
    if (!fixed_commission || parseFloat(fixed_commission) < 0) {
      return res.status(400).json({ message: "يجب تحديد مبلغ العمولة (يجب أن يكون أكبر من أو يساوي 0)" });
    }
    
    const commissionAmount = parseFloat(fixed_commission);
    
    // تحديث العمولة الثابتة للطلب
    await pool.query(`
      UPDATE orders 
      SET fixed_commission = $1
      WHERE id = $2;
    `, [commissionAmount, orderId]);
    
    await logAuditAction(req, 'SET_ORDER_COMMISSION', 'order', orderId, null, { fixed_commission: commissionAmount });
    
    res.json({ 
      message: "تم تعيين العمولة الثابتة بنجاح",
      fixed_commission: commissionAmount
    });
  } catch (err) {
    console.error("Set fixed commission error:", err);
    res.status(500).json({ message: "حدث خطأ في تعيين العمولة" });
  }
});

// ================= Automation Statistics Endpoint =================
// إحصائيات الأتمتة
app.get("/api/admin/automation/stats", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    // Get total auto assignments
    const totalResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM orders
      WHERE driver_id IS NOT NULL
        AND driver_notification_sent_at IS NOT NULL
    `);
    
    // Get today's auto assignments
    const todayResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM orders
      WHERE driver_id IS NOT NULL
        AND driver_notification_sent_at IS NOT NULL
        AND DATE(driver_notification_sent_at) = CURRENT_DATE
    `);
    
    // Get average assignment time (placeholder - would need assignment_logs table for accurate calculation)
    const avgTimeResult = await pool.query(`
      SELECT AVG(
        EXTRACT(EPOCH FROM (driver_notification_sent_at - created_at))
      )::numeric AS avg_seconds
      FROM orders
      WHERE driver_id IS NOT NULL
        AND driver_notification_sent_at IS NOT NULL
        AND driver_notification_sent_at > created_at
    `);
    
    // Calculate success rate (orders with driver vs total orders)
    const successRateResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 AS rate
      FROM orders
      WHERE status != 'cancelled'
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    res.json({
      total_auto_assignments: totalResult.rows[0]?.count || 0,
      today_auto_assignments: todayResult.rows[0]?.count || 0,
      average_assignment_time: parseFloat(avgTimeResult.rows[0]?.avg_seconds || 0),
      success_rate: parseFloat(successRateResult.rows[0]?.rate || 0),
    });
  } catch (err) {
    console.error("Get automation stats error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إحصائيات الأتمتة" });
  }
});

// Rule-based ops alerts (read-only, no logic change)
app.get("/api/admin/alerts", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const alerts = [];
    const slaMinutes = 30;
    const unassignedMinutes = 10;
    const minRidersOnline = 2;

    const slaCutoff = new Date(Date.now() - slaMinutes * 60 * 1000);
    const unassignedCutoff = new Date(Date.now() - unassignedMinutes * 60 * 1000);

    const slaExceededRes = await pool.query(
      `SELECT id FROM orders WHERE status NOT IN ('DELIVERED', 'CANCELLED') AND COALESCE(payment_received_at, paid_at, created_at) < $1 LIMIT 20`,
      [slaCutoff]
    ).catch(() => ({ rows: [] }));
    for (const row of slaExceededRes.rows) {
      alerts.push({
        id: `sla_order_${row.id}`,
        type: 'sla_exceeded',
        severity: 'high',
        message_ar: `الطلب #${row.id} تجاوز SLA (${slaMinutes} د)`,
        message_en: `Order #${row.id} exceeded SLA (${slaMinutes}m)`,
        meta: { order_id: row.id, limit_minutes: slaMinutes },
      });
    }

    const unassignedRes = await pool.query(
      `SELECT id, created_at FROM orders WHERE driver_id IS NULL AND status NOT IN ('DELIVERED', 'CANCELLED') AND created_at < $1 ORDER BY created_at ASC LIMIT 20`,
      [unassignedCutoff]
    );
    for (const row of unassignedRes.rows) {
      const ageMin = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60000);
      alerts.push({
        id: `unassigned_${row.id}`,
        type: 'unassigned_long',
        severity: 'medium',
        message_ar: `الطلب #${row.id} غير معين منذ ${ageMin} د`,
        message_en: `Order #${row.id} unassigned for ${ageMin}m`,
        meta: { order_id: row.id, minutes: ageMin },
      });
    }

    const ridersRes = await pool.query(
      `SELECT COUNT(*)::int AS online FROM drivers WHERE last_seen > NOW() - INTERVAL '5 minutes'`
    ).catch(() => ({ rows: [{ online: 0 }] }));
    const onlineCount = ridersRes.rows[0]?.online ?? 0;
    if (onlineCount < minRidersOnline) {
      alerts.push({
        id: 'low_riders_online',
        type: 'low_riders',
        severity: 'medium',
        message_ar: `عدد Riders المتصلين منخفض: ${onlineCount}`,
        message_en: `Low riders online: ${onlineCount}`,
        meta: { count: onlineCount, threshold: minRidersOnline },
      });
    }

    res.json({ alerts });
  } catch (err) {
    console.error("Get alerts error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب التنبيهات", alerts: [] });
  }
});

// ================= Auto-Assign on Payment (Smart Dispatcher) =================
// التخصيص التلقائي عند الدفع - محرك التوزيع الذكي
app.post("/api/orders/:orderId/auto-assign", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // جلب معلومات الطلب
    const orderResult = await pool.query(`
      SELECT o.id, o.status, o.payment_method, osa.store_id
      FROM orders o
      LEFT JOIN order_store_assignments osa ON o.id = osa.order_id
      WHERE o.id = $1
      LIMIT 1;
    `, [orderId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }
    
    const order = orderResult.rows[0];
    
    // التحقق من أن الطلب مدفوع
    if (order.payment_method !== 'online' && order.payment_method !== 'card') {
      return res.status(400).json({ message: "الطلب غير مدفوع" });
    }
    
    // التحقق من أن الطلب لم يتم تعيين Rider له
    if (order.status !== 'READY' && order.status !== 'ASSIGNED') {
      return res.status(400).json({ message: "الطلب تم تعيين Rider له بالفعل" });
    }
    
    // جلب store_id
    const storeId = order.store_id;
    if (!storeId) {
      return res.status(400).json({ message: "الطلب غير مرتبط بمتجر" });
    }
    
    // التخصيص التلقائي
    const assignment = await assignBestRider(orderId, storeId);
    
    if (!assignment) {
      return res.status(404).json({ message: "لا يوجد Riders متاحين" });
    }
    
    // تحديث حالة الطلب إلى "confirmed"
    await pool.query(
      `UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1`,
      [orderId, MVP_STATUSES.ASSIGNED]
    );
    
    // إرسال إشعار للمخزن للتحضير
    if (io) {
      io.to(`store-${storeId}`).emit('new_order_for_store', {
        order_id: orderId,
        rider_name: assignment.rider_name,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: "تم التخصيص التلقائي بنجاح",
      assignment: assignment
    });
  } catch (err) {
    console.error("Auto-assign on payment error:", err);
    res.status(500).json({ message: "حدث خطأ في التخصيص التلقائي" });
  }
});

// إضافة current_latitude و current_longitude لـ Riders إذا لم تكن موجودة
app.post("/api/admin/drivers/init-location", authMiddleware, async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE drivers 
      ADD COLUMN IF NOT EXISTS current_latitude NUMERIC(10,8),
      ADD COLUMN IF NOT EXISTS current_longitude NUMERIC(10,8),
      ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP;
    `);
    res.json({ message: "تم تهيئة حقول الموقع" });
  } catch (err) {
    console.error("Init driver location error:", err);
    res.status(500).json({ message: "حدث خطأ" });
  }
});

// تحديث موقع Rider
app.put("/api/drivers/:driverId/location", authMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { latitude, longitude } = req.body;
    
    await pool.query(`
      UPDATE drivers 
      SET current_latitude = $1, 
          current_longitude = $2,
          last_location_update = NOW()
      WHERE id = $3;
    `, [latitude, longitude, driverId]);
    
    res.json({ message: "تم تحديث الموقع" });
  } catch (err) {
    console.error("Update driver location error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الموقع" });
  }
});

// جلب موقع Riders النشطين
app.get("/api/admin/drivers/locations", authMiddleware, async (req, res) => {
  try {
    console.log("📍 Fetching driver locations...");
    const result = await pool.query(`
      SELECT 
        d.id,
        u.name as driver_name,
        d.current_latitude as latitude,
        d.current_longitude as longitude,
        d.last_location_update,
        d.last_seen,
        COUNT(o.id) as active_orders
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN orders o ON d.id = o.driver_id 
        AND o.status IN ('ASSIGNED', 'PICKED_UP')
      WHERE d.is_active = true 
        AND u.is_active = true
        AND d.current_latitude IS NOT NULL
        AND d.current_longitude IS NOT NULL
      GROUP BY d.id, u.name, d.current_latitude, d.current_longitude, d.last_location_update, d.last_seen;
    `);
    console.log(`✅ Found ${result.rows.length} drivers with locations.`);
    res.json({ drivers: result.rows });
  } catch (err) {
    console.error("❌ Get driver locations error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب مواقع Riders" });
  }
});

// جلب الطلبات النشطة مع مواقعها
app.get("/api/admin/orders/active", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.status,
        o.delivery_latitude,
        o.delivery_longitude,
        o.delivery_address,
        osa.store_id,
        s.name as store_name,
        s.latitude as store_latitude,
        s.longitude as store_longitude,
        d.id as driver_id,
        u.name as driver_name,
        d.current_latitude as driver_latitude,
        d.current_longitude as driver_longitude
      FROM orders o
      LEFT JOIN order_store_assignments osa ON o.id = osa.order_id
      LEFT JOIN stores s ON osa.store_id = s.id
      LEFT JOIN drivers d ON o.driver_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE o.status IN ('ASSIGNED', 'PICKED_UP')
      ORDER BY o.created_at DESC;
    `);
    res.json({ orders: result.rows });
  } catch (err) {
    console.error("Get active orders error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الطلبات النشطة" });
  }
});

// Get Orders Statistics for Dashboard
app.get("/api/admin/orders/stats", authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Total orders
    const totalResult = await pool.query(`SELECT COUNT(*) as count FROM orders;`);
    const total = parseInt(totalResult.rows[0].count) || 0;
    
    // Today's orders
    const todayResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE created_at >= $1;
    `, [today]);
    const todayCount = parseInt(todayResult.rows[0].count) || 0;
    
    // Pending orders
    const pendingResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status IN ('CREATED', 'READY', 'ASSIGNED');
    `);
    const pending = parseInt(pendingResult.rows[0].count) || 0;
    
    // Total revenue
    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(final_total), 0) as revenue 
      FROM orders 
      WHERE status != 'cancelled';
    `);
    const revenue = parseFloat(revenueResult.rows[0].revenue) || 0;
    
    // Today's revenue
    const todayRevenueResult = await pool.query(`
      SELECT COALESCE(SUM(final_total), 0) as revenue 
      FROM orders 
      WHERE created_at >= $1 AND status != 'cancelled';
    `, [today]);
    const todayRevenue = parseFloat(todayRevenueResult.rows[0].revenue) || 0;
    
    res.json({
      total,
      today: todayCount,
      pending,
      revenue,
      today_revenue: todayRevenue
    });
  } catch (err) {
    console.error("Get orders stats error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إحصائيات الطلبات" });
  }
});

// ================= Admin Ops Digest (Read-only) =================
// Safe rule-based digest for operations (no DB writes, no status changes)
app.get("/api/admin/ops-digest", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const now = new Date();

    // Simulation mode: if DB is unavailable, return safe zeros (still read-only).
    if (!isDbConnected) {
      return res.json({
        ts: now.toISOString(),
        kpis: {
          ordersToday: 0,
          ordersLastHour: 0,
          avgOrderValueToday: null,
          avgPrepTimeMin: null,
          readyWithoutDriverCount: 0,
          cancelledTodayCount: 0,
          activeDriversCount: null,
        },
        alerts: [],
        recommendations: [
          {
            id: 'sim_notice',
            title: 'تشغيل محلي بدون قاعدة بيانات',
            steps: [
              'قاعدة البيانات غير متصلة محليًا، لذلك يتم عرض قيم افتراضية.',
              'للحصول على أرقام حقيقية: شغّل PostgreSQL محليًا ثم أعد تشغيل الباك-إند.',
            ],
          },
        ],
        is_simulation: true,
      });
    }

    const ordersTodayQ = pool.query(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE created_at >= date_trunc('day', NOW())`
    );

    const ordersLastHourQ = pool.query(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE created_at >= NOW() - INTERVAL '1 hour'`
    );

    const avgOrderValueTodayQ = pool.query(
      `SELECT AVG(COALESCE(final_total, total_amount, 0))::float AS avg
       FROM orders
       WHERE created_at >= date_trunc('day', NOW())`
    );

    const readyWithoutDriverQ = pool.query(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE created_at >= date_trunc('day', NOW())
         AND (UPPER(COALESCE(status, '')) = 'READY' OR LOWER(COALESCE(status, '')) = 'ready')
         AND driver_id IS NULL`
    );

    const cancelledTodayQ = pool.query(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE created_at >= date_trunc('day', NOW())
         AND (UPPER(COALESCE(status, '')) = 'CANCELLED' OR LOWER(COALESCE(status, '')) = 'cancelled')`
    );

    const avg7dSameHourQ = pool.query(
      `WITH per_day AS (
         SELECT date_trunc('day', created_at) AS d, COUNT(*)::int AS cnt
         FROM orders
         WHERE created_at >= date_trunc('day', NOW()) - INTERVAL '7 day'
           AND created_at < date_trunc('day', NOW())
           AND EXTRACT(HOUR FROM created_at) = EXTRACT(HOUR FROM NOW())
         GROUP BY 1
       )
       SELECT COALESCE(AVG(cnt)::float, 0) AS avg`
    );

    // Optional KPI: avg prep time (ACCEPTED -> READY) from order_status_history
    const avgPrepTimeQ = (async () => {
      try {
        const r = await pool.query(
          `WITH per_order AS (
             SELECT
               order_id,
               MIN(created_at) FILTER (WHERE new_status = 'ACCEPTED') AS accepted_at,
               MIN(created_at) FILTER (WHERE new_status = 'READY') AS ready_at
             FROM order_status_history
             WHERE created_at >= date_trunc('day', NOW())
             GROUP BY order_id
           )
           SELECT AVG(EXTRACT(EPOCH FROM (ready_at - accepted_at)) / 60.0)::float AS avg_min
           FROM per_order
           WHERE accepted_at IS NOT NULL AND ready_at IS NOT NULL AND ready_at >= accepted_at`
        );
        const v = r.rows?.[0]?.avg_min;
        return typeof v === 'number' ? v : null;
      } catch (e) {
        return null;
      }
    })();

    // Optional KPI: active drivers count (best-effort, read-only)
    const activeDriversQ = (async () => {
      // Try the most informative query first (rider_status / status)
      try {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS count
           FROM drivers d
           JOIN users u ON d.user_id = u.id
           WHERE COALESCE(d.is_active, true) = true
             AND COALESCE(u.is_active, true) = true
             AND (
               d.rider_status IN ('available', 'busy')
               OR d.status IN ('online', 'active')
             )`
        );
        return r.rows?.[0]?.count ?? null;
      } catch (e1) {
        // Fallback: active drivers only
        try {
          const r2 = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM drivers d
             JOIN users u ON d.user_id = u.id
             WHERE COALESCE(d.is_active, true) = true
               AND COALESCE(u.is_active, true) = true`
          );
          return r2.rows?.[0]?.count ?? null;
        } catch (e2) {
          return null;
        }
      }
    })();

    const [
      ordersTodayR,
      ordersLastHourR,
      avgOrderValueTodayR,
      readyWithoutDriverR,
      cancelledTodayR,
      avg7dSameHourR,
      avgPrepTimeMin,
      activeDriversCount,
    ] = await Promise.all([
      ordersTodayQ,
      ordersLastHourQ,
      avgOrderValueTodayQ,
      readyWithoutDriverQ,
      cancelledTodayQ,
      avg7dSameHourQ,
      avgPrepTimeQ,
      activeDriversQ,
    ]);

    const ordersToday = ordersTodayR.rows?.[0]?.count ?? 0;
    const ordersLastHour = ordersLastHourR.rows?.[0]?.count ?? 0;
    const avgOrderValueToday = avgOrderValueTodayR.rows?.[0]?.avg ?? null;
    const readyWithoutDriverCount = readyWithoutDriverR.rows?.[0]?.count ?? 0;
    const cancelledTodayCount = cancelledTodayR.rows?.[0]?.count ?? 0;
    const avg7dSameHour = avg7dSameHourR.rows?.[0]?.avg ?? 0;

    // ---------------- Alerts (Rule-based) ----------------
    const alerts = [];

    if (Number.isFinite(readyWithoutDriverCount) && readyWithoutDriverCount >= 5) {
      alerts.push({
        id: 'ready_without_driver',
        severity: 'high',
        title: 'طلبات جاهزة بدون مندوب',
        detail: `يوجد ${readyWithoutDriverCount} طلب جاهز بدون تعيين مندوب اليوم.`,
        suggestedAction: 'راجع التوزيع المباشر (Live Dispatch) وتأكد من توفر المناديب وتفعيل التخصيص.',
      });
    }

    if (ordersToday > 0) {
      const cancelRate = cancelledTodayCount / Math.max(ordersToday, 1);
      if (cancelRate >= 0.08) {
        alerts.push({
          id: 'high_cancellations',
          severity: 'med',
          title: 'ارتفاع الإلغاءات اليوم',
          detail: `معدل الإلغاء اليوم ${(cancelRate * 100).toFixed(1)}% (${cancelledTodayCount}/${ordersToday}).`,
          suggestedAction: 'راجع أسباب الإلغاء (مخزون/تأخير/توصيل) وراقب الطلبات المتأخرة.',
        });
      }
    }

    if (avg7dSameHour > 0 && ordersLastHour >= avg7dSameHour * 1.3) {
      alerts.push({
        id: 'spike_orders_hour',
        severity: 'med',
        title: 'ارتفاع مفاجئ بالطلبات (آخر ساعة)',
        detail: `طلبات آخر ساعة: ${ordersLastHour}. متوسط آخر 7 أيام لنفس الساعة: ${avg7dSameHour.toFixed(1)}.`,
        suggestedAction: 'راقب توفر المناديب والمخزون، وفعّل مسارات التوزيع التلقائي عند الحاجة.',
      });
    }

    if (activeDriversCount != null) {
      const expectedMinDrivers = Math.max(2, Math.ceil((ordersLastHour + readyWithoutDriverCount) / 3));
      if (activeDriversCount < expectedMinDrivers) {
        alerts.push({
          id: 'low_active_drivers',
          severity: 'high',
          title: 'نقص مناديب نشطين',
          detail: `المناديب النشطون: ${activeDriversCount}. الحد المتوقع الآن: ${expectedMinDrivers}.`,
          suggestedAction: 'تواصل مع المناديب غير المتصلين أو قلل ضغط التخصيص/ارفع عرض التوزيع حسب الإعدادات.',
        });
      }
    }

    // ---------------- Recommendations (Textual, safe) ----------------
    const recommendations = [];
    if (alerts.find((a) => a.id === 'ready_without_driver')) {
      recommendations.push({
        id: 'rec_dispatch_ready',
        title: 'تقليل الطلبات الجاهزة بدون مندوب',
        steps: [
          'افتح: Admin → Live Dispatch، وراجع الطلبات بدون مندوب.',
          'تحقق من حالة المناديب (Available/Busy/Offline) في لوحة التوصيل.',
          'إن كان Auto-Dispatch مفعّلًا: راقب قائمة الطلبات READY وتأخر التخصيص.',
        ],
      });
    }
    if (alerts.find((a) => a.id === 'high_cancellations')) {
      recommendations.push({
        id: 'rec_reduce_cancellations',
        title: 'خفض معدل الإلغاء اليوم',
        steps: [
          'راجع الطلبات الملغاة اليوم وحدد السبب الأكثر تكرارًا (تأخير/مخزون/مندوب).',
          'افحص المنتجات منخفضة المخزون للمنتجات الأكثر طلبًا.',
          'راقب الطلبات المتأخرة READY بدون مندوب وتعامل معها فورًا.',
        ],
      });
    }
    if (alerts.find((a) => a.id === 'spike_orders_hour')) {
      recommendations.push({
        id: 'rec_spike_plan',
        title: 'خطة سريعة للتعامل مع الارتفاع المفاجئ',
        steps: [
          'تابع مؤشر المناديب النشطين مقابل الطلبات في آخر ساعة.',
          'أعط أولوية للطلبات الجاهزة للتوصيل أولاً لتقليل التأخير.',
          'راقب المخزون للمنتجات الأكثر طلبًا لتجنب إلغاءات.',
        ],
      });
    }

    // Always include a neutral baseline recommendation (no side effects)
    recommendations.push({
      id: 'rec_baseline',
      title: 'مراجعة تشغيلية سريعة (قراءة فقط)',
      steps: [
        'افتح Mission Control لمراقبة الطلبات والـ Riders لحظياً.',
        'راجع Dispatch Settings للتأكد من توافقها مع حجم الطلبات الحالي.',
        'راقب KPI: READY بدون مندوب + معدل الإلغاء خلال اليوم.',
      ],
    });

    res.json({
      ts: now.toISOString(),
      kpis: {
        ordersToday,
        ordersLastHour,
        avgOrderValueToday,
        avgPrepTimeMin,
        readyWithoutDriverCount,
        cancelledTodayCount,
        activeDriversCount,
      },
      alerts,
      recommendations,
    });
  } catch (err) {
    console.error("Ops digest error:", err);
    res.status(500).json({ message: "حدث خطأ في توليد Ops Digest" });
  }
});

// ================= Admin Copilot (Rule-based, Read-only) =================
// POST /api/admin/copilot/ask
// - No external services
// - No DB writes
// - No status changes
// - Allowlist intents only

function normalizeCopilotQuestion(q) {
  return String(q || '').trim();
}

function classifyCopilotIntent(question) {
  const q = normalizeCopilotQuestion(question);
  if (!q) return 'UNKNOWN';
  const s = q.toLowerCase();

  const hasAny = (arr) => arr.some((k) => s.includes(k));

  // More specific first
  if (hasAny(['what to do', 'what should i do', 'next step', 'now', 'ماذا أفعل', 'ماذا الان', 'ماذا الآن', 'ماذا نفعل', 'الآن'])) {
    return 'WHAT_TO_DO_NOW';
  }
  if (hasAny(['delayed', 'delay', 'متأخر', 'تأخير', 'أقدم', 'oldest', 'top delayed', 'ready متأخر'])) {
    return 'TOP_DELAYED_READY';
  }
  if (hasAny(['ready without', 'no driver', 'without driver', 'بدون مندوب', 'بدون سائق', 'جاهز بدون', 'ready بدون'])) {
    return 'READY_WITHOUT_DRIVER';
  }
  if (hasAny(['cancel rate', 'cancellation', 'cancelled today', 'canceled today', 'إلغاء', 'الإلغاء', 'معدل الإلغاء', 'ملغي اليوم'])) {
    return 'CANCEL_RATE_TODAY';
  }
  if (hasAny(['last hour', 'orders last hour', 'load', 'pressure', 'آخر ساعة', 'طلبات آخر ساعة', 'ضغط'])) {
    return 'LOAD_LAST_HOUR';
  }
  if (hasAny(['dispatch health', 'dispatch', 'توزيع', 'حالة التوزيع', 'صحة التوزيع'])) {
    return 'DISPATCH_HEALTH';
  }
  if (hasAny(['online riders', 'riders online', 'drivers online', 'available riders', 'rider', 'riders', 'مندوب', 'مناديب', 'سائق', 'سائقين', 'اونلاين', 'متصل'])) {
    return 'ONLINE_RIDERS';
  }
  if (hasAny(['avg time', 'average time', 'average times', 'متوسط', 'وقت التجهيز', 'prep time', 'وقت التوصيل', 'delivery time'])) {
    return 'AVG_TIMES';
  }
  if (hasAny(['low stock', 'out of stock', 'stock', 'مخزون', 'نفاد', 'منخفض'])) {
    return 'LOW_STOCK';
  }
  if (hasAny(['revenue', 'sales', 'today revenue', 'إيراد', 'مبيعات', 'مبيعات اليوم'])) {
    return 'REVENUE_TODAY';
  }

  return 'UNKNOWN';
}

function copilotSuggestions() {
  return [
    'كم عدد الطلبات الجاهزة بدون مندوب؟',
    'ما هو معدل الإلغاء اليوم؟',
    'كم عدد الطلبات في آخر ساعة؟',
    'هل التوزيع (Dispatch) صحي الآن؟',
    'اعطني أقدم طلبات READY بدون مندوب',
    'كم عدد المناديب Online الآن؟',
    'ما هي متوسطات أوقات التجهيز والتوصيل اليوم؟',
    'هل يوجد مخزون منخفض؟',
    'كم إيراد اليوم؟',
    'ماذا أفعل الآن؟',
  ];
}

async function safeQueryValue(queryText, params, pick, fallback) {
  try {
    const r = await pool.query(queryText, params || []);
    return pick(r);
  } catch (e) {
    return fallback;
  }
}

async function getCopilotDataBestEffort() {
  const now = new Date();

  // DB disconnected: return safe defaults
  if (!isDbConnected) {
    return {
      ts: now.toISOString(),
      ordersToday: 0,
      ordersLastHour: 0,
      readyWithoutDriverCount: 0,
      cancelledTodayCount: 0,
      cancelRateToday: 0,
      activeDriversCount: null,
      onlineRidersCount: null,
      topDelayedReady: [],
      avgPrepTimeMin: null,
      avgDeliveryTimeMin: null,
      revenueToday: null,
      lowStockItems: null,
      is_simulation: true,
    };
  }

  const [
    ordersToday,
    ordersLastHour,
    readyWithoutDriverCount,
    cancelledTodayCount,
    avgPrepTimeMin,
    activeDriversCount,
  ] = await Promise.all([
    safeQueryValue(
      `SELECT COUNT(*)::int AS count FROM orders WHERE created_at >= date_trunc('day', NOW())`,
      [],
      (r) => r.rows?.[0]?.count ?? 0,
      0
    ),
    safeQueryValue(
      `SELECT COUNT(*)::int AS count FROM orders WHERE created_at >= NOW() - INTERVAL '1 hour'`,
      [],
      (r) => r.rows?.[0]?.count ?? 0,
      0
    ),
    safeQueryValue(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE created_at >= date_trunc('day', NOW())
         AND (UPPER(COALESCE(status, '')) = 'READY' OR LOWER(COALESCE(status, '')) = 'ready')
         AND driver_id IS NULL`,
      [],
      (r) => r.rows?.[0]?.count ?? 0,
      0
    ),
    safeQueryValue(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE created_at >= date_trunc('day', NOW())
         AND (UPPER(COALESCE(status, '')) = 'CANCELLED' OR LOWER(COALESCE(status, '')) = 'cancelled')`,
      [],
      (r) => r.rows?.[0]?.count ?? 0,
      0
    ),
    // Avg prep time (ACCEPTED -> READY) today
    (async () => {
      try {
        const r = await pool.query(
          `WITH per_order AS (
             SELECT
               order_id,
               MIN(created_at) FILTER (WHERE new_status = 'ACCEPTED') AS accepted_at,
               MIN(created_at) FILTER (WHERE new_status = 'READY') AS ready_at
             FROM order_status_history
             WHERE created_at >= date_trunc('day', NOW())
             GROUP BY order_id
           )
           SELECT AVG(EXTRACT(EPOCH FROM (ready_at - accepted_at)) / 60.0)::float AS avg_min
           FROM per_order
           WHERE accepted_at IS NOT NULL AND ready_at IS NOT NULL AND ready_at >= accepted_at`
        );
        const v = r.rows?.[0]?.avg_min;
        return typeof v === 'number' ? v : null;
      } catch {
        return null;
      }
    })(),
    // Active drivers count (best-effort)
    (async () => {
      try {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS count
           FROM drivers d
           JOIN users u ON d.user_id = u.id
           WHERE COALESCE(d.is_active, true) = true
             AND COALESCE(u.is_active, true) = true
             AND (
               d.rider_status IN ('available', 'busy')
               OR d.status IN ('online', 'active')
             )`
        );
        return r.rows?.[0]?.count ?? null;
      } catch (e1) {
        try {
          const r2 = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM drivers d
             JOIN users u ON d.user_id = u.id
             WHERE COALESCE(d.is_active, true) = true
               AND COALESCE(u.is_active, true) = true`
          );
          return r2.rows?.[0]?.count ?? null;
        } catch {
          return null;
        }
      }
    })(),
  ]);

  const cancelRateToday = ordersToday > 0 ? cancelledTodayCount / Math.max(ordersToday, 1) : 0;

  // Online riders count (prefer "seen recently" if possible)
  const onlineRidersCount = await (async () => {
    try {
      const r = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM drivers d
         JOIN users u ON d.user_id = u.id
         WHERE COALESCE(d.is_active, true) = true
           AND COALESCE(u.is_active, true) = true
           AND (
             d.rider_status IN ('available', 'busy')
             OR d.status IN ('online', 'active', 'busy')
           )
           AND COALESCE(d.last_seen_at, d.last_location_update) >= NOW() - INTERVAL '10 minutes'`
      );
      return r.rows?.[0]?.count ?? null;
    } catch (e1) {
      try {
        const r2 = await pool.query(
          `SELECT COUNT(*)::int AS count
           FROM drivers d
           JOIN users u ON d.user_id = u.id
           WHERE COALESCE(d.is_active, true) = true
             AND COALESCE(u.is_active, true) = true
             AND (
               d.rider_status IN ('available', 'busy')
               OR d.status IN ('online', 'active', 'busy')
             )
             AND COALESCE(d.last_seen, d.last_location_update) >= NOW() - INTERVAL '10 minutes'`
        );
        return r2.rows?.[0]?.count ?? null;
      } catch (e2) {
        try {
          const r3 = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM drivers d
             JOIN users u ON d.user_id = u.id
             WHERE COALESCE(d.is_active, true) = true
               AND COALESCE(u.is_active, true) = true
               AND (
                 d.rider_status IN ('available', 'busy')
                 OR d.status IN ('online', 'active', 'busy')
               )`
          );
          return r3.rows?.[0]?.count ?? null;
        } catch {
          return null;
        }
      }
    }
  })();

  // Top delayed READY without driver (today)
  const topDelayedReady = await safeQueryValue(
    `SELECT id, created_at
     FROM orders
     WHERE created_at >= date_trunc('day', NOW())
       AND (UPPER(COALESCE(status, '')) = 'READY' OR LOWER(COALESCE(status, '')) = 'ready')
       AND driver_id IS NULL
     ORDER BY created_at ASC
     LIMIT 10`,
    [],
    (r) =>
      (r.rows || []).map((x) => ({
        id: x.id,
        created_at: x.created_at,
      })),
    []
  );

  // Avg delivery time (ASSIGNED -> DELIVERED) today (best-effort)
  const avgDeliveryTimeMin = await (async () => {
    try {
      const r = await pool.query(
        `WITH per_order AS (
           SELECT
             order_id,
             MIN(created_at) FILTER (WHERE new_status = 'ASSIGNED') AS assigned_at,
             MIN(created_at) FILTER (WHERE new_status = 'DELIVERED') AS delivered_at
           FROM order_status_history
           WHERE created_at >= date_trunc('day', NOW())
           GROUP BY order_id
         )
         SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 60.0)::float AS avg_min
         FROM per_order
         WHERE assigned_at IS NOT NULL AND delivered_at IS NOT NULL AND delivered_at >= assigned_at`
      );
      const v = r.rows?.[0]?.avg_min;
      return typeof v === 'number' ? v : null;
    } catch {
      return null;
    }
  })();

  // Revenue today (best-effort)
  const revenueToday = await safeQueryValue(
    `SELECT COALESCE(SUM(COALESCE(final_total, total_amount, 0)), 0)::float AS revenue
     FROM orders
     WHERE created_at >= date_trunc('day', NOW())
       AND UPPER(COALESCE(status, '')) != 'CANCELLED'`,
    [],
    (r) => {
      const v = r.rows?.[0]?.revenue;
      return typeof v === 'number' ? v : Number(v) || 0;
    },
    null
  );

  // Low stock (optional)
  const lowStockItems = await (async () => {
    try {
      const r = await pool.query(
        `SELECT sp.store_id, sp.product_id, sp.stock_qty, p.name
         FROM store_products sp
         JOIN products p ON p.id = sp.product_id
         WHERE sp.stock_qty IS NOT NULL
           AND sp.stock_qty <= 5
           AND COALESCE(sp.in_stock, true) = true
         ORDER BY sp.stock_qty ASC
         LIMIT 10`
      );
      return (r.rows || []).map((x) => ({
        store_id: x.store_id,
        product_id: x.product_id,
        stock_qty: x.stock_qty,
        name: x.name,
      }));
    } catch {
      return null;
    }
  })();

  return {
    ts: now.toISOString(),
    ordersToday: ordersToday || 0,
    ordersLastHour: ordersLastHour || 0,
    readyWithoutDriverCount: readyWithoutDriverCount || 0,
    cancelledTodayCount: cancelledTodayCount || 0,
    cancelRateToday: cancelRateToday || 0,
    activeDriversCount: activeDriversCount ?? null,
    onlineRidersCount: onlineRidersCount ?? null,
    topDelayedReady: topDelayedReady || [],
    avgPrepTimeMin: avgPrepTimeMin ?? null,
    avgDeliveryTimeMin: avgDeliveryTimeMin ?? null,
    revenueToday: revenueToday ?? null,
    lowStockItems,
    is_simulation: false,
  };
}

function makeCard(id, title, value, severity, evidence, actions) {
  return {
    id: String(id),
    title: String(title),
    value: value == null ? undefined : String(value),
    severity,
    evidence: Array.isArray(evidence) ? evidence : [],
    actions: Array.isArray(actions) ? actions : [],
  };
}

app.post(
  "/api/admin/copilot/ask",
  authMiddleware,
  requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  async (req, res) => {
    const ts = new Date().toISOString();
    const question = normalizeCopilotQuestion(req.body?.question);
    const intent = classifyCopilotIntent(question);

    console.log(`🧭 [COPILOT] userId=${req.user?.id} intent=${intent} ts=${ts}`);

    if (intent === 'UNKNOWN') {
      return res.json({
        ok: true,
        intent: 'UNKNOWN',
        cards: [
          makeCard(
            'unknown',
            'اختر سؤالاً من المقترحات',
            undefined,
            'low',
            ['Only allowlisted intents are supported'],
            ['اضغط أحد المقترحات ثم Ask']
          ),
        ],
        suggestions: copilotSuggestions(),
      });
    }

    const d = await getCopilotDataBestEffort();

    const cards = [];

    // Base cards builders (reused by WHAT_TO_DO_NOW)
    const cardReadyWithoutDriver = () =>
      makeCard(
        'ready_without_driver',
        'طلبات جاهزة بدون مندوب',
        String(d.readyWithoutDriverCount ?? 0),
        (d.readyWithoutDriverCount ?? 0) >= 5 ? 'high' : 'low',
        ['READY & driver_id is null', "created_at >= اليوم"],
        ['افتح LiveDispatch', 'تحقق من riders online']
      );

    const cardCancelRateToday = () => {
      const pct = ((d.cancelRateToday ?? 0) * 100);
      return makeCard(
        'cancel_rate_today',
        'معدل الإلغاء اليوم',
        `${pct.toFixed(1)}%`,
        pct >= 8 ? 'med' : 'low',
        ['CANCELLED اليوم / كل طلبات اليوم'],
        ['راجع أسباب الإلغاء', 'تحقق من نفاد المخزون']
      );
    };

    const cardLoadLastHour = () =>
      makeCard(
        'load_last_hour',
        'طلبات آخر ساعة',
        String(d.ordersLastHour ?? 0),
        (d.ordersLastHour ?? 0) >= 20 ? 'med' : 'low',
        ["created_at >= NOW() - 1 hour"],
        ['استعد لزيادة السائقين', 'راقب وقت التجهيز']
      );

    const cardOnlineRiders = () =>
      makeCard(
        'online_riders',
        'المناديب Online الآن',
        d.onlineRidersCount == null ? '—' : String(d.onlineRidersCount),
        (d.onlineRidersCount != null && d.onlineRidersCount <= 1) ? 'high' : 'low',
        ["drivers.status/rider_status indicates online/available", 'best-effort last seen filter'],
        ['افتح DeliveryManagement', 'راجع RidersTab']
      );

    const cardAvgTimes = () => {
      const prep = d.avgPrepTimeMin
      const del = d.avgDeliveryTimeMin
      const v = `prep=${prep == null ? '—' : prep.toFixed(1)}m, delivery=${del == null ? '—' : del.toFixed(1)}m`
      return makeCard(
        'avg_times',
        'متوسطات الأوقات (اليوم)',
        v,
        'low',
        ['order_status_history: ACCEPTED→READY و ASSIGNED→DELIVERED (إن توفر)'],
        ['راقب تجهيز المتجر', 'راقب التوزيع للطلبات READY']
      );
    };

    const cardDispatchHealth = () => {
      const ready = d.readyWithoutDriverCount ?? 0
      const online = d.onlineRidersCount
      const sev =
        ready >= 5 ? 'high' : (online != null && online <= 1 ? 'high' : ((d.ordersLastHour ?? 0) >= 20 ? 'med' : 'low'))
      const value = `ready_no_driver=${ready}, online_riders=${online == null ? '—' : online}, last_hour=${d.ordersLastHour ?? 0}`
      return makeCard(
        'dispatch_health',
        'صحة التوزيع (Dispatch Health)',
        value,
        sev,
        ['Derived from READY بدون مندوب + Online riders + Load آخر ساعة'],
        ['افتح LiveDispatch', 'تحقق من Dispatch Settings']
      );
    };

    const cardTopDelayedReady = () => {
      const rows = Array.isArray(d.topDelayedReady) ? d.topDelayedReady : []
      const nowMs = Date.now()
      const lines = rows.slice(0, 5).map((x) => {
        const created = new Date(x.created_at).getTime()
        const min = Number.isFinite(created) ? Math.max(0, Math.round((nowMs - created) / 60000)) : null
        return `#${x.id} (${min == null ? '—' : `${min}m`})`
      })
      const worstMin = (() => {
        if (!rows.length) return 0
        const created = new Date(rows[0].created_at).getTime()
        if (!Number.isFinite(created)) return 0
        return Math.max(0, Math.round((nowMs - created) / 60000))
      })()
      return makeCard(
        'top_delayed_ready',
        'أقدم طلبات READY بدون مندوب',
        lines.length ? lines.join(', ') : '—',
        worstMin >= 10 ? 'high' : (rows.length ? 'med' : 'low'),
        ['READY & driver_id is null', 'مرتبة بالأقدم'],
        ['افتح LiveDispatch', 'خصص مندوب يدوياً للطلبات الأقدم أولاً']
      );
    };

    const cardRevenueToday = () => {
      const v = d.revenueToday == null ? null : `${Number(d.revenueToday).toFixed(2)} SAR`
      return makeCard(
        'revenue_today',
        'إيراد اليوم',
        v ?? '—',
        'low',
        ['SUM(COALESCE(final_total,total_amount)) اليوم باستثناء CANCELLED'],
        ['افتح Accountant Dashboard', 'راجع Profit Report']
      );
    };

    const cardLowStock = () => {
      const items = d.lowStockItems
      const text = Array.isArray(items) && items.length
        ? items.slice(0, 5).map((x) => `${x.name || x.product_id} (qty=${x.stock_qty})`).join(', ')
        : '—'
      return makeCard(
        'low_stock',
        'مخزون منخفض (اختياري)',
        text,
        (Array.isArray(items) && items.length >= 5) ? 'med' : 'low',
        ['store_products.stock_qty <= 5 (إذا متاح)'],
        ['راجع المخزون للمنتجات الأكثر طلباً', 'حدث المخزون للمتجر']
      );
    };

    // Intent switch
    switch (intent) {
      case 'READY_WITHOUT_DRIVER':
        cards.push(cardReadyWithoutDriver());
        break;
      case 'CANCEL_RATE_TODAY':
        cards.push(cardCancelRateToday());
        break;
      case 'LOAD_LAST_HOUR':
        cards.push(cardLoadLastHour());
        break;
      case 'DISPATCH_HEALTH':
        cards.push(cardDispatchHealth(), cardReadyWithoutDriver(), cardOnlineRiders());
        break;
      case 'TOP_DELAYED_READY':
        cards.push(cardTopDelayedReady(), cardReadyWithoutDriver());
        break;
      case 'ONLINE_RIDERS':
        cards.push(cardOnlineRiders(), cardReadyWithoutDriver());
        break;
      case 'AVG_TIMES':
        cards.push(cardAvgTimes());
        break;
      case 'LOW_STOCK':
        cards.push(cardLowStock());
        break;
      case 'REVENUE_TODAY':
        cards.push(cardRevenueToday());
        break;
      case 'WHAT_TO_DO_NOW': {
        const base = [cardDispatchHealth(), cardReadyWithoutDriver(), cardCancelRateToday(), cardLoadLastHour(), cardOnlineRiders()];
        const score = (c) => {
          if (c.severity === 'high') return 3;
          if (c.severity === 'med') return 2;
          return 1;
        };
        const top = base.sort((a, b) => score(b) - score(a)).slice(0, 3);
        cards.push(...top);
        break;
      }
      default:
        // Safety fallback (should not happen)
        cards.push(
          makeCard(
            'unknown_fallback',
            'اختر سؤالاً من المقترحات',
            undefined,
            'low',
            ['Unknown intent'],
            ['اضغط أحد المقترحات ثم Ask']
          )
        );
        break;
    }

    res.json({
      ok: true,
      intent,
      cards,
      suggestions: copilotSuggestions(),
    });
  }
);

// Get Recent Orders
app.get("/api/admin/orders/recent", authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await pool.query(`
      SELECT 
        o.id,
        o.total_amount,
        o.final_total,
        o.status,
        o.created_at,
        u.name as customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT $1;
    `, [limit]);
    
    res.json({ orders: result.rows });
  } catch (err) {
    console.error("Get recent orders error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الطلبات الأخيرة" });
  }
});

// Get Users Count
app.get("/api/admin/users/count", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM users;`);
    const count = parseInt(result.rows[0].count) || 0;
    res.json({ count });
  } catch (err) {
    console.error("Get users count error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب عدد المستخدمين" });
  }
});

// ---------- Marketing (audience + campaigns, admin-only, consent-safe) ----------
const marketingRateLimit = new Map(); // userId -> { count, resetAt }
const MARKETING_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MARKETING_RATE_LIMIT_MAX = 10;

function checkMarketingRateLimit(userId) {
  const now = Date.now();
  let entry = marketingRateLimit.get(userId);
  if (!entry) {
    entry = { count: 0, resetAt: now + MARKETING_RATE_LIMIT_WINDOW_MS };
    marketingRateLimit.set(userId, entry);
  }
  if (now >= entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + MARKETING_RATE_LIMIT_WINDOW_MS;
  }
  entry.count++;
  return entry.count <= MARKETING_RATE_LIMIT_MAX;
}

function buildAudienceWhere(filters) {
  const conditions = ["u.role = 'customer'"];
  const params = [];
  let idx = 1;
  if (filters.marketing_opt_in === true) {
    conditions.push(`u.marketing_opt_in = true`);
  }
  if (filters.channel_whatsapp === true) {
    conditions.push(`(u.channel_opt_in->>'whatsapp')::text = 'true'`);
  }
  if (filters.has_phone === true) {
    conditions.push(`(u.phone IS NOT NULL AND u.phone != '' OR u.whatsapp_phone IS NOT NULL AND u.whatsapp_phone != '')`);
  }
  if (filters.last_order_days != null && Number.isFinite(Number(filters.last_order_days))) {
    conditions.push(`EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.created_at >= NOW() - ($${idx}::text || ' days')::interval)`);
    params.push(String(filters.last_order_days));
    idx++;
  }
  if (filters.orders_count_min != null && Number.isFinite(Number(filters.orders_count_min))) {
    conditions.push(`(SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) >= $${idx}`);
    params.push(Number(filters.orders_count_min));
    idx++;
  }
  if (filters.total_spent_min != null && Number.isFinite(Number(filters.total_spent_min))) {
    conditions.push(`(SELECT COALESCE(SUM(o.total), SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = u.id) >= $${idx}`);
    params.push(Number(filters.total_spent_min));
    idx++;
  }
  if (filters.created_since) {
    const d = new Date(filters.created_since);
    if (!isNaN(d.getTime())) {
      conditions.push(`u.created_at >= $${idx}`);
      params.push(d.toISOString());
      idx++;
    }
  }
  if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
    const q = '%' + filters.search.trim().replace(/%/g, '\\%') + '%';
    conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone LIKE $${idx} OR u.whatsapp_phone LIKE $${idx})`);
    params.push(q);
    idx++;
  }
  if (filters.zone_id != null && Number.isFinite(Number(filters.zone_id))) {
    conditions.push(`EXISTS (SELECT 1 FROM customer_addresses ca WHERE ca.customer_id = u.id AND ca.zone_id = $${idx})`);
    params.push(Number(filters.zone_id));
    idx++;
  }
  return { whereClause: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params };
}

app.get("/api/admin/marketing/audience", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    let filters = {};
    try {
      if (req.query.filters) filters = typeof req.query.filters === 'string' ? JSON.parse(req.query.filters) : req.query.filters;
    } catch (e) { /* ignore */ }
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const { whereClause, params } = buildAudienceWhere(filters);
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total) || 0;
    const rowsResult = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.whatsapp_phone, u.marketing_opt_in, u.channel_opt_in, u.created_at
       FROM users u ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ rows: rowsResult.rows, total });
  } catch (err) {
    console.error("Marketing audience error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الجمهور" });
  }
});

app.get("/api/admin/marketing/audience/export.csv", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    if (!checkMarketingRateLimit(req.user.id)) {
      return res.status(429).json({ code: "RATE_LIMIT", message: "تجاوزت حد الطلبات. حاول بعد دقيقة." });
    }
    let filters = {};
    try {
      if (req.query.filters) filters = typeof req.query.filters === 'string' ? JSON.parse(req.query.filters) : req.query.filters;
    } catch (e) { /* ignore */ }
    const { whereClause, params } = buildAudienceWhere(filters);
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.whatsapp_phone, u.marketing_opt_in, u.channel_opt_in, u.created_at
       FROM users u ${whereClause} ORDER BY u.created_at DESC`,
      params
    );
    await logAuditAction(req, 'MARKETING_AUDIENCE_EXPORT', 'marketing_audience', null, null, { row_count: result.rows.length });
    const header = 'id,full_name,email,phone,whatsapp_phone,marketing_opt_in,channel_opt_in,created_at\n';
    const escape = (v) => (v == null ? '' : String(v).replace(/"/g, '""'));
    const rows = result.rows.map((r) =>
      [r.id, r.full_name, r.email, r.phone, r.whatsapp_phone, r.marketing_opt_in, JSON.stringify(r.channel_opt_in || {}), r.created_at].map(escape).join(',')
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=audience-export.csv');
    res.send('\uFEFF' + header + rows.join('\n'));
  } catch (err) {
    console.error("Audience export error:", err);
    res.status(500).json({ message: "حدث خطأ في تصدير الجمهور" });
  }
});

app.get("/api/admin/marketing/campaigns", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name_ar, name_en, channel, template_key, status, created_by, created_at, updated_at, audience_filters
       FROM marketing_campaigns ORDER BY updated_at DESC`
    );
    res.json({ campaigns: result.rows });
  } catch (err) {
    if (err.code === '42P01') return res.json({ campaigns: [] });
    console.error("List campaigns error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الحملات" });
  }
});

app.get("/api/admin/marketing/templates", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(`SELECT value FROM system_settings WHERE key = 'whatsapp_templates'`);
    let templates = [];
    if (result.rows.length > 0 && result.rows[0].value) {
      try { templates = JSON.parse(result.rows[0].value); } catch (e) { /* keep [] */ }
    }
    if (!Array.isArray(templates)) templates = [];
    res.json({ templates });
  } catch (err) {
    if (err.code === '42P01') return res.json({ templates: [] });
    console.error("List templates error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب القوالب" });
  }
});

app.put("/api/admin/marketing/templates", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { templates } = req.body || {};
    const list = Array.isArray(templates)
      ? templates.map((t) => ({
          key: typeof t.key === 'string' ? t.key.trim() : '',
          name: typeof t.name === 'string' ? t.name.trim() : (t.key || ''),
          languageCode: typeof t.languageCode === 'string' ? t.languageCode.trim() : 'ar',
          description_ar: typeof t.description_ar === 'string' ? t.description_ar.trim() : '',
          description_en: typeof t.description_en === 'string' ? t.description_en.trim() : '',
          variables: Array.isArray(t.variables) ? t.variables.filter((v) => typeof v === 'string') : [],
          enabled: t.enabled !== false,
        })).filter((t) => t.key)
      : [];
    await pool.query(`
      INSERT INTO system_settings (key, value) VALUES ('whatsapp_templates', $1::text)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [JSON.stringify(list)]);
    await logAuditAction(req, 'MARKETING_TEMPLATES_UPDATE', 'settings', null, null, { count: list.length });
    res.json({ templates: list });
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ message: "جدول الإعدادات غير متوفر." });
    console.error("Update templates error:", err);
    res.status(500).json({ message: "حدث خطأ في حفظ القوالب" });
  }
});

app.post("/api/admin/marketing/campaigns", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { name_ar, name_en, channel, template_key, status, audience_filters } = req.body || {};
    const c = channel && ['whatsapp', 'sms', 'email', 'push'].includes(channel) ? channel : 'whatsapp';
    const st = status && ['draft', 'ready', 'paused'].includes(status) ? status : 'draft';
    const result = await pool.query(
      `INSERT INTO marketing_campaigns (name_ar, name_en, channel, template_key, status, audience_filters, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name_ar, name_en, channel, template_key, status, created_by, created_at, updated_at, audience_filters`,
      [name_ar || null, name_en || null, c, template_key || null, st, JSON.stringify(audience_filters || {}), req.user.id]
    );
    const row = result.rows[0];
    await logAuditAction(req, 'MARKETING_CAMPAIGN_CREATE', 'marketing_campaigns', row.id, null, { name_ar: row.name_ar, name_en: row.name_en, channel: row.channel });
    res.status(201).json({ campaign: row });
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ message: "جدول الحملات غير متوفر. تشغيل الهجرات مطلوب." });
    console.error("Create campaign error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء الحملة" });
  }
});

app.put("/api/admin/marketing/campaigns/:id", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { name_ar, name_en, channel, template_key, status, audience_filters } = req.body || {};
    const updates = [];
    const values = [];
    let idx = 1;
    if (name_ar !== undefined) { updates.push(`name_ar = $${idx}`); values.push(name_ar); idx++; }
    if (name_en !== undefined) { updates.push(`name_en = $${idx}`); values.push(name_en); idx++; }
    if (channel !== undefined && ['whatsapp', 'sms', 'email', 'push'].includes(channel)) { updates.push(`channel = $${idx}`); values.push(channel); idx++; }
    if (template_key !== undefined) { updates.push(`template_key = $${idx}`); values.push(template_key); idx++; }
    if (status !== undefined && ['draft', 'ready', 'paused'].includes(status)) { updates.push(`status = $${idx}`); values.push(status); idx++; }
    if (audience_filters !== undefined) { updates.push(`audience_filters = $${idx}`); values.push(JSON.stringify(audience_filters)); idx++; }
    if (updates.length === 0) return res.status(400).json({ message: "لا توجد حقول للتحديث" });
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const result = await pool.query(
      `UPDATE marketing_campaigns SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name_ar, name_en, channel, template_key, status, created_by, created_at, updated_at, audience_filters`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "الحملة غير موجودة" });
    await logAuditAction(req, 'MARKETING_CAMPAIGN_UPDATE', 'marketing_campaigns', id, null, req.body);
    res.json({ campaign: result.rows[0] });
  } catch (err) {
    console.error("Update campaign error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الحملة" });
  }
});

app.delete("/api/admin/marketing/campaigns/:id", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM marketing_campaigns WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "الحملة غير موجودة" });
    await logAuditAction(req, 'MARKETING_CAMPAIGN_DELETE', 'marketing_campaigns', id, null, null);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete campaign error:", err);
    res.status(500).json({ message: "حدث خطأ في حذف الحملة" });
  }
});

app.post("/api/admin/marketing/campaigns/:id/dry-run", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    if (!checkMarketingRateLimit(req.user.id)) {
      return res.status(429).json({ code: "RATE_LIMIT", message: "تجاوزت حد الطلبات. حاول بعد دقيقة." });
    }
    const { id } = req.params;
    const camp = await pool.query(`SELECT id, channel, audience_filters FROM marketing_campaigns WHERE id = $1`, [id]);
    if (camp.rows.length === 0) return res.status(404).json({ message: "الحملة غير موجودة" });
    const filters = camp.rows[0].audience_filters || {};
    if (camp.rows[0].channel === 'whatsapp') {
      filters.channel_whatsapp = true;
      filters.has_phone = true;
    }
    const { whereClause, params } = buildAudienceWhere(filters);
    const usersResult = await pool.query(
      `SELECT u.id, u.full_name, u.phone, u.whatsapp_phone FROM users u ${whereClause} ORDER BY u.created_at DESC`,
      params
    );
    const total = usersResult.rows.length;
    let valid_phones = 0, invalid_phones = 0, missing_phone_count = 0;
    usersResult.rows.forEach((u) => {
      const raw = (u.whatsapp_phone || u.phone || '').trim();
      if (!raw) {
        missing_phone_count++;
        return;
      }
      try {
        whatsappProvider.normalizeE164(raw);
        valid_phones++;
      } catch (e) {
        invalid_phones++;
      }
    });
    const sample = usersResult.rows.slice(0, 20);
    await logAuditAction(req, 'MARKETING_DRY_RUN', 'marketing_campaigns', id, null, { total, valid_phones, invalid_phones, missing_phone_count });
    res.json({
      total,
      valid_phones,
      invalid_phones,
      missing_phone_count,
      opted_out_count: 0,
      sample,
    });
  } catch (err) {
    console.error("Dry-run error:", err);
    res.status(500).json({ message: "حدث خطأ في المحاكاة" });
  }
});

const MARKETING_SEND_BATCH_SIZE = 5;
const MARKETING_SEND_BATCH_DELAY_MS = 150;

app.post("/api/admin/marketing/campaigns/:id/send", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const settingsRes = await pool.query("SELECT value FROM system_settings WHERE key = 'features'");
    let features = {};
    if (settingsRes.rows.length > 0 && settingsRes.rows[0].value) {
      try { features = JSON.parse(settingsRes.rows[0].value); } catch (e) { /* ignore */ }
    }
    const marketingEnabled = features.modules_enabled && features.modules_enabled.marketing === true;
    let whatsappEnabled = false;
    try {
      const waRes = await pool.query("SELECT value_json FROM site_settings WHERE setting_key = 'whatsapp_config'");
      if (waRes.rows.length > 0 && waRes.rows[0].value_json) whatsappEnabled = !!waRes.rows[0].value_json.enabled;
    } catch (e) { /* ignore */ }
    if (!marketingEnabled || !whatsappEnabled || !whatsappProvider.isConfigured()) {
      return res.status(409).json({ code: "WHATSAPP_NOT_CONFIGURED", message: "واتساب غير مُعدّ أو وحدة التسويق غير مفعّلة. لا يتم إرسال أي رسائل حتى تكتمل الإعدادات." });
    }
    const { id } = req.params;
    const camp = await pool.query(`SELECT id, name_ar, name_en, channel, template_key, audience_filters FROM marketing_campaigns WHERE id = $1`, [id]);
    if (camp.rows.length === 0) return res.status(404).json({ message: "الحملة غير موجودة" });
    const c = camp.rows[0];
    if (c.channel !== 'whatsapp') {
      return res.status(400).json({ message: "إرسال مدعوم حالياً لقناة واتساب فقط." });
    }
    const filters = c.audience_filters || {};
    filters.channel_whatsapp = true;
    filters.has_phone = true;
    const { whereClause, params } = buildAudienceWhere(filters);
    const usersResult = await pool.query(
      `SELECT u.id, u.full_name, u.phone, u.whatsapp_phone FROM users u ${whereClause}`,
      params
    );
    const templateName = c.template_key || 'default';
    const languageCode = (c.audience_filters && c.audience_filters.language_code) || 'ar';
    const runRes = await pool.query(
      `INSERT INTO marketing_campaign_runs (campaign_id, run_status, total_targeted) VALUES ($1, 'queued', $2) RETURNING id`,
      [id, usersResult.rows.length]
    );
    const runId = runRes.rows[0].id;
    let totalSent = 0, totalFailed = 0;
    const processBatch = async (batch) => {
      for (const u of batch) {
        const raw = (u.whatsapp_phone || u.phone || '').trim();
        let toE164 = null;
        let errMsg = null;
        if (!raw) {
          errMsg = 'missing_phone';
        } else {
          try {
            toE164 = whatsappProvider.normalizeE164(raw);
          } catch (e) {
            errMsg = e.code === whatsappProvider.INVALID_PHONE ? e.message : e.message;
          }
        }
        if (errMsg) {
          await pool.query(
            `INSERT INTO marketing_message_log (campaign_run_id, user_id, channel, to_phone, template_key, status, error) VALUES ($1, $2, 'whatsapp', $3, $4, 'failed', $5)`,
            [runId, u.id, raw || null, templateName, errMsg]
          );
          totalFailed++;
          continue;
        }
        const logRes = await pool.query(
          `INSERT INTO marketing_message_log (campaign_run_id, user_id, channel, to_phone, template_key, status) VALUES ($1, $2, 'whatsapp', $3, $4, 'queued') RETURNING id`,
          [runId, u.id, toE164, templateName]
        );
        const logId = logRes.rows[0].id;
        try {
          const result = await whatsappProvider.sendTemplate(toE164, templateName, languageCode, []);
          await pool.query(
            `UPDATE marketing_message_log SET status = 'sent', provider_message_id = $1 WHERE id = $2`,
            [result.provider_message_id || null, logId]
          );
          totalSent++;
        } catch (sendErr) {
          await pool.query(
            `UPDATE marketing_message_log SET status = 'failed', error = $1 WHERE id = $2`,
            [sendErr.message, logId]
          );
          totalFailed++;
        }
      }
    };
    for (let i = 0; i < usersResult.rows.length; i += MARKETING_SEND_BATCH_SIZE) {
      const batch = usersResult.rows.slice(i, i + MARKETING_SEND_BATCH_SIZE);
      await processBatch(batch);
      if (i + MARKETING_SEND_BATCH_SIZE < usersResult.rows.length) {
        await new Promise((r) => setTimeout(r, MARKETING_SEND_BATCH_DELAY_MS));
      }
    }
    await pool.query(
      `UPDATE marketing_campaign_runs SET run_status = 'sent', total_sent = $1, total_failed = $2 WHERE id = $3`,
      [totalSent, totalFailed, runId]
    );
    await logAuditAction(req, 'MARKETING_CAMPAIGN_SEND', 'marketing_campaigns', id, null, { run_id: runId, total_targeted: usersResult.rows.length, total_sent: totalSent, total_failed: totalFailed });
    res.json({ success: true, run_id: runId, total_targeted: usersResult.rows.length, total_sent: totalSent, total_failed: totalFailed });
  } catch (err) {
    console.error("Campaign send error:", err);
    res.status(500).json({ message: "حدث خطأ في إرسال الحملة" });
  }
});

app.put("/api/admin/orders/:orderId/status", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { orderId } = req.params;
    const { status } = req.body;

    // Get current status
    const orderCheck = await client.query('SELECT status FROM orders WHERE id = $1', [orderId]);
    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const oldStatus = orderCheck.rows[0].status;
    const newStatus = mapToMVPStatus(status);
    
    // MVP: Validate transition
    const validation = validateStatusTransition(oldStatus, newStatus);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: validation.message });
    }
    
    // Handle cancellation - release inventory
    if (newStatus === MVP_STATUSES.CANCELLED) {
      await releaseInventory(client, orderId);
    }

    await client.query("UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2", [newStatus, orderId]);
    
    // Log to order_status_history
    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, actor_type, actor_id, note)
       VALUES ($1, $2, $3, 'admin', $4, 'Admin updated order status')`,
      [orderId, oldStatus, newStatus, req.user.id]
    );

    // MVP: Auto-assign driver when status is READY
    if (newStatus === MVP_STATUSES.READY && !req.body.skip_auto_assign) {
      // جلب store_id من order_store_assignments
      const storeResult = await pool.query(`
        SELECT DISTINCT store_id 
        FROM order_store_assignments 
        WHERE order_id = $1 
        LIMIT 1;
      `, [orderId]);
      
      if (storeResult.rows.length > 0) {
        const storeId = storeResult.rows[0].store_id;
        const driverAssignment = await assignBestDriver(orderId, storeId);
        if (driverAssignment) {
          console.log(`✅ Auto-assigned driver ${driverAssignment.driver_name} to order ${orderId}`);
          
          // إرسال إشعار Socket.IO لـ Rider
          if (io) {
            io.to(`driver-${driverAssignment.driver_id}`).emit('new_order_notification', {
              order_id: orderId,
              distance: driverAssignment.distance,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
    
    // إذا تم التسليم، حساب العمولة تلقائياً
    if (newStatus === MVP_STATUSES.DELIVERED) {
      const orderResult = await pool.query(`
        SELECT driver_id FROM orders WHERE id = $1;
      `, [orderId]);
      
      if (orderResult.rows.length > 0 && orderResult.rows[0].driver_id) {
        const commissionResult = await calculateAndUpdateCourierCommission(orderId, orderResult.rows[0].driver_id);
        if (commissionResult) {
          console.log(`✅ Commission calculated for order ${orderId}: ${commissionResult.commission} SAR`);
        }
      }
    }
    
    // Unified event for dashboards/rooms (order.updated)
    try {
      const orderInfo = await pool.query(
        `SELECT user_id, store_id, driver_id FROM orders WHERE id = $1`,
        [orderId]
      );
      const row = orderInfo.rows[0] || {};
      emitOrderUpdated({
        orderId: Number(orderId),
        status: newStatus,
        storeId: row.store_id || null,
        driverId: row.driver_id || null,
        userId: row.user_id || null,
      });
    } catch (e) {
      console.warn('emitOrderUpdated failed:', e?.message || e);
    }

    // إرسال إشعار Socket.IO للزبون
    if (io) {
      const orderResult = await pool.query(`
        SELECT user_id FROM orders WHERE id = $1;
      `, [orderId]);
      
      if (orderResult.rows.length > 0) {
        io.to(`customer-${orderResult.rows[0].user_id}`).emit('order_status_update', {
          order_id: orderId,
          status: newStatus,
          timestamp: new Date().toISOString()
        });
      }
      
      // إشعار للأدمن
      io.to('admin-dashboard').emit('order_status_changed', {
        order_id: orderId,
        status: newStatus,
        timestamp: new Date().toISOString()
      });
    }
    
    await client.query('COMMIT');
    res.json({ message: "تم تحديث حالة الطلب", status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Update order status error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث حالة الطلب" });
  } finally {
    client.release();
  }
});

// ================= API Key Authentication Middleware =================

function apiKeyMiddleware(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({ 
        success: false,
        message: "API Key مطلوب. يرجى إرسال X-API-Key في Header أو api_key في Query." 
      });
    }

    // التحقق من API Key في قاعدة البيانات
    pool.query(
      `SELECT * FROM api_keys WHERE api_key = $1 AND is_active = true 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [apiKey]
    ).then(result => {
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false,
          message: "API Key غير صالح أو منتهي الصلاحية" 
        });
      }

      const keyData = result.rows[0];
      
      // تحديث last_used_at
      pool.query(
        `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
        [keyData.id]
      ).catch(err => console.error("Error updating last_used_at:", err));

      // إضافة معلومات API Key للطلب
      req.apiKey = keyData;
      next();
    }).catch(err => {
      console.error("API Key validation error:", err);
      res.status(500).json({ 
        success: false,
        message: "حدث خطأ في التحقق من API Key" 
      });
    });
  } catch (err) {
    console.error("API Key middleware error:", err);
    res.status(500).json({ 
      success: false,
      message: "حدث خطأ في التحقق من API Key" 
    });
  }
}

// ================= POS Sync API (Webhooks) =================

// POS Inventory Sync Endpoint
app.post("/api/v1/inventory/sync", apiKeyMiddleware, async (req, res) => {
  const startTime = Date.now();
  let logId = null;

  try {
    const { barcode, quantity_sold, store_id } = req.body;

    // التحقق من البيانات المطلوبة
    if (!barcode || quantity_sold === undefined || !store_id) {
      const errorMsg = "البيانات المطلوبة: barcode, quantity_sold, store_id";
      
      // تسجيل الخطأ
      const logResult = await pool.query(`
        INSERT INTO sync_logs (
          api_key_id, store_id, barcode, quantity_sold, 
          quantity_before, quantity_after, status, error_message, request_data
        )
        VALUES ($1, $2, $3, $4, 0, 0, 'error', $5, $6)
        RETURNING id;
      `, [
        req.apiKey.id,
        store_id,
        barcode || null,
        quantity_sold || 0,
        errorMsg,
        JSON.stringify(req.body)
      ]);
      logId = logResult.rows[0].id;

      return res.status(400).json({
        success: false,
        message: errorMsg,
        log_id: logId
      });
    }

    // البحث عن المنتج بالـ barcode
    const productResult = await pool.query(
      `SELECT id FROM products WHERE barcode = $1`,
      [barcode]
    );

    if (productResult.rows.length === 0) {
      const errorMsg = `المنتج بالـ barcode "${barcode}" غير موجود`;
      
      const logResult = await pool.query(`
        INSERT INTO sync_logs (
          api_key_id, store_id, barcode, quantity_sold, 
          quantity_before, quantity_after, status, error_message, request_data
        )
        VALUES ($1, $2, $3, $4, 0, 0, 'error', $5, $6)
        RETURNING id;
      `, [
        req.apiKey.id,
        store_id,
        barcode,
        quantity_sold,
        errorMsg,
        JSON.stringify(req.body)
      ]);
      logId = logResult.rows[0].id;

      return res.status(404).json({
        success: false,
        message: errorMsg,
        log_id: logId
      });
    }

    const productId = productResult.rows[0].id;

    // البحث عن المخزون في المتجر
    const inventoryResult = await pool.query(`
      SELECT id, quantity, barcode 
      FROM store_inventory 
      WHERE store_id = $1 AND (product_id = $2 OR barcode = $3)
      LIMIT 1;
    `, [store_id, productId, barcode]);

    if (inventoryResult.rows.length === 0) {
      const errorMsg = `المخزون غير موجود في المتجر ${store_id} للمنتج ${barcode}`;
      
      const logResult = await pool.query(`
        INSERT INTO sync_logs (
          api_key_id, store_id, barcode, product_id, quantity_sold, 
          quantity_before, quantity_after, status, error_message, request_data
        )
        VALUES ($1, $2, $3, $4, $5, 0, 0, 'error', $6, $7)
        RETURNING id;
      `, [
        req.apiKey.id,
        store_id,
        barcode,
        productId,
        quantity_sold,
        errorMsg,
        JSON.stringify(req.body)
      ]);
      logId = logResult.rows[0].id;

      return res.status(404).json({
        success: false,
        message: errorMsg,
        log_id: logId
      });
    }

    const inventory = inventoryResult.rows[0];
    const quantityBefore = parseInt(inventory.quantity);
    const quantityAfter = Math.max(0, quantityBefore - parseInt(quantity_sold));

    // تحديث المخزون
    await pool.query(`
      UPDATE store_inventory 
      SET quantity = $1, 
          last_updated = NOW(),
          is_available = CASE WHEN $1 > 0 THEN true ELSE false END
      WHERE id = $2;
    `, [quantityAfter, inventory.id]);

    // تسجيل العملية بنجاح
    const logResult = await pool.query(`
      INSERT INTO sync_logs (
        api_key_id, store_id, barcode, product_id, quantity_sold, 
        quantity_before, quantity_after, status, request_data, response_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'success', $8, $9)
      RETURNING id;
    `, [
      req.apiKey.id,
      store_id,
      barcode,
      productId,
      quantity_sold,
      quantityBefore,
      quantityAfter,
      JSON.stringify(req.body),
      JSON.stringify({ 
        success: true, 
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        processing_time_ms: Date.now() - startTime
      })
    ]);
    logId = logResult.rows[0].id;

    // إرسال إشعار Real-time للـ Frontend
    emitInventoryUpdate(parseInt(store_id), productId, quantityAfter);

    res.json({
      success: true,
      message: "تم تحديث المخزون بنجاح",
      data: {
        barcode,
        product_id: productId,
        store_id: parseInt(store_id),
        quantity_before: quantityBefore,
        quantity_sold: parseInt(quantity_sold),
        quantity_after: quantityAfter,
        processing_time_ms: Date.now() - startTime
      },
      log_id: logId
    });

  } catch (err) {
    console.error("POS Sync error:", err);
    
    // تسجيل الخطأ
    try {
      const logResult = await pool.query(`
        INSERT INTO sync_logs (
          api_key_id, store_id, barcode, quantity_sold, 
          quantity_before, quantity_after, status, error_message, request_data
        )
        VALUES ($1, $2, $3, $4, 0, 0, 'error', $5, $6)
        RETURNING id;
      `, [
        req.apiKey?.id || null,
        req.body?.store_id || null,
        req.body?.barcode || null,
        req.body?.quantity_sold || 0,
        err.message,
        JSON.stringify(req.body)
      ]);
      logId = logResult.rows[0].id;
    } catch (logErr) {
      console.error("Error logging sync error:", logErr);
    }

    res.status(500).json({
      success: false,
      message: "حدث خطأ في معالجة الطلب",
      error: err.message,
      log_id: logId
    });
  }
});

// جلب Sync Logs (للمراقبة)
app.get("/api/admin/sync-logs", authMiddleware, async (req, res) => {
  try {
    const { limit = 100, offset = 0, store_id, status } = req.query;
    
    let query = `
      SELECT 
        sl.*,
        ak.key_name as api_key_name,
        s.name as store_name,
        p.name as product_name
      FROM sync_logs sl
      LEFT JOIN api_keys ak ON sl.api_key_id = ak.id
      LEFT JOIN stores s ON sl.store_id = s.id
      LEFT JOIN products p ON sl.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (store_id) {
      query += ` AND sl.store_id = $${paramCount++}`;
      params.push(store_id);
    }
    if (status) {
      query += ` AND sl.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY sl.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    
    // Count query
    let countQuery = 'SELECT COUNT(*) as total FROM sync_logs WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;
    if (store_id) {
      countQuery += ` AND store_id = $${countParamCount++}`;
      countParams.push(store_id);
    }
    if (status) {
      countQuery += ` AND status = $${countParamCount++}`;
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error("Get sync logs error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب السجلات" });
  }
});

// إدارة API Keys
app.get("/api/admin/api-keys", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ak.*,
        s.name as store_name,
        COUNT(sl.id) as total_requests,
        MAX(sl.created_at) as last_sync_at
      FROM api_keys ak
      LEFT JOIN stores s ON ak.store_id = s.id
      LEFT JOIN sync_logs sl ON ak.id = sl.api_key_id
      GROUP BY ak.id, s.name
      ORDER BY ak.created_at DESC;
    `);
    res.json({ api_keys: result.rows });
  } catch (err) {
    console.error("Get API keys error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب API Keys" });
  }
});

app.post("/api/admin/api-keys", authMiddleware, async (req, res) => {
  try {
    const { key_name, store_id, expires_at } = req.body;
    
    // توليد API Key عشوائي آمن
    const apiKey = `tom_${crypto.randomBytes(32).toString('hex')}`;
    
    const result = await pool.query(`
      INSERT INTO api_keys (key_name, api_key, store_id, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [key_name, apiKey, store_id || null, expires_at || null]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create API key error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء API Key" });
  }
});

app.delete("/api/admin/api-keys/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE api_keys SET is_active = false WHERE id = $1", [id]);
    res.json({ message: "تم تعطيل API Key" });
  } catch (err) {
    console.error("Delete API key error:", err);
    res.status(500).json({ message: "حدث خطأ في تعطيل API Key" });
  }
});

// ================= Frontend Route (/) =================
// NOTE: This catch-all route will be moved to the END of the file (after all API routes)
// to ensure all API routes are handled first before serving the React app

// ================= تشغيل السيرفر بعد تهيئة DB =================

// دالة لإرسال تحديثات المخزون Real-time
function emitInventoryUpdate(storeId, productId, newQuantity) {
  if (io) {
    io.to(`store-${storeId}`).emit('inventory-updated', {
      product_id: productId,
      store_id: storeId,
      quantity: newQuantity,
      timestamp: new Date().toISOString()
    });
    // إرسال أيضاً لجميع العملاء (للتحديث العام)
    io.emit('inventory-updated', {
      product_id: productId,
      store_id: storeId,
      quantity: newQuantity,
      timestamp: new Date().toISOString()
    });
  }
}

// إنشاء Super Admin من سطر الأوامر (آمن، بدون fallback)
async function createSuperAdminCLI() {
  if (!pool || !isDbConnected) {
    throw new Error('قاعدة البيانات غير متاحة. شغّل PostgreSQL أولاً.');
  }
  const email = (process.env.CREATE_SUPER_ADMIN_EMAIL || '').trim();
  const name = (process.env.CREATE_SUPER_ADMIN_NAME || '').trim();
  const password = process.env.CREATE_SUPER_ADMIN_PASSWORD || '';
  if (!email || !name || !password) {
    throw new Error(
      'استخدم متغيرات البيئة: CREATE_SUPER_ADMIN_EMAIL, CREATE_SUPER_ADMIN_NAME, CREATE_SUPER_ADMIN_PASSWORD'
    );
  }
  if (password.length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE users SET name = $1, full_name = $1, password_hash = $2, role = 'super_admin', is_active = true, status = 'active', updated_at = NOW() WHERE email = $3`,
      [name, passwordHash, email]
    );
    console.log('✅ تم تحديث Super Admin:', email);
  } else {
    await pool.query(
      `INSERT INTO users (name, full_name, email, password_hash, role, is_active, status) VALUES ($1, $1, $2, $3, 'super_admin', true, 'active')`,
      [name, email, passwordHash]
    );
    console.log('✅ تم إنشاء Super Admin:', email);
  }
  console.log('   سجّل الدخول من /admin/login بالبريد وكلمة المرور التي حددتها.');
}

const createSuperAdminMode = process.argv.includes('--create-super-admin');

initDb()
  .catch(err => {
    console.error("⚠️ [DB Init] Initialization failed (running in simulation mode):", err.message);
    if (createSuperAdminMode) {
      console.error('إنشاء Super Admin يتطلب تشغيل PostgreSQL.');
      process.exit(1);
    }
  })
  .then(() => {
    if (createSuperAdminMode) {
      createSuperAdminCLI()
        .then(() => { process.exit(0); })
        .catch(err => {
          console.error('❌', err.message || err);
          process.exit(1);
        });
      return;
    }
    // ================= Advanced Admin API Endpoints =================

// ================= Prediction Engine (Demand Forecasting) =================
// نظام التنبؤ بالطلب - توقعات التجهيز
app.get("/api/admin/prediction/demand-forecast", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { hours_ahead = 1 } = req.query; // عدد الساعات القادمة (افتراضي: ساعة واحدة)
    
    // جلب البيانات التاريخية للطلبات في آخر 7 أيام
    const historicalData = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name_ar,
        p.name_en,
        DATE_TRUNC('hour', o.created_at) as order_hour,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.id) as order_count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'DELIVERED'
        AND o.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY p.id, p.name_ar, p.name_en, DATE_TRUNC('hour', o.created_at)
      ORDER BY order_hour DESC, total_quantity DESC;
    `);
    
    // حساب متوسط الطلب لكل منتج في الساعة الحالية من الأيام السابقة
    const currentHour = new Date().getHours();
    const predictions = [];
    
    const productMap = new Map();
    
    historicalData.rows.forEach(row => {
      const hour = new Date(row.order_hour).getHours();
      if (hour === currentHour || hour === (currentHour + parseInt(hours_ahead)) % 24) {
        if (!productMap.has(row.product_id)) {
          productMap.set(row.product_id, {
            product_id: row.product_id,
            name_ar: row.name_ar,
            name_en: row.name_en,
            quantities: [],
            order_counts: []
          });
        }
        const product = productMap.get(row.product_id);
        product.quantities.push(parseInt(row.total_quantity));
        product.order_counts.push(parseInt(row.order_count));
      }
    });
    
    // حساب التوقعات
    productMap.forEach((product, productId) => {
      const avgQuantity = product.quantities.reduce((a, b) => a + b, 0) / product.quantities.length;
      const avgOrders = product.order_counts.reduce((a, b) => a + b, 0) / product.order_counts.length;
      
      // تطبيق معامل النمو (افتراضي: 1.1 = نمو 10%)
      const predictedQuantity = Math.ceil(avgQuantity * 1.1);
      const predictedOrders = Math.ceil(avgOrders * 1.1);
      
      predictions.push({
        product_id: productId,
        name_ar: product.name_ar,
        name_en: product.name_en,
        predicted_quantity: predictedQuantity,
        predicted_orders: predictedOrders,
        confidence: product.quantities.length > 3 ? 'high' : product.quantities.length > 1 ? 'medium' : 'low',
        historical_avg: Math.ceil(avgQuantity)
      });
    });
    
    // ترتيب حسب الكمية المتوقعة
    predictions.sort((a, b) => b.predicted_quantity - a.predicted_quantity);
    
    res.json({
      predictions: predictions.slice(0, 20), // أعلى 20 منتج متوقع
      hours_ahead: parseInt(hours_ahead),
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Demand forecast error:", err);
    res.status(500).json({ message: "حدث خطأ في حساب التوقعات" });
  }
});

// ================= Average Time Metrics (Mission Control Gauges) =================
// مقاييس متوسط الوقت - عدادات سرعة Mission Control
app.get("/api/admin/metrics/average-times", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    // متوسط وقت التحضير (من confirmed إلى out_for_delivery)
    const prepTimeRes = await pool.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 60) as avg_prep_minutes
      FROM orders o
      WHERE o.status IN ('ASSIGNED', 'PICKED_UP', 'DELIVERED')
        AND o.created_at >= NOW() - INTERVAL '24 hours'
        AND o.updated_at IS NOT NULL;
    `);
    
    // متوسط وقت التوصيل (من out_for_delivery إلى delivered)
    const deliveryTimeRes = await pool.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 60) as avg_delivery_minutes
      FROM orders o
      WHERE o.status = 'DELIVERED'
        AND o.created_at >= NOW() - INTERVAL '24 hours'
        AND o.updated_at IS NOT NULL;
    `);
    
    // الطلبات المتأخرة (> 15 دقيقة)
    const delayedOrdersRes = await pool.query(`
      SELECT COUNT(*) as delayed_count
      FROM orders o
      WHERE o.status IN ('PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP')
        AND EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 60 > 15;
    `);
    
    const avgPrepTime = parseFloat(prepTimeRes.rows[0]?.avg_prep_minutes || 0);
    const avgDeliveryTime = parseFloat(deliveryTimeRes.rows[0]?.avg_delivery_minutes || 0);
    const delayedOrders = parseInt(delayedOrdersRes.rows[0]?.delayed_count || 0);
    
    res.json({
      avg_prep_time_minutes: Math.round(avgPrepTime * 10) / 10,
      avg_delivery_time_minutes: Math.round(avgDeliveryTime * 10) / 10,
      delayed_orders_count: delayedOrders,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Average times metrics error:", err);
    res.status(500).json({ message: "حدث خطأ في حساب المقاييس" });
  }
});

// ================= Accountant Endpoints =================
// Real-time Financial Data (Elite Dark Store Dashboard)
app.get("/api/admin/financial/realtime", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Real-time revenue (active orders)
    const realtimeRevenueRes = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE status IN ('PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED')
        AND DATE(created_at) = $1;
    `, [today])
    
    // Today's total revenue
    const todayRevenueRes = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE DATE(created_at) = $1;
    `, [today])
    
    // Rider commissions (10% of real-time revenue)
    const realtimeRevenue = parseFloat(realtimeRevenueRes.rows[0].revenue)
    const todayRevenue = parseFloat(todayRevenueRes.rows[0].revenue)
    const riderCommissions = realtimeRevenue * 0.1
    const operationalCost = realtimeRevenue * 0.15
    const profitMargin = realtimeRevenue - riderCommissions - operationalCost
    
    // Revenue per minute (based on hours elapsed today)
    const hoursElapsed = new Date().getHours() + (new Date().getMinutes() / 60)
    const revenuePerMinute = hoursElapsed > 0 ? todayRevenue / (hoursElapsed * 60) : 0
    
    res.json({
      realTimeRevenue: realtimeRevenue,
      todayRevenue: todayRevenue,
      riderCommissions: riderCommissions,
      operationalCost: operationalCost,
      profitMargin: profitMargin,
      revenuePerMinute: revenuePerMinute
    })
  } catch (err) {
    console.error("Real-time financial data error:", err)
    res.status(500).json({ message: "حدث خطأ في جلب البيانات المالية اللحظية" })
  }
})

// Profit Reports
app.get("/api/admin/accountant/profit-report", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        DATE(o.created_at) as date,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        SUM(oi.quantity * COALESCE(p.cost_price, 0)) as total_cost,
        SUM(o.total_amount) - SUM(oi.quantity * COALESCE(p.cost_price, 0)) as profit,
        SUM(o.delivery_fee) as total_delivery_fees
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'DELIVERED'
    `;
    
    const params = [];
    if (start_date) {
      params.push(start_date);
      query += ` AND DATE(o.created_at) >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND DATE(o.created_at) <= $${params.length}`;
    }
    
    query += ` GROUP BY DATE(o.created_at) ORDER BY date DESC LIMIT 100;`;
    
    const result = await pool.query(query, params);
    await logAuditAction(req, 'VIEW_PROFIT_REPORT', 'report', null, null, { start_date, end_date });
    
    res.json({ reports: result.rows });
  } catch (err) {
    console.error("Profit report error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب تقرير الأرباح" });
  }
});

// Cost Tracking
app.get("/api/admin/accountant/cost-tracking", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name_ar,
        p.name_en,
        p.cost_price,
        p.price,
        (p.price - COALESCE(p.cost_price, 0)) as profit_per_unit,
        CASE 
          WHEN p.cost_price > 0 THEN 
            ROUND(((p.price - p.cost_price) / p.cost_price * 100)::numeric, 2)
          ELSE NULL
        END as profit_margin_percentage
      FROM products p
      WHERE p.cost_price IS NOT NULL
      ORDER BY p.cost_price DESC;
    `);
    
    await logAuditAction(req, 'VIEW_COST_TRACKING', 'products', null, null, null);
    res.json({ products: result.rows });
  } catch (err) {
    console.error("Cost tracking error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب تتبع التكاليف" });
  }
});

// P&L Statement
app.get("/api/admin/accountant/pl-statement", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Revenue
    let revenueQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
      WHERE status = 'DELIVERED'
    `;
    const params = [];
    if (start_date) {
      params.push(start_date);
      revenueQuery += ` AND DATE(created_at) >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      revenueQuery += ` AND DATE(created_at) <= $${params.length}`;
    }
    
    const revenueRes = await pool.query(revenueQuery, params);
    
    // Cost of Goods Sold
    let cogsQuery = `
      SELECT COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as cogs
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 'DELIVERED'
    `;
    if (start_date) {
      cogsQuery += ` AND DATE(o.created_at) >= $${params.length - 1}`;
    }
    if (end_date) {
      cogsQuery += ` AND DATE(o.created_at) <= $${params.length}`;
    }
    const cogsRes = await pool.query(cogsQuery, params);
    
    // Operating Expenses
    let expensesQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM operational_expenses
      WHERE 1=1
    `;
    const expParams = [];
    if (start_date) {
      expParams.push(start_date);
      expensesQuery += ` AND expense_date >= $${expParams.length}`;
    }
    if (end_date) {
      expParams.push(end_date);
      expensesQuery += ` AND expense_date <= $${expParams.length}`;
    }
    const expensesRes = await pool.query(expensesQuery, expParams);
    
    const revenue = parseFloat(revenueRes.rows[0].total_revenue);
    const cogs = parseFloat(cogsRes.rows[0].cogs);
    const expenses = parseFloat(expensesRes.rows[0].total_expenses);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    
    res.json({
      revenue,
      cost_of_goods_sold: cogs,
      gross_profit: grossProfit,
      operating_expenses: expenses,
      net_profit: netProfit,
      profit_margin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0
    });
  } catch (err) {
    console.error("P&L statement error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب بيان الأرباح والخسائر" });
  }
});

// Supplier Payments
app.get("/api/admin/accountant/supplier-payments", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM supplier_payments
      ORDER BY invoice_date DESC, created_at DESC;
    `);
    res.json({ payments: result.rows });
  } catch (err) {
    console.error("Supplier payments error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب مدفوعات الموردين" });
  }
});

app.post("/api/admin/accountant/supplier-payments", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const { supplier_name, invoice_number, invoice_date, amount, vat_amount, total_amount, status, payment_date, payment_method, notes } = req.body;
    
    const result = await pool.query(
      `INSERT INTO supplier_payments (supplier_name, invoice_number, invoice_date, amount, vat_amount, total_amount, status, payment_date, payment_method, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *;`,
      [supplier_name, invoice_number, invoice_date, amount, vat_amount || 0, total_amount || amount, status || 'pending', payment_date, payment_method, notes, req.user.id]
    );
    
    await logAuditAction(req, 'CREATE_SUPPLIER_PAYMENT', 'supplier_payment', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create supplier payment error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء دفعة المورد" });
  }
});

// Sales Analytics by Profit Margin
app.get("/api/admin/accountant/sales-analytics", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const { start_date, end_date, limit = 20 } = req.query;
    
    let query = `
      SELECT 
        p.id,
        p.name_ar,
        p.name_en,
        p.cost_price,
        p.price,
        COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
        COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) - COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_profit,
        CASE 
          WHEN p.cost_price > 0 THEN 
            ROUND(((p.price - p.cost_price) / p.cost_price * 100)::numeric, 2)
          ELSE NULL
        END as profit_margin_percentage
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'DELIVERED'
    `;
    
    const params = [];
    if (start_date) {
      params.push(start_date);
      query += ` AND DATE(o.created_at) >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND DATE(o.created_at) <= $${params.length}`;
    }
    
    query += ` GROUP BY p.id, p.name_ar, p.name_en, p.cost_price, p.price
               HAVING COALESCE(SUM(oi.quantity), 0) > 0
               ORDER BY total_profit DESC
               LIMIT $${params.length + 1};`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    res.json({ products: result.rows });
  } catch (err) {
    console.error("Sales analytics error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب تحليلات المبيعات" });
  }
});

// Profit Margin Leakage Detection
app.get("/api/admin/accountant/profit-leakage", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name_ar,
        p.name_en,
        c.name_ar as category_name_ar,
        c.name_en as category_name_en,
        p.cost_price,
        p.price,
        cm.markup_percentage as expected_margin,
        CASE 
          WHEN p.cost_price > 0 THEN 
            ROUND(((p.price - p.cost_price) / p.cost_price * 100)::numeric, 2)
          ELSE NULL
        END as actual_margin,
        CASE 
          WHEN cm.markup_percentage IS NOT NULL AND p.cost_price > 0 THEN
            (p.cost_price * (1 + cm.markup_percentage / 100)) - p.price
          ELSE 0
        END as leakage_amount
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN category_markups cm ON c.id = cm.category_id
      WHERE p.cost_price IS NOT NULL
        AND cm.markup_percentage IS NOT NULL
        AND (p.cost_price * (1 + cm.markup_percentage / 100)) > p.price
      ORDER BY leakage_amount DESC
      LIMIT 50;
    `);
    res.json({ products: result.rows });
  } catch (err) {
    console.error("Profit leakage error:", err);
    res.status(500).json({ message: "حدث خطأ في اكتشاف تسرب الربح" });
  }
});

// ================= Marketing Endpoints =================
// Coupons Management
app.get("/api/admin/marketing/coupons", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MARKETING), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM coupons ORDER BY created_at DESC;
    `);
    res.json({ coupons: result.rows });
  } catch (err) {
    console.error("Get coupons error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الكوبونات" });
  }
});

app.post("/api/admin/marketing/coupons", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MARKETING), async (req, res) => {
  try {
    const { code, name_ar, name_en, description_ar, description_en, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, valid_from, valid_until } = req.body;
    
    const result = await pool.query(
      `INSERT INTO coupons (code, name_ar, name_en, description_ar, description_en, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *;`,
      [code, name_ar, name_en, description_ar, description_en, discount_type, discount_value, min_purchase_amount || 0, max_discount_amount, usage_limit, valid_from, valid_until]
    );
    
    await logAuditAction(req, 'CREATE_COUPON', 'coupon', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create coupon error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء الكوبون" });
  }
});

// ================= Promotions Endpoints =================
// BOGO Offers
app.get("/api/admin/promotions/bogo", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PROMOTIONS), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, 
        p1.name_ar as buy_product_name_ar, p1.name_en as buy_product_name_en,
        p2.name_ar as get_product_name_ar, p2.name_en as get_product_name_en
      FROM bogo_offers b
      LEFT JOIN products p1 ON b.buy_product_id = p1.id
      LEFT JOIN products p2 ON b.get_product_id = p2.id
      ORDER BY b.created_at DESC;
    `);
    res.json({ offers: result.rows });
  } catch (err) {
    console.error("Get BOGO error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب عروض BOGO" });
  }
});

app.post("/api/admin/promotions/bogo", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PROMOTIONS), async (req, res) => {
  try {
    const { name_ar, name_en, buy_product_id, get_product_id, buy_quantity, get_quantity, valid_from, valid_until } = req.body;
    
    const result = await pool.query(
      `INSERT INTO bogo_offers (name_ar, name_en, buy_product_id, get_product_id, buy_quantity, get_quantity, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [name_ar, name_en, buy_product_id, get_product_id, buy_quantity || 1, get_quantity || 1, valid_from, valid_until]
    );
    
    await logAuditAction(req, 'CREATE_BOGO', 'bogo_offer', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create BOGO error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء عرض BOGO" });
  }
});

// Flash Sales
app.get("/api/admin/promotions/flash-sales", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PROMOTIONS), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fs.*, 
        COUNT(fsp.product_id) as product_count
      FROM flash_sales fs
      LEFT JOIN flash_sale_products fsp ON fs.id = fsp.flash_sale_id
      GROUP BY fs.id
      ORDER BY fs.start_time DESC;
    `);
    res.json({ flash_sales: result.rows });
  } catch (err) {
    console.error("Get flash sales error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب العروض السريعة" });
  }
});

app.post("/api/admin/promotions/flash-sales", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PROMOTIONS), async (req, res) => {
  try {
    const { name_ar, name_en, description_ar, description_en, discount_percentage, start_time, end_time, products } = req.body;
    
    const result = await pool.query(
      `INSERT INTO flash_sales (name_ar, name_en, description_ar, description_en, discount_percentage, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [name_ar, name_en, description_ar, description_en, discount_percentage, start_time, end_time]
    );
    
    const flashSaleId = result.rows[0].id;
    
    // Add products to flash sale
    if (products && Array.isArray(products)) {
      for (const product of products) {
        await pool.query(
          `INSERT INTO flash_sale_products (flash_sale_id, product_id, sale_price, stock_limit)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (flash_sale_id, product_id) DO UPDATE SET sale_price = EXCLUDED.sale_price, stock_limit = EXCLUDED.stock_limit;`,
          [flashSaleId, product.product_id, product.sale_price, product.stock_limit]
        );
      }
    }
    
    await logAuditAction(req, 'CREATE_FLASH_SALE', 'flash_sale', flashSaleId, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create flash sale error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء العرض السريع" });
  }
});

// ================= Price Tier Rules Endpoints (Shopify-style) =================
app.get("/api/admin/pricing/tier-rules", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM price_tier_rules ORDER BY min_price ASC`);
    res.json({ rules: result.rows });
  } catch (err) {
    console.error("Get price tier rules error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب قواعد التسعير" });
  }
});

app.post("/api/admin/pricing/tier-rules", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { min_price, max_price, markup_percentage } = req.body;
    
    // Validate inputs
    if (min_price === undefined || max_price === undefined || markup_percentage === undefined) {
       return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    const min = parseFloat(min_price);
    const max = parseFloat(max_price);
    const markup = parseFloat(markup_percentage);

    const result = await pool.query(
      `INSERT INTO price_tier_rules (min_price, max_price, markup_percentage)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [min, max, markup]
    );
    
    if (result.rows.length === 0) {
        throw new Error("Failed to insert rule (Simulated DB?)");
    }

    // Apply new rule to eligible unlocked products
    // Using explicit casting to avoid type issues
    await pool.query(
      `UPDATE products 
       SET price = (cost_price + (cost_price * $1 / 100)) * 1.15,
           price_per_unit = (cost_price + (cost_price * $1 / 100)) * 1.15
       WHERE cost_price >= $2 AND cost_price <= $3 
         AND is_price_locked = false 
         AND cost_price IS NOT NULL;`,
      [markup, min, max]
    );
    
    await logAuditAction(req, 'CREATE_PRICE_TIER_RULE', 'price_tier_rule', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create price tier rule error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء قاعدة التسعير: " + err.message });
  }
});

app.delete("/api/admin/pricing/tier-rules/:id", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM price_tier_rules WHERE id = $1`, [id]);
    await logAuditAction(req, 'DELETE_PRICE_TIER_RULE', 'price_tier_rule', id, null, null);
    res.json({ message: "تم حذف القاعدة بنجاح" });
  } catch (err) {
    console.error("Delete price tier rule error:", err);
    res.status(500).json({ message: "حدث خطأ في حذف القاعدة" });
  }
});

// ================= Category Markup Endpoints =================
app.get("/api/admin/pricing/category-markups", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cm.*, c.name_ar, c.name_en
      FROM category_markups cm
      JOIN categories c ON cm.category_id = c.id
      ORDER BY cm.created_at DESC;
    `);
    res.json({ markups: result.rows });
  } catch (err) {
    console.error("Get category markups error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب هوامش الفئات" });
  }
});

app.post("/api/admin/pricing/category-markups", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { category_id, markup_percentage, vat_percentage } = req.body;
    
    const result = await pool.query(
      `INSERT INTO category_markups (category_id, markup_percentage, vat_percentage)
       VALUES ($1, $2, $3)
       ON CONFLICT (category_id) DO UPDATE SET 
         markup_percentage = EXCLUDED.markup_percentage,
         vat_percentage = EXCLUDED.vat_percentage,
         updated_at = NOW()
       RETURNING *;`,
      [category_id, markup_percentage, vat_percentage || 15.00]
    );
    
    // Apply markup to all products in category
    await pool.query(
      `UPDATE products 
       SET price = (cost_price + (cost_price * $1 / 100)) * (1 + $2 / 100),
           price_per_unit = (cost_price + (cost_price * $1 / 100)) * (1 + $2 / 100)
       WHERE category_id = $3 AND cost_price IS NOT NULL AND override_markup = false;`,
      [markup_percentage, vat_percentage || 15.00, category_id]
    );
    
    await logAuditAction(req, 'CREATE_CATEGORY_MARKUP', 'category_markup', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create category markup error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء هامش الفئة" });
  }
});

// ================= Courier Wallet Endpoints =================
app.get("/api/admin/delivery/courier-wallets", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DELIVERY_MANAGER), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cw.*, d.id as driver_id, u.name as driver_name, u.phone
      FROM courier_wallets cw
      JOIN drivers d ON cw.driver_id = d.id
      JOIN users u ON d.user_id = u.id
      ORDER BY cw.payable_balance DESC;
    `);
    res.json({ wallets: result.rows });
  } catch (err) {
    console.error("Get courier wallets error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب محافظ Riders" });
  }
});

// معالجة دفع COD من قبل المحاسب
app.post("/api/admin/accountant/process-cod-payment", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const { driver_id, order_id, collected_amount, notes } = req.body;
    
    if (!driver_id || !order_id || !collected_amount) {
      return res.status(400).json({ message: "معرف Rider ورقم الطلب والمبلغ مطلوبة" });
    }
    
    // تحديث المحفظة: خصم المبلغ المحصل من cod_balance
    await pool.query(`
      UPDATE courier_wallets
      SET cod_balance = cod_balance - $1,
          total_collected = total_collected + $1,
          last_updated = NOW()
      WHERE driver_id = $2;
    `, [collected_amount, driver_id]);
    
    // تسجيل المعاملة
    await pool.query(`
      INSERT INTO courier_wallet_transactions (driver_id, transaction_type, amount, order_id, description, processed_by)
      VALUES ($1, 'cod_payment', $2, $3, $4, $5);
    `, [driver_id, -collected_amount, order_id, notes || `دفع COD للطلب #${order_id}`, req.user.id]);
    
    await logAuditAction(req, 'PROCESS_COD_PAYMENT', 'courier_wallet', null, driver_id, { order_id, collected_amount });
    
    // إرسال إشعار Socket.IO للمندوب
    if (io) {
      const walletResult = await pool.query(`
        SELECT payable_balance FROM courier_wallets WHERE driver_id = $1;
      `, [driver_id]);
      
      io.to(`driver-${driver_id}`).emit('cod_payment_processed', {
        order_id: order_id,
        amount: collected_amount,
        new_balance: walletResult.rows[0]?.payable_balance || 0,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ message: "تم معالجة الدفع بنجاح" });
  } catch (err) {
    console.error("Process COD payment error:", err);
    res.status(500).json({ message: "حدث خطأ في معالجة الدفع" });
  }
});

// جلب تقرير عمولات المندوبين
app.get("/api/admin/accountant/courier-commissions", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const { start_date, end_date, driver_id } = req.query;
    
    let query = `
      SELECT 
        cwt.driver_id,
        u.name as driver_name,
        COUNT(CASE WHEN cwt.transaction_type = 'commission' THEN 1 END) as total_commissions,
        SUM(CASE WHEN cwt.transaction_type = 'commission' THEN cwt.amount ELSE 0 END) as total_commission_amount,
        SUM(CASE WHEN cwt.transaction_type = 'cod_collection' THEN cwt.amount ELSE 0 END) as total_cod_collected,
        SUM(CASE WHEN cwt.transaction_type = 'cod_payment' THEN ABS(cwt.amount) ELSE 0 END) as total_cod_paid,
        cw.payable_balance as current_balance
      FROM courier_wallet_transactions cwt
      JOIN drivers d ON cwt.driver_id = d.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN courier_wallets cw ON cwt.driver_id = cw.driver_id
      WHERE 1=1
    `;
    
    const params = [];
    if (start_date) {
      params.push(start_date);
      query += ` AND DATE(cwt.created_at) >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND DATE(cwt.created_at) <= $${params.length}`;
    }
    if (driver_id) {
      params.push(driver_id);
      query += ` AND cwt.driver_id = $${params.length}`;
    }
    
    query += ` GROUP BY cwt.driver_id, u.name, cw.payable_balance ORDER BY total_commission_amount DESC;`;
    
    const result = await pool.query(query, params);
    res.json({ reports: result.rows });
  } catch (err) {
    console.error("Get courier commissions error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب تقرير العمولات" });
  }
});

// تعديل رصيد محفظة المندوب (يدوي)
app.post("/api/admin/delivery/courier-wallets/:driverId/adjust-balance", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DELIVERY_MANAGER), async (req, res) => {
  try {
    const { driverId } = req.params;
    const { amount, reason, transaction_type } = req.body;
    
    if (!amount || !reason) {
      return res.status(400).json({ message: "المبلغ والسبب مطلوبان" });
    }
    
    await pool.query(`
      UPDATE courier_wallets
      SET payable_balance = COALESCE(payable_balance, 0) + $1,
          last_updated = NOW()
      WHERE driver_id = $2;
    `, [amount, driverId]);
    
    await pool.query(`
      INSERT INTO courier_wallet_transactions (driver_id, transaction_type, amount, description, processed_by)
      VALUES ($1, $2, $3, $4, $5);
    `, [driverId, transaction_type || 'adjustment', amount, reason, req.user.id]);
    
    await logAuditAction(req, 'ADJUST_COURIER_BALANCE', 'courier_wallet', null, driverId, { amount, reason });
    
    res.json({ message: "تم تعديل الرصيد بنجاح" });
  } catch (err) {
    console.error("Adjust balance error:", err);
    res.status(500).json({ message: "حدث خطأ في تعديل الرصيد" });
  }
});

// جلب سجل معاملات محفظة المندوب
// تحديث الإعدادات المالية للمندوب (العمولة والمكافآت)
app.put("/api/admin/drivers/:driverId/financials", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { driverId } = req.params;
    const { base_commission_per_order, bonus_threshold, bonus_amount, payout_frequency } = req.body;

    await pool.query(`
      UPDATE drivers 
      SET 
        base_commission_per_order = $1,
        bonus_threshold = $2,
        bonus_amount = $3,
        payout_frequency = $4
      WHERE id = $5;
    `, [
      base_commission_per_order || 9.00,
      bonus_threshold || 500,
      bonus_amount || 150.00,
      payout_frequency || 'Weekly',
      driverId
    ]);

    res.json({ success: true, message: "تم تحديث الإعدادات المالية للمندوب" });
  } catch (err) {
    console.error("Update driver financials error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الإعدادات المالية" });
  }
});

app.get("/api/admin/drivers/:driverId/wallet-history", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DELIVERY_MANAGER, ROLES.ACCOUNTANT), async (req, res) => {
  try {
    const { driverId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        cwt.*,
        u.name as processed_by_name,
        o.id as order_id,
        o.total_amount as order_amount
      FROM courier_wallet_transactions cwt
      LEFT JOIN users u ON cwt.processed_by = u.id
      LEFT JOIN orders o ON cwt.order_id = o.id
      WHERE cwt.driver_id = $1
      ORDER BY cwt.created_at DESC
      LIMIT $2 OFFSET $3;
    `, [driverId, parseInt(limit), parseInt(offset)]);
    
    const countResult = await pool.query(`
      SELECT COUNT(*)::int as total
      FROM courier_wallet_transactions
      WHERE driver_id = $1;
    `, [driverId]);
    
    res.json({
      transactions: result.rows,
      total: countResult.rows[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error("Get wallet history error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب سجل المحفظة" });
  }
});

// ================= Layout Management Endpoints =================
const layoutPath = path.join(__dirname, 'data', 'homeLayout.json');

// Get Layout (Public)
app.get("/api/layout/home", (req, res) => {
  try {
    // Default layout if file doesn't exist
    const defaultLayout = {
      sections: [
        {
          id: 'banner-1',
          type: 'banner',
          active: true,
          slides: [
            { id: 1, image: '', title: '', subtitle: '' }
          ]
        },
        {
          id: 'categories-1',
          type: 'categories',
          active: true
        },
        {
          id: 'product-row-1',
          type: 'product-row',
          active: true,
          title: 'Featured Products',
          titleAr: 'منتجات مميزة',
          filter: 'featured',
          categoryId: null
        },
        {
          id: 'product-grid-1',
          type: 'product-grid',
          active: true,
          title: 'Best Sellers',
          titleAr: 'الأكثر مبيعاً',
          filter: 'popular',
          categoryId: null
        }
      ]
    };

    if (!fs.existsSync(layoutPath)) {
      // Create directory if it doesn't exist
      const dataDir = path.dirname(layoutPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      // Write default layout
      fs.writeFileSync(layoutPath, JSON.stringify(defaultLayout, null, 2), 'utf8');
      return res.json(defaultLayout);
    }
    
    const layoutData = fs.readFileSync(layoutPath, 'utf8');
    const layout = JSON.parse(layoutData);
    
    // Ensure sections array exists
    if (!layout.sections || !Array.isArray(layout.sections)) {
      return res.json(defaultLayout);
    }
    
    res.json(layout);
  } catch (err) {
    console.error("Get layout error:", err);
    // Return default layout on error
    res.json({
      sections: [
        {
          id: 'banner-1',
          type: 'banner',
          active: true,
          slides: [
            { id: 1, image: '', title: '', subtitle: '' }
          ]
        },
        {
          id: 'categories-1',
          type: 'categories',
          active: true
        },
        {
          id: 'product-row-1',
          type: 'product-row',
          active: true,
          title: 'Featured Products',
          titleAr: 'منتجات مميزة',
          filter: 'featured',
          categoryId: null
        }
      ]
    });
  }
});

// Update Layout (Admin)
app.post("/api/admin/layout/home", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), (req, res) => {
  try {
    const newLayout = req.body;
    if (!newLayout || !newLayout.sections) {
      return res.status(400).json({ message: "Invalid layout data" });
    }
    fs.writeFileSync(layoutPath, JSON.stringify(newLayout, null, 2), 'utf8');
    
    // Also update public cache or trigger update if needed
    res.json({ success: true, message: "Layout updated successfully" });
  } catch (err) {
    console.error("Update layout error:", err);
    res.status(500).json({ message: "Error updating layout" });
  }
});

// ================= Homepage Sections API =================
// Get homepage sections config (public)
app.get("/api/homepage/sections", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM homepage_sections 
      WHERE enabled = true 
      ORDER BY sort_priority ASC, id ASC
    `);
    res.json({ sections: result.rows });
  } catch (err) {
    console.error("Get homepage sections error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب أقسام الصفحة الرئيسية" });
  }
});

// Get products for a specific section
app.get("/api/homepage/sections/:key/products", async (req, res) => {
  try {
    const { key } = req.params;
    const { store_id, customer_lat, customer_lon } = req.query;
    
    // Get section config
    const sectionResult = await pool.query(
      `SELECT * FROM homepage_sections WHERE section_key = $1 AND enabled = true`,
      [key]
    );
    
    if (sectionResult.rows.length === 0) {
      return res.status(404).json({ message: "القسم غير موجود أو معطل" });
    }
    
    const section = sectionResult.rows[0];
    const limit = section.item_limit || 10;
    
    // Build query based on sort_mode
    let orderBy = 'p.id DESC';
    let whereClause = '1=1';
    
    switch (section.sort_mode) {
      case 'popularity':
      case 'best_sellers':
        // Use orders count if available, otherwise use is_featured
        orderBy = `(SELECT COUNT(*) FROM order_items oi 
                   JOIN orders o ON oi.order_id = o.id 
                   WHERE oi.product_id = p.id AND o.status = 'DELIVERED') DESC, 
                   p.is_featured DESC, p.id DESC`;
        break;
      case 'created_at_desc':
        orderBy = 'p.created_at DESC, p.id DESC';
        break;
      case 'deals':
      case 'deals_of_day':
        // Products with discount_price OR products in deals_of_day section
        whereClause = '(p.discount_price IS NOT NULL AND p.discount_price < p.price AND (p.deal_end_time IS NULL OR p.deal_end_time > NOW()))';
        orderBy = 'p.discount_percentage DESC, p.id DESC';
        break;
      case 'featured':
        whereClause = 'p.is_featured = true';
        orderBy = 'p.id DESC';
        break;
      default:
        orderBy = 'p.is_featured DESC, p.id DESC';
    }
    
    // Store filter
    let storeFilter = '';
    if (store_id) {
      storeFilter = `AND EXISTS (
        SELECT 1 FROM store_inventory si 
        WHERE si.product_id = p.id AND si.store_id = $${store_id ? 1 : 0} AND si.quantity > 0
      )`;
    }
    
    // Hide missing images if configured
    let imageFilter = '';
    if (section.hide_missing_images) {
      imageFilter = `AND (
        p.image_url IS NOT NULL AND p.image_url != '' AND p.image_url != 'null'
        OR EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)
      )`;
    }
    
    // Build params array
    const params = [];
    if (store_id) {
      params.push(parseInt(store_id));
    }
    params.push(limit);
    
    const limitParamIndex = params.length;
    
    const query = `
      SELECT 
        p.id, 
        p.name, 
        COALESCE(p.name_ar, p.name) as name_ar, 
        COALESCE(p.name_en, p.name) as name_en, 
        p.price, 
        p.description, 
        COALESCE(p.description_ar, p.description) as description_ar, 
        COALESCE(p.description_en, p.description) as description_en,
        p.category_id, 
        p.unit, 
        p.price_per_unit, 
        p.unit_step, 
        p.image_url, 
        p.barcode,
        p.is_featured, 
        p.discount_price, 
        p.discount_percentage,
        p.deal_end_time,
        (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) as available_quantity,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image_url
      FROM products p
      WHERE ${whereClause} ${storeFilter} ${imageFilter}
      ORDER BY ${orderBy}
      LIMIT $${limitParamIndex}
    `;
    
    const result = await pool.query(query, params);
    
    // Use primary_image_url if available, otherwise image_url
    // Add deal_end_time for deals of the day section
    const products = result.rows.map(row => ({
      ...row,
      image_url: row.primary_image_url || row.image_url,
      price: row.price ? parseFloat(row.price) : 0,
      deal_end_time: row.deal_end_time || null,
      deal_end_at: row.deal_end_time || null, // Alias for compatibility
    }));
    
    res.json({ products, section });
  } catch (err) {
    console.error("Get section products error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب منتجات القسم" });
  }
});

// Admin: Get all homepage sections
app.get("/api/admin/homepage/sections", authMiddleware, async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ message: "Database connection not available", sections: [] });
    }

    const result = await pool.query(`
      SELECT * FROM homepage_sections 
      ORDER BY sort_priority ASC, id ASC
    `);
    
    // If no sections exist, return empty array (frontend will handle it)
    res.json({ sections: result.rows || [] });
  } catch (err) {
    console.error("Get admin homepage sections error:", err);
    console.error("Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
    // Return empty array instead of error to prevent frontend crash
    res.json({ sections: [] });
  }
});

// Admin: Update homepage section
app.put("/api/admin/homepage/sections/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      enabled,
      title_ar,
      title_en,
      layout_type,
      item_limit,
      sort_mode,
      image_ratio,
      hide_missing_images,
      cta_text_ar,
      cta_text_en,
      cta_link,
      sort_priority,
      config_json
    } = req.body;
    
    const result = await pool.query(`
      UPDATE homepage_sections 
      SET enabled = COALESCE($1, enabled),
          title_ar = COALESCE($2, title_ar),
          title_en = COALESCE($3, title_en),
          layout_type = COALESCE($4, layout_type),
          item_limit = COALESCE($5, item_limit),
          sort_mode = COALESCE($6, sort_mode),
          image_ratio = COALESCE($7, image_ratio),
          hide_missing_images = COALESCE($8, hide_missing_images),
          cta_text_ar = COALESCE($9, cta_text_ar),
          cta_text_en = COALESCE($10, cta_text_en),
          cta_link = COALESCE($11, cta_link),
          sort_priority = COALESCE($12, sort_priority),
          config_json = COALESCE($13, config_json),
          updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `, [
      enabled, title_ar, title_en, layout_type, item_limit, sort_mode,
      image_ratio, hide_missing_images, cta_text_ar, cta_text_en, cta_link,
      sort_priority, config_json ? JSON.stringify(config_json) : null, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "القسم غير موجود" });
    }
    
    res.json({ section: result.rows[0] });
  } catch (err) {
    console.error("Update homepage section error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث القسم" });
  }
});

// Get similar products
app.get("/api/products/:id/similar", async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 8, strategy = 'category' } = req.query;
    
    // Get current product
    const productResult = await pool.query(
      `SELECT category_id FROM products WHERE id = $1`,
      [id]
    );
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }
    
    const product = productResult.rows[0];
    let query = '';
    let params = [id, parseInt(limit)];
    
    if (strategy === 'category') {
      // Same category only
      query = `
        SELECT DISTINCT
          p.id, p.name, COALESCE(p.name_ar, p.name) as name_ar, 
          COALESCE(p.name_en, p.name) as name_en,
          p.price, p.price_per_unit, p.category_id, p.unit, p.unit_step,
          p.is_featured, p.discount_price, p.discount_percentage,
          (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image_url,
          p.image_url,
          (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) as available_quantity
        FROM products p
        WHERE p.id != $1 
          AND p.category_id = $3
          AND (
            (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) > 0
            OR (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) IS NULL
          )
        ORDER BY p.is_featured DESC, p.id DESC
        LIMIT $2
      `;
      params = [id, parseInt(limit), product.category_id];
    } else {
      // Fallback to best sellers in category
      query = `
        SELECT DISTINCT
          p.id, p.name, COALESCE(p.name_ar, p.name) as name_ar, 
          COALESCE(p.name_en, p.name) as name_en,
          p.price, p.price_per_unit, p.category_id, p.unit, p.unit_step,
          p.is_featured, p.discount_price, p.discount_percentage,
          (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image_url,
          p.image_url,
          (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) as available_quantity
        FROM products p
        WHERE p.id != $1 
          AND p.category_id = $3
          AND (
            (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) > 0
            OR (SELECT SUM(quantity) FROM store_inventory WHERE product_id = p.id) IS NULL
          )
        ORDER BY p.is_featured DESC, p.id DESC
        LIMIT $2
      `;
      params = [id, parseInt(limit), product.category_id];
    }
    
    const result = await pool.query(query, params);
    
    const products = result.rows.map(row => ({
      ...row,
      image_url: row.primary_image_url || row.image_url,
      price: row.price ? parseFloat(row.price) : 0,
    }));
    
    res.json({ products });
  } catch (err) {
    console.error("Get similar products error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب المنتجات المشابهة" });
  }
});

// Admin: Update product images
app.put("/api/admin/products/:id/images", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body; // Array of {url, is_primary, sort_order}
    
    if (!Array.isArray(images)) {
      return res.status(400).json({ message: "يجب إرسال مصفوفة من الصور" });
    }
    
    // Delete existing images
    await pool.query('DELETE FROM product_images WHERE product_id = $1', [id]);
    
    // Insert new images
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      await pool.query(
        `INSERT INTO product_images (product_id, url, is_primary, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [id, img.url, img.is_primary || false, img.sort_order || i]
      );
    }
    
    // Update product.image_url to primary image
    const primaryImage = images.find(img => img.is_primary) || images[0];
    if (primaryImage) {
      await pool.query(
        'UPDATE products SET image_url = $1 WHERE id = $2',
        [primaryImage.url, id]
      );
    }
    
    res.json({ success: true, message: "تم تحديث الصور بنجاح" });
  } catch (err) {
    console.error("Update product images error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الصور" });
  }
});

// ================= Zone Management Endpoints =================
app.get("/api/admin/delivery/zones", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DELIVERY_MANAGER), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT z.*, 
        COUNT(DISTINCT dz.driver_id) as assigned_drivers_count
      FROM delivery_zones z
      LEFT JOIN driver_zones dz ON z.id = dz.zone_id
      GROUP BY z.id
      ORDER BY z.created_at DESC;
    `);
    res.json({ zones: result.rows });
  } catch (err) {
    console.error("Get zones error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب المناطق" });
  }
});

app.post("/api/admin/delivery/zones", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DELIVERY_MANAGER), async (req, res) => {
  console.log('✅ POST /api/admin/delivery/zones endpoint called');
  try {
    const { name_ar, name_en, description, polygon_coordinates } = req.body;
    console.log('Request body:', { name_ar, name_en, description, polygon_coordinates });
    
    // Validate required fields
    if (!name_ar || !name_en) {
      return res.status(400).json({ message: "اسم المنطقة مطلوب بالعربية والإنجليزية" });
    }
    
    // Default to empty array if polygon_coordinates not provided
    const coordinates = polygon_coordinates || [];
    
    const result = await pool.query(
      `INSERT INTO delivery_zones (name_ar, name_en, description, polygon_coordinates)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [name_ar.trim(), name_en.trim(), description || null, JSON.stringify(coordinates)]
    );
    
    await logAuditAction(req, 'CREATE_ZONE', 'delivery_zone', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create zone error:", err);
    
    // Handle specific database errors
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ message: "هذه المنطقة موجودة بالفعل" });
    }
    
    res.status(500).json({ message: err.message || "حدث خطأ في إنشاء المنطقة" });
  }
});

// Assign driver to zone
app.post("/api/admin/delivery/zones/:zoneId/assign-driver", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DELIVERY_MANAGER), async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { driver_id, is_primary } = req.body;
    
    const result = await pool.query(
      `INSERT INTO driver_zones (driver_id, zone_id, is_primary)
       VALUES ($1, $2, $3)
       ON CONFLICT (driver_id, zone_id) DO UPDATE SET is_primary = EXCLUDED.is_primary
       RETURNING *;`,
      [driver_id, zoneId, is_primary || false]
    );
    
    await logAuditAction(req, 'ASSIGN_DRIVER_TO_ZONE', 'driver_zone', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Assign driver to zone error:", err);
    res.status(500).json({ message: "حدث خطأ في تعيين Rider للمنطقة" });
  }
});

// ================= Employee & Task Management Endpoints =================

// Employee Tasks
app.get("/api/admin/employees/:userId/tasks", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM employee_tasks WHERE user_id = $1 ORDER BY due_date DESC, created_at DESC;',
      [userId]
    );
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error("Get employee tasks error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب مهام الموظف" });
  }
});

app.post("/api/admin/employees/tasks", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { user_id, title_ar, title_en, description_ar, description_en, task_type, due_date, priority } = req.body;
    
    const result = await pool.query(
      `INSERT INTO employee_tasks (user_id, title_ar, title_en, description_ar, description_en, task_type, due_date, priority, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [user_id, title_ar, title_en, description_ar, description_en, task_type || 'daily', due_date, priority || 'medium', req.user.id]
    );
    
    await logAuditAction(req, 'CREATE_EMPLOYEE_TASK', 'employee_task', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create employee task error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء المهمة" });
  }
});

// Custom Permissions
app.get("/api/admin/users/:userId/permissions", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    console.log('📖 GET /api/admin/users/:userId/permissions - Request received');
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM user_permissions WHERE user_id = $1;',
      [userId]
    );
    console.log(`📖 Found ${result.rows.length} permissions for user ${userId}`);
    res.json({ permissions: result.rows });
  } catch (err) {
    console.error("Get user permissions error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الصلاحيات" });
  }
});

app.post("/api/admin/users/:userId/permissions", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { userId } = req.params;
    const { permission_key, granted } = req.body;
    
    const result = await pool.query(
      `INSERT INTO user_permissions (user_id, permission_key, granted)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, permission_key) DO UPDATE SET granted = EXCLUDED.granted
       RETURNING *;`,
      [userId, permission_key, granted !== false]
    );
    
    await logAuditAction(req, 'UPDATE_USER_PERMISSION', 'user_permission', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update user permission error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الصلاحية" });
  }
});

// Update Multiple Permissions at Once
app.put("/api/admin/users/:userId/permissions", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    console.log('📝 PUT /api/admin/users/:userId/permissions - Request received');
    const { userId } = req.params;
    const { permissions } = req.body; // Array of permission keys
    console.log(`📝 Updating permissions for user ${userId}, permissions count: ${permissions?.length || 0}`);
    
    // Delete all existing permissions for this user
    await pool.query('DELETE FROM user_permissions WHERE user_id = $1;', [userId]);
    
    // Insert new permissions
    if (permissions && permissions.length > 0) {
      const insertPromises = permissions.map((key) =>
        pool.query(
          'INSERT INTO user_permissions (user_id, permission_key, granted) VALUES ($1, $2, true) RETURNING *;',
          [userId, key]
        )
      );
      
      const results = await Promise.all(insertPromises);
      const allPermissions = results.map(r => r.rows[0]);
      
      await logAuditAction(req, 'UPDATE_USER_PERMISSIONS', 'user_permission', userId, null, { permissions });
      res.json({ success: true, permissions: allPermissions, count: allPermissions.length });
    } else {
      await logAuditAction(req, 'CLEAR_USER_PERMISSIONS', 'user_permission', userId, null, {});
      res.json({ success: true, permissions: [], count: 0 });
    }
  } catch (err) {
    console.error("Update user permissions error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الصلاحيات" });
  }
});

// ================= Automated Logistics: Enhanced Driver Management =================

// Toggle Driver Active Status (إيقاف/تفعيل مؤقت)
app.put("/api/admin/drivers/:driverId/toggle-active", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { driverId } = req.params;
    const { is_active } = req.body;

    const result = await pool.query(`
      UPDATE drivers 
      SET is_active = $1,
          status = CASE WHEN $1 = false THEN 'offline' ELSE status END
      WHERE id = $2
      RETURNING *;
    `, [is_active !== false, driverId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Rider غير موجود" });
    }

    res.json({ 
      message: is_active ? "تم تفعيل Rider" : "تم إيقاف Rider مؤقتاً",
      driver: result.rows[0]
    });
  } catch (err) {
    console.error("Toggle driver active error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث حالة Rider" });
  }
});

// Permanent Ban Driver (استبعاد نهائي)
app.put("/api/admin/drivers/:driverId/ban", authMiddleware, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { driverId } = req.params;
    const { ban_reason } = req.body;

    const result = await pool.query(`
      UPDATE drivers 
      SET is_banned = true,
          is_active = false,
          status = 'offline',
          banned_at = NOW(),
          ban_reason = $1
      WHERE id = $2
      RETURNING *;
    `, [ban_reason || 'استبعاد نهائي من قبل الأدمن', driverId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Rider غير موجود" });
    }

    res.json({ 
      message: "تم استبعاد Rider نهائياً",
      driver: result.rows[0]
    });
  } catch (err) {
    console.error("Ban driver error:", err);
    res.status(500).json({ message: "حدث خطأ في استبعاد Rider" });
  }
});

// Unban Driver (إلغاء الاستبعاد)
app.put("/api/admin/drivers/:driverId/unban", authMiddleware, requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { driverId } = req.params;

    const result = await pool.query(`
      UPDATE drivers 
      SET is_banned = false,
          banned_at = NULL,
          ban_reason = NULL
      WHERE id = $1
      RETURNING *;
    `, [driverId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Rider غير موجود" });
    }

    res.json({ 
      message: "تم إلغاء استبعاد Rider",
      driver: result.rows[0]
    });
  } catch (err) {
    console.error("Unban driver error:", err);
    res.status(500).json({ message: "حدث خطأ في إلغاء استبعاد Rider" });
  }
});

// Live Tracking: Get Driver Location with Order Info
app.get("/api/admin/drivers/:driverId/tracking", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { driverId } = req.params;

    const result = await pool.query(`
      SELECT 
        d.id,
        d.user_id,
        u.name as driver_name,
        u.email,
        d.phone,
        d.vehicle_type,
        d.status,
        d.current_latitude,
        d.current_longitude,
        d.last_location_update,
        d.is_active,
        d.is_banned,
        d.is_approved,
        (
          SELECT json_agg(
            json_build_object(
              'order_id', o.id,
              'status', o.status,
              'delivery_address', o.delivery_address,
              'delivery_latitude', o.delivery_latitude,
              'delivery_longitude', o.delivery_longitude,
              'total_amount', o.total_amount,
              'created_at', o.created_at
            )
          )
          FROM orders o
          WHERE o.driver_id = d.id
          AND o.status IN ('ASSIGNED', 'PICKED_UP')
        ) as active_orders
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = $1;
    `, [driverId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Rider غير موجود" });
    }

    res.json({ driver: result.rows[0] });
  } catch (err) {
    console.error("Get driver tracking error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب معلومات Rider" });
  }
});

// Auto-escalation: Check for orders without driver acceptance after 5 minutes
app.post("/api/admin/orders/check-escalation", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.store_id,
        o.driver_notification_sent_at,
        o.driver_notification_expires_at,
        o.escalation_sent_at,
        s.name as store_name
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.status = 'CREATED'
        AND o.driver_notification_sent_at IS NOT NULL
        AND o.driver_notification_expires_at < NOW()
        AND o.escalation_sent_at IS NULL
        AND o.driver_id IS NULL;
    `);

    const escalatedOrders = [];
    for (const order of result.rows) {
      await pool.query(`
        UPDATE orders 
        SET escalation_sent_at = NOW()
        WHERE id = $1;
      `, [order.id]);

      escalatedOrders.push(order);
    }

    res.json({ 
      message: `تم تصعيد ${escalatedOrders.length} طلب`,
      escalated_orders: escalatedOrders
    });
  } catch (err) {
    console.error("Check escalation error:", err);
    res.status(500).json({ message: "حدث خطأ في فحص التصعيد" });
  }
});

// ================= Staff Dashboard (لوحة الموظفين) =================

// Get Staff Permissions
app.get("/api/staff/permissions", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sp.*,
        s.name as store_name,
        s.code as store_code
      FROM staff_permissions sp
      JOIN stores s ON sp.store_id = s.id
      WHERE sp.user_id = $1;
    `, [req.user.id]);

    res.json({ permissions: result.rows });
  } catch (err) {
    console.error("Get staff permissions error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الصلاحيات" });
  }
});

// Get Store Orders (for Staff)
app.get("/api/staff/orders", authMiddleware, async (req, res) => {
  try {
    // Get user's store permissions
    const permissionsResult = await pool.query(`
      SELECT store_id FROM staff_permissions 
      WHERE user_id = $1 AND can_accept_orders = true;
    `, [req.user.id]);

    if (permissionsResult.rows.length === 0) {
      return res.status(403).json({ message: "ليس لديك صلاحية للوصول إلى الطلبات" });
    }

    const storeIds = permissionsResult.rows.map(r => r.store_id);

    const result = await pool.query(`
      SELECT 
        o.*,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone,
        json_agg(
          json_build_object(
            'product_id', oi.product_id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price
          )
        ) as items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN order_store_assignments osa ON o.id = osa.order_id
      WHERE osa.store_id = ANY($1::int[])
        AND o.status IN ('CREATED', 'ACCEPTED', 'PREPARING', 'READY')
      GROUP BY o.id, u.name, u.email, u.phone
      ORDER BY o.created_at DESC;
    `, [storeIds]);

    res.json({ orders: result.rows });
  } catch (err) {
    console.error("Get staff orders error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الطلبات" });
  }
});

// Accept Order (Staff)
app.post("/api/staff/orders/:orderId/accept", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check permission
    const permissionResult = await pool.query(`
      SELECT sp.store_id 
      FROM staff_permissions sp
      JOIN order_store_assignments osa ON sp.store_id = osa.store_id
      WHERE sp.user_id = $1 
        AND osa.order_id = $2
        AND sp.can_accept_orders = true;
    `, [req.user.id, orderId]);

    if (permissionResult.rows.length === 0) {
      return res.status(403).json({ message: "ليس لديك صلاحية لقبول هذا الطلب" });
    }

    await pool.query(`
      UPDATE orders 
      SET status = $2, updated_at = NOW()
      WHERE id = $1;
    `, [orderId]);

    res.json({ message: "تم قبول الطلب بنجاح" });
  } catch (err) {
    console.error("Accept order error:", err);
    res.status(500).json({ message: "حدث خطأ في قبول الطلب" });
  }
});

// Update Inventory (Staff)
app.put("/api/staff/inventory/:productId", authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, store_id } = req.body;

    // Check permission
    const permissionResult = await pool.query(`
      SELECT store_id FROM staff_permissions 
      WHERE user_id = $1 
        AND store_id = $2
        AND can_update_inventory = true;
    `, [req.user.id, store_id]);

    if (permissionResult.rows.length === 0) {
      return res.status(403).json({ message: "ليس لديك صلاحية لتحديث المخزون" });
    }

    const result = await pool.query(`
      UPDATE store_inventory
      SET quantity = $1,
          last_updated = NOW()
      WHERE store_id = $2 AND product_id = $3
      RETURNING *;
    `, [quantity, store_id, productId]);

    res.json({ inventory: result.rows[0] });
  } catch (err) {
    console.error("Update inventory error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث المخزون" });
  }
});

// ================= Dynamic Footer Management =================

// Get Footer Settings
app.get("/api/admin/footer", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM footer_settings WHERE id = 1;
    `);

    if (result.rows.length === 0) {
      // Create default footer settings
      await pool.query(`
        INSERT INTO footer_settings (id) VALUES (1);
      `);
      const newResult = await pool.query(`SELECT * FROM footer_settings WHERE id = 1;`);
      return res.json({ footer: newResult.rows[0] });
    }

    res.json({ footer: result.rows[0] });
  } catch (err) {
    console.error("Get footer error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إعدادات الفوتر" });
  }
});

// Update Footer Settings
app.put("/api/admin/footer", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { 
      contact_phone, 
      contact_email, 
      contact_whatsapp, 
      support_phone,
      social_links,
      page_links,
      link_categories
    } = req.body;

    const result = await pool.query(`
      UPDATE footer_settings
      SET 
        contact_phone = COALESCE($1, contact_phone),
        contact_email = COALESCE($2, contact_email),
        contact_whatsapp = COALESCE($3, contact_whatsapp),
        support_phone = COALESCE($4, support_phone),
        social_links = COALESCE($5::jsonb, social_links),
        page_links = COALESCE($6::jsonb, page_links),
        link_categories = COALESCE($7::jsonb, link_categories),
        updated_at = NOW()
      WHERE id = 1
      RETURNING *;
    `, [contact_phone, contact_email, contact_whatsapp, support_phone, 
        JSON.stringify(social_links), JSON.stringify(page_links), JSON.stringify(link_categories)]);

    res.json({ footer: result.rows[0] });
  } catch (err) {
    console.error("Update footer error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث إعدادات الفوتر" });
  }
});

// Get Footer Settings (Public)
app.get("/api/footer", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        contact_phone,
        contact_email,
        contact_whatsapp,
        support_phone,
        social_links,
        page_links,
        link_categories
      FROM footer_settings WHERE id = 1;
    `);

    if (result.rows.length === 0) {
      return res.json({ footer: null });
    }

    res.json({ footer: result.rows[0] });
  } catch (err) {
    console.error("Get public footer error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إعدادات الفوتر" });
  }
});

// ================= Site Content Management (Footer & Static Pages) =================

// GET Site Footer Config (Public) - New Dynamic Footer
app.get("/api/site/footer", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT value_json FROM site_settings WHERE setting_key = 'footer_config'`
    );
    
    if (result.rows.length === 0 || !result.rows[0].value_json) {
      // Return safe default footer
      return res.json({
        columns: [
          {
            id: "col1",
            type: "about",
            title_ar: "من نحن",
            title_en: "About Us",
            content_ar: "متجرنا يوفر أفضل المنتجات بجودة عالية وتوصيل سريع.",
            content_en: "Our store provides the best products with high quality and fast delivery.",
            enabled: true,
            order: 1
          }
        ],
        bottom_bar: {
          copyright_text_ar: "جميع الحقوق محفوظة",
          copyright_text_en: "All rights reserved",
          company_name: "TOMO Market",
          show_year: true
        }
      });
    }
    
    res.json(result.rows[0].value_json);
  } catch (err) {
    console.error("Get site footer error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إعدادات الفوتر" });
  }
});

// GET Admin: Get Footer Config
app.get("/api/admin/site/footer", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT value_json FROM site_settings WHERE setting_key = 'footer_config'`
    );
    
    if (result.rows.length === 0 || !result.rows[0].value_json) {
      // Return default config
      return res.json({
        columns: [],
        bottom_bar: {
          copyright_text_ar: "جميع الحقوق محفوظة",
          copyright_text_en: "All rights reserved",
          company_name: "TOMO Market",
          show_year: true
        }
      });
    }
    
    res.json(result.rows[0].value_json);
  } catch (err) {
    console.error("Get admin footer config error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إعدادات الفوتر" });
  }
});

// PUT Admin: Update Footer Config
app.put("/api/admin/site/footer", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { footer_config } = req.body;
    
    if (!footer_config) {
      return res.status(400).json({ message: "Footer config is required" });
    }
    
    await pool.query(
      `INSERT INTO site_settings (setting_key, value_json, updated_at)
       VALUES ('footer_config', $1::jsonb, NOW())
       ON CONFLICT (setting_key) 
       DO UPDATE SET value_json = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(footer_config)]
    );
    
    res.json({ success: true, message: "تم حفظ إعدادات الفوتر بنجاح" });
  } catch (err) {
    console.error("Update footer config error:", err);
    res.status(500).json({ message: "حدث خطأ في حفظ إعدادات الفوتر" });
  }
});

// GET Site Footer Config (Public) - New Dynamic Footer
app.get("/api/site/footer", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT value_json FROM site_settings WHERE setting_key = 'footer_config'`
    );
    
    if (result.rows.length === 0 || !result.rows[0].value_json) {
      // Return safe default footer
      return res.json({
        columns: [
          {
            id: "col1",
            type: "about",
            title_ar: "من نحن",
            title_en: "About Us",
            content_ar: "متجرنا يوفر أفضل المنتجات بجودة عالية وتوصيل سريع.",
            content_en: "Our store provides the best products with high quality and fast delivery.",
            enabled: true,
            order: 1
          }
        ],
        bottom_bar: {
          copyright_text_ar: "جميع الحقوق محفوظة",
          copyright_text_en: "All rights reserved",
          company_name: "TOMO Market",
          show_year: true
        }
      });
    }
    
    res.json(result.rows[0].value_json);
  } catch (err) {
    console.error("Get site footer error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إعدادات الفوتر" });
  }
});

// GET Admin: Get Footer Config
app.get("/api/admin/site/footer", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT value_json FROM site_settings WHERE setting_key = 'footer_config'`
    );
    
    if (result.rows.length === 0 || !result.rows[0].value_json) {
      // Return default config
      return res.json({
        columns: [],
        bottom_bar: {
          copyright_text_ar: "جميع الحقوق محفوظة",
          copyright_text_en: "All rights reserved",
          company_name: "TOMO Market",
          show_year: true
        }
      });
    }
    
    res.json(result.rows[0].value_json);
  } catch (err) {
    console.error("Get admin footer config error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إعدادات الفوتر" });
  }
});

// PUT Admin: Update Footer Config
app.put("/api/admin/site/footer", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { footer_config } = req.body;
    
    if (!footer_config) {
      return res.status(400).json({ message: "Footer config is required" });
    }
    
    await pool.query(
      `INSERT INTO site_settings (setting_key, value_json, updated_at)
       VALUES ('footer_config', $1::jsonb, NOW())
       ON CONFLICT (setting_key) 
       DO UPDATE SET value_json = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(footer_config)]
    );
    
    res.json({ success: true, message: "تم حفظ إعدادات الفوتر بنجاح" });
  } catch (err) {
    console.error("Update footer config error:", err);
    res.status(500).json({ message: "حدث خطأ في حفظ إعدادات الفوتر" });
  }
});

// ================= Static Pages Management =================

// GET Static Page (Public)
app.get("/api/site/pages/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `SELECT id, slug, title_ar, title_en, content_ar, content_en, 
              meta_description_ar, meta_description_en, updated_at
       FROM static_pages 
       WHERE slug = $1 AND is_published = true`,
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الصفحة غير موجودة أو غير منشورة" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get static page error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الصفحة" });
  }
});

// GET All Static Pages (Admin)
app.get("/api/admin/site/pages", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, title_ar, title_en, content_ar, content_en, 
              is_published, meta_description_ar, meta_description_en, 
              updated_at, created_at
       FROM static_pages 
       ORDER BY created_at DESC`
    );
    
    res.json({ pages: result.rows });
  } catch (err) {
    console.error("Get static pages error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الصفحات" });
  }
});

// GET Single Static Page (Admin)
app.get("/api/admin/site/pages/:id", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM static_pages WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الصفحة غير موجودة" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get static page error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الصفحة" });
  }
});

// POST Create Static Page (Admin)
app.post("/api/admin/site/pages", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { slug, title_ar, title_en, content_ar, content_en, is_published, meta_description_ar, meta_description_en } = req.body;
    
    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }
    
    const result = await pool.query(
      `INSERT INTO static_pages (slug, title_ar, title_en, content_ar, content_en, 
                                  is_published, meta_description_ar, meta_description_en, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [slug, title_ar || null, title_en || null, content_ar || null, content_en || null, 
       is_published !== false, meta_description_ar || null, meta_description_en || null]
    );
    
    res.json({ page: result.rows[0], message: "تم إنشاء الصفحة بنجاح" });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ message: "هذا الرابط موجود بالفعل" });
    }
    console.error("Create static page error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء الصفحة" });
  }
});

// PUT Update Static Page (Admin)
app.put("/api/admin/site/pages/:id", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title_ar, title_en, content_ar, content_en, is_published, meta_description_ar, meta_description_en } = req.body;
    
    const result = await pool.query(
      `UPDATE static_pages 
       SET slug = COALESCE($1, slug),
           title_ar = $2,
           title_en = $3,
           content_ar = $4,
           content_en = $5,
           is_published = COALESCE($6, is_published),
           meta_description_ar = $7,
           meta_description_en = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [slug, title_ar, title_en, content_ar, content_en, is_published, 
       meta_description_ar, meta_description_en, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الصفحة غير موجودة" });
    }
    
    res.json({ page: result.rows[0], message: "تم تحديث الصفحة بنجاح" });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: "هذا الرابط موجود بالفعل" });
    }
    console.error("Update static page error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الصفحة" });
  }
});

// DELETE Static Page (Admin)
app.delete("/api/admin/site/pages/:id", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM static_pages WHERE id = $1 RETURNING id`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الصفحة غير موجودة" });
    }
    
    res.json({ success: true, message: "تم حذف الصفحة بنجاح" });
  } catch (err) {
    console.error("Delete static page error:", err);
    res.status(500).json({ message: "حدث خطأ في حذف الصفحة" });
  }
});

// GET Public Site Settings (Contact, Social + UI settings)
app.get("/api/site/settings/public", async (req, res) => {
  try {
    const [contactRes, socialRes, pricingRes, slaRes, productPageRes, maintenanceRes] = await Promise.all([
      pool.query(`SELECT value_json FROM site_settings WHERE setting_key = 'contact_info'`),
      pool.query(`SELECT value_json FROM site_settings WHERE setting_key = 'social_links'`),
      pool.query(`SELECT value_json FROM site_settings WHERE setting_key = 'ui_pricing_display'`),
      pool.query(`SELECT value_json FROM site_settings WHERE setting_key = 'operations_sla'`),
      pool.query(`SELECT value_json FROM site_settings WHERE setting_key = 'product_page_settings'`),
      pool.query(`SELECT value_json FROM site_settings WHERE setting_key = 'maintenance_mode'`)
    ]);
    
    res.json({
      contact: contactRes.rows[0]?.value_json || {},
      social: socialRes.rows[0]?.value_json || {},
      ui_pricing_display: pricingRes.rows[0]?.value_json || {},
      operations_sla: slaRes.rows[0]?.value_json || {},
      product_page_settings: productPageRes.rows[0]?.value_json || {},
      maintenance_mode: maintenanceRes.rows[0]?.value_json || { enabled: false }
    });
  } catch (err) {
    console.error("Get public site settings error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الإعدادات" });
  }
});

// GET Maintenance Mode Status (Public)
app.get("/api/maintenance/check", async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT value_json FROM site_settings WHERE setting_key = $1',
      ['maintenance_mode']
    );
    
    const maintenance = result.rows[0]?.value_json || { enabled: false };
    // Don't expose password hash to public
    if (maintenance.maintenance_password_hash) {
      delete maintenance.maintenance_password_hash;
    }
    res.json(maintenance);
  } catch (err) {
    console.error("Get maintenance mode error:", err);
    res.json({ enabled: false });
  }
});

// POST Disable Maintenance Mode (Emergency endpoint - remove after use)
app.post("/api/maintenance/disable", async (req, res) => {
  try {
    await pool.query(
      `UPDATE site_settings 
       SET value_json = jsonb_set(value_json, '{enabled}', 'false')
       WHERE setting_key = 'maintenance_mode'`
    );
    
    res.json({ 
      success: true, 
      message: "Maintenance mode disabled successfully" 
    });
  } catch (err) {
    console.error("Disable maintenance mode error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to disable maintenance mode",
      error: err.message 
    });
  }
});

// POST Maintenance Login (Bypass password for maintenance team)
app.post("/api/maintenance/login", async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    
    // Get maintenance settings
    const result = await pool.query(
      'SELECT value_json FROM site_settings WHERE setting_key = $1',
      ['maintenance_mode']
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Maintenance mode not configured" });
    }
    
    const maintenance = result.rows[0].value_json;
    
    if (!maintenance || !maintenance.enabled) {
      return res.status(400).json({ message: "Maintenance mode is not enabled" });
    }
    
    // Check if maintenance password is set
    if (!maintenance.maintenance_password_hash) {
      return res.status(400).json({ message: "Maintenance password not configured" });
    }
    
    // Verify password
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(password, maintenance.maintenance_password_hash);
    
    if (!isValid) {
      return res.status(401).json({ message: "Invalid maintenance password" });
    }
    
    // Set session for maintenance bypass
    req.session.maintenance_bypass = true;
    
    res.json({ 
      success: true, 
      message: "Maintenance access granted" 
    });
  } catch (err) {
    console.error("Maintenance login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET Admin: Read one site setting by key (for admin panels)
app.get("/api/admin/site/settings/:key", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query(`SELECT setting_key, value_json, description, updated_at FROM site_settings WHERE setting_key = $1`, [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Setting not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get admin site setting error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الإعداد" });
  }
});

// GET Admin: List all site settings keys (for admin panels)
app.get("/api/admin/site/settings", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(`SELECT setting_key, description, updated_at FROM site_settings ORDER BY setting_key ASC`);
    res.json({ settings: result.rows });
  } catch (err) {
    console.error("List admin site settings error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الإعدادات" });
  }
});

// PUT Admin: Update Site Settings
app.put("/api/admin/site/settings", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { setting_key, value_json } = req.body;
    
    if (!setting_key) {
      return res.status(400).json({ message: "Setting key is required" });
    }
    
    await pool.query(
      `INSERT INTO site_settings (setting_key, value_json, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (setting_key) 
       DO UPDATE SET value_json = $2::jsonb, updated_at = NOW()`,
      [setting_key, JSON.stringify(value_json)]
    );

    await logAuditAction(req, 'UPDATE_SITE_SETTING', 'site_settings', null, null, { setting_key });
    
    res.json({ success: true, message: "تم حفظ الإعدادات بنجاح" });
  } catch (err) {
    console.error("Update site settings error:", err);
    res.status(500).json({ message: "حدث خطأ في حفظ الإعدادات" });
  }
});

// ================= Site Content Management (Footer & Static Pages) =================

// GET Site Footer Config (Public)
app.get("/api/site/footer", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT value_json FROM site_settings WHERE setting_key = 'footer_config'`
    );
    
    if (result.rows.length === 0 || !result.rows[0].value_json) {
      // Return safe default footer
      return res.json({
        columns: [
          {
            id: "col1",
            type: "about",
            title_ar: "من نحن",
            title_en: "About Us",
            content_ar: "متجرنا يوفر أفضل المنتجات بجودة عالية وتوصيل سريع.",
            content_en: "Our store provides the best products with high quality and fast delivery.",
            enabled: true,
            order: 1
          }
        ],
        bottom_bar: {
          copyright_text_ar: "جميع الحقوق محفوظة",
          copyright_text_en: "All rights reserved",
          company_name: "TOMO Market",
          show_year: true
        }
      });
    }
    
    res.json(result.rows[0].value_json);
  } catch (err) {
    console.error("Get site footer error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب إعدادات الفوتر" });
  }
});

// PUT Admin: Update Footer Config
app.put("/api/admin/site/footer", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { footer_config } = req.body;
    
    if (!footer_config) {
      return res.status(400).json({ message: "Footer config is required" });
    }
    
    await pool.query(
      `INSERT INTO site_settings (setting_key, value_json, updated_at)
       VALUES ('footer_config', $1::jsonb, NOW())
       ON CONFLICT (setting_key) 
       DO UPDATE SET value_json = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(footer_config)]
    );
    
    res.json({ success: true, message: "تم حفظ إعدادات الفوتر بنجاح" });
  } catch (err) {
    console.error("Update footer config error:", err);
    res.status(500).json({ message: "حدث خطأ في حفظ إعدادات الفوتر" });
  }
});

// GET Static Page (Public)
app.get("/api/site/pages/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `SELECT id, slug, title_ar, title_en, content_ar, content_en, 
              meta_description_ar, meta_description_en, updated_at
       FROM static_pages 
       WHERE slug = $1 AND is_published = true`,
      [slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الصفحة غير موجودة أو غير منشورة" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get static page error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الصفحة" });
  }
});

// GET All Static Pages (Admin)
app.get("/api/admin/site/pages", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, title_ar, title_en, content_ar, content_en, 
              is_published, meta_description_ar, meta_description_en, 
              updated_at, created_at
       FROM static_pages 
       ORDER BY created_at DESC`
    );
    
    res.json({ pages: result.rows });
  } catch (err) {
    console.error("Get static pages error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الصفحات" });
  }
});

// GET Single Static Page (Admin)
app.get("/api/admin/site/pages/:id", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM static_pages WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الصفحة غير موجودة" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get static page error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الصفحة" });
  }
});

// POST Create Static Page (Admin)
app.post("/api/admin/site/pages", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { slug, title_ar, title_en, content_ar, content_en, is_published, meta_description_ar, meta_description_en } = req.body;
    
    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }
    
    const result = await pool.query(
      `INSERT INTO static_pages (slug, title_ar, title_en, content_ar, content_en, 
                                  is_published, meta_description_ar, meta_description_en, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [slug, title_ar || null, title_en || null, content_ar || null, content_en || null, 
       is_published !== false, meta_description_ar || null, meta_description_en || null]
    );
    
    res.json({ page: result.rows[0], message: "تم إنشاء الصفحة بنجاح" });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ message: "هذا الرابط موجود بالفعل" });
    }
    console.error("Create static page error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء الصفحة" });
  }
});

// PUT Update Static Page (Admin)
app.put("/api/admin/site/pages/:id", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title_ar, title_en, content_ar, content_en, is_published, meta_description_ar, meta_description_en } = req.body;
    
    const result = await pool.query(
      `UPDATE static_pages 
       SET slug = COALESCE($1, slug),
           title_ar = $2,
           title_en = $3,
           content_ar = $4,
           content_en = $5,
           is_published = COALESCE($6, is_published),
           meta_description_ar = $7,
           meta_description_en = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [slug, title_ar, title_en, content_ar, content_en, is_published, 
       meta_description_ar, meta_description_en, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الصفحة غير موجودة" });
    }
    
    res.json({ page: result.rows[0], message: "تم تحديث الصفحة بنجاح" });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: "هذا الرابط موجود بالفعل" });
    }
    console.error("Update static page error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث الصفحة" });
  }
});

// DELETE Static Page (Admin)
app.delete("/api/admin/site/pages/:id", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM static_pages WHERE id = $1 RETURNING id`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "الصفحة غير موجودة" });
    }
    
    res.json({ success: true, message: "تم حذف الصفحة بنجاح" });
  } catch (err) {
    console.error("Delete static page error:", err);
    res.status(500).json({ message: "حدث خطأ في حذف الصفحة" });
  }
});

// GET Public Site Settings (Contact, Social)

// PUT Admin: Update Site Settings
app.put("/api/admin/site/settings", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { setting_key, value_json } = req.body;
    
    if (!setting_key) {
      return res.status(400).json({ message: "Setting key is required" });
    }
    
    // Special handling for maintenance_mode: hash the password if provided
    let finalValue = value_json;
    if (setting_key === 'maintenance_mode' && value_json.maintenance_password) {
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(value_json.maintenance_password, saltRounds);
      
      // Get existing settings to preserve hash if password is not changed
      const existingResult = await pool.query(
        'SELECT value_json FROM site_settings WHERE setting_key = $1',
        [setting_key]
      );
      
      const existing = existingResult.rows[0]?.value_json || {};
      
      finalValue = {
        ...value_json,
        maintenance_password_hash: passwordHash,
        // Remove plain password from stored value
        maintenance_password: undefined
      };
      
      // If password field is empty but hash exists, keep the hash
      if (!value_json.maintenance_password && existing.maintenance_password_hash) {
        finalValue.maintenance_password_hash = existing.maintenance_password_hash;
      }
    }
    
    await pool.query(
      `INSERT INTO site_settings (setting_key, value_json, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (setting_key) 
       DO UPDATE SET value_json = $2::jsonb, updated_at = NOW()`,
      [setting_key, JSON.stringify(finalValue)]
    );
    
    res.json({ success: true, message: "تم حفظ الإعدادات بنجاح" });
  } catch (err) {
    console.error("Update site settings error:", err);
    res.status(500).json({ message: "حدث خطأ في حفظ الإعدادات" });
  }
});

// Performance Metrics
app.get("/api/admin/employees/:userId/performance", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { userId } = req.params;
    const { metric_type, start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM performance_metrics WHERE user_id = $1';
    const params = [userId];
    
    if (metric_type) {
      params.push(metric_type);
      query += ` AND metric_type = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND metric_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND metric_date <= $${params.length}`;
    }
    
    query += ' ORDER BY metric_date DESC;';
    
    const result = await pool.query(query, params);
    res.json({ metrics: result.rows });
  } catch (err) {
    console.error("Get performance metrics error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب مقاييس الأداء" });
  }
});

app.post("/api/admin/employees/performance", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { user_id, metric_type, metric_value, metric_date, details } = req.body;
    
    const result = await pool.query(
      `INSERT INTO performance_metrics (user_id, metric_type, metric_value, metric_date, details)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, metric_type, metric_date) DO UPDATE SET metric_value = EXCLUDED.metric_value, details = EXCLUDED.details
       RETURNING *;`,
      [user_id, metric_type, metric_value, metric_date || new Date().toISOString().split('T')[0], JSON.stringify(details || {})]
    );
    
    await logAuditAction(req, 'UPDATE_PERFORMANCE_METRIC', 'performance_metric', result.rows[0].id, null, req.body);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update performance metric error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث مقياس الأداء" });
  }
});

// Attendance Logs
app.get("/api/admin/employees/:userId/attendance", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { userId } = req.params;
    const { start_date, end_date } = req.query;
    
    let query = 'SELECT * FROM attendance_logs WHERE user_id = $1';
    const params = [userId];
    
    if (start_date) {
      params.push(start_date);
      query += ` AND DATE(created_at) >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND DATE(created_at) <= $${params.length}`;
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100;';
    
    const result = await pool.query(query, params);
    res.json({ logs: result.rows });
  } catch (err) {
    console.error("Get attendance logs error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب سجل الحضور" });
  }
});

// ================= Audit Log Endpoints =================
app.get("/api/admin/audit-logs", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, action, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    
    if (user_id) {
      params.push(user_id);
      query += ` AND user_id = $${params.length}`;
    }
    if (action) {
      params.push(action);
      query += ` AND action = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND DATE(created_at) >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND DATE(created_at) <= $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*)::int as total FROM audit_logs;`);
    
    res.json({ 
      logs: result.rows, 
      total: countResult.rows[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error("Get audit logs error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب سجل التدقيق" });
  }
});

// ================= Request Logging Middleware =================
// Log all API requests for debugging
app.use('/api', (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] ${req.method} ${req.path}`, {
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50),
    hasAuth: !!req.headers.authorization
  });
  next();
});

// ================= Quality Assurance: Test Endpoints =================
// Test endpoint to verify backend is working
app.get("/api/admin/test/health", (req, res) => {
  console.log('✅ [QA HEALTH CHECK] Endpoint called');
  res.json({ 
    success: true, 
    message: "QA Test endpoints are available",
    timestamp: new Date().toISOString(),
    routes: {
      seedRiders: 'POST /api/admin/test/seed-riders',
      createTestOrder: 'POST /api/admin/test/create-test-order',
      testOrder: 'POST /api/admin/test-order',
      ridersOnline: 'GET /api/admin/riders/online'
    }
  });
});

// Data Seeders: إنشاء بيانات وهمية للمناديب
app.post("/api/admin/test/seed-riders", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  console.log('🧪 [QA SEED RIDERS] Request received:', { count: req.body.count, user: req.user?.email });
  try {
    const { count = 10 } = req.body;
    
    // Database connection check
    if (!pool) {
      console.error('❌ [QA SEED RIDERS] Database pool not initialized');
      return res.status(500).json({ 
        message: "Database connection failed", 
        error: "Database pool not initialized" 
      });
    }
    
    // إحداثيات متفرقة في الرياض (Riyadh)
    const locations = [
      { lat: 24.7136, lon: 46.6753, name: 'الرياض - العليا' },
      { lat: 24.7236, lon: 46.6853, name: 'الرياض - النرجس' },
      { lat: 24.7036, lon: 46.6653, name: 'الرياض - العليا الجنوبية' },
      { lat: 24.7336, lon: 46.6953, name: 'الرياض - الشمال' },
      { lat: 24.6936, lon: 46.6553, name: 'الرياض - الجنوب' },
      { lat: 24.7136, lon: 46.7053, name: 'الرياض - الشرق' },
      { lat: 24.7136, lon: 46.6453, name: 'الرياض - الغرب' },
      { lat: 24.7436, lon: 46.6753, name: 'الرياض - الشمال الشرقي' },
      { lat: 24.6836, lon: 46.6753, name: 'الرياض - الجنوب الشرقي' },
      { lat: 24.7136, lon: 46.7153, name: 'الرياض - الشمال الغربي' },
    ];
    
    const createdRiders = [];
    
    for (let i = 0; i < Math.min(count, locations.length); i++) {
      const location = locations[i];
      const riderName = `Rider Test ${i + 1}`;
      const email = `rider.test.${i + 1}@tomo.com`;
      const phone = `050${String(i + 1).padStart(7, '0')}`;
      
      // إنشاء مستخدم
      const passwordHash = await bcrypt.hash('123456', 10);
      const userResult = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, is_active = true
         RETURNING id;`,
        [riderName, email, passwordHash, 'driver', true]
      );
      
      const userId = userResult.rows[0].id;
      
      // إنشاء Rider
      const driverResult = await pool.query(
        `INSERT INTO drivers (user_id, phone, is_active, is_approved, rider_status, current_latitude, current_longitude, last_location_update)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id) DO UPDATE SET 
           phone = EXCLUDED.phone,
           is_active = true,
           is_approved = true,
           rider_status = 'available',
           current_latitude = EXCLUDED.current_latitude,
           current_longitude = EXCLUDED.current_longitude,
           last_location_update = NOW()
         RETURNING id;`,
        [userId, phone, true, true, 'available', location.lat, location.lon]
      );
      
      const driverId = driverResult.rows[0].id;
      
      // إنشاء محفظة
      await pool.query(
        `INSERT INTO courier_wallets (driver_id, payable_balance, total_collected, last_updated)
         VALUES ($1, 0, 0, NOW())
         ON CONFLICT (driver_id) DO NOTHING;`,
        [driverId]
      );
      
      createdRiders.push({
        id: driverId,
        name: riderName,
        email: email,
        phone: phone,
        location: location,
        status: 'available'
      });
    }
    
    console.log(`✅ [QA SEED RIDERS] Created ${createdRiders.length} test riders successfully`);
    
    res.json({
      success: true,
      message: `تم إنشاء ${createdRiders.length} Rider وهمي`,
      riders: createdRiders
    });
  } catch (err) {
    console.error("❌ [QA SEED RIDERS] Error details:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack?.split('\n').slice(0, 5)
    });
    res.status(500).json({ 
      message: "حدث خطأ في إنشاء Riders وهميين", 
      error: err.message,
      code: err.code,
      detail: err.detail
    });
  }
});

// Test Order: إنشاء طلب تجريبي
app.post("/api/admin/test/create-test-order", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  const startTime = Date.now();
  console.log('🧪 [QA CREATE TEST ORDER] ✅ Route matched! Request received:', { 
    user: req.user?.email,
    method: req.method,
    path: req.path,
    url: req.url,
    body: req.body
  });
  
  try {
    // Database connection check
    if (!pool) {
      console.error('❌ [QA CREATE TEST ORDER] Database pool not initialized');
      return res.status(500).json({ 
        message: "Database connection failed", 
        error: "Database pool not initialized" 
      });
    }
    // جلب أو إنشاء مستخدم تجريبي
    let testUserResult = await pool.query(
      `SELECT id FROM users WHERE email = 'test.customer@tomo.com' LIMIT 1;`
    );
    
    let userId;
    if (testUserResult.rows.length === 0) {
      const passwordHash = await bcrypt.hash('123456', 10);
      const newUserResult = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id;`,
        ['Test Customer', 'test.customer@tomo.com', passwordHash, 'customer', true]
      );
      userId = newUserResult.rows[0].id;
    } else {
      userId = testUserResult.rows[0].id;
    }
    
    // جلب منتجات حقيقية عشوائية
    const productsResult = await pool.query(
      `SELECT id, price, name_ar, name_en FROM products ORDER BY RANDOM() LIMIT 3;`
    );
    
    if (productsResult.rows.length === 0) {
      return res.status(400).json({ message: "لا توجد منتجات في النظام" });
    }
    
    // جلب أو إنشاء متجر
    let storeResult = await pool.query(
      `SELECT id, latitude, longitude FROM stores LIMIT 1;`
    );
    
    let storeId;
    if (storeResult.rows.length === 0) {
      // إنشاء متجر افتراضي
      const newStoreResult = await pool.query(
        `INSERT INTO stores (name, code, address, latitude, longitude, delivery_radius, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, latitude, longitude;`,
        ['Test Store', 'TEST-STORE-001', 'عنوان تجريبي', 24.7136, 46.6753, 10, true]
      );
      storeId = newStoreResult.rows[0].id;
    } else {
      storeId = storeResult.rows[0].id;
    }
    
    // حساب المبلغ الإجمالي
    let itemsTotal = 0;
    const orderItems = productsResult.rows.map((product, idx) => {
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3
      const unitPrice = parseFloat(product.price);
      itemsTotal += unitPrice * quantity;
      
      return {
        product_id: product.id,
        quantity: quantity,
        unit_price: unitPrice,
        product_name_ar: product.name_ar,
        product_name_en: product.name_en
      };
    });
    
    const deliveryFee = 10;
    const totalAmount = itemsTotal + deliveryFee;
    
    // إنشاء الطلب
    const orderResult = await pool.query(
      `INSERT INTO orders (
        user_id, total_amount, items_total, delivery_fee, 
        delivery_address, delivery_latitude, delivery_longitude,
        payment_method, payment_status, status, store_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, created_at;`,
      [
        userId,
        totalAmount,
        itemsTotal,
        deliveryFee,
        'عنوان تجريبي - الرياض',
        24.7136 + (Math.random() - 0.5) * 0.1, // موقع عشوائي قريب
        46.6753 + (Math.random() - 0.5) * 0.1,
        'online',
        'success',
        'pending',
        storeId
      ]
    );
    
    const orderId = orderResult.rows[0].id;
    
    // إضافة المنتجات للطلب
    for (const item of orderItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4);`,
        [orderId, item.product_id, item.quantity, item.unit_price]
      );
    }
    
    // ربط الطلب بالمتجر (إضافة كل منتج في order_store_assignments)
    for (const item of orderItems) {
      await pool.query(
        `INSERT INTO order_store_assignments (order_id, store_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (order_id, store_id, product_id) DO UPDATE SET
           quantity = EXCLUDED.quantity,
           unit_price = EXCLUDED.unit_price;`,
        [orderId, storeId, item.product_id, item.quantity, item.unit_price]
      );
    }
    
    // تسجيل في order_tracking_history
    await pool.query(
      `INSERT INTO order_tracking_history (order_id, status, notes)
       VALUES ($1, $2, $3);`,
      [orderId, MVP_STATUSES.CREATED, 'Test order created via QA endpoint']
    );
    
    // Auto-Assign: تخصيص تلقائي
    const assignmentStartTime = Date.now();
    const assignment = await assignBestRider(orderId, storeId);
    const assignmentTime = Date.now() - assignmentStartTime;
    
    // تحديث حالة الطلب
    if (assignment) {
      await pool.query(
        `UPDATE orders SET status = 'ASSIGNED' WHERE id = $1;`,
        [orderId]
      );
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log(`🧪 [QA TEST ORDER] Order #${orderId} created and assigned in ${totalTime}ms (Assignment: ${assignmentTime}ms)`);
    
    res.json({
      success: true,
      message: "تم إنشاء طلب تجريبي بنجاح",
      order: {
        id: orderId,
        total_amount: totalAmount,
        items: orderItems,
        status: assignment ? MVP_STATUSES.ASSIGNED : MVP_STATUSES.CREATED,
        created_at: orderResult.rows[0].created_at
      },
      assignment: assignment || null,
      metrics: {
        total_time_ms: totalTime,
        assignment_time_ms: assignmentTime,
        assignment_success: !!assignment
      }
    });
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [QA CREATE TEST ORDER] Error after ${totalTime}ms:`, {
      message: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
      stack: err.stack?.split('\n').slice(0, 10)
    });
    res.status(500).json({ 
      message: "حدث خطأ في إنشاء الطلب التجريبي", 
      error: err.message,
      code: err.code,
      detail: err.detail,
      metrics: {
        total_time_ms: totalTime
      }
    });
  }
});

// ================= Test Order Route (Diagnostic Version) =================
// POST /api/admin/test-order: كود تشخيصي بسيط لا يعتمد على قاعدة البيانات
// POST /api/admin/test-order: Temporary Mock Response
app.post("/api/admin/test-order", async (req, res) => {
  console.log("🔔 [Mock] Test Order received.");
  return res.status(200).json({ 
    success: true, 
    message: 'Server is alive!' 
  });
});

/*
app.post("/api/admin/test-order", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  // ... Original Logic ...

  const startTime = Date.now();
  console.log("🚀 [QA] Starting Test Order Creation...");

  // --- SIMULATION MODE START ---
  if (!isDbConnected) {
    console.log("⚠️ [QA] Database disconnected. Simulating successful order...");
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const simulatedOrderId = Math.floor(Math.random() * 10000) + 1000;
    const simulatedRiderId = Math.floor(Math.random() * 50) + 100;
    
    const simulatedOrder = {
      id: simulatedOrderId,
      total_amount: 165.50,
      status: MVP_STATUSES.CREATED,
      created_at: new Date().toISOString(),
      delivery_address: 'موقع محاكاة - الرياض (بدون اتصال قاعدة بيانات)',
      driver_name: null,
      customer_name: 'QA Simulation User',
      items: [
        { name_ar: 'منتج محاكاة 1', quantity: 2, unit_price: 50 },
        { name_ar: 'منتج محاكاة 2', quantity: 1, unit_price: 50.5 }
      ]
    };

    const simulatedAssignment = {
      rider_id: simulatedRiderId,
      rider_name: 'Simulated Rider ' + simulatedRiderId,
      distance: 2.5,
      assigning_time_ms: 120
    };

    // Return Success Response (Simulated)
    return res.status(200).json({ 
      success: true, 
      message: "تم إنشاء الطلب (محاكاة - قاعدة البيانات غير متصلة)", 
      order: simulatedOrder,
      assignment: simulatedAssignment,
      metrics: {
        total_time_ms: Date.now() - startTime,
        assignment_success: true
      },
      is_simulation: true
    });
  }
  // --- SIMULATION MODE END ---

  try {
    if (!pool) throw new Error("Database pool not initialized");

    // 1. Get or Create Store (Source of products)
    let storeResult = await pool.query('SELECT id, latitude, longitude FROM stores WHERE is_active = true LIMIT 1');
    let storeId, storeLat, storeLon;
    
    if (storeResult.rows.length === 0) {
      console.log("⚠️ [QA] No active stores found. Creating test store...");
      const newStore = await pool.query(`
        INSERT INTO stores (name, code, address, latitude, longitude, delivery_radius, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, latitude, longitude
      `, ['QA Test Store', 'QA-STORE-001', 'QA Test Address', 24.7136, 46.6753, 10, true]);
      storeId = newStore.rows[0].id;
      storeLat = newStore.rows[0].latitude;
      storeLon = newStore.rows[0].longitude;
    } else {
      storeId = storeResult.rows[0].id;
      storeLat = storeResult.rows[0].latitude;
      storeLon = storeResult.rows[0].longitude;
    }

    // 2. Get or Create Customer (User)
    let userResult = await pool.query("SELECT id FROM users WHERE email = 'qa.tester@tomo.com'");
    let userId;
    
    if (userResult.rows.length === 0) {
      const passwordHash = await bcrypt.hash('123456', 10);
      const newUser = await pool.query(`
        INSERT INTO users (name, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['QA Tester', 'qa.tester@tomo.com', passwordHash, 'customer', true]);
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // 3. Get Random Products
    const productsResult = await pool.query('SELECT id, name_ar, name_en, price, image_url FROM products LIMIT 3');
    let orderItems = [];
    let itemsTotal = 0;

    if (productsResult.rows.length === 0) {
      // Create dummy product if none exist
       console.log("⚠️ [QA] No products found. Creating dummy items...");
       orderItems.push({
         product_id: null, // Should ideally create a product first, but we'll skip for speed if schema allows null (it might not)
         // Actually, let's create a product to be safe
         name_ar: 'منتج اختبار',
         name_en: 'Test Product',
         price: 50,
         quantity: 1,
         image_url: null
       });
       // Create the product in DB
       const newProd = await pool.query(`
         INSERT INTO products (name_ar, name_en, description_ar, description_en, price, category_id, stock_quantity, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id
       `, ['منتج اختبار', 'Test Product', 'وصف', 'Desc', 50, null, 100, null]);
       orderItems[0].product_id = newProd.rows[0].id;
       itemsTotal = 50;
    } else {
      orderItems = productsResult.rows.map(p => ({
        product_id: p.id,
        name_ar: p.name_ar,
        name_en: p.name_en,
        price: parseFloat(p.price),
        quantity: Math.floor(Math.random() * 3) + 1,
        image_url: p.image_url
      }));
      itemsTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    const deliveryFee = 15;
    const totalAmount = itemsTotal + deliveryFee;

    // 4. Create Order
    // Random location near store
    const deliveryLat = parseFloat(storeLat) + (Math.random() - 0.5) * 0.02;
    const deliveryLon = parseFloat(storeLon) + (Math.random() - 0.5) * 0.02;

    const orderResult = await pool.query(`
      INSERT INTO orders (
        user_id, store_id, total_amount, items_total, delivery_fee,
        delivery_address, delivery_latitude, delivery_longitude,
        payment_method, payment_status, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id, created_at
    `, [
      userId, storeId, totalAmount, itemsTotal, deliveryFee,
      'موقع اختبار QA - الرياض', deliveryLat, deliveryLon,
      'online', 'success', 'pending'
    ]);

    const orderId = orderResult.rows[0].id;

    // 5. Insert Order Items & Assignments
    for (const item of orderItems) {
      // Insert into order_items
      await pool.query(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
      `, [orderId, item.product_id, item.quantity, item.price]);

      // Insert into order_store_assignments (for inventory/picking)
      await pool.query(`
        INSERT INTO order_store_assignments (order_id, store_id, product_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (order_id, store_id, product_id) DO NOTHING
      `, [orderId, storeId, item.product_id, item.quantity, item.price]);
    }

    // 6. Record History
    await pool.query(`
      INSERT INTO order_tracking_history (order_id, status, notes)
      VALUES ($1, $2, $3)
    `, [orderId, MVP_STATUSES.CREATED, 'تم إنشاء الطلب آلياً عبر اختبار الجودة (QA Test)']);

    // 7. Trigger Auto-Dispatch (Assign Best Rider)
    console.log(`🤖 [QA] Triggering Auto-Dispatch for Order #${orderId}...`);
    let assignment = await assignBestRider(orderId, storeId);

    // If no rider found, create a dummy rider and try again
    if (!assignment) {
      console.log("⚠️ [QA] No riders found. Creating Dummy Rider...");
      
      // Create Dummy User
      const dummyEmail = `rider.test.${Date.now()}@tomo.com`;
      const dummyPass = await bcrypt.hash('rider123', 10);
      const dummyUser = await pool.query(`
        INSERT INTO users (name, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [`QA Rider ${Math.floor(Math.random()*100)}`, dummyEmail, dummyPass, 'driver', true]);
      
      // Create Dummy Driver
      const dummyDriver = await pool.query(`
        INSERT INTO drivers (
          user_id, phone, vehicle_type, status, rider_status, 
          is_active, is_approved, current_latitude, current_longitude, last_location_update
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `, [
        dummyUser.rows[0].id, '0599999999', 'motorcycle', 'online', 'available',
        true, true, storeLat, storeLon // Position at store
      ]);

      console.log(`✅ [QA] Dummy Rider Created (ID: ${dummyDriver.rows[0].id}). Retrying assignment...`);
      
      // Retry assignment
      assignment = await assignBestRider(orderId, storeId);
    }

    // 8. Fetch Full Order Details for Response
    const fullOrder = await pool.query(`
      SELECT o.*, u.name as customer_name 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      WHERE o.id = $1
    `, [orderId]);

    const totalTime = Date.now() - startTime;
    console.log(`✅ [QA] Test Order Completed in ${totalTime}ms. Assignment: ${assignment ? 'Success' : 'Failed'}`);

    // Return Success Response
    res.status(200).json({ 
      success: true, 
      message: assignment ? "تم إنشاء الطلب وتعيين Rider بنجاح" : "تم إنشاء الطلب ولكن لم يتم تعيين Rider (لا يوجد متاحين)", 
      order: fullOrder.rows[0],
      assignment: assignment,
      metrics: {
        total_time_ms: totalTime,
        assignment_success: !!assignment
      }
    });

  } catch (error) {
    console.error("🔥 [QA] Test Order Failed:", error);
    res.status(500).json({ 
      success: false, 
      message: "فشل إنشاء الطلب التجريبي", 
      details: error.message,
      stack: error.stack
    });
  }
});
*/

// Get Online Riders (Alternative route name)
app.get("/api/admin/riders/online", authMiddleware, async (req, res) => {
  console.log('🔄 [RIDERS ONLINE] Alternative route called, redirecting to /api/admin/riders');
  try {
    const result = await pool.query(
      `
        SELECT 
          d.id,
          d.user_id,
          d.phone,
          d.rider_status,
          d.current_latitude,
          d.current_longitude,
          d.last_location_update,
          u.name,
          u.email,
          d.is_active,
          d.is_approved,
          (SELECT COUNT(*) FROM orders WHERE driver_id = d.id AND status IN ('ASSIGNED', 'PICKED_UP')) as active_orders_count
        FROM drivers d
        JOIN users u ON d.user_id = u.id
        WHERE d.rider_status = 'available' AND d.is_active = true
        ORDER BY d.last_location_update DESC;
      `
    );
    
    console.log(`✅ [RIDERS ONLINE] Found ${result.rows.length} online riders`);
    res.json({ 
      success: true,
      riders: result.rows,
      count: result.rows.length 
    });
  } catch (err) {
    console.error("❌ [RIDERS ONLINE] Error:", {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
    res.status(500).json({ 
      message: "حدث خطأ في جلب المناديب المتصلين", 
      error: err.message 
    });
  }
});

// ================= Store Portal API Routes =================
// MVP: Get store orders (filter by store_id if user is store staff)
app.get("/api/store/orders", authMiddleware, async (req, res) => {
  try {
    // Get user's store_id if store staff
    const userStore = await pool.query(
      `SELECT store_id FROM store_users WHERE user_id = $1 LIMIT 1`,
      [req.user.id]
    );
    
    let query = `
      SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at, 
             o.delivery_address, o.delivery_latitude, o.delivery_longitude, o.driver_id,
             u.full_name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id OR o.user_id = u.id
    `;
    const params = [];
    
    if (userStore.rows.length > 0) {
      // Filter by store
      query += ` WHERE o.store_id = $1`;
      params.push(userStore.rows[0].store_id);
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT 100`;
    
    const result = await pool.query(query, params);
    
    // Get order items for each order
    const ordersWithItems = await Promise.all(result.rows.map(async (order) => {
      const itemsRes = await pool.query(
        `
          SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.unit,
                 COALESCE(p.name_ar, p.name) as product_name_ar,
                 COALESCE(p.name_en, p.name) as product_name_en,
                 p.name as product_name
          FROM order_items oi
          JOIN products p ON p.id = oi.product_id
          WHERE oi.order_id = $1;
        `,
        [order.id]
      );
      return { ...order, items: itemsRes.rows };
    }));
    
    res.json({ orders: ordersWithItems });
  } catch (err) {
    console.error("Get store orders error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب الطلبات" });
  }
});

// MVP: Store Accept/Reject Order
app.post("/api/store/orders/:id/accept", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get current order
    const currentOrder = await client.query('SELECT status, store_id FROM orders WHERE id = $1', [id]);
    if (currentOrder.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = currentOrder.rows[0];
    const oldStatus = order.status;
    
    // MVP: Validate transition CREATED -> ACCEPTED
    const validation = validateStatusTransition(oldStatus, MVP_STATUSES.ACCEPTED);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: validation.message });
    }
    
    // Update order status
    await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [MVP_STATUSES.ACCEPTED, id]
    );
    
    // Log to order_status_history
    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, actor_type, actor_id, note)
       VALUES ($1, $2, $3, 'store', $4, $5)`,
      [id, oldStatus, MVP_STATUSES.ACCEPTED, req.user.id, 'Store accepted order']
    );
    
    await client.query('COMMIT');
    
    // Emit real-time event
    if (io) {
      io.to(`store-${order.store_id}`).emit('order_accepted', { order_id: id });
    }
    
    res.json({ message: 'Order accepted successfully', status: MVP_STATUSES.ACCEPTED });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Accept order error:", err);
    res.status(500).json({ message: "حدث خطأ في قبول الطلب" });
  } finally {
    client.release();
  }
});

// MVP: Store Reject Order
app.post("/api/store/orders/:id/reject", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get current order
    const currentOrder = await client.query('SELECT status, store_id FROM orders WHERE id = $1', [id]);
    if (currentOrder.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = currentOrder.rows[0];
    const oldStatus = order.status;
    
    // MVP: Validate transition CREATED -> CANCELLED
    const validation = validateStatusTransition(oldStatus, MVP_STATUSES.CANCELLED);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: validation.message });
    }
    
    // Release inventory
    await releaseInventory(client, id);
    
    // Update order status
    await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [MVP_STATUSES.CANCELLED, id]
    );
    
    // Log to order_status_history
    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, actor_type, actor_id, note)
       VALUES ($1, $2, $3, 'store', $4, $5)`,
      [id, oldStatus, MVP_STATUSES.CANCELLED, req.user.id, 'Store rejected order']
    );
    
    await client.query('COMMIT');
    
    // Emit real-time event
    if (io) {
      io.to(`store-${order.store_id}`).emit('order_rejected', { order_id: id });
    }
    
    res.json({ message: 'Order rejected successfully', status: MVP_STATUSES.CANCELLED });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Reject order error:", err);
    res.status(500).json({ message: "حدث خطأ في رفض الطلب" });
  } finally {
    client.release();
  }
});

// MVP: Update order status (store) - PREPARING, READY
app.put("/api/store/orders/:id/status", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { status } = req.body;
    
    // Get current status
    const currentOrder = await client.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (currentOrder.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const oldStatus = currentOrder.rows[0].status;
    
    // Map to MVP status
    const newStatus = mapToMVPStatus(status);
    
    // MVP: Validate transition
    const validation = validateStatusTransition(oldStatus, newStatus);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: validation.message });
    }
    
    // Update order status
    await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, id]
    );
    
    // Log to order_status_history
    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, actor_type, actor_id, note)
       VALUES ($1, $2, $3, 'store', $4, $5)`,
      [id, oldStatus, newStatus, req.user.id, `Status changed by store user ${req.user.id}`]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Order status updated successfully', status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Update order status error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث حالة الطلب" });
  } finally {
    client.release();
  }
});

// ================= New Schema API Endpoints =================

// Customer Addresses API
app.get("/api/customer-addresses", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ addresses: result.rows });
  } catch (err) {
    console.error("Get customer addresses error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب العناوين" });
  }
});

app.post("/api/customer-addresses", authMiddleware, async (req, res) => {
  try {
    const { label, lat, lng, address_text, zone_id } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ message: "الإحداثيات مطلوبة" });
    }
    
    const result = await pool.query(
      `INSERT INTO customer_addresses (customer_id, label, lat, lng, address_text, zone_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, label || null, lat, lng, address_text || null, zone_id || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create customer address error:", err);
    res.status(500).json({ message: "حدث خطأ في إنشاء العنوان" });
  }
});

app.put("/api/customer-addresses/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, lat, lng, address_text, zone_id } = req.body;
    
    const result = await pool.query(
      `UPDATE customer_addresses 
       SET label = $1, lat = $2, lng = $3, address_text = $4, zone_id = $5, updated_at = NOW()
       WHERE id = $6 AND customer_id = $7
       RETURNING *`,
      [label, lat, lng, address_text, zone_id, id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "العنوان غير موجود" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update customer address error:", err);
    res.status(500).json({ message: "حدث خطأ في تحديث العنوان" });
  }
});

app.delete("/api/customer-addresses/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2 RETURNING id`,
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "العنوان غير موجود" });
    }
    
    res.json({ message: "تم حذف العنوان بنجاح" });
  } catch (err) {
    console.error("Delete customer address error:", err);
    res.status(500).json({ message: "حدث خطأ في حذف العنوان" });
  }
});

// Order Status History API
app.get("/api/orders/:id/status-history", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify order belongs to user
    const orderCheck = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND (customer_id = $2 OR user_id = $2)`,
      [id, req.user.id]
    );
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "الطلب غير موجود" });
    }
    
    const result = await pool.query(
      `SELECT * FROM order_status_history 
       WHERE order_id = $1 
       ORDER BY created_at DESC`,
      [id]
    );
    
    res.json({ history: result.rows });
  } catch (err) {
    console.error("Get order status history error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب سجل الحالات" });
  }
});

// Store Users API (Admin only)
app.get("/api/admin/store-users", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { store_id } = req.query;
    
    let query = `
      SELECT su.*, u.full_name, u.name, u.email, u.phone, u.status as user_status
      FROM store_users su
      JOIN users u ON su.user_id = u.id
    `;
    const params = [];
    
    if (store_id) {
      query += ` WHERE su.store_id = $1`;
      params.push(store_id);
    }
    
    query += ` ORDER BY su.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json({ store_users: result.rows });
  } catch (err) {
    console.error("Get store users error:", err);
    res.status(500).json({ message: "حدث خطأ في جلب موظفي المتجر" });
  }
});

app.post("/api/admin/store-users", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { store_id, user_id, role } = req.body;
    
    if (!store_id || !user_id || !role) {
      return res.status(400).json({ message: "store_id, user_id, و role مطلوبة" });
    }
    
    const result = await pool.query(
      `INSERT INTO store_users (store_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (store_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [store_id, user_id, role]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create store user error:", err);
    res.status(500).json({ message: "حدث خطأ في إضافة موظف للمتجر" });
  }
});

app.delete("/api/admin/store-users/:storeId/:userId", authMiddleware, requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { storeId, userId } = req.params;
    
    await pool.query(
      `DELETE FROM store_users WHERE store_id = $1 AND user_id = $2`,
      [storeId, userId]
    );
    
    res.json({ message: "تم حذف الموظف من المتجر بنجاح" });
  } catch (err) {
    console.error("Delete store user error:", err);
    res.status(500).json({ message: "حدث خطأ في حذف الموظف" });
  }
});

// ================= 404 Handler for API routes (MUST BE LAST - AFTER ALL API ROUTES) =================
// This will catch any unmatched API routes
// IMPORTANT: Use app.all() with a wildcard to catch only unmatched routes
app.all('/api/*', (req, res) => {
  // This handler only runs if no specific route matched
  console.error(`❌ [404] API Route not found: ${req.method} ${req.path}`, {
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    url: req.url,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type']
    }
  });
  res.status(404).json({ 
    message: "API endpoint not found",
    path: req.path,
    method: req.method,
    availableEndpoints: {
      health: 'GET /api/admin/test/health',
      seedRiders: 'POST /api/admin/test/seed-riders',
      createTestOrder: 'POST /api/admin/test/create-test-order',
      testOrder: 'POST /api/admin/test-order',
      riders: 'GET /api/admin/riders',
      ridersOnline: 'GET /api/admin/riders/online'
    },
    troubleshooting: {
      checkBackend: 'Ensure backend is running on http://localhost:5000',
      checkAuth: 'Ensure you are logged in as Admin',
      checkRoute: 'Verify the route exists in backend/server.js'
    }
  });
});

// ================= Frontend Catch-All Route (MUST BE LAST - AFTER ALL API ROUTES) =================
// Serve React app for all non-API routes (SPA routing)
// This MUST be after ALL API routes to ensure API routes are handled first

app.get("*", async (req, res, next) => {
  // Skip API routes - let them be handled by their specific handlers above
  if (req.path.startsWith("/api")) {
    return next();
  }
  
  // Skip static assets - already served by express.static
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/)) {
    return next();
  }
  
  // Define indexPath at the start of the function (needed for maintenance mode checks)
  const indexPath = path.join(publicDir, "index.html");
  
  // Always allow admin routes - serve index.html directly (React Router will handle routing)
  if (req.path.startsWith('/admin')) {
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return next();
  }
  
  // IMPORTANT: Always allow /maintenance route to pass through - serve index.html directly
  // This prevents redirect loop when accessing /maintenance page
  if (req.path === '/maintenance' || req.path === '/maintenance-login') {
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return next();
  }
  
  // Double-check maintenance mode before serving index.html (in case middleware was bypassed)
  try {
    const maintenanceResult = await pool.query(
      'SELECT value_json FROM site_settings WHERE setting_key = $1',
      ['maintenance_mode']
    );
    
    if (maintenanceResult.rows.length > 0) {
      const maintenance = maintenanceResult.rows[0].value_json;
      
      if (maintenance && maintenance.enabled === true) {
        // Allow access if user has maintenance bypass session
        if (req.session && req.session.maintenance_bypass === true) {
          return res.sendFile(indexPath);
        }
        
        // IMPORTANT: Allow root path (/) to pass through if Host is admin subdomain
        // This prevents redirect loop when React Router handles /admin routing
        const host = req.get('host') || '';
        if (req.path === '/' && host.includes('admin.')) {
          return res.sendFile(indexPath);
        }
        
        // Redirect to maintenance page for HTML requests
        if (req.accepts('html')) {
          return res.redirect('/maintenance');
        }
        
        // Return 503 for non-HTML requests
        return res.status(503).json({ 
          message: maintenance.message_ar || maintenance.message_en || 'Site is under maintenance',
          maintenance_mode: true 
        });
      }
    }
  } catch (err) {
    console.error('Error checking maintenance mode in catch-all route:', err);
    // On error, continue to serve the app (fail open)
  }
  
  // For all other routes, serve index.html (React Router will handle client-side routing)
  if (fs.existsSync(indexPath)) {
    console.log(`📄 Serving React app for route: ${req.path}`);
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      message: "Frontend not built. Please run 'npm run build' in frontend directory",
      productionUrl: "https://tomo-sa.com",
      adminUrl: "https://tomo-sa.com/admin",
      tip: "For development, use Vite dev server: cd frontend && npm run dev (runs on port 5173)",
      viteDevServer: "http://localhost:5173",
      backendServer: `http://localhost:${PORT}`
    });
  }
});

// ================= CRON JOB: MONTHLY BONUSES (SOVEREIGN CONTROL) =================
// Run at 00:00 on the 1st of every month
cron.schedule('0 0 1 * *', async () => {
  console.log('📅 Running Monthly Bonus Cron Job...');
  try {
    // 1. Check Sovereign Rules
    const rulesRes = await pool.query("SELECT * FROM rider_rules WHERE rule_key IN ('target_bonus', 'manual_override')");
    const rules = {};
    rulesRes.rows.forEach(r => rules[r.rule_key] = r);

    // Rule C: Manual Override (Freeze)
    if (rules['manual_override']?.is_enabled) {
      console.log('🛑 Bonus distribution skipped due to Manual Override (Freeze Mode).');
      return;
    }

    // Rule A: Target Bonus
    if (!rules['target_bonus']?.is_enabled) {
      console.log('ℹ️ Target Bonus rule is disabled. Skipping.');
      return;
    }

    const settings = rules['target_bonus'].settings || {};
    const globalTarget = parseInt(settings.target) || 500;
    const globalBonus = parseFloat(settings.amount) || 150.00;

    // 2. Get All Active Riders
    const riders = await pool.query("SELECT id, bonus_threshold, bonus_amount FROM drivers WHERE is_active = true");
    
    // 3. Iterate
    for (const rider of riders.rows) {
      // Count Last Month's Orders
      const countRes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE driver_id = $1 
        AND status = 'DELIVERED'
        AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND created_at < date_trunc('month', CURRENT_DATE)
      `, [rider.id]);
      
      const orderCount = parseInt(countRes.rows[0].count);
      
      // Use Global Rule Settings (Sovereign) or Rider Override if we decide to allow overrides.
      // The prompt says "Toggle to enable/disable... Inputs for Target/Bonus".
      // Usually Global Rule overrides unless specified.
      // But typically "Rider Profile" settings are specific overrides.
      // I'll prioritize Rider Specific if set, else Global.
      // BUT if Global Rule is DISABLED, no one gets it (checked above).
      
      const target = rider.bonus_threshold ? parseInt(rider.bonus_threshold) : globalTarget;
      const bonus = rider.bonus_amount ? parseFloat(rider.bonus_amount) : globalBonus;
      
      if (orderCount >= target) {
        console.log(`🎉 Awarding Monthly Bonus to Rider ${rider.id}: ${orderCount} orders (Target: ${target})`);
        
        // Add to Wallet
        await pool.query(`
          INSERT INTO courier_wallets (driver_id, payable_balance, total_earnings)
          VALUES ($1, $2, $2)
          ON CONFLICT (driver_id) DO UPDATE 
          SET payable_balance = courier_wallets.payable_balance + $2,
              total_earnings = courier_wallets.total_earnings + $2;
        `, [rider.id, bonus]);
        
        // Log Transaction
        await pool.query(`
          INSERT INTO courier_wallet_transactions (driver_id, transaction_type, amount, description)
          VALUES ($1, 'bonus', $2, $3);
        `, [rider.id, bonus, `مكافأة شهرية (الشهر السابق): ${orderCount} طلب`]);
      }
    }
    console.log('✅ Monthly Bonus Job Completed.');
  } catch (err) {
    console.error('❌ Error in Monthly Bonus Job:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 PRODUCTION URLs:`);
      console.log(`   - Main Site: https://tomo-sa.com`);
      console.log(`   - Admin Panel: https://tomo-sa.com/admin`);
      console.log(`   - API: https://tomo-sa.com/api`);
      console.log(`💻 DEVELOPMENT URLs:`);
      console.log(`   - API: http://localhost:${PORT}/api`);
      console.log(`   - Frontend: http://localhost:5173`);
      if (io) {
        console.log(`📡 Socket.IO ready for real-time updates`);
      }
      
      // ================= Print All Registered Routes =================
      console.log(`\n📋 Registered API Routes:`);
      console.log(`==========================================`);
      const routes = [];
      app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          // Direct route
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          routes.push({ method: methods, path: middleware.route.path });
        } else if (middleware.name === 'router') {
          // Router middleware
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
              routes.push({ method: methods, path: handler.route.path });
            }
          });
        }
      });
      
      // Sort routes by path
      routes.sort((a, b) => a.path.localeCompare(b.path));
      
      // Group by path and show methods
      const routeMap = new Map();
      routes.forEach(route => {
        if (!routeMap.has(route.path)) {
          routeMap.set(route.path, []);
        }
        routeMap.get(route.path).push(route.method);
      });
      
      routeMap.forEach((methods, path) => {
        if (path.startsWith('/api')) {
          console.log(`   ${methods.join(', ').padEnd(15)} ${path}`);
        }
      });
      console.log(`==========================================`);
      console.log(`📋 /api/auth/* and health (dev verification):`);
      routeMap.forEach((methods, path) => {
        if (path.startsWith('/api/auth') || path === '/api/health') {
          console.log(`   ${methods.join(', ').padEnd(15)} ${path}`);
        }
      });
      console.log(`==========================================\n`);
    });
  })
  .catch((err) => {
    console.error("DB init error (starting server anyway for simulation mode):", err.message);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT} (simulation mode - DB unavailable)`);
      console.log(`   Health: GET http://localhost:${PORT}/api/health`);
      console.log(`   Driver login (no DB): driver@tomo.com / driver123`);
    });
  });

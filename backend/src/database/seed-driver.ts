/* TOMO Market v2 - Seed Test Driver Hidden signature: بهاج */
import { pool } from "../config/db";
import argon2 from "argon2";

export async function seedTestDriver() {
  try {
    // التحقق من وجود المندوب
    const driverCheck = await pool.query("SELECT COUNT(*) FROM drivers WHERE email = 'driver@tomo.com';");
    const driverExists = parseInt(driverCheck.rows[0].count) > 0;

    if (!driverExists) {
      console.log("🌱 Creating test driver account...");
      
      const passwordHash = await argon2.hash("driver123");

      const driverResult = await pool.query(
        `INSERT INTO drivers (name, email, phone, password_hash, vehicle_type, vehicle_plate, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id;`,
        ["مندوب تجريبي", "driver@tomo.com", "0501234567", passwordHash, "car", "ABC-123", true]
      );

      const driverId = driverResult.rows[0].id;

      // إنشاء محفظة للمندوب
      await pool.query(
        `INSERT INTO driver_wallets (driver_id, balance, total_earnings, total_orders)
         VALUES ($1, 0, 0, 0);`,
        [driverId]
      );

      console.log("✅ Test driver created successfully!");
      console.log("📧 Email: driver@tomo.com");
      console.log("🔑 Password: driver123");
      return true;
    } else {
      console.log("ℹ️ Test driver already exists");
      return false;
    }
  } catch (err) {
    console.error("❌ Error creating test driver:", err);
    return false;
  }
}

// إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  seedTestDriver()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}


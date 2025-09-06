// db.js (ESM)
import { Pool } from "pg";

// Decide SSL based on URL flags/host
const cs = process.env.DATABASE_URL ?? "";
const isInternal = cs.includes("-internal.");
const needsSSL = /\bsslmode=require\b/.test(cs) || (!isInternal && process.env.PGSSLMODE === "require");

const pool = new Pool({
  connectionString: cs,
  ssl: needsSSL ? { rejectUnauthorized: false } : false, // external → SSL; internal → no SSL
  max: Number(process.env.PGPOOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.PGPOOL_IDLE ?? 10000),
});

// Optional: startup health check
(async () => {
  try {
    const { rows } = await pool.query("SELECT NOW()");
    console.log("✅ Postgres connected @", rows[0].now);
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
})();

export default pool;

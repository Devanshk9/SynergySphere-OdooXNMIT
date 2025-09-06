// server/db.js
import { Pool } from "pg";

const cs = process.env.DATABASE_URL ?? "";
const isInternal = cs.includes("-internal.");
const needsSSL =
  /\bsslmode=require\b/.test(cs) || (!isInternal && process.env.PGSSLMODE === "require");

const pool = new Pool({
  connectionString: cs,
  ssl: needsSSL ? { rejectUnauthorized: false } : false, // external → SSL; internal → no SSL
  max: Number(process.env.PGPOOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.PGPOOL_IDLE ?? 10000),
});

pool.on("error", (err) => {
  console.error("⚠️ PG pool error:", err);
});

export default pool;   // <-- default export
export { pool };       // (optional) named export too

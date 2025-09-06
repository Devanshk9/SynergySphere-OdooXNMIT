// db.js (ESM)
import { Pool } from "pg";

const cs = process.env.DATABASE_URL ?? "";
const isInternal = cs.includes("-internal.");
const needsSSL = /\bsslmode=require\b/.test(cs) || (!isInternal && process.env.PGSSLMODE === "require");

export default pool = new Pool({
  connectionString: cs,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PGPOOL_MAX ?? 10), // tune down if many instances
  idleTimeoutMillis: 10_000,
});

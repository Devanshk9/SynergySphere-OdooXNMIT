// db.js
import pkg from "pg";
const { Pool } = pkg;

const cs = process.env.DATABASE_URL ?? "";
const needsSSL = /\bsslmode=require\b/.test(cs) || process.env.PGSSLMODE === "require";

export const pool = new Pool({
  connectionString: cs,
  ssl: needsSSL ? { rejectUnauthorized: false } : false, // <- only use SSL when needed
  max: Number(process.env.PGPOOL_MAX ?? 10),
  idleTimeoutMillis: 10000,
});

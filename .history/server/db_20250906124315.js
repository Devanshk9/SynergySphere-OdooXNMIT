
// import dotenv from "dotenv";
// import pkg from "pg";

// dotenv.config();

// const { Pool } = pkg;

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
// });

// export default pool;   // 👈 this fixes the error


// db.js
import pkg from "pg";
const { Pool } = pkg;

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Render requires SSL
  max: 10,              // max number of clients
  idleTimeoutMillis: 10000, // close idle clients after 10s
});

// Test connection on startup
(async () => {
  try {
    const { rows } = await pool.query("SELECT NOW()");
    console.log("✅ Connected to Postgres @", rows[0].now);
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
})();

export default pool;

// server/db.js
import { Pool } from "pg";

const pool = new Pool({
  user: 'synergysphere_db_user',
  password: '8dd0U3HhiVdZ1iPQU0kefMv0SqBKH1LB',
  host: 'dpg-d2ttkr3uibrs73f4ie50-a.oregon-postgres.render.com',
  port: 5432,
  database: 'synergysphere_db',
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on("error", (err) => {
  console.error("⚠️ PG pool error:", err);
});

export default pool;   // <-- default export
export { pool };       // (optional) named export too

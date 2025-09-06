// setup-db.js
import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

async function setupDatabase() {
  // Create a new pool just for setup
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Read and execute the essential tables script
    const sql = fs.readFileSync('./essential-tables.sql', 'utf8');
    await pool.query(sql);
    console.log('Essential tables created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error setting up database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();

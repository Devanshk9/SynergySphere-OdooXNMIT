// setup-db.js
import fs from 'fs';
import { pool } from './db.js';

async function setupDatabase() {
  try {
    const sql = fs.readFileSync('./db.sql', 'utf8');
    await pool.query(sql);
    console.log('Database setup completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error setting up database:', err);
    process.exit(1);
  }
}

setupDatabase();

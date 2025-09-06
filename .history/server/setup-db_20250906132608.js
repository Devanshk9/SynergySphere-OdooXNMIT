// setup-db.js
import fs from 'fs';
import { pool } from './db.js';

async function setupDatabase() {
  try {
    const sql = fs.readFileSync('./db.sql', 'utf8');
    // Split the SQL into individual statements and execute them one by one
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (err) {
          console.error('Error executing statement:', statement.trim());
          throw err;
        }
      }
    }
    
    console.log('Database setup completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error setting up database:', err);
    process.exit(1);
  }
}

setupDatabase();

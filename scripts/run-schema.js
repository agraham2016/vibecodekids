import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';

const connectionString = process.argv[2] || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Usage: node scripts/run-schema.js [DATABASE_URL]');
  console.error('Or set DATABASE_URL in .env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

try {
  const sql = readFileSync('server/db/schema.sql', 'utf-8');
  await pool.query(sql);
  console.log('SUCCESS: All tables created');

  const res = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log('Tables:', res.rows.map(r => r.table_name).join(', '));
} catch (e) {
  console.error('ERROR:', e.message);
} finally {
  await pool.end();
}

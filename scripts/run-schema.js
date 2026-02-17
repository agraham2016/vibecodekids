import pg from 'pg';
import { readFileSync } from 'fs';

const pool = new pg.Pool({
  connectionString: process.argv[2],
  ssl: { rejectUnauthorized: false },
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

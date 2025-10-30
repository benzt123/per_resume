// test-db.js
const pool = require('./db');
(async () => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT 1 AS ok');
    console.log(rows);
    conn.release();
    process.exit(0);
  } catch (e) {
    console.error('DB 连接失败：', e);
    process.exit(1);
  }
})();

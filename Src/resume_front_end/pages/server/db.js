// server/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASS || 'Strong!Passw0rd',
  database: process.env.DB_NAME || 'information',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z', 
});

module.exports = pool;

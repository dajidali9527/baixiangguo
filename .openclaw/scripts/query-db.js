#!/usr/bin/env node
process.env.NODE_PATH = '/usr/local/lib/node_modules';
require('module').Module._initPaths();
const mysql = require('mysql2/promise');
const sql = process.argv[2];
if (!sql) { console.error('Usage: node query-db.js "SQL"'); process.exit(1); }
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'mysql',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'passion_fruit'
  });
  const [rows] = await conn.query(sql);
  console.table(rows);
  await conn.end();
})().catch(e => { console.error(e.message); process.exit(1); });
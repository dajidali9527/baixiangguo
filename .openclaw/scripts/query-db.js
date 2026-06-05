#!/usr/bin/env node
// 尝试多个可能的 mysql2 路径
let mysql;
const paths = [
  '/usr/local/lib/node_modules/mysql2/promise',
  '/usr/lib/node_modules/mysql2/promise',
  '/opt/node_modules/mysql2/promise',
  'mysql2/promise'
];
for (const p of paths) {
  try { mysql = require(p); break; } catch(e) { continue; }
}
if (!mysql) { console.error('Error: Cannot find module mysql2/promise. Tried:', paths.join(', ')); process.exit(1); }
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
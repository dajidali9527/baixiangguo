import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
const dbSsl = process.env.DB_SSL === 'true';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || 'root';
const dbName = process.env.DB_NAME || 'passion_fruit';

const pool = new Pool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: dbSsl ? { rejectUnauthorized: false } : undefined,
  application_name: 'passion-fruit-tracker',
});

pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'Asia/Shanghai'");
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
  if (isProduction) {
    console.error('[PROD] Database connection error, process may need restart');
  }
});

export default pool;

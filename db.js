const mysql = require("mysql2/promise");

function requireEnv(name) {
  const value = process.env[name];
  if (value == null || value === "") throw new Error(`Missing environment variable: ${name}`);
  return value;
}

let pool;

function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
    user: requireEnv("DB_USER"),
    password: process.env.DB_PASSWORD || "",
    database: requireEnv("DB_NAME"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  return pool;
}

async function query(sql, params) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = { getPool, query };


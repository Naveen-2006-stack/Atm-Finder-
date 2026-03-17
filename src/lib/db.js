import mysql from "mysql2/promise";
import { getEnv } from "@/lib/env";

let pool;

function getPool() {
  if (!pool) {
    const env = getEnv();
    pool = mysql.createPool({
      host: env.dbHost,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      namedPlaceholders: true,
    });
  }

  return pool;
}

export async function query(sql, values = {}) {
  const [rows] = await getPool().execute(sql, values);
  return rows;
}

export async function transaction(callback) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

import { pool } from '../db/mysql.js'

export async function getAllCanteens() {
  const [rows] = await pool.query(
    `SELECT CanteenId, CanteenName, Location FROM canteen ORDER BY CanteenName ASC`
  )
  return rows
}



import { pool } from '../db/mysql.js'

export async function getDailyRevenueByCanteen(canteenId) {
  const [rows] = await pool.query(
    `SELECT DATE(orderTime) AS order_date,
            COALESCE(SUM(parcelPrice), 0) AS total_revenue,
            COUNT(*) AS orders_count
     FROM orders
     WHERE canteenId = ?
       AND status = 'order_confirmed'
     GROUP BY DATE(orderTime)
     ORDER BY DATE(orderTime) DESC`,
    [canteenId]
  )
  return rows
}



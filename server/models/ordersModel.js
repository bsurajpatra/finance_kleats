import { pool } from '../db/mysql.js'

export async function getDailyRevenueByCanteen(canteenId) {
  const [rows] = await pool.query(
    `SELECT 
        DATE(orderTime) AS order_date,
        COALESCE(
          SUM(
            (SELECT SUM(
                CAST(JSON_UNQUOTE(JSON_EXTRACT(item, '$.price')) AS DECIMAL(10,2)) *
                CAST(JSON_UNQUOTE(JSON_EXTRACT(item, '$.quantity')) AS DECIMAL(10,2))
            )
            FROM JSON_TABLE(items, '$[*]' COLUMNS (
                item JSON PATH '$'
            )) jt)
            + parcelPrice
          ), 0
        ) AS total_revenue,
        COUNT(*) AS orders_count
     FROM orders
     WHERE canteenId = ?
       AND paymentStatus IN ('CONFIRMED','DELIVERED')
       AND orderTime >= '2025-08-25 00:00:00'
     GROUP BY DATE(orderTime)
     ORDER BY order_date DESC`,
    [canteenId]
  )
  return rows
}

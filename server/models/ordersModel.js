import { pool } from '../db/mysql.js'

export async function getDailyRevenueByCanteen(canteenId) {
  const [rows] = await pool.query(
    `SELECT 
        DATE(orderTime) AS order_date,
        COALESCE(SUM(order_subtotal), 0) AS total_revenue,
        COUNT(*) AS orders_count,
        FLOOR(COALESCE(SUM(order_subtotal * 0.97), 0)) AS net_payout,
        SUM(
          CASE 
            WHEN JSON_VALID(coupons) AND JSON_CONTAINS(coupons, '"GLUG"') THEN 1 
            ELSE 0 
          END
        ) AS with_coupon_orders
     FROM (
        SELECT 
          orderTime,
          paymentStatus,
          coupons,
          (
            (SELECT SUM(
                CAST(JSON_UNQUOTE(JSON_EXTRACT(item, '$.price')) AS DECIMAL(10,2)) *
                CAST(JSON_UNQUOTE(JSON_EXTRACT(item, '$.quantity')) AS DECIMAL(10,2))
            )
            FROM JSON_TABLE(items, '$[*]' COLUMNS (
                item JSON PATH '$'
            )) jt)
            + COALESCE(parcelPrice, 0)
          ) AS order_subtotal
        FROM orders
        WHERE canteenId = ?
          AND paymentStatus IN ('DELIVERED')
          AND orderTime >= '2025-08-25 00:00:00'
     ) o
     GROUP BY DATE(orderTime)
     ORDER BY order_date DESC`,
    [canteenId]
  )
  return rows
}

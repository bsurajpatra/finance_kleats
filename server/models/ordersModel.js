import { pool } from '../db/mysql.js'

export async function getDailyRevenueByCanteen(canteenId) {
  const [rows] = await pool.query(
    `SELECT 
        DATE(orderTime) AS order_date,
        COALESCE(SUM(order_subtotal), 0) AS total_revenue,
        COUNT(*) AS orders_count,
        FLOOR(COALESCE(SUM(order_subtotal * 0.95), 0)) AS net_payout
    FROM (
        SELECT 
          orderTime,
          paymentStatus,
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

export async function getDailyNetProfit(canteenId, startDate = null, endDate = null) {
  let whereClause = 'WHERE paymentStatus = "DELIVERED"'
  let params = []
  
  if (canteenId) {
    whereClause += ' AND canteenId = ?'
    params.push(canteenId)
  }
  
  if (startDate) {
    whereClause += ' AND DATE(orderTime) >= ?'
    params.push(startDate)
  }
  
  if (endDate) {
    whereClause += ' AND DATE(orderTime) <= ?'
    params.push(endDate)
  }
  
  const [rows] = await pool.query(
    `SELECT 
        DATE(orderTime) AS order_date,
        ROUND(COALESCE(SUM(
          CASE 
            WHEN JSON_VALID(coupons) AND JSON_LENGTH(coupons) > 0 THEN order_subtotal * 0.005
            ELSE order_subtotal * 0.035
          END
        ), 0), 2) AS net_profit
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
        ${whereClause}
     ) o
     GROUP BY DATE(orderTime)
     ORDER BY order_date DESC`,
    params
  )
  return rows
}

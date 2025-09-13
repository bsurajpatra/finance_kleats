import { pool } from '../db/mysql.js'

export async function getDailyRevenueByCanteen(canteenId) {
  const [rows] = await pool.query(
    `SELECT 
        DATE_FORMAT(orderTime, '%Y-%m-%d') AS order_date,
        COALESCE(SUM(order_subtotal), 0) AS total_orders,
        CEIL(COALESCE(SUM(
          order_subtotal + 
          CASE
            WHEN JSON_VALID(coupons) AND JSON_SEARCH(coupons, 'one', 'GLUG') IS NULL
            THEN order_subtotal * 0.03
            ELSE 0
          END
        ), 0)) AS total_revenue,
        COUNT(*) AS orders_count,
        FLOOR(COALESCE(SUM(
          CASE 
            WHEN ? = 2 THEN order_subtotal * 1.0
            ELSE order_subtotal * 0.95
          END
        ), 0)) AS net_payout
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
    GROUP BY DATE_FORMAT(orderTime, '%Y-%m-%d')
    ORDER BY order_date DESC`,
    [canteenId, canteenId]
  )
  return rows
}

export async function getDailyGrossProfit(canteenId, startDate = null, endDate = null) {
  let whereClause = 'WHERE paymentStatus = "DELIVERED" AND status = "delivered"'
  let params = []
  
  if (canteenId) {
    whereClause += ' AND canteenId = ?'
    params.push(canteenId)
  }

  if (startDate) {
    whereClause += ' AND orderTime >= ?'
    params.push(startDate)
  } else {
    whereClause += ' AND orderTime >= ?'
    params.push("2025-08-25 00:00:00")
  }
  
  if (endDate) {
    whereClause += ' AND orderTime <= ?'
    params.push(endDate)
  }
  
  const [rows] = await pool.query(
    `SELECT 
        DATE_FORMAT(orderTime, '%Y-%m-%d') AS order_date,
        ROUND(COALESCE(SUM(
          (order_subtotal * 0.05) +
          CASE
            WHEN JSON_VALID(coupons) AND JSON_SEARCH(coupons, 'one', 'GLUG') IS NULL
            THEN order_subtotal * 0.03
            ELSE 0
          END
        ), 0), 2) AS gross_profit
     FROM (
        SELECT 
          orderTime,
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
     GROUP BY DATE_FORMAT(orderTime, '%Y-%m-%d')
     ORDER BY order_date DESC`,
    params
  )
  return rows
}


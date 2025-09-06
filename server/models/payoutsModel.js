import { pool } from '../db/mysql.js'

export async function upsertPayoutRecord({ canteenId, payoutDate, amount }) {
  // Try update first (avoids duplicates even if unique key missing). If no row, insert.
  const [res] = await pool.query(
    `UPDATE payouts SET amount = ? WHERE canteenId = ? AND payout_date = ?`,
    [amount, canteenId, payoutDate]
  )
  if (res.affectedRows === 0) {
    await pool.query(
      `INSERT INTO payouts (canteenId, payout_date, amount, status) VALUES (?, ?, ?, 'unsettled')`,
      [canteenId, payoutDate, amount]
    )
  }
}

export async function setPayoutStatus({ canteenId, payoutDate, status }) {
  const normalized = status === 'settled' ? 'settled' : 'unsettled'
  const settledAt = normalized === 'settled' ? new Date() : null
  // Update first; if not found, insert.
  const [res] = await pool.query(
    `UPDATE payouts SET status = ?, settled_at = ? WHERE canteenId = ? AND payout_date = ?`,
    [normalized, settledAt, canteenId, payoutDate]
  )
  if (res.affectedRows === 0) {
    await pool.query(
      `INSERT INTO payouts (canteenId, payout_date, amount, status, settled_at)
       VALUES (?, ?, 0, ?, ?)`,
      [canteenId, payoutDate, normalized, settledAt]
    )
  }
}

export async function getPayoutsMapByCanteen(canteenId) {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(payout_date, '%Y-%m-%d') AS ymd, amount, status, settled_at
       FROM payouts WHERE canteenId = ?`,
      [canteenId]
    )
    const map = new Map()
    for (const r of rows) {
      const key = String(r.ymd)
      map.set(key, { amount: Number(r.amount), status: r.status || 'unsettled', settled_at: r.settled_at })
    }
    return map
  } catch (err) {
    // If table or columns do not exist yet, return empty map to avoid breaking settlements
    return new Map()
  }
}

export async function getPayoutByKey({ canteenId, payoutDate }) {
  const [rows] = await pool.query(
    `SELECT payout_date, amount, status, settled_at
     FROM payouts WHERE canteenId = ? AND payout_date = ? LIMIT 1`,
    [canteenId, payoutDate]
  )
  return rows[0] || null
}



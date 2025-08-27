import { pool } from '../db/mysql.js'

export async function upsertPayoutRecord({ canteenId, payoutDate, amount }) {
  await pool.query(
    `INSERT INTO payouts (canteenId, payout_date, amount)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
    [canteenId, payoutDate, amount]
  )
}

export async function setPayoutStatus({ canteenId, payoutDate, status }) {
  const normalized = status === 'settled' ? 'settled' : 'unsettled'
  const settledAt = normalized === 'settled' ? new Date() : null
  await pool.query(
    `INSERT INTO payouts (canteenId, payout_date, amount, status, settled_at)
     VALUES (?, ?, 0, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), settled_at = VALUES(settled_at)`,
    [canteenId, payoutDate, normalized, settledAt]
  )
}

export async function getPayoutsMapByCanteen(canteenId) {
  try {
    const [rows] = await pool.query(
      `SELECT payout_date, amount, status, settled_at
       FROM payouts WHERE canteenId = ?`,
      [canteenId]
    )
    const map = new Map()
    for (const r of rows) {
      map.set(String(r.payout_date), { amount: Number(r.amount), status: r.status || 'unsettled', settled_at: r.settled_at })
    }
    return map
  } catch (err) {
    // If table or columns do not exist yet, return empty map to avoid breaking settlements
    return new Map()
  }
}



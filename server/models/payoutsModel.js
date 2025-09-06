import { pool } from '../db/mysql.js'

export async function upsertPayoutRecord({ canteenId, payoutDate, amount }) {
  // Use INSERT ... ON DUPLICATE KEY UPDATE for atomic upsert operation
  // This prevents race conditions and ensures data consistency
  const [result] = await pool.query(
    `INSERT INTO payouts (canteenId, payout_date, amount, status) 
     VALUES (?, ?, ?, 'unsettled')
     ON DUPLICATE KEY UPDATE 
     amount = VALUES(amount),
     updated_at = CURRENT_TIMESTAMP`,
    [canteenId, payoutDate, amount]
  )
  
  if (result.affectedRows === 1) {
    console.log(`✅ Created new payout record: Canteen ${canteenId}, Date ${payoutDate}, Amount ₹${amount}`)
  } else if (result.affectedRows === 2) {
    console.log(`🔄 Updated existing payout record: Canteen ${canteenId}, Date ${payoutDate}, Amount ₹${amount}`)
  } else {
    console.log(`ℹ️ No changes needed: Canteen ${canteenId}, Date ${payoutDate}, Amount ₹${amount}`)
  }
}

export async function setPayoutStatus({ canteenId, payoutDate, status, amount }) {
  const normalized = status === 'settled' ? 'settled' : 'unsettled'
  const settledAt = normalized === 'settled' ? new Date() : null
  
  // Use atomic upsert to prevent race conditions
  const [result] = await pool.query(
    `INSERT INTO payouts (canteenId, payout_date, amount, status, settled_at) 
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
     amount = VALUES(amount),
     status = VALUES(status),
     settled_at = VALUES(settled_at),
     updated_at = CURRENT_TIMESTAMP`,
    [canteenId, payoutDate, amount || 0, normalized, settledAt]
  )
  
  if (result.affectedRows === 1) {
    console.log(`✅ Created new payout status: Canteen ${canteenId}, Date ${payoutDate}, Amount ₹${amount || 0}, Status ${normalized}`)
  } else if (result.affectedRows === 2) {
    console.log(`🔄 Updated payout status: Canteen ${canteenId}, Date ${payoutDate}, Amount ₹${amount || 0}, Status ${normalized}`)
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



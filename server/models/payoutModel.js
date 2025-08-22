import { pool } from '../db/mysql.js'

export async function getAllPayouts() {
  const [rows] = await pool.query(
    'SELECT * FROM payouts ORDER BY date DESC'
  )
  return rows
}

export async function deletePayout(id) {
  await pool.query('DELETE FROM payouts WHERE id = ?', [id])
  return { success: true }
}

export async function updatePayout(id, updateData) {
  const fields = []
  const values = []
  for (const [key, value] of Object.entries(updateData)) {
    fields.push(`${key} = ?`)
    values.push(value)
  }
  if (fields.length > 0) {
    values.push(id)
    await pool.query(
      `UPDATE payouts SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
  }
  const [[row]] = await pool.query('SELECT * FROM payouts WHERE id = ?', [id])
  return row
}

export async function createPayout(payoutData) {
  const [result] = await pool.query(
    'INSERT INTO payouts (date, funds_released) VALUES (?, ?)',
    [payoutData.date, payoutData.funds_released]
  )
  const insertId = result.insertId
  const [[row]] = await pool.query('SELECT * FROM payouts WHERE id = ?', [insertId])
  return row
}
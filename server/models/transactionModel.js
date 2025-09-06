import { pool } from '../db/mysql.js'

export async function getAllTransactions() {
  const [rows] = await pool.query(
    'SELECT * FROM financial_transactions ORDER BY date DESC, created_at DESC'
  )
  return rows
}

export async function createTransaction({ date, description, transaction_type, amount, source = 'manual' }) {
  const [result] = await pool.query(
    `INSERT INTO financial_transactions (date, description, transaction_type, amount, source)
     VALUES (?, ?, ?, ?, ?)`,
    [date, description, transaction_type, amount, source]
  )
  
  const [newTransaction] = await pool.query(
    'SELECT * FROM financial_transactions WHERE id = ?',
    [result.insertId]
  )
  
  return newTransaction[0]
}

export async function updateTransaction(id, updates) {
  const fields = []
  const values = []
  
  for (const [key, value] of Object.entries(updates)) {
    if (['date', 'description', 'transaction_type', 'amount', 'source'].includes(key)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update')
  }
  
  values.push(id)
  
  await pool.query(
    `UPDATE financial_transactions SET ${fields.join(', ')} WHERE id = ?`,
    values
  )
  
  const [updatedTransaction] = await pool.query(
    'SELECT * FROM financial_transactions WHERE id = ?',
    [id]
  )
  
  return updatedTransaction[0]
}

export async function deleteTransaction(id) {
  const [result] = await pool.query(
    'DELETE FROM financial_transactions WHERE id = ?',
    [id]
  )
  
  if (result.affectedRows === 0) {
    throw new Error('Transaction not found')
  }
  
  return { success: true, message: 'Transaction deleted successfully' }
}

export async function getTransactionById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM financial_transactions WHERE id = ?',
    [id]
  )
  
  return rows[0] || null
}

export async function getTransactionsByDateRange(startDate, endDate) {
  const [rows] = await pool.query(
    `SELECT * FROM financial_transactions 
     WHERE date BETWEEN ? AND ? 
     ORDER BY date DESC, created_at DESC`,
    [startDate, endDate]
  )
  
  return rows
}

export async function getTransactionsByType(transaction_type) {
  const [rows] = await pool.query(
    `SELECT * FROM financial_transactions 
     WHERE transaction_type = ? 
     ORDER BY date DESC, created_at DESC`,
    [transaction_type]
  )
  
  return rows
}

export async function checkSettlementExists(settlementDate, amount, utr) {
  const [rows] = await pool.query(
    `SELECT * FROM financial_transactions 
     WHERE description LIKE ? AND amount = ? AND date = ?`,
    [`%${utr}%`, amount, settlementDate]
  )
  
  return rows.length > 0
}

export async function createSettlementTransaction(settlementData) {
  const { settlementDate, amount, utr } = settlementData
  
  // Check if settlement already exists
  const exists = await checkSettlementExists(settlementDate, amount, utr)
  if (exists) {
    return { success: false, message: 'Settlement already exists in transactions' }
  }
  
  const description = `Cashfree Settlement - UTR: ${utr}`
  const transaction_type = 'credit'
  
  const [result] = await pool.query(
    `INSERT INTO financial_transactions (date, description, transaction_type, amount, source)
     VALUES (?, ?, ?, ?, ?)`,
    [settlementDate, description, transaction_type, amount, 'cashfree_settlement']
  )
  
  const [newTransaction] = await pool.query(
    'SELECT * FROM financial_transactions WHERE id = ?',
    [result.insertId]
  )
  
  return { success: true, transaction: newTransaction[0] }
}

export function isTransactionEditable(transaction) {
  // Only manually created transactions are editable
  return !transaction.source || transaction.source === 'manual'
}

export function isTransactionDeletable(transaction) {
  // Only manually created transactions are deletable
  return !transaction.source || transaction.source === 'manual'
}

export async function checkExistingPayoutTransaction({ canteenId, payoutDate, amount }) {
  // Check if a canteen payout transaction already exists for this canteen, date, and amount
  // We check for transactions that contain the payout date in the description and match the amount
  const [rows] = await pool.query(
    `SELECT * FROM financial_transactions 
     WHERE source = 'canteen_payout' 
     AND description LIKE ? 
     AND amount = ? 
     AND transaction_type = 'debit'`,
    [`%(${payoutDate})%`, amount]
  )
  
  return rows.length > 0 ? rows[0] : null
}
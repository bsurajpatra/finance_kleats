import { pool } from '../db/mysql.js'

export async function getAllTransactions() {
  const [rows] = await pool.query(
    'SELECT * FROM financial_transactions ORDER BY date DESC, created_at DESC'
  )
  return rows
}

export async function createTransaction({ date, description, transaction_type, amount }) {
  const [result] = await pool.query(
    `INSERT INTO financial_transactions (date, description, transaction_type, amount)
     VALUES (?, ?, ?, ?)`,
    [date, description, transaction_type, amount]
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
    if (['date', 'description', 'transaction_type', 'amount'].includes(key)) {
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
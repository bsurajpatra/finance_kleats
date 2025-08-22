import { pool } from '../db/mysql.js'

export async function getAllTransactions() {
  const [rows] = await pool.query(
    'SELECT * FROM finance_transactions ORDER BY date ASC, id ASC'
  )
  return rows
}

export async function createTransaction({ date, description, amount, type, notes }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [[prev]] = await conn.query(
      `SELECT id, remaining_balance, date
       FROM finance_transactions
       WHERE date <= ?
       ORDER BY date DESC, id DESC
       LIMIT 1`,
      [date]
    )

    const previous_balance = prev?.remaining_balance || 0
    const credit = type === 'credit' ? amount : 0
    const debit = type === 'debit' ? amount : 0
    const remaining_balance = previous_balance + credit - debit

    const [insertRes] = await conn.query(
      `INSERT INTO finance_transactions
        (date, description, credit, debit, previous_balance, remaining_balance, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, description, credit, debit, previous_balance, remaining_balance, notes]
    )

    const insertedId = insertRes.insertId

    const [subs] = await conn.query(
      `SELECT id, date, credit, debit
       FROM finance_transactions
       WHERE date > ?
          OR (date = ? AND id > ?)
       ORDER BY date ASC, id ASC`,
      [date, date, insertedId]
    )

    let runningBalance = remaining_balance
    for (const tx of subs) {
      const newRemaining = runningBalance + Number(tx.credit) - Number(tx.debit)
      await conn.query(
        `UPDATE finance_transactions
         SET previous_balance = ?, remaining_balance = ?
         WHERE id = ?`,
        [runningBalance, newRemaining, tx.id]
      )
      runningBalance = newRemaining
    }

    const [[inserted]] = await conn.query(
      `SELECT * FROM finance_transactions WHERE id = ?`,
      [insertedId]
    )

    await conn.commit()
    return inserted
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// Helper retained behavior in SQL path: handled inline in create/update/delete

export async function updateTransaction(id, updates) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    if (updates && Object.keys(updates).length > 0) {
      const fields = []
      const values = []
      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = ?`)
        values.push(value)
      }
      values.push(id)
      await conn.query(
        `UPDATE finance_transactions SET ${fields.join(', ')} WHERE id = ?`,
        values
      )
    }

    const [[currentTx]] = await conn.query(
      `SELECT * FROM finance_transactions WHERE id = ?`,
      [id]
    )
    if (!currentTx) throw new Error('Transaction not found')

    const [[prev]] = await conn.query(
      `SELECT remaining_balance
       FROM finance_transactions
       WHERE date < ?
          OR (date = ? AND id < ?)
       ORDER BY date DESC, id DESC
       LIMIT 1`,
      [currentTx.date, currentTx.date, id]
    )
    const previous_balance = prev?.remaining_balance || 0
    const remaining_balance = previous_balance + Number(currentTx.credit) - Number(currentTx.debit)

    await conn.query(
      `UPDATE finance_transactions
       SET previous_balance = ?, remaining_balance = ?
       WHERE id = ?`,
      [previous_balance, remaining_balance, id]
    )

    const [subs] = await conn.query(
      `SELECT id, date, credit, debit
       FROM finance_transactions
       WHERE date > ?
          OR (date = ? AND id > ?)
       ORDER BY date ASC, id ASC`,
      [currentTx.date, currentTx.date, id]
    )

    let runningBalance = remaining_balance
    for (const tx of subs) {
      const newRemaining = runningBalance + Number(tx.credit) - Number(tx.debit)
      await conn.query(
        `UPDATE finance_transactions
         SET previous_balance = ?, remaining_balance = ?
         WHERE id = ?`,
        [runningBalance, newRemaining, tx.id]
      )
      runningBalance = newRemaining
    }

    const [[updated]] = await conn.query(
      `SELECT * FROM finance_transactions WHERE id = ?`,
      [id]
    )

    await conn.commit()
    return updated
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// recalculateBalancesAsync inlined in updateTransaction

export async function deleteTransaction(id) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [[toDelete]] = await conn.query(
      `SELECT * FROM finance_transactions WHERE id = ?`,
      [id]
    )
    if (!toDelete) throw new Error('Transaction not found')

    const [[prev]] = await conn.query(
      `SELECT remaining_balance
       FROM finance_transactions
       WHERE date < ?
          OR (date = ? AND id < ?)
       ORDER BY date DESC, id DESC
       LIMIT 1`,
      [toDelete.date, toDelete.date, toDelete.id]
    )
    const startingBalance = prev?.remaining_balance || 0

    await conn.query(`DELETE FROM finance_transactions WHERE id = ?`, [id])

    const [subs] = await conn.query(
      `SELECT id, date, credit, debit
       FROM finance_transactions
       WHERE date > ?
          OR (date = ? AND id > ?)
       ORDER BY date ASC, id ASC`,
      [toDelete.date, toDelete.date, toDelete.id]
    )

    let runningBalance = startingBalance
    for (const tx of subs) {
      const newRemaining = runningBalance + Number(tx.credit) - Number(tx.debit)
      await conn.query(
        `UPDATE finance_transactions
         SET previous_balance = ?, remaining_balance = ?
         WHERE id = ?`,
        [runningBalance, newRemaining, tx.id]
      )
      runningBalance = newRemaining
    }

    await conn.commit()
    return { success: true }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// recalculateBalancesAfterDeletion handled inline in deleteTransaction
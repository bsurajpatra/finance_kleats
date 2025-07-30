import { getAllTransactions } from '../models/transactionModel.js'

export async function fetchTransactions(req, res) {
  try {
    const transactions = await getAllTransactions()
    res.json(transactions)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
} 
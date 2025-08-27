import { getAllTransactions } from '../models/transactionModel.js'

export async function fetchSummary(req, res) {
  try {
    const transactions = await getAllTransactions()

    res.json({ transactions })
  } catch (err) {
    console.error('Error fetching summary:', err)
    res.status(500).json({ error: 'Failed to fetch summary', details: err.message })
  }
}



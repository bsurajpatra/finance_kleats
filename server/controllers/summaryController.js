import { getAllTransactions } from '../models/transactionModel.js'
import { getAllPayouts } from '../models/payoutModel.js'

export async function fetchSummary(req, res) {
  try {
    const [transactions, payouts] = await Promise.all([
      getAllTransactions(),
      getAllPayouts(),
    ])

    res.json({ transactions, payouts })
  } catch (err) {
    console.error('Error fetching summary:', err)
    res.status(500).json({ error: 'Failed to fetch summary', details: err.message })
  }
}



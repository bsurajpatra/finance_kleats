import { getAllTransactions } from '../models/transactionModel.js'
import { getDailyRevenueByCanteen } from '../models/ordersModel.js'
import { getDailyGrossProfit } from '../models/ordersModel.js'

export async function fetchSummary(req, res) {
  try {
    const transactions = await getAllTransactions()

    res.json({ transactions })
  } catch (err) {
    console.error('Error fetching summary:', err)
    res.status(500).json({ error: 'Failed to fetch summary', details: err.message })
  }
}

export async function getCanteenSummary(req, res) {
  try {
    const { canteenId } = req.params
    const revenue = await getDailyRevenueByCanteen(canteenId)
    res.json({ revenue })
  } catch (err) {
    console.error('Error fetching canteen summary:', err)
    res.status(500).json({ error: 'Failed to fetch canteen summary' })
  }
}

export async function getDailyProfitController(req, res) {
  try {
    const { canteenId } = req.params
    const { startDate, endDate } = req.query
    
    // Convert 'all' to null for the model function
    const actualCanteenId = canteenId === 'all' ? null : canteenId
    const grossProfit = await getDailyGrossProfit(actualCanteenId, startDate, endDate)
    res.json(grossProfit)
  } catch (err) {
    console.error('Error fetching daily profit:', err)
    res.status(500).json({ error: 'Failed to fetch daily profit' })
  }
}



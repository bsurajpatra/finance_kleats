import { getAllCanteens } from '../models/canteenModel.js'
import { getDailyRevenueByCanteen } from '../models/ordersModel.js'

export async function fetchCanteens(req, res) {
  try {
    const canteens = await getAllCanteens()
    res.json(canteens)
  } catch (err) {
    console.error('Error fetching canteens:', err)
    res.status(500).json({ error: 'Failed to fetch canteens', details: err.message })
  }
}

export async function fetchCanteenSettlements(req, res) {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ error: 'CanteenId is required' })
    const rows = await getDailyRevenueByCanteen(id)
    res.json(rows)
  } catch (err) {
    console.error('Error fetching canteen settlements:', err)
    res.status(500).json({ error: 'Failed to fetch settlements', details: err.message })
  }
}



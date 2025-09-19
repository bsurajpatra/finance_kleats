import { getAllTransactions } from '../models/transactionModel.js'
import { getDailyRevenueByCanteen } from '../models/ordersModel.js'
import { getDailyGrossProfit } from '../models/ordersModel.js'
import { 
  calculateAndStoreTodaysGrossProfit, 
  getTodaysGrossProfit, 
  storeAllGrossProfitData,
  getGrossProfitHistory,
  populateAllHistoricalData
} from '../models/dailyGrossProfitModel.js'

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
    
    // Store all calculated gross profit data in the database
    // This ensures all historical data is persisted
    try {
      await storeAllGrossProfitData(grossProfit)
    } catch (storeError) {
      // Log the error but don't fail the main request
      console.warn('Failed to store gross profit data:', storeError.message)
    }
    
    res.json(grossProfit)
  } catch (err) {
    console.error('Error fetching daily profit:', err)
    res.status(500).json({ error: 'Failed to fetch daily profit' })
  }
}

/**
 * Get today's stored gross profit from the database
 * This endpoint fetches the pre-calculated and stored gross profit for today
 * without recalculating it from the orders table
 */
export async function getTodaysGrossProfitController(req, res) {
  try {
    const todaysGrossProfit = await getTodaysGrossProfit()
    
    if (!todaysGrossProfit) {
      return res.status(404).json({ 
        error: 'No gross profit data found for today',
        message: 'Gross profit for today has not been calculated yet'
      })
    }
    
    res.json({
      success: true,
      data: todaysGrossProfit
    })
  } catch (err) {
    console.error('Error fetching today\'s gross profit:', err)
    res.status(500).json({ error: 'Failed to fetch today\'s gross profit' })
  }
}

/**
 * Get all stored gross profit history
 * This endpoint fetches all stored gross profit data from the database
 */
export async function getAllGrossProfitHistoryController(req, res) {
  try {
    const { startDate, endDate } = req.query
    
    // Default to last 30 days if no dates provided
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)
    
    const start = startDate || defaultStartDate.toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]
    
    const history = await getGrossProfitHistory(start, end)
    
    res.json({
      success: true,
      data: history,
      count: history.length,
      dateRange: { start, end }
    })
  } catch (err) {
    console.error('Error fetching gross profit history:', err)
    res.status(500).json({ error: 'Failed to fetch gross profit history' })
  }
}

/**
 * Populate all historical gross profit data
 * This endpoint calculates and stores all historical gross profit data
 * Use this to backfill the database with existing calculations
 */
export async function populateHistoricalDataController(req, res) {
  try {
    const { canteenId } = req.params
    const { startDate, endDate } = req.query
    
    // Convert 'all' to null for the model function
    const actualCanteenId = canteenId === 'all' ? null : canteenId
    
    // Default to last 30 days if no dates provided
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)
    
    const start = startDate || defaultStartDate.toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]
    
    const result = await populateAllHistoricalData(actualCanteenId, start, end)
    
    res.json({
      success: true,
      message: 'Historical data populated successfully',
      ...result
    })
  } catch (err) {
    console.error('Error populating historical data:', err)
    res.status(500).json({ error: 'Failed to populate historical data' })
  }
}



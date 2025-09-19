import { pool } from '../db/mysql.js'

/**
 * Insert or update daily gross profit for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} grossProfit - Gross profit amount
 * @returns {Promise<Object>} - Result of the operation
 */
export async function upsertDailyGrossProfit(date, grossProfit) {
  try {
    const [result] = await pool.query(
      `INSERT INTO daily_gross_profit (date, gross_profit, last_updated) 
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE 
       gross_profit = VALUES(gross_profit),
       last_updated = CURRENT_TIMESTAMP`,
      [date, grossProfit]
    )
    return result
  } catch (error) {
    console.error('Error upserting daily gross profit:', error)
    throw error
  }
}

/**
 * Get today's gross profit from the stored table
 * @returns {Promise<Object|null>} - Today's gross profit data or null if not found
 */
export async function getTodaysGrossProfit() {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const [rows] = await pool.query(
      `SELECT date, gross_profit, last_updated 
       FROM daily_gross_profit 
       WHERE date = ?`,
      [today]
    )
    return rows.length > 0 ? rows[0] : null
  } catch (error) {
    console.error('Error fetching today\'s gross profit:', error)
    throw error
  }
}

/**
 * Get gross profit for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} - Gross profit data for the date or null if not found
 */
export async function getGrossProfitByDate(date) {
  try {
    const [rows] = await pool.query(
      `SELECT date, gross_profit, last_updated 
       FROM daily_gross_profit 
       WHERE date = ?`,
      [date]
    )
    return rows.length > 0 ? rows[0] : null
  } catch (error) {
    console.error('Error fetching gross profit by date:', error)
    throw error
  }
}

/**
 * Get gross profit history for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} - Array of gross profit records
 */
export async function getGrossProfitHistory(startDate, endDate) {
  try {
    const [rows] = await pool.query(
      `SELECT date, gross_profit, last_updated 
       FROM daily_gross_profit 
       WHERE date BETWEEN ? AND ?
       ORDER BY date DESC`,
      [startDate, endDate]
    )
    return rows
  } catch (error) {
    console.error('Error fetching gross profit history:', error)
    throw error
  }
}

/**
 * Store all gross profit data from the calculation results
 * This function takes the array of daily gross profit data and stores each day
 * @param {Array} grossProfitData - Array of daily gross profit objects
 * @returns {Promise<Object>} - Summary of stored data
 */
export async function storeAllGrossProfitData(grossProfitData) {
  try {
    if (!Array.isArray(grossProfitData) || grossProfitData.length === 0) {
      console.log('No gross profit data to store')
      return { stored: 0, errors: 0 }
    }

    let stored = 0
    let errors = 0
    const results = []

    for (const item of grossProfitData) {
      try {
        const { order_date, gross_profit } = item
        
        if (!order_date || gross_profit === undefined) {
          console.warn('Skipping invalid data:', item)
          continue
        }

        // Store each day's gross profit
        await upsertDailyGrossProfit(order_date, Number(gross_profit))
        stored++
        results.push({ date: order_date, gross_profit: Number(gross_profit) })
        
        console.log(`Stored gross profit for ${order_date}: ₹${gross_profit}`)
      } catch (error) {
        console.error(`Error storing gross profit for ${item.order_date}:`, error.message)
        errors++
      }
    }

    console.log(`Gross profit storage complete: ${stored} stored, ${errors} errors`)
    
    return {
      stored,
      errors,
      results
    }
  } catch (error) {
    console.error('Error storing all gross profit data:', error)
    throw error
  }
}

/**
 * Populate all historical gross profit data for a date range
 * This function calculates and stores gross profit for all days in the specified range
 * @param {string|null} canteenId - Canteen ID or null for all canteens
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Summary of populated data
 */
export async function populateAllHistoricalData(canteenId = null, startDate, endDate) {
  try {
    console.log(`Populating historical gross profit data from ${startDate} to ${endDate}`)
    
    // Import the calculation function
    const { getDailyGrossProfit } = await import('./ordersModel.js')
    
    // Calculate gross profit for the entire date range
    const grossProfitData = await getDailyGrossProfit(canteenId, startDate, endDate)
    
    if (!Array.isArray(grossProfitData) || grossProfitData.length === 0) {
      console.log('No gross profit data found for the specified date range')
      return { stored: 0, errors: 0, message: 'No data found for the specified date range' }
    }
    
    // Store all the calculated data
    const result = await storeAllGrossProfitData(grossProfitData)
    
    console.log(`Historical data population complete: ${result.stored} records stored, ${result.errors} errors`)
    
    return {
      ...result,
      dateRange: { startDate, endDate },
      message: `Successfully populated ${result.stored} days of gross profit data`
    }
  } catch (error) {
    console.error('Error populating historical gross profit data:', error)
    throw error
  }
}

/**
 * Calculate and store today's gross profit
 * This function calculates the current day's gross profit and stores it
 * @param {string|null} canteenId - Canteen ID or null for all canteens
 * @returns {Promise<Object>} - The stored gross profit data
 */
export async function calculateAndStoreTodaysGrossProfit(canteenId = null) {
  try {
    // Import the calculation function
    const { getDailyGrossProfit } = await import('./ordersModel.js')
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0]
    const startDate = `${today} 00:00:00`
    const endDate = `${today} 23:59:59`
    
    // Calculate gross profit for today
    const grossProfitData = await getDailyGrossProfit(canteenId, startDate, endDate)
    
    // Sum up all gross profits for today
    const totalGrossProfit = grossProfitData.reduce((sum, item) => {
      return sum + Number(item.gross_profit || 0)
    }, 0)
    
    // Store in database
    await upsertDailyGrossProfit(today, totalGrossProfit)
    
    return {
      date: today,
      gross_profit: totalGrossProfit,
      last_updated: new Date()
    }
  } catch (error) {
    console.error('Error calculating and storing today\'s gross profit:', error)
    throw error
  }
}

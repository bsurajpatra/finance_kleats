/**
 * End-of-day script to ensure today's gross profit is stored permanently
 * This script should be run via cron job at the end of each day
 * 
 * Cron example: 0 23 * * * /usr/bin/node /path/to/end-of-day-gross-profit.js
 */

import { calculateAndStoreTodaysGrossProfit } from '../models/dailyGrossProfitModel.js'

async function endOfDayGrossProfit() {
  try {
    console.log(`🕐 Running end-of-day gross profit calculation at ${new Date().toISOString()}`)
    
    // Calculate and store today's gross profit for all canteens
    const result = await calculateAndStoreTodaysGrossProfit(null) // null = all canteens
    
    console.log('✅ End-of-day gross profit stored successfully:', {
      date: result.date,
      gross_profit: result.gross_profit,
      last_updated: result.last_updated
    })
    
    // Exit successfully
    process.exit(0)
    
  } catch (error) {
    console.error('❌ End-of-day gross profit calculation failed:', error)
    
    // Exit with error code
    process.exit(1)
  }
}

// Run the end-of-day process
endOfDayGrossProfit()

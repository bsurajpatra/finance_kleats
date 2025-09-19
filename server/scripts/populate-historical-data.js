/**
 * Script to populate historical gross profit data
 * This will backfill the database with all the historical calculations
 * 
 * Usage: node scripts/populate-historical-data.js
 */

import { pool } from '../db/mysql.js'
import { populateAllHistoricalData } from '../models/dailyGrossProfitModel.js'

async function populateHistoricalData() {
  try {
    console.log('🚀 Starting historical gross profit data population...\n')
    
    // Create the table first
    console.log('1. Creating daily_gross_profit table...')
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS daily_gross_profit (
        date DATE PRIMARY KEY,
        gross_profit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_date (date),
        INDEX idx_last_updated (last_updated)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
    await pool.query(createTableSQL)
    console.log('✅ Table created successfully\n')
    
    // Populate data for the date range you mentioned (Aug 25 - Sept 15, 2025)
    const startDate = '2025-08-25'
    const endDate = '2025-09-15'
    
    console.log(`2. Populating data from ${startDate} to ${endDate}...`)
    const result = await populateAllHistoricalData(null, startDate, endDate) // null = all canteens
    
    console.log('\n📊 Population Results:')
    console.log(`✅ Records stored: ${result.stored}`)
    console.log(`❌ Errors: ${result.errors}`)
    console.log(`📅 Date range: ${result.dateRange.startDate} to ${result.dateRange.endDate}`)
    console.log(`💬 Message: ${result.message}`)
    
    if (result.results && result.results.length > 0) {
      console.log('\n📋 Stored Data:')
      result.results.forEach((item, index) => {
        console.log(`${index + 1}. ${item.date}: ₹${item.gross_profit}`)
      })
    }
    
    console.log('\n🎉 Historical data population completed successfully!')
    
  } catch (error) {
    console.error('❌ Error populating historical data:', error)
  } finally {
    // Close the database connection
    await pool.end()
    process.exit(0)
  }
}

// Run the population
populateHistoricalData()

import { pool } from '../db/mysql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Starting migration: Adding source column to financial_transactions...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'add_source_to_transactions.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await pool.query(statement);
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Show summary of updated transactions
    const [cashfreeCount] = await pool.query(
      "SELECT COUNT(*) as count FROM financial_transactions WHERE source = 'cashfree_settlement'"
    );
    
    const [canteenCount] = await pool.query(
      "SELECT COUNT(*) as count FROM financial_transactions WHERE source = 'canteen_payout'"
    );
    
    const [manualCount] = await pool.query(
      "SELECT COUNT(*) as count FROM financial_transactions WHERE source = 'manual'"
    );
    
    console.log('\nMigration Summary:');
    console.log(`- Cashfree Settlements: ${cashfreeCount[0].count}`);
    console.log(`- Canteen Payouts: ${canteenCount[0].count}`);
    console.log(`- Manual Transactions: ${manualCount[0].count}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default runMigration;

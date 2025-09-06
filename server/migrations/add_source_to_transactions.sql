-- Add source column to financial_transactions table
ALTER TABLE financial_transactions 
ADD COLUMN source VARCHAR(50) DEFAULT 'manual';

-- Update existing system transactions based on description patterns
-- Mark Cashfree settlements
UPDATE financial_transactions 
SET source = 'cashfree_settlement' 
WHERE description LIKE '%Cashfree Settlement%' 
   OR description LIKE '%UTR:%';

-- Mark canteen payouts
UPDATE financial_transactions 
SET source = 'canteen_payout' 
WHERE description LIKE '%Canteen Payout%' 
   OR description LIKE '%Canteen %';

-- Ensure all other transactions are marked as manual
UPDATE financial_transactions 
SET source = 'manual' 
WHERE source IS NULL OR source = '';

-- Add index for better performance
CREATE INDEX idx_financial_transactions_source ON financial_transactions(source);

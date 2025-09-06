import { getAllTransactions, createTransaction, updateTransaction, deleteTransaction, getTransactionById, getTransactionsByDateRange, getTransactionsByType, createSettlementTransaction, isTransactionEditable, isTransactionDeletable } from '../models/transactionModel.js'
import cashfreeService from '../services/cashfreeService.js'

export async function fetchTransactions(req, res) {
  try {
    const transactions = await getAllTransactions()
    res.json(transactions)
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
}

export async function addTransaction(req, res) {
  try {
    console.log('Received transaction data:', req.body);
    const { date, description, transaction_type, amount } = req.body;
    
    // Validation
    if (!date || !description || !transaction_type || !amount) {
      return res.status(400).json({ error: 'Missing required fields: date, description, transaction_type, amount' });
    }
    
    if (transaction_type !== 'credit' && transaction_type !== 'debit') {
      return res.status(400).json({ error: 'Invalid transaction type. Must be "credit" or "debit"' });
    }
    
    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    console.log('Creating transaction with:', { date, description, transaction_type, amount: Number(amount) });
    const newTransaction = await createTransaction({ 
      date, 
      description, 
      transaction_type, 
      amount: Number(amount) 
    });
    
    console.log('Transaction created successfully:', newTransaction);
    res.status(201).json(newTransaction);
  } catch (err) {
    console.error('Error adding transaction:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to add transaction', details: err.message });
  }
}

export async function updateTransactionController(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('Updating transaction:', id, 'with:', updates);
    
    // Check if transaction exists and is editable
    const existingTransaction = await getTransactionById(id);
    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (!isTransactionEditable(existingTransaction)) {
      return res.status(403).json({ 
        error: 'Cannot edit system-generated transaction',
        message: 'Only manually created transactions can be edited'
      });
    }
    
    // Validate transaction_type if it's being updated
    if (updates.transaction_type && updates.transaction_type !== 'credit' && updates.transaction_type !== 'debit') {
      return res.status(400).json({ error: 'Invalid transaction type. Must be "credit" or "debit"' });
    }
    
    // Validate amount if it's being updated
    if (updates.amount && (isNaN(updates.amount) || Number(updates.amount) <= 0)) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    const updatedTransaction = await updateTransaction(id, updates);
    console.log('Transaction updated successfully:', updatedTransaction);
    
    res.json(updatedTransaction);
  } catch (err) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ error: 'Failed to update transaction', details: err.message });
  }
}

export async function deleteTransactionController(req, res) {
  try {
    const { id } = req.params;
    
    console.log('Deleting transaction:', id);
    
    // Check if transaction exists and is deletable
    const existingTransaction = await getTransactionById(id);
    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (!isTransactionDeletable(existingTransaction)) {
      return res.status(403).json({ 
        error: 'Cannot delete system-generated transaction',
        message: 'Only manually created transactions can be deleted'
      });
    }
    
    await deleteTransaction(id);
    console.log('Transaction deleted successfully');
    
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    res.status(500).json({ error: 'Failed to delete transaction', details: err.message });
  }
}

export async function getTransactionByIdController(req, res) {
  try {
    const { id } = req.params;
    
    const transaction = await getTransactionById(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (err) {
    console.error('Error fetching transaction by ID:', err);
    res.status(500).json({ error: 'Failed to fetch transaction', details: err.message });
  }
}

export async function getTransactionsByDateRangeController(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Both startDate and endDate are required' });
    }
    
    const transactions = await getTransactionsByDateRange(startDate, endDate);
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions by date range:', err);
    res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
  }
}

export async function getTransactionsByTypeController(req, res) {
  try {
    const { transaction_type } = req.params;
    
    if (transaction_type !== 'credit' && transaction_type !== 'debit') {
      return res.status(400).json({ error: 'Invalid transaction type. Must be "credit" or "debit"' });
    }
    
    const transactions = await getTransactionsByType(transaction_type);
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions by type:', err);
    res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
  }
}

export async function syncSettlementsToTransactions(req, res) {
  try {
    const { days = 7 } = req.query; // Default to last 7 days
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    const filters = {
      start_date: startDate.toISOString().split('T')[0] + 'T00:00:00Z',
      end_date: endDate.toISOString().split('T')[0] + 'T23:59:59Z'
    };
    
    console.log('Syncing settlements for date range:', filters);
    
    // Fetch settlements from Cashfree
    const settlements = await cashfreeService.fetchAllSettlements(filters);
    const items = Array.isArray(settlements) ? settlements : [];
    
    console.log('Fetched settlements count:', items.length);
    if (items.length > 0) {
      console.log('First settlement sample:', JSON.stringify(items[0], null, 2));
    }
    
    const results = {
      processed: 0,
      added: 0,
      skipped: 0,
      errors: []
    };
    
    // Process each settlement
    for (const item of items) {
      try {
        const details = item?.settlement_details || {};
        const settlementDate = details.settlement_date;
        const amount = details.amount_settled;
        const utr = details.utr;
        
        console.log('Processing settlement:', { settlementDate, amount, utr });
        
        // Skip if essential data is missing
        if (!settlementDate || !amount || !utr) {
          console.log('Skipping settlement due to missing data:', { settlementDate, amount, utr });
          results.skipped++;
          continue;
        }
        
        // Convert settlement date to YYYY-MM-DD format
        const formattedDate = settlementDate.split('T')[0];
        
        const settlementData = {
          settlementDate: formattedDate,
          amount: parseFloat(amount),
          utr: utr
        };
        
        const result = await createSettlementTransaction(settlementData);
        
        if (result.success) {
          results.added++;
        } else {
          results.skipped++;
        }
        
        results.processed++;
      } catch (error) {
        console.error('Error processing settlement:', error);
        results.errors.push({
          settlement: item,
          error: error.message
        });
        results.skipped++;
      }
    }
    
    res.json({
      success: true,
      message: `Settlement sync completed. Processed: ${results.processed}, Added: ${results.added}, Skipped: ${results.skipped}`,
      results
    });
    
  } catch (err) {
    console.error('Error syncing settlements to transactions:', err);
    res.status(500).json({ 
      error: 'Failed to sync settlements', 
      details: err.message 
    });
  }
} 
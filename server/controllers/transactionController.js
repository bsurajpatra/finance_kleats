import { getAllTransactions, createTransaction, updateTransaction, deleteTransaction, getTransactionById, getTransactionsByDateRange, getTransactionsByType } from '../models/transactionModel.js'

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
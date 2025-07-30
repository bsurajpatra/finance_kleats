import { getAllTransactions, createTransaction } from '../models/transactionModel.js'

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
    const { date, amount, description, type, notes } = req.body;
    if (!date || !amount || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (type !== 'credit' && type !== 'debit') {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }
    console.log('Creating transaction with:', { date, amount: Number(amount), description, type, notes });
    const newTx = await createTransaction({ date, amount: Number(amount), description, type, notes });
    console.log('Transaction created successfully:', newTx);
    res.status(201).json(newTx);
  } catch (err) {
    console.error('Error adding transaction:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to add transaction', details: err.message });
  }
} 
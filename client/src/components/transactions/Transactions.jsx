import React, { useState, useEffect } from 'react';
import './Transactions.css';
import { API_ENDPOINTS } from '../../config/api.js';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.TRANSACTIONS);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError('Failed to load transactions. Please try again later.');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const getTransactionType = (credit, debit) => {
    if (credit > 0) return 'credit';
    if (debit > 0) return 'debit';
    return 'neutral';
  };

  if (loading) {
    return (
      <div className="transactions-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transactions-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchTransactions} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions-container">
      <div className="transactions-header">
        <h2>All Transactions</h2>
      </div>

      {transactions.length === 0 ? (
        <div className="no-transactions">
          <p>No transactions found.</p>
        </div>
      ) : (
        <div className="transactions-table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Date</th>
                <th>Description</th>
                <th>Credit</th>
                <th>Debit</th>
                <th>Previous Balance</th>
                <th>Remaining Balance</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => {
                const transactionType = getTransactionType(transaction.credit, transaction.debit);
                return (
                  <tr key={transaction.id} className={`transaction-row ${transactionType}`}>
                    <td className="serial-number">{index + 1}</td>
                    <td>{formatDate(transaction.date)}</td>
                    <td className="description">{transaction.description || 'N/A'}</td>
                    <td className={`amount credit ${transaction.credit > 0 ? 'positive' : ''}`}>
                      {transaction.credit > 0 ? formatAmount(transaction.credit) : '-'}
                    </td>
                    <td className={`amount debit ${transaction.debit > 0 ? 'negative' : ''}`}>
                      {transaction.debit > 0 ? formatAmount(transaction.debit) : '-'}
                    </td>
                    <td className="balance">{formatAmount(transaction.previous_balance)}</td>
                    <td className="balance">{formatAmount(transaction.remaining_balance)}</td>
                    <td className="notes">{transaction.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="transactions-summary">
        <p>Total Transactions: {transactions.length}</p>
      </div>
    </div>
  );
};

export default Transactions; 
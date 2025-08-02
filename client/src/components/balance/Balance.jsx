import React, { useState, useEffect } from 'react';
import './Balance.css';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';

const Balance = () => {
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTransactions();
    fetchPayouts();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await authFetch(API_ENDPOINTS.TRANSACTIONS);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError('Failed to load balance data. Please try again later.');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      const response = await authFetch(API_ENDPOINTS.PAYOUTS);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payouts');
      }
      
      const data = await response.json();
      setPayouts(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching payouts:', err);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getCurrentBalance = () => {
    if (transactions.length === 0) return 0;
    return transactions[transactions.length - 1]?.remaining_balance || 0;
  };

  const getRecentTransactions = () => {
    return transactions.slice(-5).reverse(); 
  };

  const getRecentPayouts = () => {
    return payouts.slice(-5).reverse();
  };

  if (loading) {
    return (
      <div className="balance-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading balance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="balance-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchTransactions} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentBalance = getCurrentBalance();
  const recentTransactions = getRecentTransactions();
  const recentPayouts = getRecentPayouts();

  return (
    <div className="balance-container">
      <div className="balance-display">
        <div className="balance-shapes">
          <div className="shape circle-1"></div>
          <div className="shape circle-2"></div>
          <div className="shape triangle"></div>
          <div className="shape square"></div>
        </div>
        
        <div className="balance-card">
          <div className="balance-header">
            <div className="balance-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2>Current Balance</h2>
            <button onClick={() => { fetchTransactions(); fetchPayouts(); }} className="refresh-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
          </div>
          
          <div className="balance-amount-container">
            <div className="balance-amount">
              {formatAmount(currentBalance)}
            </div>
            <div className="balance-indicator">
              <div className="pulse-dot"></div>
              <span>Live Balance</span>
            </div>
          </div>
          
          <div className="balance-subtitle">
            Last updated: {transactions.length > 0 ? formatDate(transactions[transactions.length - 1]?.date) : 'N/A'}
          </div>
        </div>
      </div>

      <div className="recent-transactions">
        <div className="transactions-header-left">
          <h3>
            <svg viewBox="0 0 24 24" fill="currentColor" className="header-icon">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Recent Transactions
          </h3>
        </div>
        
        {recentTransactions.length === 0 ? (
          <div className="no-transactions">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                <path d="M12 6c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
              </svg>
            </div>
            <p>No recent transactions found.</p>
          </div>
        ) : (
          <div className="transactions-list">
            {recentTransactions.map((transaction) => {
              const isCredit = transaction.credit > 0;
              const amount = isCredit ? transaction.credit : transaction.debit;
              const sign = isCredit ? '+' : '-';
              
              return (
                <div key={transaction.id} className={`transaction-item ${isCredit ? 'credit' : 'debit'}`}>
                  <div className="transaction-icon">
                    {isCredit ? (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                  </div>
                  <div className="transaction-info">
                    <div className="transaction-description">
                      {transaction.description || 'Transaction'}
                    </div>
                    <div className="transaction-date">
                      {formatDate(transaction.date)}
                    </div>
                  </div>
                  <div className={`transaction-amount ${isCredit ? 'positive' : 'negative'}`}>
                    {sign}{formatAmount(amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="recent-payouts">
        <div className="payouts-header-left">
          <h3>
            <svg viewBox="0 0 24 24" fill="currentColor" className="header-icon">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Recent Payouts
          </h3>
        </div>
        
        {recentPayouts.length === 0 ? (
          <div className="no-payouts">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                <path d="M12 6c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
              </svg>
            </div>
                         <p>No recent payments received.</p>
          </div>
        ) : (
          <div className="payouts-list">
            {recentPayouts.map((payout) => (
              <div key={payout.id} className="payout-item">
                                 <div className="payout-icon">
                   <svg viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                   </svg>
                 </div>
                 <div className="payout-info">
                   <div className="payout-description">
                     Payment Received
                   </div>
                   <div className="payout-date">
                     {formatDate(payout.date)}
                   </div>
                 </div>
                 <div className="payout-amount positive">
                   +{formatAmount(payout.funds_released)}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Balance; 
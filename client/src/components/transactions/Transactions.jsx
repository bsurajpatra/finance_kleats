import React, { useState, useEffect, useRef } from 'react';
import './Transactions.css';
import { API_ENDPOINTS, authFetch } from '../../config/api.js';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, debits, credits
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilter(false);
      }
    }
    if (showFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await authFetch(API_ENDPOINTS.TRANSACTIONS);
      if (!response.ok) throw new Error('Failed to fetch transactions');
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

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      const afterStart = !startDate || txDate >= new Date(startDate);
      const beforeEnd = !endDate || txDate <= new Date(endDate);
      let typeMatch = true;
      if (typeFilter === 'debits') typeMatch = tx.debit > 0;
      if (typeFilter === 'credits') typeMatch = tx.credit > 0;
      return afterStart && beforeEnd && typeMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  // Export filtered transactions to CSV
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      'S.No.',
      'Date',
      'Description',
      'Credit',
      'Debit',
      'Previous Balance',
      'Remaining Balance',
      'Notes'
    ];
    const rows = filteredTransactions.map((tx, idx) => [
      idx + 1,
      formatDate(tx.date),
      tx.description || 'N/A',
      tx.credit > 0 ? tx.credit : '',
      tx.debit > 0 ? tx.debit : '',
      tx.previous_balance,
      tx.remaining_balance,
      tx.notes || ''
    ]);
    const csvContent =
      [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Filter Dropdown Button */}
          <div className="transactions-filter-dropdown-wrapper" ref={filterRef}>
            <button
              className="transactions-filter-btn"
              onClick={() => setShowFilter((prev) => !prev)}
            >
              Filter &#x25BC;
            </button>
            {showFilter && (
              <div className="transactions-filter-dropdown">
                <div className="filter-section">
                  <label>
                    Sort by:
                    <select
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value)}
                      style={{ marginLeft: '0.5rem', marginRight: '1rem' }}
                    >
                      <option value="desc">Descending date</option>
                      <option value="asc">Ascending date</option>
                    </select>
                  </label>
                </div>
                <div className="filter-section">
                  <label>
                    Period:
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      style={{ marginLeft: '0.5rem' }}
                    />
                    <span style={{ margin: '0 0.5rem' }}>to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </label>
                </div>
                <div className="filter-section transactions-type-filter">
                  <label>
                    <input
                      type="radio"
                      name="typeFilter"
                      value="all"
                      checked={typeFilter === 'all'}
                      onChange={() => setTypeFilter('all')}
                    />
                    All
                  </label>
                  <label style={{ marginLeft: '1rem' }}>
                    <input
                      type="radio"
                      name="typeFilter"
                      value="debits"
                      checked={typeFilter === 'debits'}
                      onChange={() => setTypeFilter('debits')}
                    />
                    Debits only
                  </label>
                  <label style={{ marginLeft: '1rem' }}>
                    <input
                      type="radio"
                      name="typeFilter"
                      value="credits"
                      checked={typeFilter === 'credits'}
                      onChange={() => setTypeFilter('credits')}
                    />
                    Credits only
                  </label>
                </div>
              </div>
            )}
          </div>
          <button
            className="transactions-export-btn"
            onClick={exportToCSV}
            style={{ marginLeft: '1rem' }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
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
              {filteredTransactions.map((transaction, index) => {
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
        <p>Total Transactions: {filteredTransactions.length}</p>
      </div>
    </div>
  );
};

export default Transactions; 
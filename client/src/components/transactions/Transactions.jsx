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
  const [typeFilter, setTypeFilter] = useState('all'); 
  const [showFilter, setShowFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    date: '',
    amount: '',
    description: '',
    type: 'credit',
    notes: ''
  });
  const [modalError, setModalError] = useState('');
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  
  const [editingCell, setEditingCell] = useState(null); 
  const [editValue, setEditValue] = useState('');

  const filterRef = useRef(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

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

  const handleCellDoubleClick = (rowId, field, value) => {
    setEditingCell({ rowId, field, value });
    setEditValue(value);
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    
    const originalTransaction = transactions.find(tx => tx.id === editingCell.rowId);
    const originalTransactions = [...transactions];
    
    try {
      const token = localStorage.getItem('token');
      let updateData = { [editingCell.field]: editValue };
      
      if (editingCell.field === 'credit') {
        updateData = { 
          credit: Number(editValue) || 0, 
          debit: 0 
        };
      } else if (editingCell.field === 'debit') {
        updateData = { 
          debit: Number(editValue) || 0, 
          credit: 0 
        };
      }
      
      setTransactions(prev => prev.map(tx => 
        tx.id === editingCell.rowId 
          ? { ...tx, ...updateData }
          : tx
      ));
      
      setEditingCell(null);
      setEditValue('');
      
      const response = await fetch(`${API_ENDPOINTS.TRANSACTIONS}/${editingCell.rowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update transaction');
      }
      
      setTimeout(() => {
        fetchTransactions();
      }, 100);
      
    } catch (err) {
      console.error('Error updating transaction:', err);
      
      setTransactions(originalTransactions);
      
      alert(`Failed to update transaction: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

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

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setModalData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!modalData.date || !modalData.amount || !modalData.type) {
      setModalError('Date, amount, and type are required.');
      return;
    }
    
    const originalTransactions = [...transactions];
    
    try {
      setIsAddingTransaction(true);
      const token = localStorage.getItem('token');
      const newTransactionData = {
        date: modalData.date,
        amount: Number(modalData.amount),
        description: modalData.description,
        type: modalData.type,
        notes: modalData.notes
      };
      
      const tempTransaction = {
        id: `temp-${Date.now()}`,
        ...newTransactionData,
        credit: newTransactionData.type === 'credit' ? newTransactionData.amount : 0,
        debit: newTransactionData.type === 'debit' ? newTransactionData.amount : 0,
        previous_balance: 0, 
        remaining_balance: 0, 
        isPending: true 
      };
      
      setTransactions(prev => [...prev, tempTransaction]);
      
      setShowModal(false);
      setModalData({ date: '', amount: '', description: '', type: 'credit', notes: '' });
      
      const res = await fetch(API_ENDPOINTS.TRANSACTIONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTransactionData)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add transaction');
      }
      
      setTransactions(prev => prev.filter(tx => tx.id !== tempTransaction.id));
      
      setTimeout(() => {
        fetchTransactions();
      }, 100);
      
    } catch (err) {
      console.error('Error adding transaction:', err);
      
      setTransactions(originalTransactions);
      
      setShowModal(true);
      setModalError(err.message);
    } finally {
      setIsAddingTransaction(false);
    }
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
          <button
            className="transactions-new-btn"
            onClick={() => setShowModal(true)}
          >
            New
          </button>
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

      {showModal && (
        <div className="transactions-modal-backdrop">
          <div className="transactions-modal">
            <h3>Add New Transaction</h3>
            <form onSubmit={handleAddTransaction} className="transactions-modal-form">
              <label>
                Date:
                <input type="date" name="date" value={modalData.date} onChange={handleModalChange} required />
              </label>
              <label>
                Amount:
                <input type="number" name="amount" value={modalData.amount} onChange={handleModalChange} min="0.01" step="0.01" required />
              </label>
              <label>
                Description:
                <input type="text" name="description" value={modalData.description} onChange={handleModalChange} />
              </label>
              <label>
                Transaction Type:
                <select name="type" value={modalData.type} onChange={handleModalChange} required>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </label>
              <label>
                Notes:
                <textarea name="notes" value={modalData.notes} onChange={handleModalChange} />
              </label>
              {modalError && <div className="transactions-modal-error">{modalError}</div>}
              <div className="transactions-modal-actions">
                <button 
                  type="submit" 
                  className="transactions-modal-submit"
                  disabled={isAddingTransaction}
                >
                  {isAddingTransaction ? 'Adding...' : 'Add'}
                </button>
                <button 
                  type="button" 
                  className="transactions-modal-cancel" 
                  onClick={() => setShowModal(false)}
                  disabled={isAddingTransaction}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                const isEditing = editingCell?.rowId === transaction.id;
                const isPending = transaction.isPending;
                
                return (
                  <React.Fragment key={transaction.id}>
                    <tr className={`transaction-row ${transactionType} ${isPending ? 'pending-transaction' : ''}`}>
                      <td className="serial-number">{index + 1}</td>
                      <td 
                        className="editable-cell"
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'date', transaction.date)}
                      >
                        {isEditing && editingCell?.field === 'date' ? (
                          <input
                            type="date"
                            value={editValue}
                            onChange={handleEditChange}
                            className="edit-input"
                          />
                        ) : (
                          <span className={isPending ? 'pending-text' : ''}>
                            {formatDate(transaction.date)}
                            {isPending && <span className="pending-indicator"> ⏳</span>}
                          </span>
                        )}
                      </td>
                      <td 
                        className="editable-cell description"
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'description', transaction.description || '')}
                      >
                        {isEditing && editingCell?.field === 'description' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={handleEditChange}
                            className="edit-input"
                          />
                        ) : (
                          <span className={isPending ? 'pending-text' : ''}>
                            {transaction.description || 'N/A'}
                          </span>
                        )}
                      </td>
                      <td 
                        className={`amount credit ${transaction.credit > 0 ? 'positive' : ''} editable-cell`}
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'credit', transaction.credit || 0)}
                      >
                        {isEditing && editingCell?.field === 'credit' ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={handleEditChange}
                            className="edit-input"
                            min="0"
                            step="0.01"
                            placeholder="Enter amount"
                          />
                        ) : (
                          <span className={isPending ? 'pending-text' : ''}>
                            {transaction.credit > 0 ? formatAmount(transaction.credit) : '-'}
                          </span>
                        )}
                      </td>
                      <td 
                        className={`amount debit ${transaction.debit > 0 ? 'negative' : ''} editable-cell`}
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'debit', transaction.debit || 0)}
                      >
                        {isEditing && editingCell?.field === 'debit' ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={handleEditChange}
                            className="edit-input"
                            min="0"
                            step="0.01"
                            placeholder="Enter amount"
                          />
                        ) : (
                          <span className={isPending ? 'pending-text' : ''}>
                            {transaction.debit > 0 ? formatAmount(transaction.debit) : '-'}
                          </span>
                        )}
                      </td>
                      <td className="balance">
                        <span className={isPending ? 'pending-text' : ''}>
                          {formatAmount(transaction.previous_balance)}
                        </span>
                      </td>
                      <td className="balance">
                        <span className={isPending ? 'pending-text' : ''}>
                          {formatAmount(transaction.remaining_balance)}
                        </span>
                      </td>
                      <td 
                        className="editable-cell notes"
                        onDoubleClick={() => !isPending && handleCellDoubleClick(transaction.id, 'notes', transaction.notes || '')}
                      >
                        {isEditing && editingCell?.field === 'notes' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={handleEditChange}
                            className="edit-input"
                          />
                        ) : (
                          <span className={isPending ? 'pending-text' : ''}>
                            {transaction.notes || '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                    {isEditing && (
                      <tr className="edit-actions-row">
                        <td colSpan="8">
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} className="save-btn">Save</button>
                            <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
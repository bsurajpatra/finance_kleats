import React from 'react';
import './Dashboard.css';
import logo from '../../assets/logo.png';
import Transactions from '../transactions/Transactions';
import Balance from '../balance/Balance';
import Payouts from '../payouts/Payouts';
import CanteenManagement from '../canteen/CanteenManagement';

const Dashboard = ({ onLogout, activeTab, onTabChange }) => {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={logo} alt="KL Eats Logo" className="header-logo" />
          <h1 className="header-title">KL Eats Finance Portal</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <button className="logout-btn" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => onTabChange('balance')}
        >
          Balance
        </button>
        <button 
          className={`nav-tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => onTabChange('transactions')}
        >
          Transactions
        </button>
        <button 
          className={`nav-tab ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => onTabChange('payouts')}
        >
          Payouts
        </button>
        <button 
          className={`nav-tab ${activeTab === 'canteen' ? 'active' : ''}`}
          onClick={() => onTabChange('canteen')}
        >
          Canteen
        </button>
      </nav>

      <main className="dashboard-main">
        {activeTab === 'balance' && (
          <Balance />
        )}

        {activeTab === 'transactions' && (
          <Transactions />
        )}

        {activeTab === 'payouts' && (
          <Payouts />
        )}

        {activeTab === 'canteen' && (
          <CanteenManagement />
        )}
      </main>
      
      <footer className="dashboard-footer">
        <div>KL Eats Finance - Copyright © {new Date().getFullYear()} - Licensed under GPL</div>
      </footer>
    </div>
  );
};

export default Dashboard; 
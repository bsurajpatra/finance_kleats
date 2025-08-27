import React, { useState } from 'react';
import './Dashboard.css';
import logo from '../../assets/logo.png';
import Transactions from '../transactions/Transactions';
import Balance from '../balance/Balance';
import CanteenPaymentManagement from '../canteen/CanteenPaymentManagement';

const Dashboard = ({ onLogout, activeTab, onTabChange }) => {
  const [navHidden, setNavHidden] = useState(false);
  const [settlementsHeader, setSettlementsHeader] = useState(null);
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        {settlementsHeader ? (
          <div className="settlements-bar">
            <button className="settlements-back" onClick={settlementsHeader.onBack}>Back</button>
            <h1 className="settlements-title">{settlementsHeader.title}</h1>
            <div className="settlements-spacer" />
          </div>
        ) : (
          <>
            <div className="header-left">
              <img src={logo} alt="KL Eats Logo" className="header-logo" />
              <h1 className="header-title">KL Eats Finance Portal</h1>
            </div>
            <div className="header-right">
              <div className="user-info">
                <button className="logout-btn" onClick={onLogout}>Logout</button>
              </div>
            </div>
          </>
        )}
      </header>

      {!navHidden && (
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
          className={`nav-tab ${activeTab === 'canteen' ? 'active' : ''}`}
          onClick={() => onTabChange('canteen')}
        >
          Payments
        </button>
      </nav>
      )}

      <main className="dashboard-main">
        {activeTab === 'balance' && (
          <Balance />
        )}

        {activeTab === 'transactions' && (
          <Transactions />
        )}

        {activeTab === 'canteen' && (
          <CanteenPaymentManagement 
            onNavVisibilityChange={setNavHidden}
            onEnterSettlements={({ title, onBack }) => setSettlementsHeader({ title, onBack })}
            onExitSettlements={() => setSettlementsHeader(null)}
          />
        )}
      </main>
      
      <footer className="dashboard-footer">
        <div>KL Eats Finance - Copyright © {new Date().getFullYear()} - Licensed under GPL v3</div>
      </footer>
    </div>
  );
};

export default Dashboard; 
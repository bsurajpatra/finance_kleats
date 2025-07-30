import React, { useState } from 'react';
import Signin from './components/signin/Signin';
import Dashboard from './components/dashboard/Dashboard';
import Transactions from './components/transactions/Transactions';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('balance');

  const handleSignIn = (e) => {
    e.preventDefault();
    // Here you would typically validate credentials
    // For now, we'll just redirect to dashboard
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <>
      {!isAuthenticated ? (
        <Signin onSignIn={handleSignIn} />
      ) : (
        <Dashboard onLogout={handleLogout} onTabChange={handleTabChange} activeTab={activeTab} />
      )}
    </>
  );
}

export default App;

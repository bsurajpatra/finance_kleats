import React, { useState } from 'react';
import Signin from './components/signin/Signin';
import Dashboard from './components/dashboard/Dashboard';
import Transactions from './components/transactions/Transactions';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('balance');

  const handleSignIn = async (e) => {
    e.preventDefault();
    const email = e.target.elements['signin-email'].value;
    const password = e.target.elements['signin-password'].value;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Login failed');
      const { token } = await res.json();
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
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

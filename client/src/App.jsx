import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Signin from './components/signin/Signin';
import Dashboard from './components/dashboard/Dashboard';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab') || 'balance';
  const [activeTab, setActiveTab] = useState(initialTab);

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
    const sp = new URLSearchParams(window.location.search);
    sp.set('tab', tab);
    window.history.replaceState(null, '', `${window.location.pathname}?${sp.toString()}`);
  };

  useEffect(() => {
    function onUnauthorized(e) {
      setIsAuthenticated(false);
    }
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    // Sync initial tab from URL on mount
    const sp = new URLSearchParams(window.location.search);
    const tab = sp.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/signin"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Signin onSignIn={handleSignIn} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard
                onLogout={handleLogout}
                onTabChange={handleTabChange}
                activeTab={activeTab}
              />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/signin"} />} />
      </Routes>
    </Router>
  );
}

export default App;

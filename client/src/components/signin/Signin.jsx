import React, { useState } from 'react';
import './Signin.css';
import logo from '../../assets/logo.png';

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.81 21.81 0 0 1 5.06-6.06"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/></svg>
);

const Signin = ({ onSignIn, errorMessage = '' }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSignIn(e);
    } catch (error) {
      console.error('Signin error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-left">
        <div className="signin-logo-wrapper">
          <img src={logo} alt="KL Eats Logo" className="signin-logo large" />
        </div>
      </div>
      <div className="signin-right">
        <div className="signin-title">Sign In</div>
        {errorMessage && (
          <div className="signin-error" role="alert" aria-live="polite" style={{ color: '#b00020', marginBottom: '12px' }}>
            {errorMessage}
          </div>
        )}
        <form className="signin-form" onSubmit={handleSubmit}>
          <div className="signin-field">
            <label htmlFor="signin-email" className="signin-label">Email</label>
            <input id="signin-email" type="email" placeholder="Enter your email" className="signin-input" required />
          </div>
          <div className="signin-field">
            <label htmlFor="signin-password" className="signin-label">Password</label>
            <div className="signin-password-wrapper">
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="signin-input"
                required
              />
              <button
                type="button"
                className="signin-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <button type="submit" className="signin-button" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
      <footer className="signin-footer">
        <div>KL Eats Finance - Copyright © 2025 - Licensed under GPL v3</div>
        <div><a href="https://kleats.in" target="_blank" rel="noopener noreferrer">KL Eats</a> (A Unit of Equitech Lab Private Limited)</div>
      </footer>
    </div>
  );
};

export default Signin; 
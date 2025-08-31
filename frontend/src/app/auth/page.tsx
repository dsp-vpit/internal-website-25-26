'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../context/UserContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function AuthPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    setSuccess(null);

    // Validate signup fields
    if (!isLogin) {
      if (!firstName.trim() || !lastName.trim()) {
        setError('First name and last name are required');
        setAuthLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setAuthLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        setAuthLoading(false);
        return;
      }
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else setSuccess('Logged in! Redirecting...');
    } else {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            name: `${firstName.trim()} ${lastName.trim()}`
          }
        }
      });
      if (error) setError(error.message);
      else setSuccess('Check your email for confirmation!');
    }
    setAuthLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setError(null);
    setSuccess(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  if (loading || user) return null;

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', padding: '2rem' }}>
        <h1 className="title" style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          {isLogin ? 'Login' : 'Sign Up'}
        </h1>
        <form onSubmit={handleAuth} className="stack-m">
          {!isLogin && (
            <div className="row-m" style={{ gap: '1rem' }}>
              <input
                type="text" 
                placeholder="First Name" 
                value={firstName}
                onChange={e => setFirstName(e.target.value)} 
                required={!isLogin}
                className="input"
                style={{ flex: 1 }}
              />
              <input
                type="text" 
                placeholder="Last Name" 
                value={lastName}
                onChange={e => setLastName(e.target.value)} 
                required={!isLogin}
                className="input"
                style={{ flex: 1 }}
              />
            </div>
          )}
          
          <input
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={e => setEmail(e.target.value)} 
            required
            className="input"
          />
          
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'} 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)} 
              required
              className="input"
              style={{ paddingRight: '3rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </button>
          </div>

          {!isLogin && (
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'} 
                placeholder="Confirm Password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} 
                required={!isLogin}
                className="input"
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          )}
          
          <button type="submit" disabled={authLoading} className="btn btn-primary">
            {authLoading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        
        <button
          onClick={toggleMode}
          className="btn btn-ghost" 
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {isLogin ? 'Need to sign up?' : 'Already have an account? Login'}
        </button>
        
        {error && (
          <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.75rem', marginTop: '1rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="card" style={{ borderColor: '#10b981', color: '#10b981', padding: '0.75rem', marginTop: '1rem' }}>
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
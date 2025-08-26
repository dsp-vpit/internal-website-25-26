'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../context/UserContext';

export default function AuthPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else setSuccess('Logged in! Redirecting...');
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess('Check your email for confirmation!');
    }
    setAuthLoading(false);
  };

  if (loading || user) return null;

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', padding: '2rem' }}>
        <h1 className="title" style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
          {isLogin ? 'Login' : 'Sign Up'}
        </h1>
        <form onSubmit={handleAuth} className="stack-m">
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="input"
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="input"
          />
          <button type="submit" disabled={authLoading} className="btn btn-primary">
            {authLoading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <button
          onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }}
          className="btn btn-ghost" style={{ width: '100%', marginTop: '1rem' }}
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
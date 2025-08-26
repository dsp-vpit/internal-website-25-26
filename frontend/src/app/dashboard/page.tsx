'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="stack-l">
      <div className="card" style={{ padding: '1.5rem' }}>
        <h1 className="title" style={{ marginBottom: '0.75rem' }}>Welcome, {user.email}!</h1>
        {!user.is_approved && (
          <div className="card" style={{ padding: '0.75rem', borderColor: 'var(--border)', color: 'var(--muted)' }}>
            Your account is not yet approved. Some features may be unavailable.
          </div>
        )}
        <div className="row-m" style={{ marginTop: '1rem' }}>
          <span>Status: <b>{user.is_approved ? 'Approved' : 'Pending Approval'}</b></span>
          <span>Role: <b>{user.is_admin ? 'Admin' : 'Member'}</b></span>
        </div>
      </div>
      <div className="row-m">
        <button className="btn btn-ghost" onClick={() => alert('Results coming soon!')}>Go to Results</button>
        {user.is_admin && (
          <button className="btn btn-ghost" onClick={() => router.push('/admin')}>Go to Admin Dashboard</button>
        )}
      </div>
    </div>
  );
}
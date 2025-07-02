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
    <div style={{ padding: 32 }}>
      <h1>Welcome, {user.email}!</h1>
      {!user.is_approved && (
        <div style={{ color: 'orange', marginBottom: 16 }}>
          Your account is not yet approved. Some features may be unavailable.
        </div>
      )}
      <p>Status: <b>{user.is_approved ? 'Approved' : 'Pending Approval'}</b></p>
      <p>Role: <b>{user.is_admin ? 'Admin' : 'Member'}</b></p>
      <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
        <button onClick={() => router.push('/voting')}>Go to Voting</button>
        <button onClick={() => alert('Results functionality coming soon!')}>Go to Results</button>
        {user.is_admin && (
          <button onClick={() => router.push('/admin')}>Go to Admin Dashboard</button>
        )}
      </div>
    </div>
  );
} 
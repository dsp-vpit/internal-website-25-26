'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../context/UserContext';

export default function PendingPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace('/auth');
      else if (user.is_approved) router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || user.is_approved) return null;

  return (
    <div style={{ padding: 32 }}>
      <h1>Account Pending Approval</h1>
      <p>Your account has been created and is awaiting admin approval. Please check back later.</p>
      <button style={{ marginTop: 24 }} onClick={() => router.push('/logout')}>Logout</button>
    </div>
  );
} 
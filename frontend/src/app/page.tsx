'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from './context/UserContext';

export default function HomePage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is authenticated, redirect to dashboard
        router.replace('/dashboard');
      } else {
        // User is not authenticated, redirect to auth
        router.replace('/auth');
      }
    }
  }, [user, loading, router]);

  // Show loading while determining redirect
  return (
    <div className="stack-l" style={{ placeItems: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="title">Loading...</div>
        <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  );
}

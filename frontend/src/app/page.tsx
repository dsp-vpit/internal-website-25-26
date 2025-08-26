'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from './context/UserContext';

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/dashboard' : '/auth');
  }, [user, loading, router]);

  return null;
}

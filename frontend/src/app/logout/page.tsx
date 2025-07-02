'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      router.replace('/auth');
    };
    logout();
  }, [router]);

  return <div style={{ padding: 32 }}>Logging out...</div>;
} 
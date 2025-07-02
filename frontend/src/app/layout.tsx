'use client';

import React from 'react';
import Link from 'next/link';
import { UserProvider, useUser } from './context/UserContext';
import './globals.css';

function NavBar() {
  const { user, loading } = useUser();
  return (
    <nav style={{ display: 'flex', gap: 16, padding: 16, borderBottom: '1px solid #ccc' }}>
      <Link href="/dashboard">Dashboard</Link>
      {user?.is_admin && <Link href="/admin">Admin</Link>}
      {user && <Link href="/logout">Logout</Link>}
      {!user && !loading && <Link href="/auth">Login</Link>}
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <NavBar />
          <main>{children}</main>
        </UserProvider>
      </body>
    </html>
  );
} 
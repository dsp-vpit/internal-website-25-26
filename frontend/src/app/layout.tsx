'use client';

import React from 'react';
import Link from 'next/link';
import { UserProvider, useUser } from './context/UserContext';
import './globals.css';

function NavBar() {
  const { user, loading } = useUser();
  return (
    <nav className="navbar">
      <div className="brand">BK Member Site</div>
      <div className="row-m">
        <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
        {user && <Link href="/voting" className="btn btn-ghost">Voting</Link>}
        {user && <Link href="/results" className="btn btn-ghost">Results</Link>}
        {user?.is_admin && <Link href="/admin" className="btn btn-ghost">Admin</Link>}
        {user && <Link href="/logout" className="btn btn-danger">Logout</Link>}
        {!user && !loading && <Link href="/auth" className="btn btn-primary">Login</Link>}
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="shell">
        <UserProvider>
          <NavBar />
          <main className="container">
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  );
}
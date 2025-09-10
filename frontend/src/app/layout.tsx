'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserProvider, useUser } from './context/UserContext';
import './globals.css';

function NavBar() {
  const { user, loading } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="brand">
        <Image 
          src="/bkbp.png" 
          alt="BKBP Logo" 
          width={120} 
          height={40} 
          style={{ height: 'auto' }}
          priority
        />
      </div>
      
      {/* Desktop Navigation */}
      <div className="desktop-nav">
        <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
        {user && <Link href="/voting" className="btn btn-ghost">Voting</Link>}
        {user?.is_admin && <Link href="/results" className="btn btn-ghost">Results</Link>}
        {user?.is_admin && <Link href="/admin" className="btn btn-ghost">Admin</Link>}
        {user?.is_admin && <Link href="/admin/display" className="btn btn-ghost">Display</Link>}
        {user && <Link href="/logout" className="btn btn-danger">Logout</Link>}
        {!user && !loading && <Link href="/auth" className="btn btn-primary">Login</Link>}
      </div>

      {/* Mobile Hamburger Button */}
      <button 
        className="mobile-menu-btn"
        onClick={toggleMobileMenu}
        aria-label="Toggle mobile menu"
      >
        <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {/* Mobile Navigation Menu */}
      <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
        <Link href="/dashboard" className="btn btn-ghost" onClick={closeMobileMenu}>Dashboard</Link>
        {user && <Link href="/voting" className="btn btn-ghost" onClick={closeMobileMenu}>Voting</Link>}
        {user?.is_admin && <Link href="/results" className="btn btn-ghost" onClick={closeMobileMenu}>Results</Link>}
        {user?.is_admin && <Link href="/admin" className="btn btn-ghost" onClick={closeMobileMenu}>Admin</Link>}
        {user?.is_admin && <Link href="/admin/display" className="btn btn-ghost" onClick={closeMobileMenu}>Display</Link>}
        {user && <Link href="/logout" className="btn btn-danger" onClick={closeMobileMenu}>Logout</Link>}
        {!user && !loading && <Link href="/auth" className="btn btn-primary" onClick={closeMobileMenu}>Login</Link>}
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={closeMobileMenu}></div>
      )}
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>BK Member Site</title>
        <meta name="description" content="Business Fraternity Member Management System" />
        <link rel="icon" href="/bkbp.png" />
        <link rel="apple-touch-icon" href="/bkbp.png" />
      </head>
      <body className="shell" suppressHydrationWarning={true}>
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
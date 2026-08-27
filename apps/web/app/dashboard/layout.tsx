'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect via AuthContext
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={20} />
            Trello Clone
          </h2>
        </div>
        
        <nav style={{ flex: 1, padding: '1rem' }}>
          <Link href="/dashboard" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            backgroundColor: pathname === '/dashboard' ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
            color: pathname === '/dashboard' ? 'var(--accent-primary)' : 'var(--text-primary)',
            fontWeight: pathname === '/dashboard' ? 600 : 400,
            textDecoration: 'none'
          }}>
            Boards
          </Link>
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

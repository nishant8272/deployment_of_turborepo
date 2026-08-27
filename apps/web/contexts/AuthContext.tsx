'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await apiFetch<{ user: User }>('/auth/me');
        setUser(data.user);
      } catch (error) {
        setUser(null);
        if (pathname && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [pathname, router]);

  const login = (user: User) => {
    setUser(user);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout failed', e);
    }
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

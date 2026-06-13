'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenManager } from '@/lib/api-client';
import type { User } from '@/types/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  lineLogin: (code: string, redirectUri: string) => Promise<void>;
  connectLine: (code: string, redirectUri: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = tokenManager.isAuthenticated();

  // Load user on mount
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const response = await api.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      tokenManager.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login({ email, password });

      if (response.success && response.data) {
        const { access_token, refresh_token, expires_in, user: userData } = response.data;

        tokenManager.setTokens({ access_token, refresh_token, expires_in });
        setUser(userData);

        router.push(userData.merchant_id ? '/dashboard' : '/onboarding');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const lineLogin = async (code: string, redirectUri: string) => {
    try {
      const response = await api.lineLogin({ line_code: code, redirect_uri: redirectUri });

      if (response.success && response.data) {
        const { access_token, refresh_token, expires_in, user: userData } = response.data;

        tokenManager.setTokens({ access_token, refresh_token, expires_in });
        setUser(userData);

        router.push(userData.merchant_id ? '/dashboard' : '/onboarding');
      } else {
        throw new Error(response.message || 'LINE login failed');
      }
    } catch (error) {
      console.error('LINE login error:', error);
      throw error;
    }
  };

  const connectLine = async (code: string, redirectUri: string) => {
    try {
      const response = await api.connectLine({ line_code: code, redirect_uri: redirectUri });

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        router.push('/dashboard/account');
        return;
      }

      throw new Error(response.message || 'Failed to connect LINE');
    } catch (error) {
      console.error('Connect LINE error:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const response = await api.register({ name, email, password, phone });
    if (response.success) {
      // Redirect to OTP verification
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    const response = await api.verifyOTP({ email, otp });
    if (response.success && response.data) {
      const { access_token, refresh_token, expires_in } = response.data;
      tokenManager.setTokens({ access_token, refresh_token, expires_in });
      await refreshUser();
      router.push('/onboarding');
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.clearTokens();
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        lineLogin,
        connectLine,
        register,
        verifyOTP,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

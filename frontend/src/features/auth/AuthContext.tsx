import React, { useState, useEffect, useCallback } from 'react';
import {
  ApiError,
  type CustomerUser,
  loginCustomer,
  registerCustomer,
  getCustomerProfile,
} from '../../services/api';
import { AuthContext, type AuthModalOptions } from './useAuth';

export type { AuthModalOptions };

const TOKEN_KEY = 'coffee_customer_token';
const USER_KEY = 'coffee_customer_user';

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [user, setUser] = useState<CustomerUser | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [authModalOptions, setAuthModalOptions] = useState<AuthModalOptions>({});

  const openAuthModal = () => {
    setAuthModalOptions({});
    setAuthModalOpen(true);
  };
  const openAuthModalWith = (options: AuthModalOptions) => {
    setAuthModalOptions(options);
    setAuthModalOpen(true);
  };
  const closeAuthModal = () => setAuthModalOpen(false);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const profile = await getCustomerProfile(token);
      setUser(profile);
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
    } catch (err) {
      // Only clear session when the backend explicitly rejects the token (401/403).
      // Cold-start timeouts or transient network failures keep the cached session intact.
      if (isUnauthorizedError(err)) {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getCustomerProfile(token)
      .then(profile => {
        if (!cancelled) {
          setUser(profile);
          localStorage.setItem(USER_KEY, JSON.stringify(profile));
        }
      })
      .catch(err => {
        if (!cancelled && isUnauthorizedError(err)) {
          setToken(null);
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginCustomer({ identifier, password });
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, phone: string, password: string, email?: string) => {
    setIsLoading(true);
    try {
      const res = await registerCustomer({
        full_name: fullName,
        phone,
        email: email || undefined,
        password,
      });
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        authModalOpen,
        authModalOptions,
        openAuthModal,
        openAuthModalWith,
        closeAuthModal,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

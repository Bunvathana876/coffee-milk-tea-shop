import { createContext, useContext } from 'react';
import type { CustomerUser } from '../../services/api';

export interface AuthModalOptions {
  mode?: 'login' | 'register';
  redirectTo?: string;
}

export interface AuthContextType {
  user: CustomerUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalOptions: AuthModalOptions;
  openAuthModal: () => void;
  /** Open the modal in a specific mode and optionally navigate somewhere after success. */
  openAuthModalWith: (options: AuthModalOptions) => void;
  closeAuthModal: () => void;
  login: (identifier: string, password: string) => Promise<void>;
  register: (fullName: string, phone: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

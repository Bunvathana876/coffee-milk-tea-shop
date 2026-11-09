import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Phone, User, Mail, Eye, EyeOff, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  /** Where to go after a successful sign in / sign up */
  redirectTo?: string;
}

const inputClass =
  'w-full pl-11 pr-4 py-3.5 rounded-2xl border border-line bg-white focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 text-sm font-sans transition-all text-ink placeholder:text-ink-soft/60';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  redirectTo,
}) => {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuth();
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(initialMode);
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize state when initialMode prop changes during render
  if (prevInitialMode !== initialMode) {
    setPrevInitialMode(initialMode);
    setCurrentMode(initialMode);
    setErrorMessage(null);
  }

  const isRegister = currentMode === 'register';

  // Modal accessibility: Escape dismissal and background scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const switchMode = (register: boolean) => {
    setCurrentMode(register ? 'register' : 'login');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      if (isRegister) {
        if (fullName.trim().length < 2) {
          setErrorMessage('Please enter your name.');
          return;
        }
        if (phone.trim().replace(/\D/g, '').length < 8) {
          setErrorMessage('Please enter a valid phone number (at least 8 digits).');
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters.');
          return;
        }
        await register(fullName.trim(), phone.trim(), password, email.trim() || undefined);
      } else {
        if (!phone.trim() || !password) {
          setErrorMessage('Enter your phone or email and your password.');
          return;
        }
        await login(phone.trim(), password);
      }
      onClose();
      if (redirectTo) navigate(redirectTo);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div
        className="w-full sm:max-w-md max-h-[95vh] overflow-y-auto bg-cream rounded-t-3xl sm:rounded-3xl shadow-2xl border border-line animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative px-6 pt-7 pb-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white border border-line text-ink-soft hover:text-ink flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Friendly original boy mascot illustration badge */}
          <div className="w-16 h-16 rounded-3xl bg-cream-deep border border-line flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <img
              src="/brand/brew-boba-mascot-badge.webp"
              alt="Brew & Boba Mascot"
              className="w-12 h-12 object-contain"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cobalt uppercase tracking-wider mb-1.5 bg-cream-deep px-3 py-1 rounded-full border border-line">
            <Sparkles className="w-3 h-3 text-cobalt" />
            <span>The Brew Club™</span>
          </div>

          <h2 id="auth-title" className="text-2xl sm:text-3xl font-serif font-black text-cobalt tracking-tight uppercase">
            {isRegister ? 'Join The Brew Club.' : 'Welcome Back!'}
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-xs mx-auto">
            {isRegister
              ? 'Good drinks and good days start here.'
              : 'Your next favorite sip is just a sign-in away.'}
          </p>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3.5" noValidate>
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in"
            >
              {errorMessage}
            </div>
          )}

          {isRegister && (
            <div className="relative">
              <User className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                autoComplete="name"
                placeholder="Full name"
                aria-label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div className="relative">
            <Phone className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus={!isRegister}
              autoComplete="username"
              inputMode={isRegister ? 'tel' : 'text'}
              placeholder={isRegister ? 'Phone number' : 'Phone number or email'}
              aria-label={isRegister ? 'Phone number' : 'Phone number or email'}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>

          {isRegister && (
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                autoComplete="email"
                placeholder="Email (optional)"
                aria-label="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div className="relative">
            <Lock className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink cursor-pointer p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-cobalt hover:bg-cobalt-dark text-butter font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 shadow-md border border-cobalt-dark"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-butter" />
                <span>Please wait…</span>
              </>
            ) : isRegister ? (
              <>
                <span>Create account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {isRegister && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-soft pt-1">
              <Sparkles className="w-3.5 h-3.5 text-cobalt" />
              <span>Earn 1 digital stamp for every drink. Every 10th cup is free!</span>
            </p>
          )}

          <div className="pt-2 text-center text-xs text-ink-soft border-t border-line/60">
            {isRegister ? 'Already have an account?' : 'New here?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(!isRegister)}
              className="font-bold text-cobalt underline underline-offset-4 cursor-pointer hover:text-cobalt-dark transition-colors"
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

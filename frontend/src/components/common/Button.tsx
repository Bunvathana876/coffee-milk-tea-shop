import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold tracking-tight rounded-full transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-cream';

  const variants = {
    primary:
      'bg-cobalt hover:bg-cobalt-dark text-white shadow-md shadow-cobalt/20 hover:shadow-lg hover:shadow-cobalt/30 border border-cobalt/20',
    accent:
      'bg-butter hover:bg-[#faeec7] text-ink-dark font-black shadow-md shadow-amber-900/10 hover:shadow-lg border border-butter-deep',
    secondary:
      'bg-cream-deep hover:bg-[#ede1b8] text-ink border border-line shadow-2xs',
    outline:
      'border-2 border-cobalt text-cobalt hover:bg-cobalt-light active:bg-cobalt-soft',
    ghost:
      'bg-transparent hover:bg-cream-deep text-ink hover:text-cobalt border border-transparent',
    danger:
      'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-2 min-h-[40px] gap-1.5',
    md: 'text-xs sm:text-sm px-4 sm:px-5 py-2.5 min-h-[44px] gap-2',
    lg: 'text-sm sm:text-base px-5 sm:px-6 py-3 sm:py-3.5 min-h-[48px] gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
};

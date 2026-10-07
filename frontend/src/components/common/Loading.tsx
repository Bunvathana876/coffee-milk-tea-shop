import React from 'react';
import { Coffee } from 'lucide-react';

export interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Brewing your drinks...',
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="relative">
        <div className="rounded-2xl bg-amber-100/80 p-4 text-amber-800 animate-pulse">
          <Coffee className={`${iconSizes[size]} animate-bounce`} />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-600 rounded-full animate-ping" />
      </div>
      <p className="text-sm font-medium text-stone-600">{message}</p>
    </div>
  );
};


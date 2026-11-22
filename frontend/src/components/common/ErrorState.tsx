import React from 'react';
import { AlertCircle, RefreshCw, Coffee } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Menu',
  message,
  onRetry,
  retrying = false,
}) => {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-line bg-cream-card p-6 sm:p-8 text-center max-w-md mx-auto space-y-5 my-8 shadow-sm"
    >
      <div
        aria-hidden="true"
        className="relative w-14 h-14 rounded-3xl bg-cream-deep text-cobalt border border-line flex items-center justify-center mx-auto shadow-2xs"
      >
        <Coffee className="w-7 h-7 text-cobalt" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center border-2 border-white shadow-2xs">
          <AlertCircle className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="space-y-1.5">
        <h3 className="font-extrabold text-ink text-base">{title}</h3>
        <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <div className="pt-1">
          <Button
            variant="secondary"
            size="sm"
            loading={retrying}
            onClick={onRetry}
            icon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Clock, Coffee, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';

interface OrderBrewTimelineProps {
  status: string;
  variant?: 'compact' | 'detailed';
  className?: string;
}

export const OrderBrewTimeline: React.FC<OrderBrewTimelineProps> = ({
  status,
  variant = 'compact',
  className = '',
}) => {
  const normStatus = (status || 'pending').toLowerCase().trim();

  if (normStatus === 'cancelled') {
    return (
      <div
        className={`py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 ${className}`}
      >
        <AlertCircle size={15} className="shrink-0 text-rose-500" />
        <span>Order was cancelled</span>
      </div>
    );
  }

  const steps = [
    {
      key: 'pending',
      stepNum: 1,
      label: 'Received',
      detail: 'In queue for barista',
      icon: <Clock size={13} />,
    },
    {
      key: 'preparing',
      stepNum: 2,
      label: 'Brewing',
      detail: 'Handcrafted drinks in progress',
      icon: <Coffee size={13} />,
    },
    {
      key: 'ready',
      stepNum: 3,
      label: 'Ready',
      detail: 'Packaged at pickup counter',
      icon: <CheckCircle2 size={13} />,
    },
    {
      key: 'completed',
      stepNum: 4,
      label: 'Completed',
      detail: 'Picked up & enjoyed',
      icon: <Sparkles size={13} />,
    },
  ];

  const currentIdx =
    normStatus === 'completed'
      ? 3
      : normStatus === 'ready'
      ? 2
      : normStatus === 'preparing'
      ? 1
      : 0;

  const currentStep = steps[currentIdx];

  const statusLabel =
    normStatus === 'preparing'
      ? '☕ Barista Crafting'
      : normStatus === 'ready'
      ? '🎉 Ready for Pickup!'
      : normStatus === 'completed'
      ? '✓ Order Completed'
      : '📋 Received in Queue';

  if (variant === 'detailed') {
    return (
      <div
        className={`rounded-2xl border border-line bg-cream-card/90 p-4 sm:p-5 space-y-4 shadow-xs ${className}`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`p-2 rounded-xl border ${
                normStatus === 'ready'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-bounce'
                  : normStatus === 'preparing'
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300 animate-pulse'
                  : normStatus === 'completed'
                  ? 'bg-teal-100 text-teal-800 border-teal-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {currentStep.icon}
            </span>
            <div>
              <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                Kitchen Display Status
              </div>
              <h3 className="text-sm sm:text-base font-black text-ink">{statusLabel}</h3>
            </div>
          </div>
          <span className="text-xs font-bold text-ink-soft bg-cream-deep px-2.5 py-1 rounded-full border border-line">
            Stage {currentStep.stepNum} of 4
          </span>
        </div>

        <p className="text-xs text-ink-soft">{currentStep.detail}</p>

        {/* Progress Stepper Bars */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {steps.map((s, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={s.key} className="space-y-1.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isDone
                      ? 'bg-cobalt'
                      : isCurrent
                      ? 'bg-butter ring-2 ring-cobalt/50 animate-pulse'
                      : 'bg-cream-deep'
                  }`}
                />
                <div className="text-center">
                  <span
                    className={`block text-[11px] font-bold truncate ${
                      isCurrent
                        ? 'text-cobalt font-black'
                        : isDone
                        ? 'text-ink'
                        : 'text-ink-muted/60'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact variant (used in order history cards)
  return (
    <div className={`pt-2.5 pb-1 max-w-md ${className}`}>
      <div className="flex items-center justify-between text-[11px] font-bold text-ink-soft mb-1.5">
        <span>Kitchen Status</span>
        <span className="text-cobalt font-black capitalize">{statusLabel}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {steps.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={s.key} className="space-y-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isDone
                    ? 'bg-cobalt'
                    : isCurrent
                    ? 'bg-butter ring-2 ring-cobalt/40 animate-pulse'
                    : 'bg-cream-deep'
                }`}
              />
              <span
                className={`block text-[10px] text-center font-bold truncate ${
                  isCurrent ? 'text-cobalt font-black' : isDone ? 'text-ink' : 'text-ink-muted/70'
                }`}
              >
                {s.stepNum}. {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

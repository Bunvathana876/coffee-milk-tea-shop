import React from 'react';
import { Coffee } from 'lucide-react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Basic pulsing skeleton block with warm cafe aesthetic
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return <div className={`bg-stone-200/70 animate-pulse rounded-2xl ${className}`} {...props} />;
};

/**
 * Skeleton placeholder that exactly mirrors the ProductCard layout
 */
export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-xs flex flex-col justify-between">
      {/* Image box placeholder */}
      <div className="relative aspect-4/3 w-full bg-stone-200/70 animate-pulse">
        <div className="absolute top-3 left-3 w-16 h-5 rounded-full bg-stone-300/60" />
      </div>

      {/* Content details placeholder */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="w-3/4 h-5 rounded-lg bg-stone-200/80 animate-pulse" />
          <div className="w-full h-3 rounded-lg bg-stone-100 animate-pulse" />
          <div className="w-2/3 h-3 rounded-lg bg-stone-100 animate-pulse" />
        </div>

        {/* Footer price & button placeholder */}
        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between">
          <div className="space-y-1">
            <div className="w-12 h-5 rounded-lg bg-stone-200/80 animate-pulse" />
            <div className="w-16 h-3 rounded-lg bg-stone-100 animate-pulse" />
          </div>
          <div className="w-10 h-10 rounded-2xl bg-stone-200/70 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton placeholder for category navigation pills
 */
export const CategoryPillSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div
          key={i}
          className="h-9 w-24 sm:w-28 rounded-2xl bg-stone-200/60 animate-pulse shrink-0"
        />
      ))}
    </div>
  );
};

/**
 * Grid of ProductCardSkeletons
 */
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeleton key={idx} />
      ))}
    </div>
  );
};

export interface CatalogWakeupNoticeProps {
  visible: boolean;
  retryAttempt?: number;
  itemLabel?: string;
}

/**
 * Reassuring cold-start banner shown only when initial catalog loading takes longer than 4s
 */
export const CatalogWakeupNotice: React.FC<CatalogWakeupNoticeProps> = ({
  visible,
  retryAttempt = 0,
  itemLabel = 'menu',
}) => {
  if (!visible) return null;

  const message =
    retryAttempt >= 2
      ? `Still connecting to our café server (attempt ${retryAttempt} of 3)… Hang tight, your ${itemLabel} will appear automatically.`
      : `Waking up the café server… First visits can take 20–40 seconds and your ${itemLabel} will load automatically.`;

  return (
    <div className="mb-5 rounded-3xl border border-line bg-cream-card px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3.5">
      <div
        className="w-10 h-10 rounded-2xl bg-cream-deep text-cobalt border border-line flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <Coffee className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div role="status" aria-live="polite" className="text-xs sm:text-sm font-semibold text-ink">
          {message}
        </div>
        <progress aria-label="Connecting to café server" className="cafe-wakeup-progress" />
      </div>
    </div>
  );
};

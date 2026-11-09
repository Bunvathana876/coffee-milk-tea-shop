import React from 'react';
import { Award, Gift, Sparkles, Check } from 'lucide-react';

interface LoyaltyCardProps {
  stamps: number;
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ stamps }) => {
  const currentCycleStamps = stamps % 10;
  const freeDrinksEarned = Math.floor(stamps / 10);
  const drinksNeeded = 10 - currentCycleStamps;

  return (
    <div className="bg-gradient-to-br from-cobalt-dark via-cobalt to-[#0A2660] text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-butter/30 relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-butter/15 blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-butter/20 text-butter flex items-center justify-center border border-butter/40">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif font-black text-base text-white tracking-tight flex items-center gap-1.5">
              <span>Café Punch Card</span>
              <Sparkles className="w-3.5 h-3.5 text-butter fill-butter" />
            </h4>
            <p className="text-[11px] text-cream/90 font-medium">Buy 9 drinks, get the 10th FREE!</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-butter text-ink-dark font-black text-xs shadow-xs border border-butter-deep">
          {currentCycleStamps} / 10
        </span>
      </div>

      {/* 10 Stamp Circles Grid (2 rows of 5) */}
      <div className="grid grid-cols-5 gap-2.5 sm:gap-3 my-4 relative z-10">
        {Array.from({ length: 10 }).map((_, index) => {
          const stampNumber = index + 1;
          const isCompleted = index < currentCycleStamps;
          const isFreeDrinkSlot = index === 9;

          return (
            <div
              key={index}
              className={`stamp-slot transition-all duration-200 border ${
                isCompleted
                  ? isFreeDrinkSlot
                    ? 'bg-butter text-ink-dark border-butter-deep shadow-md scale-105'
                    : 'bg-butter/25 text-butter border-butter/50'
                  : isFreeDrinkSlot
                  ? 'bg-white/5 border-butter/40 text-butter/60'
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              {isCompleted ? (
                isFreeDrinkSlot ? (
                  <Gift className="w-5 h-5 text-ink-dark animate-bounce" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )
              ) : isFreeDrinkSlot ? (
                <Gift className="w-4 h-4 text-butter" />
              ) : (
                <span className="text-xs font-black">{stampNumber}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Reward Status Banner */}
      <div className="mt-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold flex items-center gap-2 relative z-10">
        {freeDrinksEarned > 0 ? (
          <>
            <Gift className="w-4 h-4 text-butter shrink-0" />
            <span className="text-cream">
              🎉 You have <strong className="text-white font-black">{freeDrinksEarned} FREE</strong> drink reward(s) ready to claim in-store at our café bar!
            </span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-butter shrink-0" />
            <span className="text-cream/90">
              Only <strong className="text-butter font-bold">{drinksNeeded} more</strong> drink{drinksNeeded === 1 ? '' : 's'} until your free handcrafted beverage!
            </span>
          </>
        )}
      </div>
    </div>
  );
};

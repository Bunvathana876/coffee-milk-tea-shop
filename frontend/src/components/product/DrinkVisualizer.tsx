import React from 'react';
import type { DrinkSize, SugarLevel, IceLevel } from '../../types';

interface DrinkVisualizerProps {
  productName: string;
  categoryName?: string;
  size: DrinkSize;
  sugarLevel: SugarLevel;
  iceLevel: IceLevel;
  toppings: string[];
}

export const DrinkVisualizer: React.FC<DrinkVisualizerProps> = ({
  productName,
  categoryName = '',
  size,
  sugarLevel,
  iceLevel,
  toppings,
}) => {
  const nameLower = productName.toLowerCase();
  const catLower = categoryName.toLowerCase();

  // Determine drink fluid palette
  const isMatcha = nameLower.includes('matcha') || catLower.includes('matcha');
  const isCoffee =
    nameLower.includes('coffee') ||
    nameLower.includes('espresso') ||
    nameLower.includes('latte') ||
    nameLower.includes('cappuccino') ||
    nameLower.includes('americano') ||
    nameLower.includes('cold brew');
  const isFruit =
    nameLower.includes('fruit') ||
    nameLower.includes('peach') ||
    nameLower.includes('berry') ||
    nameLower.includes('passion') ||
    nameLower.includes('sparkl') ||
    nameLower.includes('lemon');

  let fluidGradient = {
    top: '#c88f58',
    bottom: '#945e2a',
    accent: '#e6ba8a',
  };

  if (isMatcha) {
    fluidGradient = {
      top: '#78af75',
      bottom: '#3f703d',
      accent: '#a5d4a2',
    };
  } else if (isCoffee) {
    fluidGradient = {
      top: '#633e2b',
      bottom: '#351d11',
      accent: '#8d5d42',
    };
  } else if (isFruit) {
    fluidGradient = {
      top: '#f06d76',
      bottom: '#b92b45',
      accent: '#ff9da4',
    };
  }

  // Size scaling
  const cupHeights: Record<DrinkSize, number> = {
    Small: 140,
    Medium: 165,
    Large: 190,
  };
  const height = cupHeights[size] || 165;
  const cupWidth = 110;

  // Ice cube count
  const iceCount =
    iceLevel === 'No Ice' ? 0 : iceLevel === 'Less Ice' ? 2 : iceLevel === 'Normal Ice' ? 4 : 6;

  // Topping checks
  const hasBoba = toppings.some(t => t.toLowerCase().includes('pearl') || t.toLowerCase().includes('boba'));
  const hasFoam = toppings.some(t => t.toLowerCase().includes('foam') || t.toLowerCase().includes('cheese'));
  const hasJelly = toppings.some(t => t.toLowerCase().includes('jelly'));
  const hasPudding = toppings.some(t => t.toLowerCase().includes('pudding'));

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-cream-card/90 to-cream-deep/60 rounded-2xl border border-line/80 shadow-inner select-none transition-all duration-300">
      <div className="relative flex items-end justify-center" style={{ height: 215, width: 140 }}>
        {/* Steam animation if No Ice */}
        {iceCount === 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-60 pointer-events-none">
            <span className="w-1.5 h-6 bg-cream-card rounded-full animate-pulse blur-[1px]" />
            <span className="w-1.5 h-8 bg-cream-card rounded-full animate-pulse delay-150 blur-[1px]" />
            <span className="w-1.5 h-5 bg-cream-card rounded-full animate-pulse delay-300 blur-[1px]" />
          </div>
        )}

        {/* Straw */}
        <div
          className="absolute -top-3 left-[56%] -translate-x-1/2 w-4 h-28 rounded-full pointer-events-none z-20 shadow-xs"
          style={{
            background: 'repeating-linear-gradient(45deg, #1345a3, #1345a3 8px, #f5e4ad 8px, #f5e4ad 16px)',
            transform: 'rotate(10deg)',
            opacity: 0.95,
          }}
        />

        {/* Transparent Cup Outer Body */}
        <div
          className="relative rounded-b-[26px] rounded-t-sm border-2 border-white/80 bg-white/30 backdrop-blur-xs shadow-lg overflow-hidden flex flex-col justify-end transition-all duration-300"
          style={{
            width: cupWidth,
            height: height,
            boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.6), 0 8px 20px rgba(19, 69, 163, 0.12)',
          }}
        >
          {/* Top Cup Rim / Lid Base */}
          <div className="absolute top-0 inset-x-0 h-2 bg-white/70 border-b border-line/40 z-10" />

          {/* Liquid Base */}
          <div
            className="w-full relative transition-all duration-300 flex flex-col justify-between overflow-hidden"
            style={{
              height: '84%',
              background: `linear-gradient(180deg, ${fluidGradient.top} 0%, ${fluidGradient.bottom} 100%)`,
            }}
          >
            {/* Liquid Surface Wave */}
            <div
              className="w-full h-3 opacity-60"
              style={{
                backgroundColor: fluidGradient.accent,
                borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              }}
            />

            {/* Cheese Foam Layer (Top) */}
            {hasFoam && (
              <div
                className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-[#fffef7] to-[#faedd0] shadow-xs flex items-center justify-center z-10 border-b border-amber-200/40 animate-in fade-in duration-300"
                title="Cheese Foam Top"
              >
                <div className="w-10 h-0.5 bg-amber-400/40 rounded-full blur-[0.5px]" />
              </div>
            )}

            {/* Ice Cubes floating inside */}
            {iceCount > 0 && (
              <div className="absolute inset-x-2 top-4 flex flex-wrap justify-center gap-1.5 z-5 pointer-events-none">
                {Array.from({ length: iceCount }).map((_, i) => (
                  <div
                    key={i}
                    className="w-4.5 h-4.5 rounded-[4px] bg-white/55 border border-white/80 shadow-xs backdrop-blur-xs transform rotate-6 transition-all duration-300 animate-in zoom-in-75"
                    style={{
                      transform: `rotate(${i * 18 - 15}deg)`,
                      boxShadow: 'inset 0 0 3px rgba(255,255,255,0.8)',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Pudding Layer (Mid-Bottom) */}
            {hasPudding && (
              <div className="absolute bottom-6 inset-x-0 h-5 bg-gradient-to-t from-[#f5d76e] to-[#ffea88] opacity-90 border-t border-amber-300/40 animate-in fade-in duration-300" />
            )}

            {/* Coconut Jelly Cubes */}
            {hasJelly && (
              <div className="absolute bottom-4 inset-x-2 flex justify-around z-5 pointer-events-none">
                <span className="w-3.5 h-3.5 bg-white/70 rounded-[3px] border border-white/90 shadow-2xs rotate-12" />
                <span className="w-3.5 h-3.5 bg-white/70 rounded-[3px] border border-white/90 shadow-2xs -rotate-6" />
                <span className="w-3.5 h-3.5 bg-white/70 rounded-[3px] border border-white/90 shadow-2xs rotate-45" />
              </div>
            )}

            {/* Brown Sugar Boba Pearls (Bottom) */}
            {hasBoba && (
              <div className="w-full pb-1 pt-2 flex flex-wrap justify-center gap-1 z-10 bg-gradient-to-t from-black/40 to-transparent">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full bg-gradient-to-br from-[#3b2219] to-[#0f0907] border border-[#523326]/70 shadow-xs transform animate-in zoom-in-50"
                    style={{
                      boxShadow: 'inset -1px -1px 2px rgba(255,255,255,0.3)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Cup Glass Highlight Overlay */}
          <div className="absolute inset-y-0 left-2 w-2 bg-gradient-to-r from-white/40 to-transparent rounded-full pointer-events-none" />
        </div>
      </div>

      {/* Visual Live Customization Recipe Badges */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-[280px]">
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cobalt text-white shadow-2xs">
          {size}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cream-card border border-line text-ink">
          {sugarLevel} Sugar
        </span>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cream-card border border-line text-ink">
          {iceLevel}
        </span>
        {toppings.map(t => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-butter text-cobalt border border-butter-deep shadow-2xs"
          >
            +{t}
          </span>
        ))}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Sparkles, Coffee, CupSoda, ArrowRight, RotateCcw } from 'lucide-react';
import type { Product, DrinkCustomization } from '../../types';
import { formatUsd, formatKhr, usdToKhr } from '../../config/currency';
import { productThumbnailUrl } from '../../utils/productImage';

interface FlavorFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onCustomize: (product: Product, initialCustomization?: Partial<DrinkCustomization>) => void;
}

type Vibe = 'coffee' | 'boba' | 'matcha' | 'fruit';
type IcePref = 'normal' | 'less' | 'none';
type SweetnessPref = 'sweet' | 'balanced' | 'low';

export const FlavorFinderModal: React.FC<FlavorFinderModalProps> = ({
  isOpen,
  onClose,
  products,
  onCustomize,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 'results'>(1);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [ice, setIce] = useState<IcePref | null>(null);
  const [sweetness, setSweetness] = useState<SweetnessPref | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep(1);
    setVibe(null);
    setIce(null);
    setSweetness(null);
  };

  // Match products based on customer answers
  const matchedProducts = (() => {
    if (!vibe) return products.slice(0, 3);
    const filtered = products.filter(p => {
      const name = p.name.toLowerCase();
      const desc = (p.description || '').toLowerCase();
      if (vibe === 'coffee') {
        return (
          name.includes('coffee') ||
          name.includes('espresso') ||
          name.includes('latte') ||
          name.includes('cappuccino') ||
          name.includes('americano') ||
          desc.includes('coffee')
        );
      }
      if (vibe === 'boba') {
        return (
          name.includes('boba') ||
          name.includes('milk tea') ||
          name.includes('pearl') ||
          desc.includes('boba') ||
          desc.includes('milk tea')
        );
      }
      if (vibe === 'matcha') {
        return name.includes('matcha') || desc.includes('matcha');
      }
      if (vibe === 'fruit') {
        return (
          name.includes('fruit') ||
          name.includes('berry') ||
          name.includes('peach') ||
          name.includes('passion') ||
          name.includes('sparkl') ||
          name.includes('lemon') ||
          desc.includes('tea')
        );
      }
      return true;
    });

    return filtered.length > 0 ? filtered.slice(0, 3) : products.slice(0, 3);
  })();

  const selectedSugarLevel =
    sweetness === 'sweet' ? '75%' : sweetness === 'low' ? '25%' : '50%';
  const selectedIceLevel =
    ice === 'none' ? 'No Ice' : ice === 'less' ? 'Less Ice' : 'Normal Ice';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-dark/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flavor-finder-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-cream rounded-3xl border border-line shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-cobalt-dark via-cobalt to-[#0A2660] text-cream p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-cream transition-colors cursor-pointer"
            aria-label="Close Quiz"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-full bg-butter/20 text-butter">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold tracking-wider uppercase text-butter">
              Taste Matcher Quiz
            </span>
          </div>

          <h2 id="flavor-finder-title" className="text-xl sm:text-2xl font-serif font-black">
            Find Your Perfect Brew
          </h2>
          <p className="text-xs sm:text-sm text-cream/80 mt-1">
            Answer 3 quick questions and let our virtual barista find your exact match.
          </p>

          {/* Progress Indicator */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  (step === 'results' ? 4 : step) >= i ? 'bg-butter' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-ink">1. What flavor vibe are you craving right now?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setVibe('coffee');
                    setStep(2);
                  }}
                  className="p-4 rounded-2xl border-2 border-line hover:border-cobalt bg-cream-card hover:bg-cream-deep transition-all text-left flex flex-col gap-2 group cursor-pointer"
                >
                  <Coffee className="w-6 h-6 text-cobalt group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-sm font-bold text-ink">Bold Coffee</div>
                    <div className="text-xs text-ink-soft">Espresso, latte & rich roasts</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVibe('boba');
                    setStep(2);
                  }}
                  className="p-4 rounded-2xl border-2 border-line hover:border-cobalt bg-cream-card hover:bg-cream-deep transition-all text-left flex flex-col gap-2 group cursor-pointer"
                >
                  <CupSoda className="w-6 h-6 text-cobalt group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-sm font-bold text-ink">Creamy Boba</div>
                    <div className="text-xs text-ink-soft">Brown sugar, milk tea & pearls</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVibe('matcha');
                    setStep(2);
                  }}
                  className="p-4 rounded-2xl border-2 border-line hover:border-cobalt bg-cream-card hover:bg-cream-deep transition-all text-left flex flex-col gap-2 group cursor-pointer"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">🍵</span>
                  <div>
                    <div className="text-sm font-bold text-ink">Velvet Matcha</div>
                    <div className="text-xs text-ink-soft">Japanese matcha & earthy notes</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVibe('fruit');
                    setStep(2);
                  }}
                  className="p-4 rounded-2xl border-2 border-line hover:border-cobalt bg-cream-card hover:bg-cream-deep transition-all text-left flex flex-col gap-2 group cursor-pointer"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">🍓</span>
                  <div>
                    <div className="text-sm font-bold text-ink">Fruit Sparkler</div>
                    <div className="text-xs text-ink-soft">Refreshing, iced & crisp tea</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-ink">2. How chilled do you want it?</p>
              <div className="space-y-2.5">
                {[
                  { id: 'normal' as IcePref, label: '❄️ Chilled Regular Ice', desc: 'Crisp and refreshingly cold' },
                  { id: 'less' as IcePref, label: '🧊 Light Ice (Less Ice)', desc: 'More drink, chilled without melting fast' },
                  { id: 'none' as IcePref, label: '☕ No Ice / Smooth Temp', desc: 'Pure concentrated flavor, smooth sip' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setIce(opt.id);
                      setStep(3);
                    }}
                    className="w-full p-3.5 rounded-2xl border-2 border-line hover:border-cobalt bg-cream-card hover:bg-cream-deep text-left transition-all cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="text-sm font-bold text-ink">{opt.label}</div>
                      <div className="text-xs text-ink-soft">{opt.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cobalt" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-ink">3. What is your preferred sweetness level?</p>
              <div className="space-y-2.5">
                {[
                  { id: 'sweet' as SweetnessPref, label: '🍯 Sweet Treat (75%–100%)', desc: 'Indulgent, dessert-style comfort' },
                  { id: 'balanced' as SweetnessPref, label: '⚖️ Golden Balance (50%)', desc: 'The barista recommended house ratio' },
                  { id: 'low' as SweetnessPref, label: '🍃 Light & Pure (0%–25%)', desc: 'Taste the real tea leaves and coffee beans' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSweetness(opt.id);
                      setStep('results');
                    }}
                    className="w-full p-3.5 rounded-2xl border-2 border-line hover:border-cobalt bg-cream-card hover:bg-cream-deep text-left transition-all cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="text-sm font-bold text-ink">{opt.label}</div>
                      <div className="text-xs text-ink-soft">{opt.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cobalt" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-ink">Your Perfect Matches</h3>
                  <p className="text-xs text-ink-soft">
                    Tailored with {selectedIceLevel} & {selectedSugarLevel} sweetness
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs font-bold text-cobalt hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start over</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {matchedProducts.map((drink, idx) => (
                  <div
                    key={drink.id}
                    className="p-3.5 rounded-2xl border border-line bg-cream-card hover:border-cobalt/50 transition-all flex items-center gap-3.5"
                  >
                    <img
                      src={productThumbnailUrl(drink.image)}
                      alt={drink.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-line"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/brand/menu-drinks-icon.png';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-butter text-cobalt">
                          {idx === 0 ? '★ 98% Match' : '94% Match'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-ink truncate mt-0.5">{drink.name}</h4>
                      <p className="text-xs text-ink-soft font-semibold">
                        {formatUsd(drink.base_price_usd)} ·{' '}
                        <span className="text-ink-muted">
                          {formatKhr(usdToKhr(drink.base_price_usd))}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onCustomize(drink, {
                          sugar_level: selectedSugarLevel as any,
                          ice_level: selectedIceLevel as any,
                        });
                      }}
                      className="px-3 py-2 rounded-xl bg-cobalt hover:bg-cobalt-dark text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                    >
                      Customize
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

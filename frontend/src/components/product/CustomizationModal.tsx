import React, { useState, useEffect, useId } from 'react';
import { X, Plus, Minus, Check, ChevronRight } from 'lucide-react';
import type { Product, DrinkSize, SugarLevel, IceLevel, DrinkCustomization } from '../../types';
import {
  SIZE_OPTIONS,
  SUGAR_OPTIONS,
  ICE_OPTIONS,
  TOPPING_OPTIONS,
  calculateCustomizedPrice,
} from '../../features/products/customization';
import { formatUsd, formatKhr } from '../../config/currency';

export interface CustomizationModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, customization: DrinkCustomization) => void;
}

interface ModalContentProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, customization: DrinkCustomization) => void;
}

const CustomizationModalContent: React.FC<ModalContentProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  const titleId = useId();
  const [imgError, setImgError] = useState(false);

  // Selected Options State
  const [selectedSize, setSelectedSize] = useState<DrinkSize>('Medium');
  const [selectedSugar, setSelectedSugar] = useState<SugarLevel>('50%');
  const [selectedIce, setSelectedIce] = useState<IceLevel>('Normal Ice');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time price calculations
  const { unitPrice, subtotal } = calculateCustomizedPrice(
    product.base_price_usd,
    selectedSize,
    quantity,
    selectedToppings,
  );

  const toggleTopping = (toppingName: string) => {
    setSelectedToppings(prev =>
      prev.includes(toppingName) ? prev.filter(t => t !== toppingName) : [...prev, toppingName],
    );
  };

  const handleConfirm = () => {
    if (isSubmitting) return;
    if (!selectedSize) {
      setValidationError('Please choose a cup size');
      return;
    }
    if (!selectedSugar) {
      setValidationError('Please select your preferred sugar level');
      return;
    }
    if (!selectedIce) {
      setValidationError('Please select an ice level');
      return;
    }

    setIsSubmitting(true);
    try {
      onAddToCart(product, {
        size: selectedSize,
        sugar_level: selectedSugar,
        ice_level: selectedIce,
        toppings: selectedToppings,
        quantity,
        unit_price_usd: unitPrice,
        subtotal_usd: subtotal,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex w-full sm:max-w-[540px] max-h-[92vh] sm:max-h-[88vh] flex-col overflow-hidden rounded-t-[32px] sm:rounded-[32px] border border-line bg-cream shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      onClick={e => e.stopPropagation()}
    >
      {/* Retro Blue Header with Ambient Rings */}
      <div className="relative flex h-32 sm:h-36 items-end justify-between overflow-hidden bg-gradient-to-br from-cobalt-dark via-cobalt to-[#0A2660] px-6 pb-5 text-cream shrink-0">
        {/* Ambient Decorative Rings */}
        <div className="absolute -right-8 -top-14 size-44 rounded-full border-[18px] border-butter/20 pointer-events-none" />
        <div className="absolute -bottom-14 left-1/2 size-40 -translate-x-1/2 rounded-full bg-butter/10 blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-3.5 z-10 min-w-0 pr-4">
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt=""
              width="56"
              height="56"
              className="w-14 h-14 rounded-2xl object-cover shrink-0 border-2 border-white/20 shadow-md"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-butter text-cobalt-dark shrink-0 shadow-md border-2 border-white/25">
              <img
                src="/brand/brew-boba-cup-icon.webp"
                alt="Brew & Boba"
                width="32"
                height="32"
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-butter flex items-center gap-1.5">
              <img
                src="/brand/hero-crafted-custom.png"
                alt=""
                aria-hidden="true"
                width="15"
                height="15"
                className="w-3.5 h-3.5 object-contain inline-block"
              />
              <span>Customize your drink</span>
            </p>
            <h2
              id={titleId}
              className="font-serif text-xl sm:text-2xl font-black text-white leading-tight truncate"
            >
              {product.name}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close customizer"
          className="relative z-10 flex size-10 items-center justify-center rounded-full text-cream/80 transition hover:bg-cream/15 hover:text-cream cursor-pointer"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Scrollable Customization Body */}
      <div className="flex flex-col gap-6 overflow-y-auto px-5 sm:px-8 py-5 flex-1 scrollbar-none">
        {/* Subtle Feature Badge */}
        <div className="flex items-center justify-between rounded-2xl bg-cream-deep px-4 py-3 border border-line/50 shadow-2xs">
          <div>
            <p className="font-sans text-xs sm:text-sm font-bold text-ink">Handcrafted your way</p>
            <p className="font-sans text-[11px] text-ink-soft">
              Freshly tailored upon every single order.
            </p>
          </div>
          <img
            src="/brand/hero-fusion-cup.png"
            alt=""
            aria-hidden="true"
            width="22"
            height="22"
            className="w-5.5 h-5.5 object-contain shrink-0"
          />
        </div>

        {/* Validation Warning if any */}
        {validationError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {validationError}
          </div>
        )}

        {/* Step 1: Cup Size */}
        <fieldset>
          <legend className="mb-2.5 font-sans text-xs sm:text-sm font-bold text-ink uppercase tracking-wider">
            1. Cup size
          </legend>
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {SIZE_OPTIONS.map(option => {
              const selected = selectedSize === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedSize(option.value);
                    setValidationError(null);
                  }}
                  className={`min-h-16 rounded-2xl border px-3 py-2.5 text-center transition-all cursor-pointer ${
                    selected
                      ? 'border-cobalt bg-cobalt text-white shadow-sm ring-2 ring-cobalt/30'
                      : 'border-line bg-white hover:border-cobalt/60 hover:bg-cream-deep/30 text-ink shadow-2xs'
                  }`}
                >
                  <span className="block font-sans text-sm font-bold">{option.label}</span>
                  <span
                    className={`block font-sans text-[11px] mt-0.5 ${
                      selected ? 'text-white/85' : 'text-ink-soft'
                    }`}
                  >
                    {option.description} ·{' '}
                    <strong
                      className={selected ? 'text-butter font-bold' : 'text-cobalt font-bold'}
                    >
                      {option.priceAdjustment
                        ? `+${formatUsd(option.priceAdjustment)}`
                        : 'Included'}
                    </strong>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Step 2: Sweetness */}
        <fieldset>
          <div className="mb-2.5 flex items-center justify-between">
            <legend className="font-sans text-xs sm:text-sm font-bold text-ink uppercase tracking-wider">
              2. Sweetness
            </legend>
            <span className="rounded-full bg-butter/40 px-3 py-1 font-sans text-xs font-bold text-cobalt border border-butter/60">
              {selectedSugar}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {SUGAR_OPTIONS.map(sugar => {
              const selected = selectedSugar === sugar;
              return (
                <button
                  key={sugar}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedSugar(sugar);
                    setValidationError(null);
                  }}
                  className={`py-3 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                    selected
                      ? 'bg-cobalt text-white shadow-sm ring-2 ring-cobalt/30 font-black'
                      : 'bg-white border border-line text-ink-soft hover:bg-cream-deep hover:text-ink shadow-2xs'
                  }`}
                >
                  {sugar}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between font-sans text-[11px] text-ink-soft px-1">
            <span>0% Unsweetened</span>
            <span>50% Standard</span>
            <span>100% Sweet</span>
          </div>
        </fieldset>

        {/* Step 3: Ice level */}
        <fieldset>
          <div className="mb-2.5 flex items-center justify-between">
            <legend className="font-sans text-xs sm:text-sm font-bold text-ink uppercase tracking-wider">
              3. Ice level
            </legend>
            <span className="text-xs font-bold text-cobalt">{selectedIce}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ICE_OPTIONS.map(ice => {
              const selected = selectedIce === ice;
              return (
                <button
                  key={ice}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedIce(ice);
                    setValidationError(null);
                  }}
                  className={`min-h-11 rounded-xl border px-3 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    selected
                      ? 'border-cobalt bg-cobalt text-white shadow-xs ring-2 ring-cobalt/30'
                      : 'border-line bg-white text-ink-soft hover:border-cobalt hover:text-ink shadow-2xs'
                  }`}
                >
                  {ice}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Step 4: Toppings */}
        <fieldset>
          <div className="mb-2.5 flex items-center justify-between">
            <legend className="font-sans text-xs sm:text-sm font-bold text-ink uppercase tracking-wider">
              4. Toppings <span className="font-normal text-ink-soft normal-case">(optional)</span>
            </legend>
            <span className="font-sans text-xs text-ink-soft">
              {selectedToppings.length} selected
            </span>
          </div>
          <div className="grid gap-2">
            {TOPPING_OPTIONS.map(topping => {
              const selected = selectedToppings.includes(topping.name);
              return (
                <button
                  key={topping.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTopping(topping.name)}
                  className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-cobalt bg-cobalt/10 shadow-2xs ring-1 ring-cobalt/20'
                      : 'border-line bg-white hover:border-cobalt/60 hover:bg-cream-deep/20 shadow-2xs'
                  }`}
                >
                  <span className="flex items-center gap-3 font-sans text-xs sm:text-sm font-bold text-ink">
                    <span
                      className={`flex size-5 items-center justify-center rounded-full border transition-colors ${
                        selected
                          ? 'border-cobalt bg-cobalt text-white'
                          : 'border-line bg-cream-deep'
                      }`}
                    >
                      {selected && <Check className="size-3.5 stroke-3" />}
                    </span>
                    <span>{topping.name}</span>
                  </span>
                  <span className="font-sans text-xs font-bold text-cobalt">
                    +{formatUsd(topping.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Retro Blue Sticky Bottom Bar */}
      <div className="border-t border-line bg-cream/95 px-5 sm:px-8 py-4 backdrop-blur-md flex items-center gap-3 shrink-0">
        {/* Quantity Stepper */}
        <div className="flex h-12 items-center rounded-2xl border border-line bg-white p-1 shadow-2xs">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
            onClick={() => setQuantity(c => Math.max(1, c - 1))}
            className="flex size-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-cream disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <Minus className="size-4" />
          </button>
          <span
            aria-live="polite"
            className="w-8 text-center font-sans text-sm font-black text-ink"
          >
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={quantity >= 20}
            onClick={() => setQuantity(c => Math.min(20, c + 1))}
            className="flex size-10 items-center justify-center rounded-xl text-ink-soft transition hover:bg-cream cursor-pointer"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {/* Cobalt Add to Cart Button */}
        <button
          type="button"
          disabled={!product.is_available || isSubmitting}
          onClick={handleConfirm}
          className="h-12 flex-1 rounded-full bg-cobalt hover:bg-cobalt-dark font-sans text-sm font-black text-white shadow-lg shadow-cobalt/25 flex items-center justify-between px-6 transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="flex flex-col items-start leading-tight">
            <span>
              {isSubmitting ? 'Adding...' : product.is_available ? 'Add to Cart' : 'Sold out'}
            </span>
            <span className="text-[11px] font-semibold text-butter">
              {formatUsd(subtotal)} · {formatKhr(subtotal)}
            </span>
          </span>
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
};

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/70 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <CustomizationModalContent
        key={product.id}
        product={product}
        onClose={onClose}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

import React, { useState, useEffect, useId } from 'react';
import { X, Plus, Minus, Check, Coffee, Sparkles } from 'lucide-react';
import type { Product, DrinkSize, SugarLevel, IceLevel, DrinkCustomization } from '../../types';
import {
  SIZE_OPTIONS,
  SUGAR_OPTIONS,
  ICE_OPTIONS,
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

  // Natural state initialization keyed by product
  const [selectedSize, setSelectedSize] = useState<DrinkSize>('Medium');
  const [selectedSugar, setSelectedSugar] = useState<SugarLevel>('100%');
  const [selectedIce, setSelectedIce] = useState<IceLevel>('Normal Ice');
  const [quantity, setQuantity] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Real-time price calculations
  const { unitPrice, subtotal } = calculateCustomizedPrice(
    product.base_price_usd,
    selectedSize,
    quantity
  );

  const handleConfirm = () => {
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

    onAddToCart(product, {
      size: selectedSize,
      sugar_level: selectedSugar,
      ice_level: selectedIce,
      quantity,
      unit_price_usd: unitPrice,
      subtotal_usd: subtotal,
    });
    onClose();
  };

  return (
    <div
      className="w-full sm:max-w-xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div className="relative p-5 sm:p-6 border-b border-stone-200/80 bg-stone-50/50 flex items-start gap-4">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 shadow-sm border border-stone-200/80"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0">
            <Coffee className="w-8 h-8" />
          </div>
        )}

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full">
              {product.category_name || 'Handcrafted Drink'}
            </span>
          </div>
          <h2 id={titleId} className="text-lg sm:text-xl font-extrabold text-stone-900 truncate mt-1">
            {product.name}
          </h2>
          <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
            {product.description || 'Custom crafted to your taste'}
          </p>
          <div className="text-xs font-semibold text-stone-600 mt-1">
            Base Price: <span className="font-bold text-amber-950">{formatUsd(product.base_price_usd)}</span> ({formatKhr(product.base_price_usd)})
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          aria-label="Close customization dialog"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Body: Scrollable Customization Options */}
      <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
        {/* Validation Warning if any */}
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {validationError}
          </div>
        )}

        {/* Option 1: Cup Size */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <span>1. Cup Size</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
              Selected: {selectedSize}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {SIZE_OPTIONS.map((size) => {
              const isSelected = selectedSize === size.value;
              return (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => {
                    setSelectedSize(size.value);
                    setValidationError(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-800 bg-amber-50/70 ring-1 ring-amber-800 shadow-xs'
                      : 'border-stone-200/90 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">{size.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-800" />}
                    </div>
                    <span className="text-[11px] text-stone-500 block mt-0.5">{size.description}</span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-amber-900">
                    {size.priceAdjustment === 0 ? '+$0.00' : `+${formatUsd(size.priceAdjustment)}`}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Option 2: Sugar Level */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <span>2. Sugar Level</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
              Selected: {selectedSugar}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {SUGAR_OPTIONS.map((sugar) => {
              const isSelected = selectedSugar === sugar;
              return (
                <button
                  key={sugar}
                  type="button"
                  onClick={() => {
                    setSelectedSugar(sugar);
                    setValidationError(null);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-amber-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 border border-stone-200/60'
                  }`}
                >
                  {sugar}
                </button>
              );
            })}
          </div>
        </section>

        {/* Option 3: Ice Level */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <span>3. Ice Level</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
              Selected: {selectedIce}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ICE_OPTIONS.map((ice) => {
              const isSelected = selectedIce === ice;
              return (
                <button
                  key={ice}
                  type="button"
                  onClick={() => {
                    setSelectedIce(ice);
                    setValidationError(null);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-amber-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80 border border-stone-200/60'
                  }`}
                >
                  {ice}
                </button>
              );
            })}
          </div>
        </section>

        {/* Live Recipe Summary Box */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Custom Recipe Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-700 pt-1">
            <div>
              <span className="text-[11px] text-stone-400 block">Drink</span>
              <span className="font-semibold text-stone-900 truncate block">{product.name}</span>
            </div>
            <div>
              <span className="text-[11px] text-stone-400 block">Size</span>
              <span className="font-semibold text-stone-900">{selectedSize}</span>
            </div>
            <div>
              <span className="text-[11px] text-stone-400 block">Sugar</span>
              <span className="font-semibold text-stone-900">{selectedSugar}</span>
            </div>
            <div>
              <span className="text-[11px] text-stone-400 block">Ice</span>
              <span className="font-semibold text-stone-900">{selectedIce}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Footer / Action Bar */}
      <div className="p-4 sm:p-5 border-t border-stone-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Quantity Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-xs font-bold text-stone-600 sm:hidden">Quantity:</span>
          <div className="flex items-center border border-stone-200 rounded-2xl p-1 bg-stone-50">
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-xl bg-white text-stone-700 hover:bg-stone-100 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-bold text-sm text-stone-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.min(20, prev + 1))}
              className="w-8 h-8 rounded-xl bg-white text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons & Calculated Total Price */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-3 rounded-2xl text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-2 sm:flex-none px-6 py-3 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-950/20 active:scale-98 transition-all flex items-center justify-between sm:justify-center gap-3 cursor-pointer"
          >
            <span>Add to Cart</span>
            <span className="bg-amber-950/40 px-2.5 py-1 rounded-xl text-xs font-mono font-bold tracking-tight">
              {formatUsd(subtotal)} ({formatKhr(subtotal)})
            </span>
          </button>
        </div>
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
  // Lock body scroll and listen for Escape key
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/60 backdrop-blur-xs transition-opacity duration-200"
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


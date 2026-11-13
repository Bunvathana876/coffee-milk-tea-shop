import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import type { CartItem as CartItemType } from '../../types';
import { formatUsd, formatKhr } from '../../config/currency';

export interface CartItemProps {
  item: CartItemType;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, onIncrease, onDecrease, onRemove }) => {
  return (
    <div className="cart-item-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Product Image & Details */}
      <div className="flex items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
        {item.image ? (
          <img
            src={item.image}
            alt={item.productName}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border border-line shadow-2xs"
          />
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-cream-deep text-cobalt flex items-center justify-center shrink-0 border border-line">
            <img
              src="/brand/brew-boba-cup-icon.webp"
              alt="Brew & Boba"
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
            />
          </div>
        )}

        <div className="space-y-1.5 flex-1 min-w-0">
          <h3 className="font-serif font-bold text-ink text-sm sm:text-base truncate">
            {item.productName}
          </h3>

          {/* Customization Recipe Pills */}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-lg bg-cream-deep text-ink-soft font-bold border border-line">
              Size: {item.size}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-butter/40 text-ink-dark font-bold border border-butter-deep/50">
              {item.sugarLevel} Sweet
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-cream-deep text-ink-soft font-bold border border-line">
              {item.iceLevel}
            </span>
            {item.toppings?.map(topping => (
              <span
                key={topping}
                className="px-2 py-0.5 rounded-lg bg-matcha/15 text-matcha font-bold border border-matcha/25"
              >
                + {topping}
              </span>
            ))}
          </div>

          <div className="text-xs text-ink-soft font-medium">
            {formatUsd(item.unitPriceUsd)} each
          </div>
        </div>
      </div>

      {/* Quantity & Subtotal Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-line">
        {/* Cobalt Quantity Stepper */}
        <div className="cart-stepper">
          <button
            type="button"
            onClick={() => onDecrease(item.id)}
            className="cart-stepper-btn cart-stepper-btn-dec active:scale-90"
            aria-label="Decrease quantity"
            title="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center font-bold text-xs sm:text-sm text-ink">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onIncrease(item.id)}
            className="cart-stepper-btn cart-stepper-btn-inc active:scale-90"
            aria-label="Increase quantity"
            title="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Item Subtotal in USD & KHR */}
        <div className="text-right min-w-20">
          <div className="font-serif font-black text-sm sm:text-base text-ink tracking-tight">
            {formatUsd(item.subtotalUsd)}
          </div>
          <div className="text-[11px] text-ink-soft font-medium">{formatKhr(item.subtotalUsd)}</div>
        </div>

        {/* Accessible Delete Item Button */}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-2 text-ink-soft hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          title={`Remove ${item.productName} from cart`}
          aria-label={`Remove ${item.productName} from cart`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

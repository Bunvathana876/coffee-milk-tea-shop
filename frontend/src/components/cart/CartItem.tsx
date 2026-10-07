import React from 'react';
import { Plus, Minus, Trash2, Coffee } from 'lucide-react';
import type { CartItem as CartItemType } from '../../types';
import { formatUsd, formatKhr } from '../../config/currency';

export interface CartItemProps {
  item: CartItemType;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-shadow hover:shadow-sm">
      {/* Product Image & Details */}
      <div className="flex items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
        {item.image ? (
          <img
            src={item.image}
            alt={item.productName}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border border-stone-200/80 shadow-2xs"
          />
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
            <Coffee className="w-8 h-8" />
          </div>
        )}

        <div className="space-y-1.5 flex-1 min-w-0">
          <h3 className="font-bold text-stone-900 text-sm sm:text-base truncate">
            {item.productName}
          </h3>

          {/* Customization Recipe Pills */}
          <div className="flex flex-wrap gap-1.5 text-[11px] text-stone-600">
            <span className="px-2 py-0.5 rounded-md bg-stone-100 font-medium">
              Size: <strong className="text-stone-800">{item.size}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-medium border border-amber-200/40">
              {item.sugarLevel} Sugar
            </span>
            <span className="px-2 py-0.5 rounded-md bg-stone-100 font-medium">
              {item.iceLevel}
            </span>
          </div>

          <div className="text-xs text-stone-500 font-mono">
            {formatUsd(item.unitPriceUsd)} each
          </div>
        </div>
      </div>

      {/* Quantity & Subtotal Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
        {/* Quantity Toggle */}
        <div className="flex items-center border border-stone-200 rounded-2xl p-1 bg-stone-50">
          <button
            type="button"
            onClick={() => onDecrease(item.id)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
            aria-label="Decrease quantity"
            title="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 sm:w-10 text-center font-bold text-xs sm:text-sm text-stone-900">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onIncrease(item.id)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
            aria-label="Increase quantity"
            title="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Item Subtotal in USD & KHR */}
        <div className="text-right min-w-20">
          <div className="font-extrabold text-sm sm:text-base text-amber-950">
            {formatUsd(item.subtotalUsd)}
          </div>
          <div className="text-[11px] text-stone-500 font-medium">
            {formatKhr(item.subtotalUsd)}
          </div>
        </div>

        {/* Delete Item Button */}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          title="Remove from cart"
          aria-label={`Remove ${item.productName} from cart`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


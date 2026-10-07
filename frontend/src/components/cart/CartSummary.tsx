import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, QrCode, Trash2, ShoppingBag } from 'lucide-react';
import { formatUsd, formatKhr } from '../../config/currency';
import { Button } from '../common/Button';

export interface CartSummaryProps {
  totalQuantity: number;
  subtotalUsd: number;
  totalPriceUsd: number;
  totalPriceKhr: number;
  onClearCart: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  totalQuantity,
  subtotalUsd,
  totalPriceUsd,
  onClearCart,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-5 sticky top-24">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-amber-800" />
          <span>Order Summary</span>
        </h3>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
          {totalQuantity} {totalQuantity === 1 ? 'drink' : 'drinks'}
        </span>
      </div>

      {/* Breakdown Rows */}
      <div className="space-y-3 text-xs text-stone-600">
        {/* Subtotal in USD & KHR */}
        <div className="flex justify-between items-start">
          <span className="font-medium text-stone-700">Subtotal</span>
          <div className="text-right">
            <div className="font-bold text-stone-900 text-sm leading-tight">
              {formatUsd(subtotalUsd)}
            </div>
            <div className="font-medium text-stone-500 text-xs">
              {formatKhr(subtotalUsd)}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-stone-50">
          <span>Service & Packaging</span>
          <span className="font-semibold text-emerald-700">Free</span>
        </div>
      </div>

      {/* Final Total Box in USD & KHR */}
      <div className="pt-3 border-t border-stone-200 flex items-baseline justify-between">
        <div>
          <span className="text-xs font-extrabold text-stone-600 uppercase tracking-wider block">
            Total
          </span>
          <span className="text-[11px] text-stone-400">
            Rate: $1 = {formatKhr(1)}
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight leading-none">
            {formatUsd(totalPriceUsd)}
          </div>
          <div className="text-sm font-bold text-amber-800 mt-1">
            {formatKhr(totalPriceUsd)}
          </div>
        </div>
      </div>

      {/* ABA KHQR Callout */}
      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center gap-2.5 text-xs text-amber-900">
        <div className="w-7 h-7 rounded-xl bg-amber-800 text-white flex items-center justify-center shrink-0">
          <QrCode className="w-4 h-4" />
        </div>
        <p className="leading-snug">
          Supports instant scanning via <strong>Bakong / ABA KHQR</strong> at checkout.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <Link to="/checkout" className="block w-full">
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-between"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            <span>Proceed to Checkout</span>
          </Button>
        </Link>

        <button
          type="button"
          onClick={onClearCart}
          className="w-full text-xs font-semibold text-stone-500 hover:text-rose-600 transition-colors py-1.5 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All Items</span>
        </button>
      </div>
    </div>
  );
};


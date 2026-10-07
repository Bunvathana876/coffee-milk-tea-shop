import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, QrCode, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useCart } from '../features/cart/useCart';
import { formatUsd, formatKhr } from '../config/currency';

export const CheckoutPage: React.FC = () => {
  const { totalQuantity, subtotalUsd, totalPriceUsd } = useCart();

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
        <Link to="/cart" className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Checkout & Payment</h1>
          <p className="text-xs text-stone-500">Dine-in or Takeaway details and ABA KHQR payment</p>
        </div>
      </div>

      {/* Dual Currency Checkout Totals Display */}
      <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-800" />
            <span>Order Summary</span>
          </h3>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {totalQuantity} {totalQuantity === 1 ? 'drink' : 'drinks'}
          </span>
        </div>

        {/* Subtotal */}
        <div className="flex justify-between items-start text-xs">
          <span className="font-medium text-stone-600">Subtotal</span>
          <div className="text-right">
            <div className="font-bold text-stone-900 text-sm">
              {formatUsd(subtotalUsd)}
            </div>
            <div className="font-medium text-stone-500 text-xs">
              {formatKhr(subtotalUsd)}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-start pt-3 border-t border-stone-200">
          <div>
            <span className="text-xs font-extrabold text-stone-700 uppercase tracking-wider block">
              Total
            </span>
            <span className="text-[11px] text-stone-400">
              Rate: $1 = {formatKhr(1)}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-amber-950">
              {formatUsd(totalPriceUsd)}
            </div>
            <div className="text-sm font-bold text-amber-800">
              {formatKhr(totalPriceUsd)}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming KHQR & Backend Integration Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
          <QrCode className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-stone-900">Checkout Flow Coming in Phase 4</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            This checkout page will host customer details (Name, Phone number, Dining Option) and the mock ABA KHQR digital payment scanner with instant order creation in SQLite.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-amber-800 font-semibold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200/60">
          <ShieldCheck className="w-4 h-4 text-amber-700" />
          Ready for backend order storage
        </div>
      </div>
    </div>
  );
};

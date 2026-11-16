import React from 'react';
import { Printer, X } from 'lucide-react';
import type { AdminOrder } from '../lib/api';

interface KitchenTicketModalProps {
  order: AdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const khr = new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 });

export const KitchenTicketModal: React.FC<KitchenTicketModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="confirm-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
      onClick={onClose}
    >
      <div
        className="confirm-dialog-card max-w-md w-full p-0 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-amber-400" />
            <h3 id="ticket-modal-title" className="text-sm font-bold tracking-wide uppercase">
              Kitchen Display Ticket
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
            aria-label="Close ticket preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Ticket Body (Simulated 80mm thermal receipt) */}
        <div className="p-6 bg-amber-50/40 text-slate-900 font-mono text-xs border-y border-dashed border-slate-300 print:p-0 print:border-none print:bg-white print:text-black">
          <div className="text-center pb-3 border-b border-dashed border-slate-400">
            <h2 className="text-base font-black tracking-wider">☕ BREW &amp; BOBA CAFÉ</h2>
            <p className="text-[11px] text-slate-600">BARISTA KITCHEN TICKET</p>
            <p className="text-[10px] text-slate-500 mt-1">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div className="py-2.5 border-b border-dashed border-slate-400 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Ticket #</span>
              <strong className="text-sm font-black tracking-tight">{order.order_number}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block">Customer</span>
              <strong className="text-xs font-bold">{order.customer_name}</strong>
              <div className="text-[10px] text-slate-500">{order.customer_phone}</div>
            </div>
          </div>

          {/* Items & Customizations */}
          <div className="py-3 space-y-3 border-b border-dashed border-slate-400">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Drink Items ({order.items.length})
            </div>
            {order.items.map((item, idx) => (
              <div key={item.id ?? idx} className="space-y-1">
                <div className="flex justify-between items-start font-bold text-slate-900 text-xs">
                  <span>
                    {item.quantity}× {item.product_name}
                  </span>
                  <span>{money.format(item.subtotal_usd)}</span>
                </div>
                <div className="pl-4 text-[11px] text-slate-700 space-y-0.5">
                  <div>
                    • Cup Size: <strong>{item.size}</strong>
                  </div>
                  <div>
                    • Sweetness: <strong>{item.sugar_level}</strong>
                  </div>
                  <div>
                    • Ice Level: <strong>{item.ice_level}</strong>
                  </div>
                  {item.toppings && (
                    <div className="text-indigo-900 font-bold">
                      + Toppings: {item.toppings}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="py-2.5 border-b border-dashed border-slate-400 bg-amber-100/50 -mx-6 px-6">
              <span className="text-[10px] font-bold text-amber-900 uppercase block">
                Customer Notes / Instructions:
              </span>
              <p className="text-xs font-semibold text-slate-900 mt-0.5">{order.notes}</p>
            </div>
          )}

          {/* Totals */}
          <div className="pt-3 space-y-1">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL (USD):</span>
              <span>{money.format(order.total_usd)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>TOTAL (KHR):</span>
              <span>៛{khr.format(order.total_khr)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-1">
              <span>Status: {order.order_status.toUpperCase()}</span>
              <span>Payment: {order.payment_status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-50 flex items-center justify-end gap-2.5 print:hidden">
          <button type="button" onClick={onClose} className="button-secondary">
            Close
          </button>
          <button type="button" onClick={handlePrint} className="button-primary flex items-center gap-2">
            <Printer size={15} />
            <span>Print Receipt Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};

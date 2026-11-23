import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div
      className="confirm-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:p-0 print:bg-white print:static print:inset-auto print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
      onClick={() => onCloseRef.current()}
    >
      <div
        className="confirm-dialog-card max-w-sm w-full bg-white rounded-2xl shadow-2xl p-0 overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header (Hidden on Print) */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white print:hidden">
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

        {/* Printable Ticket Body (Authoritative 80mm POS thermal receipt format) */}
        <div className="kitchen-ticket-printable p-6 bg-amber-50/40 text-slate-900 font-mono text-xs border-y border-dashed border-slate-300 print:p-0 print:border-none print:bg-white print:text-black print:w-[80mm] print:mx-auto">
          <div className="text-center pb-3 border-b border-dashed border-slate-400 print:border-black">
            <h2 className="text-base font-black tracking-wider">☕ BREW &amp; BOBA CAFÉ</h2>
            <p className="text-[11px] text-slate-600 print:text-black font-bold">BARISTA KITCHEN TICKET</p>
            <p className="text-[10px] text-slate-500 print:text-black mt-0.5">
              Street 214, BKK1, Phnom Penh • Tel: +855 23 999 888
            </p>
            <p className="text-[10px] text-slate-500 print:text-black mt-1">
              {new Date(order.created_at).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="py-2.5 border-b border-dashed border-slate-400 print:border-black flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-500 print:text-black uppercase block font-semibold">Ticket #</span>
              <strong className="text-sm font-black tracking-tight">{order.order_number}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 print:text-black uppercase block font-semibold">Customer</span>
              <strong className="text-xs font-bold">{order.customer_name || 'Guest'}</strong>
              <div className="text-[10px] text-slate-500 print:text-black">{order.customer_phone || 'N/A'}</div>
            </div>
          </div>

          {/* Items & Customizations */}
          <div className="py-3 space-y-3 border-b border-dashed border-slate-400 print:border-black">
            <div className="text-[10px] font-bold text-slate-500 print:text-black uppercase tracking-wider flex justify-between">
              <span>Drink Items ({order.items?.length ?? 0})</span>
              <span>Price</span>
            </div>
            {(order.items || []).map((item, idx) => {
              const toppingsText = Array.isArray(item.toppings)
                ? item.toppings.filter(Boolean).join(', ')
                : typeof item.toppings === 'string'
                  ? item.toppings.trim()
                  : '';
              return (
                <div key={item.id ?? idx} className="space-y-1 print:break-inside-avoid">
                  <div className="flex justify-between items-start font-bold text-slate-900 print:text-black text-xs">
                    <span>
                      {item.quantity}× {item.product_name}
                    </span>
                    <span>{money.format(item.subtotal_usd)}</span>
                  </div>
                  <div className="pl-3 text-[11px] text-slate-700 print:text-black space-y-0.5">
                    <div>
                      • Cup Size: <strong>{item.size}</strong>
                      {item.unit_price_usd > 0 && (
                        <span className="text-slate-500 print:text-black font-normal ml-1.5">
                          (@ {money.format(item.unit_price_usd)} each)
                        </span>
                      )}
                    </div>
                    <div>
                      • Sweetness: <strong>{item.sugar_level}</strong>
                    </div>
                    <div>
                      • Ice Level: <strong>{item.ice_level}</strong>
                    </div>
                    {toppingsText && (
                      <div className="text-indigo-900 print:text-black font-bold">
                        + Toppings: {toppingsText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          {order.notes && order.notes.trim() && (
            <div className="py-2.5 border-b border-dashed border-slate-400 print:border-black bg-amber-100/50 print:bg-transparent -mx-6 px-6 print:mx-0 print:px-0">
              <span className="text-[10px] font-bold text-amber-900 print:text-black uppercase block">
                Customer Notes / Instructions:
              </span>
              <p className="text-xs font-semibold text-slate-900 print:text-black mt-0.5">{order.notes}</p>
            </div>
          )}

          {/* Totals */}
          <div className="pt-3 space-y-1">
            {order.subtotal_usd !== undefined && order.subtotal_usd !== order.total_usd && (
              <div className="flex justify-between text-xs text-slate-600 print:text-black">
                <span>SUBTOTAL:</span>
                <span>{money.format(order.subtotal_usd)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL (USD):</span>
              <span>{money.format(order.total_usd)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 print:text-black">
              <span>TOTAL (KHR):</span>
              <span>៛{khr.format(order.total_khr ?? Math.round(order.total_usd * 4100))}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 print:text-black pt-1">
              <span>Status: {order.order_status?.toUpperCase() ?? 'PENDING'}</span>
              <span>Payment: {order.payment_status?.toUpperCase() ?? 'UNPAID'}</span>
            </div>
          </div>

          {/* Footer for ticket */}
          <div className="pt-3 text-center border-t border-dashed border-slate-400 print:border-black mt-3 text-[10px] text-slate-500 print:text-black">
            <p className="font-bold">*** KITCHEN PRODUCTION COPY ***</p>
            <p className="text-[9px] mt-0.5 font-mono">{order.order_number} • 80MM POS THERMAL</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-50 flex items-center justify-end gap-2.5 print:hidden">
          <button type="button" onClick={() => onCloseRef.current()} className="button-secondary">
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

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

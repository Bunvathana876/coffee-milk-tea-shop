import React, { useMemo } from 'react';
import {
  Clock,
  Coffee,
  CheckCircle2,
  Printer,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import type { AdminOrder, OrderStatus } from '../lib/api';

interface KitchenDisplayBoardProps {
  orders: AdminOrder[];
  loading: boolean;
  onAdvanceStatus: (orderId: number, nextStatus: OrderStatus) => Promise<void>;
  onOpenDetails: (orderId: number) => void;
  onPrintTicket: (order: AdminOrder) => void;
  busy: boolean;
}

function getTimeElapsed(dateStr: string): { label: string; isUrgent: boolean } {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return { label: 'Just now', isUrgent: false };
    if (diffMins < 60) return { label: `${diffMins}m ago`, isUrgent: diffMins >= 10 };
    const diffHours = Math.floor(diffMins / 60);
    return { label: `${diffHours}h ago`, isUrgent: true };
  } catch {
    return { label: 'Recent', isUrgent: false };
  }
}

export const KitchenDisplayBoard: React.FC<KitchenDisplayBoardProps> = ({
  orders,
  loading,
  onAdvanceStatus,
  onOpenDetails,
  onPrintTicket,
  busy,
}) => {
  const pendingOrders = useMemo(
    () => orders.filter(o => o.order_status === 'pending'),
    [orders],
  );
  const preparingOrders = useMemo(
    () => orders.filter(o => o.order_status === 'preparing'),
    [orders],
  );
  const readyOrders = useMemo(
    () => orders.filter(o => o.order_status === 'ready'),
    [orders],
  );

  const columns = [
    {
      status: 'pending' as OrderStatus,
      title: 'Pending Queue',
      subtitle: 'New tickets waiting to brew',
      icon: <Clock size={16} className="text-amber-500" />,
      colorClass: 'border-amber-400 bg-amber-50/30',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      orders: pendingOrders,
      nextStatus: 'preparing' as OrderStatus,
      actionLabel: 'Start Brewing',
      actionIcon: <Coffee size={14} />,
      btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    {
      status: 'preparing' as OrderStatus,
      title: 'Brewing Station',
      subtitle: 'Currently being crafted',
      icon: <Coffee size={16} className="text-blue-500" />,
      colorClass: 'border-blue-400 bg-blue-50/30',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
      orders: preparingOrders,
      nextStatus: 'ready' as OrderStatus,
      actionLabel: 'Mark Ready',
      actionIcon: <CheckCircle2 size={14} />,
      btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
      status: 'ready' as OrderStatus,
      title: 'Ready for Pickup',
      subtitle: 'Packaged at counter',
      icon: <CheckCircle2 size={16} className="text-emerald-500" />,
      colorClass: 'border-emerald-400 bg-emerald-50/30',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      orders: readyOrders,
      nextStatus: 'completed' as OrderStatus,
      actionLabel: 'Complete Order',
      actionIcon: <Sparkles size={14} />,
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  ];

  if (loading && orders.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-2">
        <Coffee className="w-8 h-8 mx-auto text-slate-400 animate-spin" />
        <p className="text-sm font-semibold">Loading Kitchen Board…</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
      {columns.map(col => (
        <div
          key={col.status}
          className={`rounded-2xl border-2 ${col.colorClass} p-4 flex flex-col min-h-[480px] shadow-xs`}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-white shadow-2xs border border-slate-200">
                {col.icon}
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">{col.title}</h3>
                <p className="text-[11px] text-slate-500">{col.subtitle}</p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black border ${col.badgeClass}`}
            >
              {col.orders.length}
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[620px] pr-1">
            {col.orders.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-300 rounded-xl bg-white/60 text-slate-400">
                <Coffee size={24} className="opacity-40 mb-1" />
                <span className="text-xs font-bold">No orders in this stage</span>
                <span className="text-[10px] text-slate-400">All caught up</span>
              </div>
            ) : (
              col.orders.map(order => {
                const elapsed = getTimeElapsed(order.created_at);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-3.5 space-y-2.5 relative group"
                  >
                    {/* Card Top: Order Number & Timer */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {order.order_number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          elapsed.isUrgent
                            ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Clock size={11} />
                        <span>{elapsed.label}</span>
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="text-xs">
                      <strong className="text-slate-900 block truncate">{order.customer_name}</strong>
                      <span className="text-[11px] text-slate-500">{order.customer_phone}</span>
                    </div>

                    {/* Order Items with Customization Tags */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
                      {order.items.map((item, idx) => (
                        <div key={item.id ?? idx} className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                          <div className="font-bold text-slate-900 flex justify-between">
                            <span>
                              {item.quantity}× {item.product_name}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              ${item.subtotal_usd.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                              {item.size}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                              {item.sugar_level} sugar
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                              {item.ice_level}
                            </span>
                            {item.toppings && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                                +{item.toppings}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes if present */}
                    {order.notes && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                        <strong>Note:</strong> {order.notes}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPrintTicket(order)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                          title="Print Kitchen Ticket"
                          aria-label="Print Kitchen Ticket"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDetails(order.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors text-[11px] font-semibold flex items-center gap-1"
                          title="View Full Order Details"
                        >
                          <span>Details</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onAdvanceStatus(order.id, col.nextStatus)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${col.btnClass}`}
                      >
                        {col.actionIcon}
                        <span>{col.actionLabel}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

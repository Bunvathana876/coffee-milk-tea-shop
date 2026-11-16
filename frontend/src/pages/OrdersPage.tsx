import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RefreshCw, ShoppingBag, Clock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { getOrdersByPhone } from '../services/api';
import { formatUsd } from '../config/currency';
import { ErrorState } from '../components/common/ErrorState';
import { getStatusBadge, getPaymentBadge } from '../utils/orderStatusBadge';
import type { Order } from '../types';

function OrderBrewTimeline({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <div className="py-1.5 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 mt-2">
        <span>Order was cancelled</span>
      </div>
    );
  }

  const steps = [
    { key: 'pending', label: '1. Received' },
    { key: 'preparing', label: '2. Brewing' },
    { key: 'ready', label: '3. Ready' },
    { key: 'completed', label: '4. Enjoyed' },
  ];

  const currentIdx =
    status === 'completed'
      ? 3
      : status === 'ready'
      ? 2
      : status === 'preparing'
      ? 1
      : 0;

  return (
    <div className="pt-2.5 pb-1 max-w-md">
      <div className="flex items-center justify-between text-[11px] font-bold text-ink-soft mb-1.5">
        <span>Kitchen Status</span>
        <span className="text-cobalt font-black capitalize">
          {status === 'preparing'
            ? '☕ Barista Crafting'
            : status === 'ready'
            ? '🎉 Ready for Pickup'
            : status}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {steps.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={s.key} className="space-y-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isDone
                    ? 'bg-cobalt'
                    : isCurrent
                    ? 'bg-butter ring-2 ring-cobalt/40 animate-pulse'
                    : 'bg-cream-deep'
                }`}
              />
              <span
                className={`block text-[10px] text-center font-bold truncate ${
                  isCurrent ? 'text-cobalt' : isDone ? 'text-ink' : 'text-ink-muted/70'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderHistory({ phone }: { phone: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const reload = () => {
    setLoading(true);
    setError(null);
    setRefresh(value => value + 1);
  };

  useEffect(() => {
    let active = true;
    getOrdersByPhone(phone)
      .then(result => {
        if (active) setOrders(result);
      })
      .catch(reason => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Unable to load your orders.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [phone, refresh]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="orders-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-cream-card border border-line">
        <p className="text-xs sm:text-sm text-ink-soft">
          Orders linked to your signed-in account ({phone}).
        </p>
        <button
          type="button"
          disabled={loading}
          className="text-link inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-cobalt hover:text-cobalt-dark transition-colors cursor-pointer self-start sm:self-auto"
          onClick={reload}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh orders</span>
        </button>
      </div>

      {loading ? (
        <div role="status" className="cafe-empty account-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cream-deep text-cobalt flex items-center justify-center mx-auto border border-line animate-pulse">
            <Clock className="w-6 h-6" />
          </div>
          <p className="font-serif font-bold text-base text-ink">Finding your cups…</p>
          <p className="text-xs text-ink-soft">Fetching your latest barista orders</p>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : orders.length === 0 ? (
        <div className="cafe-empty account-card p-10 sm:p-14 text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-cream-deep border border-line flex items-center justify-center mx-auto shadow-2xs">
            <img
              src="/brand/brew-boba-cup-badge.webp"
              alt="Brew & Boba Badge"
              width="64"
              height="64"
              className="w-14 h-14 object-contain"
            />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h2 className="text-2xl font-serif font-black text-ink uppercase tracking-tight">
              Your next good cup is waiting.
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft">
              No orders are linked to this account yet.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/menu"
              className="cafe-button cafe-button-dark inline-flex items-center gap-2 px-6 py-3 rounded-full bg-cobalt hover:bg-cobalt-dark text-butter font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              <span>Explore menu</span>
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="orders-list space-y-4">
          {orders.map(order => (
            <article
              className="order-history-card account-card flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:border-cobalt/40"
              key={order.id}
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <p className="eyebrow text-[11px] font-bold text-cobalt uppercase tracking-wider bg-cream-deep px-2.5 py-0.5 rounded-full border border-line">
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(order.order_status)}`}
                  >
                    Order: {order.order_status}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPaymentBadge(order.payment_status)}`}
                  >
                    Payment: {order.payment_status}
                  </span>
                </div>

                <h2 className="font-serif font-black text-lg sm:text-xl text-ink tracking-tight">
                  {order.order_number}
                </h2>

                <p className="text-xs text-ink-soft">
                  Order: <strong>{order.order_status}</strong> · Payment:{' '}
                  <strong>{order.payment_status}</strong>
                </p>

                {order.notes && (
                  <p className="text-xs text-ink-soft/80 bg-cream/70 p-2.5 rounded-xl border border-line/60">
                    <span className="font-semibold text-ink">Instructions:</span> {order.notes}
                  </p>
                )}

                {/* Live Brewing Progress Stepper */}
                <OrderBrewTimeline status={order.order_status} />
              </div>

              <div className="order-history-total flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-line shrink-0">
                <div className="text-left md:text-right">
                  <strong className="block font-serif font-black text-xl text-cobalt tracking-tight">
                    {formatUsd(order.total_usd)}
                  </strong>
                  <span className="text-xs font-bold text-ink-muted">
                    ៛{new Intl.NumberFormat('en-US').format(order.total_khr)}
                  </span>
                </div>

                <Link
                  to={`/receipt/${order.id}`}
                  className="text-link inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cream-deep hover:bg-cream border border-line font-bold text-xs text-cobalt hover:text-cobalt-dark transition-colors cursor-pointer"
                >
                  <span>Receipt &amp; status</span>
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrdersPage() {
  const { user, token, isAuthenticated, openAuthModalWith } = useAuth();

  return (
    <section className="orders-page space-y-6 sm:space-y-8 max-w-5xl mx-auto py-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="account-page-header">
        <div className="space-y-1.5">
          <div className="cart-brand-badge">
            <ShoppingBag className="cart-badge-icon text-cobalt" />
            <p className="eyebrow font-bold text-xs uppercase tracking-wider text-cobalt">
              Your Brew &amp; Boba
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-cobalt tracking-tight uppercase">
            Your Sips, Your Stories.
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Track past handcrafted orders, view digital receipts, and check fulfillment.
          </p>
        </div>

        {isAuthenticated && user && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream-deep border border-line text-xs font-bold text-ink self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Account verified: {user.phone}</span>
          </div>
        )}
      </div>

      {isAuthenticated && user ? (
        <OrderHistory key={`${user.id}-${token}`} phone={user.phone} />
      ) : (
        <div className="cafe-empty account-card p-10 sm:p-14 text-center space-y-5 my-8">
          <div className="w-20 h-20 rounded-3xl bg-cream-deep border border-line flex items-center justify-center mx-auto shadow-2xs">
            <img
              src="/brand/brew-boba-mascot-badge.webp"
              alt="Brew & Boba Mascot"
              width="72"
              height="72"
              className="w-16 h-16 object-contain"
            />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h2 className="text-2xl font-serif font-black text-ink uppercase tracking-tight">
              Let’s find your orders.
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
              Sign in to see orders linked to your account and open their receipts.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              className="cafe-button cafe-button-dark inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-cobalt hover:bg-cobalt-dark text-butter font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer border border-cobalt-dark"
              onClick={() => openAuthModalWith({ mode: 'login', redirectTo: '/orders' })}
            >
              <span>Sign in to view orders</span>
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

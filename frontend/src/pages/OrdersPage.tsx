import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Coffee, RefreshCw } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { getOrdersByPhone } from '../services/api';
import { formatUsd } from '../config/currency';
import { ErrorState } from '../components/common/ErrorState';
import type { Order } from '../types';

function OrderHistory({ phone }: { phone: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const reload = () => {
    setLoading(true);
    setError(null);
    setRefresh((value) => value + 1);
  };

  useEffect(() => {
    let active = true;
    getOrdersByPhone(phone)
      .then((result) => {
        if (active) setOrders(result);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Unable to load your orders.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [phone, refresh]);

  return (
    <>
      <div className="orders-toolbar">
        <p>Orders linked to your signed-in account.</p>
        <button
          type="button"
          disabled={loading}
          className="text-link"
          onClick={reload}
        >
          <RefreshCw size={16} />
          Refresh orders
        </button>
      </div>
      {loading ? (
        <p role="status" className="cafe-empty">
          Finding your cups…
        </p>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : orders.length === 0 ? (
        <div className="cafe-empty">
          <Coffee size={38} strokeWidth={1.3} />
          <h2>Your next good cup is waiting.</h2>
          <p>No orders are linked to this account yet.</p>
          <Link to="/menu" className="cafe-button cafe-button-dark">
            Explore menu <ArrowUpRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article className="order-history-card" key={order.id}>
              <div>
                <p className="eyebrow">
                  {new Date(order.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <h2>{order.order_number}</h2>
                <p>
                  Order: <strong>{order.order_status}</strong> · Payment:{' '}
                  <strong>{order.payment_status}</strong>
                </p>
              </div>
              <div className="order-history-total">
                <strong>{formatUsd(order.total_usd)}</strong>
                <span>
                  ៛{new Intl.NumberFormat('en-US').format(order.total_khr)}
                </span>
                <Link to={`/receipt/${order.id}`} className="text-link">
                  Receipt &amp; status <ArrowUpRight size={17} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export function OrdersPage() {
  const { user, token, isAuthenticated, openAuthModalWith } = useAuth();
  return (
    <section className="orders-page">
      <p className="eyebrow">Your Brew &amp; Boba</p>
      <h1>
        Your cups,
        <br />
        <em>all in one place.</em>
      </h1>
      {isAuthenticated && user ? (
        <OrderHistory key={`${user.id}-${token}`} phone={user.phone} />
      ) : (
        <div className="cafe-empty">
          <Coffee size={38} strokeWidth={1.3} />
          <h2>Let’s find your orders.</h2>
          <p>
            Sign in to see orders linked to your account and open their
            receipts.
          </p>
          <button
            type="button"
            className="cafe-button cafe-button-dark"
            onClick={() =>
              openAuthModalWith({ mode: 'login', redirectTo: '/orders' })
            }
          >
            Sign in to view orders <ArrowUpRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}

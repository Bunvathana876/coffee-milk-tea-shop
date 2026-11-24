import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Coffee,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useNotifications } from '../../features/notifications/useNotifications';

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (!Number.isFinite(diffMs) || diffMs < 45_000) return 'Just now';
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

function supportsNativePopover(): boolean {
  return (
    typeof HTMLElement !== 'undefined' && Object.hasOwn(HTMLElement.prototype, 'popover')
  );
}

export const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLiveConnected,
    soundEnabled,
    browserPermission,
    markAsRead,
    markAllAsRead,
    toggleSound,
    requestBrowserPermission,
    refreshNotifications,
  } = useNotifications();

  const reactId = useId();
  const panelId = `customer-notifications-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const nativePopover = supportsNativePopover();

  // Wire native Popover API attributes and toggle listener when supported.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !nativePopover) return;
    if (!panel.hasAttribute('popover')) {
      panel.setAttribute('popover', 'auto');
    }
    const handleToggle = (event: Event) => {
      const toggleEvent = event as Event & { newState?: 'open' | 'closed' };
      const nextOpen = toggleEvent.newState === 'open';
      setIsOpen(nextOpen);
      if (nextOpen) {
        void refreshNotifications();
      }
    };
    panel.addEventListener('toggle', handleToggle);
    return () => {
      panel.removeEventListener('toggle', handleToggle);
    };
  }, [nativePopover, refreshNotifications]);

  // Fallback outside-click & Escape dismissal when Popover API is unavailable (e.g. legacy browsers / jsdom).
  useEffect(() => {
    if (nativePopover || !isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [nativePopover, isOpen]);

  const closePanel = () => {
    const panel = panelRef.current as (HTMLDivElement & { hidePopover?: () => void }) | null;
    if (nativePopover && panel?.hidePopover) {
      try {
        panel.hidePopover();
      } catch {
        // Ignore if already hidden.
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleFallbackToggle = () => {
    if (nativePopover) return;
    setIsOpen(prev => {
      const next = !prev;
      if (next) void refreshNotifications();
      return next;
    });
  };

  const hasUnreadReady = notifications.some(n => !n.is_read && n.type === 'order_ready');
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div className="nav-notif-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`nav-notif-trigger${hasUnreadReady ? ' has-ready-alert' : ''}`}
        aria-label={
          unreadCount > 0 ? `Order notifications, ${unreadCount} unread` : 'Order notifications'
        }
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={handleFallbackToggle}
        {...(nativePopover ? ({ popoverTarget: panelId } as Record<string, string>) : {})}
      >
        {hasUnreadReady ? (
          <BellRing size={18} aria-hidden="true" />
        ) : (
          <Bell size={18} aria-hidden="true" />
        )}
        {unreadCount > 0 && (
          <span className="nav-notif-badge" aria-hidden="true">
            {badgeText}
          </span>
        )}
      </button>

      <div
        id={panelId}
        ref={panelRef}
        className={`notif-popover-panel${!nativePopover && isOpen ? ' is-open-fallback' : ''}`}
      >
        <div className="notif-panel-header">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-serif font-black text-ink tracking-tight">Notifications</h2>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isLiveConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-cream-deep text-ink-soft border-line'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLiveConnected ? 'bg-emerald-500' : 'bg-ink-muted'
                }`}
                aria-hidden="true"
              />
              {isLiveConnected ? 'Live' : 'Auto-sync'}
            </span>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-cobalt hover:text-cobalt-dark transition-colors px-2 py-1 rounded-lg hover:bg-cobalt-light"
              onClick={() => void markAllAsRead()}
            >
              <CheckCheck size={13} aria-hidden="true" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        <div className="notif-panel-prefs">
          <button
            type="button"
            className="notif-pref-btn"
            aria-pressed={soundEnabled}
            onClick={toggleSound}
          >
            {soundEnabled ? (
              <Volume2 size={13} aria-hidden="true" />
            ) : (
              <VolumeX size={13} aria-hidden="true" />
            )}
            <span>Chime: {soundEnabled ? 'On' : 'Off'}</span>
          </button>

          {browserPermission === 'default' && (
            <button
              type="button"
              className="notif-pref-btn notif-pref-btn-accent"
              onClick={() => void requestBrowserPermission()}
            >
              <BellRing size={13} aria-hidden="true" />
              <span>Enable browser alerts</span>
            </button>
          )}
          {browserPermission === 'granted' && (
            <span className="notif-pref-status">Browser alerts on</span>
          )}
        </div>

        <div className="notif-panel-body">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <div className="w-10 h-10 rounded-2xl bg-cream-deep border border-line flex items-center justify-center mx-auto mb-2 text-cobalt">
                <Coffee size={18} aria-hidden="true" />
              </div>
              <p className="text-xs font-bold text-ink">No drink alerts yet</p>
              <p className="text-[11px] text-ink-soft mt-1 leading-relaxed">
                We&apos;ll alert you here the moment our baristas mark your drink ready for pickup.
              </p>
            </div>
          ) : (
            <ul className="notif-list" role="list">
              {notifications.map(item => (
                <li
                  key={item.id}
                  className={`notif-item${!item.is_read ? ' is-unread' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!item.is_read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Ready for Pickup
                      </span>
                      <span className="font-mono text-[11px] font-bold text-ink-soft">
                        #{item.order_number}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-ink-muted shrink-0">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>

                  <p className="text-xs font-extrabold text-ink mt-1.5">{item.title}</p>
                  <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">{item.message}</p>

                  <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-line/70">
                    {item.order_id ? (
                      <Link
                        to={`/receipt/${item.order_id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-cobalt hover:text-cobalt-dark"
                        aria-label={`View receipt for order ${item.order_number}`}
                        onClick={() => {
                          if (!item.is_read) void markAsRead(item.id);
                          closePanel();
                        }}
                      >
                        <span>View Receipt</span>
                        <ExternalLink size={12} aria-hidden="true" />
                      </Link>
                    ) : (
                      <Link
                        to="/orders"
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-cobalt hover:text-cobalt-dark"
                        onClick={() => {
                          if (!item.is_read) void markAsRead(item.id);
                          closePanel();
                        }}
                      >
                        <span>View Orders</span>
                        <ExternalLink size={12} aria-hidden="true" />
                      </Link>
                    )}

                    {!item.is_read && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-soft hover:text-ink px-2 py-1 rounded-lg hover:bg-cream-deep"
                        aria-label={`Mark order ${item.order_number} notification as read`}
                        onClick={() => void markAsRead(item.id)}
                      >
                        <Check size={12} aria-hidden="true" />
                        <span>Mark read</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="notif-panel-footer">
          <Link
            to="/orders"
            className="text-xs font-extrabold text-cobalt hover:text-cobalt-dark inline-flex items-center gap-1"
            onClick={closePanel}
          >
            <span>Track all orders</span>
            <ExternalLink size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};

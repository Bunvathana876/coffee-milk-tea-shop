import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BellRing, Check, X } from 'lucide-react';
import { useNotifications } from '../../features/notifications/useNotifications';
import type { CustomerNotification } from '../../types';

function hasOpenModalDialog(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('dialog[open]'));
}

function announceNotification(alert: CustomerNotification): string {
  const announcementText = `${alert.title} ${alert.message} Actions available`;
  if (typeof document !== 'undefined') {
    const doc = document as Document & {
      ariaNotify?: (text: string, options?: { priority?: 'normal' | 'high' }) => void;
    };
    if (typeof doc.ariaNotify === 'function') {
      try {
        doc.ariaNotify(announcementText, { priority: 'high' });
      } catch {
        // Fallback live region below will announce.
      }
    }
  }
  return announcementText;
}

export const DrinkReadyAlertHost: React.FC = () => {
  const { activeAlerts, dismissAlert } = useNotifications();
  const [modalOpen, setModalOpen] = useState<boolean>(hasOpenModalDialog);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const announcedIdsRef = useRef<Set<number>>(new Set());
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());

  // Suppress surfacing toast notifications while a native modal <dialog open> is active.
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    const checkModal = () => setModalOpen(hasOpenModalDialog());
    checkModal();
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    return () => observer.disconnect();
  }, []);

  const visibleAlerts = useMemo(
    () => (modalOpen ? [] : activeAlerts),
    [modalOpen, activeAlerts],
  );

  // Promote toast stack into the Top Layer with popover="manual" when supported.
  useEffect(() => {
    const el = containerRef.current as
      | (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void })
      | null;
    if (
      !el ||
      typeof HTMLElement === 'undefined' ||
      !Object.hasOwn(HTMLElement.prototype, 'popover')
    ) {
      return;
    }
    if (!el.hasAttribute('popover')) {
      el.setAttribute('popover', 'manual');
    }
    try {
      if (visibleAlerts.length > 0) {
        el.showPopover?.();
      } else {
        el.hidePopover?.();
      }
    } catch {
      // Ignore if element is detached or already in the desired popover state.
    }
  }, [visibleAlerts.length]);

  // Announce newly surfaced alerts via ariaNotify() + fallback live region without stealing focus.
  useEffect(() => {
    if (visibleAlerts.length === 0) return;

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      if (!containerRef.current?.contains(document.activeElement)) {
        previousFocusRef.current = document.activeElement;
      }
    }

    const unannounced = visibleAlerts.filter(a => !announcedIdsRef.current.has(a.id));
    if (unannounced.length === 0) return;

    for (const item of unannounced) {
      announcedIdsRef.current.add(item.id);
    }

    const latest = unannounced[0];
    const message = announceNotification(latest);
    const clearTimer = setTimeout(() => setLiveAnnouncement(''), 0);
    const speakTimer = setTimeout(() => setLiveAnnouncement(message), 25);
    return () => {
      clearTimeout(clearTimer);
      clearTimeout(speakTimer);
    };
  }, [visibleAlerts]);

  const handleDismiss = (alert: CustomerNotification, index: number) => {
    const remaining = visibleAlerts.filter(item => item.id !== alert.id);
    if (typeof document !== 'undefined') {
      const active = document.activeElement;
      const card = containerRef.current?.querySelector(`[data-alert-id="${alert.id}"]`);
      if (card && active && card.contains(active)) {
        const nextAlert = remaining[Math.min(index, remaining.length - 1)];
        if (nextAlert) {
          setTimeout(() => closeButtonRefs.current.get(nextAlert.id)?.focus(), 0);
        } else if (previousFocusRef.current?.focus) {
          const prior = previousFocusRef.current;
          setTimeout(() => prior.focus(), 0);
        }
      }
    }
    dismissAlert(alert.id, true);
  };

  return (
    <>
      <p className="visually-hidden">Screen reader order notifications</p>
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">
        {liveAnnouncement}
      </div>

      <div
        ref={containerRef}
        role="region"
        aria-label="Order pickup notifications"
        className={`drink-alert-region${visibleAlerts.length === 0 ? ' is-empty' : ''}`}
      >
        {visibleAlerts.map((alert, index) => (
          <article
            key={alert.id}
            data-alert-id={alert.id}
            className="drink-alert-card"
            aria-labelledby={`drink-alert-title-${alert.id}`}
          >
            <div className="drink-alert-head">
              <div className="flex items-center gap-2 min-w-0">
                <span className="drink-alert-icon" aria-hidden="true">
                  <BellRing size={18} />
                </span>
                <div className="min-w-0">
                  <span className="drink-alert-pill">Drink Ready for Pickup</span>
                  <h2 id={`drink-alert-title-${alert.id}`} className="drink-alert-title">
                    {alert.title}
                  </h2>
                </div>
              </div>

              <button
                ref={node => {
                  if (node) closeButtonRefs.current.set(alert.id, node);
                  else closeButtonRefs.current.delete(alert.id);
                }}
                type="button"
                className="drink-alert-close"
                aria-label={`Close notification for order ${alert.order_number}`}
                onClick={() => handleDismiss(alert, index)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <p className="drink-alert-message">{alert.message}</p>

            <div className="drink-alert-actions">
              <Link
                to={alert.order_id ? `/receipt/${alert.order_id}` : '/orders'}
                className="drink-alert-primary"
                aria-label={`View pickup receipt for order ${alert.order_number}`}
                onClick={() => dismissAlert(alert.id, true)}
              >
                <span>View Receipt &amp; Pickup</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
              <button
                type="button"
                className="drink-alert-secondary"
                aria-label={`Acknowledge order ${alert.order_number} ready alert`}
                onClick={() => handleDismiss(alert, index)}
              >
                <Check size={14} aria-hidden="true" />
                <span>Got it</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../auth/useAuth';
import {
  connectNotificationStream,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { playDrinkReadyChime } from '../../utils/notificationSound';
import type { CustomerNotification, NotificationSyncEvent } from '../../types';
import {
  NotificationContext,
  type BrowserNotificationPermissionState,
} from './useNotifications';

const SOUND_PREF_KEY = 'brew_boba_notification_sound';
const DISMISSED_ALERTS_KEY = 'brew_boba_dismissed_alert_ids';

function readSoundPreference(): boolean {
  try {
    const saved = localStorage.getItem(SOUND_PREF_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

function readDismissedAlertIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_ALERTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(Number).filter(Number.isFinite));
  } catch {
    return new Set();
  }
}

function writeDismissedAlertIds(ids: Set<number>): void {
  try {
    sessionStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...ids].slice(-50)));
  } catch {
    // Ignore storage failures.
  }
}

function getBrowserNotificationPermission(): BrowserNotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

function canRenderCanvasConfetti(): boolean {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return false;
  if (/jsdom/i.test(navigator.userAgent)) return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext?.('2d'));
  } catch {
    return false;
  }
}

function triggerBrowserNotification(notification: CustomerNotification): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  try {
    const browserNotif = new window.Notification(notification.title, {
      body: notification.message,
      icon: '/brand/brew-boba-cup-icon.webp',
      tag: `brew-boba-order-${notification.order_id ?? notification.id}`,
      requireInteraction: true,
    });
    browserNotif.onclick = () => {
      window.focus();
      if (notification.order_id) {
        window.location.assign(`/receipt/${notification.order_id}`);
      }
      browserNotif.close();
    };
  } catch {
    // Some browsers disallow direct Notification construction without SW; ignore safely.
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token, user } = useAuth();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState<CustomerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(readSoundPreference);
  const [browserPermission, setBrowserPermission] = useState<BrowserNotificationPermissionState>(
    getBrowserNotificationPermission,
  );
  const [lastOrderEventAt, setLastOrderEventAt] = useState(0);

  const knownIdsRef = useRef<Set<number>>(new Set());
  const hasHydratedRef = useRef(false);
  const dismissedIdsRef = useRef<Set<number>>(readDismissedAlertIds());
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const triggerLiveAlertEffects = useCallback((notification: CustomerNotification) => {
    if (soundEnabledRef.current) {
      playDrinkReadyChime();
    }
    triggerBrowserNotification(notification);
    if (!prefersReducedMotion() && canRenderCanvasConfetti()) {
      try {
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { x: 0.85, y: 0.18 },
          colors: ['#10B981', '#1345A3', '#F5E4AD'],
        });
      } catch {
        // Confetti is purely decorative.
      }
    }
  }, []);

  const mergeIncomingNotification = useCallback(
    (incoming: CustomerNotification, isLivePush: boolean) => {
      const wasKnown = knownIdsRef.current.has(incoming.id);
      knownIdsRef.current.add(incoming.id);

      setNotifications(prev => {
        const exists = prev.some(n => n.id === incoming.id);
        const next = exists
          ? prev.map(n => (n.id === incoming.id ? incoming : n))
          : [incoming, ...prev].slice(0, 50);
        setUnreadCount(next.filter(n => !n.is_read).length);
        return next;
      });

      if (!incoming.is_read && !dismissedIdsRef.current.has(incoming.id)) {
        setActiveAlerts(prev => {
          if (prev.some(a => a.id === incoming.id)) return prev;
          return [incoming, ...prev].slice(0, 4);
        });
      }

      if (isLivePush && !wasKnown && !incoming.is_read) {
        setLastOrderEventAt(Date.now());
        triggerLiveAlertEffects(incoming);
      }
    },
    [triggerLiveAlertEffects],
  );

  const applyFetchedNotifications = useCallback(
    (items: CustomerNotification[], serverUnreadCount: number) => {
      const previouslyHydrated = hasHydratedRef.current;
      const newlyDiscoveredUnread: CustomerNotification[] = [];

      for (const item of items) {
        if (!knownIdsRef.current.has(item.id)) {
          knownIdsRef.current.add(item.id);
          if (previouslyHydrated && !item.is_read && item.type === 'order_ready') {
            newlyDiscoveredUnread.push(item);
          }
        }
      }

      hasHydratedRef.current = true;
      setNotifications(items);
      setUnreadCount(serverUnreadCount);

      // Surface unread drink-ready notifications that have not been dismissed this session.
      const unreadReady = items.filter(
        item => !item.is_read && item.type === 'order_ready' && !dismissedIdsRef.current.has(item.id),
      );
      setActiveAlerts(unreadReady.slice(0, 4));

      if (newlyDiscoveredUnread.length > 0) {
        setLastOrderEventAt(Date.now());
        triggerLiveAlertEffects(newlyDiscoveredUnread[0]);
      }
    },
    [triggerLiveAlertEffects],
  );

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      const data = await getMyNotifications({ limit: 30, token });
      applyFetchedNotifications(data.items, data.unread_count);
    } catch {
      // Keep existing notification state during transient network blips.
    }
  }, [isAuthenticated, token, applyFetchedNotifications]);

  const handleSyncEvent = useCallback(
    (event: NotificationSyncEvent) => {
      if (event.order_status === 'completed' || event.order_status === 'cancelled') {
        setActiveAlerts(prev => prev.filter(item => item.order_id !== event.order_id));
      }
      setLastOrderEventAt(Date.now());
      void refreshNotifications();
    },
    [refreshNotifications],
  );

  const userId = user?.id ?? null;

  // Hydrate notifications & maintain authenticated SSE stream for the signed-in customer.
  useEffect(() => {
    if (!isAuthenticated || !token || userId === null) {
      knownIdsRef.current = new Set();
      hasHydratedRef.current = false;
      return;
    }

    let cancelled = false;
    knownIdsRef.current = new Set();
    hasHydratedRef.current = false;

    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const data = await getMyNotifications({ limit: 30, token });
        if (!cancelled) {
          applyFetchedNotifications(data.items, data.unread_count);
        }
      } catch {
        // Silent fallback on cold start; SSE / poll will catch up.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void loadInitial();

    // Establish authenticated SSE stream with automatic reconnect backoff.
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let streamController: AbortController | null = null;
    let attempt = 0;

    const startStream = () => {
      if (cancelled) return;
      streamController = new AbortController();
      connectNotificationStream({
        token,
        signal: streamController.signal,
        onConnected: () => {
          attempt = 0;
          if (!cancelled) setIsLiveConnected(true);
        },
        onNotification: incoming => {
          if (!cancelled) mergeIncomingNotification(incoming, true);
        },
        onSync: event => {
          if (!cancelled) handleSyncEvent(event);
        },
        onUnauthorized: () => {
          cancelled = true;
          setIsLiveConnected(false);
        },
      })
        .catch(() => {
          // Handled in finally via reconnect timer.
        })
        .finally(() => {
          if (cancelled) return;
          setIsLiveConnected(false);
          attempt += 1;
          const delayMs = Math.min(10_000, 2000 * attempt);
          reconnectTimer = setTimeout(startStream, delayMs);
        });
    };

    startStream();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      streamController?.abort();
      setIsLiveConnected(false);
    };
  }, [
    isAuthenticated,
    token,
    userId,
    applyFetchedNotifications,
    mergeIncomingNotification,
    handleSyncEvent,
  ]);

  // Resilient polling fallback (only active when SSE is not connected) + focus/visibility sync.
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const handleVisibleOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refreshNotifications();
    };

    window.addEventListener('focus', handleVisibleOrFocus);
    document.addEventListener('visibilitychange', handleVisibleOrFocus);

    const pollMs = isLiveConnected ? 30_000 : 10_000;
    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refreshNotifications();
    }, pollMs);

    return () => {
      window.removeEventListener('focus', handleVisibleOrFocus);
      document.removeEventListener('visibilitychange', handleVisibleOrFocus);
      clearInterval(pollTimer);
    };
  }, [isAuthenticated, token, isLiveConnected, refreshNotifications]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      dismissedIdsRef.current.add(notificationId);
      writeDismissedAlertIds(dismissedIdsRef.current);
      setActiveAlerts(prev => prev.filter(item => item.id !== notificationId));
      setNotifications(prev => {
        const next = prev.map(item =>
          item.id === notificationId
            ? { ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() }
            : item,
        );
        setUnreadCount(next.filter(n => !n.is_read).length);
        return next;
      });

      if (!token) return;
      try {
        const res = await markNotificationRead(notificationId, token);
        setUnreadCount(res.unread_count);
      } catch {
        // Reconcile on next refresh if network was unavailable.
      }
    },
    [token],
  );

  const markAllAsRead = useCallback(async () => {
    setActiveAlerts(prev => {
      for (const item of prev) dismissedIdsRef.current.add(item.id);
      writeDismissedAlertIds(dismissedIdsRef.current);
      return [];
    });
    const now = new Date().toISOString();
    setNotifications(prev =>
      prev.map(item => ({ ...item, is_read: true, read_at: item.read_at ?? now })),
    );
    setUnreadCount(0);

    if (!token) return;
    try {
      await markAllNotificationsRead(token);
    } catch {
      // Reconcile on next refresh if network was unavailable.
    }
  }, [token]);

  const dismissAlert = useCallback(
    (notificationId: number, alsoMarkRead = true) => {
      dismissedIdsRef.current.add(notificationId);
      writeDismissedAlertIds(dismissedIdsRef.current);
      setActiveAlerts(prev => prev.filter(item => item.id !== notificationId));
      if (alsoMarkRead) {
        void markAsRead(notificationId);
      }
    },
    [markAsRead],
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_PREF_KEY, String(next));
      } catch {
        // Ignore storage failures.
      }
      if (next) {
        playDrinkReadyChime();
      }
      return next;
    });
  }, []);

  const requestBrowserPermission = useCallback(async (): Promise<BrowserNotificationPermissionState> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported');
      return 'unsupported';
    }
    try {
      const result = await window.Notification.requestPermission();
      setBrowserPermission(result);
      return result;
    } catch {
      return getBrowserNotificationPermission();
    }
  }, []);

  const isSignedIn = Boolean(isAuthenticated && token && userId !== null);

  return (
    <NotificationContext.Provider
      value={{
        notifications: isSignedIn ? notifications : [],
        unreadCount: isSignedIn ? unreadCount : 0,
        activeAlerts: isSignedIn ? activeAlerts : [],
        isLoading: isSignedIn ? isLoading : false,
        isLiveConnected: isSignedIn ? isLiveConnected : false,
        soundEnabled,
        browserPermission,
        lastOrderEventAt: isSignedIn ? lastOrderEventAt : 0,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        dismissAlert,
        toggleSound,
        requestBrowserPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

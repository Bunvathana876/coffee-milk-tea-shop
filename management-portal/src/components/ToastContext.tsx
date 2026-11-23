import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
}

export interface ToastEntry {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs: number;
}

export interface ToastContextValue {
  notify: (input: ToastInput | string) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const defaultToastContext: ToastContextValue = {
  notify: () => '',
  dismiss: () => {},
  clearAll: () => {},
};

export const ToastContext = createContext<ToastContextValue>(defaultToastContext);

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

function announceToast(message: string, tone: ToastTone) {
  if (typeof document === 'undefined') return;
  const doc = document as Document & {
    ariaNotify?: (text: string, options?: { priority?: 'normal' | 'high' }) => void;
  };
  if (typeof doc.ariaNotify === 'function') {
    try {
      doc.ariaNotify(message, { priority: tone === 'error' ? 'high' : 'normal' });
    } catch {
      // Fall back to live regions below.
    }
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [politeAnnouncement, setPoliteAnnouncement] = useState('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('');
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pausedRef = useRef<Set<string>>(new Set());
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      pausedRef.current.delete(id);
      setToasts(prev => {
        const index = prev.findIndex(item => item.id === id);
        const remaining = prev.filter(item => item.id !== id);
        if (typeof document !== 'undefined') {
          const active = document.activeElement;
          const btn = closeButtonRefs.current.get(id);
          if (btn && active && (active === btn || btn.contains(active))) {
            const nextToast = remaining[Math.min(index, remaining.length - 1)];
            if (nextToast) {
              setTimeout(() => closeButtonRefs.current.get(nextToast.id)?.focus(), 0);
            } else if (previousFocusRef.current?.focus) {
              const target = previousFocusRef.current;
              setTimeout(() => target.focus(), 0);
            }
          }
        }
        return remaining;
      });
    },
    [clearTimer],
  );

  const scheduleDismiss = useCallback(
    (entry: ToastEntry) => {
      clearTimer(entry.id);
      if (entry.durationMs <= 0 || pausedRef.current.has(entry.id)) return;
      const timer = setTimeout(() => {
        dismiss(entry.id);
      }, entry.durationMs);
      timersRef.current.set(entry.id, timer);
    },
    [clearTimer, dismiss],
  );

  const notify = useCallback(
    (input: ToastInput | string): string => {
      const normalized: ToastInput = typeof input === 'string' ? { message: input } : input;
      const message = normalized.message.trim();
      if (!message) return '';

      const tone: ToastTone = normalized.tone ?? 'info';
      const durationMs =
        normalized.durationMs !== undefined
          ? normalized.durationMs
          : tone === 'error'
            ? 0
            : 5500;
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        if (!containerRef.current?.contains(document.activeElement)) {
          previousFocusRef.current = document.activeElement;
        }
      }

      const entry: ToastEntry = { id, message, tone, durationMs };
      setToasts(prev => [...prev.slice(-3), entry]);

      if (tone === 'error') {
        setAssertiveAnnouncement('');
        setTimeout(() => setAssertiveAnnouncement(message), 10);
      } else {
        setPoliteAnnouncement('');
        setTimeout(() => setPoliteAnnouncement(message), 10);
      }
      announceToast(message, tone);
      scheduleDismiss(entry);
      return id;
    },
    [scheduleDismiss],
  );

  const clearAll = useCallback(() => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();
    pausedRef.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current as
      | (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void })
      | null;
    if (!el || typeof HTMLElement === 'undefined' || !Object.hasOwn(HTMLElement.prototype, 'popover')) {
      return;
    }
    if (!el.hasAttribute('popover')) {
      el.setAttribute('popover', 'manual');
    }
    try {
      if (toasts.length > 0) {
        el.showPopover?.();
      } else {
        el.hidePopover?.();
      }
    } catch {
      // Ignore if element is disconnected or already in requested state.
    }
  }, [toasts.length]);

  const handlePause = (entry: ToastEntry) => {
    pausedRef.current.add(entry.id);
    clearTimer(entry.id);
  };

  const handleResume = (entry: ToastEntry) => {
    pausedRef.current.delete(entry.id);
    scheduleDismiss(entry);
  };

  return (
    <ToastContext.Provider value={{ notify, dismiss, clearAll }}>
      {children}
      <p className="sr-only">Screen reader notifications</p>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {politeAnnouncement}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertiveAnnouncement}
      </div>
      <div
        ref={containerRef}
        className={`toast-container${toasts.length === 0 ? ' is-empty' : ''}`}
        role="region"
        aria-label="Notifications"
      >
        {toasts.map(entry => {
          const Icon =
            entry.tone === 'success'
              ? CheckCircle2
              : entry.tone === 'error'
                ? AlertCircle
                : Info;
          return (
            <div
              key={entry.id}
              className={`toast-item toast-${entry.tone}`}
              onMouseEnter={() => handlePause(entry)}
              onMouseLeave={() => handleResume(entry)}
              onFocus={() => handlePause(entry)}
              onBlur={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  handleResume(entry);
                }
              }}
            >
              <Icon size={17} className="toast-icon shrink-0" aria-hidden="true" />
              <span className="toast-message">{entry.message}</span>
              <button
                ref={node => {
                  if (node) closeButtonRefs.current.set(entry.id, node);
                  else closeButtonRefs.current.delete(entry.id);
                }}
                type="button"
                className="toast-close"
                aria-label="Dismiss notification"
                onClick={() => dismiss(entry.id)}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

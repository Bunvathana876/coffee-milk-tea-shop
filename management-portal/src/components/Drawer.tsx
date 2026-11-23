import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export function Drawer({
  isOpen,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  width = 'md',
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    // Focus the first form field inside the drawer body, falling back to the panel itself.
    const timeout = setTimeout(() => {
      if (panelRef.current) {
        const firstField = panelRef.current.querySelector<HTMLElement>(
          '.drawer-body input:not([type="hidden"]):not(:disabled), .drawer-body select:not(:disabled), .drawer-body textarea:not(:disabled)',
        );
        if (firstField) {
          firstField.focus();
        } else {
          panelRef.current.focus();
        }
      }
    }, 30);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClass = width === 'xl' ? 'drawer-xl' : width === 'lg' ? 'drawer-lg' : 'drawer-md';

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        className={`drawer-panel ${widthClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <header className="drawer-header">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 id={titleId}>{title}</h2>
            {description && (
              <p id={descId} className="drawer-subtitle">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="icon-button drawer-close"
            onClick={() => onCloseRef.current()}
            aria-label="Close panel"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="drawer-body">{children}</div>

        {footer && <footer className="drawer-footer">{footer}</footer>}
      </div>
    </div>
  );
}

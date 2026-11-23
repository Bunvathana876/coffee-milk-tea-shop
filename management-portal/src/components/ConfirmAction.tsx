import { useEffect, useId, useRef } from 'react';

export function ConfirmAction({
  title,
  detail,
  busy,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  tone = 'primary',
}: {
  title: string;
  detail: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
}) {
  const titleId = useId();
  const detailId = useId();
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation();
        onCancelRef.current();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy]);

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={event => {
        if (event.target === event.currentTarget && !busy) {
          onCancelRef.current();
        }
      }}
    >
      <div
        className="confirm-dialog panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detailId}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={detailId}>{detail}</p>
        <div className="form-actions">
          <button
            type="button"
            className="button-secondary"
            autoFocus
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'button-danger' : 'button-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

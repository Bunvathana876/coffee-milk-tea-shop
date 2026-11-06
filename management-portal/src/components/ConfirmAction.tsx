export function ConfirmAction({ title, detail, busy, onCancel, onConfirm }: {
  title: string; detail: string; busy: boolean; onCancel: () => void; onConfirm: () => void
}) {
  return <div className="dialog-backdrop" role="presentation">
    <div className="confirm-dialog panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-detail" onKeyDown={event => { if (event.key === 'Escape' && !busy) onCancel() }}>
      <h2 id="confirm-title">{title}</h2><p id="confirm-detail">{detail}</p>
      <div className="form-actions"><button className="button-secondary" autoFocus onClick={onCancel} disabled={busy}>Cancel</button><button className="button-primary" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : 'Confirm'}</button></div>
    </div>
  </div>
}

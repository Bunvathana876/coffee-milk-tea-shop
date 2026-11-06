import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div className="state-panel" role="status"><LoaderCircle className="animate-spin" size={24} aria-hidden="true" /><span>{label}</span></div>
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="state-panel"><Inbox size={26} aria-hidden="true" /><strong>{title}</strong><span>{detail}</span></div>
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-panel error-panel" role="alert"><AlertCircle size={26} aria-hidden="true" /><strong>Something went wrong</strong><span>{message}</span>{retry && <button className="button-secondary" type="button" onClick={retry}>Try again</button>}</div>
}

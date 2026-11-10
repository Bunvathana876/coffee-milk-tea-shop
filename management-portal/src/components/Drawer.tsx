import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: 'md' | 'lg' | 'xl'
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
  const panelRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previousActiveElement.current = document.activeElement as HTMLElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Focus the drawer or first focusable element
    const timeout = setTimeout(() => {
      if (panelRef.current) {
        const focusable = panelRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable) {
          focusable.focus()
        } else {
          panelRef.current.focus()
        }
      }
    }, 50)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeout)
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthClass = width === 'xl' ? 'drawer-xl' : width === 'lg' ? 'drawer-lg' : 'drawer-md'

  return (
    <div className="drawer-backdrop" role="presentation" onClick={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div
        ref={panelRef}
        className={`drawer-panel ${widthClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-describedby={description ? 'drawer-desc' : undefined}
        tabIndex={-1}
      >
        <header className="drawer-header">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 id="drawer-title">{title}</h2>
            {description && <p id="drawer-desc" className="drawer-subtitle">{description}</p>}
          </div>
          <button
            type="button"
            className="icon-button drawer-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="drawer-body">
          {children}
        </div>

        {footer && (
          <footer className="drawer-footer">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

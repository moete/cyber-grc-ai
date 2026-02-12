import type { ReactNode } from 'react'

export interface ModalProps {
  /** Modal content */
  children: ReactNode
  /** Called when backdrop is clicked or close is requested */
  onClose: () => void
  /** Optional title */
  title?: string
  /** Visual variant: default (neutral) or danger (red border/header) */
  variant?: 'default' | 'danger'
}

/**
 * Modal shell: overlay + centered panel.
 * Control visibility by rendering or not (e.g. {open && <Modal>...</Modal>}).
 */
export function Modal({ children, onClose, title, variant = 'default' }: ModalProps) {

  const titleClass = variant === 'danger' ? 'text-lg font-medium text-red-800' : 'text-lg font-medium text-slate-900'
  const panelBorderClass = variant === 'danger' ? 'border-red-200' : 'border-slate-200'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-lg border bg-white p-6 shadow-lg ${panelBorderClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="modal-title" className={titleClass}>
            {title}
          </h2>
        )}
        <div className={title ? 'mt-4' : ''}>{children}</div>
      </div>
    </div>
  )
}

import { useState } from 'react'

export interface DeleteOrgFormProps {
  organisationName: string
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
}

const CONFIRM_TEXT = 'DELETE'

/** Form content for "Delete organisation". Use inside generic Modal with variant="danger". */
export function DeleteOrgForm({
  organisationName,
  onClose,
  onConfirm,
  isSubmitting,
}: DeleteOrgFormProps) {
  const [confirmText, setConfirmText] = useState('')
  const canConfirm = confirmText.trim() === CONFIRM_TEXT

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canConfirm) onConfirm()
  }

  return (
    <>
      <p className="text-sm text-slate-600">
        This will permanently delete <strong>{organisationName}</strong> and all its users, suppliers and audit logs.
        You will be logged out.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Type <strong>{CONFIRM_TEXT}</strong> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_TEXT}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!canConfirm || isSubmitting}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Deleting…' : 'Delete organisation'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  )
}

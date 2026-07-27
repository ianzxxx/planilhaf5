import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  secondaryLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onSecondary?: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  secondaryLabel,
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onSecondary,
  onCancel
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-orange-50 p-2 text-cta">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 id="confirm-title" className="text-lg font-semibold text-text">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          {secondaryLabel && onSecondary ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={onSecondary}
              disabled={loading}
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="btn-cta"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Salvando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

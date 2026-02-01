import { AnimatePresence, motion } from 'framer-motion'

type ConfirmVariant = 'default' | 'danger'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  loading,
  variant = 'default',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description?: string
  confirmText: string
  cancelText: string
  loading?: boolean
  variant?: ConfirmVariant
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[300]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed inset-0 z-[310] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="p-5">
                <div className="text-lg font-extrabold text-gray-900">{title}</div>
                {description && <div className="mt-2 text-sm text-gray-600">{description}</div>}
              </div>
              <div className="px-5 pb-5 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className={`px-4 py-2 rounded-xl font-bold text-white disabled:opacity-50 ${
                    variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {loading ? '...' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}


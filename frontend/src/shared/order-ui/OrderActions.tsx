import { useMemo, useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { type MvpOrderStatus, canTransition, getStatusLabel, normalizeOrderStatus } from '../orderStatus'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { cx } from '../ui/tokens'

export function OrderActions({
  status,
  onSetStatus,
  allowedTargets,
  hideCancel = false,
  layout = 'inline',
  lang,
  disabled,
}: {
  status: string | null | undefined
  onSetStatus: (next: MvpOrderStatus) => Promise<void> | void
  allowedTargets?: MvpOrderStatus[]
  hideCancel?: boolean
  layout?: 'inline' | 'stack'
  lang?: 'ar' | 'en'
  disabled?: boolean
}) {
  const ctx = useLanguage()
  const resolvedLang = lang || (ctx?.language === 'en' ? 'en' : 'ar')
  const t = (ctx as any)?.t as ((k: string) => string) | undefined
  const [confirm, setConfirm] = useState<{ open: boolean; next: MvpOrderStatus | null }>({ open: false, next: null })
  const [loading, setLoading] = useState(false)

  const normalized = normalizeOrderStatus(status)

  const targets = useMemo(() => {
    if (!normalized) return [] as MvpOrderStatus[]
    const all = (allowedTargets || (['ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'] as MvpOrderStatus[]))
    return all.filter((t) => canTransition(normalized, t))
  }, [allowedTargets, normalized])

  const visibleTargets = hideCancel ? targets.filter((t) => t !== 'CANCELLED') : targets
  if (!normalized || visibleTargets.length === 0) return null

  const openConfirm = (next: MvpOrderStatus) => setConfirm({ open: true, next })

  const primary = visibleTargets.find((x) => x !== 'CANCELLED') || visibleTargets[0]
  const secondary = visibleTargets.filter((x) => x !== primary)

  const runConfirm = async () => {
    if (!confirm.next) return
    setLoading(true)
    try {
      await onSetStatus(confirm.next)
    } finally {
      setLoading(false)
      setConfirm({ open: false, next: null })
    }
  }

  return (
    <>
      {layout === 'stack' ? (
        <div className="space-y-2">
          {primary ? (
            <button
              type="button"
              onClick={() => openConfirm(primary)}
              disabled={disabled || loading}
              className={cx(
                'w-full px-4 py-3 text-sm font-extrabold rounded-2xl border transition-colors disabled:opacity-50',
                primary === 'CANCELLED'
                  ? 'bg-white border-red-200 text-red-700 hover:bg-red-50'
                  : 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800'
              )}
            >
              {getStatusLabel(primary, resolvedLang)}
            </button>
          ) : null}
          {secondary.length ? (
            <div className="flex flex-wrap gap-2">
              {secondary.map((t) => {
                const isDanger = t === 'CANCELLED'
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => openConfirm(t)}
                    disabled={disabled || loading}
                    className={cx(
                      'px-3 py-2 text-sm font-extrabold rounded-xl border transition-colors disabled:opacity-50',
                      isDanger ? 'bg-white border-red-200 text-red-700 hover:bg-red-50' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                    )}
                  >
                    {getStatusLabel(t, resolvedLang)}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleTargets.map((t) => {
            const isDanger = t === 'CANCELLED'
            return (
              <button
                key={t}
                type="button"
                onClick={() => openConfirm(t)}
                disabled={disabled || loading}
                className={cx(
                  'px-3 py-2 text-sm font-extrabold rounded-xl border transition-colors disabled:opacity-50',
                  isDanger ? 'bg-white border-red-200 text-red-700 hover:bg-red-50' : 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800'
                )}
              >
                {getStatusLabel(t, resolvedLang)}
              </button>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={t ? (t('confirm') || (resolvedLang === 'en' ? 'Confirm' : 'تأكيد')) : resolvedLang === 'en' ? 'Confirm' : 'تأكيد'}
        description={
          confirm.next
            ? resolvedLang === 'en'
              ? `Change status to: ${getStatusLabel(confirm.next, 'en')}`
              : `تغيير الحالة إلى: ${getStatusLabel(confirm.next, 'ar')}`
            : undefined
        }
        confirmText={t ? (t('confirm') || (resolvedLang === 'en' ? 'Confirm' : 'تأكيد')) : resolvedLang === 'en' ? 'Confirm' : 'تأكيد'}
        cancelText={t ? (t('cancel') || (resolvedLang === 'en' ? 'Cancel' : 'إلغاء')) : resolvedLang === 'en' ? 'Cancel' : 'إلغاء'}
        loading={loading}
        variant={confirm.next === 'CANCELLED' ? 'danger' : 'default'}
        onConfirm={runConfirm}
        onClose={() => (loading ? null : setConfirm({ open: false, next: null }))}
      />
    </>
  )
}


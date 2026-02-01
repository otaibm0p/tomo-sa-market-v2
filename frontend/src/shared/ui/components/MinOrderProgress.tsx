import { useLanguage } from '../../../context/LanguageContext'
import { cx, radius } from '../tokens'
import { getMinOrderStatus } from '../minOrder'

export function MinOrderProgress({
  subtotal,
  className,
}: {
  subtotal: number
  className?: string
}) {
  const { language, t } = useLanguage()
  const s = getMinOrderStatus(subtotal)

  return (
    <div className={cx('w-full', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className={cx('text-xs font-extrabold', s.ready ? 'text-emerald-700' : 'text-gray-700')}>
          {s.ready
            ? language === 'ar'
              ? 'جاهز لإتمام الطلب'
              : 'Ready to checkout'
            : language === 'ar'
              ? `باقي ${s.remaining.toFixed(2)} ${t('currency')} لإتمام الحد الأدنى`
              : `${s.remaining.toFixed(2)} ${t('currency')} left to reach minimum`}
        </div>
        <div className="text-[11px] font-bold text-gray-500" dir="ltr">
          {s.subtotal.toFixed(0)}/{s.min}
        </div>
      </div>
      <div className={cx('mt-2 h-2 w-full bg-gray-100 overflow-hidden', radius.chip)}>
        <div className={cx('h-full', s.ready ? 'bg-emerald-500' : 'bg-amber-400')} style={{ width: `${Math.round(s.ratio * 100)}%` }} />
      </div>
    </div>
  )
}


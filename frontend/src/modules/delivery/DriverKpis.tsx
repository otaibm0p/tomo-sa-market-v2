import { useLanguage } from '../../context/LanguageContext'
import { statusClasses, type StatusVariant } from '../../shared/admin/ui/tokens'
import { ClipboardList, Gift, AlertTriangle, Radio } from 'lucide-react'

export interface DriverKpisProps {
  activeTasksCount: number
  offersCount: number
  lateSlaCount: number
  isOnline: boolean
  className?: string
}

export function DriverKpis({
  activeTasksCount,
  offersCount,
  lateSlaCount,
  isOnline,
  className = '',
}: DriverKpisProps) {
  const { t } = useLanguage()

  const chips: { labelKey: string; value: number | string; variant: StatusVariant; icon: React.ReactNode }[] = [
    { labelKey: 'driver.kpi.activeTasks', value: activeTasksCount, variant: 'info', icon: <ClipboardList className="w-4 h-4" /> },
    { labelKey: 'driver.kpi.offers', value: offersCount, variant: offersCount > 0 ? 'warn' : 'info', icon: <Gift className="w-4 h-4" /> },
    { labelKey: 'driver.kpi.lateSla', value: lateSlaCount, variant: lateSlaCount > 0 ? 'danger' : 'success', icon: <AlertTriangle className="w-4 h-4" /> },
    { labelKey: 'driver.kpi.status', value: t(isOnline ? 'driver.shift.online' : 'driver.shift.offline'), variant: isOnline ? 'success' : 'danger', icon: <Radio className="w-4 h-4" /> },
  ]

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {chips.map(({ labelKey, value, variant, icon }) => (
        <div
          key={labelKey}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm ${statusClasses(variant)}`}
        >
          {icon}
          <span className="opacity-90">{t(labelKey)}</span>
          <span className="tabular-nums" dir="ltr">
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

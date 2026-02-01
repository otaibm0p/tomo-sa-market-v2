import { useState, useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import api from '../../utils/api'
import { X } from 'lucide-react'
import type { RiderRow } from './RiderDetailsDrawer'

interface UnassignedOrder {
  id: number
  status: string
  total_amount: number
  delivery_address: string | null
  created_at?: string
}

interface AssignOrderModalProps {
  open: boolean
  onClose: () => void
  rider: RiderRow | null
  onAssigned?: () => void
}

export function AssignOrderModal({ open, onClose, rider, onAssigned }: AssignOrderModalProps) {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'
  const [orders, setOrders] = useState<UnassignedOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setOrders([])
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get('/api/admin/orders')
        const all = res.data?.orders || []
        const unassigned = all.filter(
          (o: { driver_id: number | null; status: string }) =>
            !o.driver_id &&
            !['DELIVERED', 'CANCELLED', 'delivered', 'cancelled'].includes(String(o.status))
        )
        setOrders(unassigned.slice(0, 50))
      } catch (e: any) {
        setError(e?.message || (isAr ? 'فشل تحميل الطلبات' : 'Failed to load orders'))
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, isAr])

  const handleAssign = async (orderId: number) => {
    if (!rider) return
    setAssigning(orderId)
    try {
      await api.post(`/api/admin/orders/${orderId}/assign`, { driver_id: rider.id })
      onAssigned?.()
      onClose()
    } catch (e: any) {
      console.error('Assign error:', e)
    } finally {
      setAssigning(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" role="dialog" aria-label={t('riders.assign.title')}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{t('riders.assign.title')}</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900 p-1" aria-label={t('close')}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-gray-500 text-center py-6">{t('riders.assign.noUnassigned')}</p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                  <div>
                    <span className="font-bold text-gray-900">#{o.id}</span>
                    <span className="text-gray-500 mx-2">—</span>
                    <span className="text-sm text-gray-600" dir="ltr">{o.total_amount} SAR</span>
                    {o.delivery_address && <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{o.delivery_address}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={assigning === o.id}
                    onClick={() => handleAssign(o.id)}
                    className="px-3 py-1.5 rounded-lg font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {assigning === o.id ? t('riders.assign.assigning') : t('riders.assign.assign')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

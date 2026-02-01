import { useRef, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { authAPI } from '../../utils/api'
import api from '../../utils/api'
import { normalizeOrderStatus } from '../../shared/orderStatus'
import { showToast } from '../../shared/toast'
import { getSocket } from '../../shared/socketClient'
import { debounce } from '../../shared/ui/tokens'
import { OrderCard } from '../../shared/order-ui/OrderCard'
import { OrderActions } from '../../shared/order-ui/OrderActions'
import { SlaTimerBadge } from '../../shared/order-ui/SlaTimerBadge'
import { getOrderSlaStartAt, copyToClipboard, computeSlaCycle, slaCycleVariant } from '../../shared/order-ui/orderUiUtils'
import { usePublicSettings } from '../../hooks/usePublicSettings'
import type { OrderDetails } from '../../shared/types/order'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, LoadingState } from '../../shared/order-ui/States'
import { DriverDetailsDrawer } from './DriverDetailsDrawer'
import { DriverKpis } from './DriverKpis'
import { DriverMapPanel } from './DriverMapPanel'
import { statusClasses } from '../../shared/admin/ui/tokens'
import { MapPin, Copy, Phone, FileText, LayoutGrid, Map as MapIcon } from 'lucide-react'

type DriverOffer = {
  id: number
  orderId: number
  expiresAt: string | null
  createdAt: string | null
  order: {
    id: number
    status: string
    total_amount: any
    delivery_address?: string | null
    delivery_latitude?: any
    delivery_longitude?: any
  }
}

export default function DriverDashboard() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const { settings: publicSettings } = usePublicSettings()
  const slaTimerEnabled = publicSettings?.features?.sla_timer_enabled !== false
  const slaLimitMinutes = publicSettings?.features?.sla_timer_limit_minutes ?? 30
  const driverId = authAPI.getCurrentUser()?.id || null
  const [orders, setOrders] = useState<OrderDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)
  const [dispatchMode, setDispatchMode] = useState<'AUTO_ASSIGN' | 'OFFER_ACCEPT'>('AUTO_ASSIGN')
  const [tab, setTab] = useState<'offers' | 'active' | 'history'>('active')
  const [offers, setOffers] = useState<DriverOffer[]>([])
  const [offersAvailable, setOffersAvailable] = useState(true)
  const [nowTick, setNowTick] = useState(Date.now())
  const [socketConnected, setSocketConnected] = useState<boolean>(() => {
    try {
      return getSocket()?.connected === true
    } catch {
      return true
    }
  })
  const dispatchModeRef = useRef<'AUTO_ASSIGN' | 'OFFER_ACCEPT'>('AUTO_ASSIGN')
  const [confirmOffer, setConfirmOffer] = useState<{ open: boolean; offerId: number | null; action: 'accept' | 'reject' | null }>({
    open: false,
    offerId: null,
    action: null,
  })
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [detailsOrder, setDetailsOrder] = useState<OrderDetails | null>(null)
  const [mainViewTab, setMainViewTab] = useState<'tasks' | 'map'>('tasks')
  const [shiftOnline, setShiftOnline] = useState(true)
  const [lastLocationUpdate, setLastLocationUpdate] = useState<string | null>(null)

  useEffect(() => {
    if (location.pathname.endsWith('/map')) setMainViewTab('map')
    else setMainViewTab('tasks')
  }, [location.pathname])

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/driver/login')
      return
    }

    const socket = getSocket()
    setSocketConnected(socket?.connected === true)

    if (driverId) {
      socket.emit('join-rider', driverId)
      socket.emit('join-driver', driverId) // backward
    }

    const debouncedRefresh = debounce(() => loadOrders(), 700)

    const onOrderUpdated = (p: any) => {
      const did = p?.driverId ?? p?.driver_id
      if (did == null) return
      if (driverId && String(did) === String(driverId)) {
        debouncedRefresh()
      }
    }

    const onOfferCreated = () => {
      if (dispatchModeRef.current === 'OFFER_ACCEPT') loadOffers()
    }

    const onConnect = () => {
      setSocketConnected(true)
      // quick refresh on reconnect
      loadOrders()
      if (dispatchModeRef.current === 'OFFER_ACCEPT') loadOffers()
    }
    const onDisconnect = () => setSocketConnected(false)

    socket.on('order.updated', onOrderUpdated)
    socket.on('offer.created', onOfferCreated as any)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    loadOrders()

    const tick = setInterval(() => setNowTick(Date.now()), 1000)
    return () => {
      clearInterval(tick)
      socket.off('order.updated', onOrderUpdated)
      socket.off('offer.created', onOfferCreated as any)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      debouncedRefresh.cancel()
    }
  }, [navigate, driverId])

  useEffect(() => {
    ;(async () => {
      try {
        const s = await api.get('/api/settings')
        const dm = (s?.data?.dispatchMode || 'AUTO_ASSIGN') as any
        const nextMode = dm === 'OFFER_ACCEPT' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN'
        dispatchModeRef.current = nextMode
        setDispatchMode(nextMode)
        setTab(nextMode === 'OFFER_ACCEPT' ? 'offers' : 'active')
      } catch {
        dispatchModeRef.current = 'AUTO_ASSIGN'
        setDispatchMode('AUTO_ASSIGN')
      }
    })()
  }, [])

  // Polling fallback ONLY when socket disconnected
  useEffect(() => {
    if (socketConnected) return
    const interval = setInterval(() => {
      loadOrders()
      if (dispatchModeRef.current === 'OFFER_ACCEPT') loadOffers()
    }, 10000)
    return () => clearInterval(interval)
  }, [socketConnected])

  const loadOrders = async () => {
    try {
      const res = await api.get('/api/drivers/tasks')
      setOrders(res.data.orders || [])
    } catch (err: any) {
      if (err.response?.status === 403) {
        // Not a driver yet, redirect to registration
        navigate('/driver/register')
      }
      console.error('Error loading orders:', err)
      showToast(err.userMessage || (language === 'en' ? 'Failed to load tasks' : 'فشل تحميل المهام'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadOffers = async () => {
    try {
      setOffersAvailable(true)
      const res = await api.get('/api/driver/offers')
      setOffers(Array.isArray(res.data?.offers) ? res.data.offers : [])
    } catch (err) {
      console.error('Error loading offers:', err)
      setOffers([])
      setOffersAvailable(false)
    }
  }

  useEffect(() => {
    if (dispatchMode === 'OFFER_ACCEPT') loadOffers()
    else setOffers([])
  }, [dispatchMode])

  const acceptOffer = async (offerId: number) => {
    try {
      await api.post(`/api/driver/offers/${offerId}/accept`)
      await Promise.allSettled([loadOffers(), loadOrders()])
      setTab('active')
      showToast(t('driver.offers.accepted') || (language === 'ar' ? 'تم قبول العرض' : 'Offer accepted'), 'success')
    } catch (err: any) {
      showToast(err.response?.data?.message || (language === 'en' ? 'Failed to accept offer' : 'فشل قبول العرض'), 'error')
    }
  }

  const rejectOffer = async (offerId: number) => {
    try {
      await api.post(`/api/driver/offers/${offerId}/reject`)
      await loadOffers()
      showToast(t('driver.offers.rejected') || (language === 'ar' ? 'تم رفض العرض' : 'Offer rejected'), 'success')
    } catch (err: any) {
      showToast(err.response?.data?.message || (language === 'en' ? 'Failed to reject offer' : 'فشل رفض العرض'), 'error')
    }
  }

  const updateOrderStatus = async (orderId: number, status: string) => {
    setUpdating(orderId)
    try {
      await api.put(`/api/drivers/orders/${orderId}/status`, { status })
      await loadOrders()
      showToast(language === 'en' ? 'Order updated' : 'تم تحديث الطلب', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.message || err.userMessage || (language === 'en' ? 'Failed to update order' : 'فشل تحديث الطلب'), 'error')
    } finally {
      setUpdating(null)
    }
  }

  const formatDistance = (km: number | null) => {
    if (!km) return language === 'en' ? 'N/A' : 'غير متاح'
    return `${km.toFixed(1)} ${language === 'en' ? 'km' : 'كم'}`
  }

  if (loading) return <LoadingState title={t('loading') || (language === 'ar' ? 'جاري التحميل...' : 'Loading...')} />

  // MVP: Driver sees only assigned orders + history delivered
  const activeOrders = orders.filter((o) => {
    const s = normalizeOrderStatus(o.status)
    return s === 'ASSIGNED' || s === 'PICKED_UP'
  })
  const historyOrders = orders.filter((o) => normalizeOrderStatus(o.status) === 'DELIVERED')
  const activeOrder = activeOrders[0] || null

  const cycleSec = slaLimitMinutes * 60
  const lateSlaCount = slaTimerEnabled
    ? activeOrders.filter((o) => {
        const start = getOrderSlaStartAt(o)
        if (!start) return false
        const { cycleElapsedSec, cycleNumber } = computeSlaCycle(start, nowTick, cycleSec)
        return slaCycleVariant(cycleElapsedSec, cycleNumber, cycleSec) === 'danger'
      }).length
    : 0

  const mapStops = activeOrders.map((o) => ({
    orderId: o.id,
    pickup: (o as any).store_latitude != null && (o as any).store_longitude != null
      ? { lat: (o as any).store_latitude, lng: (o as any).store_longitude, label: (o as any).store_name }
      : null,
    dropoff: o.delivery_latitude != null && o.delivery_longitude != null
      ? { lat: o.delivery_latitude, lng: o.delivery_longitude, label: o.delivery_address || undefined }
      : null,
  }))

  const mapUrlFor = (order: OrderDetails) => {
    if (order.delivery_latitude && order.delivery_longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${order.delivery_latitude},${order.delivery_longitude}`
    }
    if (order.delivery_address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`
    }
    return null
  }

  const handleCopyAddress = async (order: OrderDetails) => {
    const addr = order.delivery_address || ''
    if (!addr) return
    const ok = await copyToClipboard(addr)
    showToast(ok ? (language === 'ar' ? 'تم نسخ العنوان' : 'Address copied') : (language === 'ar' ? 'فشل النسخ' : 'Copy failed'), ok ? 'success' : 'error')
  }

  return (
    <>
      {/* KPI chips */}
      <div className="mb-4">
        <DriverKpis
          activeTasksCount={activeOrders.length}
          offersCount={offers.length}
          lateSlaCount={lateSlaCount}
          isOnline={shiftOnline && socketConnected}
        />
      </div>

      {/* Connection + last location + shift toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            socketConnected ? statusClasses('success') : statusClasses('warn')
          }`}
          title={t('driver.realtime.connection')}
        >
          <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {socketConnected ? t('driver.realtime.connected') : t('driver.realtime.unavailable')}
        </span>
        {lastLocationUpdate && (
          <span className="text-xs text-gray-500">{t('driver.realtime.lastLocation')}: {lastLocationUpdate}</span>
        )}
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setShiftOnline(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${shiftOnline ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {t('driver.shift.online')}
          </button>
          <button
            type="button"
            onClick={() => setShiftOnline(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!shiftOnline ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {t('driver.shift.offline')}
          </button>
        </div>
      </div>
      {!socketConnected && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-amber-900">{t('driver.offline')}</div>
              <div className="mt-1 text-xs font-bold text-amber-800/80">{t('driver.offline.subtitle') || ''}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                loadOrders()
                if (dispatchMode === 'OFFER_ACCEPT') loadOffers()
              }}
              className="px-3 py-2 rounded-xl font-extrabold bg-white border border-amber-200 text-amber-900 hover:bg-amber-100"
            >
              {t('driver.offline.retry')}
            </button>
          </div>
        </div>
      )}
      {dispatchMode === 'AUTO_ASSIGN' && (
        <p className="mb-3 text-xs text-gray-500">
          {language === 'ar' ? 'العروض غير مستخدمة في وضع التعيين التلقائي.' : 'Offers are not used in auto-assign mode.'}
        </p>
      )}

      {/* Main view: Tasks | Map */}
      <div className="mb-4">
        <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 gap-1">
          <button
            type="button"
            onClick={() => { setMainViewTab('tasks'); navigate('/driver') }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold transition ${mainViewTab === 'tasks' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            {t('driver.tabs.myTasks')}
          </button>
          <button
            type="button"
            onClick={() => { setMainViewTab('map'); navigate('/driver/map') }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-extrabold transition ${mainViewTab === 'map' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <MapIcon className="w-4 h-4" />
            {t('driver.tabs.map')}
          </button>
        </div>
      </div>

      {mainViewTab === 'map' && (
        <div className="mb-6">
          <DriverMapPanel stops={mapStops} height={380} />
        </div>
      )}

      {mainViewTab === 'tasks' && (
        <>
      {/* Tabs */}
      <div className="mb-5">
        <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 gap-1">
          {dispatchMode === 'OFFER_ACCEPT' ? (
            <button
              type="button"
              onClick={() => setTab('offers')}
              className={`px-4 py-2 rounded-2xl text-sm font-extrabold transition ${
                tab === 'offers' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('driver.tabs.offers') || (language === 'ar' ? 'العروض' : 'Offers')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`px-4 py-2 rounded-2xl text-sm font-extrabold transition ${
              tab === 'active' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('driver.tabs.active') || (language === 'ar' ? 'النشطة' : 'Active')}
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-2xl text-sm font-extrabold transition ${
              tab === 'history' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('driver.tabs.history') || (language === 'ar' ? 'السجل' : 'History')}
          </button>
        </div>
      </div>

      {/* Offers */}
      {dispatchMode === 'OFFER_ACCEPT' && tab === 'offers' ? (
        <section className="space-y-3">
          {!offersAvailable ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="text-sm font-extrabold text-gray-900">
                {t('driver.offers.notAvailableTitle') || (language === 'ar' ? 'العروض غير متاحة حالياً' : 'Offers not available')}
              </div>
              <div className="mt-1 text-xs font-bold text-gray-600">
                {t('driver.offers.notAvailableSubtitle') ||
                  (language === 'ar' ? 'سيستمر وضع التعيين المباشر بالعمل بشكل طبيعي.' : 'Auto-assign flow will continue working normally.')}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold text-gray-900">{t('driver.offers.title') || (language === 'ar' ? 'العروض المتاحة' : 'Available offers')}</div>
                <button
                  type="button"
                  onClick={() => loadOffers()}
                  className="px-3 py-2 rounded-xl font-extrabold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  {t('driver.actions.refresh') || (language === 'ar' ? 'تحديث' : 'Refresh')}
                </button>
              </div>

              {offers.length === 0 ? (
                <EmptyState
                  title={t('driver.offers.empty') || (language === 'ar' ? 'لا توجد عروض حالياً' : 'No offers right now')}
                  subtitle={language === 'ar' ? 'راقب العروض هنا عند توفرها.' : 'You will see offers here when available.'}
                  icon="🎯"
                />
              ) : (
                offers.map((of) => {
                  const exp = of.expiresAt ? new Date(of.expiresAt).getTime() : null
                  const remainingMs = exp != null ? Math.max(0, exp - nowTick) : null
                  const remainingSec = remainingMs != null ? Math.floor(remainingMs / 1000) : null
                  const mins = remainingSec != null ? Math.floor(remainingSec / 60) : null
                  const secs = remainingSec != null ? remainingSec % 60 : null
                  const expired = remainingSec != null ? remainingSec <= 0 : false
                  const maps = of.order ? mapUrlFor(of.order as any) : null

                  return (
                    <OrderCard
                      key={of.id}
                      orderId={of.orderId}
                      status={of.order?.status}
                      total={of.order?.total_amount}
                      currency={language === 'en' ? 'SAR' : 'ريال'}
                      createdAt={of.createdAt}
                      subtitle={of.order?.delivery_address ? of.order.delivery_address : null}
                      meta={
                        expired
                          ? (t('driver.offers.expired') || (language === 'ar' ? 'منتهي' : 'Expired'))
                          : `${t('driver.offers.expiresIn') || (language === 'ar' ? 'ينتهي خلال' : 'Expires in')} ${
                              mins != null && secs != null ? `${mins}:${String(secs).padStart(2, '0')}` : '—'
                            }`
                      }
                      actions={
                        <div className="space-y-2">
                          <button
                            type="button"
                            disabled={expired}
                            onClick={() => setConfirmOffer({ open: true, offerId: of.id, action: 'accept' })}
                            className="w-full px-4 py-3 rounded-2xl font-extrabold bg-gray-900 text-white disabled:opacity-50 hover:bg-gray-800"
                          >
                            {t('driver.offers.accept') || (language === 'ar' ? 'قبول' : 'Accept')}
                          </button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={expired}
                              onClick={() => setConfirmOffer({ open: true, offerId: of.id, action: 'reject' })}
                              className="flex-1 px-3 py-2 rounded-xl font-extrabold bg-white border border-gray-200 text-gray-800 disabled:opacity-50 hover:bg-gray-50"
                            >
                              {t('driver.offers.reject') || (language === 'ar' ? 'رفض' : 'Reject')}
                            </button>
                            {maps ? (
                              <a
                                href={maps}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 px-3 py-2 rounded-xl font-extrabold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 text-center"
                              >
                                {t('driver.actions.openMaps') || (language === 'ar' ? 'فتح على الخريطة' : 'Open in Maps')}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      }
                    />
                  )
                })
              )}
            </>
          )}
        </section>
      ) : null}

      {/* Active */}
      {tab === 'active' ? (
        <section className="space-y-3">
          {activeOrders.length === 0 ? (
            <EmptyState title={language === 'ar' ? 'لا توجد مهام نشطة' : 'No active tasks'} subtitle={language === 'ar' ? 'ستظهر الطلبات المخصصة لك هنا.' : 'Assigned orders will appear here.'} />
          ) : (
            activeOrders.map((o) => {
              const maps = mapUrlFor(o)
              const storeLabel = (o as any).store_name || (o.store_id ? `${language === 'ar' ? 'متجر' : 'Store'} #${o.store_id}` : null)
              return (
                <OrderCard
                  key={o.id}
                  orderId={o.id}
                  status={o.status}
                  total={o.total_amount}
                  currency={language === 'en' ? 'SAR' : 'ريال'}
                  createdAt={o.updated_at || o.created_at}
                  subtitle={o.delivery_address ? o.delivery_address : null}
                  meta={
                    <>
                      {storeLabel && <span className="block">{storeLabel}</span>}
                      {o.distance_km != null && `${language === 'en' ? 'Distance' : 'المسافة'}: ${formatDistance(o.distance_km)}`}
                    </>
                  }
                  slaBlock={
                    slaTimerEnabled && !['DELIVERED', 'CANCELLED'].includes(String(o.status).toUpperCase())
                      ? (
                          <SlaTimerBadge
                            slaStartAt={getOrderSlaStartAt(o)}
                            hideWhenNoStart
                            lang={language === 'ar' ? 'ar' : 'en'}
                            limitMinutes={slaLimitMinutes}
                          />
                        )
                      : undefined
                  }
                  onClick={() => setDetailsOrder(o)}
                  actions={
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDetailsOrder(o) }}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-bold bg-gray-900 text-white text-sm hover:bg-gray-800"
                        >
                          <FileText className="w-4 h-4" />
                          {language === 'ar' ? 'تفاصيل' : 'View details'}
                        </button>
                        {maps && (
                          <a
                            href={maps}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-bold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MapPin className="w-4 h-4" />
                            {t('driver.actions.openMaps') || (language === 'ar' ? 'الخريطة' : 'Maps')}
                          </a>
                        )}
                        {o.delivery_address && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleCopyAddress(o) }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-bold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 text-sm"
                          >
                            <Copy className="w-4 h-4" />
                            {language === 'ar' ? 'نسخ العنوان' : 'Copy address'}
                          </button>
                        )}
                        {(o as any).customer_phone && (
                          <a
                            href={`tel:${(o as any).customer_phone}`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-bold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-4 h-4" />
                            {language === 'ar' ? 'اتصال' : 'Call'}
                          </a>
                        )}
                      </div>
                      <OrderActions
                        status={o.status}
                        disabled={updating === o.id}
                        allowedTargets={['PICKED_UP', 'DELIVERED']}
                        hideCancel
                        layout="stack"
                        onSetStatus={(next) => updateOrderStatus(o.id, next)}
                      />
                    </div>
                  }
                />
              )
            })
          )}
        </section>
      ) : null}

      {/* History */}
      {tab === 'history' ? (
        <section className="space-y-3">
          {historyOrders.length === 0 ? (
            <EmptyState title={language === 'ar' ? 'لا يوجد سجل' : 'No history'} subtitle={language === 'ar' ? 'ستظهر الطلبات المسلّمة هنا.' : 'Delivered orders will appear here.'} />
          ) : (
            historyOrders.slice(0, 30).map((o) => (
              <OrderCard
                key={o.id}
                orderId={o.id}
                status={o.status}
                total={o.total_amount}
                currency={language === 'en' ? 'SAR' : 'ريال'}
                createdAt={o.created_at}
                subtitle={o.delivery_address ? o.delivery_address : null}
              />
            ))
          )}
        </section>
      ) : null}

      </>
      )}

      <DriverDetailsDrawer
        open={!!detailsOrder}
        order={detailsOrder}
        onClose={() => setDetailsOrder(null)}
      />
      <ConfirmDialog
        open={confirmOffer.open}
        title={
          confirmOffer.action === 'accept'
            ? (t('driver.offers.acceptConfirm') || (language === 'ar' ? 'هل تريد قبول هذا العرض؟' : 'Accept this offer?'))
            : (t('driver.offers.rejectConfirm') || (language === 'ar' ? 'هل تريد رفض هذا العرض؟' : 'Reject this offer?'))
        }
        confirmText={t('confirm') || (language === 'ar' ? 'تأكيد' : 'Confirm')}
        cancelText={t('cancel') || (language === 'ar' ? 'إلغاء' : 'Cancel')}
        loading={confirmLoading}
        variant={confirmOffer.action === 'reject' ? 'danger' : 'default'}
        onClose={() => (confirmLoading ? null : setConfirmOffer({ open: false, offerId: null, action: null }))}
        onConfirm={async () => {
          if (!confirmOffer.offerId || !confirmOffer.action) return
          setConfirmLoading(true)
          try {
            if (confirmOffer.action === 'accept') await acceptOffer(confirmOffer.offerId)
            else await rejectOffer(confirmOffer.offerId)
          } finally {
            setConfirmLoading(false)
            setConfirmOffer({ open: false, offerId: null, action: null })
          }
        }}
      />
    </>
  )
}


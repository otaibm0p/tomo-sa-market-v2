import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { OrderListItem } from '../types/order'
import { fetchDriverTasks, updateDriverOrderStatus } from '../../api/orders'
import { getAuthUser } from '../../api/authStorage'
import { getSocket, type OrderUpdatedPayload } from '../../socket/socketClient'
import { debounce } from '../utils/debounce'
import { normalizeOrderStatus } from '../orderStatus'
import { getLiveTrackingEnabled } from '../../location/liveTrackingSettings'
import { startLocationTracking, stopLocationTracking } from '../../location/locationTracker'

type OrdersContextValue = {
  orders: OrderListItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setStatus: (orderId: number, nextStatus: string) => Promise<void>
  driverId: number | null
  socketConnected: boolean
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [driverId, setDriverId] = useState<number | null>(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [liveTrackingEnabled, setLiveTrackingEnabledState] = useState<boolean>(true)
  const socketCleanupRef = useRef<null | (() => void)>(null)

  const refresh = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchDriverTasks()
      setOrders(data?.orders || [])
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }

  const setStatus = async (orderId: number, nextStatus: string) => {
    await updateDriverOrderStatus(orderId, nextStatus)
    await refresh()
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const user = await getAuthUser()
      if (cancelled) return
      setDriverId(user?.id || null)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Always load initially (even before driverId is known)
    refresh().catch(() => {})
    const interval = setInterval(() => refresh().catch(() => {}), 10000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const enabled = await getLiveTrackingEnabled()
      if (!cancelled) setLiveTrackingEnabledState(enabled)
    })()
    const interval = setInterval(() => {
      getLiveTrackingEnabled()
        .then((enabled) => {
          if (!cancelled) setLiveTrackingEnabledState(enabled)
        })
        .catch(() => {})
    }, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    // Socket realtime: join + order.updated -> refresh (debounced 700ms)
    if (!driverId) return

    const socket = getSocket()
    setSocketConnected(!!socket.connected)

    const onConnect = () => setSocketConnected(true)
    const onDisconnect = () => setSocketConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    socket.emit('join-rider', driverId)
    socket.emit('join-driver', driverId) // backward compat

    const debouncedRefresh = debounce(() => refresh().catch(() => {}), 700)
    const onOrderUpdated = (p: OrderUpdatedPayload) => {
      const did = p?.driverId ?? p?.driver_id
      if (did == null) return
      if (String(did) !== String(driverId)) return
      debouncedRefresh()
    }

    socket.on('order.updated', onOrderUpdated)

    socketCleanupRef.current = () => {
      socket.off('order.updated', onOrderUpdated)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      debouncedRefresh.cancel()
    }

    return () => {
      socketCleanupRef.current?.()
      socketCleanupRef.current = null
    }
  }, [driverId])

  useEffect(() => {
    // Live tracking: only when enabled + has active orders
    if (!driverId) {
      stopLocationTracking().catch(() => {})
      return
    }
    if (!liveTrackingEnabled) {
      stopLocationTracking().catch(() => {})
      return
    }

    const activeOrders = orders.filter((o) => {
      const s = normalizeOrderStatus(o.status)
      return s === 'ASSIGNED' || s === 'PICKED_UP'
    })

    if (activeOrders.length === 0) {
      stopLocationTracking().catch(() => {})
      return
    }

    // Start tracker (foreground). Emission throttled internally.
    startLocationTracking({ riderId: driverId, socketConnectedOnly: true }).catch(() => {})
  }, [driverId, liveTrackingEnabled, orders])

  const value = useMemo<OrdersContextValue>(() => ({ orders, loading, error, refresh, setStatus, driverId, socketConnected }), [
    orders,
    loading,
    error,
    driverId,
    socketConnected,
  ])

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider')
  return ctx
}

export function useActiveOrders() {
  const { orders } = useOrders()
  return useMemo(() => {
    return orders.filter((o) => {
      const s = normalizeOrderStatus(o.status)
      return s === 'ASSIGNED' || s === 'PICKED_UP'
    })
  }, [orders])
}

export function useHistoryOrders() {
  const { orders } = useOrders()
  return useMemo(() => orders.filter((o) => normalizeOrderStatus(o.status) === 'DELIVERED'), [orders])
}


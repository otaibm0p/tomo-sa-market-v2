import { useState, useEffect } from 'react'
import { orderAPI } from '../../utils/api'

interface Notification {
  id: number
  type: 'new_order' | 'low_stock' | 'system'
  message: string
  timestamp: Date
  read: boolean
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const orders = await orderAPI.getAll()
      const ordersData = orders.orders || orders || []
      const pendingOrders = ordersData.filter((o: any) => o.status === 'pending')
      
      const newNotifications: Notification[] = pendingOrders.slice(0, 5).map((order: any, index: number) => ({
        id: order.id,
        type: 'new_order' as const,
        message: `طلب جديد #${order.id} بقيمة ${Number(order.total_amount || 0).toFixed(2)} ريال`,
        timestamp: new Date(order.created_at || order.createdAt),
        read: false,
      }))

      setNotifications(newNotifications)
      setUnreadCount(newNotifications.filter(n => !n.read).length)
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(notifications.filter(n => !n.read && n.id !== id).length)
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-all"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-12 w-80 bg-white rounded-xl shadow-2xl z-50 border border-gray-200 max-h-96 overflow-y-auto" dir="rtl">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-lg" style={{ color: '#1a237e' }}>
                الإشعارات
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-[#2e7d32] hover:underline"
                >
                  تعليم الكل كمقروء
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  لا توجد إشعارات
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        !notification.read ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.timestamp.toLocaleString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


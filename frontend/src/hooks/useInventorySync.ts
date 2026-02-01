import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

export function useInventorySync(
  storeId: number | null,
  onUpdate: (data: { product_id: number; store_id: number; quantity: number }) => void
) {
  useEffect(() => {
    if (!storeId) return

    // Align with frontend/src/utils/api.ts: VITE_API_URL or same-origin; no localhost in production
    const getApiBase = () => {
      if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
      if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
      return '';
    };
    const base = getApiBase();
    if (!base) return;
    const socket: Socket = io(base, {
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('✅ Connected to inventory sync')
      socket.emit('join-store', storeId)
    })

    socket.on('inventory-updated', (data) => {
      if (data.store_id === storeId) {
        onUpdate(data)
      }
    })

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from inventory sync')
    })

    return () => {
      socket.disconnect()
    }
  }, [storeId, onUpdate])
}


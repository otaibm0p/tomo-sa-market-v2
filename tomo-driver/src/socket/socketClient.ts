import { io, type Socket } from 'socket.io-client'
import { SOCKET_URL } from '../api/config'

let socketSingleton: Socket | null = null

export type OrderUpdatedPayload = {
  orderId: number
  status?: string
  storeId?: number | null
  store_id?: number | null
  driverId?: number | null
  driver_id?: number | null
  updatedAt?: string
}

export function getSocket(): Socket {
  if (!socketSingleton) {
    socketSingleton = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: true,
    })
  }
  return socketSingleton
}


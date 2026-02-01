import { io, type Socket } from 'socket.io-client'

let socketSingleton: Socket | null = null

export function getSocket(): Socket {
  // Singleton: never create more than one socket instance.
  // No manual connect() here to avoid reconnect spam; autoConnect handles it.
  if (!socketSingleton) {
    socketSingleton = io({
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: true,
    })
  }
  return socketSingleton
}


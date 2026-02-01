import { apiFetch } from './client'
import type { OrderDetails, OrderListItem } from '../shared/types/order'

export async function fetchDriverTasks() {
  return await apiFetch<{ orders: OrderListItem[] }>('/drivers/tasks')
}

export async function updateDriverOrderStatus(orderId: number, status: string) {
  return await apiFetch<any>(`/drivers/orders/${orderId}/status`, {
    method: 'PUT',
    body: { status },
  })
}

export async function fetchOrderDetails(orderId: number) {
  return await apiFetch<{ order: OrderDetails }>(`/orders/${orderId}`)
}


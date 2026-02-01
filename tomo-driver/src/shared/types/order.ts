export type OrderStatus = string

export interface OrderListItem {
  id: number
  status: OrderStatus
  created_at: string
  total_amount: number

  // Optional common fields across dashboards
  delivery_address?: string | null
  customer_name?: string | null
  customer_phone?: string | null

  store_id?: number | null
  driver_id?: number | null
  driver_name?: string | null

  delivery_fee?: number | null
  distance_km?: number | null
  delivery_latitude?: number | null
  delivery_longitude?: number | null
}

export interface OrderItemLite {
  product_id?: number
  product_name?: string
  product_name_ar?: string
  product_name_en?: string
  quantity?: number
  qty?: number
  unit?: string
  unit_price?: string | number
  line_total?: string | number | null
  product_image?: string
}

export interface OrderDetails extends OrderListItem {
  public_code?: string
  user_id?: number
  customer_email?: string | null
  delivery_notes?: string | null
  subtotal?: number
  payment_method?: string | null
  payment_status?: string | null
  items?: OrderItemLite[]
}


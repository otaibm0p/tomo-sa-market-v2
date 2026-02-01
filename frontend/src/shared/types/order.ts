export type OrderStatus = string

/** Order-like shape for SLA start derivation (no pricing/order logic changes). */
export interface OrderSlaStartSource {
  created_at: string
  paid_at?: string | null
  payment_received_at?: string | null
  sla_start_at?: string | null
  /** When order first entered CONFIRMED/ACCEPTED (if backend provides status transition timestamps). */
  accepted_at?: string | null
  status?: string
}

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

  // SLA timer (derived client-side): prefer paid_at → accepted_at → created_at
  paid_at?: string | null
  payment_received_at?: string | null
  sla_start_at?: string | null
  accepted_at?: string | null
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


export type Page = 'dashboard' | 'chat' | 'orders' | 'kb' | 'escalations' | 'customers'

export interface Order {
  id: string
  customer_id: string
  customer_name?: string
  customer_tier?: string
  customer_email?: string
  status: string
  placed_at: string
  tracking?: string
  carrier?: string
  estimated_delivery?: string
  delivered_at?: string
  cancelled_at?: string
  return_reason?: string
  return_requested_at?: string
  refund_status?: string
  refund_eta?: string
  items?: OrderItem[]
}

export interface OrderItem {
  sku: string
  name: string
  qty: number
  price: number
}

export interface Customer {
  id: string
  name: string
  email: string
  tier: string
  joined: string
  phone: string
  order_count?: number
}

export interface KBArticle {
  id: string
  title: string
  tags: string[]
  content: string
}

export interface Escalation {
  id: number
  ticket_id: string
  created_at: string
  priority: 'urgent' | 'high' | 'normal'
  reason: string
  conversation_summary: string
  suggested_actions: string[]
  customer_tier?: string
  status: string
}

export interface Stats {
  total_customers: number
  total_orders: number
  total_escalations: number
  kb_articles: number
  order_status_distribution: Record<string, number>
  recent_escalations: Escalation[]
}

export interface ToolCall {
  name: string
  summary?: string
  status: 'running' | 'done'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

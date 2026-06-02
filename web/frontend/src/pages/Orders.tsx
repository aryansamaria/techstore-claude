import { useEffect, useState } from 'react'
import { Search, Package, ChevronDown, ChevronUp } from 'lucide-react'
import type { Order } from '../types'

const STATUS_STYLE: Record<string, string> = {
  shipped:          'bg-blue-500/15 text-blue-400 border-blue-500/20',
  processing:       'bg-amber-500/15 text-amber-400 border-amber-500/20',
  delivered:        'bg-green-500/15 text-green-400 border-green-500/20',
  return_requested: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  cancelled:        'bg-red-500/15 text-red-400 border-red-500/20',
}

const STATUS_LABEL: Record<string, string> = {
  shipped: 'Shipped', processing: 'Processing', delivered: 'Delivered',
  return_requested: 'Return Requested', cancelled: 'Cancelled',
}

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false)
  const total = (order.items ?? []).reduce((s, i) => s + i.price * i.qty, 0)

  return (
    <>
      <tr
        className="border-b border-zinc-800 hover:bg-zinc-800/40 cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td className="py-4 px-5">
          <div className="flex items-center gap-2">
            {open ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
            <span className="font-mono text-sm text-violet-400">{order.id}</span>
          </div>
        </td>
        <td className="py-4 px-5">
          <div className="text-sm text-zinc-200">{order.customer_name ?? order.customer_id}</div>
          <div className="text-xs text-zinc-500">{order.customer_email}</div>
        </td>
        <td className="py-4 px-5">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[order.status] ?? 'bg-zinc-700 text-zinc-400'}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </td>
        <td className="py-4 px-5 text-sm text-zinc-400">{order.placed_at}</td>
        <td className="py-4 px-5 text-sm text-zinc-300">${total.toFixed(2)}</td>
        <td className="py-4 px-5">
          {order.customer_tier === 'premium' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/20">
              Premium
            </span>
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-zinc-800 bg-zinc-900/50">
          <td colSpan={6} className="px-12 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-1.5">
                  {(order.items ?? []).map(item => (
                    <div key={item.sku} className="flex justify-between text-sm">
                      <span className="text-zinc-300">{item.name} <span className="text-zinc-500">×{item.qty}</span></span>
                      <span className="text-zinc-400">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Details</p>
                {order.tracking && <p className="text-xs text-zinc-400">Tracking: <span className="text-zinc-200 font-mono">{order.tracking}</span> ({order.carrier})</p>}
                {order.estimated_delivery && <p className="text-xs text-zinc-400">Est. delivery: <span className="text-zinc-200">{order.estimated_delivery}</span></p>}
                {order.delivered_at && <p className="text-xs text-zinc-400">Delivered: <span className="text-green-400">{order.delivered_at}</span></p>}
                {order.return_reason && <p className="text-xs text-zinc-400">Return reason: <span className="text-orange-400">{order.return_reason}</span></p>}
                {order.refund_status && <p className="text-xs text-zinc-400">Refund: <span className="text-zinc-200">{order.refund_status}</span> (by {order.refund_eta})</p>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders').then(r => r.json()).then(d => { setOrders(d); setLoading(false) })
  }, [])

  const statuses = ['all', ...Array.from(new Set(orders.map(o => o.status)))]
  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q || o.id.toLowerCase().includes(q) || (o.customer_name ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Orders</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{orders.length} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID or customer…"
            className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-violet-600/20 text-violet-400 border-violet-500/40'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABEL[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Package className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Order', 'Customer', 'Status', 'Date', 'Total', 'Tier'].map(h => (
                  <th key={h} className="py-3 px-5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => <OrderRow key={o.id} order={o} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

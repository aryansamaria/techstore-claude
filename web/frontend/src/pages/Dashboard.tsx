import { useEffect, useState } from 'react'
import { Users, Package, AlertTriangle, BookOpen, TrendingUp, ArrowRight } from 'lucide-react'
import type { Stats, Page } from '../types'

const STATUS_COLOR: Record<string, string> = {
  shipped:          'bg-blue-500/15 text-blue-400 border-blue-500/20',
  processing:       'bg-amber-500/15 text-amber-400 border-amber-500/20',
  delivered:        'bg-green-500/15 text-green-400 border-green-500/20',
  return_requested: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  cancelled:        'bg-red-500/15 text-red-400 border-red-500/20',
}

const PRIORITY_COLOR = {
  urgent: 'bg-red-500/15 text-red-400 border-red-500/20',
  high:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
  normal: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30',
}

export default function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats)
  }, [])

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: 'Customers',   value: stats.total_customers,   icon: Users,         color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Orders',      value: stats.total_orders,      icon: Package,       color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
    { label: 'Escalations', value: stats.total_escalations, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'KB Articles', value: stats.kb_articles,       icon: BookOpen,      color: 'text-green-400',  bg: 'bg-green-500/10'  },
  ]

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">TechStore Support Overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-4`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-zinc-100">{value}</div>
            <div className="text-sm text-zinc-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Order Status Breakdown */}
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              Order Status Breakdown
            </h2>
            <button onClick={() => onNavigate('orders')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.order_status_distribution).map(([status, count]) => {
              const pct = Math.round((count / stats.total_orders) * 100)
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLOR[status] ?? 'bg-zinc-700 text-zinc-400 border-zinc-600'}`}>
                    {status.replace('_', ' ')}
                  </span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Escalations */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Recent Escalations
            </h2>
            <button onClick={() => onNavigate('escalations')} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {stats.recent_escalations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No escalations yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recent_escalations.map(e => (
                <div key={e.ticket_id} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-zinc-400">{e.ticket_id}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${PRIORITY_COLOR[e.priority] ?? ''}`}>
                      {e.priority}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2">{e.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

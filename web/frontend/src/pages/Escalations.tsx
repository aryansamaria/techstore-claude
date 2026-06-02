import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import type { Escalation } from '../types'

const PRIORITY_STYLE = {
  urgent: { badge: 'bg-red-500/15 text-red-400 border-red-500/25', dot: 'bg-red-400', glow: 'border-l-red-500' },
  high:   { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25', dot: 'bg-orange-400', glow: 'border-l-orange-500' },
  normal: { badge: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30', dot: 'bg-zinc-500', glow: 'border-l-zinc-600' },
}

function EscalationCard({ esc }: { esc: Escalation }) {
  const [open, setOpen] = useState(false)
  const style = PRIORITY_STYLE[esc.priority] ?? PRIORITY_STYLE.normal
  const actions = esc.suggested_actions
    ? (typeof esc.suggested_actions === 'string' ? JSON.parse(esc.suggested_actions) : esc.suggested_actions)
    : []

  return (
    <div className={`bg-zinc-900 border border-zinc-800 border-l-2 ${style.glow} rounded-xl overflow-hidden transition-all`}>
      <button className="w-full text-left px-5 py-4 flex items-start justify-between gap-4" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs text-violet-400">{esc.ticket_id}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide ${style.badge}`}>
              {esc.priority}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
              esc.status === 'open'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-zinc-700/30 text-zinc-500 border-zinc-600/20'
            }`}>
              {esc.status}
            </span>
          </div>
          <p className="text-sm text-zinc-200 font-medium line-clamp-1">{esc.reason}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{new Date(esc.created_at).toLocaleString()}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 space-y-4">
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-4">Conversation Summary</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{esc.conversation_summary}</p>
          </div>
          {actions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Suggested Actions</p>
              <ul className="space-y-1.5">
                {actions.map((a: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center text-[9px] text-zinc-500 flex-shrink-0 mt-0.5">{i + 1}</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {esc.customer_tier && (
            <p className="text-xs text-zinc-500">Customer tier: <span className={esc.customer_tier === 'premium' ? 'text-violet-400' : 'text-zinc-300'}>{esc.customer_tier}</span></p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Escalations() {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high' | 'normal'>('all')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/escalations').then(r => r.json()).then(d => { setEscalations(d); setLoading(false) })
  }

  useEffect(load, [])

  const filtered = filter === 'all' ? escalations : escalations.filter(e => e.priority === filter)

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Escalations</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{escalations.length} total tickets</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {(['all', 'urgent', 'high', 'normal'] as const).map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
              filter === p
                ? 'bg-violet-600/20 text-violet-400 border-violet-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            {p === 'all' ? `All (${escalations.length})` : `${p} (${escalations.filter(e => e.priority === p).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
          <AlertTriangle className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">{escalations.length === 0 ? 'No escalations yet — create one via chat' : 'No tickets match this filter'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => <EscalationCard key={e.ticket_id} esc={e} />)}
        </div>
      )}
    </div>
  )
}

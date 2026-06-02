import { useEffect, useState } from 'react'
import { Search, Users, Star } from 'lucide-react'
import type { Customer } from '../types'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => { setCustomers(d); setLoading(false) })
  }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
  })

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Customers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{customers.length} registered customers</p>
        </div>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex items-center gap-1.5">
                  {c.tier === 'premium' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/15 text-violet-400 border border-violet-500/20">
                      <Star className="w-2.5 h-2.5" /> Premium
                    </span>
                  )}
                  <span className="font-mono text-xs text-zinc-600">{c.id}</span>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">{c.name}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{c.email}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{c.phone}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">Member since {c.joined}</span>
                <span className="text-xs font-medium text-zinc-400">{c.order_count ?? 0} orders</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No customers found</p>
        </div>
      )}
    </div>
  )
}

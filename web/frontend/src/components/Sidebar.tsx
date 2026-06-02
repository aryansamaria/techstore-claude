import {
  LayoutDashboard, MessageSquare, Package, BookOpen,
  AlertTriangle, Users, Zap,
} from 'lucide-react'
import type { Page } from '../types'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat',      label: 'AI Chat',   icon: MessageSquare },
  { id: 'orders',    label: 'Orders',    icon: Package },
  { id: 'kb',        label: 'Knowledge Base', icon: BookOpen },
  { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
  { id: 'customers', label: 'Customers', icon: Users },
] as const

export default function Sidebar({ active, onNavigate }: {
  active: Page
  onNavigate: (p: Page) => void
}) {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-zinc-100 leading-none">TechStore</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Support Console</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id as Page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                isActive
                  ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-400' : ''}`} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-zinc-500">AI + DB Connected</span>
        </div>
      </div>
    </aside>
  )
}

import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Orders from './pages/Orders'
import KnowledgeBase from './pages/KnowledgeBase'
import Escalations from './pages/Escalations'
import Customers from './pages/Customers'
import type { Page } from './types'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  const content = {
    dashboard: <Dashboard onNavigate={setPage} />,
    chat: <Chat />,
    orders: <Orders />,
    kb: <KnowledgeBase />,
    escalations: <Escalations />,
    customers: <Customers />,
  }[page]

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar active={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        {content}
      </main>
    </div>
  )
}

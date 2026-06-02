import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, ChevronDown, ChevronUp, Wrench, Plus } from 'lucide-react'
import type { ChatMessage, ToolCall } from '../types'

const TOOL_ICON: Record<string, string> = {
  get_order: '📦',
  get_customer: '👤',
  get_orders_by_customer: '📋',
  search_kb: '📚',
  create_escalation: '🚨',
  save_ticket_summary: '📝',
}

function ToolCallCard({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 overflow-hidden text-xs mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{TOOL_ICON[call.name] ?? '🔧'}</span>
          <span className="font-medium text-zinc-300">{call.name}</span>
          {call.status === 'running' && (
            <span className="flex gap-0.5 ml-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full bg-violet-400 animate-pulse-dot" style={{ animationDelay: `${i * 0.16}s` }} />
              ))}
            </span>
          )}
          {call.status === 'done' && call.summary && (
            <span className="text-zinc-500 truncate max-w-[200px]">· {call.summary}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
      </button>
      {open && call.summary && (
        <div className="px-3 py-2 border-t border-zinc-700/40 text-zinc-400 bg-zinc-900/40">
          {call.summary}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
        isUser ? 'bg-violet-600' : 'bg-zinc-700 border border-zinc-600'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-zinc-300" />}
      </div>
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Tool calls (only for assistant) */}
        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="w-full mb-2">
            {msg.toolCalls.map((tc, i) => <ToolCallCard key={i} call={tc} />)}
          </div>
        )}
        {/* Message content */}
        {(msg.content || msg.isStreaming) && (
          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-violet-600 text-white rounded-tr-md'
              : 'bg-zinc-800 text-zinc-100 border border-zinc-700/50 rounded-tl-md'
          }`}>
            {msg.content}
            {msg.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 align-middle animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 py-16">
      <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
        <Bot className="w-8 h-8 text-violet-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-zinc-200">TechStore AI Support</h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-xs">Ask me about orders, returns, shipping, or anything else. I have live access to the database.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-sm">
        {[
          'Where is order ORD-1001?',
          'What is the return policy?',
          'Show me Alice\'s orders',
          'Escalate a billing issue',
        ].map(s => (
          <button key={s} className="text-left px-3 py-2.5 rounded-lg border border-zinc-700/60 bg-zinc-800/40 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors">
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function resetChat() {
    setMessages([])
    setInput('')
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)

    // Add user message
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])

    // Placeholder assistant message (streaming)
    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: ChatMessage = {
      id: assistantId, role: 'assistant', content: '', toolCalls: [], isStreaming: true,
    }
    setMessages(prev => [...prev, assistantMsg])

    // Build history for the API (only string content messages)
    const history = messages
      .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            setMessages(prev => prev.map(m => {
              if (m.id !== assistantId) return m
              if (evt.type === 'text') {
                return { ...m, content: m.content + evt.content }
              }
              if (evt.type === 'tool_call') {
                return { ...m, toolCalls: [...(m.toolCalls ?? []), { name: evt.name, status: 'running' }] }
              }
              if (evt.type === 'tool_result') {
                const updated = (m.toolCalls ?? []).map(tc =>
                  tc.name === evt.name && tc.status === 'running'
                    ? { ...tc, status: 'done' as const, summary: evt.summary }
                    : tc
                )
                return { ...m, toolCalls: updated }
              }
              if (evt.type === 'done' || evt.type === 'error') {
                const content = evt.type === 'error' ? evt.content : m.content
                return { ...m, content, isStreaming: false }
              }
              return m
            }))
          } catch { /* ignore malformed lines */ }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Something went wrong. Please try again.', isStreaming: false }
          : m
      ))
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-violet-400" />
          <span className="text-sm font-semibold text-zinc-200">AI Customer Support</span>
          <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Live DB
          </span>
        </div>
        <button
          onClick={resetChat}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 flex flex-col">
        {messages.length === 0 ? <EmptyState /> : messages.map(m => <MessageBubble key={m.id} msg={m} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-3 border-t border-zinc-800">
        <div className="flex gap-3 items-end bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about an order, policy, or anything else…"
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none max-h-32 leading-relaxed"
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = `${t.scrollHeight}px`
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

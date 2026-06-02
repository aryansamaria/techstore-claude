import { useEffect, useState } from 'react'
import { Search, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import type { KBArticle } from '../types'

function ArticleCard({ article }: { article: KBArticle }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all duration-200 ${
        open ? 'border-violet-500/30' : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <button className="w-full text-left px-5 py-4 flex items-start justify-between gap-4" onClick={() => setOpen(o => !o)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-violet-400">{article.id}</span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">{article.title}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {article.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 mt-0.5">
          {open
            ? <ChevronUp className="w-4 h-4 text-zinc-500" />
            : <ChevronDown className="w-4 h-4 text-zinc-500" />
          }
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800">
          <p className="text-sm text-zinc-400 leading-relaxed mt-4">{article.content}</p>
        </div>
      )}
    </div>
  )
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<KBArticle[]>([])
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [allArticles, setAllArticles] = useState<KBArticle[]>([])

  useEffect(() => {
    fetch('/api/kb').then(r => r.json()).then(d => {
      setAllArticles(d)
      setArticles(d)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!search.trim()) { setArticles(allArticles); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const r = await fetch(`/api/kb/search?q=${encodeURIComponent(search)}`)
      const d = await r.json()
      setArticles(d.articles ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search, allArticles])

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-100">Knowledge Base</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{allArticles.length} articles · Full-text search powered by PostgreSQL</p>
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search policies, returns, shipping…"
          className="w-full pl-9 pr-10 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
          <BookOpen className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No articles match your search</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(a => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  )
}

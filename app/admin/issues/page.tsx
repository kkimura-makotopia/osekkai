'use client'
import { useEffect, useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ISSUE_CATEGORIES, MODE_LABELS } from '@/lib/issueOptions'

interface Issue { id: string; category: string; hotTopic: string | null; summary: string; detail: string | null }
interface Submission {
  id: string
  mode: 'text' | 'qa'
  updatedAt: string
  user: { id: string; fullName: string | null; name: string | null; company: string | null }
  event: { id: string; title: string; heldAt: string }
  issues: Issue[]
}

export default function AdminIssuesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    if (session.role !== 'admin') { router.push('/mypage'); return }
    fetch('/api/issues?scope=all').then(r => r.json()).then(data => {
      setSubmissions(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [status, session, router])

  const uniqueEvents = useMemo(() => {
    const m = new Map<string, string>()
    submissions.forEach(s => m.set(s.event.id, s.event.title))
    return Array.from(m.entries())
  }, [submissions])

  const filtered = useMemo(() => submissions.filter(s => {
    if (eventFilter !== 'all' && s.event.id !== eventFilter) return false
    if (categoryFilter !== 'all' && !s.issues.some(i => i.category === categoryFilter)) return false
    return true
  }), [submissions, eventFilter, categoryFilter])

  const totalIssues = filtered.reduce((n, s) => n + s.issues.length, 0)

  if (status === 'loading' || loading)
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-brand-sky border-t-transparent rounded-full" /></div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">経営課題（管理）</h1>
      <p className="text-slate-400 text-sm mb-6">会員が提出した経営課題の一覧です。提出 {filtered.length} 件 / 課題 {totalIssues} 件</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}
          className="bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-sky">
          <option value="all">すべてのイベント</option>
          {uniqueEvents.map(([eid, title]) => <option key={eid} value={eid}>{title}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-sky">
          <option value="all">すべてのカテゴリ</option>
          {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-10 text-center">
          <p className="text-slate-400">該当する経営課題はありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(sub => (
            <div key={sub.id} className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {sub.user.fullName ?? sub.user.name ?? '不明'}
                    {sub.user.company && <span className="text-slate-400 font-normal">・{sub.user.company}</span>}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {sub.event.title}（{new Date(sub.event.heldAt).toLocaleDateString('ja-JP')}）
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-brand-navy-700 text-slate-300">{MODE_LABELS[sub.mode]}</span>
                  </p>
                </div>
                <Link href={`/issues/${sub.id}`} className="text-brand-sky-400 hover:text-brand-sky text-xs shrink-0">詳細・編集</Link>
              </div>
              <div className="space-y-3">
                {sub.issues.map(issue => (
                  <div key={issue.id} className="bg-brand-navy-900/40 border border-brand-navy-700 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-sky/15 text-brand-sky-400 border border-brand-sky/30 shrink-0">
                        {issue.category}
                      </span>
                      {issue.hotTopic && <span className="text-white text-sm font-medium">{issue.hotTopic}</span>}
                    </div>
                    <p className="text-slate-300 text-sm">{issue.summary}</p>
                    {issue.detail && <p className="text-slate-500 text-xs whitespace-pre-wrap mt-1">{issue.detail}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ISSUE_CATEGORIES, MODE_LABELS } from '@/lib/issueOptions'

interface Issue { id: string; category: string; requestType: string | null; summary: string; detail: string | null }
interface Submission {
  id: string
  mode: 'text' | 'qa' | 'manual'
  updatedAt: string
  user: {
    id: string; fullName: string | null; name: string | null; company: string | null
    industry: string | null; employeeCount: number | null; foundingYear: number | null; recentRevenue: string | null
  }
  event: { id: string; title: string; heldAt: string }
  issues: Issue[]
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const PDF_CSS = `
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Hiragino Sans','Yu Gothic','Meiryo',sans-serif; color:#0A2540; margin:0; }
.sheet { page-break-after: always; }
.sheet:last-child { page-break-after: auto; }
.head { border-bottom:2px solid #0A2540; padding-bottom:8px; margin-bottom:4px; }
.tag { color:#1E9CE6; font-size:11px; font-weight:bold; letter-spacing:1px; }
.head h1 { font-size:20px; margin:2px 0; }
.sub { color:#64748b; font-size:12px; }
h2 { font-size:12px; color:#1E9CE6; border-left:3px solid #1E9CE6; padding-left:6px; margin:16px 0 8px; }
table.info { width:100%; border-collapse:collapse; font-size:12px; }
table.info th { text-align:left; color:#64748b; font-weight:normal; width:140px; padding:4px 8px; vertical-align:top; }
table.info td { padding:4px 8px; }
.issue { border:1px solid #e2e8f0; border-left:4px solid #1E9CE6; border-radius:8px; padding:10px 12px; margin-bottom:8px; }
.badges span { display:inline-block; font-size:10px; padding:2px 8px; border-radius:999px; margin-right:4px; }
.cat { background:#e6f4fd; color:#0F87CC; }
.rt { background:#fef3c7; color:#b45309; }
.summary { font-weight:bold; font-size:13px; margin-top:4px; }
.detail { color:#475569; font-size:12px; white-space:pre-wrap; margin-top:4px; }
`

function AdminIssuesInner() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userParam = searchParams.get('user')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

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
    if (userParam && s.user.id !== userParam) return false
    if (eventFilter !== 'all' && s.event.id !== eventFilter) return false
    if (categoryFilter !== 'all' && !s.issues.some(i => i.category === categoryFilter)) return false
    return true
  }), [submissions, eventFilter, categoryFilter, userParam])

  // ?user= 指定時の対象会員名（提出があれば取得）
  const filteredUserName = useMemo(() => {
    if (!userParam) return null
    const s = submissions.find(x => x.user.id === userParam)
    return s ? (s.user.fullName ?? s.user.name ?? '対象の会員') : '対象の会員'
  }, [submissions, userParam])

  const totalIssues = filtered.reduce((n, s) => n + s.issues.length, 0)
  const selectedCount = filtered.filter(s => selected.has(s.id)).length
  const allFilteredSelected = filtered.length > 0 && selectedCount === filtered.length

  const toggle = (sid: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(sid)) next.delete(sid); else next.add(sid)
    return next
  })

  const toggleAllFiltered = () => setSelected(prev => {
    const next = new Set(prev)
    if (allFilteredSelected) filtered.forEach(s => next.delete(s.id))
    else filtered.forEach(s => next.add(s.id))
    return next
  })

  const exportPdf = () => {
    const subs = filtered.filter(s => selected.has(s.id))
    if (subs.length === 0) return

    const sheet = (s: Submission) => {
      const u = s.user
      const name = u.fullName ?? u.name ?? '不明'
      const info = `
        <table class="info">
          <tr><th>会社名</th><td>${esc(u.company || '—')}</td><th>業界</th><td>${esc(u.industry || '—')}</td></tr>
          <tr><th>従業員数</th><td>${u.employeeCount != null ? esc(u.employeeCount) + '名' : '—'}</td><th>設立年</th><td>${u.foundingYear != null ? esc(u.foundingYear) + '年' : '—'}</td></tr>
        </table>`
      const issues = s.issues.map(i => `
        <div class="issue">
          <div class="badges"><span class="cat">${esc(i.category)}</span>${i.requestType ? `<span class="rt">${esc(i.requestType)}</span>` : ''}</div>
          <div class="summary">${esc(i.summary)}</div>
          ${i.detail ? `<div class="detail">${esc(i.detail)}</div>` : ''}
        </div>`).join('')
      return `
        <section class="sheet">
          <div class="head">
            <div class="tag">経営課題 提出シート</div>
            <h1>${esc(u.company || name)}</h1>
            <div class="sub">${esc(name)} ／ ${esc(s.event.title)}（${new Date(s.event.heldAt).toLocaleDateString('ja-JP')}）</div>
          </div>
          <h2>会社情報</h2>
          ${info}
          <h2>経営課題（${s.issues.length}件）</h2>
          ${issues}
        </section>`
    }

    const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>経営課題まとめ</title><style>${PDF_CSS}</style></head><body>${subs.map(sheet).join('')}<script>window.onload=function(){window.print()}<\/script></body></html>`

    const w = window.open('', '_blank', 'width=900,height=1200')
    if (!w) { alert('ポップアップがブロックされました。ブラウザのポップアップを許可してから再度お試しください。'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
  }

  if (status === 'loading' || loading)
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-brand-sky border-t-transparent rounded-full" /></div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">経営課題（管理）</h1>
      <p className="text-slate-400 text-sm mb-6">会員が提出した経営課題の一覧です。提出 {filtered.length} 件 / 課題 {totalIssues} 件</p>

      {userParam && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-brand-sky/10 border border-brand-sky/30 rounded-xl px-4 py-2.5">
          <p className="text-brand-sky-400 text-sm"><strong className="text-white">{filteredUserName}</strong> さんの経営課題を表示中</p>
          <button onClick={() => router.push('/admin/issues')} className="text-slate-300 hover:text-white text-xs shrink-0">絞り込みを解除 ✕</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
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

      {/* 選択ツールバー */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-brand-navy-800 border border-brand-navy-700 rounded-xl px-4 py-3">
          <button onClick={toggleAllFiltered}
            className="text-sm text-brand-sky-400 hover:text-brand-sky font-medium">
            {allFilteredSelected ? '全解除' : '全選択'}（表示中 {filtered.length} 件）
          </button>
          <span className="text-slate-500 text-sm">選択中: {selectedCount} 件</span>
          <button onClick={exportPdf} disabled={selectedCount === 0}
            className="ml-auto bg-brand-sky hover:bg-brand-sky-400 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40">
            選択した経営課題をPDF化する
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-10 text-center">
          <p className="text-slate-400">該当する経営課題はありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(sub => {
            const checked = selected.has(sub.id)
            return (
              <div key={sub.id}
                className={`bg-brand-navy-800 border rounded-2xl p-5 transition-colors ${checked ? 'border-brand-sky' : 'border-brand-navy-700'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <input type="checkbox" checked={checked} onChange={() => toggle(sub.id)}
                    className="w-4 h-4 accent-brand-sky mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
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
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-sky/15 text-brand-sky-400 border border-brand-sky/30">
                          {issue.category}
                        </span>
                        {issue.requestType && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {issue.requestType}
                          </span>
                        )}
                      </div>
                      <p className="text-white text-sm font-medium">{issue.summary}</p>
                      {issue.detail && <p className="text-slate-400 text-xs whitespace-pre-wrap mt-1">{issue.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminIssuesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-brand-sky border-t-transparent rounded-full" /></div>}>
      <AdminIssuesInner />
    </Suspense>
  )
}

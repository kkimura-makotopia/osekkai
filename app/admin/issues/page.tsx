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
@page { size: A4; margin: 18mm; }
* { box-sizing: border-box; }
body { font-family: 'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif; color:#1c2733; margin:0; font-size:12px; line-height:1.7; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sheet { page-break-after: always; min-height:255mm; display:flex; flex-direction:column; }
.sheet:last-child { page-break-after: auto; }
.head { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; border-bottom:2px solid #0A2540; padding-bottom:14px; margin-bottom:24px; }
.head-left { min-width:0; }
.head-topline { display:flex; align-items:baseline; gap:12px; margin-bottom:8px; flex-wrap:wrap; }
.tag { font-size:10px; letter-spacing:2.5px; color:#1E9CE6; font-weight:700; white-space:nowrap; }
.sub { color:#556270; font-size:11px; }
.head h1 { font-size:23px; font-weight:700; color:#0A2540; margin:0; letter-spacing:.5px; line-height:1.3; }
.facts { flex-shrink:0; text-align:right; font-size:11px; line-height:1.95; }
.facts .row { white-space:nowrap; }
.facts .flabel { color:#6b7885; margin-right:10px; letter-spacing:1px; }
.facts .fval { color:#0A2540; font-weight:600; }
h2 { display:flex; align-items:center; gap:8px; font-size:11px; letter-spacing:2px; color:#0A2540; font-weight:700; margin:0 0 14px; }
h2::before { content:''; width:16px; height:2px; background:#1E9CE6; display:inline-block; }
h2 .count { color:#6b7885; font-weight:400; letter-spacing:0; }
.issue { display:flex; gap:16px; padding:16px 0; border-bottom:1px solid #d4dae1; page-break-inside:avoid; }
.issue:last-child { border-bottom:none; }
.num { font-size:18px; font-weight:700; color:#0A2540; min-width:26px; line-height:1.35; }
.issue-body { flex:1; min-width:0; }
.meta { font-size:10px; letter-spacing:.5px; margin-bottom:6px; }
.meta .cat { color:#1E9CE6; font-weight:700; }
.meta .rt { color:#1E9CE6; font-weight:700; }
.meta .rtdesc { color:#5a93bf; font-weight:400; }
.meta .dot { margin:0 8px; color:#9fb8cf; }
.summary { font-weight:700; font-size:14px; color:#12213a; margin:0 0 6px; line-height:1.6; }
.detail { color:#33414f; font-size:12px; white-space:pre-wrap; margin:0; line-height:1.8; }
.memo { margin-top:auto; padding-top:20px; page-break-inside:avoid; }
.memo-label { display:flex; align-items:center; gap:8px; font-size:11px; letter-spacing:2px; color:#0A2540; font-weight:700; margin-bottom:8px; }
.memo-label::before { content:''; width:16px; height:2px; background:#1E9CE6; display:inline-block; }
.memo-note { color:#6b7885; font-weight:400; letter-spacing:0; font-size:10px; }
.memo-box { border:1px solid #c2ccd6; border-radius:4px; height:54px; }
`

// 依頼種別の補足説明（PDFで「〇〇型（…）」と表示）
const RT_DESC: Record<string, string> = {
  原因分析型: '根本原因・ボトルネックを知りたい',
  打ち手探索型: '具体的な解決策・成功事例を知りたい',
  意思決定型: '選択肢の判断材料が欲しい',
  アイデア探索型: '新しい視点・発想・壁打ちが欲しい',
  人脈紹介型: '人・会社・専門家との接点が欲しい',
  経営相談型: '他の経営者の経験・考え方を聞きたい',
}

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
  const [viewMode, setViewMode] = useState<'submission' | 'issue'>('submission')

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

  // 課題単位（個々の課題をフラットに展開。カテゴリ絞り込みも個別に適用）
  const flatIssues = useMemo(() =>
    filtered.flatMap(s =>
      s.issues
        .filter(i => categoryFilter === 'all' || i.category === categoryFilter)
        .map(i => ({ issue: i, submissionId: s.id, user: s.user, event: s.event }))
    ), [filtered, categoryFilter])

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
      const facts = [
        ['業界', esc(u.industry || '—')],
        ['従業員数', u.employeeCount != null ? esc(u.employeeCount) + '名' : '—'],
        ['設立年', u.foundingYear != null ? esc(u.foundingYear) + '年' : '—'],
      ].map(([l, v]) => `<div class="row"><span class="flabel">${l}</span><span class="fval">${v}</span></div>`).join('')
      const issues = s.issues.map((i, idx) => `
        <div class="issue">
          <div class="num">${String(idx + 1).padStart(2, '0')}</div>
          <div class="issue-body">
            <div class="meta"><span class="cat">${esc(i.category)}</span>${i.requestType ? `<span class="dot">·</span><span class="rt">${esc(i.requestType)}${RT_DESC[i.requestType] ? `<span class="rtdesc">（${esc(RT_DESC[i.requestType])}）</span>` : ''}</span>` : ''}</div>
            <div class="summary">${esc(i.summary)}</div>
            ${i.detail ? `<div class="detail">${esc(i.detail)}</div>` : ''}
          </div>
        </div>`).join('')
      return `
        <section class="sheet">
          <div class="head">
            <div class="head-left">
              <div class="head-topline">
                <span class="tag">経営課題 提出シート</span>
                <span class="sub">${esc(name)}　／　${esc(s.event.title)}（${new Date(s.event.heldAt).toLocaleDateString('ja-JP')}）</span>
              </div>
              <h1>${esc(u.company || name)}</h1>
            </div>
            <div class="facts">${facts}</div>
          </div>
          <h2>経営課題 <span class="count">（${s.issues.length}件）</span></h2>
          <div class="issues">${issues}</div>
          <div class="memo">
            <div class="memo-label">メモ <span class="memo-note">経営課題の発表時のメモを記載するのに使用ください</span></div>
            <div class="memo-box"></div>
          </div>
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

      {/* 表示切替タブ */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('submission')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium ${viewMode === 'submission' ? 'bg-brand-sky text-white' : 'bg-brand-navy-800 text-slate-300 border border-brand-navy-700'}`}>
          提出単位（会社ごと）
        </button>
        <button onClick={() => setViewMode('issue')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium ${viewMode === 'issue' ? 'bg-brand-sky text-white' : 'bg-brand-navy-800 text-slate-300 border border-brand-navy-700'}`}>
          課題単位（1件ずつ）
        </button>
      </div>

      {/* 選択ツールバー（提出単位のみ） */}
      {viewMode === 'submission' && filtered.length > 0 && (
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

      {viewMode === 'submission' ? (
        filtered.length === 0 ? (
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
        )
      ) : (
        // 課題単位
        flatIssues.length === 0 ? (
          <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-10 text-center">
            <p className="text-slate-400">該当する経営課題はありません。</p>
          </div>
        ) : (
          <div>
            <p className="text-slate-500 text-xs mb-2">{flatIssues.length} 件の課題</p>
            <div className="space-y-3">
              {flatIssues.map(({ issue, submissionId, user, event }) => (
                <div key={issue.id} className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-sky/15 text-brand-sky-400 border border-brand-sky/30">
                      {issue.category}
                    </span>
                    {issue.requestType && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {issue.requestType}
                      </span>
                    )}
                    <Link href={`/issues/${submissionId}`} className="ml-auto text-brand-sky-400 hover:text-brand-sky text-xs shrink-0">詳細・編集</Link>
                  </div>
                  <p className="text-white text-sm font-medium">{issue.summary}</p>
                  {issue.detail && <p className="text-slate-400 text-xs whitespace-pre-wrap mt-1">{issue.detail}</p>}
                  <p className="text-slate-500 text-xs mt-2 pt-2 border-t border-brand-navy-700">
                    {user.fullName ?? user.name ?? '不明'}{user.company ? `・${user.company}` : ''}
                    <span className="mx-1.5">／</span>
                    {event.title}（{new Date(event.heldAt).toLocaleDateString('ja-JP')}）
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
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

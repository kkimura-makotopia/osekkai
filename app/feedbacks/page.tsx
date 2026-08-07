'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FeedbackContent } from '@/components/feedback/FeedbackContent'

interface UserLite {
  id: string
  fullName: string | null
  name: string | null
  company: string | null
  image: string | null
  role?: string
}

interface UserFull {
  id: string
  email: string
  fullName: string | null
  name: string | null
  company: string | null
  jobTitle: string | null
  industry: string | null
  employeeCount: number | null
  foundingYear: number | null
  recentRevenue: string | null
  serviceUnitPrice: string | null
  bio: string | null
  businessSummary: string | null
  image: string | null
  role: string
  snsLinks: Record<string, string>
}

interface Feedback {
  id: string
  type: string
  content: string
  createdAt: string
  fromUser: UserLite
  toUser: UserLite
  event: { id: string; title: string; heldAt: string } | null
  _count?: { comments: number }
}

const FB_LABELS: Record<string, string> = {
  intro: '知人の紹介',
  feedback: 'サービスの紹介',
  advice: 'ナレッジの共有',
  other: 'その他',
}
const FB_COLORS: Record<string, string> = {
  intro: 'bg-blue-500/20 text-blue-400',
  feedback: 'bg-emerald-500/20 text-emerald-400',
  advice: 'bg-purple-500/20 text-purple-400',
  other: 'bg-slate-500/20 text-slate-300',
}

const SNS_LABELS: Record<string, string> = {
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  website: 'Webサイト',
}

type Tab = 'received' | 'others'
type FbFilter = 'all' | 'intro' | 'feedback' | 'advice' | 'other'

const isGuestUser = (u: { role?: string } | null | undefined) => u?.role === 'guest'
const displayName = (u: UserLite) =>
  isGuestUser(u) ? '匿名' : (u.fullName ?? u.name ?? '-')

export default function FeedbacksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [popupUser, setPopupUser] = useState<UserFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('received')
  const [filter, setFilter] = useState<FbFilter>('all')
  const [eventFilter, setEventFilter] = useState<string>('all')   // 'all' | eventId
  const [senderFilter, setSenderFilter] = useState<string>('all') // 'all' | userId
  const [senderSearch, setSenderSearch] = useState('')
  const [senderListOpen, setSenderListOpen] = useState(false)
  const [openFb, setOpenFb] = useState<Feedback | null>(null)
  const [openUserId, setOpenUserId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    ;(async () => {
      try {
        const fbRes = await fetch('/api/feedbacks')
        if (fbRes.ok) {
          const t = await fbRes.text()
          const d = t ? JSON.parse(t) : []
          if (Array.isArray(d)) setFeedbacks(d)
        }
      } catch (e) {
        console.warn('feedbacks fetch failed', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [status, router])

  // 氏名クリック時に1会員の公開プロフィールを取得（一覧は取得しない）
  useEffect(() => {
    if (!openUserId) { setPopupUser(null); return }
    let active = true
    fetch(`/api/users/${openUserId}`).then(async r => {
      if (!r.ok) { if (active) setOpenUserId(null); return }
      const u = await r.json()
      if (active) setPopupUser(u)
    }).catch(() => { if (active) setOpenUserId(null) })
    return () => { active = false }
  }, [openUserId])

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  const myId = session?.dbUserId
  const isAdmin = session?.role === 'admin'
  const viewerIsGuest = session?.role === 'guest'
  // 「表示対象がゲスト」または「閲覧者がゲスト」のいずれかで匿名化
  const shouldHide = (u: { id?: string; role?: string } | null | undefined) => {
    if (!u) return false
    if (u.id === myId) return false   // 自分自身は匿名化しない
    return viewerIsGuest || u.role === 'guest'
  }
  const received = feedbacks.filter(f => f.toUser.id === myId)
  const others = feedbacks.filter(f => f.fromUser.id !== myId && f.toUser.id !== myId)

  const handleDelete = async (id: string) => {
    if (!confirm('このおせっかいを削除しますか? 元に戻せません。')) return
    const res = await fetch(`/api/feedbacks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFeedbacks(prev => prev.filter(f => f.id !== id))
      setOpenFb(prev => prev?.id === id ? null : prev)
    } else {
      const text = await res.text()
      let msg = text
      try { msg = JSON.parse(text).error ?? text } catch {}
      alert(`削除に失敗しました\n${msg}`)
    }
  }

  const visibleAll = tab === 'received' ? received : others
  const byType = filter === 'all' ? visibleAll : visibleAll.filter(f => f.type === filter)
  const byEvent = eventFilter === 'all' ? byType : byType.filter(f => f.event?.id === eventFilter)
  const visible = senderFilter === 'all' ? byEvent : byEvent.filter(f => f.fromUser.id === senderFilter)

  const TYPE_OPTIONS: { value: FbFilter; label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'intro', label: '知人の紹介' },
    { value: 'feedback', label: 'サービスの紹介' },
    { value: 'advice', label: 'ナレッジの共有' },
    { value: 'other', label: 'その他' },
  ]

  // 一覧から「紐づく交流会」のユニークなリスト
  const uniqueEvents = (() => {
    const map = new Map<string, { id: string; title: string; heldAt: string }>()
    visibleAll.forEach(f => { if (f.event) map.set(f.event.id, f.event) })
    return Array.from(map.values()).sort((a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime())
  })()

  // 一覧から「おせっかいを送った人（fromUser）」のユニークなリスト
  const uniqueSenders = (() => {
    const map = new Map<string, UserLite>()
    visibleAll.forEach(f => { if (!map.has(f.fromUser.id)) map.set(f.fromUser.id, f.fromUser) })
    return Array.from(map.values())
  })()
  const senderLabel = (u: UserLite) =>
    shouldHide(u) ? '匿名' : `${u.fullName ?? u.name ?? '-'}${u.company ? ` (${u.company})` : ''}`
  const senderQ = senderSearch.trim().toLowerCase()
  const filteredSenders = senderQ
    ? uniqueSenders.filter(u => senderLabel(u).toLowerCase().includes(senderQ))
    : uniqueSenders

  // 氏名クリック → ユーザー詳細ポップアップ（ゲスト対象 or 閲覧者がゲストなら開かない）
  const handleNameClick = (u: UserLite) => {
    if (shouldHide(u)) return
    setOpenUserId(u.id)
  }

  // フィードバックモーダル内で氏名がクリックされた時はFBモーダルを閉じない（ユーザーモーダルを重ねる）
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">おせっかい一覧</h1>
        <p className="text-slate-400 mt-1 text-sm">自分宛のおせっかいと、他のメンバー間で交わされたおせっかいを参照できます</p>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'received', label: '受け取ったおせっかい', count: received.length },
          { key: 'others', label: '他の人のおせっかい', count: others.length },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-sky text-white' : 'bg-brand-navy-800 text-slate-400 hover:text-white border border-brand-navy-700'}`}>
            {t.label}({t.count})
          </button>
        ))}
      </div>

      {/* フィルタ群 */}
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-slate-400 text-xs block mb-1">種類で絞り込み</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as FbFilter)}
            className="w-full bg-brand-navy-800 border border-brand-navy-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-brand-sky"
          >
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-400 text-xs block mb-1">交流会で絞り込み</label>
          <select
            value={eventFilter}
            onChange={e => setEventFilter(e.target.value)}
            className="w-full bg-brand-navy-800 border border-brand-navy-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-brand-sky"
          >
            <option value="all">すべて</option>
            {uniqueEvents.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title}（{new Date(ev.heldAt).toLocaleDateString('ja-JP')}）
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="text-slate-400 text-xs block mb-1">おせっかいした人で絞り込み</label>
          <input type="text" value={senderSearch}
            onChange={e => { setSenderSearch(e.target.value); setSenderListOpen(true); setSenderFilter('all') }}
            onFocus={() => setSenderListOpen(true)}
            onBlur={() => setTimeout(() => setSenderListOpen(false), 150)}
            placeholder="名前・会社名で検索..."
            autoComplete="off"
            className="w-full bg-brand-navy-800 border border-brand-navy-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-sky" />
          {senderListOpen && (
            <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-brand-navy-800 border border-brand-navy-600 rounded-lg shadow-xl">
              <li>
                <button type="button" onMouseDown={e => e.preventDefault()}
                  onClick={() => { setSenderFilter('all'); setSenderSearch(''); setSenderListOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-brand-navy-700 ${senderFilter === 'all' ? 'bg-brand-sky/20 text-white' : 'text-slate-200'}`}>
                  すべて
                </button>
              </li>
              {filteredSenders.length === 0 ? (
                <li className="px-3 py-2 text-slate-500 text-xs">該当する人が見つかりません</li>
              ) : filteredSenders.map(u => (
                <li key={u.id}>
                  <button type="button" onMouseDown={e => e.preventDefault()}
                    onClick={() => { setSenderFilter(u.id); setSenderSearch(senderLabel(u)); setSenderListOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-brand-navy-700 ${senderFilter === u.id ? 'bg-brand-sky/20 text-white' : 'text-slate-200'}`}>
                    {senderLabel(u)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          {tab === 'received' ? 'まだ受け取ったおせっかいがありません' : '他の人のおせっかいはまだありません'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(f => (
            <div key={f.id}
              className="bg-brand-navy-800 border border-brand-navy-700 hover:border-brand-navy-700 rounded-2xl p-4 transition-colors">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FB_COLORS[f.type] ?? FB_COLORS.other}`}>{FB_LABELS[f.type] ?? 'その他'}</span>
                {f.event && <span className="text-slate-500 text-xs truncate">交流会: {f.event.title}</span>}
                <span className="text-slate-500 text-xs ml-auto">{new Date(f.createdAt).toLocaleDateString('ja-JP')}</span>
              </div>
              <div className="mb-3 max-h-40 overflow-hidden"><FeedbackContent content={f.content} className="text-sm" truncateUrls /></div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* アクションボタン群（名前の左側） */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0"
                  >
                    削除
                  </button>
                )}
                <Link
                  href={`/feedbacks/${f.id}`}
                  className="bg-brand-navy-700 hover:bg-brand-navy-900 text-white px-2.5 py-1 rounded-lg text-xs font-medium shrink-0"
                >
                  詳細・コメント ({f._count?.comments ?? 0})
                </Link>
                {/* 名前 */}
                <p className="text-slate-500 text-xs flex items-center gap-1 flex-wrap ml-auto">
                  {shouldHide(f.fromUser) ? (
                    <span className="text-slate-400">匿名</span>
                  ) : (
                    <button onClick={() => handleNameClick(f.fromUser)} className="text-brand-sky-400 hover:underline">
                      {displayName(f.fromUser)}{f.fromUser.company && ` (${f.fromUser.company})`}
                    </button>
                  )}
                  <span>→</span>
                  {f.toUser.id === myId ? '自分' : shouldHide(f.toUser) ? (
                    <span className="text-slate-400">匿名</span>
                  ) : (
                    <button onClick={() => handleNameClick(f.toUser)} className="text-brand-sky-400 hover:underline">
                      {displayName(f.toUser)}{f.toUser.company && ` (${f.toUser.company})`}
                    </button>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* おせっかい詳細モーダル */}
      {openFb && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={() => setOpenFb(null)}>
          <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FB_COLORS[openFb.type] ?? FB_COLORS.other}`}>
                  {FB_LABELS[openFb.type] ?? 'その他'}
                </span>
                <button onClick={() => setOpenFb(null)} className="text-slate-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
              </div>
              <div className="bg-brand-navy-900/50 border border-brand-navy-700 rounded-xl p-4 mb-4">
                <FeedbackContent content={openFb.content} className="text-sm" />
              </div>
              <div className="space-y-1.5 text-xs text-slate-400 pt-3 border-t border-brand-navy-700 mb-4">
                <div>
                  送信者:{' '}
                  {shouldHide(openFb.fromUser) ? (
                    <span className="text-slate-300">匿名</span>
                  ) : (
                    <button onClick={() => handleNameClick(openFb.fromUser)} className="text-blue-400 hover:underline">
                      {displayName(openFb.fromUser)} {openFb.fromUser.company ? `· ${openFb.fromUser.company}` : ''}
                    </button>
                  )}
                </div>
                <div>
                  受信者:{' '}
                  {openFb.toUser.id === myId ? '自分' : shouldHide(openFb.toUser) ? (
                    <span className="text-slate-300">匿名</span>
                  ) : (
                    <button onClick={() => handleNameClick(openFb.toUser)} className="text-blue-400 hover:underline">
                      {displayName(openFb.toUser)} {openFb.toUser.company ? `· ${openFb.toUser.company}` : ''}
                    </button>
                  )}
                </div>
                {openFb.event && <div>関連交流会: {openFb.event.title}</div>}
                <div>日時: {new Date(openFb.createdAt).toLocaleString('ja-JP')}</div>
              </div>
              {isAdmin && (
                <div className="pt-3 border-t border-brand-navy-700">
                  <button
                    onClick={() => handleDelete(openFb.id)}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    削除する
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 会員詳細ポップアップ */}
      {openUserId && popupUser && (() => {
        const u = popupUser
        const sns = Object.entries(u.snsLinks ?? {}).filter(([, v]) => v) as [string, string][]
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setOpenUserId(null)}>
            <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-brand-sky flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden">
                      {u.image ? <Image src={u.image} alt="" width={56} height={56} className="rounded-full" /> : (u.fullName ?? u.name ?? '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-bold text-lg">{u.fullName ?? u.name ?? '-'}</h3>
                      <p className="text-slate-400 text-sm">{u.company ?? ''}{u.jobTitle ? ` · ${u.jobTitle}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => setOpenUserId(null)} className="text-slate-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center shrink-0">×</button>
                </div>
                <div className="space-y-1.5 text-xs mb-4">
                  {u.email && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">メール:</span><a href={`mailto:${u.email}`} className="text-brand-sky-400 hover:text-brand-sky truncate">{u.email}</a></div>
                  )}
                  {u.industry && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">業界:</span><span className="text-slate-200">{u.industry}</span></div>
                  )}
                  {u.employeeCount != null && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">従業員数:</span><span className="text-slate-200">{u.employeeCount}名</span></div>
                  )}
                  {u.foundingYear != null && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">設立年:</span><span className="text-slate-200">{u.foundingYear}年</span></div>
                  )}
                  {u.serviceUnitPrice && (
                    <div className="flex gap-2"><span className="text-slate-500 w-24 shrink-0">平均単価:</span><span className="text-slate-200">{u.serviceUnitPrice}</span></div>
                  )}
                </div>
                {u.bio && (
                  <div className="pt-3 border-t border-brand-navy-700 mb-3">
                    <p className="text-slate-400 text-xs mb-1">経歴・プロフィール</p>
                    <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{u.bio}</p>
                  </div>
                )}
                {u.businessSummary && (
                  <div className="pt-3 border-t border-brand-navy-700 mb-3">
                    <p className="text-slate-400 text-xs mb-1">事業内容サマリ</p>
                    <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{u.businessSummary}</p>
                  </div>
                )}
                {sns.length > 0 && (
                  <div className="pt-3 border-t border-brand-navy-700">
                    <p className="text-slate-400 text-xs mb-2">SNS</p>
                    <div className="flex gap-3 flex-wrap">
                      {sns.map(([key, url]) => (
                        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline">
                          {SNS_LABELS[key] ?? key}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserRow {
  id: string
  fullName: string | null
  name: string | null
  company: string | null
  image: string | null
  role: string
  createdAt: string
}

interface FeedbackRow {
  id: string
  type: string
  content: string
  createdAt: string
  fromUser: { id: string; fullName: string | null; name: string | null; company: string | null; image: string | null }
  toUser: { id: string; fullName: string | null; name: string | null; company: string | null; image: string | null }
  event: { id: string; title: string } | null
}

const FB_LABELS: Record<string, string> = { intro: '紹介', advice: '知見', other: 'その他', feedback: 'その他' }
const FB_COLORS: Record<string, string> = {
  intro: 'bg-blue-500/20 text-blue-400',
  advice: 'bg-purple-500/20 text-purple-400',
  other: 'bg-slate-500/20 text-slate-300',
  feedback: 'bg-slate-500/20 text-slate-300',
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([])
  const [events, setEvents] = useState<unknown[]>([])
  const [openFb, setOpenFb] = useState<FeedbackRow | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && session?.role !== 'admin') { router.push('/mypage'); return }
    if (status !== 'authenticated') return

    const safeJson = async (url: string) => {
      try {
        const r = await fetch(url)
        if (!r.ok) { console.warn(`${url} returned ${r.status}`); return null }
        const text = await r.text()
        return text ? JSON.parse(text) : null
      } catch (e) {
        console.warn(`${url} failed`, e)
        return null
      }
    }
    Promise.all([
      safeJson('/api/users'),
      safeJson('/api/events'),
      safeJson('/api/feedbacks'),
    ]).then(([us, evs, fbs]) => {
      if (Array.isArray(us)) setUsers(us)
      if (Array.isArray(evs)) setEvents(evs)
      if (Array.isArray(fbs)) setFeedbacks(fbs)
      setLoaded(true)
    })
  }, [status, session, router])

  if (status === 'loading' || !loaded) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})
  const adminCount = roleCounts.admin ?? 0
  const memberCount = roleCounts.member ?? 0
  const guestCount = roleCounts.guest ?? 0

  const kpis = [
    { label: '交流会', value: events.length, icon: '🤝', color: 'from-emerald-600 to-emerald-400', link: '/admin/events' },
    { label: 'おせっかい', value: feedbacks.length, icon: '💬', color: 'from-amber-600 to-amber-400', link: '#feedbacks' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">管理ダッシュボード</h1>
        <p className="text-slate-400 mt-1">経営者コミュニティ全体の状況</p>
      </div>

      {/* 会員数（ロール別内訳） */}
      <Link href="/admin/members" className="block bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl p-5 mb-4 hover:scale-[1.01] transition-transform">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-white/80 text-sm">会員数</div>
            <div className="text-4xl font-bold text-white mt-1">{users.length}<span className="text-base font-normal text-white/80 ml-2">名</span></div>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <div className="text-white/70 text-xs">運営管理者</div>
              <div className="text-white font-bold text-xl">{adminCount}</div>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <div className="text-white/70 text-xs">正会員</div>
              <div className="text-white font-bold text-xl">{memberCount}</div>
            </div>
            <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
              <div className="text-white/70 text-xs">ゲスト</div>
              <div className="text-white font-bold text-xl">{guestCount}</div>
            </div>
          </div>
        </div>
      </Link>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {kpis.map(kpi => (
          <Link key={kpi.label} href={kpi.link}
            className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-5 block hover:scale-105 transition-transform`}
          >
            <div className="text-3xl mb-2">{kpi.icon}</div>
            <div className="text-3xl font-bold text-white">{kpi.value}</div>
            <div className="text-white/80 text-sm">{kpi.label}</div>
          </Link>
        ))}
      </div>

      {/* おせっかい一覧 */}
      <div id="feedbacks" className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">おせっかい一覧</h2>
          <span className="text-slate-400 text-sm">{feedbacks.length}件</span>
        </div>
        {feedbacks.length === 0 ? (
          <p className="text-slate-500 text-sm">おせっかいがありません</p>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {feedbacks.map(f => (
              <button key={f.id} onClick={() => setOpenFb(f)}
                className="w-full text-left bg-slate-700/40 hover:bg-slate-700 rounded-xl p-3 transition-colors">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FB_COLORS[f.type] ?? FB_COLORS.other}`}>{FB_LABELS[f.type] ?? 'その他'}</span>
                  <span className="text-slate-500 text-xs">{new Date(f.createdAt).toLocaleDateString('ja-JP')}</span>
                  {f.event && <span className="text-slate-500 text-xs truncate">· {f.event.title}</span>}
                </div>
                <p className="text-slate-300 text-sm line-clamp-2">{f.content}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {f.fromUser.fullName ?? f.fromUser.name} → {f.toUser.fullName ?? f.toUser.name}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FB 詳細モーダル */}
      {openFb && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setOpenFb(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FB_COLORS[openFb.type] ?? FB_COLORS.other}`}>{FB_LABELS[openFb.type] ?? 'その他'}</span>
                <button onClick={() => setOpenFb(null)} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-4">
                <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{openFb.content}</p>
              </div>
              <div className="space-y-1 text-xs text-slate-400 pt-3 border-t border-slate-700">
                <div>送信者: {openFb.fromUser.fullName ?? openFb.fromUser.name} {openFb.fromUser.company ? `· ${openFb.fromUser.company}` : ''}</div>
                <div>受信者: {openFb.toUser.fullName ?? openFb.toUser.name} {openFb.toUser.company ? `· ${openFb.toUser.company}` : ''}</div>
                {openFb.event && <div>関連交流会: {openFb.event.title}</div>}
                <div>日時: {new Date(openFb.createdAt).toLocaleString('ja-JP')}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Event {
  id: string
  title: string
  heldAt: string
  location: string | null
  description: string | null
  creator: { id: string; fullName: string | null; name: string | null; company: string | null }
  invitees: { user: { id: string } }[]
  _count: { feedbacks: number }
}

export default function EventsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    ;(async () => {
      try {
        const r = await fetch('/api/events')
        if (!r.ok) { console.warn('/api/events returned', r.status); return }
        const text = await r.text()
        const data = text ? JSON.parse(text) : []
        if (Array.isArray(data)) setEvents(data)
      } catch (e) {
        console.warn('/api/events fetch failed', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [status, router])

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  const isGuest = session?.role === 'guest'
  // 過去かどうかは「開催日」で判断（当日は時刻に関わらず開催予定扱い）
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const eventDay = (iso: string) => { const d = new Date(iso); d.setHours(0, 0, 0, 0); return d }
  const upcoming = events.filter(e => eventDay(e.heldAt) >= startOfToday)
  const past = events.filter(e => eventDay(e.heldAt) < startOfToday)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">イベント</h1>
          <p className="text-slate-400 mt-1 text-sm">過去・今後のイベント一覧</p>
        </div>
        {session?.role === 'admin' && (
          <Link href="/admin/events" className="bg-brand-sky hover:bg-brand-sky-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + 新規作成
          </Link>
        )}
      </div>

      {events.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <p>まだイベントがありません</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold text-brand-sky-400 tracking-wider mb-4 flex items-center gap-2 uppercase">
            <span className="w-8 h-0.5 bg-brand-sky rounded-full inline-block" />開催予定
          </h2>
          <div className="space-y-4">
            {upcoming.map(ev => <EventCard key={ev.id} event={ev} upcoming locked={isGuest} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <button onClick={() => setShowPast(v => !v)}
            className="w-full flex items-center justify-between mb-4 group">
            <span className="text-sm font-bold text-slate-500 tracking-wider flex items-center gap-2 uppercase group-hover:text-slate-300 transition-colors">
              <span className="w-8 h-0.5 bg-slate-600 rounded-full inline-block" />過去のイベント（{past.length}）
            </span>
            <span className={`text-slate-500 text-xs transition-transform ${showPast ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {showPast && (
            <div className="space-y-4">
              {past.map(ev => <EventCard key={ev.id} event={ev} upcoming={false} locked={isGuest} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, upcoming, locked }: { event: Event; upcoming: boolean; locked: boolean }) {
  const date = new Date(event.heldAt)
  const inner = (
    <div className="flex items-center gap-4">
      {/* 日付バッジ */}
      <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-lg ${
        upcoming ? 'bg-gradient-to-br from-brand-sky to-brand-navy shadow-brand-sky/20' : 'bg-brand-navy-700 shadow-black/20'
      }`}>
        <span className="text-white/80 text-[10px] font-medium leading-none">{date.toLocaleDateString('ja-JP', { month: 'short' })}</span>
        <span className="text-white text-2xl font-bold leading-tight">{date.getDate()}</span>
      </div>

      {/* 本文 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {upcoming && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-sky/20 text-brand-sky-400 border border-brand-sky/30">開催予定</span>
          )}
          <h3 className="text-white font-bold text-lg group-hover:text-brand-sky-400 transition-colors truncate">{event.title}</h3>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-400 flex-wrap">
          <span>{date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
          {event.location && <span className="truncate">{event.location}</span>}
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[11px] text-slate-400 bg-brand-navy-900/60 border border-brand-navy-700 px-2.5 py-1 rounded-full">参加者 {event.invitees?.length ?? 0}名</span>
          <span className="text-[11px] text-slate-400 bg-brand-navy-900/60 border border-brand-navy-700 px-2.5 py-1 rounded-full">おせっかい {event._count.feedbacks}件</span>
        </div>
      </div>

      {/* 右端 */}
      {locked
        ? <span className="shrink-0 text-xs text-slate-500">閲覧不可</span>
        : <span className="shrink-0 text-xl text-slate-600 group-hover:text-brand-sky-400 transition-colors">→</span>}
    </div>
  )

  const base = 'block rounded-2xl p-5 transition-all'
  if (locked) {
    return (
      <div title="ゲストは詳細を閲覧できません"
        className={`${base} bg-brand-navy-800 border border-brand-navy-700 opacity-70 cursor-not-allowed select-none`}>
        {inner}
      </div>
    )
  }
  return (
    <Link href={`/events/${event.id}`}
      className={`${base} group ${
        upcoming
          ? 'bg-gradient-to-br from-brand-navy-800 to-brand-navy-900 border border-brand-sky/30 hover:border-brand-sky hover:shadow-lg hover:shadow-brand-sky/10 hover:-translate-y-0.5'
          : 'bg-brand-navy-800 border border-brand-navy-700 hover:border-brand-navy-600 hover:-translate-y-0.5'
      }`}>
      {inner}
    </Link>
  )
}

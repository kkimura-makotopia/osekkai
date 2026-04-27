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
  const upcoming = events.filter(e => new Date(e.heldAt) >= new Date())
  const past = events.filter(e => new Date(e.heldAt) < new Date())

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">交流会</h1>
          <p className="text-slate-400 mt-1">過去・今後の交流会一覧</p>
        </div>
        {session?.role === 'admin' && (
          <Link href="/admin/events" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + 新規作成
          </Link>
        )}
      </div>

      {events.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <div className="text-5xl mb-4">🤝</div>
          <p>まだ交流会がありません</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />予定されている交流会</h2>
          <div className="space-y-4">
            {upcoming.map(ev => <EventCard key={ev.id} event={ev} upcoming locked={isGuest} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-slate-500 rounded-full inline-block" />過去の交流会</h2>
          <div className="space-y-4">
            {past.map(ev => <EventCard key={ev.id} event={ev} upcoming={false} locked={isGuest} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({ event, upcoming, locked }: { event: Event; upcoming: boolean; locked: boolean }) {
  const date = new Date(event.heldAt)
  const inner = (
      <div className="flex items-start gap-4">
        <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 ${upcoming ? 'bg-blue-600' : 'bg-slate-700'}`}>
          <span className="text-white text-xs font-medium">{date.toLocaleDateString('ja-JP', { month: 'short' })}</span>
          <span className="text-white text-2xl font-bold leading-tight">{date.getDate()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg group-hover:text-blue-400 transition-colors">{event.title}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400 flex-wrap">
            <span>{date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
            {event.location && <span>📍 {event.location}</span>}
          </div>
          {event.description && <p className="text-slate-400 text-sm mt-2 line-clamp-2">{event.description}</p>}
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <span>主催: {event.creator.fullName ?? event.creator.name}</span>
            <span>参加者 {event.invitees?.length ?? 0}名</span>
            <span>おせっかい {event._count.feedbacks}件</span>
          </div>
        </div>
        <div className="shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors">{locked ? '🔒' : '→'}</div>
      </div>
  )
  if (locked) {
    return (
      <div
        title="ゲストは詳細を閲覧できません"
        className="block bg-slate-800 border border-slate-700 rounded-2xl p-5 opacity-70 cursor-not-allowed select-none"
      >
        {inner}
      </div>
    )
  }
  return (
    <Link href={`/events/${event.id}`} className="block bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl p-5 transition-colors group">
      {inner}
    </Link>
  )
}

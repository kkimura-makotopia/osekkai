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

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [eventCount, setEventCount] = useState(0)
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
      if (Array.isArray(evs)) setEventCount(evs.length)
      if (Array.isArray(fbs)) setFeedbackCount(fbs.length)
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
    { label: '交流会', value: eventCount, icon: '🤝', color: 'from-emerald-600 to-emerald-400', link: '/admin/events' },
    { label: 'おせっかい', value: feedbackCount, icon: '💬', color: 'from-amber-600 to-amber-400', link: '/feedbacks' },
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
      <div className="grid grid-cols-2 gap-4">
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
    </div>
  )
}

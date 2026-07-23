'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { REVENUE_RANGES } from '@/lib/profileOptions'
import { JOB_TITLES } from '@/lib/jobTitles'
import { ISSUE_CATEGORIES } from '@/lib/issueOptions'

interface UserRow {
  id: string
  fullName: string | null
  name: string | null
  company: string | null
  image: string | null
  role: string
  jobTitle: string | null
  employeeCount: number | null
  recentRevenue: string | null
  createdAt: string
}
interface FeedbackRow { id: string; fromUser: { id: string } }
interface SubmissionRow {
  id: string
  user: { id: string; fullName: string | null; name: string | null; role: string }
  issues: { category: string }[]
}

// 集計から除外する運営スタッフの姓 ＋ ゲスト
const EXCLUDED_SURNAMES = ['木村', '間宮', '堤', '眞嶋', '真嶋']
const isExcluded = (u: { role?: string | null; fullName?: string | null; name?: string | null } | null | undefined) => {
  if (!u) return true
  if (u.role === 'guest') return true
  const n = `${u.fullName ?? ''}${u.name ?? ''}`
  return EXCLUDED_SURNAMES.some(s => n.includes(s))
}

// 年商レンジの代表値（万円）— 平均計算・並び順に使用
const REVENUE_MID_MAN = [500, 2000, 4000, 7500, 20000, 65000, 200000, 650000, 3000000, 7500000, 15000000]
const REVENUE_MID: Record<string, number> = Object.fromEntries(REVENUE_RANGES.map((r, i) => [r, REVENUE_MID_MAN[i]]))

const formatMan = (v: number) => {
  if (v <= 0) return '—'
  if (v >= 10000) return `約${(v / 10000).toFixed(v / 10000 >= 10 ? 0 : 1)}億円`
  return `約${Math.round(v).toLocaleString()}万円`
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([])
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
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
      safeJson('/api/issues?scope=all'),
    ]).then(([us, evs, fbs, subs]) => {
      if (Array.isArray(us)) setUsers(us)
      if (Array.isArray(evs)) setEventCount(evs.length)
      if (Array.isArray(fbs)) setFeedbacks(fbs)
      if (Array.isArray(subs)) setSubmissions(subs)
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

  // 集計対象の会員（運営スタッフ・ゲストを除外）
  const statUsers = users.filter(u => !isExcluded(u))
  const userById = new Map(users.map(u => [u.id, u]))

  // 平均年商規模
  const usersWithRev = statUsers.filter(u => u.recentRevenue && REVENUE_MID[u.recentRevenue] != null)
  const avgRevenueMan = usersWithRev.length
    ? usersWithRev.reduce((s, u) => s + REVENUE_MID[u.recentRevenue!], 0) / usersWithRev.length
    : 0

  // 平均従業員数
  const usersWithEmp = statUsers.filter(u => typeof u.employeeCount === 'number')
  const avgEmp = usersWithEmp.length
    ? Math.round(usersWithEmp.reduce((s, u) => s + (u.employeeCount ?? 0), 0) / usersWithEmp.length)
    : 0

  // 役職別割合
  const jobDist = [...JOB_TITLES, '未設定'].map(job => ({
    label: job,
    value: statUsers.filter(u => (u.jobTitle ?? '未設定') === job).length,
  })).filter(d => d.value > 0)

  // 経営課題（登録数・カテゴリ割合）— 提出者が対象会員のもののみ
  const allIssues = submissions.filter(s => !isExcluded(s.user)).flatMap(s => s.issues)
  const issueCount = allIssues.length
  const categoryDist = ISSUE_CATEGORIES.map(cat => ({
    label: cat,
    value: allIssues.filter(i => i.category === cat).length,
  })).filter(d => d.value > 0)

  // 企業年商別のおせっかいを出した数（送信者が対象会員のもののみ）
  const eligibleFeedbacks = feedbacks.filter(f => !isExcluded(userById.get(f.fromUser.id)))
  const revenueBuckets = [...REVENUE_RANGES, '未設定']
  const feedbackByRevenue = revenueBuckets.map(bucket => ({
    label: bucket,
    value: eligibleFeedbacks.filter(f => (userById.get(f.fromUser.id)?.recentRevenue ?? '未設定') === bucket).length,
  })).filter(d => d.value > 0)

  const kpis = [
    { label: '交流会', value: eventCount, icon: '🤝', color: 'from-emerald-600 to-emerald-400', link: '/admin/events' },
    { label: 'おせっかい', value: feedbacks.length, icon: '💬', color: 'from-amber-600 to-amber-400', link: '/feedbacks' },
    { label: '経営課題登録数', value: issueCount, icon: '📝', color: 'from-brand-navy to-brand-sky', link: '/admin/issues' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">管理ダッシュボード</h1>
        <p className="text-slate-400 mt-1">経営者コミュニティ全体の状況</p>
      </div>

      {/* 会員数（ロール別内訳） */}
      <Link href="/admin/members" className="block bg-gradient-to-br from-brand-navy to-brand-sky rounded-2xl p-5 mb-4 hover:scale-[1.01] transition-transform">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
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

      {/* 平均値カード */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard label="会員の平均年商規模" value={formatMan(avgRevenueMan)} sub={`${usersWithRev.length}名の登録から算出`} />
        <StatCard label="会員の平均従業員数" value={usersWithEmp.length ? `${avgEmp.toLocaleString()}名` : '—'} sub={`${usersWithEmp.length}名の登録から算出`} />
      </div>

      {/* 分布 */}
      <div className="grid md:grid-cols-2 gap-4">
        <DistCard title="会員の役職別の割合" items={jobDist} total={jobDist.reduce((s, d) => s + d.value, 0)} unit="名" color="bg-brand-sky" />
        <DistCard title="経営課題のカテゴリ割合" items={categoryDist} total={issueCount} unit="件" color="bg-emerald-500" />
        <DistCard title="企業年商別のおせっかいを出した数" items={feedbackByRevenue} total={eligibleFeedbacks.length} unit="件" color="bg-amber-500" className="md:col-span-2" />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-5">
      <div className="text-slate-400 text-sm">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold text-white mt-1">{value}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
    </div>
  )
}

function DistCard({ title, items, total, unit, color, className = '' }: {
  title: string
  items: { label: string; value: number }[]
  total: number
  unit: string
  color: string
  className?: string
}) {
  return (
    <div className={`bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-5 ${className}`}>
      <h3 className="text-white font-medium mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-slate-500 text-sm">データがありません。</p>
      ) : (
        <div className="space-y-3">
          {items.map(d => {
            const pct = total ? Math.round((d.value / total) * 100) : 0
            return (
              <div key={d.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{d.label}</span>
                  <span className="text-slate-400">{d.value}{unit}（{pct}%）</span>
                </div>
                <div className="h-2 bg-brand-navy-700 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

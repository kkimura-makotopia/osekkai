'use client'
import { useEffect, useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface User {
  id: string
  email: string
  name: string | null
  fullName: string | null
  company: string | null
  jobTitle: string | null
  industry: string | null
  employeeCount: number | null
  foundingYear: number | null
  recentRevenue: string | null
  operatingMargin: string | null
  serviceUnitPrice: string | null
  customerCount: string | null
  revenueTarget3y: string | null
  bio: string | null
  businessSummary: string | null
  role: string
  isActive: boolean
  image: string | null
  createdAt: string
  _count: { createdEvents: number; sentFeedbacks: number; receivedFeedbacks: number }
}

interface IssueRow { category: string; requestType: string | null; summary: string; detail: string | null }
interface Submission {
  id: string
  user: { id: string }
  event: { title: string; heldAt: string }
  issues: IssueRow[]
}

const ROLE_LABELS: Record<string, string> = { admin: '運営管理者', member: '正会員', guest: 'ゲスト' }

// CSVセルのエスケープ（ダブルクォートで囲み、内部の " は "" に）
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export default function AdminMembersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && session?.role !== 'admin') { router.push('/mypage'); return }
    if (status !== 'authenticated') return
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/issues?scope=all').then(r => r.json()),
    ]).then(([us, subs]) => {
      if (Array.isArray(us)) setUsers(us)
      if (Array.isArray(subs)) setSubmissions(subs)
      setLoading(false)
    })
  }, [status, session, router])

  // ユーザーIDごとの提出（経営課題）
  const subsByUser = useMemo(() => {
    const m = new Map<string, Submission[]>()
    submissions.forEach(s => {
      const arr = m.get(s.user.id) ?? []
      arr.push(s)
      m.set(s.user.id, arr)
    })
    return m
  }, [submissions])

  const issueCountOf = (userId: string) =>
    (subsByUser.get(userId) ?? []).reduce((n, s) => n + s.issues.length, 0)

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId)
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)))
    } else {
      alert('ロール変更に失敗しました')
    }
    setUpdatingId(null)
  }

  const handleDelete = async (user: User) => {
    const label = user.fullName ?? user.name ?? user.email
    if (!confirm(`${label} を完全に削除しますか?\n\n※ このユーザーが作成した交流会・おせっかい・紹介リンク・経営課題など、関連する履歴も全て削除されます。\n※ 元に戻せません。`)) return
    setUpdatingId(user.id)
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id))
    } else {
      const text = await res.text()
      let msg = text
      try { msg = JSON.parse(text).error ?? text } catch {}
      alert(`削除に失敗しました\n${msg}`)
    }
    setUpdatingId(null)
  }

  const exportCsv = () => {
    const headers = [
      '氏名', 'メール', '会社名', '役職', '業界', '従業員数', '設立年',
      '売上規模(直近確定期)', '営業利益率', 'サービス平均単価', '顧客数', '3年後の売上目標',
      'ロール', 'おせっかい受取', 'おせっかい送信', '経歴・プロフィール', '事業内容サマリ',
      '提出イベント', '経営課題',
    ]
    const rows = users.map(u => {
      const subs = subsByUser.get(u.id) ?? []
      const events = Array.from(new Set(subs.map(s => s.event.title))).join(' / ')
      const issues = subs
        .flatMap(s => s.issues.map(i => `[${i.category}/${i.requestType ?? ''}] ${i.summary}${i.detail ? '：' + i.detail : ''}`))
        .join('\n')
      return [
        u.fullName ?? u.name ?? '', u.email, u.company ?? '', u.jobTitle ?? '', u.industry ?? '',
        u.employeeCount ?? '', u.foundingYear ?? '', u.recentRevenue ?? '', u.operatingMargin ?? '',
        u.serviceUnitPrice ?? '', u.customerCount ?? '', u.revenueTarget3y ?? '',
        ROLE_LABELS[u.role] ?? u.role, u._count.receivedFeedbacks, u._count.sentFeedbacks,
        u.bio ?? '', u.businessSummary ?? '', events, issues,
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `会員_経営課題_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = users.filter(u =>
    (u.fullName ?? u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">会員管理</h1>
          <p className="text-slate-400 mt-1">{users.length} 名のメンバー</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCsv}
            className="bg-brand-sky hover:bg-brand-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl shrink-0"
          >
            CSV出力（登録情報＋経営課題）
          </button>
          <input
            type="text"
            placeholder="名前・会社名・メールで検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-brand-navy-800 border border-brand-navy-700 rounded-xl px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>
      </div>

      <div className="bg-brand-navy-800 rounded-2xl border border-brand-navy-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-navy-700">
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3">会員</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3 hidden sm:table-cell">会社・役職</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3 hidden lg:table-cell">従業員数</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3 hidden lg:table-cell">売上規模</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3 hidden md:table-cell">おせっかい<span className="text-slate-500">(受/出)</span></th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3 hidden md:table-cell">経営課題</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3">ロール</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3 hidden xl:table-cell">登録日</th>
                <th className="text-right text-slate-400 text-sm font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const issueCount = issueCountOf(u.id)
                return (
                  <tr key={u.id} className="border-b border-brand-navy-700/50 hover:bg-brand-navy-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-sky flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                          {u.image ? <Image src={u.image} alt="" width={36} height={36} className="rounded-full" /> : (u.fullName ?? u.name ?? u.email)[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium">{u.fullName ?? u.name ?? '-'}</p>
                          <p className="text-slate-400 text-xs truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-slate-300 text-sm">{u.company ?? '-'}</p>
                      <p className="text-slate-500 text-xs">{u.jobTitle ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-300 text-sm">{u.employeeCount != null ? `${u.employeeCount}名` : '-'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-300 text-sm">{u.recentRevenue ?? '-'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-300 text-sm whitespace-nowrap">
                      <span className="text-emerald-400">受 {u._count.receivedFeedbacks}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-brand-sky-400">出 {u._count.sentFeedbacks}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <button
                        onClick={() => router.push(`/admin/issues?user=${u.id}`)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-brand-navy-700 hover:bg-brand-navy-900 text-slate-200 whitespace-nowrap"
                      >
                        経営課題{issueCount > 0 && <span className="ml-1 text-brand-sky-400 font-medium">{issueCount}</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== session?.dbUserId ? (
                        <select
                          value={u.role}
                          disabled={updatingId === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="bg-brand-navy-700 border border-brand-navy-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                        >
                          <option value="guest">ゲスト</option>
                          <option value="member">正会員</option>
                          <option value="admin">運営管理者</option>
                        </select>
                      ) : (
                        <span className="text-slate-400 text-xs">{ROLE_LABELS[u.role] ?? u.role}（自分）</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-slate-400 text-sm">
                      {new Date(u.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== session?.dbUserId && (
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={updatingId === u.id}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 disabled:opacity-40"
                        >
                          削除
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">会員が見つかりません</div>
          )}
        </div>
      </div>
    </div>
  )
}

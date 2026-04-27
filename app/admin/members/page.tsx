'use client'
import { useEffect, useState } from 'react'
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
  role: string
  isActive: boolean
  image: string | null
  createdAt: string
  _count: { createdEvents: number; sentFeedbacks: number }
}

const ROLE_LABELS: Record<string, string> = { admin: '運営管理者', member: '正会員', guest: 'ゲスト' }
const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-amber-500/20 text-amber-400',
  member: 'bg-blue-500/20 text-blue-400',
  guest: 'bg-slate-500/20 text-slate-300',
}

export default function AdminMembersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && session?.role !== 'admin') { router.push('/mypage'); return }
    if (status !== 'authenticated') return
    fetch('/api/users').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data)
      setLoading(false)
    })
  }, [status, session, router])

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
    if (!confirm(`${label} を完全に削除しますか?\n\n※ このユーザーが作成した交流会・おせっかい・紹介リンクなど、関連する履歴も全て削除されます。\n※ 元に戻せません。`)) return
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
        <input
          type="text"
          placeholder="名前・会社名・メールで検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-64"
        />
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3">会員</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3 hidden sm:table-cell">会社・役職</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3 hidden md:table-cell">おせっかい</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3">ロール</th>
                <th className="text-left text-slate-400 text-sm font-medium px-4 py-3 hidden lg:table-cell">登録日</th>
                <th className="text-right text-slate-400 text-sm font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
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
                  <td className="px-4 py-3 hidden md:table-cell text-slate-300 text-sm">{u._count.sentFeedbacks}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[u.role] ?? ROLE_STYLES.guest}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                      {u.id !== session?.dbUserId && (
                        <select
                          value={u.role}
                          disabled={updatingId === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                        >
                          <option value="guest">ゲスト</option>
                          <option value="member">正会員</option>
                          <option value="admin">運営管理者</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-sm">
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
              ))}
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

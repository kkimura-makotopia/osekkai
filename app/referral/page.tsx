'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface ReferralLink {
  id: string
  token: string
  message: string | null
  expiresAt: string | null
  clickCount: number
  isActive: boolean
  createdAt: string
  fromUser: { id: string; fullName: string | null; name: string | null; company: string | null }
}

interface User {
  id: string
  fullName: string | null
  name: string | null
  company: string | null
  image: string | null
  referralTemplate?: string | null
}

const FALLBACK_TEMPLATE = `いつもお世話になってます。先日経営者交流会で出会った方でお繋ぎしたい方がいましたのでお繋ぎさせていただいてもよろしいでしょうか。`

export default function ReferralPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [links, setLinks] = useState<ReferralLink[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ toUserId: '', message: '', validDays: '' })
  const [messageTouched, setMessageTouched] = useState(false)
  const [myTemplate, setMyTemplate] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return
    Promise.all([
      fetch('/api/referral').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([ls, us]) => {
      if (Array.isArray(ls)) setLinks(ls)
      if (Array.isArray(us)) {
        const me = us.find((u: User) => u.id === session?.dbUserId)
        setMyTemplate(me?.referralTemplate?.trim() || FALLBACK_TEMPLATE)
        setUsers(us.filter((u: User) => u.id !== session?.dbUserId))
      }
      setLoading(false)
    })
  }, [status, session, router])

  const openForm = () => {
    setForm({ toUserId: '', message: myTemplate, validDays: '' })
    setMessageTouched(false)
    setShowForm(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toUserId: form.toUserId,
        message: form.message || null,
        validDays: form.validDays ? Number(form.validDays) : null,
      }),
    })
    if (res.ok) {
      const newLink = await res.json()
      setLinks(prev => [newLink, ...prev])
      setForm({ toUserId: '', message: '', validDays: '' })
      setMessageTouched(false)
      setShowForm(false)
    }
    setSaving(false)
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const getInviteUrl = (token: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${token}`

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">紹介リンク</h1>
          <p className="text-slate-400 mt-1">メンバーを紹介するためのリンクを管理</p>
        </div>
        <button
          onClick={() => showForm ? setShowForm(false) : openForm()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + 新しいリンクを作成
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">紹介リンクを作成</h2>
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm block mb-1">紹介するメンバー *</label>
              <select
                required
                value={form.toUserId}
                onChange={e => setForm(p => ({ ...p, toUserId: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">選択してください</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName ?? u.name} {u.company ? `(${u.company})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">メッセージ（マイページのテンプレートを使用）</label>
                <textarea
                  value={form.message}
                  onChange={e => { setMessageTouched(true); setForm(p => ({ ...p, message: e.target.value })) }}
                  rows={6}
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none text-sm"
                />
                <p className="text-slate-500 text-xs mt-1">※ マイページで編集した内容が自動で挿入されます（このリンクだけ変更したい場合は直接編集可）</p>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">有効期限（日数）</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.validDays}
                  onChange={e => setForm(p => ({ ...p, validDays: e.target.value }))}
                  placeholder="無期限の場合は空白"
                  className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
              {saving ? '作成中...' : '作成する'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm({ toUserId: '', message: '', validDays: '' }); setMessageTouched(false) }} className="bg-slate-700 text-slate-300 px-5 py-2 rounded-xl text-sm hover:bg-slate-600">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* Links List */}
      <div className="space-y-4">
        {links.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">🔗</div>
            <p>まだ紹介リンクがありません</p>
          </div>
        )}
        {links.map(link => {
          const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date()
          const inviteUrl = getInviteUrl(link.token)
          return (
            <div key={link.id} className={`bg-slate-800 border rounded-2xl p-5 ${!link.isActive || isExpired ? 'border-slate-700 opacity-60' : 'border-slate-700'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {!link.isActive && <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full">無効</span>}
                    {isExpired && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">期限切れ</span>}
                    {link.isActive && !isExpired && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">有効</span>}
                    <span className="text-slate-400 text-xs">クリック数: {link.clickCount}</span>
                    {link.expiresAt && <span className="text-slate-400 text-xs">期限: {new Date(link.expiresAt).toLocaleDateString('ja-JP')}</span>}
                  </div>
                  {link.message && <p className="text-slate-300 text-sm mb-2">"{link.message}"</p>}
                  <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
                    <span className="text-slate-400 text-xs font-mono truncate flex-1">{inviteUrl}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => copyLink(link.token)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${copied === link.token ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                  >
                    {copied === link.token ? '✓ コピー済み' : '📋 コピー'}
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                作成日: {new Date(link.createdAt).toLocaleDateString('ja-JP')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

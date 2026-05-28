'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Invitee {
  user: { id: string; fullName: string | null; name: string | null; company: string | null; image: string | null }
}

interface Event {
  id: string
  title: string
  heldAt: string
  location: string | null
  description: string | null
  aiSummary: string | null
  creator: { id: string; fullName: string | null; name: string | null; company: string | null }
  invitees: Invitee[]
  _count: { feedbacks: number }
}

interface User {
  id: string
  fullName: string | null
  name: string | null
  company: string | null
}

export default function AdminEventsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', heldAt: '', location: '', description: '' })
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([])
  const [inviteeSearch, setInviteeSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && session?.role !== 'admin') { router.push('/mypage'); return }
    if (status !== 'authenticated') return
    loadAll()
  }, [status, session, router])

  const loadAll = () => {
    Promise.all([
      fetch('/api/events').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([evs, us]) => {
      if (Array.isArray(evs)) setEvents(evs)
      if (Array.isArray(us)) setUsers(us)
      setLoading(false)
    })
  }

  const toggleInvitee = (id: string) => {
    setSelectedInvitees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleDeleteEvent = async (ev: Event) => {
    if (!confirm(`交流会「${ev.title}」を削除しますか?\n\n※ この交流会に紐づく招待履歴・おせっかいも全て削除されます。\n※ 元に戻せません。`)) return
    const res = await fetch(`/api/events/${ev.id}`, { method: 'DELETE' })
    if (res.ok) {
      setEvents(prev => prev.filter(x => x.id !== ev.id))
    } else {
      const text = await res.text()
      let msg = text
      try { msg = JSON.parse(text).error ?? text } catch {}
      alert(`削除に失敗しました\n${msg}`)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // datetime-local の値はローカルタイムなので、Dateに通してISO化（UTC送信）
      const heldAtIso = form.heldAt ? new Date(form.heldAt).toISOString() : ''
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, heldAt: heldAtIso, inviteeIds: selectedInvitees }),
      })
      if (res.ok) {
        setForm({ title: '', heldAt: '', location: '', description: '' })
        setSelectedInvitees([])
        setInviteeSearch('')
        setShowForm(false)
        loadAll()
      } else {
        const text = await res.text()
        let msg = text
        try { msg = JSON.parse(text).error ?? text } catch {}
        alert(`作成に失敗しました (HTTP ${res.status})\n${msg}`)
      }
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>

  const filteredUsers = users.filter(u => {
    const q = inviteeSearch.toLowerCase()
    if (!q) return true
    return (u.fullName ?? u.name ?? '').toLowerCase().includes(q) || (u.company ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">イベント管理</h1>
          <p className="text-slate-400 mt-1">{events.length} 件の交流会</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-sky hover:bg-brand-sky-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <span>+</span> 新規作成
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">交流会を作成</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-slate-400 text-sm block mb-1">タイトル *</label>
              <input
                required
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="第1回 経営者交流会"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">開催日時 *</label>
              <input
                required
                type="datetime-local"
                value={form.heldAt}
                onChange={e => setForm(p => ({ ...p, heldAt: e.target.value }))}
                className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">場所</label>
              <input
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="東京都渋谷区..."
              />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">概要</label>
              <input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-brand-navy-700 border border-brand-navy-700 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="交流会の内容..."
              />
            </div>
          </div>

          {/* Invitees */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-400 text-sm">招待者 ({selectedInvitees.length}名選択中)</label>
              <input
                value={inviteeSearch}
                onChange={e => setInviteeSearch(e.target.value)}
                placeholder="名前・会社で検索..."
                className="bg-brand-navy-700 border border-brand-navy-700 rounded-lg px-3 py-1 text-white text-sm w-56 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="bg-brand-navy-900/50 border border-brand-navy-700 rounded-xl p-3 max-h-52 overflow-y-auto">
              {filteredUsers.length === 0 && <p className="text-slate-500 text-sm text-center py-4">該当ユーザーがいません</p>}
              <div className="grid sm:grid-cols-2 gap-1">
                {filteredUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-brand-navy-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedInvitees.includes(u.id)}
                      onChange={() => toggleInvitee(u.id)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-slate-200 text-sm truncate">
                      {u.fullName ?? u.name ?? '-'}
                      {u.company && <span className="text-slate-500 text-xs ml-1">· {u.company}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-brand-sky hover:bg-brand-sky-400 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60">
              {saving ? '作成中...' : '作成する'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setSelectedInvitees([]); setInviteeSearch('') }} className="bg-brand-navy-700 text-slate-300 px-5 py-2 rounded-xl text-sm hover:bg-slate-600">
              キャンセル
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {events.length === 0 && <div className="text-center py-16 text-slate-500">交流会がありません</div>}
        {events.map(ev => (
          <div key={ev.id} className="bg-brand-navy-800 border border-brand-navy-700 rounded-2xl p-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-blue-400 text-sm font-medium">{new Date(ev.heldAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                {ev.location && <span className="text-slate-500 text-sm">📍 {ev.location}</span>}
              </div>
              <h3 className="text-white font-semibold text-lg">{ev.title}</h3>
              {ev.description && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{ev.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span>作成者: {ev.creator.fullName ?? ev.creator.name}</span>
                <span>招待: {ev.invitees?.length ?? 0}名</span>
                <span>おせっかい: {ev._count.feedbacks}件</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/events/${ev.id}`} className="bg-brand-navy-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                詳細
              </Link>
              <button
                onClick={() => handleDeleteEvent(ev)}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

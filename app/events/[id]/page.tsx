'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface InviteeUser {
  id: string
  fullName: string | null
  name: string | null
  company: string | null
  image: string | null
}

interface EventDetail {
  id: string
  title: string
  heldAt: string
  location: string | null
  description: string | null
  createdBy: string
  issuePdfData: string | null
  issuePdfName: string | null
  creator: { id: string; fullName: string | null; name: string | null; company: string | null }
  invitees: { user: InviteeUser }[]
  feedbacks: {
    id: string
    type: string
    content: string
    createdAt: string
    fromUser: { id: string; fullName: string | null; name: string | null; company: string | null; image: string | null }
    toUser: { id: string; fullName: string | null; name: string | null; company: string | null; image: string | null }
  }[]
}

interface UserLite {
  id: string
  fullName: string | null
  name: string | null
  company: string | null
}

interface UserFull {
  id: string
  fullName: string | null
  name: string | null
  email?: string
  company: string | null
  jobTitle: string | null
  bio: string | null
  industry: string | null
  employeeCount: number | null
  image: string | null
  role: string
  snsLinks?: Record<string, string>
}

const SNS_LABELS: Record<string, string> = {
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  website: 'Webサイト',
}

const FB_LABELS: Record<string, string> = { intro: '紹介', advice: '知見', other: 'その他', feedback: 'その他' }
const FB_COLORS: Record<string, string> = {
  intro: 'bg-blue-500/20 text-blue-400',
  advice: 'bg-purple-500/20 text-purple-400',
  other: 'bg-slate-500/20 text-slate-300',
  feedback: 'bg-slate-500/20 text-slate-300',
}
const FB_TYPE_OPTIONS = ['intro', 'advice', 'other'] as const
type FbTab = 'received' | 'sent'

// yyyy-mm-ddThh:mm 形式（datetime-local 用）
const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EventDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFbForm, setShowFbForm] = useState(false)
  const [fb, setFb] = useState({ toUserId: '', type: 'intro' as typeof FB_TYPE_OPTIONS[number], content: '' })
  const [savingFb, setSavingFb] = useState(false)
  const [fbTab, setFbTab] = useState<FbTab>('received')

  // 編集モード（運営管理者のみ）
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', heldAt: '', location: '', description: '' })
  const [allUsers, setAllUsers] = useState<UserFull[]>([])
  const [editInvitees, setEditInvitees] = useState<string[]>([])
  const [inviteeSearch, setInviteeSearch] = useState('')
  const [editPdfFile, setEditPdfFile] = useState<File | null>(null)
  const [editPdfRemove, setEditPdfRemove] = useState(false)
  const [editPdfError, setEditPdfError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // 会員詳細モーダル
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // PDF全画面モーダル
  const [pdfOpen, setPdfOpen] = useState(false)

  // FB インライン編集
  const [editingFbId, setEditingFbId] = useState<string | null>(null)
  const [fbEditForm, setFbEditForm] = useState({ type: 'intro' as typeof FB_TYPE_OPTIONS[number], content: '' })
  const [fbEditSaving, setFbEditSaving] = useState(false)

  const startFbEdit = (f: EventDetail['feedbacks'][number]) => {
    setEditingFbId(f.id)
    const t = (FB_TYPE_OPTIONS.includes(f.type as typeof FB_TYPE_OPTIONS[number]) ? f.type : 'other') as typeof FB_TYPE_OPTIONS[number]
    setFbEditForm({ type: t, content: f.content })
  }

  const cancelFbEdit = () => { setEditingFbId(null); setFbEditForm({ type: 'intro', content: '' }) }

  const saveFbEdit = async () => {
    if (!editingFbId || !fbEditForm.content.trim()) return
    setFbEditSaving(true)
    try {
      const res = await fetch(`/api/feedbacks/${editingFbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: fbEditForm.type, content: fbEditForm.content }),
      })
      if (res.ok) {
        await reload()
        cancelFbEdit()
      } else {
        const text = await res.text()
        let msg = text
        try { msg = JSON.parse(text).error ?? text } catch {}
        alert(`更新に失敗 (HTTP ${res.status})\n${msg}`)
      }
    } catch (e) {
      alert('通信エラー: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setFbEditSaving(false)
    }
  }

  const loadAllUsersOnce = async () => {
    if (allUsers.length > 0) return
    const us = await fetch('/api/users').then(r => r.json())
    if (Array.isArray(us)) setAllUsers(us)
  }

  const openUserModal = async (uid: string) => {
    await loadAllUsersOnce()
    setSelectedUserId(uid)
  }

  const reload = () => fetch(`/api/events/${id}`).then(r => r.json()).then(ev => { if (ev.id) setEvent(ev) })

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && session?.role === 'guest') { router.push('/events'); return }
    if (status !== 'authenticated') return
    Promise.all([
      fetch(`/api/events/${id}`).then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([ev, us]) => {
      if (ev.id) setEvent(ev)
      if (Array.isArray(us)) setAllUsers(us)
      setLoading(false)
    })
  }, [status, session, id, router])

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const comma = result.indexOf(',')
        resolve(comma >= 0 ? result.slice(comma + 1) : result)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const startEdit = async () => {
    if (!event) return
    setEditForm({
      title: event.title,
      heldAt: toDatetimeLocal(event.heldAt),
      location: event.location ?? '',
      description: event.description ?? '',
    })
    setEditInvitees(event.invitees.map(i => i.user.id))
    setEditPdfFile(null)
    setEditPdfRemove(false)
    setEditPdfError('')
    setEditing(true)
    await loadAllUsersOnce()
  }

  const toggleEditInvitee = (uid: string) => {
    setEditInvitees(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid])
  }

  const handleEditSave = async () => {
    setEditPdfError('')
    if (editPdfFile && editPdfFile.size > 3 * 1024 * 1024) {
      setEditPdfError('PDF は 3MB 以下にしてください')
      return
    }
    setEditSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: editForm.title,
        heldAt: editForm.heldAt,
        location: editForm.location,
        description: editForm.description,
        inviteeIds: editInvitees,
      }
      if (editPdfFile) {
        payload.issuePdfData = await readFileAsBase64(editPdfFile)
        payload.issuePdfName = editPdfFile.name
      } else if (editPdfRemove) {
        payload.issuePdfData = null
        payload.issuePdfName = null
      }
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        await reload()
        setEditing(false)
      } else {
        alert('更新に失敗しました')
      }
    } finally {
      setEditSaving(false)
    }
  }

  const handleFbSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingFb(true)
    const res = await fetch('/api/feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fb, eventId: id }),
    })
    if (res.ok) {
      setFb({ toUserId: '', type: 'intro', content: '' })
      setShowFbForm(false)
      reload()
    }
    setSavingFb(false)
  }

  if (status === 'loading' || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
  if (!event) return <div className="text-center py-20 text-slate-500">イベントが見つかりません</div>

  const isAdmin = session?.role === 'admin'
  const inviteeUsers: InviteeUser[] = event.invitees.map(i => i.user)
  const fbTargets = inviteeUsers.filter(u => u.id !== session?.dbUserId)

  const receivedFbs = event.feedbacks.filter(f => f.toUser.id === session?.dbUserId)
  const sentFbs = event.feedbacks.filter(f => f.fromUser.id === session?.dbUserId)
  const visibleFbs = fbTab === 'received' ? receivedFbs : sentFbs

  const filteredEditUsers = allUsers.filter(u => {
    const q = inviteeSearch.toLowerCase()
    if (!q) return true
    return (u.fullName ?? u.name ?? '').toLowerCase().includes(q) || (u.company ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/events" className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
        ← 交流会一覧に戻る
      </Link>

      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
        {editing ? (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">タイトル *</label>
                <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">開催日時 *</label>
                <input type="datetime-local" value={editForm.heldAt} onChange={e => setEditForm(p => ({ ...p, heldAt: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">場所</label>
                <input value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">概要</label>
                <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-400 text-xs">招待者 ({editInvitees.length}名選択中)</label>
                <input value={inviteeSearch} onChange={e => setInviteeSearch(e.target.value)} placeholder="検索..."
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-white text-xs w-48 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-3 max-h-40 overflow-y-auto">
                <div className="grid sm:grid-cols-2 gap-1">
                  {filteredEditUsers.map(u => (
                    <label key={u.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-700 cursor-pointer">
                      <input type="checkbox" checked={editInvitees.includes(u.id)} onChange={() => toggleEditInvitee(u.id)} className="w-4 h-4 accent-blue-600" />
                      <span className="text-slate-200 text-xs truncate">{u.fullName ?? u.name ?? '-'}{u.company && <span className="text-slate-500 ml-1">· {u.company}</span>}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">経営課題PDF（任意・3MBまで）</label>
              {event.issuePdfName && !editPdfRemove && !editPdfFile && (
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
                  <span>📄 {event.issuePdfName}</span>
                  <button type="button" onClick={() => setEditPdfRemove(true)} className="text-red-400 hover:text-red-300">削除する</button>
                </div>
              )}
              {editPdfRemove && (
                <div className="mb-2 flex items-center gap-2 text-xs text-amber-400">
                  <span>※ 保存すると既存のPDFが削除されます</span>
                  <button type="button" onClick={() => setEditPdfRemove(false)} className="text-slate-300 hover:text-white">取り消す</button>
                </div>
              )}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={e => { const f = e.target.files?.[0] ?? null; setEditPdfFile(f); setEditPdfError(''); if (f) setEditPdfRemove(false) }}
                className="block w-full text-slate-300 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-white hover:file:bg-slate-600"
              />
              {editPdfFile && (
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>新ファイル: {editPdfFile.name}</span>
                  <button type="button" onClick={() => setEditPdfFile(null)} className="text-red-400 hover:text-red-300">取消</button>
                </div>
              )}
              {editPdfError && <p className="text-red-400 text-xs mt-1">{editPdfError}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={handleEditSave} disabled={editSaving} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {editSaving ? '保存中...' : '保存する'}
              </button>
              <button onClick={() => setEditing(false)} className="bg-slate-700 text-slate-300 px-5 py-2 rounded-lg text-sm">キャンセル</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-400 text-sm mb-1">{new Date(event.heldAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
              <h1 className="text-2xl font-bold text-white">{event.title}</h1>
              {event.location && <p className="text-slate-400 mt-1">📍 {event.location}</p>}
              {event.description && <p className="text-slate-400 mt-2 text-sm">{event.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500">主催: {event.creator.fullName ?? event.creator.name}</div>
              {isAdmin && (
                <button onClick={startEdit} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm">編集</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Invitees */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">参加者 ({inviteeUsers.length})</h2>
            {inviteeUsers.length === 0 ? (
              <p className="text-slate-500 text-sm">招待者がまだ設定されていません</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {inviteeUsers.map(u => (
                  <button key={u.id} onClick={() => openUserModal(u.id)}
                    className="flex items-center gap-2 bg-slate-700/40 hover:bg-slate-700 rounded-xl px-3 py-2 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                      {u.image ? <Image src={u.image} alt="" width={32} height={32} className="rounded-full" /> : (u.fullName ?? u.name ?? '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{u.fullName ?? u.name ?? '-'}</p>
                      {u.company && <p className="text-slate-400 text-xs truncate">{u.company}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 経営課題（PDF） */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">経営課題</h2>
              {event.issuePdfName && (
                <a
                  href={`data:application/pdf;base64,${event.issuePdfData}`}
                  download={event.issuePdfName}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  ダウンロード
                </a>
              )}
            </div>
            {event.issuePdfData ? (
              <>
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                  <iframe
                    src={`data:application/pdf;base64,${event.issuePdfData}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    title={event.issuePdfName ?? 'issue.pdf'}
                    style={{ width: 'calc(100% + 20px)' }}
                    className="block h-[260px] pointer-events-none"
                  />
                  {/* クリック透過オーバーレイ → 拡大モーダル */}
                  <button
                    type="button"
                    onClick={() => setPdfOpen(true)}
                    aria-label="PDFを拡大表示"
                    className="absolute inset-0 flex items-end justify-end p-3 bg-transparent hover:bg-black/10 transition-colors"
                  >
                    <span className="bg-slate-900/80 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      クリックで拡大
                    </span>
                  </button>
                </div>
                {event.issuePdfName && <p className="text-slate-500 text-xs mt-2">📄 {event.issuePdfName}</p>}
              </>
            ) : (
              <p className="text-slate-500 text-sm">経営課題PDFはまだ登録されていません</p>
            )}
          </div>
        </div>

        {/* Feedbacks */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">おせっかい</h2>
            <button
              onClick={() => setShowFbForm(!showFbForm)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              disabled={fbTargets.length === 0}
            >
              + 送る
            </button>
          </div>

          {/* Tab switch */}
          <div className="flex gap-2">
            {([
              { key: 'received', label: `自分宛 (${receivedFbs.length})` },
              { key: 'sent', label: `自分が送った (${sentFbs.length})` },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setFbTab(t.key)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${fbTab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* FB Form */}
          {showFbForm && (
            fbTargets.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-slate-500 text-sm">
                招待者がいないためおせっかいを送れません
              </div>
            ) : (
              <form onSubmit={handleFbSubmit} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">送り先（招待者から選択）</label>
                  <select required value={fb.toUserId} onChange={e => setFb(p => ({ ...p, toUserId: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">選択...</option>
                    {fbTargets.map(u => (
                      <option key={u.id} value={u.id}>{u.fullName ?? u.name} {u.company ? `(${u.company})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">種類</label>
                  <div className="flex gap-2">
                    {FB_TYPE_OPTIONS.map(t => (
                      <button key={t} type="button" onClick={() => setFb(p => ({ ...p, type: t }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${fb.type === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {FB_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">内容</label>
                  <textarea required value={fb.content} onChange={e => setFb(p => ({ ...p, content: e.target.value }))}
                    rows={8} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-y min-h-[180px]" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingFb} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-60">
                    {savingFb ? '送信中...' : '送信'}
                  </button>
                  <button type="button" onClick={() => setShowFbForm(false)} className="bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg text-sm">キャンセル</button>
                </div>
              </form>
            )
          )}

          {/* FB List */}
          <div className="space-y-3">
            {visibleFbs.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">
                {fbTab === 'received' ? '自分宛のおせっかいはまだありません' : '自分が送ったおせっかいはまだありません'}
              </p>
            )}
            {visibleFbs.map(f => {
              const canEdit = f.fromUser.id === session?.dbUserId
              const canDelete = f.fromUser.id === session?.dbUserId || isAdmin
              const isEditing = editingFbId === f.id
              const handleFbDelete = async () => {
                if (!confirm('このおせっかいを削除しますか? 元に戻せません。')) return
                const res = await fetch(`/api/feedbacks/${f.id}`, { method: 'DELETE' })
                if (res.ok) {
                  setEvent(ev => ev ? { ...ev, feedbacks: ev.feedbacks.filter(x => x.id !== f.id) } : ev)
                } else {
                  alert('削除に失敗しました')
                }
              }
              return (
                <div key={f.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FB_COLORS[f.type] ?? FB_COLORS.other}`}>{FB_LABELS[f.type] ?? 'その他'}</span>
                    {!isEditing && (
                      <div className="flex items-center gap-3">
                        {canEdit && (
                          <button onClick={() => startFbEdit(f)} className="text-blue-400 hover:text-blue-300 text-xs font-medium">編集</button>
                        )}
                        {canDelete && (
                          <button onClick={handleFbDelete} className="text-red-400 hover:text-red-300 text-xs font-medium">削除</button>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {FB_TYPE_OPTIONS.map(t => (
                          <button key={t} type="button" onClick={() => setFbEditForm(p => ({ ...p, type: t }))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${fbEditForm.type === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {FB_LABELS[t]}
                          </button>
                        ))}
                      </div>
                      <textarea value={fbEditForm.content} onChange={e => setFbEditForm(p => ({ ...p, content: e.target.value }))}
                        rows={6} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-y min-h-[140px]" />
                      <div className="flex gap-2">
                        <button onClick={saveFbEdit} disabled={fbEditSaving || !fbEditForm.content.trim()}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg text-xs">
                          {fbEditSaving ? '保存中...' : '保存'}
                        </button>
                        <button onClick={cancelFbEdit} className="bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg text-xs">
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-300 text-sm mb-2">{f.content}</p>
                  )}

                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <button onClick={() => openUserModal(f.fromUser.id)} className="text-blue-400 hover:underline">{f.fromUser.fullName ?? f.fromUser.name}</button>
                    <span>→</span>
                    <button onClick={() => openUserModal(f.toUser.id)} className="text-blue-400 hover:underline">{f.toUser.fullName ?? f.toUser.name}</button>
                    <span className="text-slate-500">· {new Date(f.createdAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 会員詳細モーダル */}
      {selectedUserId && (() => {
        const u = allUsers.find(x => x.id === selectedUserId)
        if (!u) return null
        const sns = Object.entries(u.snsLinks ?? {}).filter(([, v]) => v) as [string, string][]
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUserId(null)}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                      {u.image ? <Image src={u.image} alt="" width={56} height={56} className="rounded-full" /> : (u.fullName ?? u.name ?? '?')[0]}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{u.fullName ?? u.name ?? '-'}</h3>
                      <p className="text-slate-400 text-sm">{u.company ?? ''}{u.jobTitle ? ` · ${u.jobTitle}` : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUserId(null)} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
                </div>
                <div className="space-y-1.5 mb-3 pb-3 border-b border-slate-700 text-xs">
                  {u.email && (
                    <div className="flex gap-2"><span className="text-slate-500 w-20 shrink-0">メール:</span><a href={`mailto:${u.email}`} className="text-blue-400 hover:text-blue-300 truncate">{u.email}</a></div>
                  )}
                  {u.industry && (
                    <div className="flex gap-2"><span className="text-slate-500 w-20 shrink-0">業界:</span><span className="text-slate-200">{u.industry}</span></div>
                  )}
                  {u.employeeCount != null && (
                    <div className="flex gap-2"><span className="text-slate-500 w-20 shrink-0">従業員数:</span><span className="text-slate-200">{u.employeeCount}名</span></div>
                  )}
                </div>
                {u.bio && (
                  <div className="mb-3">
                    <h4 className="text-slate-400 text-xs font-medium mb-1">自己紹介</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{u.bio}</p>
                  </div>
                )}
                {sns.length > 0 && (
                  <div className="mt-3 flex gap-3 flex-wrap">
                    {sns.map(([key, url]) => (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline">
                        {SNS_LABELS[key] ?? key}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* PDF 全画面モーダル */}
      {pdfOpen && event.issuePdfData && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col p-4"
          onClick={() => setPdfOpen(false)}
        >
          <div className="flex items-center justify-between mb-3 text-white" onClick={e => e.stopPropagation()}>
            <p className="text-sm truncate">{event.issuePdfName ?? '経営課題PDF'}</p>
            <div className="flex items-center gap-3">
              <a
                href={`data:application/pdf;base64,${event.issuePdfData}`}
                download={event.issuePdfName ?? 'issue.pdf'}
                className="text-blue-300 hover:text-blue-200 text-sm"
              >
                ダウンロード
              </a>
              <button
                onClick={() => setPdfOpen(false)}
                aria-label="閉じる"
                className="text-white hover:text-slate-300 text-3xl leading-none w-9 h-9 flex items-center justify-center"
              >×</button>
            </div>
          </div>
          <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <iframe
              src={`data:application/pdf;base64,${event.issuePdfData}#toolbar=0&navpanes=0`}
              title={event.issuePdfName ?? 'issue.pdf'}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}
